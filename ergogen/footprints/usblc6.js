// USBLC6-2SC6 USB ESD/EMI protection in SOT-23-6 package.
// LCSC C7519, Extended tier on JLCPCB. Optional - the nRF52840 USB
// pins have integrated ESD diodes. Include for belt-and-suspenders or
// drop to save BOM cost.
//
// SOT-23-6 layout, 0.95mm pitch:
//   Pin 1: IO1 (data line A, e.g. D+)
//   Pin 2: GND
//   Pin 3: IO2 (data line B, e.g. D-)
//   Pin 4: IO2 (mirror, internally connected to pin 3)
//   Pin 5: VBUS (clamp to)
//   Pin 6: IO1 (mirror, internally connected to pin 1)
//
// Typical wiring: place between USB-C and MCU. Pin 1+6 to D+, pin 3+4
// to D-, pin 2 GND, pin 5 VBUS.
module.exports = {
  params: {
    designator: 'U',
    side: 'F',
    DP: { type: 'net', value: 'USB_DP' },
    DM: { type: 'net', value: 'USB_DM' },
    GND: { type: 'net', value: 'GND' },
    VBUS: { type: 'net', value: 'VBUS' },
  },
  body: p => `
    (module USBLC6-2SC6_SOT-23-6 (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "USBLC6-2SC6 USB ESD protection, SOT-23-6")
    (tags "ESD USB SOT-23-6")
    (fp_text reference "${p.ref}" (at 0 -2.5) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "USBLC6-2SC6" (at 0 2.5) (layer ${p.side}.Fab) hide
      (effects (font (size 1 1) (thickness 0.15))))

    ${/* SOT-23-6: three pads each side at 0.95mm pitch, ±1.1mm from center */ ''}
    (pad 1 smd rect (at -1.1 -0.95 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.DP.str})
    (pad 2 smd rect (at -1.1 0 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.GND.str})
    (pad 3 smd rect (at -1.1 0.95 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.DM.str})
    (pad 4 smd rect (at 1.1 0.95 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.DM.str})
    (pad 5 smd rect (at 1.1 0 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.VBUS.str})
    (pad 6 smd rect (at 1.1 -0.95 ${p.rot}) (size 0.6 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.DP.str})

    ${/* Body outline 2.9 x 1.6 mm */ ''}
    (fp_line (start -1.45 -0.8) (end 1.45 -0.8) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 1.45 -0.8) (end 1.45 0.8) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 1.45 0.8) (end -1.45 0.8) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start -1.45 0.8) (end -1.45 -0.8) (layer ${p.side}.SilkS) (width 0.12))
    (fp_circle (center -1.6 -1.2) (end -1.5 -1.1) (layer ${p.side}.SilkS) (width 0.15))
    )
  `
}
