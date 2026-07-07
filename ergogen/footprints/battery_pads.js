// Battery terminal: two plated through-hole solder pads for the LiPo
// leads. No connector body - the battery wires are soldered directly
// (same approach as most low-profile split builds; a JST-SH pigtail can
// also be tacked on). Hand-soldered, so not part of the PCBA placement.
//
// Two 2.0 mm diameter pads (1.0 mm drill) on 3.5 mm centers.
// Pad 1 = BAT_P (battery +, red lead, feeds the power slider).
// Pad 2 = BAT_N (battery -, black lead, GND).
module.exports = {
  params: {
    designator: 'BT',
    side: 'F',
    BAT_P: { type: 'net', value: 'VBAT_SW' },
    BAT_N: { type: 'net', value: 'GND' },
  },
  body: p => `
    (module battery_pads (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "LiPo battery solder terminal: two 2mm plated holes, 3.5mm pitch")
    (tags "battery terminal solder pads")
    (fp_text reference "${p.ref}" (at 0 -2.3) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 0.7 0.7) (thickness 0.1))))
    (fp_text value "BATTERY" (at 0 2.3) (layer ${p.side}.Fab) hide
      (effects (font (size 0.7 0.7) (thickness 0.1))))

    ${/* Polarity markers */ ''}
    (fp_text user "+" (at -1.75 -1.9) (layer ${p.side}.SilkS)
      (effects (font (size 0.8 0.8) (thickness 0.15))))
    (fp_text user "-" (at 1.75 -1.9) (layer ${p.side}.SilkS)
      (effects (font (size 0.8 0.8) (thickness 0.15))))

    (pad 1 thru_hole circle (at -1.75 0 ${p.rot}) (size 2.0 2.0) (drill 1.0)
      (layers *.Cu *.Mask) ${p.BAT_P.str})
    (pad 2 thru_hole circle (at 1.75 0 ${p.rot}) (size 2.0 2.0) (drill 1.0)
      (layers *.Cu *.Mask) ${p.BAT_N.str})
    )
  `
}
