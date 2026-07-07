#!/usr/bin/env python3
"""Autoroute a scaffold .kicad_pcb with freerouting.

Pipeline:

    1. (kicad-python) export-dsn  : LoadBoard, strip text/battery
                                    footprints, ExportSpecctraDSN, strip
                                    (plane GND ...) blocks from the DSN.
    2. (freerouting)              : run -de <dsn> -do <ses> -mp <passes>.
    3. (kicad-python) import-ses  : LoadBoard (original, unstripped),
                                    ImportSpecctraSES, SaveBoard.

The script invokes itself for phases 1 and 3 in subprocesses so each
pcbnew interaction gets a fresh interpreter — calling LoadBoard,
ExportSpecctraDSN, then later LoadBoard, ImportSpecctraSES, SaveBoard
in a single process consistently segfaults inside KiCad 10's swig
bindings.

Why strip footprints + planes:

  - text.js emits a "footprint" with zero pads. DSN export aborts on it.
  - battery.js reuses the module name `lib:niceview_headers` (a copy-
    paste leftover). DSN export aborts on that too.
  - GND filled zones get exported as Specctra `(plane GND ...)`, which
    freerouting treats as solid copper that blocks routing. Removing
    those declarations from the DSN frees up the board. The original
    .kicad_pcb (reloaded for SES import) still has the zones intact,
    and gerber export's --check-zones makes the fill flow around any
    GND traces freerouting laid down.

Usage:
    autoroute.py <input.kicad_pcb> <output.kicad_pcb> [<passes>]
    autoroute.py --export-dsn <input.kicad_pcb> <out.dsn>
    autoroute.py --import-ses <input.kicad_pcb> <in.ses> <output.kicad_pcb>

The two `--` forms are subprocess entry points; humans use the first.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path


# Module names (FPID library item name) that crash DSN export.
DSN_BLOCKLIST = {
    "lib:text",
    "lib:niceview_headers",  # this is actually the battery footprint
}


# ---- Phase 1: DSN export (runs in subprocess for pcbnew isolation)

def export_dsn_main(input_pcb: str, dsn_out: str) -> int:
    import pcbnew
    board = pcbnew.LoadBoard(input_pcb)
    stripped = 0
    for fp in list(board.GetFootprints()):
        fpid = fp.GetFPID()
        item_name = str(fpid.GetLibItemName())
        if f"lib:{item_name}" in DSN_BLOCKLIST:
            board.Remove(fp)
            stripped += 1
    print(f"[autoroute] stripped {stripped} DSN-incompatible footprints",
          flush=True)
    if not pcbnew.ExportSpecctraDSN(board, dsn_out):
        print("error: DSN export failed", file=sys.stderr)
        return 1
    return 0


# ---- Phase 3: SES import (runs in subprocess for pcbnew isolation)

def import_ses_main(input_pcb: str, ses_in: str, output_pcb: str) -> int:
    import pcbnew
    board = pcbnew.LoadBoard(input_pcb)
    if not pcbnew.ImportSpecctraSES(board, ses_in):
        print("error: SES import failed", file=sys.stderr)
        return 1
    pcbnew.SaveBoard(output_pcb, board)
    return 0


# ---- DSN text post-processing (no pcbnew, runs in main process)

def strip_planes(dsn_path: Path) -> int:
    """Delete `(plane <netname> ...)` blocks from a Specctra DSN file."""
    text = dsn_path.read_text()
    out: list[str] = []
    i = 0
    n = len(text)
    removed = 0
    while i < n:
        idx = text.find("(plane", i)
        if idx == -1:
            out.append(text[i:])
            break
        out.append(text[i:idx])
        depth = 1
        j = idx + len("(plane")
        while j < n and depth > 0:
            if text[j] == "(":
                depth += 1
            elif text[j] == ")":
                depth -= 1
            j += 1
        removed += 1
        i = j
    dsn_path.write_text("".join(out))
    return removed


# ---- Orchestration

def orchestrate(input_pcb: Path, output_pcb: Path, passes: int) -> int:
    if not input_pcb.is_file():
        print(f"error: not a file: {input_pcb}", file=sys.stderr)
        return 1
    output_pcb.parent.mkdir(parents=True, exist_ok=True)

    me = Path(__file__).resolve()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        dsn = tmp / "board.dsn"
        ses = tmp / "board.ses"

        # freerouting v2.x reads its config from ~/.freerouting/freerouting.json
        # (or /tmp/freerouting/freerouting.json on systems without HOME). Drop
        # our overrides (cheap vias, disable_analytics, multi_threading: false)
        # there before launching. Both locations are tried.
        config_src = Path(__file__).parent / "freerouting.json"
        if config_src.is_file():
            content = config_src.read_text()
            for d in [Path.home() / ".freerouting", Path("/tmp/freerouting")]:
                d.mkdir(parents=True, exist_ok=True)
                (d / "freerouting.json").write_text(content)

        # Phase 1: DSN export (subprocess).
        print(f"[autoroute] exporting DSN ...", flush=True)
        result = subprocess.run(
            [sys.executable, str(me), "--export-dsn", str(input_pcb), str(dsn)],
        )
        if result.returncode != 0 or not dsn.is_file():
            print("error: DSN export phase failed", file=sys.stderr)
            return 1
        print(f"[autoroute] DSN -> {dsn} ({dsn.stat().st_size} bytes)", flush=True)

        removed_planes = strip_planes(dsn)
        print(f"[autoroute] stripped {removed_planes} plane declarations",
              flush=True)

        # Phase 2: freerouting.
        # -us Global   : optimize for global connectivity rather than local
        #                trace cost - greedy mode plateaus quickly leaving
        #                ~30 unrouted nets even with 30+ passes
        # -is Sequential : route nets in fixed order rather than rescoring
        #                  each pass - reduces churn
        print(f"[autoroute] running freerouting ({passes} passes, global+sequential) ...",
              flush=True)
        # Wall-clock cap. v2.2.4 honours `disable_analytics: true` in the
        # config so we no longer have to defend against hour-long telemetry
        # retries, but it can still hang in optimizer passes near the end.
        # Generous budget: 30s/pass + 5min slack + 10min optimizer tail.
        timeout = passes * 30 + 300 + 600
        try:
            subprocess.run(
                [
                    "freerouting",
                    "-de", str(dsn),
                    "-do", str(ses),
                    "-mp", str(passes),
                    "-us", "Global",
                    "-is", "Sequential",
                    # Single-threaded: v2.2.4 multithreaded mode doesn't fire
                    # its "stop on no improvement" heuristic - just runs forever
                    # past the plateau and never writes the SES. -mt 1 is only
                    # ~10% slower per pass and DOES exit cleanly.
                    "-mt", "1",
                ],
                check=True,
                timeout=timeout,
                cwd=str(tmp),  # freerouting picks up our freerouting.json from cwd
            )
        except subprocess.TimeoutExpired:
            print(f"warning: freerouting hit {timeout}s timeout; using SES if any",
                  file=sys.stderr)
        if not ses.is_file():
            print(f"error: freerouting did not produce {ses}", file=sys.stderr)
            return 1
        print(f"[autoroute] SES -> {ses} ({ses.stat().st_size} bytes)", flush=True)

        # Phase 3: SES import (subprocess).
        print(f"[autoroute] importing SES ...", flush=True)
        result = subprocess.run(
            [sys.executable, str(me), "--import-ses",
             str(input_pcb), str(ses), str(output_pcb)],
        )
        if result.returncode != 0 or not output_pcb.is_file():
            print("error: SES import phase failed", file=sys.stderr)
            return 1
        print(f"[autoroute] saved {output_pcb}", flush=True)

    return 0


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--export-dsn" and len(args) == 3:
        return export_dsn_main(args[1], args[2])
    if args and args[0] == "--import-ses" and len(args) == 4:
        return import_ses_main(args[1], args[2], args[3])
    if len(args) in (2, 3):
        input_pcb = Path(args[0])
        output_pcb = Path(args[1])
        passes = int(args[2]) if len(args) == 3 else 50
        return orchestrate(input_pcb, output_pcb, passes)
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
