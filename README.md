# Hypothenar PCB

The v1 redesign — chip-direct nRF52840 module + I/O expanders, designed
for JLCPCB PCBA assembly. See `docs/v1-design.md` (in the repo root) for
architectural decisions and BOM rationale.

This directory is a work-in-progress. The PCB hasn't been drawn yet.

## What's here

- **`ref-designguide-schematic/`** — vendored copy of
  `ebastler/zmk-designguide` (CERN-OHL-P licensed). A reference schematic
  showing tested wireless-keyboard topologies: USB-C + ESD, TP4056 charge
  IC, XC6206 LDO, three different nRF52840 module options. This is our
  primary reference for the power tree and MCU section. Open
  `ref-designguide-schematic/designguide-schematic.kicad_sch` in KiCad
  to view.

- **`lib/kleeb/`** — vendored MIT-licensed KiCad library from
  `crides/kleeb`. The only public source of the **MS88SF3 nRF52840
  module footprint + symbol** (in `lib/kleeb/mcu.pretty/ms88sf3.kicad_mod`
  and the `mcu.kicad_sym` symbol library). Add this to KiCad's path when
  drawing the schematic.

- **`lib/marbastlib/`** — CERN-OHL-P keyboard-focused KiCad library by
  ebastler. Used by zmk-designguide. Contains symbols + footprints for
  TP4056, XC6206, USB-C connectors, etc.

3D models from both libraries are stripped (~88 MB saved). Re-fetch the
original repos if you want 3D viewer support.

## Project skeleton

Two KiCad projects ready to open:

```
kicad/hypothenar-left/
  hypothenar-left.kicad_pro    # start with: nix develop -c kicad
  hypothenar-left.kicad_sch    # currently == designguide schematic (verbatim copy)
  hypothenar-left.kicad_pcb    # empty, will populate from netlist later
  sym-lib-table               # project-local symbol library wiring
  fp-lib-table                # project-local footprint library wiring

kicad/hypothenar-right/
  hypothenar-right.{kicad_pro,kicad_sch,kicad_pcb,sym-lib-table,fp-lib-table}
```

Open either project file (`.kicad_pro`) in KiCad and the kleeb +
marbastlib libraries are wired up automatically — search the symbol
browser for `MS88SF3`, `TP4056`, `XC6206`, `USB_C` etc. and they're all
present.

## Roadmap

1. **Prune the designguide schematic** to just what we want:
   - Keep: USB-C input + ESD, TP4056 charge IC, XC6206 LDO, one MCU
     module slot, Vsense divider (for battery reporting)
   - Delete: the other two MCU modules (Holyiot and Moko — we use the
     third slot for our MS88SF3), the alternative BQ24075 charge IC,
     the LED underglow circuit, the battery protection (DW01A/FS8205)
     — optional, depends on whether we want belt-and-suspenders
   - Replace: the Ebyte E73 module footprint slot with MS88SF3
   - Save. ERC should drop from 409 to <50.

2. **Add the MCP23017 section** (not in designguide):
   - Two MCP23017 ICs per half, I²C-connected to the MCU
   - Address straps for 0x20 and 0x21
   - 4.7 kΩ I²C pull-ups
   - Reset line tied to MCU GPIO
   - Reference: `SolderedElectronics/IO-expander-MCP23017-breakout-hardware-design`

3. **Add the matrix section**: 28 switches per half. With switch-per-pin
   topology, each switch has one pin → GPIO pin on one of the MCP23017s,
   other pin → GND. No diodes.
   - Will eventually come from the ergogen scaffold (regenerated for v1
     without diodes); for now stub with a placeholder.

4. **Add the rest of the per-half peripherals**: scrollwheel encoder,
   Nice!View headers, slider switch, reset button.

5. **Run ERC clean** on the schematic.

6. **Layout in KiCad**: import netlist into the `.kicad_pcb`, place
   footprints in the chip area, then bring in the ergogen scaffold
   matrix and stitch the two together.

7. **Routing**: probably mostly by hand again (autoroute will hit
   similar plateaus as rc1).

8. **Generate**: gerbers + pick-place CSV + BOM CSV → submit to JLCPCB.

## Working on this branch

`v1` is a git branch off `main`. To work on v1:

```sh
jj edit v1                                       # check out v1 branch
jj new                                           # start a new commit
# ... edit files ...
jj describe -m "v1(...): what I changed"
jj git push --bookmark v1
```

`main` continues to be the validated rc1 design.

## License notes

This repository bundles work under three licenses that are
compatible with this project's MIT licence:

- `ref-designguide-schematic/` — CERN-OHL-P v2 (`ebastler/zmk-designguide`)
- `lib/kleeb/` — MIT (`crides/kleeb`)
- `lib/marbastlib/` — CERN-OHL-P v2 (`ebastler/marbastlib`)

Both CERN-OHL-P and MIT permit redistribution + modification. Attribution
preserved by keeping each library's original LICENSE file untouched.
