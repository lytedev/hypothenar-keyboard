// Auto-generated from USB_C_Receptacle_HRO_TYPE-C-31-M-12.kicad_mod by _convert_kicad_mod.py.
// Original module: USB_C_Receptacle_HRO_TYPE-C-31-M-12
// 20 pads, 17 unique pad numbers.
// Edit by hand only as a last resort; prefer re-running the script.

module.exports = {
  params: {
    designator: 'U',
    side: 'F',
    PA1: { type: 'net', value: 'PA1_NC' },    // pad "A1"
    PA4: { type: 'net', value: 'PA4_NC' },    // pad "A4"
    PA5: { type: 'net', value: 'PA5_NC' },    // pad "A5"
    PA6: { type: 'net', value: 'PA6_NC' },    // pad "A6"
    PA7: { type: 'net', value: 'PA7_NC' },    // pad "A7"
    PA8: { type: 'net', value: 'PA8_NC' },    // pad "A8"
    PA9: { type: 'net', value: 'PA9_NC' },    // pad "A9"
    PB1: { type: 'net', value: 'PB1_NC' },    // pad "B1"
    PB4: { type: 'net', value: 'PB4_NC' },    // pad "B4"
    PB5: { type: 'net', value: 'PB5_NC' },    // pad "B5"
    PB6: { type: 'net', value: 'PB6_NC' },    // pad "B6"
    PB7: { type: 'net', value: 'PB7_NC' },    // pad "B7"
    PB8: { type: 'net', value: 'PB8_NC' },    // pad "B8"
    PB9: { type: 'net', value: 'PB9_NC' },    // pad "B9"
    PSH: { type: 'net', value: 'PSH_NC' },    // pad "SH"
    PA12: { type: 'net', value: 'PA12_NC' },    // pad "A12"
    PB12: { type: 'net', value: 'PB12_NC' },    // pad "B12"
  },
  body: p => {
    // For each pad, substitute the net by adding a `(net N "<name>")`
    // before the closing paren. ergogen handles the (net N) part via p.X.str.
    const padNet = (padNum) => {
      const ident = 'P' + String(padNum).replace(/[^A-Za-z0-9_]/g, '_');
      return p[ident] ? p[ident].str : '';
    };

    return `
    (module USB_C_Receptacle_HRO_TYPE-C-31-M-12 (layer F.Cu) (tedit 0)
    ${p.at}
    (fp_text reference "${p.ref}" (at 0 -12) (layer ${p.side}.SilkS) ${p.ref_hide}
      (effects (font (size 1 1) (thickness 0.15))))
    (fp_text value "USB_C_Receptacle_HRO_TYPE-C-31-M-12" (at 0 12) (layer ${p.side}.Fab) hide
      (effects (font (size 1 1) (thickness 0.15))))
      (pad "A1" smd roundrect
		(at -3.25 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "362202d1-0f12-49ad-bae4-dba712b474d6") ${padNet("A1")})
      (pad "A4" smd roundrect
		(at -2.45 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "8917bf96-01ee-4f22-816b-613b15cd2e71") ${padNet("A4")})
      (pad "A5" smd roundrect
		(at -1.25 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "ec1f184a-1a89-41a8-a159-fb9bbca070ea") ${padNet("A5")})
      (pad "A6" smd roundrect
		(at -0.25 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "45ffbbd2-87f4-4442-8601-64165646793f") ${padNet("A6")})
      (pad "A7" smd roundrect
		(at 0.25 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "a9c175ff-bc75-447a-9ae6-05c8b0333b65") ${padNet("A7")})
      (pad "A8" smd roundrect
		(at 1.25 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "e1bb45ff-cf89-4e54-8620-5d44c6c2d38b") ${padNet("A8")})
      (pad "A9" smd roundrect
		(at 2.45 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "f826dad0-0ca2-4cda-9de9-2f55668b957b") ${padNet("A9")})
      (pad "A12" smd roundrect
		(at 3.25 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "9b2f5099-c524-41ec-819f-82b37d98614d") ${padNet("A12")})
      (pad "B1" smd roundrect
		(at 3.25 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "f9ec74b8-4ac1-45dd-81b6-96923b70cde7") ${padNet("B1")})
      (pad "B4" smd roundrect
		(at 2.45 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "fd1fb3e8-fddb-4830-96ff-05e203b0713b") ${padNet("B4")})
      (pad "B5" smd roundrect
		(at 1.75 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "3e3f4058-6551-4a92-9018-482b614c1ac4") ${padNet("B5")})
      (pad "B6" smd roundrect
		(at 0.75 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "8754a1ed-9f70-4948-883d-f87745c1b02e") ${padNet("B6")})
      (pad "B7" smd roundrect
		(at -0.75 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "c2f3c23e-99a5-4e42-bbd3-2d4cf1a7903e") ${padNet("B7")})
      (pad "B8" smd roundrect
		(at -1.75 -4.045)
		(size 0.3 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "a3a3e741-eebc-4e05-a072-3ce95b34e6a6") ${padNet("B8")})
      (pad "B9" smd roundrect
		(at -2.45 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "9c9a2d4a-5fd6-4dca-bdb3-1c22426d680d") ${padNet("B9")})
      (pad "B12" smd roundrect
		(at -3.25 -4.045)
		(size 0.6 1.45)
		(layers ${p.side}.Cu ${p.side}.Mask ${p.side}.Paste)
		(roundrect_rratio 0.25)
		(uuid "b168e883-73b4-4d3d-a585-60bf6617e35f") ${padNet("B12")})
      (pad "SH" thru_hole oval
		(at -4.32 -3.13)
		(size 1 2.1)
		(drill oval 0.6 1.7)
		(property pad_prop_mechanical)
		(layers "*.Cu" "*.Mask" ${p.side}.Paste)
		(remove_unused_layers no)
		(uuid "0ae7656c-e696-47e9-a3ae-f55a3ef085bc") ${padNet("SH")})
      (pad "SH" thru_hole oval
		(at -4.32 1.05)
		(size 1 1.6)
		(drill oval 0.6 1.2)
		(property pad_prop_mechanical)
		(layers "*.Cu" "*.Mask" ${p.side}.Paste)
		(remove_unused_layers no)
		(uuid "b1c2cf35-a557-4567-8e3a-7c0df8b3f75c") ${padNet("SH")})
      (pad "SH" thru_hole oval
		(at 4.32 -3.13)
		(size 1 2.1)
		(drill oval 0.6 1.7)
		(property pad_prop_mechanical)
		(layers "*.Cu" "*.Mask" ${p.side}.Paste)
		(remove_unused_layers no)
		(uuid "5a2e578a-43d9-4125-abce-5e98dad241f1") ${padNet("SH")})
      (pad "SH" thru_hole oval
		(at 4.32 1.05)
		(size 1 1.6)
		(drill oval 0.6 1.2)
		(property pad_prop_mechanical)
		(layers "*.Cu" "*.Mask" ${p.side}.Paste)
		(remove_unused_layers no)
		(uuid "b359a8f7-cacc-4bd1-b406-b8f87e2dd9f4") ${padNet("SH")})
      (fp_text user "\${REFERENCE}"
		(at 0 0 0)
		(layer ${p.side}.Fab)
		(uuid "8f7fbb31-91be-49b9-970e-3fda1a259835")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
    )
    `;
  },
};
