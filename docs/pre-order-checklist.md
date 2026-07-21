# Pre-order checklist — the gate to a fab-ready PCBA

**Verdict as of this pass: NOT ready to order.** This board is a JLCPCB
pick-and-place run — SMD parts are baked in and cannot be reworked — and
it has **no schematic / no ERC**, so the ergogen nets are the only
netlist. This checklist is the gate: the board is "known ready to order"
only when every 🔴 item below is done and both halves pass a clean DRC.

Derived from the 2026-07 validation pass (netlist ERC cross-read +
`kicad-cli` DRC on `routed/keyboard-left.kicad_pcb` + BOM review).

> **⚠️ ARCHITECTURE CHANGED (2026-07): I2C expanders → diode matrix.**
> The 2× MCP23017 + I2C are gone; switches now scan as a direct diode
> matrix off the MS88SF3 (ergogen done + validated). This makes some
> items below stale — the routed boards are now doubly-outdated (the old
> layout AND the old architecture), so **both halves are a fresh route
> from the new scaffold.** Two new must-do items:
> - **Firmware kscan conversion** ✅ DONE — swapped to
>   `zmk,kscan-gpio-matrix` (6×12 transform, `diode-direction=col2row`) on
>   the verified pins; i2c/mcp nodes removed; encoder rotation fixed to
>   MCU P0.29/P0.28 (was the old mcp bug). **Builds clean both halves**
>   (`nix build .#firmware`). Two follow-ups, neither blocking:
>   *(a)* encoder **button** (ENC_SW=P0.13) still not scanned — it wasn't
>   before either; add via kscan-composite when wanted. *(b)* right-half
>   **column order** on the mirrored PCB is a bring-up-verify item (reverse
>   col-gpios in the right overlay if reversed — the thenar's bug class).
> - **BOM update** (part of item 4): remove the 2× MCP23017 + I2C
>   pull-ups/decoupling; add 28 diodes/half (Basic, e.g. 1N4148W / SOD-123)
>   — net *savings* (drops ~2 Extended setup fees).

---

## Done in this pass (source fixes)

- ✅ **MS88SF3 pad map datasheet-verified** (the foundational gate) — all
  assigned pads correct against Minew rev-K; see item 1 below.
- ✅ **Battery-sense divider resistors added** — R9 (820k, VBAT→BATT_ADC)
  + R10 (2.0M, BATT_ADC→BATT_ADC_EN), matching the firmware's divider
  (`output-ohms=2.0M`, `full-ohms=2.82M`). `BATT_ADC` was a floating
  single-pad net; now connected. *Verify R9/R10 placement on regen —
  shifts are near the MCU decoupling and may need nudging (a re-route is
  required anyway).*
- ✅ **Stale pin comment in `hypothenar.dts` deleted** — it listed
  `P14=USB_DP / P20=I2C_SCL / …`, which was wrong and would have
  sabotaged the datasheet cross-check.
- ✅ **BOM MCP23017 conflict flagged** — `C9678`/Basic (body) vs
  `C47023`/Extended (BOM table). Must be resolved (see 🔴 below).

## Verified GOOD (don't re-litigate)

- I²C bus: SDA=P0.26 / SCL=P0.27 match firmware; 4.7k pull-ups present;
  two MCP23017s at distinct 0x20 / 0x21.
- **Both INTA interrupt lines** wired and match firmware (P0.30 / P0.02)
  — the weeks-vs-months power factor is correct.
- Power tree: VBAT → TP4056 BAT / LDO VIN / MCU VDDH; PROG 12k → ~100 mA;
  CC pull-downs present; no power-net shorts.

---

## 🔴 Blocking requirements — must all be done before ordering

### 1. GATE — datasheet-verify the MS88SF3 pad map ✅ DONE (2026-07)
Cross-checked every assigned pad against the **Minew MS88SF3 rev-K
datasheet** (Datasheet_K_EN, §3 Pin Description diagram). **All correct,
pad-for-pad** — GND 1/18/34, VDD 31, VDDH 32, VBUS 35, D- 36, D+ 37,
SWDIO 49, SWCLK 50, and every GPIO (P9=P0.02, P10=P0.29, P11=P0.28,
P12=P0.30, P13=P0.31, P14=P0.27, P15=P0.05, P16=P0.04/AIN2, P17=P0.26,
P28=P0.18, P41=P0.17, P44=P0.20, P45=P0.22). Pads 33=DCCH / 51=RF
correctly NC. `config.yaml` + `hypothenar.dts` status updated. **Gate
cleared** — the netlist rests on a correct foundation.

### 2. Add the SWD + debug/expansion breakout header ✅ DONE (source)
`ergogen/footprints/breakout.js` + a `breakout` entry now expose **SWD
(SWDIO/SWCLK/RST) + power (3V3/GND/VBAT) + all 34 free nRF GPIOs** on a
2×20 header, auto-wired via net defaults (the 34 free MS88SF3 pads carry
`GP_*` nets that land on the header). Validated: ergogen regenerates,
KiCad loads it (J1), each `GP_*` net connects MCU-pad↔header-pad. This
kills the unprogrammable-brick blocker. **Remaining (yours, in KiCad):**
the 2×20 header is ~50×5 mm and a placeholder position — **relocate it to
open board space and trim pads/rows** to what fits ("start Max, shrink").
Its routing folds into item 3.

Original context (the matrix is entirely on the I²C expanders, so most
GPIOs are free):
- **SWD/bring-up (required):** SWDIO, SWCLK, RESET, GND, 3V3 (VDD_MCU).
- **Power taps:** VBAT, VBUS (optional).
- **Free GPIO expansion:** the pad map is now verified, so here is the
  full free-GPIO list (unused, real nRF52840 GPIOs). Pick as many as the
  header size allows:
  - **P0 free (18):** P0.00·pad25, P0.01·pad24, **P0.03·pad6 (AIN1 — the
    one free analog-capable pin)**, P0.06·21, P0.07·20, P0.08·27,
    P0.09·55, P0.10·56, P0.11·23, P0.13·39, P0.14·30, P0.15·40, P0.16·29,
    P0.19·38, P0.21·42, P0.23·43, P0.24·46, P0.25·48
  - **P1 free (16):** P1.00·47, P1.01·59, P1.02·52, P1.03·60, P1.04·53,
    P1.05·58, P1.06·54, P1.07·57, P1.08·22, P1.09·26, P1.10·4, P1.11·2,
    P1.12·3, P1.13·7, P1.14·5, P1.15·8
  - ~34 free GPIOs total — the matrix is entirely on the I²C expanders,
    so the MCU is wide open. Note P0.00/P0.01 (pads 24/25) are the LFXO
    pins; the module has no 32 kHz crystal (ZMK uses internal RC), so
    they're usable as GPIO — but if you ever want a real 32 kHz crystal,
    reserve them.
- Needs a header/test-pad footprint (model on `battery_pads.js`) + a
  placement on the board. *Can be implemented here — say which/how many
  free pins to break out and I'll add the footprint + nets.*

### 3. Finish routing — per half, to a clean DRC
The left half is a ~95% freerouting **baseline**, not a finished board;
the right half isn't routed at all.
- **Left (`routed/keyboard-left.kicad_pcb`):** fix **4 USB shorts**
  (`USB_DP/USB_DM/VBUS/GND` ring at the connector) and route the **8
  opens** (incl. `USB_DP` pad A6, thumb switch S27, several GND pads).
- **Right half:** route it (mirror/second layout) from the updated
  scaffold.
- Re-run `kicad-cli pcb drc` on **each** half → **0 errors, 0 unconnected
  items** is the gate (silk/text warnings are fine; relax copper-to-edge
  to JLC's 0.3 mm min or nudge the 5 offenders).

### 4. Resolve the BOM MCP23017 part number
Verify the in-stock LCSC part (`C9678` vs `C47023`) and tier, make the
`design.md` body and BOM table agree, and confirm **USBLC6** is a BOM row
(it's in the netlist but wasn't in the table rows checked).

---

## 🟡 Should-do (not strictly order-blocking)

- **Encoder is mis-wired in firmware, not hardware** — the PCB is fine
  (quadrature on MCU P0.29/P0.28, button on `mcp_b` GPA4). Firmware reads
  `mcp_b 4/5`, so as-is the encoder + its button are dead. Fix in
  firmware (no PCB change): set `hypothenar.dtsi` `a-gpios=<&gpio0 29 …>`,
  `b-gpios=<&gpio0 28 …>`, and add `mcp_b` GPA4 to the kscan + a keymap
  position for the button. Doesn't block the order.
- **USBLC6 footprint pinout** — eyeball the pad→pin map in KiCad once
  (shunt ESD on DP/DM/VBUS/GND); low risk, but unverifiable statically.
- **Charge-while-off** — the slider sits *before* the TP4056
  (`VBAT_SW → slider → VBAT → charger`), so **slider off = no charging**
  (same trap as the thenar). If you want off-but-charging, rearrange:
  cell always on the TP4056 BAT, slider as a load switch on VBAT→MCU.
  Design decision.
- **Nice!View SPI** defined in pinctrl but no `&spi0`/display node in the
  DTS — display won't drive until added (firmware-only, post-order OK).

---

## Definition of "known ready to order"

All four 🔴 done, i.e.:
1. MS88SF3 pad map datasheet-signed-off, `config.yaml` + `hypothenar.dts`
   in lockstep.
2. SWD + breakout header on the board.
3. **Both** halves route to **0 DRC errors + 0 unconnected**.
4. BOM part numbers verified in-stock, no conflicts, USBLC6 present.

Then: export gerbers + drills per half (`build-recipe.md` Stage 6–7),
upload to JLCPCB, order. The 🟡 items can trail (firmware/optional).
