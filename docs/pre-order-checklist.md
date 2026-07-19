# Pre-order checklist — the gate to a fab-ready PCBA

**Verdict as of this pass: NOT ready to order.** This board is a JLCPCB
pick-and-place run — SMD parts are baked in and cannot be reworked — and
it has **no schematic / no ERC**, so the ergogen nets are the only
netlist. This checklist is the gate: the board is "known ready to order"
only when every 🔴 item below is done and both halves pass a clean DRC.

Derived from the 2026-07 validation pass (netlist ERC cross-read +
`kicad-cli` DRC on `routed/keyboard-left.kicad_pcb` + BOM review).

---

## Done in this pass (source fixes)

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

### 1. GATE — datasheet-verify the MS88SF3 pad map *(blocks everything else)*
`ergogen/config.yaml` self-labels the pad map "NOT VALIDATED." Every net
above rests on it. Cross-check **every** assigned MS88SF3 pad (P1,P9–P18,
P28,P31,P32,P34–P37,P41,P44,P45,P49,P50) against the **Minew MS88SF3
rev-K datasheet** pad→nRF52840-pin drawing. Update `config.yaml` +
`hypothenar.dts` in lockstep for any correction. *Needs the datasheet —
provide it and this can be done here.* Until this is signed off, nothing
downstream is trustworthy.

### 2. Add the SWD + debug/expansion breakout header
Currently `SWDIO`/`SWCLK` are dead-end single-pad nets and there is **no
programming footprint** — a bare nRF52840 with no SWD is an
**unprogrammable brick out of the oven.** Combine with the expansion
breakout you want (the matrix is entirely on the I²C expanders, so most
GPIOs are free):
- **SWD/bring-up (required):** SWDIO, SWCLK, RESET, GND, 3V3 (VDD_MCU).
- **Power taps:** VBAT, VBUS (optional).
- **Free GPIO expansion:** break out the unused MS88SF3 GPIO pads. Of 64
  module pads, ~23 are assigned; the rest are free — but **which free
  pads are real nRF GPIOs (vs NC/GND) requires the verified pad map
  (item 1)**, so finalize the GPIO selection *after* the datasheet pass.
- Needs a header/test-pad footprint (model on `battery_pads.js`) + a
  placement on the board. *Can be implemented here once item 1 fixes the
  free-pad→GPIO list.*

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
