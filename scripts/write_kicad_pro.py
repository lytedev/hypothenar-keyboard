#!/usr/bin/env python3
"""Generate a KiCad project file (.kicad_pro) alongside a .kicad_pcb.

Ergogen emits only .kicad_pcb, so the KiCad launcher shows "Empty project"
without a sibling .kicad_pro that has all the structure KiCad 10 expects.
A minimal hand-written .kicad_pro is not enough; the launcher needs the
full schema. So this script takes a comprehensive template (copied from
KiCad's own ecc83 demo project, see `kicad_pro_template.json`), patches
in our design rules and net classes, and writes it next to the .kicad_pcb.

Defaults for a hand-routed two-layer choc-spaced split keyboard:

    Default class:  0.25 mm tracks, 0.6 mm vias, 0.2 mm clearance
    Power class:    0.40 mm tracks, 0.8 mm vias        (VCC, GND, BAT+, RAW)
    Min track:      0.20 mm
    Min via:        0.60 mm diameter / 0.30 mm drill
    Min clearance:  0.20 mm

These are comfortably above JLCPCB's standard 2-layer minimums.

Usage:
    write_kicad_pro.py <path/to/board.kicad_pcb>
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path


POWER_NETS = ["VCC", "GND", "BAT+", "RAW", "VBUS"]

DESIGN_RULES_OVERRIDES = {
    "min_clearance": 0.2,
    "min_track_width": 0.2,
    "min_via_diameter": 0.6,
    "min_through_hole_diameter": 0.3,
    "min_hole_clearance": 0.25,
    "min_hole_to_hole": 0.25,
}

TRACK_WIDTHS = [0.0, 0.25, 0.4]
VIA_DIMENSIONS = [
    {"diameter": 0.0, "drill": 0.0},
    {"diameter": 0.6, "drill": 0.3},
    {"diameter": 0.8, "drill": 0.4},
]

DEFAULT_CLASS_OVERRIDES = {
    "clearance": 0.2,
    "track_width": 0.25,
    "via_diameter": 0.6,
    "via_drill": 0.3,
}

POWER_CLASS = {
    "name": "Power",
    "clearance": 0.2,
    "track_width": 0.4,
    "via_diameter": 0.8,
    "via_drill": 0.4,
    "bus_width": 12,
    "diff_pair_gap": 0.25,
    "diff_pair_via_gap": 0.25,
    "diff_pair_width": 0.2,
    "line_style": 0,
    "microvia_diameter": 0.3,
    "microvia_drill": 0.1,
    "pcb_color": "rgba(0, 0, 0, 0.000)",
    "priority": 1,
    "schematic_color": "rgba(0, 0, 0, 0.000)",
    "wire_width": 6,
    "nets": POWER_NETS,
}


def patch(project: dict, basename: str) -> dict:
    out = copy.deepcopy(project)

    out["meta"]["filename"] = f"{basename}.kicad_pro"

    rules = out["board"]["design_settings"].setdefault("rules", {})
    rules.update(DESIGN_RULES_OVERRIDES)
    out["board"]["design_settings"]["track_widths"] = TRACK_WIDTHS
    out["board"]["design_settings"]["via_dimensions"] = VIA_DIMENSIONS

    classes = out["net_settings"].setdefault("classes", [])
    if classes:
        classes[0].update(DEFAULT_CLASS_OVERRIDES)
    else:
        classes.append({"name": "Default", **DEFAULT_CLASS_OVERRIDES})
    classes[:] = [c for c in classes if c.get("name") != "Power"]
    classes.append(POWER_CLASS)

    return out


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    pcb = Path(sys.argv[1])
    if not pcb.is_file():
        print(f"error: not a file: {pcb}", file=sys.stderr)
        return 1

    template_path = Path(__file__).parent / "kicad_pro_template.json"
    with template_path.open() as f:
        template = json.load(f)

    project = patch(template, pcb.stem)
    pro = pcb.with_suffix(".kicad_pro")
    pro.write_text(json.dumps(project, indent=2) + "\n")
    print(f"wrote {pro}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
