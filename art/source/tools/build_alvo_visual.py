#!/usr/bin/env python3
"""Build do lote "alvo visual" (Fase 0) — 100% por script, determinístico.

Rode da raiz do repositório:
    python3 art/source/tools/build_alvo_visual.py

Passos:
 1. art/style-guide/palette.json (rampas)  ->  art/style-guide/palette-keys.json (chave->hex, p/ scripts)
 2. grades .txt de art/source/{characters,tiles,icons}  ->  PNG 1x em art/export/...
 3. tileset do alvo (strip 4x1)  ->  art/export/tiles/tileset_alvo.png
 4. mapa ASCII (art/source/maps/alvo-visual)  ->  Tiled JSON em art/export/maps/alvo-visual.json
 5. cena de preview (mapa + avatar + HUD com os 3 ícones)  ->  art/review/<lote>/mapa-preview*.png
 6. prancha de revisão (1x, 4x, paleta, testes 3x3)  ->  art/review/<lote>/prancha.png
 7. QA técnico com asset_report.py (sai 1 se algo falhar)
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / "art"
SK = ROOT / ".claude" / "skills"
PIX = SK / "pixel-art-scripted" / "scripts" / "pixel_from_grid.py"
A2T = SK / "tilemap-phaser-tiled" / "scripts" / "ascii_to_tiled.py"
RTP = SK / "tilemap-phaser-tiled" / "scripts" / "render_tilemap_preview.py"
REPORT = SK / "create-game-assets" / "scripts" / "asset_report.py"
SHEET = SK / "create-game-assets" / "scripts" / "build_preview_sheet.py"
LOTE = "2026-11-21-alvo-visual-01"
REVIEW = ART / "review" / LOTE

ASSETS = [
    # (id, família, rótulo pt-BR)
    ("avatar_base_idle_s", "characters", "avatar base, parado"),
    ("tile_grass", "tiles", "grama"),
    ("tile_soil_tilled", "tiles", "terra arada"),
    ("tile_water", "tiles", "água"),
    ("tile_water_edge_n", "tiles", "borda grama/água"),
    ("icon_seed_bag", "icons", "saco de sementes"),
    ("icon_tomato", "icons", "tomate colhido"),
    ("icon_coin", "icons", "moeda"),
]
TILE_ORDER = ["tile_grass", "tile_soil_tilled", "tile_water", "tile_water_edge_n"]


def run(*args):
    r = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"falhou: {' '.join(map(str, args))}\n{r.stdout}\n{r.stderr}")
    return r.stdout


def load_palette():
    pal = json.loads((ART / "style-guide" / "palette.json").read_text(encoding="utf-8"))
    flat = {c["key"]: c["hex"] for ramp in pal["ramps"].values() for c in ramp}
    (ART / "style-guide" / "palette-keys.json").write_text(json.dumps(flat, indent=1) + "\n", encoding="utf-8")
    return pal, flat


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def up(img, s):
    return img.resize((img.width * s, img.height * s), Image.NEAREST)


def build_assets():
    out = {}
    for aid, fam, _ in ASSETS:
        src = ART / "source" / fam / f"{aid}.txt"
        dst = ART / "export" / fam / f"{aid}.png"
        run(PIX, src, "--palette", ART / "style-guide" / "palette-keys.json", "--out", dst)
        out[aid] = Image.open(dst).convert("RGBA")
    ts = Image.new("RGBA", (16 * len(TILE_ORDER), 16))
    for i, t in enumerate(TILE_ORDER):
        ts.paste(out[t], (16 * i, 0))
    ts.save(ART / "export" / "tiles" / "tileset_alvo.png")
    return out


def build_map():
    spec = ART / "source" / "maps" / "alvo-visual" / "spec.json"
    mp = ART / "export" / "maps" / "alvo-visual.json"
    run(A2T, spec, "--out", mp)
    # Variação sem tile novo: espelha horizontalmente ~metade da grama (hash determinístico).
    data = json.loads(mp.read_text(encoding="utf-8"))
    w = data["width"]
    for layer in data["layers"]:
        if layer.get("type") != "tilelayer":
            continue
        for idx, gid in enumerate(layer["data"]):
            x, y = idx % w, idx // w
            if gid == 1 and ((x * 7 + y * 13 + x * y) % 5) in (1, 3):
                layer["data"][idx] = gid | 0x80000000
    mp.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    base = REVIEW / "_mapa-base-1x.png"
    run(RTP, mp, "--out", base, "--scale", "1")
    run(RTP, mp, "--out", REVIEW / "mapa-grade-colisao.png", "--scale", "3", "--grid", "--show-collision")
    return Image.open(base).convert("RGBA"), data


def hud_slot(icon, flat):
    """Slot de inventário 20x20 feito só com cores da paleta (moldura de UI de verdade virá do artista-icones-ui)."""
    s = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.rectangle((0, 0, 19, 19), fill=hexrgb(flat["N"]))
    d.rectangle((1, 1, 18, 18), fill=hexrgb(flat["L"]))
    d.line((1, 18, 18, 18), fill=hexrgb(flat["M"]))
    d.line((18, 1, 18, 18), fill=hexrgb(flat["M"]))
    d.line((1, 1, 17, 1), fill=hexrgb(flat["W"]))
    s.alpha_composite(icon, (2, 2))
    for p in ((0, 0), (19, 0), (0, 19), (19, 19)):
        s.putpixel(p, (0, 0, 0, 0))
    return s


def build_scene(base, data, imgs, flat):
    scene = base.copy()
    objs = {o["name"]: o for l in data["layers"] if l.get("type") == "objectgroup" for o in l["objects"]}
    sp = objs["spawn"]
    fx, fy = int(sp["x"]) + 8, int(sp["y"]) + 16  # pé do avatar = base-centro do tile de spawn
    shadow = hexrgb(flat["2"])
    d = ImageDraw.Draw(scene)
    d.ellipse((fx - 5, fy - 2, fx + 4, fy + 1), fill=shadow)
    scene.alpha_composite(imgs["avatar_base_idle_s"], (fx - 8, fy - 24))
    # tomates "colhidos" num caixote não existem ainda: mostramos 2 tomates no chão ao lado do canteiro
    for name in ("drop1", "drop2"):
        o = objs.get(name)
        if o:
            ox, oy = int(o["x"]), int(o["y"])
            d.ellipse((ox + 4, oy + 12, ox + 11, oy + 14), fill=shadow)
            scene.alpha_composite(imgs["icon_tomato"], (ox, oy))
    # HUD: 3 slots no canto superior esquerdo
    for i, k in enumerate(("icon_seed_bag", "icon_tomato", "icon_coin")):
        scene.alpha_composite(hud_slot(imgs[k], flat), (4 + i * 22, 4))
    scene.save(REVIEW / "mapa-preview-1x.png")
    up(scene, 3).save(REVIEW / "mapa-preview.png")
    return scene


def font(size):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf"):
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def checker(w, h, t=8):
    im = Image.new("RGBA", (w, h), (205, 205, 205, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, t):
        for x in range(0, w, t):
            if (x // t + y // t) % 2:
                d.rectangle((x, y, x + t - 1, y + t - 1), fill=(235, 235, 235, 255))
    return im


def build_board(pal, flat, imgs, scene):
    BG, FG, DIM = (32, 33, 36, 255), (240, 236, 226, 255), (160, 160, 168, 255)
    W = 1660
    board = Image.new("RGBA", (W, 1900), BG)
    d = ImageDraw.Draw(board)
    F1, F2, F3 = font(28), font(18), font(14)
    d.text((24, 18), f"NFT Farm Adventure — alvo visual · lote {LOTE}", font=F1, fill=FG)
    d.text((24, 56), "Tudo por script (grades .txt + paleta travada de 47 cores). Assets a 1× (tamanho real) e 4×. "
                     "Luz do topo-esquerda, contorno colorido de 1 px.", font=F3, fill=DIM)
    y = 92
    # --- paleta
    d.text((24, y), "Paleta nfa-base (47 cores, rampas por material)", font=F2, fill=FG)
    y += 30
    x = 24
    for name, ramp in pal["ramps"].items():
        bw = max(28 * len(ramp), 8 + len(name) * 8)
        d.text((x, y), name, font=F3, fill=DIM)
        for i, c in enumerate(ramp):
            d.rectangle((x + i * 28, y + 20, x + i * 28 + 25, y + 45), fill=hexrgb(c["hex"]))
            d.text((x + i * 28 + 8, y + 48), c["key"], font=F3, fill=DIM)
        x += bw + 18
        if x > W - 200:
            x, y = 24, y + 76
    y += 90
    # --- assets 1x e 4x
    d.text((24, y), "Assets — 1× (real) e 4×", font=F2, fill=FG)
    y += 30
    x = 24
    rowh = 0
    for aid, fam, label in ASSETS:
        im = imgs[aid]
        big = up(im, 4)
        cw = max(big.width + 40, 180)
        cell = checker(cw, big.height + 20)
        cell.alpha_composite(big, (cw - big.width - 10, 10))
        cell.alpha_composite(im, (6, 10))
        if x + cw > W - 24:
            x, y = 24, y + rowh + 56
            rowh = 0
        board.alpha_composite(cell, (x, y))
        d.text((x, y + cell.height + 4), f"{aid}", font=F3, fill=FG)
        d.text((x, y + cell.height + 22), f"{label} · {im.width}×{im.height}", font=F3, fill=DIM)
        x += cw + 20
        rowh = max(rowh, cell.height)
    y += rowh + 66
    # --- testes de repetição 3x3 (a 2x)
    d.text((24, y), "Teste de repetição 3×3 dos tiles (2×) — sem costura visível", font=F2, fill=FG)
    y += 30
    x = 24
    for t in ("tile_grass", "tile_soil_tilled", "tile_water"):
        g = Image.new("RGBA", (48, 48))
        for j in range(3):
            for i in range(3):
                g.paste(imgs[t], (i * 16, j * 16))
        board.alpha_composite(up(g, 2), (x, y))
        d.text((x, y + 100), t, font=F3, fill=DIM)
        x += 130
    # borda: grama em cima, borda, água embaixo, 3 colunas
    g = Image.new("RGBA", (48, 48))
    for i in range(3):
        g.paste(imgs["tile_grass"], (i * 16, 0))
        g.paste(imgs["tile_water_edge_n"], (i * 16, 16))
        g.paste(imgs["tile_water"], (i * 16, 32))
    board.alpha_composite(up(g, 2), (x, y))
    d.text((x, y + 100), "grama/borda/água", font=F3, fill=DIM)
    x += 150
    # ícones lado a lado sobre fundos do jogo a 1x e 2x (leitura)
    d.text((x, y - 4), "Ícones sobre grama, terra, água e painel (1× e 2×)", font=F3, fill=DIM)
    for r, bgk in enumerate(("tile_grass", "tile_soil_tilled", "tile_water", None)):
        strip = Image.new("RGBA", (16 * 3 + 8, 16))
        for i in range(4):
            if bgk:
                strip.paste(imgs[bgk], (i * 16, 0))
            else:
                ImageDraw.Draw(strip).rectangle((0, 0, strip.width, 16), fill=hexrgb(flat["L"]))
        for i, k in enumerate(("icon_seed_bag", "icon_tomato", "icon_coin")):
            strip.alpha_composite(imgs[k], (i * 18, 0))
        board.alpha_composite(strip, (x, y + 16 + r * 20))
        board.alpha_composite(up(strip, 2), (x + 80, y + 16 + r * 34 - (r * 0)))
    y += 170
    # --- cena
    d.text((24, y), "Mini-mapa de preview — 1× (tamanho real no jogo) e 3×", font=F2, fill=FG)
    y += 30
    board.alpha_composite(scene, (24, y))
    board.alpha_composite(up(scene, 3), (24 + scene.width + 24, y))
    y += scene.height * 3 + 24
    board = board.crop((0, 0, W, min(y, board.height)))
    out = REVIEW / "prancha.png"
    board.convert("RGB").save(out)
    return out


def qa():
    groups = [
        (["characters/avatar_base_idle_s.png"], ["--expect-size", "16x24", "--require-alpha", "--max-colors", "20"]),
        ([f"tiles/{t}.png" for t in TILE_ORDER[:3]], ["--expect-size", "16x16", "--max-colors", "8"]),
        (["tiles/tile_water_edge_n.png"], ["--expect-size", "16x16", "--max-colors", "12"]),
        ([f"icons/{i}.png" for i in ("icon_seed_bag", "icon_tomato", "icon_coin")],
         ["--expect-size", "16x16", "--require-alpha", "--max-colors", "12"]),
    ]
    results = []
    for files, flags in groups:
        r = subprocess.run([sys.executable, str(REPORT), *[str(ART / "export" / f) for f in files], *flags, "--json"],
                           capture_output=True, text=True)
        results.append((files, r.returncode, r.stdout))
    return results


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    pal, flat = load_palette()
    imgs = build_assets()
    base, data = build_map()
    scene = build_scene(base, data, imgs, flat)
    (REVIEW / "_mapa-base-1x.png").unlink(missing_ok=True)
    board = build_board(pal, flat, imgs, scene)
    run(SHEET, *[ART / "export" / fam / f"{a}.png" for a, fam, _ in ASSETS],
        "--out", REVIEW / "prancha-contato.png", "--columns", "4", "--cell-size", "96")
    ok = True
    for files, code, out in qa():
        print(f"QA {'OK ' if code == 0 else 'FALHOU'} {files}")
        ok &= code == 0
        if code:
            print(out)
    print(f"prancha: {board}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
