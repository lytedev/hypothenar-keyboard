#!/usr/bin/env python3
"""Convert a KiCad .kicad_mod file to an ergogen footprint JS wrapper.

Tedium-killer for large footprints (MS88SF3 has 64 pads). The output
.js follows the same shape as our hand-written wrappers: a params block
with one net per unique pad number, and a body function that emits the
footprint with the parametric position + side + net substitutions.

Usage:
    _convert_kicad_mod.py <input.kicad_mod> <output.js> [<varname>]

Notes:
- KiCad's s-expr format is sloppy; this parser handles the cases we need
  (the kleeb / standard KiCad libraries) and may break on exotic syntax.
- The ergogen wrapper exposes pads by their KiCad pad number. The caller
  is responsible for knowing what each pin does (consult the datasheet).
- The script preserves silkscreen / fab-layer geometry verbatim so the
  output looks the same as the KiCad original.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


# Regex to match (pad "<name>" ... net is the (net N "<netname>") part we add later
PAD_RE = re.compile(
    r'\(pad\s+"?([^"\s]+)"?\s+(.*?)\)\s*(?=\(pad|\Z|\)$)',
    re.DOTALL,
)


def parse_pads(text: str) -> list[tuple[str, str]]:
    """Return list of (pad_number, full_pad_sexp) tuples in source order."""
    # Iterate (pad ...) blocks, balancing parens.
    pads = []
    i = 0
    while True:
        idx = text.find('(pad ', i)
        if idx == -1:
            break
        # Find matching close paren
        depth = 1
        j = idx + len('(pad ')
        while j < len(text) and depth > 0:
            if text[j] == '(':
                depth += 1
            elif text[j] == ')':
                depth -= 1
            j += 1
        block = text[idx:j]
        # Extract pad number
        m = re.search(r'\(pad\s+"?([^"\s]+)"?', block)
        if m:
            pads.append((m.group(1), block))
        i = j
    return pads


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2

    kicad_mod_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    varname = sys.argv[3] if len(sys.argv) > 3 else kicad_mod_path.stem

    src = kicad_mod_path.read_text()

    # Extract footprint name from the opening `(footprint "<name>" ...)`
    m = re.search(r'\(footprint\s+"([^"]+)"', src)
    if not m:
        print(f"could not find footprint name in {kicad_mod_path}", file=sys.stderr)
        return 1
    module_name = m.group(1)

    # Collect unique pad numbers
    pads = parse_pads(src)
    unique_pads = sorted(set(num for num, _ in pads), key=lambda s: (len(s), s))

    # ---- emit the JS file
    out = []
    out.append(f"// Auto-generated from {kicad_mod_path.name} by _convert_kicad_mod.py.")
    out.append(f"// Original module: {module_name}")
    out.append(f"// {len(pads)} pads, {len(unique_pads)} unique pad numbers.")
    out.append(f"// Edit by hand only as a last resort; prefer re-running the script.")
    out.append(f"")
    out.append(f"module.exports = {{")
    out.append(f"  params: {{")
    out.append(f"    designator: 'U',")
    out.append(f"    side: 'F',")
    for pad in unique_pads:
        # Sanitize pad name to JS identifier; KiCad allows weird chars
        ident = "P" + re.sub(r'[^A-Za-z0-9_]', '_', pad)
        # Declare as a net-typed param so ergogen parses values into net
        # objects with .str; a plain string default makes p[ident] a bare
        # string whose .str is undefined and emits `undefined` in the PCB.
        out.append(f"    {ident}: {{ type: 'net', value: '{ident}_NC' }},    // pad \"{pad}\"")
    out.append(f"  }},")
    out.append(f"  body: p => {{")
    out.append(f"    // For each pad, substitute the net by adding a `(net N \"<name>\")`")
    out.append(f"    // before the closing paren. ergogen handles the (net N) part via p.X.str.")
    out.append(f"    const padNet = (padNum) => {{")
    out.append(f"      const ident = 'P' + String(padNum).replace(/[^A-Za-z0-9_]/g, '_');")
    out.append(f"      return p[ident] ? p[ident].str : '';")
    out.append(f"    }};")
    out.append(f"")
    out.append(f"    return `")
    out.append(f"    (module {module_name} (layer F.Cu) (tedit 0)")
    out.append(f"    ${{p.at}}")
    out.append(f"    (fp_text reference \"${{p.ref}}\" (at 0 -12) (layer ${{p.side}}.SilkS) ${{p.ref_hide}}")
    out.append(f"      (effects (font (size 1 1) (thickness 0.15))))")
    out.append(f"    (fp_text value \"{module_name}\" (at 0 12) (layer ${{p.side}}.Fab) hide")
    out.append(f"      (effects (font (size 1 1) (thickness 0.15))))")

    # ---- emit all pads with net substitution
    for pad_num, pad_sexp in pads:
        ident = "P" + re.sub(r'[^A-Za-z0-9_]', '_', pad_num)
        # Replace tstamp + insert net before the trailing `)`
        # Strip the tstamp clause (KiCad-generated UUIDs, not needed)
        cleaned = re.sub(r'\(tstamp\s+[a-f0-9-]+\)\s*', '', pad_sexp).rstrip()
        # Trim trailing `)` so we can splice in the net before it
        if cleaned.endswith(')'):
            cleaned = cleaned[:-1].rstrip()
        # `side` substitution: F.Cu/F.Paste/F.Mask → ${p.side}.Cu/Paste/Mask
        cleaned = re.sub(r'"F\.(Cu|Paste|Mask|SilkS|Fab|CrtYd)"', r'${p.side}.\1', cleaned)
        cleaned = re.sub(r'\bF\.(Cu|Paste|Mask|SilkS|Fab|CrtYd)\b', r'${p.side}.\1', cleaned)
        # Escape any KiCad ${REFERENCE} / ${VALUE} placeholders that would
        # otherwise be evaluated by the JS template literal.
        cleaned = cleaned.replace('${', '\\${')
        # But we DO want our own ${p.side} substitutions to evaluate, so
        # unescape those:
        cleaned = cleaned.replace('\\${p.side}', '${p.side}')
        out.append(f"      {cleaned} ${{padNet(\"{pad_num}\")}})")

    # ---- emit non-pad graphics (fp_line, fp_circle, fp_text user, etc.)
    # Walk the source paren-by-paren so we get whole top-level (fp_*) blocks.
    geom_starts = ('(fp_line ', '(fp_circle ', '(fp_arc ', '(fp_poly ',
                   '(fp_text user ', '(fp_text reference ')
    i = 0
    while i < len(src):
        # Find next (fp_* opening
        idx = -1
        for prefix in geom_starts:
            p_idx = src.find(prefix, i)
            if p_idx != -1 and (idx == -1 or p_idx < idx):
                idx = p_idx
        if idx == -1:
            break
        # Balance parens
        depth = 1
        j = idx + 1
        while j < len(src) and depth > 0:
            if src[j] == '(':
                depth += 1
            elif src[j] == ')':
                depth -= 1
            j += 1
        block = src[idx:j]
        # Skip fp_text reference - we already emit our own
        if block.startswith('(fp_text reference'):
            i = j
            continue
        # Strip tstamps
        block = re.sub(r'\(tstamp\s+[a-f0-9-]+\)\s*', '', block).strip()
        # Translate layer names to use ${p.side}
        block = re.sub(r'"F\.(Cu|Paste|Mask|SilkS|Fab|CrtYd)"', r'${p.side}.\1', block)
        block = re.sub(r'\bF\.(Cu|Paste|Mask|SilkS|Fab|CrtYd)\b', r'${p.side}.\1', block)
        # Escape KiCad's ${REFERENCE} / ${VALUE} placeholders
        block = block.replace('${', '\\${')
        block = block.replace('\\${p.side}', '${p.side}')
        out.append(f"      {block}")
        i = j

    out.append(f"    )")
    out.append(f"    `;")
    out.append(f"  }},")
    out.append(f"}};")

    out_path.write_text('\n'.join(out) + '\n')
    print(f"wrote {out_path} ({len(pads)} pads, {len(unique_pads)} unique)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
