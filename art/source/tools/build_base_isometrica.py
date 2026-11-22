#!/usr/bin/env python3
"""Prancha de teste técnico da base isométrica (lote 2026-11-22-base-isometrica, status draft).

NÃO é o alvo visual: valida grade 2:1, encaixe sem costura, ancoragem, luz e sombra.

    python3 art/source/tools/build_base_isometrica.py

Gera:
  art/source/iso-base/*.svg                    fontes vetoriais (geradas — edite este script)
  art/export/iso-base/<nome>@1x.png, @2x.png    + <nome>.json (âncora/origem/pegada)
  art/review/2026-11-22-base-isometrica/        prancha.png, prancha@2x.png, prancha-debug.png,
                                                prancha-tecnica.png, qa.json
Sai 1 se o teste de costura ou o asset_report falhar.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import iso_vector as iv  # noqa: E402
from iso_vector import Asset, c, iso  # noqa: E402

ROOT = iv.ART.parent
SRC = iv.ART / "source" / "iso-base"
EXP = iv.ART / "export" / "iso-base"
REV = iv.ART / "review" / "2026-11-22-base-isometrica"
REPORT = ROOT / ".claude" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"

GW, GH = 136, 68            # canvas do tile de chão (128x64 + sangria 4 px h / 2 px v)
GANCHOR = (68, 34)


# =========================================================================== peças
def ground(name: str, base_ramp: str, detail) -> Asset:
    a = Asset(name, GW, GH, GANCHOR)
    a.layer("base", iv.ground_diamond(c(base_ramp, "base")))
    a.layer("detail", detail(a))
    return a


def grass_detail(seed: int):
    def f(a: Asset) -> str:
        d = a.defs
        cid = iv.ground_clip(d, 0.9)
        out = []
        for u, v, r in iv.scatter(seed, 2, 0.3):          # manchas claras suaves
            x, y = iso(u, v)
            out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{10 + 6 * r:.1f}" ry="{5 + 3 * r:.1f}" '
                       f'fill="{c("grama", "light")}" opacity="0.35"/>')
        for u, v, r in iv.scatter(seed + 1, 5, 0.34):     # tufos
            x, y = iso(u, v)
            s = 0.8 + 0.5 * r
            blades = [((-4, 0), (-6, -6), (-2, 0)), ((-1, 0), (0, -8), (2, 0)), ((2, 0), (6, -5), (4, 0))]
            for k, bl in enumerate(blades):
                p = [(x + bx * s, y + by * s) for bx, by in bl]
                col = c("grama", "light") if k == 0 else c("grama", "shadow")
                out.append(f'<polygon points="{iv.pts(p)}" fill="{col}" stroke-linejoin="round"/>')
        return f'<g clip-path="url(#{cid})">{"".join(out)}</g>'
    return f


def path_detail(a: Asset) -> str:
    d = a.defs
    cid = iv.ground_clip(d, 0.9)
    out = []
    for u, v, r in iv.scatter(51, 3, 0.3):
        x, y = iso(u, v)
        out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{12 + 6 * r:.1f}" ry="{6 + 3 * r:.1f}" '
                   f'fill="{c("terra_caminho", "light")}" opacity="0.7"/>')
    for u, v, r in iv.scatter(52, 7, 0.36):
        x, y = iso(u, v)
        out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="1.6" ry="1" fill="{c("terra_caminho", "deep")}" opacity="0.7"/>')
    for u, v, r in iv.scatter(53, 2, 0.3):               # pedrinhas
        x, y = iso(u, v)
        out.append(f'<ellipse cx="{x + 1:.1f}" cy="{y + 1.2:.1f}" rx="4.4" ry="2.6" fill="{c("terra_caminho", "deep")}" opacity="0.8"/>'
                   f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="4" ry="2.4" fill="{c("pedra", "base")}"/>'
                   f'<ellipse cx="{x - 1:.1f}" cy="{y - 0.8:.1f}" rx="1.8" ry="1" fill="{c("pedra", "highlight")}"/>')
    return f'<g clip-path="url(#{cid})">{"".join(out)}</g>'


def soil_detail(a: Asset) -> str:
    """Camalhões paralelos ao eixo x: continuam sem costura entre vizinhos em x."""
    d = a.defs
    cid = iv.ground_clip(d, 1.0, iv.GROUND_BLEED)
    out = []
    for t in (-0.375, -0.125, 0.125, 0.375):
        band = [iso(-0.75, t - 0.075), iso(0.75, t - 0.075), iso(0.75, t + 0.075), iso(-0.75, t + 0.075)]
        out.append(f'<polygon points="{iv.pts(band)}" fill="{c("canteiro", "light")}"/>')
        for tt, tone, w in ((t - 0.06, "highlight", 1.2), (t + 0.1, "deep", 2.0)):
            p0, p1 = iso(-0.75, tt), iso(0.75, tt)
            out.append(f'<line x1="{p0[0]:.2f}" y1="{p0[1]:.2f}" x2="{p1[0]:.2f}" y2="{p1[1]:.2f}" '
                       f'stroke="{c("canteiro", tone)}" stroke-width="{w}" stroke-linecap="round" opacity="0.85"/>')
    return f'<g clip-path="url(#{cid})">{"".join(out)}</g>'


def tree() -> tuple[Asset, Asset]:
    W, H = 160, 224
    anchor = (80, H - 44)
    a = Asset("tree_round_a", W, H, anchor)
    d = a.defs
    a.layer("trunk", f'<ellipse cx="0" cy="1" rx="13" ry="5" fill="{c("madeira", "deep")}"/>'
                     + iv.cylinder(d, "madeira", r=10, h=48, cap=False))
    blobs = [(-30, -100, 32), (29, -102, 32), (0, -132, 35), (-39, -72, 27),
             (38, -74, 27), (0, -86, 37), (-15, -62, 24), (17, -60, 24)]
    a.layer("canopy", iv.fluffy(d, "folhagem", blobs))
    s = Asset("tree_round_a_shadow", W, H, anchor)
    s.layer("shadow", iv.drop_shadow(s.defs, rx=50, ry=22, dx=14, dy=6))
    return a, s


def hay_bale() -> tuple[Asset, Asset]:
    W, H = 160, 112
    anchor = (80, H - 44)
    a = Asset("prop_hay_bale", W, H, anchor)
    d = a.defs
    sx, sy, h = 0.62, 0.44, 38
    a.layer("body", iv.iso_box(d, "feno", sx=sx, sy=sy, h=h))
    straw = []
    for k in range(5):                                   # palha na face esquerda (horizontal)
        z = 8 + k * 6.5
        p0, p1 = iso(-sx / 2 + 0.05 + 0.03 * (k % 2), sy / 2, z), iso(sx / 2 - 0.08, sy / 2, z)
        straw.append(f'<line x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}" '
                     f'stroke="{c("feno", "shadow")}" stroke-width="1" opacity="0.55" stroke-linecap="round"/>')
        q0, q1 = iso(sx / 2, -sy / 2 + 0.05, z - 2), iso(sx / 2, sy / 2 - 0.06, z - 2)
        straw.append(f'<line x1="{q0[0]:.1f}" y1="{q0[1]:.1f}" x2="{q1[0]:.1f}" y2="{q1[1]:.1f}" '
                     f'stroke="{c("feno", "outline")}" stroke-width="1" opacity="0.35" stroke-linecap="round"/>')
    a.layer("texture", "".join(straw))
    twine = []
    for x in (-0.16, 0.16):                              # amarras: topo -> face esquerda
        p = [iso(x, -sy / 2, h), iso(x, sy / 2, h), iso(x, sy / 2, 0)]
        twine.append(f'<polyline points="{iv.pts(p)}" fill="none" stroke="{c("madeira", "shadow")}" '
                     f'stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>')
    a.layer("twine", "".join(twine))
    s = Asset("prop_hay_bale_shadow", W, H, anchor)
    s.layer("shadow", iv.drop_shadow(s.defs, rx=46, ry=20, dx=10, dy=5))
    return a, s


def scale_figure() -> tuple[Asset, Asset]:
    """Boneco de ESCALA (placeholder cinza): altura de referência do avatar, não é arte final."""
    W, H = 64, 112
    anchor = (32, H - 12)
    a = Asset("ref_scale_figure", W, H, anchor, footprint=(0.3, 0.3))
    d = a.defs
    g = iv.lin(d, [(0, c("pedra", "light")), (0.5, c("pedra", "base")), (1, c("pedra", "shadow"))], 0, 0, 1, 0)
    o = c("pedra", "outline")
    body = '<rect x="-15" y="-60" width="30" height="58" rx="14"/>'
    head = '<circle cx="0" cy="-76" r="16"/>'
    a.layer("outline", f'<g fill="{o}" stroke="{o}" stroke-width="{2 * iv.OUTLINE["object"]}">{body}{head}</g>')
    a.layer("fill", f'<g fill="url(#{g})">{body}{head}</g>')
    s = Asset("ref_scale_figure_shadow", W, H, anchor, footprint=(0.3, 0.3))
    s.layer("shadow", iv.drop_shadow(s.defs, rx=20, ry=9, dx=5, dy=3))
    return a, s


def build_assets() -> dict[str, Asset]:
    items = [
        ground("ground_grass_a", "grama", grass_detail(11)),
        ground("ground_grass_b", "grama", grass_detail(23)),
        ground("ground_path_dirt", "terra_caminho", path_detail),
        ground("ground_soil_tilled", "canteiro", soil_detail),
        *tree(), *hay_bale(), *scale_figure(),
    ]
    return {a.name: a for a in items}


# =========================================================================== cena
N = 6
PATH = {(i, 2) for i in range(N)} | {(1, j) for j in range(3, N)}
SOIL = {(i, j) for i in (3, 4) for j in (3, 4, 5)}
OBJECTS = [("tree_round_a", 4, 0), ("prop_hay_bale", 0, 4), ("ref_scale_figure", 2, 2)]
BOARD_W, BOARD_H, OX, OY = 864, 528, 432, 132
BG = (226, 236, 240, 255)


def ground_at(i, j) -> str:
    if (i, j) in SOIL:
        return "ground_soil_tilled"
    if (i, j) in PATH:
        return "ground_path_dirt"
    return "ground_grass_b" if (i * 7 + j * 13) % 3 == 0 else "ground_grass_a"


def load(name: str, zoom: float) -> tuple[Image.Image, tuple[float, float]]:
    """Imagem do asset para exibir no zoom pedido (@1x até 1.0, @2x acima)."""
    meta = json.loads((EXP / f"{name}.json").read_text())
    src = 1 if zoom <= 1 else 2
    im = Image.open(EXP / f"{name}@{src}x.png").convert("RGBA")
    f = zoom / src
    if f != 1:
        im = im.resize((round(im.width * f), round(im.height * f)), Image.BOX)  # ~ mipmap/bilinear da GPU (sem ringing)
    ax, ay = meta["anchor_px_1x"]
    return im, (ax * zoom, ay * zoom)


def place(canvas: Image.Image, im: Image.Image, anchor, at):
    x, y = at[0] - anchor[0], at[1] - anchor[1]
    assert abs(x - round(x)) < 1e-6 and abs(y - round(y)) < 1e-6, "posição fracionária"
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(im, (round(x), round(y)))
    canvas.alpha_composite(layer)


def screen(i, j, z):
    return (OX * z + (i - j) * 64 * z, OY * z + (i + j) * 32 * z)


def compose(zoom: float, ground_only=False, bg=BG, shadows=True) -> Image.Image:
    cv = Image.new("RGBA", (round(BOARD_W * zoom), round(BOARD_H * zoom)), bg)
    for s in range(2 * N - 1):                           # chão: de trás para a frente
        for i in range(N):
            j = s - i
            if 0 <= j < N:
                im, an = load(ground_at(i, j), zoom)
                place(cv, im, an, screen(i, j, zoom))
    if ground_only:
        return cv
    if shadows:                                          # camada de sombras: acima do chão
        for name, i, j in OBJECTS:
            im, an = load(name + "_shadow", zoom)
            place(cv, im, an, screen(i, j, zoom))
    for name, i, j in sorted(OBJECTS, key=lambda o: (o[1] + o[2], o[1])):   # objetos por profundidade
        im, an = load(name, zoom)
        place(cv, im, an, screen(i, j, zoom))
    return cv


def seam_test(zoom: float) -> dict:
    """Conta pixels não-opacos dentro da área do chão (deveria ser 0)."""
    cv = compose(zoom, ground_only=True, bg=(0, 0, 0, 0))
    mask = Image.new("L", cv.size, 0)
    inset = 4 * zoom
    top = screen(0, 0, zoom); right = screen(N - 1, 0, zoom); bot = screen(N - 1, N - 1, zoom); left = screen(0, N - 1, zoom)
    poly = [(top[0], top[1] - 32 * zoom + inset), (right[0] + 64 * zoom - 2 * inset, right[1]),
            (bot[0], bot[1] + 32 * zoom - inset), (left[0] - 64 * zoom + 2 * inset, left[1])]
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    a, m = cv.getchannel("A").tobytes(), mask.tobytes()
    inside = sum(1 for mv in m if mv)
    holes = sum(1 for av, mv in zip(a, m) if mv and av < 255)
    return {"zoom": zoom, "pixels_checked": inside, "non_opaque_pixels": holes, "pass": holes == 0}


def debug_overlay(img: Image.Image, zoom: float, assets: dict) -> Image.Image:
    out = img.copy()
    d = ImageDraw.Draw(out)
    for i in range(N):
        for j in range(N):
            x, y = screen(i, j, zoom)
            p = [(x, y - 32 * zoom), (x + 64 * zoom, y), (x, y + 32 * zoom), (x - 64 * zoom, y)]
            d.polygon(p, outline=(40, 60, 90, 255))
            d.text((x - 8 * zoom, y - 5 * zoom), f"{i},{j}", fill=(40, 60, 90, 255))
    for name, i, j in OBJECTS:
        x, y = screen(i, j, zoom)
        fx, fy = assets[name].footprint
        p = [iso(-fx / 2, -fy / 2), iso(fx / 2, -fy / 2), iso(fx / 2, fy / 2), iso(-fx / 2, fy / 2)]
        d.polygon([(x + px * zoom, y + py * zoom) for px, py in p], outline=(0, 200, 255, 255), width=2)
        im, an = load(name, zoom)
        d.rectangle([x - an[0], y - an[1], x - an[0] + im.width - 1, y - an[1] + im.height - 1], outline=(255, 140, 0, 255))
        d.line([(x - 7, y), (x + 7, y)], fill=(255, 0, 200, 255), width=2)
        d.line([(x, y - 7), (x, y + 7)], fill=(255, 0, 200, 255), width=2)
    return out


def tech_sheet() -> Image.Image:
    """3x3 de cada tile (1x) + zoom 0.5 e 1.5 da cena."""
    tiles = ["ground_grass_a", "ground_grass_b", "ground_path_dirt", "ground_soil_tilled"]
    cell_w, cell_h = 3 * 128 + 24, 3 * 64 + 24
    half = compose(0.5)
    big = compose(1.5).crop((round(150 * 1.5), round(40 * 1.5), round(150 * 1.5) + 2 * cell_w - 0, round(40 * 1.5) + 420))
    W = 2 * cell_w
    H = 2 * cell_h + half.height + big.height + 40
    sheet = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for k, name in enumerate(tiles):
        im, an = load(name, 1)
        ox, oy = (k % 2) * cell_w, (k // 2) * cell_h
        for s in range(5):
            for i in range(3):
                j = s - i
                if 0 <= j < 3:
                    cx = ox + cell_w / 2 + (i - j) * 64
                    cy = oy + 12 + 32 + (i + j) * 32
                    sheet.alpha_composite(im, (round(cx - an[0]), round(cy - an[1])))
        d.text((ox + 6, oy + 4), f"{name} 3x3 @1x", fill=(30, 30, 30, 255))
    y = 2 * cell_h + 10
    sheet.alpha_composite(half, (0, y)); d.text((6, y + 4), "cena zoom 0.5 (celular afastado)", fill=(30, 30, 30, 255))
    y += half.height + 20
    sheet.alpha_composite(big, (0, y)); d.text((6, y + 4), "recorte zoom 1.5 (de @2x)", fill=(30, 30, 30, 255))
    return sheet


# =========================================================================== QA
def asset_report(assets: dict) -> list[dict]:
    res = []
    for name, a in assets.items():
        for s in iv.SCALES:
            p = EXP / f"{name}@{s}x.png"
            cmd = [sys.executable, str(REPORT), str(p), "--expect-size", f"{a.width * s}x{a.height * s}",
                   "--require-alpha", "--json"]
            r = subprocess.run(cmd, capture_output=True, text=True)
            res.append({"file": str(p.relative_to(ROOT)), "exit": r.returncode,
                        "report": json.loads(r.stdout) if r.stdout.strip().startswith(("{", "[")) else r.stdout})
    return res


def main() -> int:
    assets = build_assets()
    for a in assets.values():
        a.export(SRC, EXP)
    REV.mkdir(parents=True, exist_ok=True)
    compose(1).save(REV / "prancha.png")
    board2 = compose(2)
    board2.save(REV / "prancha@2x.png")
    debug_overlay(board2, 2, assets).save(REV / "prancha-debug.png")
    tech_sheet().save(REV / "prancha-tecnica.png")
    seams = [seam_test(z) for z in (0.5, 1, 1.5, 2)]
    report = asset_report(assets)
    ok = all(s["pass"] for s in seams) and all(r["exit"] == 0 for r in report)
    qa = {"batch": "2026-11-22-base-isometrica", "seam_tests": seams,
          "asset_report": [{"file": r["file"], "exit": r["exit"]} for r in report], "pass": ok}
    (REV / "qa.json").write_text(json.dumps(qa, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(qa, indent=1))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
