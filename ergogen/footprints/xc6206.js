// XC6206P332MR 3.3V LDO regulator in SOT-89-3 package.
// LCSC C5446, Basic tier on JLCPCB.
// Pin 1: Vin (battery in)
// Pin 2: GND (and thermal pad)
// Pin 3: Vout (3.3V out)
module.exports = {
  params: {
    designator: 'U',
    side: 'F',
    VIN: { type: 'net', value: 'VBAT' },
    GND: { type: 'net', value: 'GND' },
    VOUT: { type: 'net', value: 'VCC' },
  },
  body: p => `
    (module XC6206_SOT-89-3 (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "XC6206P 3.3V LDO, SOT-89-3 package")
    (tags "LDO regulator SOT-89")
    (fp_text reference "${p.ref}" (at 0 -3) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "XC6206P332MR" (at 0 3.5) (layer ${p.side}.Fab) hide
      (effects (font (size 1 1) (thickness 0.15))))

    ${/* SOT-89-3: three pads on one side (1, 2, 3 left-to-right) plus
        a large heat-sink pad on the other side electrically tied to pad 2 (GND) */ ''}
    (pad 1 smd rect (at -1.5 -0.95 ${p.rot}) (size 1.0 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.VIN.str})
    (pad 2 smd rect (at 0 -0.95 ${p.rot}) (size 1.0 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.GND.str})
    (pad 3 smd rect (at 1.5 -0.95 ${p.rot}) (size 1.0 1.2)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.VOUT.str})
    (pad 2 smd rect (at 0 1.55 ${p.rot}) (size 1.6 2.0)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.GND.str})

    ${/* Body outline 4.0 x 2.5 mm */ ''}
    (fp_line (start -2.0 -1.25) (end 2.0 -1.25) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 2.0 -1.25) (end 2.0 1.25) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start 2.0 1.25) (end -2.0 1.25) (layer ${p.side}.SilkS) (width 0.12))
    (fp_line (start -2.0 1.25) (end -2.0 -1.25) (layer ${p.side}.SilkS) (width 0.12))
    ${/* Pin 1 marker */ ''}
    (fp_line (start -2.2 -0.95) (end -2.0 -0.95) (layer ${p.side}.SilkS) (width 0.15))
    )
  `
}
