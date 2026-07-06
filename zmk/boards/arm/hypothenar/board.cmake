# SPDX-License-Identifier: MIT
#
# hypothenar board is flashed via the Adafruit nRF52 bootloader (UF2
# drag-drop over USB mass storage). For SWD recovery use the openocd
# config in scripts/openocd-picoprobe.cfg.

board_runner_args(jlink "--device=nRF52840_xxAA" "--speed=4000")
include(${ZEPHYR_BASE}/boards/common/openocd-nrf5.board.cmake)
include(${ZEPHYR_BASE}/boards/common/jlink.board.cmake)
