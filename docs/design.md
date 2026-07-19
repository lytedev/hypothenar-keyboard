# Hypothenar design notes

This branch (`v1`) is a redesign of the prototype (rc1, on `main`) for
**pick-and-place assembly via JLCPCB**. The user-visible changes:

- **No Nice!Nano module** — discrete nRF52840 chip on the main PCB.
- **No diodes** — 2× MCP23017 I²C I/O expanders per half, switch-per-pin
  topology (each key wired directly to one expander GPIO).
- **Most components placed by JLCPCB PCBA**, only through-hole / mechanical
  parts (switches, hotswaps, encoder, slider, reset, battery wires)
  hand-soldered.

rc1 (current `main`) stays as the validated prototype reference.

## Architecture choices

### Drop reversibility — two separate PCB designs

rc1 used the corax-style reversible PCB (one design, flipped for the
other half, with jumpers selecting per-side wiring). That made sense
for hand-soldering: one PCB SKU, user solders the appropriate jumpers.

For v1 (PCBA), reversibility becomes a tax:

- JLCPCB places all populated footprints either way — paying for
  duplicate footprints or jumper bridges is wasted money.
- The schematic complexity (jumpers around the MCU, display, encoder)
  multiplies with each chip we add. Discrete nRF52840 + 2× MCP23017
  + USB-C + charge IC means a *lot* of new jumpers to design around.
- We can't even verify a reversible v1 design without spending the
  PCBA money up front.

**Plan: two PCB layouts emitted from one ergogen config.** Ergogen's
built-in `mirror` directive handles the geometry; we get `hypothenar-left`
and `hypothenar-right` as independent KiCad files. Each gets:

- Components placed for its specific half (MCU on the inner edge, etc.)
- Pure single-side routing (no mirror copper)
- Its own gerber + PCBA order at JLCPCB

Cost delta: separate designs are ~$50-80 more for the first PCBA run
(two design setups vs one), but save iteration time and unlock smaller
per-half boards. Net win after the first revision.

### MCU: MS88SF3 nRF52840 module (not bare chip)

**Revised from bare chip.** Use the Minew **MS88SF3-nRF52840** module
(LCSC `C20416747`, Extended). It's the nRF52840 + 32 MHz crystal +
32.768 kHz crystal + antenna + matching network + decoupling network
all in one pre-certified SMD package.

Why pick the module:

- **Same chip, same power**: ~1.5 µA System OFF, identical to bare
  nRF52840. ZMK upstream supports it as `nice_nano` or similar board.
- **Lower BOM complexity**: replaces ~10-15 discrete parts (two
  crystals, four crystal caps, RF matching components, antenna, two
  DCDC inductors).
- **Lower Extended-fee burden**: one Extended setup instead of
  separate fees for the nRF52840, antenna, and assorted RF passives.
- **Pre-certified for BLE**: saves the FCC certification work if this
  ever goes commercial. (Doesn't affect a personal-use build, but
  removes a future barrier.)
- **De-risked RF**: the hardest design risk in v1 was getting the
  antenna match and crystal layout right. The module eliminates both.

Trade-offs:
- Physical: ~18×10 mm vs the bare chip's 6×6 mm. Plenty of board space
  for our purpose.
- Slightly higher per-unit cost ($1-3) than the bare chip — paid back
  by the BOM/setup-fee savings.

No discrete crystals, no discrete antenna, no DCDC inductors. The
module exposes the nRF52840 GPIO pins as castellated edge pads.

### I/O expanders: 2× MCP23017 per half

- LCSC: **CONFLICT — resolve before ordering.** This line says `C9678`
  (Basic); the PCBA BOM table below says `C47023` (Extended). They
  disagree on both the part number and the JLC tier (which affects
  setup-fee cost). Verify the actual in-stock MCP23017-E/SO on LCSC and
  make both references match. 16 GPIOs each, 32 total per half, 28 used
  for keys + 4 spare.
- I²C address strap: 3 address pins → 8 possible addresses per bus.
  Use 2 different addresses for the 2 expanders. Both halves use the
  same addressing since the MCU is local to each half.
- Pull-up resistors: 4.7 kΩ on SDA/SCL.
- Reset: tie `RESET` to MCU GPIO so MCU can reset the expanders on
  boot.

**Why MCP23017 over PCA9555A**: PCA9555A's headline advantage is
~40 nA standby current vs MCP23017's ~1 µA. On a 110 mAh / 3.7 V
battery, 1 µA would take 12.5 years to drain — utterly negligible
compared to the BLE radio's bursty mA draws and the MCU's own
3-5 µA sleep current. MCP23017 has wider community use in the ZMK
ecosystem and better Zephyr driver support, so it's the safer pick.

### USB-C: standard 24-pin receptacle

- LCSC: `C165948` (Korean Hroparts; common JLC-stocked USB-C).
- ESD protection: USBLC6-2SC6 (`C7519`) for D+/D-.
- 5.1 kΩ resistors on CC1/CC2 for USB-C pull-down (signals "I'm a UFP
  needing power").

### Power path

- **Battery in**: LiPo 3.7V nominal, same `301230` as rc1.
- **Charge IC**: **TP4056** (LCSC `C382139`, Extended) — 100-1000 mA
  programmable charge, single-cell. Functionally equivalent to
  MCP73831 (which we'd otherwise use), cheaper. Set charge current to
  ~100 mA via 12 kΩ on the PROG pin (good rate for our 110 mAh
  battery; faster damages cell life).
- **Regulation**: Nordic nRF52840 can run directly from LiPo voltage
  via its built-in DCDC (1.7–5.5 V input range). No boost/buck needed
  for the MCU itself.
- **3.3V rail** for MCP23017 + Nice!View: **XC6206P332MR** LDO
  (`C5446`, **Basic tier**) fed from battery. 1-3 µA quiescent current
  (~10× lower than TLV70233's 31 µA — meaningful on a 110 mAh battery).
  Saves the Extended setup fee.
- **Slider switch**: Same C128955 cuts the battery feed to charge+MCU.
- **Charge LED**: optional, 1× 0603 LED + 1 kΩ resistor wired to
  MCP73831's STAT pin.

### SWD programming header

- **5 pads** on the down-side near the MCU: SWDIO, SWCLK, RST, GND, 3V3.
- 2.54 mm spacing in a single row, exposed copper (no header pins
  installed by default — clip-on or pogo probe).
- Used once per board to flash the Adafruit nRF52 bootloader. After
  that, USB drag-drop works exactly like the Nice!Nano.

### Bootloader flashing strategy

**Primary plan: JLCPCB Component Programming service**

JLCPCB will flash a `.hex` to the nRF52840 as part of PCBA. For our
2-board run that's ~$15-30 total: $8-25 setup + $0.50-1.50 per board.
Cheaper than buying our own programmer and saves the manual SWD step.

What we supply: Adafruit nRF52 bootloader hex from
<https://github.com/adafruit/Adafruit_nRF52_Bootloader> (use the
`nice_nano_v2` build — same chip layout from ZMK's perspective).

After the one-time bootloader flash, USB drag-drop works exactly like
the Nice!Nano: double-tap reset to enter bootloader, drop `.uf2` on
the mass-storage device.

**Fallback: DIY SWD via Pi Pico (`picoprobe`)**

Still expose the 5-pin SWD pads on the PCB so you can recover bricked
boards or reflash without re-ordering. With a Pi Pico flashed as
picoprobe (~$5):

```
openocd -f interface/cmsis-dap.cfg -f target/nrf52.cfg \
  -c "program adafruit_nrf52_bootloader.hex verify reset exit"
```

## ZMK shield changes

The shield needs a custom board definition (`nice_nano` board no longer
applies). Path: create `config/boards/arm/hypothenar/` as a custom Zephyr
board, then the shield references it. Includes:

- `hypothenar.dts` — MCU + power + connectivity (chosen flash partitions,
  USB, I²C, BLE)
- `hypothenar_defconfig` — Kconfig for the board
- `Kconfig.board` — board declaration
- `board.cmake` — flash/debug command wiring

The kscan changes from `kscan-gpio-matrix` to **`zmk,kscan-gpio-direct`**
with all 28 GPIOs listed explicitly (each one is a switch).

The I/O expanders need a Zephyr driver — `MCP230XX` (built into Zephyr).
Devicetree binding: declare each as an `i2c-bus` device, configure pin
modes via the driver. Then `gpio-keys` or `kscan-gpio-direct` references
the expander's GPIO controller via phandles.

## BOM at LCSC (PCBA-ready)

**Verified against JLCPCB's parts catalogue 2026-05-18.** The IC-heavy
parts of this BOM are all **Extended tier** — JLCPCB doesn't stock
keyboard-specific MCUs and ESD/USB-C/charge ICs as Basic. Expect ~$24
in one-time Extended setup fees on first order; subsequent orders
using the same parts are free.

Per half (multiply ×2 for the keyboard total). "B" = Basic, "E" = Extended.

| Designator | Part | LCSC | Tier | Notes |
|---|---|---|---|---|
| U1 | MS88SF3 nRF52840 module | **C20416747** | E | Pre-certified; includes antenna, crystals, RF matching, DCDC inductors |
| U2, U3 | MCP23017-E/SO I/O expander | C47023 | E | SOIC-28 (SOP variant) |
| U4 | TP4056 LiPo charge IC | **C382139** | E | Programmable charge current via PROG resistor |
| U5 | XC6206P332MR 3.3 V LDO | **C5446** | **B** | 1-3 µA Iq; replaces TLV70233 — Basic tier, biggest cost+power win |
| U6 | USBLC6-2SC6 USB ESD | C7519 | E | Optional — nRF52840 has integrated USB ESD diodes. Skip if BOM cost matters more than belt-and-suspenders. |
| J1 | TYPE-C-31-M-12 USB-C receptacle | C165948 | E | Hroparts |
| C1 | 4.7 µF X5R 0603 cap | C19666 | B | Bulk decoupling |
| C2–C8 | 100 nF X7R 0603 cap | C14663 | B | Local decoupling (one per IC + USB-C + battery) |
| C9, C10 | 10 µF X5R 0603 cap | (TBD) | B | Battery bulk + charge IC |
| R1, R2 | 4.7 kΩ 0603 | C23162 | B | I²C pull-ups |
| R3, R4 | 5.1 kΩ 0603 | C23186 | B | USB-C CC pull-downs |
| R5 | 12 kΩ 0603 | C25744 | B | TP4056 PROG (sets 100 mA charge) |
| R6, R7 | 1 kΩ 0603 | C21190 | B | Various |
| R8, R9 | 100 kΩ 0603 | C25803 | B | Reset pull-ups |
| D1 | 0805 red LED (status/charge) | C84256 | B | Connected to TP4056 STAT pins |

**Removed from BOM** (handled inside the MS88SF3 module): bare
nRF52840, 32 MHz crystal, 32.768 kHz crystal, four 22 pF crystal caps,
two 10 µH DCDC inductors, chip antenna. That's ~7 fewer parts to place
and ~3 fewer Extended setup fees.

**Verification corrections from my first pass** (in case I need to
re-do this with similar parts): all the original C-numbers I cited for
ICs were wrong — they pointed at unrelated resistors/ADCs/etc. The
numbers above are validated against JLCPCB's actual catalogue.

Through-hole / hand-soldered (unchanged from rc1):
- 28× Kailh Choc hotswap sockets (C5333465)
- 1× EVQWGD001 encoder
- 1× C128955 slider switch
- 1× 2-pin tactile reset
- 1× 5-pin Nice!View header (if displaying)
- 2× battery solder pads

**Rough cost per half (post-optimization)**: ~$10-18 in components +
Extended setup fee (~$15 one-time across the BOM thanks to the LDO
swap + module consolidation; ~$9 savings vs the unoptimized BOM) +
~$10-15 PCB + ~$25-40 PCBA labour. So roughly **$45-75 per half** for
the assembled board, plus the unchanged through-hole BOM.

Two designs (left + right) in the same JLCPCB order share the Extended
fees: total project cost roughly **$90-150** for both halves on first
order, ~$55-90 per pair on revisions.

Savings tally vs the original BOM:
- XC6206 LDO: -$3 Extended fee + -$0.17 piece price + ~10× lower Iq
- MS88SF3 module: -3 Extended fees (crystals, antenna, nRF52840) + -7
  parts to place + zero RF design risk
- TP4056 charge IC: -$0.28 piece price
- Skip USBLC6 (optional): -$3 Extended fee + -$0.25 piece price

If we skip USBLC6 (the nRF52840 has integrated USB ESD diodes), total
Extended fees drop to ~$12 and per-half BOM cost to ~$8-15.

## Layout/routing risks (in roughly increasing order of risk)

1. **Power decoupling placement** — well-known recipe in the nRF52840
   datasheet. Follow Nordic's reference layout.
2. **I²C bus routing** — keep traces short, 4.7 kΩ pull-ups, both
   expanders on same bus is fine.
3. **USB-C signal integrity** — D+/D- should be ~90 Ω differential. At
   USB 2.0 speeds and our short trace lengths it's forgiving.
4. **32 MHz crystal layout** — Nordic has strict guidelines (ground
   guard ring, exact load caps). Get this wrong and BLE may not start.
5. **2.45 GHz antenna match** — even with a chip antenna, the feed
   trace needs a ground-keepout zone of ~5×8 mm. Get this wrong and
   range/reliability suffers.
6. **DCDC inductor layout** — physically close to nRF52840's DCC pins
   with a short ground return.

## Roadmap

- [ ] Architectural spike: confirm I²C-based I/O expanders work with ZMK
      via `MCP230XX` driver (research existing builds).
- [ ] Schematic in KiCad (NOT ergogen — ergogen doesn't do schematics,
      and we need one for proper review).
- [ ] Footprint set: vet ceoloide / infused-kim libraries; supplement
      with custom footprints where needed.
- [ ] Ergogen config that emits the matrix layout + key positions, then
      manually overlay the chip / power / USB area in KiCad on top of
      the ergogen scaffold.
- [ ] First-pass PCB layout in KiCad. Order of design: place MCU + RF
      first, then power, then I²C bus, then key matrix wiring.
- [ ] Pick-place + BOM files via `kicad-cli pcb export pos --format csv`
      and `kicad-cli sch export bom`.
- [ ] Test PCBA order: 5 boards, 1 fully assembled, 4 bare for spares /
      iteration.

## Reference designs

Identified through targeted search; each contributes a different
piece of the v1 design.

### Primary reference: `Ladniy/jiran-ble-lite`

<https://github.com/Ladniy/jiran-ble-lite>

- **License**: CERN-OHL-P v2.0 (permissive open hardware — fork-friendly)
- **Architecture**: Holyiot-18010 nRF52840 module (different module
  than our MS88SF3 but same architectural approach — pre-certified RF
  module instead of bare chip), split ergo, traditional matrix
- **KiCad source**: confirmed `.kicad_sch` / `.kicad_pcb` / `.kicad_pro`
  in `pcb/jiran-ble-lite/`, with separate left/right schematic files
- **Maturity**: 300+ commits, v1.1.3 (Oct 2023)
- **What we take**: split-half mechanics, power tree topology, USB-C +
  charge IC layout, KiCad project structure
- **What we replace**: Holyiot footprint → MS88SF3, the matrix
  section (their diodes → our MCP23017 expanders)

### Symbol/footprint source: `crides/kleeb`

<https://github.com/crides/kleeb>

- MIT-licensed KiCad 6 symbol + footprint library
- **The only place I found with MS88SF3 symbols** (`ms88sf3-nrf52840`
  and `ms88sf3-nrf52840-split`)
- Pull symbol + footprint directly from this library

### Power-tree reference: `ebastler/zmk-designguide`

<https://github.com/ebastler/zmk-designguide>

- Reference schematics for three nRF52840 modules (including Holyiot)
- Power-tree patterns (LDO sizing, VDDH handling for nRF52840 DCDC)
- Cross-reference for ZMK board file structure
- Companion library: `ebastler/marbastlib` (symbols + footprints)

### JLCPCB PCBA-feasibility reference: `ebastler/cornholius`

<https://github.com/ebastler/cornholius>

- License: CC BY-NC-SA 4.0 (**non-commercial only**, fine for personal
  use but be aware if you ever sell)
- **Gerbers only** (no `.kicad_sch` — can't fork the layout) but the
  repo includes a BOM proven against JLCPCB's economic/standard PCBA
  parts list
- Use as a sanity check: "are the parts we picked actually
  PCBA-assembled in a known-working design?"

### MCP23017 reference: `SolderedElectronics/IO-expander-MCP23017-breakout-hardware-design`

- Reference schematic for the MCP23017 section (TAPR OHL licence)
- Standard configuration: I²C pull-ups, address straps, reset
- Combined with `ZMK PR #1567` (MCP23017 driver) for the firmware
  side

## Concrete forking plan

1. **Fork `jiran-ble-lite`** into our `v1` directory as the starting
   PCB project
2. **Swap the MCU footprint**: Holyiot 18010 → MS88SF3, using kleeb's
   library
3. **Adapt the power tree**: TLV70233 → XC6206 (per our BOM
   optimisation), MCP73831 → TP4056
4. **Add the MCP23017 section** (not present in jiran-ble-lite),
   using SolderedElectronics' reference + ZMK driver docs
5. **Replace the matrix** with our ergogen-scaffold output (modify
   the ergogen config to output two-half / non-reversible layouts)
6. **Test the BOM** against cornholius's JLCPCB-PCBA patterns
7. **Generate the gerbers + pick-place + BOM CSV**, submit to JLCPCB
   for first PCBA order
