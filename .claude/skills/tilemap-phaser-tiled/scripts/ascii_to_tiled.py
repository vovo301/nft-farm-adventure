#!/usr/bin/env python3
"""Converte um layout em ASCII (uma grade por camada) num mapa Tiled JSON ortogonal.

Spec (.json):
{
  "tile_size": 16,
  "tileset": {"name": "farm", "image": "farm-tiles.png", "columns": 8, "tilecount": 64,
              "imagewidth": 128, "imageheight": 128, "margin": 0, "spacing": 0,
              "collides": [12, 13]},          # ids LOCAIS (0-based) com propriedade collides=true
  "legend": {".": null, "g": 0, "d": 1, "w": 12},   # caractere -> id local do tile (null = vazio)
  "layers": [{"name": "Ground", "file": "ground.txt"},
             {"name": "Decor",  "file": "decor.txt"}],
  "objects": [{"name": "spawn", "type": "spawn", "x": 5, "y": 7}]   # opcional, em tiles
}
Uso: python ascii_to_tiled.py map-spec.json --out map.json
Os arquivos de camada são relativos ao spec. Todas as camadas devem ter o mesmo tamanho.
"""
import argparse
import json
import os
import sys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    base = os.path.dirname(os.path.abspath(a.spec))
    with open(a.spec, encoding="utf-8") as fh:
        spec = json.load(fh)
    ts = spec["tileset"]
    t = spec["tile_size"]
    legend = spec["legend"]
    errors, layers, size = [], [], None
    for lid, layer in enumerate(spec["layers"], start=1):
        with open(os.path.join(base, layer["file"]), encoding="utf-8") as fh:
            rows = [r.rstrip("\n") for r in fh if not r.startswith("#") and r.strip() != ""]
        w, h = max(len(r) for r in rows), len(rows)
        if size and size != (w, h):
            errors.append(f"camada {layer['name']}: {w}x{h} difere de {size[0]}x{size[1]}")
        size = size or (w, h)
        data = []
        for y, row in enumerate(rows):
            for x, ch in enumerate(row.ljust(w, ".")):
                if ch not in legend:
                    errors.append(f"{layer['file']} linha {y + 1} col {x + 1}: '{ch}' não está na legenda")
                    data.append(0)
                    continue
                local = legend[ch]
                data.append(0 if local is None else local + 1)  # firstgid = 1
        layers.append({"id": lid, "name": layer["name"], "type": "tilelayer", "width": w, "height": h,
                       "x": 0, "y": 0, "opacity": 1, "visible": True, "data": data})
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    w, h = size
    objs = [{"id": i + 1, "name": o["name"], "type": o.get("type", ""), "x": o["x"] * t, "y": o["y"] * t,
             "width": 0, "height": 0, "point": True, "rotation": 0, "visible": True}
            for i, o in enumerate(spec.get("objects", []))]
    if objs:
        layers.append({"id": len(layers) + 1, "name": "Objects", "type": "objectgroup", "objects": objs,
                       "x": 0, "y": 0, "opacity": 1, "visible": True, "draworder": "topdown"})
    tileset = {"firstgid": 1, "name": ts["name"], "image": ts["image"], "imagewidth": ts["imagewidth"],
               "imageheight": ts["imageheight"], "tilewidth": t, "tileheight": t, "columns": ts["columns"],
               "tilecount": ts["tilecount"], "margin": ts.get("margin", 0), "spacing": ts.get("spacing", 0),
               "tiles": [{"id": i, "properties": [{"name": "collides", "type": "bool", "value": True}]}
                         for i in ts.get("collides", [])]}
    out = {"type": "map", "version": "1.10", "orientation": "orthogonal", "renderorder": "right-down",
           "width": w, "height": h, "tilewidth": t, "tileheight": t, "infinite": False,
           "nextlayerid": len(layers) + 1, "nextobjectid": len(objs) + 1,
           "layers": layers, "tilesets": [tileset]}
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({"out": a.out, "size": f"{w}x{h}", "layers": [l["name"] for l in layers]}))


if __name__ == "__main__":
    main()
