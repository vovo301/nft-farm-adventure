#!/usr/bin/env python3
"""Renderiza um mapa Tiled JSON (ortogonal, não-infinito) em PNG para revisão/aprovação.

Suporta: tilesets embutidos ou externos (.tsj/.json), margin/spacing, flips H/V/diagonal,
camadas de tile visíveis, grade opcional, destaque de tiles com collides=true.
Uso:
  python render_tilemap_preview.py map.json --out preview.png [--scale 3] [--grid] [--show-collision]
Sai com código 1 se um gid não pertence a nenhum tileset ou a imagem do tileset não existe.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw

FLIP_H, FLIP_V, FLIP_D = 0x80000000, 0x40000000, 0x20000000
MASK = 0x1FFFFFFF


def load_tilesets(map_data, base):
    out = []
    for ts in map_data["tilesets"]:
        first = ts["firstgid"]
        tsbase = base
        if "source" in ts:
            path = os.path.join(base, ts["source"])
            with open(path, encoding="utf-8") as fh:
                ts = {**json.load(fh), "firstgid": first}
            tsbase = os.path.dirname(path)
        img_path = os.path.join(tsbase, ts["image"])
        if not os.path.exists(img_path):
            sys.exit(f"erro: imagem do tileset não encontrada: {img_path}")
        collides = {t["id"] for t in ts.get("tiles", [])
                    for p in t.get("properties", []) if p["name"] == "collides" and p["value"]}
        out.append({"first": first, "ts": ts, "img": Image.open(img_path).convert("RGBA"), "collides": collides})
    return sorted(out, key=lambda t: t["first"], reverse=True)


def tile_image(tilesets, gid):
    for t in tilesets:
        if gid >= t["first"]:
            ts, local = t["ts"], gid - t["first"]
            if local >= ts["tilecount"]:
                return None, False
            tw, th = ts["tilewidth"], ts["tileheight"]
            m, s, cols = ts.get("margin", 0), ts.get("spacing", 0), ts["columns"]
            x = m + (local % cols) * (tw + s)
            y = m + (local // cols) * (th + s)
            return t["img"].crop((x, y, x + tw, y + th)), local in t["collides"]
    return None, False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("map")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--grid", action="store_true")
    ap.add_argument("--show-collision", action="store_true")
    a = ap.parse_args()
    with open(a.map, encoding="utf-8") as fh:
        m = json.load(fh)
    if m.get("infinite"):
        sys.exit("erro: mapas infinitos não suportados; desative 'infinite' no Tiled")
    tilesets = load_tilesets(m, os.path.dirname(os.path.abspath(a.map)))
    W, H, tw, th = m["width"], m["height"], m["tilewidth"], m["tileheight"]
    canvas = Image.new("RGBA", (W * tw, H * th), (40, 40, 48, 255))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    missing = set()
    for layer in m["layers"]:
        if layer["type"] != "tilelayer" or not layer.get("visible", True):
            continue
        data = layer["data"]
        if isinstance(data, str):
            sys.exit("erro: use formato de camada CSV/array (não base64) no Tiled")
        for i, raw in enumerate(data):
            gid = raw & MASK
            if gid == 0:
                continue
            img, col = tile_image(tilesets, gid)
            if img is None:
                missing.add(gid)
                continue
            if raw & FLIP_D:
                img = img.transpose(Image.TRANSPOSE)
            if raw & FLIP_H:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
            if raw & FLIP_V:
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
            x, y = (i % layer["width"]) * tw, (i // layer["width"]) * th
            canvas.alpha_composite(img, (x, y))
            if col and a.show_collision:
                od.rectangle([x, y, x + tw - 1, y + th - 1], fill=(255, 0, 0, 90))
    for layer in m["layers"]:
        if layer["type"] == "objectgroup" and a.show_collision:
            for o in layer["objects"]:
                od.ellipse([o["x"] - 3, o["y"] - 3, o["x"] + 3, o["y"] + 3], fill=(255, 255, 0, 255))
    canvas.alpha_composite(overlay)
    if a.scale > 1:
        canvas = canvas.resize((canvas.width * a.scale, canvas.height * a.scale), Image.NEAREST)
    if a.grid:
        d = ImageDraw.Draw(canvas)
        for gx in range(0, canvas.width, tw * a.scale):
            d.line([(gx, 0), (gx, canvas.height)], fill=(255, 255, 255, 40))
        for gy in range(0, canvas.height, th * a.scale):
            d.line([(0, gy), (canvas.width, gy)], fill=(255, 255, 255, 40))
    canvas.save(a.out)
    if missing:
        print(f"erro: gids sem tileset: {sorted(missing)}", file=sys.stderr)
        sys.exit(1)
    print(json.dumps({"out": a.out, "map": f"{W}x{H}", "px": f"{canvas.width}x{canvas.height}"}))


if __name__ == "__main__":
    main()
