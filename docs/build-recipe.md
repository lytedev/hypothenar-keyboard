# Hypothenar build recipe

End-to-end recipe to take `./ergogen/config.yaml` from a scaffold to a
JLCPCB pick-and-place order. Read [`v1-design.md`](./v1-design.md) first
for the architecture rationale (MS88SF3 module, 2× MCP23017, MCU-on-PCB
power tree).

This is a working-style document — write down what worked, mark what
didn't, and skip steps you've already done. The `Verify` lines are
checks I (Claude) leave for myself when picking the work back up later;
treat them the same way you would.

## Tools you need

- KiCad 9 — `nix shell nixpkgs#kicad` or your system install
- ergogen 4.x — `nix shell nixpkgs#ergogen`
- freerouting v2.2.4 — built by this flake; `nix run .#freerouting -- --help`
- `nix build .#scaffold` for a fresh ergogen output

## Stage 0 — regenerate the scaffold

The scaffold is the source-of-truth for placement; if you change
`./ergogen/config.yaml`, redo it.

```bash
# Pure-nix build (cached):
nix build .#scaffold && ls result/

# Or in-place for iteration:
nix run nixpkgs#ergogen -- ./ergogen -o /tmp/hypothenar-scaffold
```

The output contains `pcbs/keyboard.kicad_pcb` (a fab-format kicad_pcb,
no traces). The flake's `v1-scaffold` derivation also upgrades it to
KiCad 9 format and writes a `.kicad_pro` next to it so the project
opens cleanly.

**Verify:**

```bash
grep '(module ' result/pcbs/keyboard.kicad_pcb \
  | awk '{print $2}' | sort | uniq -c
# Expect: 28 PG1350, 2 MCP23017, 1 each of MS88SF3, USB-C, USBLC6,
#         TP4056, XC6206, encoder, slider, reset, text, 4 Hole.
```

If a class is missing, the `pcbs.keyboard.footprints` block in
`config.yaml` references a tag that no point carries (see commit
`fix(./ergogen): scaffold places all components` — same trap).

## Stage 1 — open the project and set design rules

Open `result/pcbs/keyboard.kicad_pro` in KiCad. The scaffold is on
sheet `keyboard.kicad_pcb`; everything else (project file, schematic
stub if you want one) is up to you. We're routing-only — no schematic.

**Board stackup** (File → Board Setup → Board Stackup → Physical Stackup):
two-layer, 1.6 mm thickness, 1 oz copper. JLCPCB's default.

**Design rules** (File → Board Setup → Design Rules → Constraints):

| Setting                   | Value      | Why                                                                   |
| ------------------------- | ---------- | --------------------------------------------------------------------- |
| Minimum clearance         | 0.127 mm   | JLCPCB 5/5 mil cheap tier. Cheaper if you go 6/6 = 0.15 mm.           |
| Minimum track width       | 0.127 mm   | Same.                                                                 |
| Minimum via size          | 0.6 mm     | JLCPCB minimum drill 0.3 mm; via annular ring at least 0.15 mm.       |
| Minimum via drill         | 0.3 mm     | JLCPCB cheap tier.                                                    |
| Minimum hole-to-hole      | 0.5 mm     | JLCPCB requirement.                                                   |
| Copper-to-edge clearance  | 0.3 mm     | Edge.Cuts safety margin.                                              |

**Net classes** (File → Board Setup → Net Classes):

| Net class      | Track width | Via dia/drill | Members                                       |
| -------------- | ----------- | ------------- | --------------------------------------------- |
| Default        | 0.2 mm      | 0.6 / 0.3     | everything else (signal, switch matrix)       |
| Power          | 0.4 mm      | 0.8 / 0.4     | `VBUS`, `VBAT`, `VBAT_SW`, `VCC`, `GND`       |
| USB            | 0.25 mm     | 0.6 / 0.3     | `USB_DP`, `USB_DM` (diff-pair-ish, see below) |

Power tracks at 0.4 mm carry ~1 A comfortably with negligible
temperature rise — well above any real load on this board.

## Stage 2 — push components to final positions

The scaffold drops every component along an arc tangent to the matrix.
That's a starting point, not a layout. Push them into the right
half-board zones:

```
+-------------------------------------+
| matrix (5x6) and thumb cluster      |
|                                     |
|  MCU              MCP_A   MCP_B    |
|  (MS88SF3)        (left)  (right)  |
|                                     |
|  USB-C (edge)     LDO    Charge IC |
|  ESD (close to USB-C)               |
+-------------------------------------+
       \---/
       slider + reset edge
```

Concrete placement rules:

1. **USB-C goes at the top edge of the board**, centered between the
   inner two columns of the matrix. Cable strain-relief is the most
   important constraint — put it at a board edge so the connector
   ground tabs can solder to a board cutout.
2. **MS88SF3 antenna keepout.** The antenna is on one short edge of
   the module (see Minew datasheet, pg. 4). Orient the module so the
   antenna edge faces *off the PCB or toward a board edge*, with no
   ground plane within 5 mm of the antenna and no copper at all
   within 2 mm. **This is the single most consequential placement
   decision** — getting it wrong tanks BLE range.
3. **MCP23017s** sit *between* the MCU and the keys they drive. MCP_A
   has the num + top row keys; MCP_B has home + bottom + mod + thumbs.
   Aim for short trace runs from each expander pin to its switch.
4. **USBLC6 ESD** sits between the USB-C connector and the MCU's USB
   pins. As close to the USB-C as practical. The two diodes inside
   only protect what's downstream of them.
5. **TP4056 charge IC + XC6206 LDO** sit next to the USB-C area. The
   LDO needs a 1 µF input cap and 1 µF output cap (the BOM has
   100 nF — add 1 µF locally during this stage, see Stage 3).
6. **Slider switch + reset button at the bottom edge** so they're
   accessible when the case is closed.

Use `Edit → Select All Footprints → Move` to grab the MCU cluster as a
group and slide it inside the board outline. The scaffold pushes it
*outside* the outline (top-right corner) because ergogen anchors are
keyed off the matrix corner; rip it inside.

**Verify:** `kicad-cli pcb export svg --output /tmp/check.svg result/...`
and visually scan for collisions / footprints outside the board edge.

## Stage 3 — schematic decoupling caps (added in PCB editor)

There's no schematic. Add the decoupling caps directly as PCB
footprints using `Place → Footprint`, pick the 0603 cap from the
KiCad library (`Capacitor_SMD:C_0603_1608Metric`), and assign nets in
the footprint properties.

Required caps (per Nordic reference):

| Designator | Value   | Net (one side) | Net (other side) | Location                                    |
| ---------- | ------- | -------------- | ---------------- | ------------------------------------------- |
| C1         | 4.7 µF  | VBUS           | GND              | next to USB-C VBUS pin                      |
| C2         | 100 nF  | VBUS           | GND              | next to USB-C                               |
| C3         | 1 µF    | VBAT           | GND              | TP4056 VBAT pin (BATT input bulk)           |
| C4         | 1 µF    | VBAT           | GND              | XC6206 input pin (LDO input bulk)           |
| C5         | 1 µF    | VCC            | GND              | XC6206 output pin (LDO output bulk)         |
| C6         | 100 nF  | VCC            | GND              | MS88SF3 VDD pin (MCU decoupling)            |
| C7         | 100 nF  | VCC            | GND              | MCP23017 #1 VDD pin                         |
| C8         | 100 nF  | VCC            | GND              | MCP23017 #2 VDD pin                         |

Each 100 nF cap must be **within 2 mm** of its IC's VDD pad. The 1 µF
and 4.7 µF bulk caps can be further away but should be on the same
copper pour.

Resistors (also place in PCB editor):

| Designator | Value   | From      | To        | Notes                                                   |
| ---------- | ------- | --------- | --------- | ------------------------------------------------------- |
| R1         | 4.7 kΩ  | VCC       | I2C_SCL   | I²C pull-up                                             |
| R2         | 4.7 kΩ  | VCC       | I2C_SDA   | I²C pull-up                                             |
| R3         | 5.1 kΩ  | USB_CC1   | GND       | UFP role pull-down                                      |
| R4         | 5.1 kΩ  | USB_CC2   | GND       | UFP role pull-down                                      |
| R5         | 12 kΩ   | TP_PROG   | GND       | sets TP4056 charge current ≈ 100 mA                     |
| R6         | 100 kΩ  | VCC       | I2C_RESET | pull-up so MCP23017 doesn't reset spuriously            |
| R7         | 100 kΩ  | VCC       | RESET     | MCU reset pull-up                                       |
| R8         | 1 kΩ    | CHARGE_*  | LED+      | charge-indicator LED current limit (optional)           |

## Stage 4 — route the board

Two strategies. The rc1 hybrid approach (route critical nets by hand,
autoroute the rest) worked well — it produced 44 vias vs 102 starting
from autoroute-only. Repeat that here.

### 4a. Hand-route critical nets first

Do these by hand, in this order:

1. **USB-C D+ / D-**. Keep them as a tight pair (parallel, equal length
   if you can swing it). They run from USB-C through USBLC6 to the
   MCU's USB pins. The whole pair should be ≤ 30 mm total.
2. **Antenna keepout zone**. Skip if not using the bare-chip nRF52840
   — the MS88SF3's antenna is internal. But still: don't route ground
   pour inside the antenna keepout zone on the module datasheet.
3. **Crystal**. The MS88SF3 has internal crystals, nothing to route.
4. **Power tree**: USB-C VBUS → TP4056 IN → battery → slider → TP4056
   OUT → MCU VBAT input → LDO IN → LDO OUT → MCU VCC, MCP23017s. Use
   the `Power` net class so traces are 0.4 mm.
5. **I²C bus**. Two short traces (SCL, SDA) from MCU to both MCP23017
   expanders. Keep both expanders on the same bus; don't make a
   star — daisy-chain.

### 4b. Autoroute the rest with freerouting

The remaining nets are 28 switch-to-MCP23017 hookups (single-ended,
short, no constraints). Autoroute them:

```bash
# Save your in-progress PCB first.
nix run .#route -- result/pcbs/keyboard.kicad_pcb /tmp/hypothenar-routed.kicad_pcb

# Replace the working PCB with the autorouted one (after diffing!):
cp /tmp/hypothenar-routed.kicad_pcb routed/keyboard-left.kicad_pcb
```

`v1-route` runs freerouting v2.2.4 with the rc1 pass count (50) and
the freerouting config (in this repo at `scripts/freerouting.rules`).
Expected ~20 min runtime; expect ~90-95% routed. Remaining unrouted
nets are usually the I²C and power ones we already hand-routed —
verify and clean up.

**Verify** by opening the PCB in KiCad: PCB Editor → Inspect → DRC.
Fix all errors before going to gerbers.

## Stage 5 — fill GND zones

Both layers get a flood-fill GND pour. Place → Add Filled Zone →
F.Cu, net = GND, hatched fill, clearance 0.3 mm. Repeat on B.Cu.
Press B to fill.

This buys two things: shorter ground returns (every via to GND is a
direct connection to the pour, not a wire) and a slight bit of EMI
shielding.

## Stage 6 — export fabrication files

```bash
nix build .#gerbers && ls result/
# Produces gerbers + drill files + pick-place CSV + BOM CSV
```

The `v1-gerbers` derivation also runs DRC inside KiCad and fails the
build if any errors remain.

## Stage 7 — order at JLCPCB

1. Upload `result/v1-keyboard-left.zip` (gerbers + drills) to JLCPCB.
2. Quantity: 5 (cheapest tier; you'll use 1, keep spares).
3. PCBA: yes, top side, standard tier.
4. Upload `result/v1-keyboard-left-bom.csv` and
   `result/v1-keyboard-left-cpl.csv` (pick-place).
5. Add Component Programming service (one-time setup) with the
   bootloader hex from
   `https://github.com/adafruit/Adafruit_nRF52_Bootloader/releases`
   (pick the `nice_nano_v2` build).
6. Repeat for the right half.

First order pays the Extended part setup fees (~$24); subsequent
revisions are free.

## Stage 8 — receive boards, smoke test

When the boards arrive:

1. Visual inspection: no shorts on the MCU pads, USB-C aligned, no
   tombstoned passives.
2. Power-only test: plug USB-C, check VCC = 3.3 V at the MCU pin
   (probe a cap, not the pad — easier).
3. Bootloader sanity: double-tap reset, expect `NICENANO` to appear
   as a mass-storage device. If it does, JLCPCB's bootloader flash
   worked.
4. ZMK firmware: `nix run .#flash -- left` (after Stage 9).

## Stage 9 — firmware build

See [`zmk/README.md`](../zmk/README.md). The short version:

```bash
nix build .#firmware-left
nix build .#firmware-right
nix run .#flash -- left
```

## Known traps

Things I'd like future-me to remember:

- **The MCU cluster anchors outside the board outline.** Move it inside
  before routing — `config.yaml` puts it where the matrix outline ends,
  not where it'd fit on the board. The fix is in `config.yaml` not
  KiCad; eventually rewrite the anchor as relative to `matrix_inner_home`
  with a smaller shift.
- **`undefined` pad nets are silent bugs.** If a footprint param has a
  plain string default (not `{ type: 'net', value: 'X' }`), the PCB
  emits `undefined` as the net spec and KiCad refuses to load. Always
  net-type your defaults.
- **`(fp_text user "${REFERENCE}")` from KiCad is hostile to JS template
  literals.** The converter escapes those; if you copy-paste from a
  fresh kicad_mod, escape `${` to `\${` manually.
- **Tags, not zone names, in `where:`.** A `pcbs.footprints.X.where: <zone>`
  doesn't auto-match — give each zone a unique tag if you want to
  target it.
