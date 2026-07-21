module.exports = {
  params: {
    designator: 'D',
    from: undefined,
    to: undefined
  },
  body: p => `
  
    (module ComboDiode (layer F.Cu) (tedit 5B24D78E)


        ${p.at /* parametric position */}

        ${'' /* footprint reference */}
        (fp_text reference "${p.ref}" (at 0 0) (layer F.SilkS) ${p.ref_hide} (effects (font (size 1.27 1.27) (thickness 0.15))))
        (fp_text value "" (at 0 0) (layer F.SilkS) hide (effects (font (size 1.27 1.27) (thickness 0.15))))
        
        ${''/* cathode "K" markers, one per face; the B copy is justify-mirrored
              so it reads as a proper K when the board is viewed from the back.
              Both sit at the cathode-bar end (x=-0.35, the pad-1/"to" side).

              POLARITY (derived from the netlist + ZMK's kscan_gpio_matrix.c,
              hardware-verified during the 2026-07 right-half bring-up):
              pad 1 carries the "to" net (col0..col4, the per-visual-row
              nets on MCU pins 5-9). With diode-direction "col2row" the ZMK
              driver SENSES row-gpios (those colN pins) and DRIVES col-gpios
              (the row0..row5 switch-column nets), so scan current runs
              switch -> diode -> pad 1 and the cathode band belongs at the
              bar/K end on EITHER face. Correctly built halves LOOK mirrored
              to each other: trust the local bar/K, never a comparison with
              the other half or a front-view render. */}
        (fp_text user K (at -0.35 1.05 ${p.rot}) (layer F.SilkS) (effects (font (size 0.6 0.6) (thickness 0.1))))
        (fp_text user K (at -0.35 1.05 ${p.rot}) (layer B.SilkS) (effects (font (size 0.6 0.6) (thickness 0.1)) (justify mirror)))

        ${''/* diode symbols */}
        (fp_line (start 0.25 0) (end 0.75 0) (layer F.SilkS) (width 0.1))
        (fp_line (start 0.25 0.4) (end -0.35 0) (layer F.SilkS) (width 0.1))
        (fp_line (start 0.25 -0.4) (end 0.25 0.4) (layer F.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end 0.25 -0.4) (layer F.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end -0.35 0.55) (layer F.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end -0.35 -0.55) (layer F.SilkS) (width 0.1))
        (fp_line (start -0.75 0) (end -0.35 0) (layer F.SilkS) (width 0.1))
        (fp_line (start 0.25 0) (end 0.75 0) (layer B.SilkS) (width 0.1))
        (fp_line (start 0.25 0.4) (end -0.35 0) (layer B.SilkS) (width 0.1))
        (fp_line (start 0.25 -0.4) (end 0.25 0.4) (layer B.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end 0.25 -0.4) (layer B.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end -0.35 0.55) (layer B.SilkS) (width 0.1))
        (fp_line (start -0.35 0) (end -0.35 -0.55) (layer B.SilkS) (width 0.1))
        (fp_line (start -0.75 0) (end -0.35 0) (layer B.SilkS) (width 0.1))
    
        ${''/* SMD pads on both sides */}
        (pad 1 smd rect (at -1.65 0 ${p.rot}) (size 0.9 1.2) (layers F.Cu F.Paste F.Mask) ${p.to.str})
        (pad 2 smd rect (at 1.65 0 ${p.rot}) (size 0.9 1.2) (layers B.Cu B.Paste B.Mask) ${p.from.str})
        (pad 1 smd rect (at -1.65 0 ${p.rot}) (size 0.9 1.2) (layers B.Cu B.Paste B.Mask) ${p.to.str})
        (pad 2 smd rect (at 1.65 0 ${p.rot}) (size 0.9 1.2) (layers F.Cu F.Paste F.Mask) ${p.from.str})
        
        ${''/* vias */}
        (pad 1 thru_hole circle (at -0.75 0 ${p.rot}) (size 0.6 0.6) (drill 0.3) (layers *.Cu *.Mask) ${p.to.str})
        (pad 2 thru_hole circle (at  0.75 0 ${p.rot}) (size 0.6 0.6) (drill 0.3) (layers *.Cu *.Mask) ${p.from.str})
    )
  
    `
}