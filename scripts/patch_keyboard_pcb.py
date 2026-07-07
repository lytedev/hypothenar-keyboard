#!/usr/bin/env python3
"""Patch the keyboard PCB: set title-block metadata and add GND pours.

Routing GND traces across a keyboard matrix is busywork. Pouring copper
instead — one zone per layer tied to the GND net covering the board
outline — handles every ground return automatically and is strictly
better practice for noise and impedance.

This script also sets KiCad's title-block fields (Title/Rev/Company/
Comments) so the page-frame metadata is filled in instead of showing
defaults like "Unknown" and "keyboard".

Implementation notes:

1. The input must already be in current KiCad format. pcbnew's Python
   bindings crash if asked to save a board that was loaded from KiCad
   5.1 format. The scaffold derivation runs `kicad-cli pcb upgrade`
   before invoking this script.
2. Zone outlines are added with AppendCorner (which copies coordinates),
   NOT with SetOutline (which takes ownership of a SHAPE_POLY_SET).
   SetOutline causes a double-free segfault at SaveBoard time because
   Python's reference counting still considers itself owner of the
   object.

Usage:
    patch_keyboard_pcb.py <path/to/board.kicad_pcb>
"""

from __future__ import annotations

import sys
from pathlib import Path

import pcbnew


GND_NET_NAME = "GND"
LAYERS = [pcbnew.F_Cu, pcbnew.B_Cu]

TITLE_BLOCK = {
    "title": "Thenar",
    "company": "lytedev",
    "rev": "1.0",
    "comments": [
        "https://github.com/lytedev/thenar-keyboard",
        "56-key column-staggered split with scrollwheels",
        "Choc v1 hotswap, Nice!Nano + Nice!View, ZMK",
        "Fork of github.com/dnlbauer/corax-keyboard",
    ],
}


def set_title_block(board: "pcbnew.BOARD") -> None:
    tb = board.GetTitleBlock()
    tb.SetTitle(TITLE_BLOCK["title"])
    tb.SetCompany(TITLE_BLOCK["company"])
    tb.SetRevision(TITLE_BLOCK["rev"])
    for i, comment in enumerate(TITLE_BLOCK["comments"]):
        tb.SetComment(i, comment)


def remove_existing_gnd_zones(board: "pcbnew.BOARD") -> int:
    removed = 0
    for zone in list(board.Zones()):
        net = zone.GetNet()
        if net is None or net.GetNetname() != GND_NET_NAME:
            continue
        if zone.GetLayer() not in LAYERS:
            continue
        board.Remove(zone)
        removed += 1
    return removed


def board_outline_polygons(board: "pcbnew.BOARD") -> list[list[tuple[int, int]]]:
    raw = pcbnew.SHAPE_POLY_SET()
    board.GetBoardPolygonOutlines(raw, True)
    if raw.OutlineCount() == 0:
        raise RuntimeError("could not determine a board outline")
    return [
        [
            (raw.Outline(i).CPoint(j).x, raw.Outline(i).CPoint(j).y)
            for j in range(raw.Outline(i).PointCount())
        ]
        for i in range(raw.OutlineCount())
    ]


def add_zone(board, layer, net, polygons) -> None:
    zone = pcbnew.ZONE(board)
    zone.SetNet(net)
    zone.SetLayer(layer)
    for poly in polygons:
        for x, y in poly:
            zone.AppendCorner(pcbnew.VECTOR2I(x, y), -1)
    board.Add(zone)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    pcb_path = Path(sys.argv[1])
    if not pcb_path.is_file():
        print(f"error: not a file: {pcb_path}", file=sys.stderr)
        return 1

    board = pcbnew.LoadBoard(str(pcb_path))

    set_title_block(board)

    gnd = board.FindNet(GND_NET_NAME)
    if gnd is None:
        print(f"error: GND net not found in {pcb_path}", file=sys.stderr)
        return 1

    removed = remove_existing_gnd_zones(board)
    polygons = board_outline_polygons(board)
    for layer in LAYERS:
        add_zone(board, layer, gnd, polygons)

    pcbnew.SaveBoard(str(pcb_path), board)
    print(f"{pcb_path}: title block set, removed {removed} old GND zones, "
          f"added {len(LAYERS)} new ones")
    return 0


if __name__ == "__main__":
    sys.exit(main())
