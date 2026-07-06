// TP4056 LiPo charge IC in SOP-8 package.
// LCSC C382139, Extended tier on JLCPCB.
//
// Pin 1: TEMP (battery temperature sense; tie to GND if unused)
// Pin 2: PROG (charge current set; 12kohm to GND = ~100mA)
// Pin 3: GND
// Pin 4: VBAT (battery output)
// Pin 5: STDBY (open-drain, indicates charging complete)
// Pin 6: CHRG (open-drain, indicates charging in progress)
// Pin 7: VCC (USB Vbus / charge input, 4.5-8V)
// Pin 8: CE (chip enable; tie HIGH or to VCC for always-on)
//
// SOP-8 standard footprint, 1.27mm pitch, 5.0 x 4.0 mm package.
module.exports = {
  params: {
    designator: 'U',
    side: 'F',
    TEMP: { type: 'net', value: 'GND' },
    PROG: { type: 'net', value: 'PROG' },
    GND: { type: 'net', value: 'GND' },
    VBAT: { type: 'net', value: 'VBAT' },
    STDBY: { type: 'net', value: 'CHARGE_STDBY' },
    CHRG: { type: 'net', value: 'CHARGE_ACTIVE' },
    VCC: { type: 'net', value: 'VBUS' },
    CE: { type: 'net', value: 'VBUS' },
  },
  body: p => `
    (module TP4056_SOP-8 (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "TP4056 LiPo charge IC, SOP-8 package")
    (tags "charge IC SOP-8")
    (fp_text reference "${p.ref}" (at 0 -3.5) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "TP4056" (at 0 3.5) (layer ${p.side}.Fab) hide
      (effects (font (size 1 1) (thickness 0.15))))

    ${/* SOP-8 pads at 1.27mm pitch, body 5.0x4.0mm, lead-to-lead 6mm */ ''}
    (pad 1 smd rect (at -2.7 -1.905 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.TEMP.str})
    (pad 2 smd rect (at -2.7 -0.635 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.PROG.str})
    (pad 3 smd rect (at -2.7 0.635 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.GND.str})
    (pad 4 smd rect (at -2.7 1.905 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.VBAT.str})
    (pad 5 smd rect (at 2.7 1.905 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.STDBY.str})
    (pad 6 smd rect (at 2.7 0.635 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.CHRG.str})
    (pad 7 smd rect (at 2.7 -0.635 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.VCC.str})
    (pad 8 smd rect (at 2.7 -1.905 ${p.rot}) (size 1.55 0.6)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.CE.str})

    ${/* Body outline 5.0 x 4.0 mm */ ''}
    (fp_line (start -2.5 -2.0) (end 2.5 -2.0) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 2.5 -2.0) (end 2.5 2.0) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 2.5 2.0) (end -2.5 2.0) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start -2.5 2.0) (end -2.5 -2.0) (layer ${p.side}.SilkS) (width 0.12))
    ${/* Pin 1 marker (circle, top-left) */ ''}
    (fp_circle (center -2.7 -2.7) (end -2.6 -2.6) (layer ${p.side}.SilkS) (width 0.15))
    )
  `
}
