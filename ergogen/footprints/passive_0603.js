// Generic two-pad 0603 (1608 metric) chip passive: resistor, capacitor,
// or LED. Machine-placeable (JLCPCB PCBA, Basic-tier parts).
//
// Standard 0603 land pattern: two 0.9 x 0.95 mm pads on 1.55 mm centers
// (pad centers at x = +/-0.775). Long axis is horizontal at rotate 0;
// pass adjust.rotate: 90 for a vertical part.
//
// Params:
//   from  - net on pad 1 (left at rotate 0; anode for LEDs)
//   to    - net on pad 2 (right at rotate 0; cathode for LEDs)
//   label - short silkscreen designator ("C1", "R5", ...) drawn next to
//           the body, since ergogen hides footprint references by default
module.exports = {
  params: {
    designator: 'P',
    side: 'F',
    label: '',
    from: { type: 'net', value: 'GND' },
    to: { type: 'net', value: 'GND' },
  },
  body: p => `
    (module passive_0603 (layer F.Cu) (tedit 0)
    ${p.at}
    (descr "Generic 0603 two-pad passive (resistor/capacitor/LED)")
    (tags "passive 0603 resistor capacitor")
    (fp_text reference "${p.ref}" (at 0 -1.3) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 0.7 0.7) (thickness 0.1))))
    (fp_text value "${p.label}" (at 0 1.3) (layer ${p.side}.Fab) hide
      (effects (font (size 0.7 0.7) (thickness 0.1))))
    (fp_text user "${p.label}" (at 0 -1.2) (layer ${p.side}.SilkS)
      (effects (font (size 0.5 0.5) (thickness 0.09))))

    ${/* 0603 land pattern: 0.9 x 0.95 mm pads at +/-0.775 mm */ ''}
    (pad 1 smd rect (at -0.775 0 ${p.rot}) (size 0.9 0.95)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.from.str})
    (pad 2 smd rect (at 0.775 0 ${p.rot}) (size 0.9 0.95)
      (layers ${p.side}.Cu ${p.side}.Paste ${p.side}.Mask) ${p.to.str})

    ${/* Body outline hints above/below the pads */ ''}
    (fp_line (start -0.8 -0.6) (end 0.8 -0.6) (layer ${p.side}.SilkS) (width 0.1))
    (fp_line (start -0.8 0.6) (end 0.8 0.6) (layer ${p.side}.SilkS) (width 0.1))
    )
  `
}
