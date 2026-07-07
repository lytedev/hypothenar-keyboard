# Power budget & battery-life estimate

Analytical estimate for the hypothenar's 110 mAh (301230) LiPo, built
from datasheet figures and ZMK community baselines. This is a
**prediction with error bars, not a measurement** — the free empirical
check is logging ZMK's BLE battery telemetry on real hardware over a
week (see "Validating" below).

Numbers marked *typ* are typical datasheet values; real silicon and
temperature spread them. Where a figure comes from community
measurement rather than a datasheet it is marked *(community)*.

## Always-on floor (everything idle, radio connected)

| Draw | Current (typ) | Source |
|---|---|---|
| nRF52840, BLE connected idle (30 ms conn. interval) | ~50–100 µA | *(community)* — [ZMK power profiler](https://zmk.dev/power-profiler) baseline for nice!nano-class nRF52840 boards |
| XC6206P332MR LDO quiescent | 1–3 µA | [Torex XC6206 datasheet](https://www.torexsemi.com/file/xc6206/XC6206.pdf), Iq typ 1 µA |
| MCP23017 standby × 2 | ~2 µA | [MCP23017 datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/20001952C.pdf), Icc standby 1 µA max each |
| TP4056 battery reverse leakage (no USB) | ~2 µA | TP4056 datasheet (NanJing TopPower; no stable URL — value from the commonly distributed datasheet, flagging accordingly) |
| Battery ADC divider | ~0 (switched) | Divider is behind the P0.05 enable GPIO; conducts only during samples |
| **Idle total** | **~60–110 µA** | |

## Deep sleep (ZMK soft-off / System OFF after idle timeout)

| Draw | Current (typ) | Source |
|---|---|---|
| nRF52840 System OFF, full RAM retention | ~1.5–3 µA | Nordic nRF52840 datasheet, "Current consumption" (docs.nordicsemi.com) |
| LDO + MCP23017 ×2 + TP4056 | ~5 µA | as above — these stay powered |
| **Sleep total** | **~7 µA** | |

Requires `CONFIG_ZMK_SLEEP=y` (not currently set — see Actions).

## The term that dominates: switch scanning

This design has no matrix — 28 switches sit behind two I²C expanders,
and `zmk,kscan-gpio-direct` reads them through the Zephyr MCP23xxx
driver. Two very different worlds:

- **Interrupt mode (what we wired)**: INTA of each expander → MCU GPIO
  (P0.30 / P0.02). Idle cost ≈ 0; each keypress costs a sub-ms I²C
  burst. At heavy typing (~5 keys/s) the scanning term averages
  **< 10 µA**. Rounding error.
- **Polling fallback (if interrupts were broken)**: reading both
  expanders every ~10 ms keeps the MCU + I²C bus duty-cycled
  continuously — order **300–500 µA average**, i.e. the battery dies
  in **~9–14 days** regardless of everything else. This is why the
  INT traces exist.

## Duty-cycle scenarios (interrupt mode)

Assume 16 h/day awake-and-connected, 8 h/day deep sleep:

| | mAh/day | 110 mAh lasts |
|---|---|---|
| Optimistic (60 µA idle, sleep works) | ~1.0 | **~3.5 months** |
| Central (90 µA idle) | ~1.5 | **~2.5 months** |
| Pessimistic (110 µA + no deep sleep, 24 h connected) | ~2.6 | **~6 weeks** |
| Polling fallback (broken interrupts) | ~8–12 | **~9–14 days** |
| Realistic 8 h/day active use + 15 h deep sleep | ~1.3 | **~2.5–3 months** |

Typing adds surprisingly little: connected-idle already pays the BLE
keep-alive tax, and active keystrokes only add ~50–150 µA *while
typing* (~5 µC per radio event at 10–20 events/s — estimate from BLE
event-charge math; the ZMK power profiler models the same). Battery
life is governed by **hours connected**, not keystrokes — a real
workday with aggressive sleep matches the 16 h-connected scenario.

The right half (peripheral) sits in the same band — its BLE peripheral
link to the central costs about the same as the central's dual role.

Adds if fitted: nice!view display ≈ +2–15 µA (Sharp memory LCD;
negligible). A rest-closed encoder contact against an internal ~13 kΩ
pull-up would cost ~250 µA — **verify at bring-up that the EVQWGD001's
detent-rest position leaves both contacts open**; if not, the pulls
need to be external and larger.

## Bottom line

**~2–3.5 months** per charge if the interrupt path works and deep
sleep is enabled; **~9–14 days** if scanning silently degrades to
polling. The gap between those two numbers is the entire reason the
INTA traces are on the board, and it is also the cheapest possible
test instrument: battery life in *weeks* = interrupts broken, in
*months* = working — readable from ZMK's own battery telemetry with
no bench equipment.

## Actions this analysis produced

- [x] Wire MCP23017 INTA → MCU (P0.30/P0.02) — done
- [ ] Enable `CONFIG_ZMK_SLEEP=y` (+ idle timeout) in the config
- [ ] At bring-up: verify encoder rest-state contacts are open
- [ ] Validate: log BLE-reported battery % over a week of real use
      (upower on the connected host, 15-min samples); slope → real
      battery life. No PPK2 required.
