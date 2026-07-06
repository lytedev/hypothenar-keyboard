// MCP23017-E/SO 16-bit I/O expander in SOIC-28W package.
// LCSC C47023, Extended tier on JLCPCB.
//
// Pin map (Microchip standard pinout):
//    1  GPB0    14 GPA7
//    2  GPB1    13 GPA6
//    3  GPB2    12 GPA5
//    4  GPB3    11 GPA4
//    5  GPB4    10 GPA3
//    6  GPB5     9 GPA2
//    7  GPB6     8 GPA1
//    8  GPB7     7 GPA0
//
//   28 GPA7  -> (pin 14)
//   ...
//   17 GPA0
//
//   Actually the canonical pinout:
//     1 GPB0   28 GPA7
//     2 GPB1   27 GPA6
//     3 GPB2   26 GPA5
//     4 GPB3   25 GPA4
//     5 GPB4   24 GPA3
//     6 GPB5   23 GPA2
//     7 GPB6   22 GPA1
//     8 GPB7   21 GPA0
//     9 VDD    20 INTA
//    10 VSS    19 INTB
//    11 NC     18 RESET (active low)
//    12 SCK    17 A2 (address)
//    13 SDA    16 A1
//    14 NC     15 A0
//
// SOIC-28W is 7.5mm wide, 1.27mm pitch, 17.9mm long body.
module.exports = {
  params: {
    designator: 'U',
    side: 'F',
    // GPB bank (pins 1-8). Default each to a unique placeholder net so any
    // unconnected GPIO shows up with a unique name in the kicad_pcb instead
    // of all collapsing onto a single "" net. Override in pcbs config.
    GPB0: { type: 'net', value: 'GPB0_NC' },
    GPB1: { type: 'net', value: 'GPB1_NC' },
    GPB2: { type: 'net', value: 'GPB2_NC' },
    GPB3: { type: 'net', value: 'GPB3_NC' },
    GPB4: { type: 'net', value: 'GPB4_NC' },
    GPB5: { type: 'net', value: 'GPB5_NC' },
    GPB6: { type: 'net', value: 'GPB6_NC' },
    GPB7: { type: 'net', value: 'GPB7_NC' },
    // GPA bank (pins 21-28)
    GPA0: { type: 'net', value: 'GPA0_NC' },
    GPA1: { type: 'net', value: 'GPA1_NC' },
    GPA2: { type: 'net', value: 'GPA2_NC' },
    GPA3: { type: 'net', value: 'GPA3_NC' },
    GPA4: { type: 'net', value: 'GPA4_NC' },
    GPA5: { type: 'net', value: 'GPA5_NC' },
    GPA6: { type: 'net', value: 'GPA6_NC' },
    GPA7: { type: 'net', value: 'GPA7_NC' },
    // Power
    VDD: { type: 'net', value: 'VCC' },
    VSS: { type: 'net', value: 'GND' },
    // I2C
    SCL: { type: 'net', value: 'I2C_SCL' },
    SDA: { type: 'net', value: 'I2C_SDA' },
    // Control
    RESET: { type: 'net', value: 'I2C_RESET' },
    A0: { type: 'net', value: 'GND' },  // address pins; tie to GND or VCC
    A1: { type: 'net', value: 'GND' },  // each combination gives unique I2C addr
    A2: { type: 'net', value: 'GND' },  // override per-chip in the ergogen config
    INTA: { type: 'net', value: 'GND' },  // interrupt outputs, often unused
    INTB: { type: 'net', value: 'GND' },
  },
  body: p => {
    // Helper: generate the 28 pads of a SOIC-28W footprint
    // Pads on each side at 1.27mm pitch, ±3.95mm horizontal from center.
    // Pin 1 is bottom-left, numbering goes counter-clockwise.
    const pad = (n, x, y, net) =>
      `(pad ${n} smd rect (at ${x} ${y} ${p.rot}) (size 2.0 0.6)
        (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${net.str})`;
    // Y coords for the 14 pins on each side, top pin at -8.255, bottom at +8.255
    const ys = Array.from({length: 14}, (_, i) => -8.255 + i * 1.27);
    // Left side (pins 1-14, bottom to top): GPB0..GPB7, VDD, VSS, NC, SCK, SDA, NC
    const leftNets = [
      p.GPB0, p.GPB1, p.GPB2, p.GPB3, p.GPB4, p.GPB5, p.GPB6, p.GPB7,
      p.VDD, p.VSS, p.VSS /* NC */, p.SCL, p.SDA, p.VSS /* NC */,
    ];
    // Right side (pins 15-28, bottom to top): A0, A1, A2, RESET, INTB, INTA, GPA0..GPA7
    const rightNets = [
      p.A0, p.A1, p.A2, p.RESET, p.INTB, p.INTA,
      p.GPA0, p.GPA1, p.GPA2, p.GPA3, p.GPA4, p.GPA5, p.GPA6, p.GPA7,
    ];
    let pads = '';
    // Left side: pin numbers 1..14, x = -3.95, y goes bottom (8.255) up to (-8.255)
    leftNets.forEach((net, i) => {
      const pinNum = i + 1;
      const y = 8.255 - i * 1.27;  // pin 1 at bottom
      pads += pad(pinNum, -3.95, y, net) + '\n';
    });
    // Right side: pin numbers 15..28, x = +3.95, y goes top (-8.255) down to (8.255)
    rightNets.forEach((net, i) => {
      const pinNum = 15 + i;
      const y = -8.255 + i * 1.27;  // pin 15 at top
      pads += pad(pinNum, 3.95, y, net) + '\n';
    });
    return `
      (module MCP23017_SOIC-28W (layer F.Cu) (tedit 0)
      ${p.at}
      (descr "MCP23017 16-bit I2C I/O expander, SOIC-28W package")
      (tags "I/O expander I2C MCP23017 SOIC-28")
      (fp_text reference "${p.ref}" (at 0 -10) (layer ${p.side}.SilkS) ${p.ref_hide}
        (effects (font (size 1 1) (thickness 0.15))))
      (fp_text value "MCP23017" (at 0 10) (layer ${p.side}.Fab) hide
        (effects (font (size 1 1) (thickness 0.15))))

      ${pads}

      ${/* Body outline ~7.5 x 18 mm */ ''}
      (fp_line (start -3.8 -9.0) (end 3.8 -9.0) (layer ${p.side}.SilkS) (width 0.12))
      (fp_line (start 3.8 -9.0) (end 3.8 9.0) (layer ${p.side}.SilkS) (width 0.12))
      (fp_line (start 3.8 9.0) (end -3.8 9.0) (layer ${p.side}.SilkS) (width 0.12))
      (fp_line (start -3.8 9.0) (end -3.8 -9.0) (layer ${p.side}.SilkS) (width 0.12))
      ${/* Pin 1 marker (circle, bottom-left near pin 1) */ ''}
      (fp_circle (center -4.5 8.255) (end -4.3 8.255) (layer ${p.side}.SilkS) (width 0.15))
      )
    `;
  }
}
