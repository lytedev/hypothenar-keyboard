{
  description = "Hypothenar keyboard - pick-and-place split keyboard (ergogen + KiCad + ZMK)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    zmk-nix = {
      url = "github:lilyinstarlight/zmk-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, zmk-nix }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      packages = forAllSystems (pkgs:
        let
          # Python wrapper that can `import pcbnew` (same trick as the
          # thenar repo): expose KiCad's bundled python module to a
          # vanilla interpreter.
          kicadPython = pkgs.writeShellScriptBin "kicad-python" ''
            export PYTHONPATH="${pkgs.kicad.base}/lib/python3.13/site-packages''${PYTHONPATH:+:$PYTHONPATH}"
            exec ${pkgs.python313}/bin/python3 "$@"
          '';

          # freerouting v2.2.4 fetched directly - nixpkgs' 2.2.1 has a
          # multithreaded race that NPEs on our DSNs (thenar lesson).
          freeroutingJar = pkgs.fetchurl {
            url = "https://github.com/freerouting/freerouting/releases/download/v2.2.4/freerouting-2.2.4.jar";
            hash = "sha256-9e03QYKQDMx45HNRi7ufa4afSgcVlJX2Y6dvUrsQUjs=";
          };
          freerouting = pkgs.writeShellScriptBin "freerouting" ''
            exec ${pkgs.temurin-jre-bin-25}/bin/java -jar ${freeroutingJar} "$@"
          '';

          # Ergogen scaffold + KiCad project file. NOT FAB-READY: footprints
          # and nets but no copper. Route per docs/build-recipe.md.
          scaffold = pkgs.stdenvNoCC.mkDerivation {
            name = "hypothenar-scaffold";
            src = ./.;
            nativeBuildInputs = [ pkgs.ergogen pkgs.python313 pkgs.kicad kicadPython ];
            buildPhase = ''
              runHook preBuild
              export HOME=$(mktemp -d)
              mkdir -p $out
              ergogen ./ergogen -o $out
              kicad-cli pcb upgrade $out/pcbs/keyboard.kicad_pcb
              python3 ./scripts/write_kicad_pro.py $out/pcbs/keyboard.kicad_pcb
              # F.Cu + B.Cu GND zones (unfilled; gerber export fills them)
              kicad-python ./scripts/patch_keyboard_pcb.py $out/pcbs/keyboard.kicad_pcb
              runHook postBuild
            '';
            dontInstall = true;
          };

          # Autoroute the scaffold with freerouting - the heavy lifting
          # before hand-finishing in KiCad (rc1-proven hybrid flow).
          # NOT consumed by any fab output automatically: inspect, then
          # copy into routed/ as your hand-finishing starting point:
          #   nix build .#routed-auto
          #   cp result/keyboard.kicad_pcb routed/keyboard-left.kicad_pcb
          # ~50 passes ≈ 25 min ≈ 90-95% completion.
          routed-auto = pkgs.stdenvNoCC.mkDerivation {
            name = "hypothenar-routed-auto";
            src = ./.;
            nativeBuildInputs = [ pkgs.kicad kicadPython freerouting ];
            buildPhase = ''
              runHook preBuild
              export HOME=$(mktemp -d)
              cp ${scaffold}/pcbs/keyboard.kicad_pcb $TMPDIR/in.kicad_pcb
              chmod u+w $TMPDIR/in.kicad_pcb
              mkdir -p $out
              kicad-python ./scripts/autoroute.py \
                $TMPDIR/in.kicad_pcb $out/keyboard.kicad_pcb 50
              runHook postBuild
            '';
            dontInstall = true;
          };

          # Routed PCBs land here after the KiCad routing pass (Stage 4 of
          # docs/build-recipe.md). One per half - no reversibility.
          routedLeft = ./routed/keyboard-left.kicad_pcb;
          routedRight = ./routed/keyboard-right.kicad_pcb;

          # ZMK firmware. zmk-nix expects the west manifest at
          # <src>/config/west.yml, so materialise zmk/ at config/.
          firmwareSrc = pkgs.runCommand "hypothenar-zmk-src" { } ''
            mkdir -p $out/config
            cp -r ${./zmk}/. $out/config/
          '';

          firmware = zmk-nix.legacyPackages.${pkgs.system}.buildSplitKeyboard {
            name = "hypothenar-firmware";
            src = firmwareSrc;
            board = "hypothenar";
            shield = "hypothenar_%PART%";
            # First build fails with a hash mismatch - paste the reported
            # hash here.
            zephyrDepsHash = "sha256-gsqiTDJLAihVyBXVFlgXwqRmlREcFJctKpl4tEWmVlY=";
          };

          firmware-left = pkgs.runCommand "hypothenar-left.uf2" { } ''
            cp ${firmware}/zmk_left.uf2 $out
          '';
          firmware-right = pkgs.runCommand "hypothenar-right.uf2" { } ''
            cp ${firmware}/zmk_right.uf2 $out
          '';

          flash = pkgs.writeShellApplication {
            name = "flash";
            runtimeInputs = [ pkgs.util-linux pkgs.coreutils ];
            text = ''
              set -euo pipefail
              if [ "$#" -ne 1 ] || ! [[ "$1" =~ ^(left|right)$ ]]; then
                echo "usage: nix run .#flash -- (left|right)" >&2
                exit 2
              fi
              part=$1
              uf2=${firmware}/zmk_$part.uf2
              if [ ! -f "$uf2" ]; then
                echo "error: $uf2 not found - did the build succeed?" >&2
                exit 1
              fi
              echo "[flash] firmware ready: $uf2"
              echo "[flash] double-tap reset on the $part half now."
              # The Adafruit nRF52 bootloader presents NICENANO regardless
              # of the board it's flashed onto (we use the nice_nano_v2
              # bootloader build - see docs/design.md).
              echo "[flash] waiting for NICENANO mass-storage to appear..."
              while :; do
                mount=$(lsblk -o LABEL,MOUNTPOINT -nr | awk '$1=="NICENANO" {print $2; exit}')
                if [ -n "$mount" ]; then break; fi
                sleep 1
              done
              echo "[flash] mounted at $mount; copying..."
              cp "$uf2" "$mount/"
              sync
              echo "[flash] done."
            '';
          };

          # JLCPCB PCBA artifacts: pick-place (CPL) CSV per half in the
          # column format JLCPCB's flow expects. Requires the routed PCBs.
          pcba = pkgs.stdenvNoCC.mkDerivation {
            name = "hypothenar-pcba";
            nativeBuildInputs = [ pkgs.kicad ];
            dontUnpack = true;
            buildPhase = ''
              runHook preBuild
              if [ ! -f ${routedLeft} ] || [ ! -f ${routedRight} ]; then
                echo "ERROR: routed/keyboard-left.kicad_pcb or -right.kicad_pcb"
                echo "is missing. Complete Stage 4 of docs/build-recipe.md first."
                exit 1
              fi
              mkdir -p $out
              for half in left right; do
                src=${routedLeft}
                [ "$half" = right ] && src=${routedRight}
                kicad-cli pcb export pos "$src" \
                  -o "$out/hypothenar-$half-cpl.csv" \
                  --format csv --units mm --side both \
                  --use-drill-file-origin
                awk -F, 'NR==1 {
                  print "Designator,Mid X,Mid Y,Layer,Rotation"; next
                } { gsub(/"/, "")
                   side = $7 == "top" ? "T" : "B"
                   printf "%s,%s,%s,%s,%s\n", $1, $4, $5, side, $6
                }' "$out/hypothenar-$half-cpl.csv" > "$out/hypothenar-$half-cpl.jlc.csv"
              done
              runHook postBuild
            '';
            dontInstall = true;
          };
        in
        {
          inherit scaffold routed-auto kicadPython freerouting
                  firmware firmware-left firmware-right flash pcba;
          default = scaffold;
        });

      apps = forAllSystems (pkgs: {
        flash = {
          type = "app";
          program = "${self.packages.${pkgs.system}.flash}/bin/flash";
        };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [ ergogen kicad python313 ];
        };
      });
    };
}
