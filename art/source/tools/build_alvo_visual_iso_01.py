#!/usr/bin/env python3
"""Alvo visual isométrico cartoon — lote 2026-11-22-alvo-visual-iso-01 (status: in_review).

100% vetor gerado por código (SVG -> PNG com cairosvg). Sem gerador de imagem por IA, sem
referência externa, nada derivado de Sunflower Land/Sunnyside nem de kits de terceiros.
Guia: art/style-guide/README.md (v2.1). Paleta: art/style-guide/palette.json.

    python3 -m pip install -r art/source/tools/requirements.txt
    python3 art/source/tools/build_alvo_visual_iso_01.py          # sai 0 só se todo o QA passar

Gera:
  art/source/iso-<familia>/<nome>.svg             fontes geradas (não editar: edite este script)
  art/export/iso-<familia>/<nome>@1x.png, @2x.png  + <nome>.json (âncora, origem, pegada)
  art/review/2026-11-22-alvo-visual-iso-01/       cena.png, cena@2x.png, cena-zoom05.png,
                                                  cena-celular.png, prancha.png, prancha-debug.png,
                                                  prancha-tecnica.png, qa.json
  art/manifest.json                               entradas deste lote (status in_review)
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import iso_vector as iv  # noqa: E402
from iso_vector import Asset, c, iso  # noqa: E402

BATCH = "2026-11-22-alvo-visual-iso-01"
ROOT = iv.ART.parent
REV = iv.ART / "review" / BATCH
REPORT = ROOT / ".claude" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"
FAM = {  # família -> (pasta em source/ e export/)
    "ground": "iso-ground", "nature": "iso-nature", "crops": "iso-crops", "props": "iso-props",
    "buildings": "iso-buildings", "characters": "iso-characters", "ui": "iso-ui",
}

GW, GH = 136, 68                 # tile de chão: 128x64 + sangria
GANCHOR = (68, 34)
UVB = 0.03125                    # sangria do chão em unidades de tile (4 px na horizontal)
CLIFF_H = 40                     # altura do barranco da ilha (px @1x)
EDGE_H = GH + CLIFF_H + 8        # canvas do tile de borda (barranco + espuma)
BED_H, SOIL_Z = 16, 12           # canteiro elevado: altura da borda e da terra
XP, YP, XN, YN = 1, 2, 4, 8      # máscara de vizinhos (+x, +y, -x, -y)
MASK_TAG = {XP: "xp", YP: "yp", XN: "xn", YN: "yn"}


def tag(mask: int) -> str:
    return "".join(MASK_TAG[b] for b in (XP, YP, XN, YN) if mask & b) or "none"


def f2(v: float) -> str:
    return f"{v:.2f}"


def poly(points, fill, extra="") -> str:
    return f'<polygon points="{iv.pts(points)}" fill="{fill}" {extra}/>'


def outlined_d(d: str, ramp: str, fill: str, ow: float = 2.0, extra: str = "") -> str:
    """Path com contorno por trás (traço atrás) + preenchimento."""
    return iv.outline_path(d, ramp, ow) + f'<path d="{d}" fill="{fill}" {extra}/>'


def uvmap(p):
    return iso(p[0], p[1])


# =========================================================================== CHÃO
def tuft(x, y, s=1.0, light=None, dark=None, op=0.95) -> str:
    """Tufo de grama com 3 lâminas curvas (base em x, y)."""
    light = light or c("grama", "light")
    dark = dark or c("grama", "shadow")
    out = [f'<ellipse cx="{f2(x)}" cy="{f2(y + 0.6 * s)}" rx="{f2(4.6 * s)}" ry="{f2(1.6 * s)}" '
           f'fill="{c("grama", "shadow")}" opacity="0.55"/>']
    for k, (tx, ty, o) in enumerate(((-4.2, -6.2, -2.4), (0.6, -9.0, 0.0), (4.4, -5.6, 2.4))):
        bx = x + o * s
        bl, br = (bx - 1.7 * s, y), (bx + 1.7 * s, y)
        tip = (bx + tx * s, y + ty * s)
        c1 = (bx + tx * 0.25 * s - 1.2 * s, y + ty * 0.6 * s)
        c2 = (bx + tx * 0.25 * s + 1.4 * s, y + ty * 0.45 * s)
        col = light if k == 1 else dark
        out.append(f'<path d="M{f2(bl[0])},{f2(bl[1])} Q{f2(c1[0])},{f2(c1[1])} {f2(tip[0])},{f2(tip[1])} '
                   f'Q{f2(c2[0])},{f2(c2[1])} {f2(br[0])},{f2(br[1])} Z" fill="{col}" opacity="{op}"/>')
    return "".join(out)


def clover(x, y, s=1.0) -> str:
    out = []
    for dx, dy in ((-2.2, 0), (2.2, 0), (0, -2.0)):
        out.append(f'<ellipse cx="{f2(x + dx * s)}" cy="{f2(y + dy * s)}" rx="{f2(2.4 * s)}" ry="{f2(1.7 * s)}" '
                   f'fill="{c("grama", "light")}"/>')
    out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y - 0.6 * s)}" rx="{f2(1.1 * s)}" ry="{f2(0.8 * s)}" fill="{c("grama", "highlight")}"/>')
    return "".join(out)


def grass_detail(a: Asset, variant: str, seed: int, lim: float = 0.33) -> str:
    """Detalhe da grama por variante. Tudo dentro da área segura (não encosta na borda do tile)."""
    d = a.defs
    cid = iv.ground_clip(d, 0.92)
    out = []
    if variant == "a":       # manchas claras + tufos
        for u, v, r in iv.scatter(seed, 2, 0.2):
            x, y = iso(u, v)
            out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(12 + 5 * r)}" ry="{f2(5.5 + 2 * r)}" '
                       f'fill="{c("grama", "light")}" opacity="0.30"/>')
        for u, v, r in iv.scatter(seed + 1, 4, lim):
            out.append(tuft(*iso(u, v), 0.85 + 0.35 * r))
    elif variant == "b":     # mancha mais escura + trevo + tufos
        for u, v, r in iv.scatter(seed, 1, 0.16):
            x, y = iso(u, v)
            out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(16 + 4 * r)}" ry="{f2(7 + 2 * r)}" '
                       f'fill="{c("grama", "shadow")}" opacity="0.22"/>')
        for u, v, r in iv.scatter(seed + 1, 3, lim):
            out.append(tuft(*iso(u, v), 0.8 + 0.3 * r))
        for u, v, r in iv.scatter(seed + 2, 1, 0.28):
            out.append(clover(*iso(u, v), 1.0))
    else:                    # "c": poucos tufos, trevos e florzinhas soltas
        for u, v, r in iv.scatter(seed, 2, lim):
            out.append(tuft(*iso(u, v), 0.75 + 0.3 * r))
        for u, v, r in iv.scatter(seed + 1, 2, 0.3):
            out.append(clover(*iso(u, v), 0.9 + 0.2 * r))
        for k, (u, v, r) in enumerate(iv.scatter(seed + 2, 3, 0.3)):
            x, y = iso(u, v)
            col = c("tecido_creme", "light") if k % 2 == 0 else c("tecido_amarelo", "light")
            out.append(f'<circle cx="{f2(x)}" cy="{f2(y)}" r="1.7" fill="{col}"/>'
                       f'<circle cx="{f2(x)}" cy="{f2(y)}" r="0.7" fill="{c("ouro", "deep")}"/>')
    return f'<g clip-path="url(#{cid})">{"".join(out)}</g>'


def ground_tile(name: str, variant: str, seed: int) -> Asset:
    a = Asset(name, GW, GH, GANCHOR)
    a.layer("base", iv.ground_diamond(c("grama", "base")))
    a.layer("detail", grass_detail(a, variant, seed))
    return a


def water_tile(var: str = "a", seed: int = 301, n: int = 2) -> Asset:
    a = Asset(f"ground_water_{var}", GW, GH, GANCHOR)
    a.layer("base", iv.ground_diamond(c("agua", "base")))
    cid = iv.ground_clip(a.defs, 0.9)
    out = []
    for u, v, r in iv.scatter(seed, n, 0.3):
        x, y = iso(u, v)
        w = 6 + 4 * r
        out.append(f'<path d="M{f2(x - w)},{f2(y)} Q{f2(x - w / 2)},{f2(y - 2.4)} {f2(x)},{f2(y)} '
                   f'Q{f2(x + w / 2)},{f2(y + 2.4)} {f2(x + w)},{f2(y)}" fill="none" stroke="{c("agua", "light")}" '
                   f'stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>')
    if var == "a":
        x, y = iso(0.18, -0.2)
        out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="3" ry="1.2" fill="{c("agua", "highlight")}" opacity="0.8"/>')
    a.layer("detail", f'<g clip-path="url(#{cid})">{"".join(out)}</g>')
    return a


# ---------------------------------------------------------------- caminho (autotile 16)
def path_poly(mask: int, w: float, E: float = 0.66, rc: float = 0.2, ri: float = 0.1):
    """Contorno (u, v) da faixa de caminho: quadrado central + braços para os vizinhos.

    Cantos sem braço nenhum = convexos arredondados (rc); cantos entre dois braços =
    côncavos arredondados (ri). Braços passam da borda do tile (E > 0.5) e são cortados
    pelo clip do losango, então o caminho continua sem costura no vizinho.
    """
    corners = [(w, -w), (w, w), (-w, w), (-w, -w)]
    after = [XP, YP, XN, YN]
    before = [YN, XP, YP, XN]
    arms = {XP: [(E, -w), (E, w)], YP: [(w, E), (-w, E)], XN: [(-E, w), (-E, -w)], YN: [(-w, -E), (w, -E)]}
    pts_, rad_ = [], []
    for k in range(4):
        a_, b_ = bool(mask & before[k]), bool(mask & after[k])
        pts_.append(corners[k])
        rad_.append(ri if (a_ and b_) else (rc if not (a_ or b_) else 0.0))
        if mask & after[k]:
            pts_ += arms[after[k]]
            rad_ += [0.0, 0.0]
    return pts_, rad_


def in_path(u, v, mask, w, m=0.06) -> bool:
    if abs(u) <= w - m and abs(v) <= w - m:
        return True
    if mask & XP and u >= 0 and abs(v) <= w - m:
        return True
    if mask & XN and u <= 0 and abs(v) <= w - m:
        return True
    if mask & YP and v >= 0 and abs(u) <= w - m:
        return True
    if mask & YN and v <= 0 and abs(u) <= w - m:
        return True
    return False


def path_tile(mask: int, var: str = "") -> Asset:
    a = Asset(f"ground_path_dirt_{tag(mask)}{var}", GW, GH, GANCHOR)
    d = a.defs
    W = 0.30
    tile_clip = iv.ground_clip(d, 1.0, iv.GROUND_BLEED)
    p, r = path_poly(mask, W)
    dpath = iv.rounded_d(p, r, uvmap)
    pc, rcen = path_poly(mask, 0.13, rc=0.1, ri=0.06)
    dcen = iv.rounded_d(pc, rcen, uvmap)
    pclip = iv.clip(d, f'<path d="{dpath}"/>')
    a.layer("base", iv.ground_diamond(c("grama", "base")))
    a.layer("grass", grass_detail(a, "a", 900 + mask))
    out = [
        f'<g clip-path="url(#{tile_clip})">',
        # beirada da grama: faixa suave escura + filete (sombra que a grama faz no caminho)
        f'<path d="{dpath}" fill="none" stroke="{c("grama", "deep")}" stroke-width="11" stroke-linejoin="round" opacity="0.22"/>',
        f'<path d="{dpath}" fill="none" stroke="{c("grama", "shadow")}" stroke-width="6" stroke-linejoin="round"/>',
        f'<path d="{dpath}" fill="{c("terra_caminho", "base")}"/>',
        f'<g clip-path="url(#{pclip})">',
        f'<path d="{dpath}" fill="none" stroke="{c("terra_caminho", "shadow")}" stroke-width="6" stroke-linejoin="round"/>',
        f'<path d="{dcen}" fill="{c("terra_caminho", "light")}" opacity="0.8"/>',
    ]
    import random
    rng = random.Random(1000 + mask + (517 if var else 0))
    pebbles, tries = 0, 0
    while pebbles < (1 if var else 2) and tries < 200:          # pedrinhas e grãos só dentro do caminho
        tries += 1
        u, v = rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4)
        if not in_path(u, v, mask, W, 0.1):
            continue
        x, y = iso(u, v)
        s = rng.uniform(0.8, 1.2)
        out.append(f'<ellipse cx="{f2(x + 0.8)}" cy="{f2(y + 1.2)}" rx="{f2(4.4 * s)}" ry="{f2(2.4 * s)}" fill="{c("terra_caminho", "deep")}" opacity="0.6"/>'
                   f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(3.8 * s)}" ry="{f2(2.3 * s)}" fill="{c("pedra", "light")}"/>'
                   f'<ellipse cx="{f2(x - 1)}" cy="{f2(y - 0.7)}" rx="{f2(1.6 * s)}" ry="{f2(0.9 * s)}" fill="{c("pedra", "highlight")}"/>')
        pebbles += 1
    for _ in range(40):
        u, v = rng.uniform(-0.45, 0.45), rng.uniform(-0.45, 0.45)
        if in_path(u, v, mask, W, 0.08):
            x, y = iso(u, v)
            out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="1.3" ry="0.8" fill="{c("terra_caminho", "shadow")}" opacity="0.8"/>')
    out.append("</g>")
    # tufos de grama que invadem a beira do caminho (lados sem braço)
    for side, (u, v) in ((XP, (W, 0.06)), (YP, (-0.06, W)), (XN, (-W, -0.04)), (YN, (0.05, -W))):
        if not mask & side:
            out.append(tuft(*iso(u, v), 0.9))
    for side, (u, v) in ((XP, (0.4, W)), (YP, (-W, 0.38)), (XN, (-0.38, -W)), (YN, (W, -0.4))):
        if mask & side:
            out.append(tuft(*iso(u, v), 0.8))
    out.append("</g>")
    a.layer("path", "".join(out))
    return a


# ---------------------------------------------------------------- borda da ilha (barranco)
def wave(t: float) -> float:
    """Ondulação periódica (período 1 tile) do pé do barranco: contínua entre vizinhos."""
    ph = 2 * math.pi * (t + 0.5)
    return 3.0 * math.sin(2 * ph) + 1.6 * math.sin(3 * ph + 1.0)


def lip(t: float) -> float:
    return 4.5 + 3.0 * abs(math.sin(4 * math.pi * (t + 0.5)))


STONE_SETS = {"a": ((-0.28, -19, 1.0), (0.22, -31, 0.8), (0.05, -8, 0.7)),
              "b": ((-0.08, -27, 1.1), (0.31, -12, 0.75)),
              "c": ((-0.34, -9, 0.7), (0.12, -20, 0.95), (0.4, -33, 0.6))}


def edge_tile(mask: int, variant: str = "a", stones: str = "a", suffix: str = "") -> Asset:
    """Tile de borda da ilha. Lados +x/+y (frente): barranco com estratos, pedras e espuma.
    Lados -x/-y (fundo): só um filete de luz na beira da grama."""
    a = Asset(f"ground_edge_grass_{tag(mask)}{suffix}", GW, EDGE_H, GANCHOR)
    d = a.defs
    n = 24
    faces = []

    def face(side: str):
        lit = side == "y"
        eps_plus = 0.0 if (mask & XP and mask & YP) else 0.03
        ts = [-0.5 + (1.0 + eps_plus) * k / n for k in range(n + 1)]
        P = (lambda t, z: iso(t, 0.5, z)) if lit else (lambda t, z: iso(0.5, t, z))
        top = [P(t, 0) for t in ts]
        bot = [P(t, -CLIFF_H + wave(t)) for t in ts]
        slope = 0.5 if lit else -0.5
        t1, t2 = ("light", "base") if lit else ("shadow", "deep")
        gid = d.add("linearGradient",
                    f'<stop offset="0" stop-color="{c("barranco", t1)}"/><stop offset="1" stop-color="{c("barranco", t2)}"/>',
                    f'gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{CLIFF_H}" '
                    f'gradientTransform="matrix(1,{slope},0,1,0,32)"')
        o = [poly(top + bot[::-1], f"url(#{gid})")]
        fid = iv.clip(d, f'<polygon points="{iv.pts(top + bot[::-1])}"/>')
        o.append(f'<g clip-path="url(#{fid})">')
        for zl, amp in ((-13, 1.0), (-26, 1.4)):           # estratos
            line = [P(t, zl + amp * math.sin(2 * math.pi * 2 * (t + 0.5) + zl)) for t in ts]
            o.append(f'<polyline points="{iv.pts(line)}" fill="none" stroke="{c("barranco", "shadow" if lit else "deep")}" '
                     f'stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>')
            if lit:
                hl = [(x, y + 1.6) for x, y in line]
                o.append(f'<polyline points="{iv.pts(hl)}" fill="none" stroke="{c("barranco", "highlight")}" '
                         f'stroke-width="1" opacity="0.55"/>')
        for k, (t, zz, s) in enumerate(STONE_SETS[stones if lit else "bca"["abc".index(stones)]]):   # pedras
            x, y = P(t, zz)
            rx, ry = 5.2 * s, 3.6 * s
            o.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(rx + 1.5)}" ry="{f2(ry + 1.5)}" fill="{c("pedra", "outline")}"/>'
                     f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(rx)}" ry="{f2(ry)}" fill="{c("pedra", "base" if lit else "shadow")}"/>'
                     f'<ellipse cx="{f2(x - 1.2 * s)}" cy="{f2(y - 1.1 * s)}" rx="{f2(rx * 0.5)}" ry="{f2(ry * 0.45)}" '
                     f'fill="{c("pedra", "light" if lit else "base")}"/>')
        o.append("</g>")
        o.append(f'<polyline points="{iv.pts(bot)}" fill="none" stroke="{c("barranco", "outline")}" stroke-width="2.2" stroke-linecap="round"/>')
        foam = [(x, y + 2.5) for x, y in bot]
        o.append(f'<polyline points="{iv.pts(foam)}" fill="none" stroke="{c("agua", "highlight")}" stroke-width="3.2" '
                 f'stroke-linecap="round" opacity="0.9"/>')
        foam2 = [(x, y + 6.0) for x, y in bot[1::3]]
        o.append(f'<polyline points="{iv.pts(foam2)}" fill="none" stroke="{c("agua", "light")}" stroke-width="1.6" '
                 f'stroke-linecap="round" stroke-dasharray="6 5" opacity="0.8"/>')
        return "".join(o)

    if mask & YP:
        faces.append(face("y"))
    if mask & XP:
        faces.append(face("x"))
    if mask & XP and mask & YP:
        x0, y0 = iso(0.5, 0.5, 0)
        faces.append(f'<line x1="{f2(x0)}" y1="{f2(y0)}" x2="{f2(x0)}" y2="{f2(y0 + CLIFF_H - wave(0.5))}" '
                     f'stroke="{c("barranco", "highlight")}" stroke-width="1.4" opacity="0.6"/>')
    a.layer("cliff", "".join(faces))
    # topo: losango de grama com sangria só para dentro da ilha
    u0 = -0.5 if mask & XN else -0.5 - UVB
    u1 = 0.5 if mask & XP else 0.5 + UVB
    v0 = -0.5 if mask & YN else -0.5 - UVB
    v1 = 0.5 if mask & YP else 0.5 + UVB
    top = [iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)]
    a.layer("base", poly(top, c("grama", "base"), 'shape-rendering="crispEdges"'))
    a.layer("detail", grass_detail(a, variant, 700 + mask, lim=0.28))
    rim = []
    for side in (YP, XP):                                   # beiço de grama sobre o barranco
        if not mask & side:
            continue
        ts = [-0.5 + k / 32 for k in range(33)]
        P = (lambda t, z: iso(t, 0.5, z)) if side == YP else (lambda t, z: iso(0.5, t, z))
        topl = [P(t, 0) for t in ts]
        botl = [P(t, -lip(t)) for t in ts]
        rim.append(poly(topl + botl[::-1], c("grama", "shadow" if side == YP else "deep")))
        rim.append(f'<polyline points="{iv.pts(botl)}" fill="none" stroke="{c("grama", "outline")}" stroke-width="1.6" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>')
        inner = [(x, y - 1.2) for x, y in topl]
        rim.append(f'<polyline points="{iv.pts(inner)}" fill="none" stroke="{c("grama", "light")}" stroke-width="1.6" opacity="0.9"/>')
    for side, (p0, p1) in ((XN, ((-0.47, -0.5), (-0.47, 0.5))), (YN, ((-0.5, -0.47), (0.5, -0.47)))):
        if mask & side:                                     # beira de trás: filete de luz
            q0, q1 = iso(*p0), iso(*p1)
            rim.append(f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" '
                       f'stroke="{c("grama", "highlight")}" stroke-width="2.2" opacity="0.8"/>')
    a.layer("rim", "".join(rim))
    return a


# =========================================================================== DECOR DE CHÃO
def blob_uv(scale, k1=0.07, k2=0.04, ph=0.6, n=72, base=0.8):
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = (base + k1 * math.sin(3 * t + ph) + k2 * math.sin(5 * t + 2.0)) * scale
        out.append(iso(r * math.cos(t), r * math.sin(t)))
    return out


def stone(defs, x, y, rx, ry, ramp="pedra", ow=1.6) -> str:
    o = c(ramp, "outline")
    g = iv.rad(defs, [(0, c(ramp, "highlight")), (0.35, c(ramp, "light")), (0.8, c(ramp, "base")), (1, c(ramp, "shadow"))],
               cx=0.5, cy=0.5, r=0.6, fx=0.32, fy=0.28)
    return (f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(rx)}" ry="{f2(ry)}" fill="{o}" stroke="{o}" stroke-width="{2 * ow}"/>'
            f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(rx)}" ry="{f2(ry)}" fill="url(#{g})"/>')


def pond() -> Asset:
    """Lago 2x2 (decalque de chão): margem de terra, parede interna, água, pedras, juncos."""
    W, H = 288, 168
    a = Asset("ground_pond_2x2", W, H, (144, 96), footprint=(2, 2))
    d = a.defs
    halo = blob_uv(1.14)
    bank = blob_uv(1.02)
    wall = blob_uv(0.92)
    water = [(x, y + 6) for x, y in blob_uv(0.88)]
    a.layer("halo", poly(halo, c("grama", "shadow"), 'opacity="0.55"'))
    a.layer("bank", poly(bank, c("barranco", "light")) +
            f'<polygon points="{iv.pts(bank)}" fill="none" stroke="{c("barranco", "shadow")}" stroke-width="1.2" opacity="0.7"/>')
    wid = iv.clip(d, f'<polygon points="{iv.pts(wall)}"/>')
    gw = iv.rad(d, [(0, c("agua", "shadow")), (1, c("agua", "base"))], cx=0.5, cy=0.42, r=0.62)
    body = [poly(wall, c("barranco", "shadow")), f'<g clip-path="url(#{wid})">', poly(water, f"url(#{gw})")]
    body.append(f'<polygon points="{iv.pts(water)}" fill="none" stroke="{c("agua", "deep")}" stroke-width="3" opacity="0.55"/>')
    front = [(x, y + 1) for x, y in blob_uv(0.80)][5:32]
    body.append(f'<polyline points="{iv.pts(front)}" fill="none" stroke="{c("agua", "light")}" stroke-width="3" '
                f'stroke-linecap="round" opacity="0.8"/>')
    for (u, v, w) in ((-0.2, -0.35, 14), (0.3, 0.05, 10), (-0.35, 0.25, 8)):
        x, y = iso(u, v)
        body.append(f'<path d="M{f2(x - w)},{f2(y)} Q{f2(x)},{f2(y - 3.5)} {f2(x + w)},{f2(y)}" fill="none" '
                    f'stroke="{c("agua", "highlight")}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>')
    for (u, v, s, flower) in ((0.32, -0.3, 1.0, True), (0.5, 0.25, 0.8, False), (-0.45, -0.1, 0.7, False)):
        x, y = iso(u, v)
        rx, ry = 11 * s, 6 * s
        dd = (f"M{f2(x)},{f2(y)} L{f2(x + rx * 0.95)},{f2(y - ry * 0.3)} "
              f"A{f2(rx)},{f2(ry)} 0 1 1 {f2(x + rx * 0.95)},{f2(y + ry * 0.3)} Z")
        body.append(outlined_d(dd, "folhagem", c("folhagem", "base"), 1.4))
        body.append(f'<ellipse cx="{f2(x - rx * 0.3)}" cy="{f2(y - ry * 0.3)}" rx="{f2(rx * 0.45)}" ry="{f2(ry * 0.35)}" '
                    f'fill="{c("folhagem", "light")}" opacity="0.8"/>')
        if flower:
            for k in range(5):
                ang = 2 * math.pi * k / 5 - math.pi / 2
                px_, py_ = x - 2 + 4 * math.cos(ang), y - 4 + 2.6 * math.sin(ang)
                body.append(f'<circle cx="{f2(px_)}" cy="{f2(py_)}" r="3" fill="{c("flor_rosa", "outline")}"/>')
            for k in range(5):
                ang = 2 * math.pi * k / 5 - math.pi / 2
                px_, py_ = x - 2 + 4 * math.cos(ang), y - 4 + 2.6 * math.sin(ang)
                body.append(f'<circle cx="{f2(px_)}" cy="{f2(py_)}" r="2.2" fill="{c("flor_rosa", "light" if k < 2 else "base")}"/>')
            body.append(f'<circle cx="{f2(x - 2)}" cy="{f2(y - 4)}" r="1.6" fill="{c("ouro", "base")}"/>')
    body.append("</g>")
    a.layer("water", "".join(body))
    # juncos atrás (lado do fundo) e pedras na margem
    reeds = []
    for k, (u, v) in enumerate(((-0.62, -0.62), (-0.5, -0.72), (-0.72, -0.48))):
        x, y = iso(u, v)
        for j, (dx, h) in enumerate(((-4, 22), (0, 30), (4, 20))):
            tip = (x + dx * 1.6, y - h + 2 * k)
            dd = f"M{f2(x + dx - 1.6)},{f2(y)} Q{f2(x + dx)},{f2(y - h * 0.5)} {f2(tip[0])},{f2(tip[1])} Q{f2(x + dx + 1.4)},{f2(y - h * 0.5)} {f2(x + dx + 1.6)},{f2(y)} Z"
            reeds.append(outlined_d(dd, "folhagem", c("folhagem", "base" if j != 1 else "light"), 1.2))
        if k < 2:
            x2, y2 = x + 1, y - 26 + 2 * k
            reeds.append(f'<line x1="{f2(x2)}" y1="{f2(y2 + 10)}" x2="{f2(x2)}" y2="{f2(y2 - 4)}" stroke="{c("folhagem", "outline")}" stroke-width="2"/>')
            reeds.append(f'<rect x="{f2(x2 - 3)}" y="{f2(y2 - 1)}" width="6" height="11" rx="3" fill="{c("madeira", "deep")}" '
                         f'stroke="{c("madeira", "outline")}" stroke-width="1.4"/>')
            reeds.append(f'<rect x="{f2(x2 - 1.8)}" y="{f2(y2 + 0.5)}" width="2" height="6" rx="1" fill="{c("madeira", "shadow")}"/>')
    stones = []
    for (t, s) in ((0.55, 1.0), (0.95, 0.75), (1.35, 1.15), (1.75, 0.8), (2.35, 0.9), (2.75, 0.7), (4.2, 0.85), (5.6, 0.9)):
        r = 0.98
        x, y = iso(r * math.cos(t), r * math.sin(t))
        stones.append(stone(d, x, y - 2, 8 * s, 5.2 * s))
    a.layer("reeds", "".join(reeds))
    a.layer("stones", "".join(stones))
    return a


def grass_patch(name: str, tone: str, opacity: float, seed: int) -> Asset:
    """Mancha suave de grama (decalque) para quebrar a repetição da grade."""
    W, H = 208, 104
    a = Asset(name, W, H, (104, 52), footprint=(1.5, 1.5))
    import random
    rng = random.Random(seed)
    out = []
    col = c("grama", tone)
    for _ in range(4):
        u, v = rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)
        x, y = iso(u, v)
        rx, ry = rng.uniform(26, 40), rng.uniform(12, 18)
        g = iv.rad(a.defs, [(0, col, opacity), (0.6, col, opacity * 0.7), (1, col, 0.0)])
        out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="{f2(rx)}" ry="{f2(ry)}" fill="url(#{g})"/>')
    a.layer("patch", "".join(out))
    return a


def flower(defs, x, y, petal_ramp, s=1.0) -> str:
    out = []
    for dx in (-3.5, 3.5):                                   # folhinhas
        dd = (f"M{f2(x)},{f2(y + 4 * s)} Q{f2(x + dx * s)},{f2(y + 1 * s)} {f2(x + dx * 1.6 * s)},{f2(y + 3.5 * s)} "
              f"Q{f2(x + dx * s)},{f2(y + 5.5 * s)} {f2(x)},{f2(y + 4 * s)} Z")
        out.append(outlined_d(dd, "folhagem", c("folhagem", "base"), 1.0))
    out.append(f'<line x1="{f2(x)}" y1="{f2(y + 5 * s)}" x2="{f2(x)}" y2="{f2(y)}" stroke="{c("folhagem", "shadow")}" stroke-width="1.4"/>')
    o = c(petal_ramp, "outline")
    pet = [(x + 2.6 * s * math.cos(2 * math.pi * k / 5 - 1.57), y + 2.2 * s * math.sin(2 * math.pi * k / 5 - 1.57)) for k in range(5)]
    out.append("".join(f'<circle cx="{f2(px)}" cy="{f2(py)}" r="{f2(2.3 * s)}" fill="{o}" stroke="{o}" stroke-width="2"/>' for px, py in pet))
    lt = "light"
    out.append("".join(f'<circle cx="{f2(px)}" cy="{f2(py)}" r="{f2(2.3 * s)}" fill="{c(petal_ramp, lt if k in (0, 4) else "base")}"/>'
                       for k, (px, py) in enumerate(pet)))
    out.append(f'<circle cx="{f2(x)}" cy="{f2(y)}" r="{f2(1.5 * s)}" fill="{c("ouro", "base")}"/>')
    return "".join(out)


def flowers() -> Asset:
    a = Asset("decor_flowers_a", 64, 40, (32, 26), footprint=(0.4, 0.4))
    out = [f'<ellipse cx="0" cy="1" rx="18" ry="6" fill="{c("grama", "shadow")}" opacity="0.5"/>']
    for x, y, r_, s in ((-9, -8, "flor_rosa", 1.0), (8, -10, "tecido_creme", 1.0), (0, -3, "flor_rosa", 1.1), (14, -2, "tecido_amarelo", 0.85)):
        out.append(flower(a.defs, x, y, r_, s))
    a.layer("flowers", "".join(out))
    return a


def pebbles() -> Asset:
    a = Asset("decor_pebbles_a", 48, 28, (24, 16), footprint=(0.3, 0.3))
    out = []
    for x, y, rx, ry in ((-7, -2, 6, 4), (6, -4, 4.5, 3), (3, 3, 3.5, 2.4)):
        out.append(f'<ellipse cx="{x + 1}" cy="{y + 2}" rx="{rx + 1}" ry="{ry}" fill="{c("sombra", "cast")}" opacity="0.18"/>')
        out.append(stone(a.defs, x, y, rx, ry, ow=1.3))
    a.layer("pebbles", "".join(out))
    return a


# =========================================================================== NATUREZA
def canopy_detail(defs, blobs, seed, marks=14, ramp="folhagem") -> str:
    """Volume extra da copa: crescentes de luz no topo-esquerda de cada lobo e marcas de folha."""
    import random
    rng = random.Random(seed)
    cid = iv.clip(defs, "".join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in blobs))
    out = [f'<g clip-path="url(#{cid})">']
    for x, y, r in blobs:
        lid = iv.clip(defs, f'<circle cx="{x}" cy="{y}" r="{r}"/>')
        out.append(f'<g clip-path="url(#{lid})"><circle cx="{f2(x - r * 0.28)}" cy="{f2(y - r * 0.34)}" r="{f2(r * 0.58)}" '
                   f'fill="{c(ramp, "light")}" opacity="0.5"/></g>')
    xs = [b[0] for b in blobs]; ys = [b[1] for b in blobs]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    for k in range(marks):                                    # escamas de folhagem: 2-3 lóbulos ligados
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1 + 8)
        w = rng.uniform(3.2, 4.4)
        nb = 2 + (k % 2)
        upper = y < (y0 + y1) / 2 and x < (x0 + x1) / 2 + 8
        col = c(ramp, "light" if upper else "shadow")
        dd = f"M{f2(x - w * nb)},{f2(y)}"
        for j in range(nb):                                   # lóbulos para CIMA (borda de tufo), não "sorriso"
            xa = x - w * nb + 2 * w * j
            dd += f" Q{f2(xa + w)},{f2(y - w * 1.3)} {f2(xa + 2 * w)},{f2(y)}"
        out.append(f'<path d="{dd}" fill="none" stroke="{col}" stroke-width="1.5" stroke-linecap="round" '
                   f'stroke-linejoin="round" opacity="{0.85 if upper else 0.75}"/>')
    for x, y, r in blobs[:4]:                                 # brilhos pontuais
        out.append(f'<ellipse cx="{f2(x - r * 0.42)}" cy="{f2(y - r * 0.5)}" rx="{f2(r * 0.16)}" ry="{f2(r * 0.1)}" '
                   f'fill="{c(ramp, "highlight")}" opacity="0.9" transform="rotate(-30 {f2(x - r * 0.42)} {f2(y - r * 0.5)})"/>')
    out.append("</g>")
    return "".join(out)


def fruit(defs, x, y, r=5.6, ramp="fruta_vermelha", leaf=True) -> str:
    out = [iv.sphere(defs, ramp, x, y, r, ow=1.6)]
    out.append(f'<ellipse cx="{f2(x - r * 0.38)}" cy="{f2(y - r * 0.4)}" rx="{f2(r * 0.28)}" ry="{f2(r * 0.18)}" '
               f'fill="{c(ramp, "highlight")}" transform="rotate(-35 {f2(x - r * 0.38)} {f2(y - r * 0.4)})"/>')
    if leaf:
        out.append(f'<line x1="{f2(x)}" y1="{f2(y - r + 0.5)}" x2="{f2(x + 0.8)}" y2="{f2(y - r - 2.4)}" '
                   f'stroke="{c("madeira", "outline")}" stroke-width="1.4" stroke-linecap="round"/>')
        dd = (f"M{f2(x + 0.8)},{f2(y - r - 1.6)} Q{f2(x + 3.5)},{f2(y - r - 4.5)} {f2(x + 5.6)},{f2(y - r - 2.4)} "
              f"Q{f2(x + 3.2)},{f2(y - r - 0.4)} {f2(x + 0.8)},{f2(y - r - 1.6)} Z")
        out.append(outlined_d(dd, "folhagem", c("folhagem", "light"), 0.9))
    return "".join(out)


def trunk(defs, h=54, r=11) -> str:
    o = c("madeira", "outline")
    flare = (f"M{-r - 8},2 Q{-r - 1},-1 {-r},-12 L{r},-12 Q{r + 1},-1 {r + 9},2 "
             f"Q{r + 2},6 0,6 Q{-r - 2},6 {-r - 8},2 Z")
    g = iv.lin(defs, [(0, c("madeira", "light")), (0.45, c("madeira", "base")), (1, c("madeira", "shadow"))], 0, 0, 1, 0)
    out = [f'<ellipse cx="3" cy="3" rx="{r + 9}" ry="6" fill="{c("madeira", "deep")}" opacity="0.6"/>',
           iv.outline_path(flare, "madeira"), iv.cylinder(defs, "madeira", r=r, h=h, cap=False),
           f'<path d="{flare}" fill="url(#{g})"/>']
    tid = iv.clip(defs, f'<rect x="{-r}" y="{-h}" width="{2 * r}" height="{h}"/><path d="{flare}"/>')
    lines = []
    for x0, y0, y1 in ((-5, -46, -22), (3, -40, -8), (6, -24, 0), (-3, -16, 2)):
        lines.append(f'<path d="M{x0},{y0} Q{x0 + 2},{(y0 + y1) / 2} {x0},{y1}" fill="none" stroke="{c("madeira", "shadow")}" '
                     f'stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>')
    lines.append(f'<ellipse cx="-2" cy="-30" rx="2.4" ry="3.2" fill="{c("madeira", "deep")}"/>'
                 f'<path d="M-4.4,-31 Q-2,-34.5 0.4,-31" fill="none" stroke="{c("madeira", "light")}" stroke-width="1"/>')
    out.append(f'<g clip-path="url(#{tid})">{"".join(lines)}</g>')
    return "".join(out)


def tree(name: str, blobs, fruits, seed: int) -> tuple[Asset, Asset]:
    W, H = 160, 232
    anchor = (80, H - 44)
    a = Asset(name, W, H, anchor)
    d = a.defs
    a.layer("trunk", trunk(d))
    a.layer("canopy", iv.fluffy(d, "folhagem", blobs))
    a.layer("detail", canopy_detail(d, blobs, seed))
    if fruits:
        a.layer("fruit", "".join(fruit(d, x, y) for x, y in fruits))
    s = Asset(name + "_shadow", W, H, anchor)
    s.layer("shadow", iv.drop_shadow(s.defs, rx=56, ry=24, dx=14, dy=6, opacity=0.3))
    return a, s


OAK_BLOBS = [(-30, -112, 29), (31, -114, 29), (0, -150, 31), (-27, -144, 24), (28, -146, 24),
             (-44, -86, 24), (45, -88, 24), (0, -104, 37), (-24, -72, 25), (25, -70, 25), (0, -64, 23)]
APPLE_BLOBS = [(-34, -104, 30), (34, -106, 30), (-14, -144, 30), (18, -146, 28), (0, -122, 30),
               (-46, -78, 23), (46, -80, 23), (0, -92, 36), (-22, -66, 24), (23, -64, 24)]
APPLES = [(-38, -96), (-12, -128), (20, -112), (40, -86), (-26, -72), (6, -84), (26, -138), (-44, -120)]


def bush(name: str, blobs, flowers_at=None, seed=0) -> tuple[Asset, Asset]:
    W, H = 160, 96
    anchor = (80, 52)
    a = Asset(name, W, H, anchor, footprint=(0.6, 0.6))
    d = a.defs
    a.layer("base", f'<ellipse cx="0" cy="1" rx="28" ry="7" fill="{c("folhagem", "deep")}" opacity="0.5"/>')
    a.layer("body", iv.fluffy(d, "folhagem", blobs))
    a.layer("detail", canopy_detail(d, blobs, seed, marks=7))
    if flowers_at:
        a.layer("flowers", "".join(flower(d, x, y, r_, 1.0) for x, y, r_ in flowers_at))
    s = Asset(name + "_shadow", W, H, anchor, footprint=(0.6, 0.6))
    s.layer("shadow", iv.drop_shadow(s.defs, rx=36, ry=14, dx=9, dy=4, opacity=0.3))
    return a, s


def rock_ore() -> tuple[Asset, Asset]:
    W, H = 160, 100
    anchor = (80, 56)
    a = Asset("rock_ore_gold_a", W, H, anchor, footprint=(0.7, 0.6))
    d = a.defs
    sil = [(-36, -2), (-40, -20), (-27, -40), (-4, -50), (19, -46), (35, -31), (38, -9), (22, 5), (-14, 7)]
    dsil = iv.rounded_d(sil, [7] * len(sil))
    small = [(-46, 2), (-48, -9), (-38, -15), (-27, -10), (-26, 2), (-34, 7)]
    dsmall = iv.rounded_d(small, [4] * len(small))
    top = [(-27, -40), (-4, -50), (19, -46), (27, -36), (6, -29), (-17, -31)]
    right = [(27, -36), (35, -31), (38, -9), (22, 5), (12, -6), (8, -26), (6, -29)]
    o = c("pedra", "outline")
    out = [iv.outline_path(dsil, "pedra"), f'<path d="{dsil}" fill="{c("pedra", "base")}"/>']
    sid = iv.clip(d, f'<path d="{dsil}"/>')
    gt = iv.lin(d, [(0, c("pedra", "highlight")), (1, c("pedra", "light"))], 0, 0, 1, 1)
    gr = iv.lin(d, [(0, c("pedra", "shadow")), (1, c("pedra", "deep"))], 0, 0, 0, 1)
    out.append(f'<g clip-path="url(#{sid})">'
               f'<path d="{iv.rounded_d(top, [5] * len(top))}" fill="url(#{gt})"/>'
               f'<path d="{iv.rounded_d(right, [4] * len(right))}" fill="url(#{gr})"/>'
               f'<ellipse cx="0" cy="8" rx="44" ry="9" fill="{c("pedra", "deep")}" opacity="0.55"/>'
               f'<path d="M-20,-24 L-12,-16 L-14,-6" fill="none" stroke="{c("pedra", "deep")}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
               f'<path d="M14,-20 L20,-12" fill="none" stroke="{c("pedra", "outline")}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>'
               f'<path d="M-24,-38 Q-10,-46 6,-46" fill="none" stroke="{c("pedra", "highlight")}" stroke-width="1.6" stroke-linecap="round"/>'
               '</g>')
    out.append(iv.outline_path(dsmall, "pedra") + f'<path d="{dsmall}" fill="{c("pedra", "light")}"/>'
               f'<path d="M-44,-6 Q-39,-13 -31,-12" fill="none" stroke="{c("pedra", "highlight")}" stroke-width="1.4" stroke-linecap="round"/>'
               f'<path d="M-30,-6 L-28,4 L-36,6" fill="none" stroke="{c("pedra", "shadow")}" stroke-width="1.2" opacity="0.8"/>')
    ore = []
    for x, y, r in ((-25, -22, 5.5), (-6, -35, 5.0), (-9, -14, 6.2), (12, -36, 4.2), (21, -18, 4.5)):
        pts_ = [(x + r * math.cos(t) * (1.0 + 0.18 * math.sin(3 * t)), y + r * 0.85 * math.sin(t)) for t in
                [2 * math.pi * k / 7 for k in range(7)]]
        dn = iv.rounded_d(pts_, [1.6] * 7)
        ore.append(f'<path d="{dn}" fill="{c("ouro", "outline")}" stroke="{c("ouro", "outline")}" stroke-width="3" stroke-linejoin="round"/>')
        g = iv.rad(d, [(0, c("ouro", "highlight")), (0.4, c("ouro", "light")), (0.85, c("ouro", "base")), (1, c("ouro", "shadow"))],
                   cx=0.5, cy=0.5, r=0.6, fx=0.3, fy=0.3)
        ore.append(f'<path d="{dn}" fill="url(#{g})"/>')
    sx, sy = -12, -40
    ore.append(f'<path d="M{sx},{sy - 7} Q{sx + 1},{sy - 1} {sx + 7},{sy} Q{sx + 1},{sy + 1} {sx},{sy + 7} '
               f'Q{sx - 1},{sy + 1} {sx - 7},{sy} Q{sx - 1},{sy - 1} {sx},{sy - 7} Z" fill="{c("ouro", "highlight")}"/>')
    a.layer("body", "".join(out))
    a.layer("ore", "".join(ore))
    s = Asset("rock_ore_gold_a_shadow", W, H, anchor, footprint=(0.7, 0.6))
    s.layer("shadow", iv.drop_shadow(s.defs, rx=48, ry=17, dx=10, dy=5, opacity=0.3))
    return a, s


# =========================================================================== CANTEIRO E CULTURA
def raised_bed() -> tuple[Asset, Asset]:
    W, H = 160, 96
    anchor = (80, 52)
    a = Asset("plot_raised_bed", W, H, anchor)
    d = a.defs
    S, S2 = 0.86, 0.70
    a.layer("frame", iv.iso_box(d, "madeira", sx=S, sy=S, h=BED_H))
    det = []
    A, B, C, D = iv.footprint(0, 0, S, S, 0)
    for z in (8,):                                            # junta entre as duas tábuas
        p0, p1, p2 = iso(-S / 2, S / 2, z), iso(S / 2, S / 2, z), iso(S / 2, -S / 2, z)
        det.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("madeira", "shadow")}" stroke-width="1.2"/>'
                   f'<line x1="{f2(p1[0])}" y1="{f2(p1[1])}" x2="{f2(p2[0])}" y2="{f2(p2[1])}" stroke="{c("madeira", "deep")}" stroke-width="1.2"/>')
    for (u, v) in ((-S / 2, S / 2), (S / 2, -S / 2)):          # pregos
        for du in (0.06,):
            pu, pv = (u + du, v) if v > 0 else (u, v + du)
            for z in (4, 12):
                x, y = iso(pu, pv, z)
                det.append(f'<circle cx="{f2(x)}" cy="{f2(y)}" r="1.1" fill="{c("madeira", "outline")}" opacity="0.8"/>')
    a.layer("planks", "".join(det))
    inner_rim = iv.footprint(0, 0, S2, S2, BED_H)
    soil = iv.footprint(0, 0, S2, S2, SOIL_Z)
    rid = iv.clip(d, f'<polygon points="{iv.pts(inner_rim)}"/>')
    soil_d = [poly(inner_rim, c("madeira", "deep")), f'<g clip-path="url(#{rid})">', poly(soil, c("canteiro", "base"))]
    sid = iv.clip(d, f'<polygon points="{iv.pts(soil)}"/>')
    soil_d.append(f'<g clip-path="url(#{sid})">')
    for v in (-0.17, 0.17):                                   # 2 camalhões ao longo de x
        band = [iso(-0.4, v - 0.08, SOIL_Z), iso(0.4, v - 0.08, SOIL_Z), iso(0.4, v + 0.08, SOIL_Z), iso(-0.4, v + 0.08, SOIL_Z)]
        soil_d.append(poly(band, c("canteiro", "light")))
        for vv, tone, w in ((v - 0.065, "highlight", 1.3), (v + 0.1, "deep", 2.2)):
            p0, p1 = iso(-0.4, vv, SOIL_Z), iso(0.4, vv, SOIL_Z)
            soil_d.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" '
                          f'stroke="{c("canteiro", tone)}" stroke-width="{w}" stroke-linecap="round" opacity="0.9"/>')
    for u, v, r in iv.scatter(77, 6, 0.3):
        x, y = iso(u, v, SOIL_Z)
        soil_d.append(f'<ellipse cx="{f2(x)}" cy="{f2(y)}" rx="1.4" ry="0.9" fill="{c("canteiro", "deep")}"/>')
    soil_d.append("</g></g>")
    D2, C2, B2 = iso(-S2 / 2, S2 / 2, BED_H), iso(S2 / 2, S2 / 2, BED_H), iso(S2 / 2, -S2 / 2, BED_H)
    soil_d.append(f'<polyline points="{iv.pts([D2, C2, B2])}" fill="none" stroke="{c("madeira", "outline")}" stroke-width="1" opacity="0.6"/>')
    a.layer("soil", "".join(soil_d))
    s = Asset("plot_raised_bed_shadow", W, H, anchor)
    s.layer("shadow", iv.drop_shadow(s.defs, rx=54, ry=22, dx=8, dy=4, opacity=0.26))
    return a, s


CROP_POS = sorted([(-0.17, -0.17), (0.17, -0.17), (-0.17, 0.17), (0.17, 0.17)], key=lambda p: (p[0] + p[1], p[0]))


def crop_stage(stage: int) -> Asset:
    W, H = 128, 112
    a = Asset(f"crop_tomato_s{stage}", W, H, (64, 72))
    d = a.defs
    out = []
    for k, (u, v) in enumerate(CROP_POS):
        x, y = iso(u, v, SOIL_Z)
        out.append(f'<ellipse cx="{f2(x)}" cy="{f2(y + 0.5)}" rx="{6 + 2 * stage}" ry="{2.4 + 0.6 * stage}" fill="{c("canteiro", "deep")}" opacity="0.7"/>')
        if stage == 1:                                        # broto: caule + 2 folhas
            out.append(f'<line x1="{f2(x)}" y1="{f2(y)}" x2="{f2(x)}" y2="{f2(y - 8)}" stroke="{c("folhagem", "outline")}" stroke-width="3.6" stroke-linecap="round"/>'
                       f'<line x1="{f2(x)}" y1="{f2(y)}" x2="{f2(x)}" y2="{f2(y - 8)}" stroke="{c("folhagem", "base")}" stroke-width="1.6" stroke-linecap="round"/>')
            for sgn in (-1, 1):
                cx_, cy_ = x + sgn * 4.6, y - 9.5
                ang = -28 * sgn
                out.append(f'<ellipse cx="{f2(cx_)}" cy="{f2(cy_)}" rx="5.4" ry="3.1" fill="{c("folhagem", "outline")}" '
                           f'stroke="{c("folhagem", "outline")}" stroke-width="3" transform="rotate({ang} {f2(cx_)} {f2(cy_)})"/>')
            for sgn in (-1, 1):
                cx_, cy_ = x + sgn * 4.6, y - 9.5
                ang = -28 * sgn
                g = iv.lin(d, [(0, c("folhagem", "highlight")), (1, c("folhagem", "light"))], 0, 0, 0, 1)
                out.append(f'<ellipse cx="{f2(cx_)}" cy="{f2(cy_)}" rx="5.4" ry="3.1" fill="url(#{g})" '
                           f'transform="rotate({ang} {f2(cx_)} {f2(cy_)})"/>')
        elif stage == 2:                                      # médio: moita baixa com flores
            blobs = [(x - 6.5, y - 7, 7), (x + 6.5, y - 7, 7), (x, y - 14, 8), (x + 1, y - 21, 5.5)]
            out.append(iv.fluffy(d, "folhagem", blobs))
            for fx, fy in ((x - 3, y - 16), (x + 5, y - 10), (x - 6, y - 7)):
                out.append(f'<circle cx="{f2(fx)}" cy="{f2(fy)}" r="2.6" fill="{c("tecido_amarelo", "outline")}"/>'
                           f'<circle cx="{f2(fx)}" cy="{f2(fy)}" r="1.7" fill="{c("tecido_amarelo", "light")}"/>')
        else:                                                 # maduro: estaca + moita + 3 tomates
            sx_, sy_ = x + 3, y - 2
            out.append(f'<line x1="{f2(sx_)}" y1="{f2(sy_)}" x2="{f2(sx_)}" y2="{f2(sy_ - 36)}" stroke="{c("madeira", "outline")}" stroke-width="4.6" stroke-linecap="round"/>'
                       f'<line x1="{f2(sx_)}" y1="{f2(sy_)}" x2="{f2(sx_)}" y2="{f2(sy_ - 36)}" stroke="{c("madeira", "light")}" stroke-width="2.2" stroke-linecap="round"/>')
            blobs = [(x - 8, y - 10, 8.5), (x + 8, y - 10, 8.5), (x, y - 20, 9.5), (x - 4, y - 28, 6.5), (x + 5, y - 27, 6.5)]
            out.append(iv.fluffy(d, "folhagem", blobs))
            out.append(canopy_detail(d, blobs, 500 + k, marks=3))
            for fx, fy, fr in ((x - 6, y - 8, 5.0), (x + 6, y - 12, 4.6), (x - 1, y - 20, 4.4)):
                out.append(fruit(d, fx, fy, fr, leaf=False))
                for ang in (-40, 0, 40):                      # sépalas
                    rr = math.radians(ang - 90)
                    out.append(f'<line x1="{f2(fx)}" y1="{f2(fy - fr + 0.8)}" x2="{f2(fx + 2.6 * math.cos(rr))}" '
                               f'y2="{f2(fy - fr + 0.8 + 2.6 * math.sin(rr) + 1.2)}" stroke="{c("folhagem", "shadow")}" stroke-width="1.4" stroke-linecap="round"/>')
    a.layer("plants", "".join(out))
    return a


# =========================================================================== PROPS
def hay_roll() -> tuple[Asset, Asset]:
    """Fardo de feno em ROLO (cilindro deitado no eixo y): espiral na face clara, amarras e palha
    saindo da silhueta — resolve a leitura de "caixote amarelo" do teste técnico."""
    W, H = 160, 112
    anchor = (80, 68)
    a = Asset("prop_hay_roll", W, H, anchor, footprint=(0.7, 0.55))
    d = a.defs
    R, L = 22.0, 0.46
    av, bv = iv.vdisc_axes("y", R)
    cb, cf = iso(0, -L / 2, R), iso(0, L / 2, R)
    eb, ef = iv.ellipse_pts(cb, av, bv, 72), iv.ellipse_pts(cf, av, bv, 72)
    body = iv.hull(eb + ef)
    o = c("feno", "outline")
    wisps_back = []
    for (t, ln, ang) in ((1.9, 7, -120), (2.3, 6, -150), (1.3, 6, -70)):        # palha saindo do topo
        px_, py_ = cb[0] + av[0] * math.cos(t) + bv[0] * math.sin(t), cb[1] + av[1] * math.cos(t) + bv[1] * math.sin(t)
        rr = math.radians(ang)
        wisps_back.append(f'<line x1="{f2(px_)}" y1="{f2(py_)}" x2="{f2(px_ + ln * math.cos(rr))}" y2="{f2(py_ + ln * math.sin(rr))}" '
                          f'stroke="{o}" stroke-width="3.4" stroke-linecap="round"/>'
                          f'<line x1="{f2(px_)}" y1="{f2(py_)}" x2="{f2(px_ + ln * math.cos(rr))}" y2="{f2(py_ + ln * math.sin(rr))}" '
                          f'stroke="{c("feno", "light")}" stroke-width="1.5" stroke-linecap="round"/>')
    a.layer("wisps_back", "".join(wisps_back))
    ys = [p[1] for p in body]
    g_body = iv.lin(d, [(0, c("feno", "light")), (0.5, c("feno", "base")), (1, c("feno", "shadow"))],
                    0, min(ys), 0, max(ys), user=True)
    a.layer("outline", poly(body, o, f'stroke="{o}" stroke-width="4" stroke-linejoin="round"'))
    bid = iv.clip(d, f'<polygon points="{iv.pts(body)}"/>')
    tex = [poly(body, f"url(#{g_body})"), f'<g clip-path="url(#{bid})">']
    for t in [math.radians(x) for x in (-30, -5, 20, 45, 70, 95, 120)]:            # palha ao longo do eixo
        p0 = (cb[0] + av[0] * math.cos(t) + bv[0] * math.sin(t), cb[1] + av[1] * math.cos(t) + bv[1] * math.sin(t))
        p1 = (cf[0] + av[0] * math.cos(t) + bv[0] * math.sin(t), cf[1] + av[1] * math.cos(t) + bv[1] * math.sin(t))
        col = c("feno", "highlight") if 40 < math.degrees(t) < 100 else c("feno", "shadow")
        tex.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{col}" '
                   f'stroke-width="1.3" stroke-linecap="round" opacity="0.75"/>')
    for vv in (-L / 4, L / 6):                                                     # amarras (meia volta visível)
        cc = iso(0, vv, R)
        ring = iv.ellipse_pts(cc, av, bv, 30, math.radians(-50), math.radians(140))
        tex.append(f'<polyline points="{iv.pts(ring)}" fill="none" stroke="{c("madeira", "shadow")}" stroke-width="2.4" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>'
                   f'<polyline points="{iv.pts(ring)}" fill="none" stroke="{c("madeira", "light")}" stroke-width="0.9" '
                   f'stroke-linecap="round" opacity="0.8"/>')
    tex.append("</g>")
    a.layer("body", "".join(tex))
    g_disc = iv.rad(d, [(0, c("feno", "highlight")), (0.5, c("feno", "light")), (1, c("feno", "base"))],
                    cx=0.5, cy=0.5, r=0.6, fx=0.35, fy=0.3)
    disc = [poly(ef, f"url(#{g_disc})")]
    spiral = []
    turns = 3.2
    for k in range(160):
        t = turns * 2 * math.pi * k / 159
        s = 0.92 * (1 - k / 159) + 0.06
        spiral.append((cf[0] + s * (av[0] * math.cos(t) + bv[0] * math.sin(t)), cf[1] + s * (av[1] * math.cos(t) + bv[1] * math.sin(t))))
    disc.append(f'<polyline points="{iv.pts(spiral)}" fill="none" stroke="{c("feno", "shadow")}" stroke-width="1.7" '
                f'stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>')
    disc.append(f'<polygon points="{iv.pts(ef)}" fill="none" stroke="{c("feno", "shadow")}" stroke-width="1.6"/>')
    hl = iv.ellipse_pts(cf, (av[0] * 0.8, av[1] * 0.8), (bv[0] * 0.8, bv[1] * 0.8), 16, math.radians(110), math.radians(170))
    disc.append(f'<polyline points="{iv.pts(hl)}" fill="none" stroke="{c("feno", "highlight")}" stroke-width="2" stroke-linecap="round"/>')
    a.layer("disc", "".join(disc))
    wisps = []
    for (t, ln, ang) in ((3.6, 6, 200), (4.3, 5, 230), (0.4, 5, 10)):             # palha na borda do disco
        px_, py_ = cf[0] + av[0] * math.cos(t) + bv[0] * math.sin(t), cf[1] + av[1] * math.cos(t) + bv[1] * math.sin(t)
        rr = math.radians(ang)
        wisps.append(f'<line x1="{f2(px_)}" y1="{f2(py_)}" x2="{f2(px_ + ln * math.cos(rr))}" y2="{f2(py_ + ln * math.sin(rr))}" '
                     f'stroke="{c("feno", "shadow")}" stroke-width="1.6" stroke-linecap="round"/>')
    a.layer("wisps", "".join(wisps))
    s = Asset("prop_hay_roll_shadow", W, H, anchor, footprint=(0.7, 0.55))
    s.layer("shadow", iv.drop_shadow(s.defs, cx=0, cy=0, rx=42, ry=17, dx=10, dy=5, opacity=0.32))
    return a, s


def crate() -> tuple[Asset, Asset]:
    W, H = 160, 104
    anchor = (80, 60)
    a = Asset("prop_crate", W, H, anchor, footprint=(0.45, 0.45))
    d = a.defs
    S, h = 0.44, 32
    a.layer("body", iv.iso_box(d, "madeira", sx=S, sy=S, h=h))
    det = []
    q = S / 2
    fl = lambda pts_, fill, extra="": poly(pts_, fill, extra)  # noqa: E731
    m = 0.055
    # moldura da face esquerda (+y) e da face direita (+x): tábuas mais claras/escuras nas bordas
    for face, light, dark in (("y", "light", "shadow"), ("x", "base", "deep")):
        P = (lambda t, z: iso(t, q, z)) if face == "y" else (lambda t, z: iso(q, t, z))
        t0, t1 = (-q, q) if face == "y" else (q, -q)
        for (a0, a1) in ((t0, t0 + (m if face == "y" else -m)), (t1 - (m if face == "y" else -m), t1)):
            det.append(fl([P(a0, 2), P(a1, 2), P(a1, h - 2), P(a0, h - 2)], c("madeira", light)))
        for z in (11, 21):
            p0, p1 = P(t0, z), P(t1, z)
            det.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("madeira", dark)}" stroke-width="1.2"/>')
        b0, b1 = P(t0 + (m if face == "y" else -m), 4), P(t1 - (m if face == "y" else -m), h - 4)
        det.append(f'<line x1="{f2(b0[0])}" y1="{f2(b0[1])}" x2="{f2(b1[0])}" y2="{f2(b1[1])}" stroke="{c("madeira", "outline")}" stroke-width="5" stroke-linecap="round"/>'
                   f'<line x1="{f2(b0[0])}" y1="{f2(b0[1])}" x2="{f2(b1[0])}" y2="{f2(b1[1])}" stroke="{c("madeira", light)}" stroke-width="2.6" stroke-linecap="round"/>')
        for (tt, z) in ((t0 + (m / 2 if face == "y" else -m / 2), 6), (t1 - (m / 2 if face == "y" else -m / 2), h - 6)):
            x, y = P(tt, z)
            det.append(f'<circle cx="{f2(x)}" cy="{f2(y)}" r="1.1" fill="{c("madeira", "outline")}"/>')
    for v in (-0.07, 0.07):                                   # tábuas do tampo
        p0, p1 = iso(-q, v, h), iso(q, v, h)
        det.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("madeira", "base")}" stroke-width="1.2"/>')
    a.layer("detail", "".join(det))
    s = Asset("prop_crate_shadow", W, H, anchor, footprint=(0.45, 0.45))
    s.layer("shadow", iv.drop_shadow(s.defs, rx=34, ry=15, dx=10, dy=5, opacity=0.32))
    return a, s


FENCE_PIECES = {"x": XP | XN, "y": YP | YN, "corner_n": XP | YP, "corner_e": XN | YP,
                "corner_w": XP | YN, "corner_s": XN | YN, "end_xn": XN, "end_xp": XP}


def rail(mask_dir: int, z: float, th: float = 6, half: float = 0.05) -> str:
    """Trilho de cerca do centro do tile até além da borda (cortado depois): cores chapadas,
    para continuar sem costura no trilho do vizinho."""
    E = 0.62
    if mask_dir in (XP, XN):
        s = 1 if mask_dir == XP else -1
        u0, u1 = 0.0, s * E
        top = [iso(u0, -half, z + th), iso(u1, -half, z + th), iso(u1, half, z + th), iso(u0, half, z + th)]
        side = [iso(u0, half, z + th), iso(u1, half, z + th), iso(u1, half, z), iso(u0, half, z)]
        side_col = c("madeira", "base")
        line_a, line_b = iso(u0, half, z + th), iso(u1, half, z + th)
    else:
        s = 1 if mask_dir == YP else -1
        v0, v1 = 0.0, s * E
        top = [iso(-half, v0, z + th), iso(-half, v1, z + th), iso(half, v1, z + th), iso(half, v0, z + th)]
        side = [iso(half, v0, z + th), iso(half, v1, z + th), iso(half, v1, z), iso(half, v0, z)]
        side_col = c("madeira", "shadow")
        line_a, line_b = iso(half, v0, z + th), iso(half, v1, z + th)
    o = c("madeira", "outline")
    sil = iv.hull(top + side)
    return (poly(sil, o, f'stroke="{o}" stroke-width="4" stroke-linejoin="round"') + poly(side, side_col) +
            poly(top, c("madeira", "light")) +
            f'<line x1="{f2(line_a[0])}" y1="{f2(line_a[1])}" x2="{f2(line_b[0])}" y2="{f2(line_b[1])}" '
            f'stroke="{c("madeira", "highlight")}" stroke-width="1" opacity="0.9"/>')


def fence(key: str) -> tuple[Asset, Asset]:
    mask = FENCE_PIECES[key]
    W, H = 160, 100
    anchor = (80, 56)
    a = Asset(f"prop_fence_{key}", W, H, anchor, footprint=(1, 1))
    d = a.defs
    right = iv.clip(d, f'<rect x="0" y="{-anchor[1]}" width="33" height="{H}"/>')
    left = iv.clip(d, f'<rect x="-33" y="{-anchor[1]}" width="33" height="{H}"/>')
    clip_of = {XP: right, YN: right, XN: left, YP: left}
    back = [b for b in (XN, YN) if mask & b]
    front = [b for b in (XP, YP) if mask & b]

    def rails(dirs):
        return "".join(f'<g clip-path="url(#{clip_of[b]})">{rail(b, 11)}{rail(b, 25)}</g>' for b in dirs)
    a.layer("rails_back", rails(back))
    post = iv.iso_box(d, "madeira", sx=0.1, sy=0.1, h=38)
    cap_c = iso(0, 0, 38)
    post += (f'<ellipse cx="{f2(cap_c[0])}" cy="{f2(cap_c[1])}" rx="5.2" ry="2.6" fill="{c("madeira", "highlight")}" opacity="0.5"/>')
    a.layer("post", post)
    a.layer("rails_front", rails(front))
    s = Asset(f"prop_fence_{key}_shadow", W, H, anchor, footprint=(1, 1))
    sh = [iv.drop_shadow(s.defs, rx=10, ry=5, dx=6, dy=3, opacity=0.3)]
    col = c("sombra", "cast")
    for b in front + back:
        u1, v1 = {XP: (0.6, 0), XN: (-0.6, 0), YP: (0, 0.6), YN: (0, -0.6)}[b]
        band = [iso(0, 0), iso(u1, v1)]
        rx0 = 0 if b in (XP, YN) else -33
        cl = iv.clip(s.defs, f'<rect x="{rx0}" y="-56" width="33" height="100"/>')
        sh.append(f'<g clip-path="url(#{cl})">'
                  f'<line x1="{f2(band[0][0] + 9)}" y1="{f2(band[0][1] + 4)}" x2="{f2(band[1][0] + 9)}" y2="{f2(band[1][1] + 4)}" '
                  f'stroke="{col}" stroke-width="5" stroke-linecap="butt" opacity="0.16"/></g>')
    s.layer("shadow", "".join(sh))
    return a, s


# =========================================================================== CONSTRUÇÃO
def barn() -> tuple[Asset, Asset]:
    """Celeiro pequeno 3x3: parede vermelha com tábuas, frisos creme, portão de madeira com X
    na empena da frente (lado claro), telhado de 2 águas com telhas e cupulinha."""
    W, H = 416, 308
    anchor = (208, 200)
    a = Asset("bld_barn_small", W, H, anchor, footprint=(3, 3))
    d = a.defs
    X1, Y1 = 1.0, 1.15                  # meia-pegada do corpo (tiles)
    HW_, RISE = 60, 68
    ZT = HW_ + RISE
    OX_, OY_ = 0.13, 0.13              # beiral
    ZE = HW_ - RISE * OX_ / X1          # altura do beiral na ponta
    ow = iv.OUTLINE["building"]
    ro = c("telhado_vermelho", "outline")

    gable = [iso(-X1, Y1, 0), iso(X1, Y1, 0), iso(X1, Y1, HW_), iso(0, Y1, ZT), iso(-X1, Y1, HW_)]
    rwall = [iso(X1, -Y1, 0), iso(X1, Y1, 0), iso(X1, Y1, HW_), iso(X1, -Y1, HW_)]
    Rb, Rf = iso(0, -Y1 - OY_, ZT), iso(0, Y1 + OY_, ZT)
    Ef, Eb = iso(X1 + OX_, Y1 + OY_, ZE), iso(X1 + OX_, -Y1 - OY_, ZE)
    El = iso(-X1 - OX_, Y1 + OY_, ZE)
    roof = [Rb, Rf, Ef, Eb]
    BT = 8                               # espessura do friso da empena (px)
    barge_r = [Rf, Ef, (Ef[0], Ef[1] + BT), (Rf[0], Rf[1] + BT)]
    barge_l = [Rf, El, (El[0], El[1] + BT), (Rf[0], Rf[1] + BT)]
    fascia = [Ef, Eb, (Eb[0], Eb[1] + 5), (Ef[0], Ef[1] + 5)]
    # cupulinha no meio da cumeeira
    cu = 0.16
    cup_l = [iso(-cu, cu, ZT - 10), iso(cu, cu, ZT - 10), iso(cu, cu, ZT + 14), iso(-cu, cu, ZT + 14)]
    cup_r = [iso(cu, -cu, ZT - 10), iso(cu, cu, ZT - 10), iso(cu, cu, ZT + 14), iso(cu, -cu, ZT + 14)]
    ap = iso(0, 0, ZT + 34)
    co = cu + 0.06
    cr_l = [iso(-co, co, ZT + 14), iso(co, co, ZT + 14), ap]
    cr_r = [iso(co, -co, ZT + 14), iso(co, co, ZT + 14), ap]
    sil_parts = [gable, rwall, roof, barge_r, barge_l, fascia, cup_l, cup_r, cr_l, cr_r]
    a.layer("outline", "".join(poly(p, ro, f'stroke="{ro}" stroke-width="{2 * ow}" stroke-linejoin="round"') for p in sil_parts))

    def vgrad(t_top, t_bot, ramp="telhado_vermelho"):
        return iv.lin(d, [(0, c(ramp, t_top)), (1, c(ramp, t_bot))], 0, 0, 0, 1)

    walls = [poly(gable, f"url(#{vgrad('light', 'base')})"), poly(rwall, f"url(#{vgrad('shadow', 'deep')})")]
    gid, rid = iv.clip(d, f'<polygon points="{iv.pts(gable)}"/>'), iv.clip(d, f'<polygon points="{iv.pts(rwall)}"/>')
    pl = [f'<g clip-path="url(#{gid})">']
    for k in range(-9, 10):                                   # tábuas verticais
        u = k * 0.1
        p0, p1 = iso(u, Y1, 0), iso(u, Y1, ZT)
        pl.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("telhado_vermelho", "shadow")}" '
                  f'stroke-width="1" opacity="0.75"/>')
    pl.append("</g>")
    pl.append(f'<g clip-path="url(#{rid})">')
    for k in range(-11, 12):
        v = k * 0.1
        p0, p1 = iso(X1, v, 0), iso(X1, v, HW_)
        pl.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("telhado_vermelho", "deep")}" '
                  f'stroke-width="1" opacity="0.8"/>')
    # sombra do beiral na parede direita
    pl.append(poly([iso(X1, -Y1, HW_), iso(X1, Y1, HW_), iso(X1, Y1, HW_ - 12), iso(X1, -Y1, HW_ - 12)],
                   c("telhado_vermelho", "outline"), 'opacity="0.35"'))
    pl.append("</g>")
    # embasamento de pedra
    plinth = [poly([iso(-X1, Y1, 0), iso(X1, Y1, 0), iso(X1, Y1, 9), iso(-X1, Y1, 9)], c("pedra", "base")),
              poly([iso(X1, -Y1, 0), iso(X1, Y1, 0), iso(X1, Y1, 9), iso(X1, -Y1, 9)], c("pedra", "shadow"))]
    for k in range(-4, 5):
        p0, p1 = iso(k * 0.22 + 0.11, Y1, 0), iso(k * 0.22 + 0.11, Y1, 9)
        plinth.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("pedra", "deep")}" stroke-width="1"/>')
    for k in range(-5, 6):
        p0, p1 = iso(X1, k * 0.22, 0), iso(X1, k * 0.22, 9)
        plinth.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("pedra", "deep")}" stroke-width="1"/>')
    for pts_ in ([iso(-X1, Y1, 9), iso(X1, Y1, 9)], [iso(X1, Y1, 9), iso(X1, -Y1, 9)]):
        plinth.append(f'<polyline points="{iv.pts(pts_)}" fill="none" stroke="{c("pedra", "outline")}" stroke-width="1.4"/>')
    # frisos creme nas quinas
    trims = []
    cr = lambda t: c("tecido_creme", t)  # noqa: E731
    tw = 0.075
    trims.append(poly([iso(-X1, Y1, 9), iso(-X1 + tw, Y1, 9), iso(-X1 + tw, Y1, HW_), iso(-X1, Y1, HW_)], cr("base")))
    trims.append(poly([iso(X1 - tw, Y1, 9), iso(X1, Y1, 9), iso(X1, Y1, HW_), iso(X1 - tw, Y1, HW_)], cr("light")))
    trims.append(poly([iso(X1, Y1 - tw, 9), iso(X1, Y1, 9), iso(X1, Y1, HW_), iso(X1, Y1 - tw, HW_)], cr("shadow")))
    trims.append(poly([iso(X1, -Y1, 9), iso(X1, -Y1 + tw, 9), iso(X1, -Y1 + tw, HW_), iso(X1, -Y1, HW_)], cr("shadow")))
    p0, p1 = iso(X1, Y1, 9), iso(X1, Y1, HW_)
    trims.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{cr("outline")}" stroke-width="1"/>')
    # portão na empena (face clara): moldura creme, 2 folhas de madeira com X, maçaneta
    DU, DZ = 0.34, 94
    door = [poly([iso(-DU - 0.06, Y1, 9), iso(DU + 0.06, Y1, 9), iso(DU + 0.06, Y1, DZ + 5), iso(-DU - 0.06, Y1, DZ + 5)], cr("base")),
            poly([iso(-DU, Y1, 9), iso(DU, Y1, 9), iso(DU, Y1, DZ), iso(-DU, Y1, DZ)], c("madeira", "base"))]
    did = iv.clip(d, f'<polygon points="{iv.pts([iso(-DU, Y1, 9), iso(DU, Y1, 9), iso(DU, Y1, DZ), iso(-DU, Y1, DZ)])}"/>')
    door.append(f'<g clip-path="url(#{did})">')
    door.append(poly([iso(-DU, Y1, DZ), iso(DU, Y1, DZ), iso(DU, Y1, DZ - 14), iso(-DU, Y1, DZ - 14)], c("madeira", "deep"), 'opacity="0.45"'))
    for k in range(-3, 4):
        u = k * 0.1
        p0, p1 = iso(u, Y1, 9), iso(u, Y1, DZ)
        door.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("madeira", "shadow")}" stroke-width="1.1"/>')
    for (u0, u1) in ((-DU, 0), (0, DU)):
        for (pa, pb) in (((u0, 13), (u1, DZ - 4)), ((u0, DZ - 4), (u1, 13))):
            q0, q1 = iso(pa[0], Y1, pa[1]), iso(pb[0], Y1, pb[1])
            door.append(f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" stroke="{cr("outline")}" stroke-width="5.6" stroke-linecap="round"/>'
                        f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" stroke="{cr("base")}" stroke-width="3.4" stroke-linecap="round"/>')
        for zz in (13, DZ - 4):
            q0, q1 = iso(u0, Y1, zz), iso(u1, Y1, zz)
            door.append(f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" stroke="{cr("base")}" stroke-width="4"/>')
    door.append("</g>")
    q0, q1 = iso(0, Y1, 9), iso(0, Y1, DZ)
    door.append(f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" stroke="{c("madeira", "outline")}" stroke-width="1.8"/>')
    for u in (-0.05, 0.05):
        hx, hy = iso(u, Y1, 48)
        door.append(f'<circle cx="{f2(hx)}" cy="{f2(hy)}" r="2.2" fill="{c("ouro", "outline")}"/><circle cx="{f2(hx - 0.4)}" cy="{f2(hy - 0.4)}" r="1.3" fill="{c("ouro", "light")}"/>')
    # janelas da parede direita (sombra) com floreira
    win = []
    for vc in (-0.55, 0.45):
        v0, v1, z0, z1 = vc - 0.2, vc + 0.2, 26, 50
        win.append(poly([iso(X1, v0 - 0.05, z0 - 4), iso(X1, v1 + 0.05, z0 - 4), iso(X1, v1 + 0.05, z1 + 4), iso(X1, v0 - 0.05, z1 + 4)], cr("shadow")))
        win.append(poly([iso(X1, v0, z0), iso(X1, v1, z0), iso(X1, v1, z1), iso(X1, v0, z1)], c("agua", "shadow")))
        win.append(poly([iso(X1, v0, z1), iso(X1, v0 + 0.14, z1), iso(X1, v0, z1 - 12)], c("agua", "light"), 'opacity="0.8"'))
        for (pa, pb) in (((vc, z0), (vc, z1)), ((v0, (z0 + z1) / 2), (v1, (z0 + z1) / 2))):
            q0, q1 = iso(X1, pa[0], pa[1]), iso(X1, pb[0], pb[1])
            win.append(f'<line x1="{f2(q0[0])}" y1="{f2(q0[1])}" x2="{f2(q1[0])}" y2="{f2(q1[1])}" stroke="{cr("shadow")}" stroke-width="2.2"/>')
        win.append(f'<polygon points="{iv.pts([iso(X1, v0 - 0.05, z0 - 4), iso(X1, v1 + 0.05, z0 - 4), iso(X1, v1 + 0.05, z1 + 4), iso(X1, v0 - 0.05, z1 + 4)])}" '
                   f'fill="none" stroke="{cr("outline")}" stroke-width="1.2"/>')
    vc = 0.45
    box = iv.iso_box(d, "madeira", cx=X1 + 0.06, cy=vc, sx=0.12, sy=0.5, h=8, z0=17, ow=1.5, rim=False)
    win.append(box)
    for k, vv in enumerate((vc - 0.17, vc - 0.05, vc + 0.07, vc + 0.18)):
        fx, fy = iso(X1 + 0.08, vv, 28)
        win.append(f'<circle cx="{f2(fx)}" cy="{f2(fy)}" r="4.6" fill="{c("folhagem", "outline")}"/><circle cx="{f2(fx)}" cy="{f2(fy)}" r="3.4" fill="{c("folhagem", "base")}"/>')
        col = ("flor_rosa", "tecido_creme", "flor_rosa", "tecido_amarelo")[k]
        win.append(f'<circle cx="{f2(fx + 1)}" cy="{f2(fy - 2)}" r="2.6" fill="{c(col, "outline")}"/><circle cx="{f2(fx + 1)}" cy="{f2(fy - 2)}" r="1.8" fill="{c(col, "light")}"/>')
    # telhado: água +x, telhas em escamas, frisos creme (empena e beiral), cumeeira
    groof = iv.lin(d, [(0, c("telhado_vermelho", "light")), (1, c("telhado_vermelho", "base"))], 0, 0, 1, 1)
    rf = [poly(roof, f"url(#{groof})")]
    rfid = iv.clip(d, f'<polygon points="{iv.pts(roof)}"/>')
    rf.append(f'<g clip-path="url(#{rfid})">')
    rows = 6
    for r_ in range(1, rows + 1):
        s = r_ / rows
        xx = s * (X1 + OX_)
        zz = ZT - (ZT - ZE) * s
        ptsr = []
        nseg = 16
        for k in range(nseg + 1):
            ptsr.append(iso(xx, -Y1 - OY_ - 0.05 + (2 * (Y1 + OY_) + 0.1) * k / nseg, zz))
        dd = f"M{f2(ptsr[0][0])},{f2(ptsr[0][1])}"
        for k in range(1, len(ptsr)):
            p0, p1 = ptsr[k - 1], ptsr[k]
            mx, my = (p0[0] + p1[0]) / 2 + 2.2, (p0[1] + p1[1]) / 2 + 4.2
            dd += f" Q{f2(mx)},{f2(my)} {f2(p1[0])},{f2(p1[1])}"
        rf.append(f'<path d="{dd}" fill="none" stroke="{c("telhado_vermelho", "shadow")}" stroke-width="1.6" stroke-linejoin="round"/>')
        hl = [(x - 1.2, y - 1.6) for x, y in ptsr]
        rf.append(f'<polyline points="{iv.pts(hl)}" fill="none" stroke="{c("telhado_vermelho", "highlight")}" stroke-width="1" opacity="0.45"/>')
    rf.append("</g>")
    rf.append(poly(fascia, cr("shadow")))
    rf.append(f'<line x1="{f2(Ef[0])}" y1="{f2(Ef[1])}" x2="{f2(Eb[0])}" y2="{f2(Eb[1])}" stroke="{cr("light")}" stroke-width="1.2"/>')
    # sombra do friso sobre a empena
    gsh = iv.clip(d, f'<polygon points="{iv.pts(gable)}"/>')
    rf.append(f'<g clip-path="url(#{gsh})">'
              f'{poly([Rf, El, (El[0], El[1] + BT + 9), (Rf[0], Rf[1] + BT + 9)], c("telhado_vermelho", "deep"), "opacity=\"0.4\"")}'
              f'{poly([Rf, Ef, (Ef[0], Ef[1] + BT + 9), (Rf[0], Rf[1] + BT + 9)], c("telhado_vermelho", "deep"), "opacity=\"0.4\"")}</g>')
    rf.append(poly(barge_l, cr("base")) + poly(barge_r, cr("light")))
    rf.append(f'<polyline points="{iv.pts([El, Rf, Ef])}" fill="none" stroke="{cr("light")}" stroke-width="1.4" stroke-linejoin="round"/>')
    rf.append(f'<line x1="{f2(Rb[0])}" y1="{f2(Rb[1])}" x2="{f2(Rf[0])}" y2="{f2(Rf[1])}" stroke="{c("telhado_vermelho", "deep")}" stroke-width="5" stroke-linecap="round"/>'
              f'<line x1="{f2(Rb[0])}" y1="{f2(Rb[1] - 1.6)}" x2="{f2(Rf[0])}" y2="{f2(Rf[1] - 1.6)}" stroke="{c("telhado_vermelho", "highlight")}" stroke-width="1.2" stroke-linecap="round"/>')
    # cupulinha
    cup = [poly(cup_l, cr("base")), poly(cup_r, cr("shadow"))]
    for k in (-1, 0, 1):
        p0, p1 = iso(k * 0.07, cu, ZT - 4), iso(k * 0.07, cu, ZT + 10)
        cup.append(f'<line x1="{f2(p0[0])}" y1="{f2(p0[1])}" x2="{f2(p1[0])}" y2="{f2(p1[1])}" stroke="{c("madeira", "shadow")}" stroke-width="1.6"/>')
    cup.append(poly(cr_l, c("telhado_vermelho", "light")) + poly(cr_r, c("telhado_vermelho", "shadow")))
    cup.append(f'<line x1="{f2(ap[0])}" y1="{f2(ap[1])}" x2="{f2(ap[0])}" y2="{f2(ap[1] - 7)}" stroke="{c("ouro", "outline")}" stroke-width="2.4" stroke-linecap="round"/>'
               f'<circle cx="{f2(ap[0])}" cy="{f2(ap[1] - 8)}" r="2.4" fill="{c("ouro", "base")}" stroke="{c("ouro", "outline")}" stroke-width="1.2"/>')
    # degrau de madeira na porta
    step = iv.iso_box(d, "madeira", cx=0, cy=Y1 + 0.1, sx=0.82, sy=0.2, h=4, ow=1.5, rim=True)
    a.layer("walls", "".join(walls))
    a.layer("planks", "".join(pl))
    a.layer("plinth", "".join(plinth))
    a.layer("trims", "".join(trims))
    a.layer("door", "".join(door))
    a.layer("windows", "".join(win))
    a.layer("roof", "".join(rf))
    a.layer("cupola", "".join(cup))
    a.layer("step", step)
    s = Asset("bld_barn_small_shadow", W, H, anchor, footprint=(3, 3))
    col = c("sombra", "cast")
    g = iv.rad(s.defs, [(0, col, 0.34), (0.7, col, 0.28), (1, col, 0.0)])
    sp = [iso(-X1 - 0.1, -Y1 - 0.1), iso(X1 + 0.45, -Y1 - 0.1), iso(X1 + 0.45, Y1 + 0.3), iso(-X1 - 0.1, Y1 + 0.3)]
    s.layer("shadow", poly([(x + 14, y + 6) for x, y in sp], f"url(#{g})"))
    return a, s


# =========================================================================== PERSONAGEM
def avatar() -> tuple[Asset, Asset]:
    """Avatar base parado, virado para a câmera (_se, 3/4 para baixo-direita). ~92 px."""
    W, H = 80, 112
    anchor = (40, 100)
    a = Asset("avatar_base_idle_se", W, H, anchor, footprint=(0.3, 0.3))
    d = a.defs
    out = []

    def part(shape_d, ramp, fill, ow=2.0, extra=""):
        return outlined_d(shape_d, ramp, fill, ow, extra)

    def rr(x, y, w, h, r):
        return (f"M{x + r},{y} H{x + w - r} Q{x + w},{y} {x + w},{y + r} V{y + h - r} Q{x + w},{y + h} {x + w - r},{y + h} "
                f"H{x + r} Q{x},{y + h} {x},{y + h - r} V{y + r} Q{x},{y} {x + r},{y} Z")

    g_blue = iv.lin(d, [(0, c("tecido_azul", "light")), (0.45, c("tecido_azul", "base")), (1, c("tecido_azul", "shadow"))], 0, 0, 1, 0)
    g_red = iv.lin(d, [(0, c("tecido_vermelho", "light")), (0.45, c("tecido_vermelho", "base")), (1, c("tecido_vermelho", "shadow"))], 0, 0, 1, 0)
    # pernas (jardineira) e botas
    out.append(part(rr(-11, -25, 10, 20, 4), "tecido_azul", c("tecido_azul", "base")))
    out.append(part(rr(1, -25, 10, 20, 4), "tecido_azul", c("tecido_azul", "shadow")))
    for bx, tone in ((-6, "shadow"), (7, "deep")):
        bd = f"M{bx - 7},-3 Q{bx - 7},-10 {bx - 1},-10 L{bx + 2},-10 Q{bx + 8},-10 {bx + 8},-3 Q{bx + 8},1 {bx + 1},1 L{bx - 3},1 Q{bx - 7},1 {bx - 7},-3 Z"
        out.append(part(bd, "madeira", c("madeira", tone)))
        out.append(f'<path d="M{bx - 4},-7 Q{bx - 1},-9 {bx + 3},-8" fill="none" stroke="{c("madeira", "light")}" stroke-width="1.3" stroke-linecap="round"/>')
    # tronco: camisa xadrez
    shirt = rr(-14, -51, 28, 30, 9)
    out.append(part(shirt, "tecido_vermelho", f"url(#{g_red})"))
    sid = iv.clip(d, f'<path d="{shirt}"/>')
    plaid = [f'<g clip-path="url(#{sid})">']
    for x in (-9, -3, 3, 9):
        plaid.append(f'<line x1="{x}" y1="-52" x2="{x}" y2="-20" stroke="{c("tecido_vermelho", "shadow")}" stroke-width="2.2" opacity="0.85"/>')
    for y in (-46, -39, -32):
        plaid.append(f'<line x1="-15" y1="{y}" x2="15" y2="{y}" stroke="{c("tecido_vermelho", "shadow")}" stroke-width="2.2" opacity="0.85"/>')
    for x in (-6, 6):
        plaid.append(f'<line x1="{x}" y1="-52" x2="{x}" y2="-20" stroke="{c("tecido_creme", "light")}" stroke-width="0.9" opacity="0.55"/>')
    plaid.append(f'<line x1="-15" y1="-42.5" x2="15" y2="-42.5" stroke="{c("tecido_creme", "light")}" stroke-width="0.9" opacity="0.55"/>')
    plaid.append("</g>")
    out.append("".join(plaid))
    # gola
    out.append(part("M-7,-51 L0,-46 L7,-51 L4,-53 L0,-50 L-4,-53 Z", "tecido_vermelho", c("tecido_vermelho", "light"), 1.2))
    # jardineira: cós + peitilho + alças + botões + bolso
    over = ("M-14,-31 H14 V-24 Q14,-18 8,-18 H-8 Q-14,-18 -14,-24 Z")
    bib = rr(-8.5, -44, 17, 15, 3)
    out.append(part(over, "tecido_azul", f"url(#{g_blue})"))
    out.append(part(bib, "tecido_azul", f"url(#{g_blue})"))
    for sx_ in (-1, 1):
        out.append(f'<line x1="{sx_ * 7}" y1="-43" x2="{sx_ * 11.5}" y2="-50.5" stroke="{c("tecido_azul", "outline")}" stroke-width="5" stroke-linecap="round"/>'
                   f'<line x1="{sx_ * 7}" y1="-43" x2="{sx_ * 11.5}" y2="-50.5" stroke="{c("tecido_azul", "base" if sx_ < 0 else "shadow")}" stroke-width="3" stroke-linecap="round"/>')
    out.append(f'<rect x="-4.5" y="-39" width="9" height="6" rx="1.5" fill="none" stroke="{c("tecido_azul", "shadow")}" stroke-width="1.2"/>')
    for bx in (-6, 6):
        out.append(f'<circle cx="{bx}" cy="-41.5" r="2.1" fill="{c("ouro", "outline")}"/><circle cx="{bx - 0.4}" cy="-41.9" r="1.3" fill="{c("ouro", "light")}"/>')
    out.append(f'<line x1="0" y1="-29" x2="0" y2="-19" stroke="{c("tecido_azul", "shadow")}" stroke-width="1.1"/>')
    # braços (mangas xadrez) e mãos
    for sx_, tone in ((-1, "base"), (1, "shadow")):
        x0, y0, x1, y1 = sx_ * 13.5, -46, sx_ * 17.5, -31
        out.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{c("tecido_vermelho", "outline")}" stroke-width="13" stroke-linecap="round"/>')
        out.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{c("tecido_vermelho", tone)}" stroke-width="9" stroke-linecap="round"/>')
        out.append(f'<line x1="{x0 + sx_ * 0.4 - 3.6}" y1="{y0 + 5}" x2="{x0 + sx_ * 0.4 + 3.6}" y2="{y0 + 5.6}" stroke="{c("tecido_vermelho", "shadow" if sx_ < 0 else "deep" if False else "outline")}" stroke-width="1.6" opacity="0.6"/>')
        out.append(part(f"M{x1 - 4.6},{y1 + 2} A4.6,4.6 0 1 0 {x1 + 4.6},{y1 + 2} A4.6,4.6 0 1 0 {x1 - 4.6},{y1 + 2} Z",
                        "pele_clara", c("pele_clara", "base" if sx_ < 0 else "shadow")))
    # cabeça
    hx, hy, hr = 1, -64, 17
    g_skin = iv.rad(d, [(0, c("pele_clara", "light")), (0.6, c("pele_clara", "base")), (1, c("pele_clara", "shadow"))],
                    cx=0.5, cy=0.5, r=0.6, fx=0.36, fy=0.32)
    for ex in (-15.5, 17.5):
        out.append(part(f"M{ex - 4},-61 A4,4.6 0 1 0 {ex + 4},-61 A4,4.6 0 1 0 {ex - 4},-61 Z", "pele_clara", c("pele_clara", "base" if ex < 0 else "shadow")))
    head = f"M{hx - hr},{hy} A{hr},{hr} 0 1 0 {hx + hr},{hy} A{hr},{hr} 0 1 0 {hx - hr},{hy} Z"
    out.append(part(head, "pele_clara", f"url(#{g_skin})"))
    hid = iv.clip(d, f'<path d="{head}"/>')
    # cabelo (castanho) saindo do chapéu
    hair = (f"M{hx - 17},-64 Q{hx - 18},-80 {hx},-81 Q{hx + 18},-80 {hx + 17},-64 Q{hx + 14},-70 {hx + 9},-70 "
            f"Q{hx + 6},-66 {hx + 2},-69 Q{hx - 2},-65 {hx - 6},-69 Q{hx - 11},-66 {hx - 13},-70 Q{hx - 16},-68 {hx - 17},-64 Z")
    out.append(part(hair, "madeira", c("madeira", "deep")))
    out.append(f'<path d="M{hx - 10},-74 Q{hx - 4},-78 {hx + 4},-76" fill="none" stroke="{c("madeira", "shadow")}" stroke-width="1.6" stroke-linecap="round"/>')
    out.append(f'<g clip-path="url(#{hid})"><ellipse cx="{hx}" cy="-68.5" rx="17" ry="3.4" fill="{c("pele_clara", "shadow")}" opacity="0.0"/></g>')
    # rosto (3/4 para a direita)
    ink = c("tinta", "ink")
    for ex in (-3.5, 8.5):
        out.append(f'<ellipse cx="{ex}" cy="-60" rx="2.5" ry="3.4" fill="{ink}"/>'
                   f'<circle cx="{ex + 0.8}" cy="-61.4" r="1.0" fill="{c("tecido_creme", "light")}"/>')
    for bx in (-8.5, 13.5):
        out.append(f'<ellipse cx="{bx}" cy="-54.5" rx="3.3" ry="2" fill="{c("fruta_vermelha", "light")}" opacity="0.55"/>')
    out.append(f'<path d="M1,-53.6 Q3.8,-50.8 6.8,-53.6" fill="none" stroke="{ink}" stroke-width="1.5" stroke-linecap="round"/>')
    out.append(f'<path d="M2.6,-57.6 Q3.6,-56.4 4.8,-57.4" fill="none" stroke="{c("pele_clara", "outline")}" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>')
    # chapéu de palha: aba + copa + fita vermelha + trama
    brim = f"M{hx - 27},-74 A27,8.5 0 1 0 {hx + 27},-74 A27,8.5 0 1 0 {hx - 27},-74 Z"
    g_hat = iv.lin(d, [(0, c("feno", "light")), (0.55, c("feno", "base")), (1, c("feno", "shadow"))], 0, 0, 1, 1)
    out.append(part(brim, "feno", f"url(#{g_hat})"))
    out.append(f'<path d="M{hx - 22},-71 Q{hx},-63 {hx + 22},-71" fill="none" stroke="{c("feno", "shadow")}" stroke-width="1.4" opacity="0.8"/>')
    bid = iv.clip(d, f'<path d="{brim}"/>')
    weave = [f'<g clip-path="url(#{bid})">']
    for k in range(14):
        t = 2 * math.pi * k / 14
        x0, y0 = hx + 15 * math.cos(t), -74 + 4.6 * math.sin(t)
        x1, y1 = hx + 26 * math.cos(t), -74 + 8.2 * math.sin(t)
        weave.append(f'<line x1="{f2(x0)}" y1="{f2(y0)}" x2="{f2(x1)}" y2="{f2(y1)}" stroke="{c("feno", "shadow")}" stroke-width="0.9" opacity="0.6"/>')
    weave.append("</g>")
    out.append("".join(weave))
    crown = f"M{hx - 13},-75 Q{hx - 14},-90 {hx},-90 Q{hx + 14},-90 {hx + 13},-75 Q{hx},-71 {hx - 13},-75 Z"
    out.append(part(crown, "feno", f"url(#{g_hat})"))
    cid = iv.clip(d, f'<path d="{crown}"/>')
    out.append(f'<g clip-path="url(#{cid})"><rect x="{hx - 15}" y="-81" width="30" height="6" fill="{c("tecido_vermelho", "base")}"/>'
               f'<rect x="{hx - 15}" y="-81" width="30" height="1.4" fill="{c("tecido_vermelho", "light")}"/>'
               f'<path d="M{hx - 12},-85 Q{hx},-87 {hx + 12},-85" fill="none" stroke="{c("feno", "shadow")}" stroke-width="0.9" opacity="0.6"/>'
               f'<ellipse cx="{hx - 5}" cy="-86.5" rx="4.5" ry="1.8" fill="{c("feno", "highlight")}" opacity="0.9"/></g>')
    a.layer("body", "".join(out))
    s = Asset("avatar_base_idle_se_shadow", W, H, anchor, footprint=(0.3, 0.3))
    s.layer("shadow", iv.drop_shadow(s.defs, rx=19, ry=8, dx=5, dy=3, opacity=0.32))
    return a, s


# =========================================================================== UI
def ready_indicator() -> Asset:
    """Balão "pronto para colher": círculo creme com tomate, rabicho apontando para o canteiro."""
    W, H = 48, 60
    a = Asset("ui_indicator_ready", W, H, (24, 56), footprint=(0, 0))
    d = a.defs
    cy, r = -31, 18
    shape = (f"M-6,-14.6 Q-4,-6 0,-1 Q4,-6 6,-14.6 A{r},{r} 0 1 0 -6,-14.6 Z")
    bord = c("ui", "panel_border")
    out = [f'<path d="{shape}" fill="{bord}" stroke="{bord}" stroke-width="5" stroke-linejoin="round"/>',
           f'<path d="{shape}" fill="{c("ui", "panel")}"/>',
           f'<path d="M-12,-40 A13,13 0 0 1 4,-45" fill="none" stroke="{c("tecido_creme", "light")}" stroke-width="2.4" stroke-linecap="round"/>',
           f'<ellipse cx="0" cy="-20" rx="11" ry="3" fill="{c("ui", "panel_shadow")}"/>']
    out.append(fruit(d, 0, cy + 2, 9.5, leaf=False))
    for ang in (-60, -20, 20, 60):
        rr_ = math.radians(ang - 90)
        out.append(f'<path d="M0,{cy - 6} L{f2(5.5 * math.cos(rr_))},{f2(cy - 6 + 4 * math.sin(rr_) + 1)}" stroke="{c("folhagem", "outline")}" '
                   f'stroke-width="3.6" stroke-linecap="round"/>')
    for ang in (-60, -20, 20, 60):
        rr_ = math.radians(ang - 90)
        out.append(f'<path d="M0,{cy - 6} L{f2(5.5 * math.cos(rr_))},{f2(cy - 6 + 4 * math.sin(rr_) + 1)}" stroke="{c("folhagem", "light")}" '
                   f'stroke-width="1.8" stroke-linecap="round"/>')
    sx, sy = 13, -44
    out.append(f'<path d="M{sx},{sy - 5} Q{sx + 0.8},{sy - 0.8} {sx + 5},{sy} Q{sx + 0.8},{sy + 0.8} {sx},{sy + 5} '
               f'Q{sx - 0.8},{sy + 0.8} {sx - 5},{sy} Q{sx - 0.8},{sy - 0.8} {sx},{sy - 5} Z" fill="{c("ouro", "base")}" '
               f'stroke="{c("ouro", "outline")}" stroke-width="1"/>')
    a.layer("badge", "".join(out))
    return a


# =========================================================================== REGISTRO DAS PEÇAS
PATH_MASKS = list(range(16))
EDGE_MASKS = [XP, YP, XN, YN, XP | YP, XN | YN, XN | YP, XP | YN]


def build_assets() -> dict[str, tuple[Asset, str]]:
    items: list[tuple[Asset, str]] = []
    add = lambda fam, *assets: items.extend((x, fam) for x in assets)  # noqa: E731
    add("ground", ground_tile("ground_grass_a", "a", 11), ground_tile("ground_grass_b", "b", 23),
        ground_tile("ground_grass_c", "c", 37), water_tile("a", 301, 2), water_tile("b", 433, 1))
    add("ground", *[path_tile(m) for m in PATH_MASKS], path_tile(XP | XN, "_b"), path_tile(YP | YN, "_b"))
    add("ground", *[edge_tile(m, "abc"[k % 3]) for k, m in enumerate(EDGE_MASKS)],
        edge_tile(XP, "b", "b", "_b"), edge_tile(YP, "c", "b", "_b"), edge_tile(XP, "c", "c", "_c"), edge_tile(YP, "a", "c", "_c"))
    add("ground", pond(), grass_patch("decor_grass_patch_a", "light", 0.42, 5), grass_patch("decor_grass_patch_b", "shadow", 0.30, 9),
        flowers(), pebbles())
    add("nature", *tree("tree_oak_a", OAK_BLOBS, [], 41), *tree("tree_apple_a", APPLE_BLOBS, APPLES, 43))
    add("nature", *bush("prop_bush_a", [(-17, -18, 15), (17, -19, 15), (0, -31, 18), (-8, -13, 14), (9, -12, 14)], seed=61))
    add("nature", *bush("prop_bush_flower_a", [(-19, -16, 14), (15, -20, 16), (-4, -30, 17), (-6, -11, 13), (11, -11, 13)],
                        [(-14, -26, "flor_rosa"), (6, -36, "tecido_creme"), (18, -22, "flor_rosa"), (-2, -16, "tecido_creme"), (-22, -12, "tecido_creme")], seed=67))
    add("nature", *rock_ore())
    add("crops", *raised_bed(), crop_stage(1), crop_stage(2), crop_stage(3))
    add("props", *hay_roll(), *crate())
    for k in FENCE_PIECES:
        add("props", *fence(k))
    add("buildings", *barn())
    add("characters", *avatar())
    add("ui", ready_indicator())
    return {a.name: (a, fam) for a, fam in items}


def exp_dir(fam: str) -> Path:
    return iv.ART / "export" / FAM[fam]


def src_dir(fam: str) -> Path:
    return iv.ART / "source" / FAM[fam]


# =========================================================================== CENA 10x8
NX, NY = 10, 8
PATH = [(1, 3), (1, 4)] + [(i, 4) for i in range(2, 9)]
PATHSET = set(PATH)
BARN = ("bld_barn_small", 1, 1, (2, 2))
BEDS = {(5, 1): 1, (6, 1): 2, (5, 2): 3, (6, 2): 0}
FENCE_AT = {(4, 0): "corner_n", (5, 0): "x", (6, 0): "x", (7, 0): "corner_e", (4, 1): "y", (4, 2): "y",
            (7, 1): "y", (7, 2): "y", (4, 3): "corner_w", (5, 3): "end_xn", (6, 3): "end_xp", (7, 3): "corner_s"}
PROPS = [("tree_apple_a", 8, 1), ("tree_oak_a", 0, 5), ("prop_bush_a", 9, 3), ("prop_bush_flower_a", 4, 6),
         ("prop_bush_a", 7, 7), ("prop_hay_roll", 3, 2), ("prop_crate", 3, 1), ("rock_ore_gold_a", 8, 6),
         ("avatar_base_idle_se", 3, 4)]
DECOR = [("ground_pond_2x2", 2.5, 5.5), ("decor_grass_patch_a", 6.4, 6.2), ("decor_grass_patch_b", 8.3, 2.6),
         ("decor_grass_patch_a", 0.6, 1.0), ("decor_grass_patch_b", 5.5, 6.9), ("decor_grass_patch_a", 9.0, 5.0),
         ("decor_flowers_a", 5.6, 5.4), ("decor_flowers_a", 9.1, 6.4), ("decor_flowers_a", 0.4, 6.8), ("decor_flowers_a", 3.3, 0.3),
         ("decor_pebbles_a", 7.3, 5.4), ("decor_pebbles_a", 1.6, 6.9), ("decor_pebbles_a", 8.6, 3.4)]
OVERLAY = [("ui_indicator_ready", 5, 2, -62)]
BOARD_W, BOARD_H, OX, OY = 1280, 800, 576, 176
GROUND_VARIANTS = ["ground_grass_a", "ground_grass_b", "ground_grass_c"]


def path_mask(i, j) -> int:
    m = 0
    for b, (di, dj) in ((XP, (1, 0)), (YP, (0, 1)), (XN, (-1, 0)), (YN, (0, -1))):
        if (i + di, j + dj) in PATHSET:
            m |= b
    if (i, j) == (1, 3):
        m |= YN                                    # entra por baixo do celeiro (porta)
    return m


def grass_variant(i, j) -> str:
    h = int(hashlib.md5(f"{i},{j}".encode()).hexdigest(), 16)
    return GROUND_VARIANTS[h % 3]


def hsh(i, j, k=0) -> int:
    return int(hashlib.md5(f"{i},{j},{k}".encode()).hexdigest(), 16)


def ground_at(i, j) -> str:
    if (i, j) in PATHSET:
        m = path_mask(i, j)
        return f"ground_path_dirt_{tag(m)}" + ("_b" if m in (XP | XN, YP | YN) and hsh(i, j, 1) % 2 else "")
    m = (XP if i == NX - 1 else 0) | (YP if j == NY - 1 else 0) | (XN if i == 0 else 0) | (YN if j == 0 else 0)
    if m:
        return f"ground_edge_grass_{tag(m)}" + (["", "_b", "_c"][hsh(i, j, 2) % 3] if m in (XP, YP) else "")
    return grass_variant(i, j)


_FAM_OF: dict[str, str] = {}
_CACHE: dict = {}


def load(name: str, zoom: float, src: int | None = None):
    src = src or (1 if zoom <= 1 else 2)
    key = (name, zoom, src)
    if key in _CACHE:
        return _CACHE[key]
    fam = _FAM_OF[name]
    meta = json.loads((exp_dir(fam) / f"{name}.json").read_text())
    im = Image.open(exp_dir(fam) / f"{name}@{src}x.png").convert("RGBA")
    f = zoom / src
    if abs(f - 1) > 1e-9:
        im = im.resize((round(im.width * f), round(im.height * f)), Image.BOX)
    ax, ay = meta["anchor_px_1x"]
    _CACHE[key] = (im, (ax * zoom, ay * zoom))
    return _CACHE[key]


def screen(i, j, z):
    return (OX * z + (i - j) * 64 * z, OY * z + (i + j) * 32 * z)


def place(canvas, im, anchor, at):
    canvas.alpha_composite(im, (round(at[0] - anchor[0]), round(at[1] - anchor[1])))


def scene_objects():
    """(nome, i, j, chave de profundidade) — profundidade = x + y do canto frontal da pegada."""
    objs = [(BARN[0], BARN[1], BARN[2], (BARN[3][0] + BARN[3][1], BARN[3][0], 0))]
    for (i, j), st in BEDS.items():
        objs.append(("plot_raised_bed", i, j, (i + j, i, 0)))
        if st:
            objs.append((f"crop_tomato_s{st}", i, j, (i + j, i, 1)))
    for (i, j), k in FENCE_AT.items():
        objs.append((f"prop_fence_{k}", i, j, (i + j, i, 0)))
    for n, i, j in PROPS:
        objs.append((n, i, j, (i + j, i, 0)))
    return sorted(objs, key=lambda o: o[3])


def compose(zoom: float, src: int | None = None, layers=("water", "ground", "decor", "shadows", "objects", "overlay"),
            bg=None, size=None) -> Image.Image:
    W, H = size or (round(BOARD_W * zoom), round(BOARD_H * zoom))
    cv = Image.new("RGBA", (W, H), bg if bg is not None else tuple(int(c("agua", "base")[k:k + 2], 16) for k in (1, 3, 5)) + (255,))
    if "water" in layers:
        for s in range(-12, NX + NY + 10):
            for i in range(-8, NX + 8):
                j = s - i
                if -8 <= j < NY + 8 and not (0 <= i < NX and 0 <= j < NY):
                    im, an = load("ground_water_" + "ab"[hsh(i, j, 3) % 2], zoom, src)
                    x, y = screen(i, j, zoom)
                    place(cv, im, an, (x, y + CLIFF_H * zoom))
    if "ground" in layers:
        for s in range(NX + NY - 1):
            for i in range(NX):
                j = s - i
                if 0 <= j < NY:
                    im, an = load(ground_at(i, j), zoom, src)
                    place(cv, im, an, screen(i, j, zoom))
    if "decor" in layers:
        for n, i, j in DECOR:
            im, an = load(n, zoom, src)
            place(cv, im, an, screen(i, j, zoom))
    objs = scene_objects()
    if "shadows" in layers:
        for n, i, j, _ in objs:
            if (n + "_shadow") in _FAM_OF:
                im, an = load(n + "_shadow", zoom, src)
                place(cv, im, an, screen(i, j, zoom))
    if "objects" in layers:
        for n, i, j, _ in objs:
            im, an = load(n, zoom, src)
            place(cv, im, an, screen(i, j, zoom))
    if "overlay" in layers:
        for n, i, j, dz in OVERLAY:
            im, an = load(n, zoom, src)
            x, y = screen(i, j, zoom)
            place(cv, im, an, (x, y + dz * zoom))
    return cv


# =========================================================================== QA
def seam_test(zoom: float) -> dict:
    """Pixels não opacos no topo da ilha (só chão, sem fundo): tem de ser 0."""
    cv = compose(zoom, layers=("ground",), bg=(0, 0, 0, 0))
    mask = Image.new("L", cv.size, 0)
    inset = 4 * zoom
    t = screen(0, 0, zoom); r = screen(NX - 1, 0, zoom); b = screen(NX - 1, NY - 1, zoom); lft = screen(0, NY - 1, zoom)
    poly_ = [(t[0], t[1] - 32 * zoom + inset), (r[0] + 64 * zoom - 2 * inset, r[1]),
             (b[0], b[1] + 32 * zoom - inset), (lft[0] - 64 * zoom + 2 * inset, lft[1])]
    ImageDraw.Draw(mask).polygon(poly_, fill=255)
    al, m = cv.getchannel("A").tobytes(), mask.tobytes()
    inside = sum(1 for mv in m if mv)
    holes = sum(1 for av, mv in zip(al, m) if mv and av < 255)
    return {"zoom": zoom, "pixels_checked": inside, "non_opaque_pixels": holes, "pass": holes == 0}


def repeat_test(name: str) -> dict:
    """3x3 do mesmo tile a 1x: interior 100% opaco."""
    im, an = load(name, 1)
    cv = Image.new("RGBA", (3 * 128 + 64, 3 * 64 + 64 + CLIFF_H), (0, 0, 0, 0))
    ox, oy = cv.width / 2, 64
    for i in range(3):
        for j in range(3):
            place(cv, im, an, (ox + (i - j) * 64, oy + (i + j) * 32))
    mask = Image.new("L", cv.size, 0)
    ImageDraw.Draw(mask).polygon([(ox, oy - 32 + 4), (ox + 192 - 8, oy + 64), (ox, oy + 160 - 4), (ox - 192 + 8, oy + 64)], fill=255)
    al, m = cv.getchannel("A").tobytes(), mask.tobytes()
    holes = sum(1 for av, mv in zip(al, m) if mv and av < 255)
    return {"tile": name, "non_opaque_pixels": holes, "pass": holes == 0}


HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b")


def palette_test(assets) -> dict:
    pal = {t["hex"].lower() for r in iv.palette()["ramps"].values() for t in r["tones"]}
    bad = {}
    for name, (a, fam) in assets.items():
        found = {h.lower() for h in HEX_RE.findall(a.svg())}
        off = sorted(found - pal)
        if off:
            bad[name] = off
    return {"off_palette": bad, "pass": not bad}


def contract_test(assets) -> dict:
    errs = []
    for name, (a, fam) in assets.items():
        ax, ay = a.anchor
        if a.width % 4 or a.height % 4:
            errs.append(f"{name}: canvas não múltiplo de 4")
        if ax != a.width / 2:
            errs.append(f"{name}: âncora x != W/2")
        if ax % 2 or ay % 2:
            errs.append(f"{name}: âncora ímpar (fica fracionária a zoom 0,5)")
        if name.startswith(("ground_", "decor_grass_patch")):
            continue
        for s in iv.SCALES:                                   # nada encostando na borda do canvas
            im = Image.open(exp_dir(fam) / f"{name}@{s}x.png").getchannel("A")
            w, h = im.size
            edge = max(max(im.crop((0, 0, w, 1)).getdata()), max(im.crop((0, h - 1, w, h)).getdata()),
                       max(im.crop((0, 0, 1, h)).getdata()), max(im.crop((w - 1, 0, w, h)).getdata()))
            if edge > 0:
                errs.append(f"{name}@{s}x: conteúdo encosta na borda do canvas (alfa {edge})")
    return {"errors": errs, "pass": not errs}


def asset_report(assets) -> list[dict]:
    groups: dict[str, list[str]] = {}
    for name, (a, fam) in assets.items():
        for s in iv.SCALES:
            groups.setdefault(f"{a.width * s}x{a.height * s}", []).append(str(exp_dir(fam) / f"{name}@{s}x.png"))
    res = []
    for size, files in sorted(groups.items()):
        r = subprocess.run([sys.executable, str(REPORT), *files, "--expect-size", size, "--require-alpha", "--json"],
                           capture_output=True, text=True)
        res.append({"size": size, "files": len(files), "exit": r.returncode,
                    "stderr": r.stderr.strip()[:400] if r.returncode else ""})
    return res


# =========================================================================== PRANCHAS
def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


SHEET_BG = (236, 240, 232, 255)
CELL_BG = (250, 251, 247, 255)
INK = (52, 44, 60, 255)


def piece_image(name: str, scale: int = 1, with_shadow=True, under: str | None = None) -> tuple[Image.Image, tuple]:
    im, an = load(name, scale, scale)
    base = Image.new("RGBA", im.size, (0, 0, 0, 0))
    if under:
        u, uan = load(under, scale, scale)
        tmp = Image.new("RGBA", (max(im.width, u.width), max(im.height, u.height)), (0, 0, 0, 0))
        base = tmp
    if with_shadow and (name + "_shadow") in _FAM_OF:
        sh, _ = load(name + "_shadow", scale, scale)
        base.alpha_composite(sh, (0, 0))
    if under:
        u, uan = load(under, scale, scale)
        if (under + "_shadow") in _FAM_OF:
            sh, _ = load(under + "_shadow", scale, scale)
            base.alpha_composite(sh, (round(an[0] - uan[0]), round(an[1] - uan[1])))
        base.alpha_composite(u, (round(an[0] - uan[0]), round(an[1] - uan[1])))
    base.alpha_composite(im, (0, 0))
    return base, an


def build_sheet() -> Image.Image:
    sections = [
        ("Chão — grama (3 variantes), água, manchas e decoração solta", [
            ("ground_grass_a", None), ("ground_grass_b", None), ("ground_grass_c", None), ("ground_water_a", None), ("ground_water_b", None),
            ("decor_grass_patch_a", None), ("decor_grass_patch_b", None), ("decor_flowers_a", None), ("decor_pebbles_a", None)]),
        ("Caminho de terra — autotile de 16 (máscara de vizinhos +x, +y, -x, -y)", [(f"ground_path_dirt_{tag(m)}", None) for m in PATH_MASKS]
         + [("ground_path_dirt_xpxn_b", None), ("ground_path_dirt_ypyn_b", None)]),
        ("Borda da ilha — barranco na frente (+x, +y) e filete de luz no fundo (-x, -y)", [(f"ground_edge_grass_{tag(m)}", None) for m in EDGE_MASKS]
         + [(f"ground_edge_grass_{t}", None) for t in ("xp_b", "xp_c", "yp_b", "yp_c")] + [("ground_pond_2x2", None)]),
        ("Canteiro elevado e tomate (broto, médio, maduro) + indicador de colheita", [
            ("plot_raised_bed", None), ("crop_tomato_s1", "plot_raised_bed"), ("crop_tomato_s2", "plot_raised_bed"),
            ("crop_tomato_s3", "plot_raised_bed"), ("ui_indicator_ready", None)]),
        ("Natureza e recursos", [("tree_oak_a", None), ("tree_apple_a", None), ("prop_bush_a", None), ("prop_bush_flower_a", None),
                                 ("rock_ore_gold_a", None)]),
        ("Props e cerca de madeira", [("prop_hay_roll", None), ("prop_crate", None)] + [(f"prop_fence_{k}", None) for k in FENCE_PIECES]),
        ("Construção e personagem", [("bld_barn_small", None), ("avatar_base_idle_se", None)]),
    ]
    fh, fl = font(18), font(12)
    W = 1500
    rows_imgs = []
    for title, items in sections:
        cells = []
        for n, under in items:
            im, _ = piece_image(n, 1, True, under)
            label = n if not under else f"{n}\n(sobre {under})"
            cells.append((im, label, n))
        rows_imgs.append((title, cells))
    # layout em fluxo
    pad, lab_h = 12, 30
    y = 60
    placements = []
    for title, cells in rows_imgs:
        placements.append(("title", title, (20, y)))
        y += 30
        x, row_h = 20, 0
        for im, label, n in cells:
            cw, ch = max(im.width, 110) + 2 * pad, im.height + 2 * pad + lab_h
            if x + cw > W - 20:
                x, y = 20, y + row_h + 10
                row_h = 0
            placements.append(("cell", (im, label, n), (x, y, cw, ch)))
            x += cw + 10
            row_h = max(row_h, ch)
        y += row_h + 24
    # herói @2x: avatar, maduro, maçã — detalhe
    hero = [("avatar_base_idle_se", None), ("crop_tomato_s3", "plot_raised_bed"), ("prop_hay_roll", None), ("ui_indicator_ready", None)]
    placements.append(("title", "Detalhe @2x (tela retina): avatar, tomate maduro, rolo de feno, indicador", (20, y)))
    y += 30
    x, row_h = 20, 0
    for n, under in hero:
        im, _ = piece_image(n, 2, True, under)
        cw, ch = im.width + 2 * pad, im.height + 2 * pad + lab_h
        placements.append(("cell", (im, f"{n} @2x", n), (x, y, cw, ch)))
        x += cw + 10
        row_h = max(row_h, ch)
    y += row_h + 30
    sheet = Image.new("RGBA", (W, y), SHEET_BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((20, 18), f"Alvo visual isométrico — {BATCH} — peças isoladas @1x a 1:1 (com sombra projetada)", fill=INK, font=font(22))
    for kind, data, pos in placements:
        if kind == "title":
            dr.text(pos, data, fill=INK, font=fh)
        else:
            im, label, n = data
            x, y0, cw, ch = pos
            dr.rounded_rectangle([x, y0, x + cw, y0 + ch], radius=8, fill=CELL_BG, outline=(210, 214, 204, 255))
            sheet.alpha_composite(im, (x + (cw - im.width) // 2, y0 + pad))
            dr.multiline_text((x + 6, y0 + ch - lab_h + 2), label, fill=INK, font=fl, spacing=1)
    return sheet


def debug_board() -> Image.Image:
    img = compose(1)
    dr = ImageDraw.Draw(img)
    for i in range(NX):
        for j in range(NY):
            x, y = screen(i, j, 1)
            dr.polygon([(x, y - 32), (x + 64, y), (x, y + 32), (x - 64, y)], outline=(40, 60, 90, 160))
            dr.text((x - 8, y - 6), f"{i},{j}", fill=(30, 40, 70, 255), font=font(10))
    for n, i, j, _ in scene_objects():
        a = _ASSETS[n][0]
        x, y = screen(i, j, 1)
        fx, fy = a.footprint
        p = [iso(-fx / 2, -fy / 2), iso(fx / 2, -fy / 2), iso(fx / 2, fy / 2), iso(-fx / 2, fy / 2)]
        dr.polygon([(x + px, y + py) for px, py in p], outline=(0, 200, 255, 255))
        dr.line([(x - 6, y), (x + 6, y)], fill=(255, 0, 200, 255), width=2)
        dr.line([(x, y - 6), (x, y + 6)], fill=(255, 0, 200, 255), width=2)
    return img


def tech_sheet() -> Image.Image:
    """Repetição: campo 8x8 só de grama (variantes por hash) sem e com manchas; 3x3 do caminho."""
    fl = font(14)
    cells = []
    for with_decor in (False, True):
        cv = Image.new("RGBA", (1100, 600), (255, 255, 255, 255))
        ox, oy = 550, 60
        for s in range(15):
            for i in range(8):
                j = s - i
                if 0 <= j < 8:
                    im, an = load(grass_variant(i + 20, j + 20), 1)
                    place(cv, im, an, (ox + (i - j) * 64, oy + (i + j) * 32))
        if with_decor:
            for n, u, v in (("decor_grass_patch_a", 2.2, 1.5), ("decor_grass_patch_b", 5.2, 2.4), ("decor_grass_patch_a", 3.5, 5.6),
                            ("decor_grass_patch_b", 1.0, 4.4), ("decor_flowers_a", 4.3, 3.6), ("decor_flowers_a", 6.2, 5.2),
                            ("decor_pebbles_a", 2.5, 3.3), ("decor_grass_patch_a", 6.4, 0.8)):
                im, an = load(n, 1)
                place(cv, im, an, (ox + (u - v) * 64, oy + (u + v) * 32))
        cells.append(cv.crop((70, 20, 1030, 560)))
    path_demo = Image.new("RGBA", (960, 380), (255, 255, 255, 255))
    demo = {(0, 1), (1, 1), (2, 1), (2, 2), (2, 3), (3, 3), (4, 3), (4, 2), (4, 1), (5, 1), (1, 0)}
    ox, oy = 470, 40
    for s in range(12):
        for i in range(7):
            j = s - i
            if 0 <= j < 5:
                if (i, j) in demo:
                    m = 0
                    for b, (di, dj) in ((XP, (1, 0)), (YP, (0, 1)), (XN, (-1, 0)), (YN, (0, -1))):
                        if (i + di, j + dj) in demo:
                            m |= b
                    nme = f"ground_path_dirt_{tag(m)}"
                else:
                    nme = grass_variant(i, j)
                im, an = load(nme, 1)
                place(path_demo, im, an, (ox + (i - j) * 64, oy + (i + j) * 32))
    H = sum(c_.height for c_ in cells) + path_demo.height + 120
    sheet = Image.new("RGBA", (960, H), (255, 255, 255, 255))
    dr = ImageDraw.Draw(sheet)
    y = 10
    for k, cimg in enumerate(cells):
        dr.text((10, y), ("Campo 8x8 só com as 3 variantes de grama (hash por posição)" if k == 0
                          else "O mesmo campo com manchas suaves e decoração solta (quebra a grade)"), fill=INK, font=fl)
        sheet.alpha_composite(cimg, (0, y + 22))
        y += cimg.height + 30
    dr.text((10, y), "Caminho: curvas, T, cruz e pontas (autotile de 16) sobre grama", fill=INK, font=fl)
    sheet.alpha_composite(path_demo, (0, y + 22))
    return sheet


# =========================================================================== MANIFESTO
ROLE = {
    "ground_grass_a": "chão de grama, variante a (manchas claras + tufos)",
    "ground_grass_b": "chão de grama, variante b (mancha escura + trevo)",
    "ground_grass_c": "chão de grama, variante c (trevos + florzinhas)",
    "ground_water": "água de fundo (ao redor da ilha, 40 px abaixo da grama), variantes a e b",
    "ground_path_dirt": "caminho de terra bege — autotile de 16 por máscara de vizinhos (+x, +y, -x, -y)",
    "ground_edge_grass": "borda da ilha: barranco com estratos, pedras e espuma na frente; filete de luz no fundo",
    "ground_pond_2x2": "lago pequeno 2x2 com margem, parede interna, vitória-régia, pedras e juncos (decalque)",
    "decor_grass_patch_a": "mancha clara suave de grama (decalque, quebra repetição)",
    "decor_grass_patch_b": "mancha escura suave de grama (decalque, quebra repetição)",
    "decor_flowers_a": "tufinho de flores (decoração solta)",
    "decor_pebbles_a": "pedrinhas soltas (decoração)",
    "tree_oak_a": "árvore redonda fofa sem frutas",
    "tree_apple_a": "árvore redonda fofa com maçãs",
    "prop_bush_a": "arbusto redondo",
    "prop_bush_flower_a": "arbusto florido",
    "rock_ore_gold_a": "pedra com minério de ouro",
    "plot_raised_bed": "canteiro elevado de madeira com terra arada (vazio)",
    "crop_tomato": "tomate em 3 estágios sobre o canteiro: s1 broto, s2 médio, s3 maduro",
    "prop_hay_roll": "fardo de feno em rolo",
    "prop_crate": "caixote de madeira",
    "prop_fence_wood": "cerca de madeira: reto x, reto y, 4 cantos, 2 pontas (portão aberto)",
    "bld_barn_small": "celeiro pequeno 3x3 vermelho, frisos creme, portão de madeira, telhado de 2 águas",
    "avatar_base_idle_se": "avatar base parado, de frente (_se): chapéu de palha, camisa xadrez vermelha, jardineira azul",
    "ui_indicator_ready": "indicador 'pronto para colher' (balão com tomate) sobre o canteiro maduro",
}


def group_of(name: str) -> str:
    if name.startswith("ground_path_dirt_"):
        return "ground_path_dirt"
    if name.startswith("ground_edge_grass_"):
        return "ground_edge_grass"
    if name.startswith("ground_water_"):
        return "ground_water"
    if name.startswith("crop_tomato_"):
        return "crop_tomato"
    if name.startswith("prop_fence_"):
        return "prop_fence_wood"
    return name[:-7] if name.endswith("_shadow") else name


def update_manifest(assets, qa_ok: bool):
    mpath = iv.ART / "manifest.json"
    man = json.loads(mpath.read_text(encoding="utf-8"))
    man["assets"] = [e for e in man["assets"] if e.get("batch") != BATCH]
    groups: dict[str, list[str]] = {}
    for name in assets:
        groups.setdefault(group_of(name), []).append(name)
    for gid, names in groups.items():
        main = sorted([n for n in names if not n.endswith("_shadow")])
        a, fam = assets[main[0]]
        files, sources = [], []
        for n in sorted(names):
            fa, ffam = assets[n]
            rel = lambda p: str(p.relative_to(ROOT))  # noqa: E731
            files += [rel(exp_dir(ffam) / f"{n}@1x.png"), rel(exp_dir(ffam) / f"{n}@2x.png"), rel(exp_dir(ffam) / f"{n}.json")]
            sources.append(rel(src_dir(ffam) / f"{n}.svg"))
        entry = {
            "id": gid, "batch": BATCH, "role": ROLE.get(gid, gid),
            "path": str((exp_dir(fam) / f"{main[0]}@1x.png").relative_to(ROOT)),
            "files": files, "source_path": sources if len(sources) > 1 else sources[0],
            "status": "in_review",
            "variants": main if len(main) > 1 else [],
            "technical": {
                "dimensions": f"{a.width}x{a.height}", "dimensions_2x": f"{a.width * 2}x{a.height * 2}", "alpha": True,
                "anchor": "centro do losango da pegada" if not gid.startswith("ui_") else "ponta do rabicho do balão",
                "anchor_px_1x": list(a.anchor), "origin": a.meta()["origin"], "footprint_tiles": list(a.footprint),
                "frames": 1, "filtering": "linear", "max_colors": None, "palette": "art/style-guide/palette.json (v2.1)",
                "shadow": "separada (_shadow)" if any(n.endswith("_shadow") for n in names) else "sem sombra",
            },
            "visual_locks": ["palette", "projection-2:1", "anchor", "light-direction", "outline"],
            "source": {
                "kind": "scripted",
                "url_or_tool": "art/source/tools/build_alvo_visual_iso_01.py + art/source/tools/iso_vector.py (cairosvg)",
                "creator": "agente diretor-de-arte (Claude)", "created_at": "2026-11-22",
                "license": "original do projeto (todos os direitos do projeto)", "attribution": "",
                "prompt_or_source_record": "SVG gerado por código; sem gerador de imagem por IA; sem referência externa; "
                                           "nada derivado de Sunflower Land/Sunnyside nem de kits de terceiros",
            },
            "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False,
                             "technical_checks_passed": qa_ok, "approved_by": ""},
            "review": f"art/review/{BATCH}/prancha.png",
            "notes": f"alvo visual iso-01; ver art/review/{BATCH}/notas.md",
        }
        if gid == "crop_tomato":
            entry["technical"]["z_base_px"] = SOIL_Z
            entry["technical"]["frames"] = 3
        man["assets"].append(entry)
    man["support_files"] = [s for s in man.get("support_files", []) if s.get("batch") != BATCH]
    man["support_files"].append({"path": f"art/review/{BATCH}/", "role": "alvo visual iso-01 (cena, prancha, debug, técnica, qa.json, notas.md)",
                                 "status": "in_review", "batch": BATCH})
    man["style_version"] = "2.1 (isométrico cartoon, vetor por script) — 2026-11-22"
    mpath.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


# =========================================================================== MAIN
_ASSETS: dict = {}


def main() -> int:
    global _ASSETS
    assets = build_assets()
    _ASSETS = assets
    for name, (a, fam) in assets.items():
        _FAM_OF[name] = fam
        a.export(src_dir(fam), exp_dir(fam))
    REV.mkdir(parents=True, exist_ok=True)
    compose(1).save(REV / "cena.png")
    compose(2, src=2).save(REV / "cena@2x.png")
    half = compose(0.5)
    half.save(REV / "cena-zoom05.png")
    half.crop((170, 40, 170 + 390, 40 + 340)).save(REV / "cena-celular.png")
    build_sheet().save(REV / "prancha.png")
    debug_board().save(REV / "prancha-debug.png")
    tech_sheet().save(REV / "prancha-tecnica.png")

    seams = [seam_test(z) for z in (0.5, 0.75, 1, 1.5, 2)]
    repeats = [repeat_test(n) for n in assets if n.startswith(("ground_grass", "ground_path", "ground_water"))]
    pal = palette_test(assets)
    contract = contract_test(assets)
    report = asset_report(assets)
    ok = (all(s["pass"] for s in seams) and all(r["pass"] for r in repeats) and pal["pass"] and contract["pass"]
          and all(r["exit"] == 0 for r in report))
    qa = {"batch": BATCH, "pieces": len([n for n in assets if not n.endswith("_shadow")]), "png_files": 2 * len(assets),
          "seam_tests": seams, "repeat_3x3": {"tiles": len(repeats), "failed": [r for r in repeats if not r["pass"]]},
          "palette": pal, "contract": contract, "asset_report": report, "pass": ok}
    (REV / "qa.json").write_text(json.dumps(qa, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    update_manifest(assets, ok)
    print(json.dumps({k: v for k, v in qa.items() if k != "asset_report"}, indent=1, ensure_ascii=False))
    print("asset_report:", [(r["size"], r["files"], r["exit"]) for r in report])
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
