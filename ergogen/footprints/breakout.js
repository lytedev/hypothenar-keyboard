// Debug + expansion breakout header.
//
// Breaks out SWD (SWDIO/SWCLK/RST), power (3V3/GND/VBAT), and ALL free
// nRF52840 GPIOs to a 2x20 (40-pin) 2.54 mm through-hole header. The key
// matrix lives entirely on the I2C expanders, so ~34 MCU GPIOs are spare;
// this exposes every one for future peripherals (I2C/SPI/UART/PWM are
// mappable to any pin in firmware; P0.03 is the one free AIN/analog pin).
//
// Net defaults match the GP_<port>_<pin> nets the MS88SF3 free pads carry
// in config.yaml (+ SWDIO/SWCLK/RESET/VCC/GND/VBAT), so it auto-connects
// with no per-net wiring in the config - just place it.
//
// This is a "start Max, trim in KiCad" footprint: delete pads/rows you
// don't need and shrink it once you see the routing/space. Hand-soldered
// (or leave unpopulated as test pads), so not part of PCBA placement.
//
// Pin order (col-major, 2 rows): pad 1=SWDIO, 2=SWCLK, 3=RST, 4=3V3,
// 5=GND, 6=VBAT, then the free GPIOs.

const PINS = [
  ['SWDIO', 'SWDIO'], ['SWCLK', 'SWCLK'], ['RST', 'RESET'],
  ['3V3', 'VCC'], ['GND', 'GND'], ['VBAT', 'VBAT'],
  ['P0.03', 'GP_P0_03'], ['P0.06', 'GP_P0_06'], ['P0.07', 'GP_P0_07'],
  ['P0.08', 'GP_P0_08'], ['P0.09', 'GP_P0_09'], ['P0.10', 'GP_P0_10'],
  ['P0.11', 'GP_P0_11'], ['P0.13', 'GP_P0_13'], ['P0.14', 'GP_P0_14'],
  ['P0.15', 'GP_P0_15'], ['P0.16', 'GP_P0_16'], ['P0.19', 'GP_P0_19'],
  ['P0.21', 'GP_P0_21'], ['P0.23', 'GP_P0_23'], ['P0.24', 'GP_P0_24'],
  ['P0.25', 'GP_P0_25'], ['P0.00', 'GP_P0_00'], ['P0.01', 'GP_P0_01'],
  ['P1.00', 'GP_P1_00'], ['P1.01', 'GP_P1_01'], ['P1.02', 'GP_P1_02'],
  ['P1.03', 'GP_P1_03'], ['P1.04', 'GP_P1_04'], ['P1.05', 'GP_P1_05'],
  ['P1.06', 'GP_P1_06'], ['P1.07', 'GP_P1_07'], ['P1.08', 'GP_P1_08'],
  ['P1.09', 'GP_P1_09'], ['P1.10', 'GP_P1_10'], ['P1.11', 'GP_P1_11'],
  ['P1.12', 'GP_P1_12'], ['P1.13', 'GP_P1_13'], ['P1.14', 'GP_P1_14'],
  ['P1.15', 'GP_P1_15'],
];

const PITCH = 2.54;

const params = { designator: 'J', side: 'F' };
PINS.forEach((pin, i) => {
  params['n' + i] = { type: 'net', value: pin[1] };
});

module.exports = {
  params,
  body: p => {
    let pads = '';
    PINS.forEach((pin, i) => {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const x = (col * PITCH).toFixed(3);
      const y = (row * PITCH).toFixed(3);
      const net = p['n' + i];
      // labels: row 0 above, row 1 below, so text doesn't collide
      const ly = (row === 0 ? Number(y) - 1.5 : Number(y) + 1.5).toFixed(3);
      pads += `
    (pad ${i + 1} thru_hole circle (at ${x} ${y} ${p.rot}) (size 1.7 1.7) (drill 1.0)
      (layers *.Cu *.Mask) ${net.str})
    (fp_text user "${pin[0]}" (at ${x} ${ly} ${p.rot}) (layer ${p.side}.SilkS)
      (effects (font (size 0.5 0.5) (thickness 0.08))))`;
    });
    return `
    (module breakout_header (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "Debug + expansion breakout: SWD + power + all free nRF GPIOs, 2x20 2.54mm")
    (tags "breakout debug swd expansion header")
    (fp_text reference "${p.ref}" (at 0 -2.6) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 0.7 0.7) (thickness 0.1))))
    (fp_text value "BREAKOUT" (at 0 5.1) (layer ${p.side}.Fab) hide
      (effects (font (size 0.7 0.7) (thickness 0.1))))
    ${/* pin-1 square marker */ ''}
    (fp_line (start -1.5 -1.5) (end -1.5 1.5) (layer ${p.side}.SilkS) (width 0.12))
    ${pads}
    )
  `;
  },
};
