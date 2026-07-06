# Hypothenar firmware

ZMK firmware for the v1 PCBA build (MS88SF3 module + 2× MCP23017 per
half over I²C, switch-per-pin, no diodes).

## Status: skeleton

This is a starting point that compiles in principle, NOT a verified
working firmware. Several pin assignments are placeholders that must
be reconciled against the final PCB:

- **MS88SF3 pad-to-nRF52840 GPIO map** — confirm against the Minew
  datasheet, then update both `hypothenar-pinctrl.dtsi` AND
  `./ergogen/config.yaml` together so wiring matches the firmware.
- **I²C addresses** — `mcp_a` at `0x20`, `mcp_b` at `0x21` matches
  the address-strap wiring in the ergogen config. If you change those,
  update `hypothenar.dts`.
- **Battery voltage divider GPIO** — `vbatt` references `&gpio0 13`;
  the actual divider pin depends on which MS88SF3 pad is used.

The first physical board will need a debug pass to verify all of the
above before this firmware works end-to-end.

## Layout

```
zmk/
├── boards/arm/hypothenar/        # Custom Zephyr board for MS88SF3
│   ├── board.cmake
│   ├── Kconfig.board
│   ├── Kconfig.defconfig
│   ├── hypothenar.dts            # MCU + I²C + MCP23017 children
│   ├── hypothenar-pinctrl.dtsi   # Pin selections
│   ├── hypothenar.yaml           # Board metadata
│   └── hypothenar_defconfig
├── boards/shields/hypothenar/    # Keyboard shield
│   ├── Kconfig.shield
│   ├── Kconfig.defconfig
│   ├── hypothenar.dtsi           # kscan + transform + encoder
│   ├── hypothenar-layouts.dtsi   # Physical positions for Studio
│   ├── hypothenar_left.overlay   # Left half input-gpios list
│   ├── hypothenar_right.overlay  # Right half input-gpios list
│   └── hypothenar.keymap         # Default keymap
├── build.yaml
└── west.yml
```

## Build

```bash
# All-in-one (firmware + flash helper):
nix build .#firmware
nix run .#flash -- left
nix run .#flash -- right

# Or just one half:
nix build .#firmware-left
nix build .#firmware-right
```

The first build fetches Zephyr deps and fails with a hash mismatch.
Copy the hash from the failure message into `flake.nix` (the
`v1-firmware`'s `zephyrDepsHash`) and rebuild.

## Topology notes

Why switch-per-pin (no matrix, no diodes):

- 2× MCP23017 per half give 32 GPIOs; we use 28 of them.
- Each switch shorts a single MCP23017 pin to GND when pressed; the
  driver's internal pull-up keeps the line high otherwise.
- ZMK's `zmk,kscan-gpio-direct` driver polls the expanders over I²C.
- No charlieplexing, no row/column matrix, no diodes — simplest
  electrical topology, but the per-switch I/O cost is higher (32 pins
  vs ~12 for a traditional matrix).

Why this works on a battery-powered keyboard:

- MCP23017 quiescent current is ~1 µA, negligible vs the BLE radio.
- I²C bus is only polled when a switch state changes (interrupt-
  driven) — the MCP23017 INT pin can wake the MCU from sleep.

Caveat (future work): the current shield reads the expanders by
polling, not via the MCP23017's interrupt pin. For battery life that
matters; wire `INTA`/`INTB` of each expander to an MCU GPIO and add
an interrupt binding to the kscan node. See ZMK's docs on
`gpio-input-bind` for the pattern.

## ZMK Studio support

`hypothenar-layouts.dtsi` defines the physical layout for ZMK Studio so
you get a keymap visualizer. Positions come from the rc1 layout (same
key geometry) — verify the v1 PCB outline hasn't drifted before you
trust the visualization.
