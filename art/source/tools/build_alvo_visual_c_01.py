#!/usr/bin/env python3
"""Alvo visual do estilo C (pintado semirrealista) — lote 2026-11-22-alvo-visual-c-01 (in_review).

Mesma composição do alvo iso-01 reprovado (ilha 10×8 com barranco, grama com variantes, caminho
de terra com transições, lago, canteiros, árvores, arbustos, galpão 3×3, cerca, feno, caixote,
pedra com minério, fazendeiro adulto e indicador de colheita), agora no guia v3.

100% vetor gerado por código (SVG -> PNG com cairosvg). Sem IA, sem referência externa, nada
derivado de Sunflower Land/Sunnyside. Guia: art/style-guide/README.md (v3). Paleta v3.

    python3 -m pip install -r art/source/tools/requirements.txt
    python3 art/source/tools/build_alvo_visual_c_01.py          # sai 0 só se todo o QA passar

Gera:
  art/source/v3-<familia>/<nome>.svg                fontes geradas (não editar: edite este script)
  art/export/v3-<familia>/<nome>@1x.png, @2x.png    + <nome>.json (âncora, origem, pegada)
  art/review/2026-11-22-alvo-visual-c-01/           cena.png, cena@2x.png, cena-zoom05.png,
        cena-celular.png, cena-celular-dpr2.png, prancha.png, prova-leitura-05.png,
        prancha-tecnica.png, prancha-debug.png, qa.json
  art/manifest.json                                 entradas deste lote (status in_review)
"""
from __future__ import annotations

import hashlib
import io
import json
import math
import random
import re
import subprocess
import sys
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import iso_vector as iv  # noqa: E402
from iso_vector import Asset, clip, hull, iso, pts  # noqa: E402
import paint_vector as pv  # noqa: E402
from paint_vector import G, LN, P, PL, T, f2, rim, occlusion, shift, tone, wpt  # noqa: E402

BATCH = "2026-11-22-alvo-visual-c-01"
ROOT = iv.ART.parent
REV = iv.ART / "review" / BATCH
REPORT = ROOT / ".claude" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"
OLD_C = iv.ART / "source" / "estilos-comparativo" / "c"      # peças C da prancha comparativa (antes)
FAM = {k: f"v3-{k}" for k in ("ground", "nature", "crops", "props", "buildings", "characters", "ui")}

GW, GH = 136, 68                 # tile de chão: 128x64 + sangria
GANCHOR = (68, 34)
UVB = 0.03125                    # sangria do chão em tiles (4 px na horizontal)
CLIFF_H = 40                     # altura do barranco (px @1x)
EDGE_H = GH + CLIFF_H + 8
XP, YP, XN, YN = 1, 2, 4, 8
MASK_TAG = {XP: "xp", YP: "yp", XN: "xn", YN: "yn"}
BED_HALF, BED_Z, SOIL_Z = 0.40, 14, 11     # canteiro: meia-pegada, altura da borda, altura da terra
INTERACTIVE = set()              # preenchido por build_assets (recebem realce de borda)


def tag(mask: int) -> str:
    return "".join(MASK_TAG[b] for b in (XP, YP, XN, YN) if mask & b) or "none"


def hsh(*k) -> int:
    return int(hashlib.md5(",".join(map(str, k)).encode()).hexdigest(), 16)


# =========================================================================== CANVAS AUTOMÁTICO
BIG = (1400, 1100, 700, 760)


def _alpha_bbox(svg: str, w: int, h: int):
    png = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w, output_height=h)
    a = Image.open(io.BytesIO(png)).getchannel("A").point(lambda v: 255 if v > 1 else 0)
    return a.getbbox()


def _ceil(v, m):
    return int(math.ceil(v / m) * m)


def fit(a: Asset, margin: int = 4, centered: bool = True) -> Asset:
    """Ajusta o canvas ao conteúdo: múltiplo de 4, âncora par; centrada em x (sprites) ou livre
    (sombras). Mantém o mesmo ponto de âncora do mundo."""
    W_, H_, AX, AY = BIG
    a.width, a.height, a.anchor = W_, H_, (AX, AY)
    x0, y0, x1, y1 = _alpha_bbox(a.svg(), W_, H_)
    assert x0 > 0 and y0 > 0 and x1 < W_ and y1 < H_, f"{a.name}: conteúdo maior que o canvas de medida"
    left, right, top, bottom = AX - x0 + margin, x1 - AX + margin, AY - y0 + margin, y1 - AY + margin
    if centered:
        half = _ceil(max(left, right), 2)
        a.width = 2 * half if (2 * half) % 4 == 0 else 2 * half + 4
        ax = a.width // 2
    else:
        ax = _ceil(left, 2)
        a.width = _ceil(ax + right, 4)
    ay = _ceil(top, 2)
    a.height = _ceil(ay + bottom, 4)
    a.anchor = (ax, ay)
    return a


def sprite(name, footprint=(1, 1)) -> Asset:
    return Asset(name, 8, 8, (4, 4), footprint=footprint)


def mark_interactive(*names):
    INTERACTIVE.update(names)


# =========================================================================== CHÃO
def _shared_grass_marks():
    """Marcas periódicas (período = 1 tile) iguais em TODO tile com grama: emendam em qualquer vizinho."""
    rng = random.Random(777)
    m = []
    for i in range(12):        # manchas pintadas (baixo contraste)
        m.append(("blot", rng.uniform(-.5, .5), rng.uniform(-.5, .5), rng.uniform(9, 17), rng.uniform(.38, .66), i))
    for i in range(16):        # manchas secas
        if i < 5:
            m.append(("dry", rng.uniform(-.5, .5), rng.uniform(-.5, .5), rng.uniform(6, 11), rng.uniform(.45, .7), i))
    for i in range(130):       # lâminas curtas
        m.append(("blade", rng.uniform(-.5, .5), rng.uniform(-.5, .5), rng.uniform(2.5, 5.0), rng.uniform(.32, .82), i))
    return m


SHARED_GRASS = _shared_grass_marks()


def grass_marks(keep=lambda u, v: True, reach=0.62) -> str:
    out = []
    for du in (-1, 0, 1):
        for dv in (-1, 0, 1):
            for kind, u, v, s, t, i in SHARED_GRASS:
                uu, vv = u + du, v + dv
                if abs(uu) > reach or abs(vv) > reach or not keep(uu, vv):
                    continue
                x, y = iso(uu, vv)
                if kind == "blot":
                    out.append(P(pv.leaf_clump(x, y, s, 50 + i, n=9, squash=0.5), tone("grama", t), 'opacity="0.32"'))
                elif kind == "dry":
                    out.append(P(pv.leaf_clump(x, y, s, 80 + i, n=7, squash=0.5), tone("grama_seca", t), 'opacity="0.30"'))
                else:
                    lean = ((i * 37) % 9 - 4) * 0.45
                    out.append(LN((x, y), (x + lean, y - s), tone("grama", t), 0.9, 'opacity="0.8"'))
    return "".join(out)


def grass_variant_detail(variant: str, seed: int, lim: float = 0.3, keep=lambda u, v: True) -> str:
    """Detalhe próprio de cada variante, só no miolo (nunca cruza a borda do tile)."""
    rng = random.Random(seed)
    out = []

    def pick():
        for _ in range(60):
            u, v = rng.uniform(-lim, lim), rng.uniform(-lim, lim)
            if keep(u, v):
                return u, v
        return None
    if variant == "a":          # trecho mais claro, com sol
        for k in range(2):
            p = pick()
            if p:
                x, y = iso(*p)
                out.append(P(pv.leaf_clump(x, y, rng.uniform(14, 20), seed + k, n=9, squash=0.5), tone("grama", 0.72), 'opacity="0.28"'))
        for k in range(3):
            p = pick()
            if p:
                out.append(pv.blade_tuft(*iso(*p), 1.0, "grama", seed + 10 + k, (0.4, 0.8)))
    elif variant == "b":        # touceira mais escura e alta
        p = pick()
        if p:
            x, y = iso(*p)
            out.append(P(pv.leaf_clump(x, y, 16, seed, n=9, squash=0.5), tone("grama", 0.2), 'opacity="0.30"'))
            out.append(pv.blade_tuft(x - 3, y + 1, 1.3, "grama", seed + 3, (0.2, 0.55)))
            out.append(pv.blade_tuft(x + 5, y + 2, 1.1, "grama", seed + 4, (0.3, 0.7)))
        p = pick()
        if p:
            out.append(pv.blade_tuft(*iso(*p), 0.9, "grama", seed + 6, (0.35, 0.75)))
    else:                       # "c": mancha seca e florzinhas miúdas
        p = pick()
        if p:
            x, y = iso(*p)
            out.append(P(pv.leaf_clump(x, y, 15, seed, n=9, squash=0.5), tone("grama_seca", 0.55), 'opacity="0.34"'))
            out.append(pv.blade_tuft(x + 4, y + 1, 0.9, "grama_seca", seed + 2, (0.4, 0.8)))
        for k in range(3):
            p = pick()
            if p:
                x, y = iso(*p)
                col = T("flor_creme", "light") if k != 1 else T("flor_lilas", "light")
                out.append(P(pv.leaf_clump(x, y - 1, 1.8, seed + 20 + k, n=5, squash=0.9), col))
    return "".join(out)


def grass_layers(a: Asset, variant: str, seed: int, keep=lambda u, v: True, lim=0.3):
    tc = iv.ground_clip(a.defs, 1.0, iv.GROUND_BLEED)
    a.layer("texture", f'<g clip-path="url(#{tc})">{grass_marks(keep)}</g>')
    a.layer("detail", grass_variant_detail(variant, seed, lim, keep))


def ground_tile(name: str, variant: str, seed: int) -> Asset:
    a = Asset(name, GW, GH, GANCHOR)
    a.layer("base", iv.ground_diamond(tone("grama", 0.5)))
    grass_layers(a, variant, seed)
    return a


def water_tile(var: str, seed: int) -> Asset:
    a = Asset(f"ground_water_{var}", GW, GH, GANCHOR)
    a.layer("base", iv.ground_diamond(tone("agua", 0.44)))
    rng = random.Random(seed)
    out = []
    for k in range(3 if var == "a" else 2):
        u, v = rng.uniform(-.3, .3), rng.uniform(-.3, .3)
        x, y = iso(u, v)
        w = rng.uniform(7, 13)
        out.append(PL([(x - w, y), (x - w * 0.3, y - 1.2), (x + w * 0.4, y - 0.6), (x + w, y + 0.4)],
                      tone("agua", 0.72), 1.1, 'opacity="0.45"'))
        out.append(PL([(x - w * 0.6, y + 2.4), (x + w * 0.5, y + 2.2)], tone("agua", 0.25), 1.0, 'opacity="0.35"'))
    a.layer("detail", "".join(out))
    return a


# ---------------------------------------------------------------- caminho (autotile 16)
PATH_W = 0.30


def path_poly(mask: int, w: float, E: float = 0.66, rc: float = 0.09, ri: float = 0.05):
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


def in_path(u, v, mask, w=PATH_W, m=0.0) -> bool:
    ww = w - m
    if abs(u) <= ww and abs(v) <= ww:
        return True
    return ((mask & XP and u >= 0 and abs(v) <= ww) or (mask & XN and u <= 0 and abs(v) <= ww)
            or (mask & YP and v >= 0 and abs(u) <= ww) or (mask & YN and v <= 0 and abs(u) <= ww))


def path_edge_points(mask, w, step=0.07, lim=0.42):
    """Pontos (u, v) ao longo da beira do caminho, longe da borda do tile (tufos não são cortados)."""
    out = []
    t = -lim
    while t <= lim + 1e-9:
        for (u, v) in ((t, -w), (t, w), (-w, t), (w, t)):
            on_side = in_path(u, v, mask, w, -0.001) and not in_path(u, v, mask, w, 0.02)
            if on_side and abs(u) <= lim and abs(v) <= lim:
                out.append((u, v))
        t += step
    return out


def path_tile(mask: int, var: str = "") -> Asset:
    a = Asset(f"ground_path_dirt_{tag(mask)}{var}", GW, GH, GANCHOR)
    d = a.defs
    tc = iv.ground_clip(d, 1.0, iv.GROUND_BLEED)
    p, r = path_poly(mask, PATH_W)
    dpath = iv.rounded_d(p, r, lambda q: iso(*q))
    pc, rcen = path_poly(mask, 0.12, rc=0.06, ri=0.04)
    dcen = iv.rounded_d(pc, rcen, lambda q: iso(*q))
    pclip = clip(d, f'<path d="{dpath}"/>')
    a.layer("base", iv.ground_diamond(tone("grama", 0.5)))
    grass_layers(a, "a" if not var else "c", 900 + mask, keep=lambda u, v: not in_path(u, v, mask, PATH_W, -0.04), lim=0.42)
    rng = random.Random(1000 + mask + (517 if var else 0))
    out = [f'<g clip-path="url(#{tc})">',
           f'<path d="{dpath}" fill="none" stroke="{T("grama", "deep")}" stroke-width="7" stroke-linejoin="round" opacity="0.30"/>',
           f'<path d="{dpath}" fill="{tone("terra_caminho", 0.5)}"/>',
           f'<g clip-path="url(#{pclip})">',
           f'<path d="{dpath}" fill="none" stroke="{tone("terra_caminho", 0.18)}" stroke-width="7" stroke-linejoin="round" opacity="0.45"/>',
           f'<path d="{dcen}" fill="{tone("terra_caminho", 0.72)}" opacity="0.45"/>']
    for k in range(9):                                    # manchas de terra (miolo)
        u, v = rng.uniform(-.38, .38), rng.uniform(-.38, .38)
        if in_path(u, v, mask, PATH_W, 0.05):
            x, y = iso(u, v)
            out.append(P(pv.leaf_clump(x, y, rng.uniform(5, 9), 400 + k + mask, n=7, squash=0.5),
                         tone("terra_caminho", rng.uniform(0.3, 0.75)), 'opacity="0.35"'))
    n_st = 0
    for _ in range(200):                                  # pedrinhas angulares
        if n_st >= (1 if var else 2):
            break
        u, v = rng.uniform(-.38, .38), rng.uniform(-.38, .38)
        if in_path(u, v, mask, PATH_W, 0.08):
            x, y = iso(u, v)
            out.append(pv.stone(d, x, y, rng.uniform(2.6, 3.6), rng.uniform(1.6, 2.2), 600 + n_st + mask, t=0.62))
            n_st += 1
    out.append("</g>")
    for k, (u, v) in enumerate(path_edge_points(mask, PATH_W)):     # grama invadindo a beira
        if hsh(mask, k, var) % 3 == 0:
            out.append(pv.blade_tuft(*iso(u, v), 0.85, "grama", 700 + k + mask, (0.3, 0.7)))
    out.append("</g>")
    a.layer("path", "".join(out))
    return a


# ---------------------------------------------------------------- borda da ilha
def wave(t: float) -> float:
    ph = 2 * math.pi * (t + 0.5)
    return 2.4 * math.sin(2 * ph) + 1.4 * math.sin(3 * ph + 1.0)


STONE_SETS = {"a": ((-0.28, -19, 1.0), (0.22, -30, 0.8), (0.05, -9, 0.7)),
              "b": ((-0.08, -26, 1.1), (0.31, -12, 0.75)),
              "c": ((-0.34, -10, 0.7), (0.12, -21, 0.95), (0.4, -32, 0.6))}


def edge_tile(mask: int, variant: str = "a", stones: str = "a", suffix: str = "") -> Asset:
    """Borda da ilha: barranco (+x, +y) com estratos, raízes e pedras angulares; beiço de grama
    pendendo; base úmida e espuma discreta. Bordas do fundo: só um filete de luz."""
    a = Asset(f"ground_edge_grass_{tag(mask)}{suffix}", GW, EDGE_H, GANCHOR)
    d = a.defs
    n = 24
    faces = []

    def face(side: str):
        lit = side == "y"
        eps = 0.0 if (mask & XP and mask & YP) else 0.03
        ts = [-0.5 + (1.0 + eps) * k / n for k in range(n + 1)]
        Pp = (lambda t, z: iso(t, 0.5, z)) if lit else (lambda t, z: iso(0.5, t, z))
        top = [Pp(t, 0) for t in ts]
        bot = [Pp(t, -CLIFF_H + wave(t)) for t in ts]
        slope = 0.5 if lit else -0.5
        t1, t2 = (0.62, 0.38) if lit else (0.34, 0.12)
        gid = d.add("linearGradient",
                    f'<stop offset="0" stop-color="{tone("barranco", t1)}"/><stop offset="1" stop-color="{tone("barranco", t2)}"/>',
                    f'gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{CLIFF_H}" gradientTransform="matrix(1,{slope},0,1,0,32)"')
        o = [P(top + bot[::-1], f"url(#{gid})")]
        fid = clip(d, f'<polygon points="{pts(top + bot[::-1])}"/>')
        o.append(f'<g clip-path="url(#{fid})">')
        for zl, amp in ((-12, 1.0), (-24, 1.3), (-33, 0.8)):            # estratos (periódicos)
            line = [Pp(t, zl + amp * math.sin(2 * math.pi * 2 * (t + 0.5) + zl)) for t in ts]
            o.append(PL(line, tone("barranco", 0.12 if lit else 0.02), 1.2, 'opacity="0.55"'))
            if lit:
                o.append(PL([(x, y + 1.3) for x, y in line], tone("barranco", 0.85), 0.8, 'opacity="0.35"'))
        for k in range(4):                                              # raízes finas
            t0 = -0.4 + 0.25 * k + 0.05 * math.sin(k * 3.1)
            p0 = Pp(t0, -5)
            o.append(PL([p0, Pp(t0 + 0.04, -11), Pp(t0 + 0.02, -17 - 3 * (k % 2))], tone("casca", 0.2), 0.9, 'opacity="0.7"'))
        for k, (t, zz, s) in enumerate(STONE_SETS[stones if lit else "bca"["abc".index(stones)]]):
            x, y = Pp(t, zz)
            o.append(pv.stone(d, x, y, 5.4 * s, 3.8 * s, 11 * k + ord(stones), t=0.6 if lit else 0.38))
        wet = [Pp(t, -CLIFF_H + wave(t) + 6) for t in ts]
        o.append(P(wet + bot[::-1], tone("barranco", 0.05), 'opacity="0.45"'))
        o.append("</g>")
        o.append(PL([(x, y + 1.5) for x, y in bot], tone("agua", 0.82), 1.6, 'opacity="0.45"'))
        o.append(PL([(x, y + 4.5) for x, y in bot[1::3]], tone("agua", 0.7), 1.0, 'stroke-dasharray="5 6" opacity="0.35"'))
        return "".join(o)

    if mask & YP:
        faces.append(face("y"))
    if mask & XP:
        faces.append(face("x"))
    if mask & XP and mask & YP:
        x0, y0 = iso(0.5, 0.5, 0)
        faces.append(LN((x0, y0), (x0, y0 + CLIFF_H - wave(0.5) - 2), tone("barranco", 0.7), 1.0, 'opacity="0.5"'))
    a.layer("cliff", "".join(faces))
    u0 = -0.5 if mask & XN else -0.5 - UVB
    u1 = 0.5 if mask & XP else 0.5 + UVB
    v0 = -0.5 if mask & YN else -0.5 - UVB
    v1 = 0.5 if mask & YP else 0.5 + UVB
    top = [iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)]
    a.layer("base", P(top, tone("grama", 0.5), 'shape-rendering="crispEdges"'))
    tid = clip(d, f'<polygon points="{pts(top)}"/>')
    a.layer("texture", f'<g clip-path="url(#{tid})">{grass_marks()}</g>')
    a.layer("detail", grass_variant_detail(variant, 700 + mask + ord(stones), 0.26))
    lipg = []
    for side in (YP, XP):                                               # beiço de grama sobre o barranco
        if not mask & side:
            continue
        ts = [-0.5 + k / 32 for k in range(33)]
        Pp = (lambda t, z: iso(t, 0.5, z)) if side == YP else (lambda t, z: iso(0.5, t, z))
        lipf = lambda t: 3.5 + 2.0 * abs(math.sin(4 * math.pi * (t + 0.5)))  # noqa: E731
        topl = [Pp(t, 0) for t in ts]
        botl = [Pp(t, -lipf(t)) for t in ts]
        lipg.append(P(topl + botl[::-1], tone("grama", 0.3 if side == YP else 0.14)))
        for k in range(16):                                             # lâminas pendentes (periódicas)
            t = -0.5 + (k + 0.5) / 16
            x, y = Pp(t, -lipf(t) + 1)
            hang = 3 + (k * 7 % 5)
            lipg.append(P([(x - 1.3, y - 1), (x + 0.4 * ((k % 3) - 1), y + hang), (x + 1.3, y - 1)],
                          tone("grama", 0.22 if side == YP else 0.1)))
        lipg.append(PL([(x, y - 0.8) for x, y in topl], tone("grama", 0.82), 1.1, 'opacity="0.55"'))
    for side, (p0, p1) in ((XN, ((-0.47, -0.5), (-0.47, 0.5))), (YN, ((-0.5, -0.47), (0.5, -0.47)))):
        if mask & side:
            lipg.append(LN(iso(*p0), iso(*p1), tone("grama", 0.85), 1.6, 'opacity="0.55"'))
    a.layer("rim", "".join(lipg))
    return a


# ---------------------------------------------------------------- lago e decalques
def blob_uv(scale, n=30, seed=4):
    """Contorno irregular de poucos segmentos retos (natural, não redondo)."""
    rng = random.Random(seed)
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = (0.80 + 0.07 * math.sin(3 * t + 0.6) + 0.05 * math.sin(5 * t + 2.0) + 0.03 * math.sin(7 * t)) * scale
        r *= 1 + rng.uniform(-0.015, 0.015)
        out.append(iso(r * math.cos(t), r * math.sin(t)))
    return out


def pond() -> Asset:
    a = Asset("ground_pond_2x2", 296, 172, (148, 98), footprint=(2, 2))
    d = a.defs
    halo, bank, wall = blob_uv(1.12), blob_uv(1.02), blob_uv(0.93)
    water = [(x, y + 5) for x, y in blob_uv(0.89)]
    a.layer("halo", P(halo, tone("grama", 0.25), 'opacity="0.45"'))
    a.layer("bank", P(bank, tone("barranco", 0.62)) + P(scale_in(bank, 0.97), tone("terra_caminho", 0.4), 'opacity="0.5"'))
    wid = clip(d, f'<polygon points="{pts(wall)}"/>')
    gw = iv.rad(d, [(0, tone("agua", 0.12)), (0.7, tone("agua", 0.32)), (1, tone("agua", 0.5))], cx=0.5, cy=0.45, r=0.6)
    body = [P(wall, tone("barranco", 0.22)), f'<g clip-path="url(#{wid})">', P(water, f"url(#{gw})")]
    body.append(PL(water[4:15], tone("agua", 0.7), 2.0, 'opacity="0.45"'))
    for (u, v, w) in ((-0.25, -0.3, 16), (0.28, 0.0, 12), (-0.3, 0.28, 9)):
        x, y = iso(u, v)
        body.append(PL([(x - w, y), (x + w * 0.2, y - 1), (x + w, y)], tone("agua", 0.85), 1.2, 'opacity="0.55"'))
    for k, (u, v, s) in enumerate(((0.3, -0.28, 1.0), (0.48, 0.22, 0.8), (-0.42, -0.05, 0.7))):   # folhas flutuantes
        x, y = iso(u, v)
        rx, ry = 9 * s, 5 * s
        leaf = [(x + rx * math.cos(t), y + ry * math.sin(t)) for t in [0.35 + 5.6 * i / 9 for i in range(10)]] + [(x, y)]
        body.append(P(shift(leaf, 0.6, 1.0), tone("agua", 0.05), 'opacity="0.5"') + P(leaf, tone("arbusto", 0.5)))
        body.append(P(leaf[:5] + [(x, y)], tone("arbusto", 0.68)))
    body.append("</g>")
    a.layer("water", "".join(body))
    reeds = []
    for k, (u, v) in enumerate(((-0.66, -0.6), (-0.52, -0.74), (-0.76, -0.44), (-0.4, -0.82))):
        x, y = iso(u, v)
        reeds.append(pv.blades(x, y, 9, 30 - 3 * k, 5, "arbusto", 0.3, 0.8, 90 + k, w=1.3))
        if k < 3:
            tx = x + 2 * (k - 1)
            reeds.append(LN((tx, y), (tx + 1, y - 34 + 3 * k), tone("arbusto", 0.25), 1.2))
            reeds.append(P([(tx - 1.6, y - 25 + 3 * k), (tx + 2.6, y - 25 + 3 * k), (tx + 3, y - 34 + 3 * k), (tx - 1, y - 34 + 3 * k)],
                           tone("bota", 0.55)))
    stones = []
    for k, (t, s) in enumerate(((0.55, 1.0), (0.95, 0.75), (1.4, 1.1), (1.8, 0.8), (2.4, 0.9), (2.8, 0.7), (4.3, 0.85), (5.6, 0.9))):
        x, y = iso(0.99 * math.cos(t), 0.99 * math.sin(t))
        stones.append(pv.stone(d, x, y - 1, 7.5 * s, 4.6 * s, 300 + k, t=0.6))
    a.layer("reeds", "".join(reeds))
    a.layer("stones", "".join(stones))
    return a


def scale_in(poly, k):
    return pv.scale_about(poly, k)


def grass_patch(name: str, rampname: str, t: float, opacity: float, seed: int, tufts: int) -> Asset:
    a = Asset(name, 208, 108, (104, 54), footprint=(1.5, 1.5))
    rng = random.Random(seed)
    out = []
    for k in range(7):
        u, v = rng.uniform(-0.32, 0.32), rng.uniform(-0.32, 0.32)
        x, y = iso(u, v)
        out.append(P(pv.leaf_clump(x, y, rng.uniform(14, 24), seed + k, n=11, squash=0.48), tone(rampname, t + rng.uniform(-.06, .06)),
                     f'opacity="{opacity}"'))
    for k in range(tufts):
        u, v = rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)
        out.append(pv.blade_tuft(*iso(u, v), rng.uniform(0.9, 1.2), rampname if rampname != "grama" else "grama", seed + 50 + k,
                                 (0.25, 0.7)))
    a.layer("patch", "".join(out))
    return a


def flowers() -> Asset:
    a = Asset("decor_flowers_a", 64, 44, (32, 30), footprint=(0.4, 0.4))
    out = [pv.blade_tuft(-6, 2, 1.1, "grama", 5, (0.25, 0.6)), pv.blade_tuft(7, 1, 1.0, "grama", 6, (0.3, 0.65))]
    for k, (x, y, rmp) in enumerate(((-10, -8, "flor_creme"), (-2, -12, "flor_lilas"), (6, -9, "flor_creme"), (12, -4, "flor_lilas"),
                                     (-5, -3, "flor_creme"), (2, -5, "flor_creme"))):
        out.append(LN((x, y + 6), (x, y + 1), tone("grama", 0.3), 0.9))
        out.append(P(pv.leaf_clump(x, y, 2.6, 30 + k, n=5, squash=0.8), tone(rmp, 0.55)))
        out.append(P(pv.leaf_clump(x - 0.5, y - 0.6, 1.4, 60 + k, n=5, squash=0.8), tone(rmp, 0.9)))
    a.layer("flowers", "".join(out))
    return a


def pebbles() -> Asset:
    a = Asset("decor_pebbles_a", 48, 28, (24, 16), footprint=(0.3, 0.3))
    a.layer("pebbles", "".join(pv.stone(a.defs, x, y, rx, ry, 70 + k, t=0.6)
                               for k, (x, y, rx, ry) in enumerate(((-8, -1, 6, 3.8), (5, -3, 4.5, 3), (2, 3, 3.4, 2.2)))))
    return a


# =========================================================================== NATUREZA
def ellipsoid_w(cx, cy, z, r, rz, n=12):
    """Pontos de mundo de um elipsoide (centro em tiles, z em px de tela, r em tiles, rz em px)."""
    out = []
    for ring in (-0.6, 0.0, 0.6):
        s = math.sqrt(1 - ring * ring)
        for i in range(n):
            a_ = 2 * math.pi * i / n
            out.append(wpt(cx + r * s * math.cos(a_), cy + r * s * math.sin(a_), z + rz * ring))
    return out + [wpt(cx, cy, z + rz), wpt(cx, cy, z - rz)]


def bark_trunk(d, poly, seed, n=18, ymin=-55, ymax=-6, half=6.0):
    rng = random.Random(seed)
    out = P(poly, pv.grad(d, [tone("casca", 0.72), tone("casca", 0.5), tone("casca", 0.28), tone("casca", 0.1)], 0, 0, 1, 0))
    cid = clip(d, f'<polygon points="{pts(poly)}"/>')
    st = ""
    for _ in range(n):                                   # estrias da casca (contraste baixo)
        x = rng.uniform(-half, half)
        y0 = rng.uniform(ymin, ymax)
        st += PL([(x, y0), (x + rng.uniform(-1, 1), y0 + rng.uniform(-14, -6))],
                 tone("casca", 0.08 if x > -1 else 0.82), 1.0, 'opacity="0.45"')
    st += P([(-20, -4), (20, -4), (20, 8), (-20, 8)], tone("casca", 0.05), 'opacity="0.35"')   # base escurecida
    return out + G(st, f'clip-path="url(#{cid})"')


def apple(x, y, r=3.4):
    o = [(x + r * math.cos(k * math.pi / 4 + 0.3), y + r * math.sin(k * math.pi / 4 + 0.3)) for k in range(8)]
    lo = [p for p in o if (p[0] - x) + (p[1] - y) > -0.5] + [(x, y)]
    return (P(o, tone("fruta", 0.5)) + P(lo, tone("fruta", 0.22), 'opacity="0.9"')
            + P(pv.stone_poly(x - r * 0.35, y - r * 0.4, r * 0.36, r * 0.3, int(x * 7 + y), n=5), tone("fruta", 0.92))
            + LN((x + 0.3, y - r + 0.4), (x + 1.2, y - r - 1.6), tone("casca", 0.15), 0.8))


def tree(name, trunk, masses, seed, branches, apples=0, top_z=170, r_tiles=0.5):
    a, s = sprite(name), sprite(name + "_shadow")
    d = a.defs
    back, front = pv.crown(d, masses, seed, "folhagem", clump_r=(7.0, 11.0), density=0.017)
    br = "".join(LN(p0, p1, tone("casca", 0.25), w) for p0, p1, w in branches)
    a.layer("trunk", bark_trunk(d, trunk, seed) + rim(d, trunk, tone("casca", 0.95), 1.4, 0.5))
    a.layer("crown_back", back)
    a.layer("branches", br)
    a.layer("crown", front)
    if apples:
        rng = random.Random(seed + 1)
        ap = ""
        placed = 0
        for k, (cx, cy, rx, ry) in enumerate(masses):
            for _ in range(60):
                if placed >= apples * (k + 1) / len(masses):
                    break
                ang = rng.uniform(0.2, 2.9)                       # metade de baixo/frente da massa
                e = rng.uniform(0.45, 0.85)
                x, y = cx + rx * e * math.cos(ang), cy + ry * e * math.sin(ang)
                ap += apple(x, y)
                if rng.random() < 0.6:
                    ap += apple(x + rng.choice((-6.0, 6.0)), y + rng.uniform(1, 4))
                placed += 1
        ap += apple(-22, 6, 3.2) + apple(16, 9, 3.2)            # duas caídas no chão
        a.layer("fruit", ap)
    s.layer("shadow", pv.soft_shadow([wpt(0, 0, 0), wpt(0, 0, 60)] + ellipsoid_w(0, 0, top_z, r_tiles, 34), 1.0, (14, 5)))
    mark_interactive(name)
    return fit(a), fit(s, centered=False)


OAK_TRUNK = [(-13, 3), (-7, -5), (-7, -52), (-23, -96), (-17, -99), (-2, -70), (2, -70), (16, -106), (21, -103),
             (7, -60), (7, -5), (14, 3), (0, 6)]
OAK_MASSES = [(-42, -112, 30, 22), (40, -116, 32, 24), (0, -130, 40, 28), (-24, -162, 34, 26), (24, -168, 32, 26),
              (-2, -194, 26, 18)]
OAK_BRANCH = [((-16, -88), (-36, -118), 3.2), ((13, -96), (34, -126), 2.8), ((0, -66), (-4, -140), 3.4),
              ((-4, -116), (18, -160), 2.2), ((-18, -104), (-12, -156), 2.2)]
APPLE_TRUNK = [(-12, 3), (-6, -5), (-6, -40), (-20, -70), (-15, -73), (-2, -52), (2, -52), (14, -76), (19, -73),
               (6, -44), (6, -5), (13, 3), (0, 6)]
APPLE_MASSES = [(-42, -92, 30, 21), (40, -94, 30, 21), (0, -104, 38, 25), (-20, -132, 32, 22), (22, -136, 30, 22)]
APPLE_BRANCH = [((-14, -66), (-36, -92), 3.0), ((12, -70), (34, -94), 2.6), ((0, -50), (-2, -118), 3.0)]


def pine():
    a, s = sprite("tree_pine_a"), sprite("tree_pine_a_shadow")
    d = a.defs
    trunk = [(-5, 3), (5, 3), (1.8, -210), (-1.8, -210)]
    a.layer("trunk", P(trunk, pv.grad(d, [tone("casca", 0.7), tone("casca", 0.35), tone("casca", 0.1)], 0, 0, 1, 0))
            + P([(-9, 3), (-5, -4), (5, -4), (10, 3), (0, 6)], tone("casca", 0.3)))
    tiers = []
    y, w = -32, 46
    for k in range(9):
        h = 31 - k * 1.5
        tiers.append((y - h * 1.35, y, w, k))
        y -= h * 0.72
        w *= 0.83
    body = ""
    for top, bot, w, k in tiers:
        rr = random.Random(k * 17 + 3)
        asym = rr.uniform(-4, 4)
        right = [(0, top), (w * 0.35, top + (bot - top) * 0.35), (w * 0.75 + asym, bot - 6), (w + asym, bot + 2)]
        skirt = []
        m = 11
        for i in range(1, m):
            x = (w + asym) - (2 * w) * i / m
            skirt.append((x, bot + (rr.uniform(3, 7) if i % 2 else rr.uniform(-3, 0))))
        left = [(-w + asym * 0.5, bot + 1), (-w * 0.72, bot - 7), (-w * 0.3, top + (bot - top) * 0.4)]
        poly = right + skirt + left
        body += P(poly, pv.grad(d, [tone("pinho", 0.72), tone("pinho", 0.48), tone("pinho", 0.26), tone("pinho", 0.08)], 0, 0, 1, 0.6))
        cid = clip(d, f'<polygon points="{pts(poly)}"/>')
        nd = ""
        for i in range(16):                               # agulhas: poucas e mais grossas (regra L3)
            x = rr.uniform(-w, w)
            yy = rr.uniform(top + (bot - top) * 0.35, bot + 2)
            ln_ = rr.uniform(5, 9)
            ang = (1.1 if x < 0 else 2.0) + rr.uniform(-0.3, 0.3)
            lit = 0.55 - 0.42 * (x / w) - 0.2 * ((yy - top) / (bot - top))
            nd += LN((x, yy), (x + math.cos(ang) * ln_, yy + math.sin(ang) * ln_), tone("pinho", lit), 1.3, 'opacity="0.8"')
        nd += P([(-w - 5, bot - 5), (w + 5, bot - 5), (w + 5, bot + 9), (-w - 5, bot + 9)], tone("pinho", 0.0), 'opacity="0.5"')
        body += G(nd, f'clip-path="url(#{cid})"') + rim(d, poly, tone("pinho", 0.95), 1.5, 0.45)
    a.layer("tiers", body)
    s.layer("shadow", pv.soft_shadow([wpt(0, 0, 0)] + [wpt(math.cos(i) * .36, math.sin(i) * .36, 36) for i in range(8)]
                                     + [wpt(math.cos(i) * .2, math.sin(i) * .2, 120) for i in range(8)] + [wpt(0, 0, 222)], 1.0, (10, 4)))
    mark_interactive("tree_pine_a")
    return fit(a), fit(s, centered=False)


def bush(name, masses, seed, spikes=0):
    a, s = sprite(name), sprite(name + "_shadow")
    d = a.defs
    back, front = pv.crown(d, masses, seed, "arbusto", clump_r=(5.0, 8.0), density=0.03)
    a.layer("body", back + front)
    if spikes:
        rng = random.Random(seed + 3)
        sp = ""
        for k in range(spikes):
            cx, cy, rx, ry = masses[k % len(masses)]
            x, y = cx + rng.uniform(-rx * 0.6, rx * 0.6), cy - ry * rng.uniform(0.35, 0.8)
            hgt = rng.uniform(7, 11)
            sp += P([(x - 1.6, y), (x, y - hgt), (x + 1.6, y)], tone("flor_lilas", 0.5))
            sp += P([(x - 1.6, y), (x, y - hgt), (x - 0.2, y)], tone("flor_lilas", 0.85))
        a.layer("flowers", sp)
    pts_w = [wpt(0, 0, 0)] + ellipsoid_w(0, 0, 22, 0.3, 16, 10)
    s.layer("shadow", pv.soft_shadow(pts_w, 0.9, (22, 7)))
    return fit(a), fit(s, centered=False)


def rock_ore():
    a, s = sprite("rock_ore_a"), sprite("rock_ore_a_shadow")
    d = a.defs
    sil = [(-34, 2), (-38, -10), (-31, -26), (-14, -40), (6, -44), (24, -37), (36, -21), (38, -5), (28, 6), (4, 9), (-20, 7)]
    R, B, C = (-6, -18), (2, 8), (16, -24)
    top = [(-31, -26), (-14, -40), (6, -44), (24, -37), C, R]
    left = [(-34, 2), (-38, -10), (-31, -26), R, B, (-20, 7)]
    right = [(24, -37), (36, -21), (38, -5), (28, 6), (4, 9), B, R, C]
    small = [(-46, 4), (-49, -4), (-42, -12), (-32, -10), (-30, 1), (-38, 7)]
    small_top = [(-49, -4), (-42, -12), (-32, -10), (-38, -4)]
    out = P(small, tone("pedra", 0.42)) + P(small_top, tone("pedra", 0.72)) + rim(d, small, tone("pedra", 1.0), 1.4, 0.6)
    out += P(sil, tone("pedra", 0.45))
    out += P(left, tone("pedra", 0.62)) + P(right, tone("pedra", 0.2)) + P(top, tone("pedra", 0.88))
    out += P([(-10, -20), (6, -44), (24, -37), C], tone("pedra", 0.86), 'opacity="0.6"')   # faceta de luz
    out += P([(4, 9), B, (14, -8), (28, 6)], tone("pedra", 0.16), 'opacity="0.6"')        # faceta de sombra
    cid = clip(d, f'<polygon points="{pts(sil)}"/>')
    cr = PL([(-24, -18), (-16, -10), (-12, 0)], tone("pedra", 0.05), 1.1, 'opacity="0.75"')
    cr += PL([(26, -24), (30, -12)], tone("pedra", 0.02), 1.1, 'opacity="0.7"')
    cr += PL([R, C], tone("pedra", 0.95), 1.0, 'opacity="0.5"')
    out += G(cr, f'clip-path="url(#{cid})"')
    for (x, y, r, t, sd) in ((-6, -33, 6.5, 0.8, 1), (-24, -7, 5.5, 0.62, 2), (22, -16, 6.0, 0.42, 3), (8, -26, 3.8, 0.75, 4)):
        nug = pv.stone_poly(x, y, r, r * 0.72, sd, n=6)
        lit = [p for p in nug if (p[0] - x) * pv.LD2[0] + (p[1] - y) * pv.LD2[1] > -0.3 * r] + [(x, y)]
        out += P(pv.scale_about(nug, 1.32), tone("pedra", 0.04), 'opacity="0.8"')            # encaixe escuro
        out += P(nug, tone("minerio", t)) + P(lit, tone("minerio", t + 0.22))
        out += LN((x - r * 0.4, y - r * 0.25), (x + r * 0.05, y - r * 0.55), T("minerio", "highlight"), 1.2)
    out += rim(d, sil, tone("pedra", 1.0), 1.8, 0.85) + occlusion(d, sil, tone("pedra", 0.0), 1.5, 0.9)
    rng = random.Random(12)
    tufts = "".join(pv.blade_tuft(x, 7 - abs(x) * 0.05, 1.0, "grama", 40 + k, (0.25, 0.65))
                    for k, x in enumerate((-30, -12, 12, 30, -44)))
    _ = rng
    a.layer("rock", out)
    a.layer("grass", tufts)
    s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (-0.3, 0.3) for y in (-0.24, 0.24) for z in (0, 40)], 1.0, (36, 10)))
    mark_interactive("rock_ore_a")
    return fit(a), fit(s, centered=False)


# =========================================================================== CULTURAS
def box(cx, cy, sx, sy, z0, h):
    x0, x1, y0, y1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2
    top = [iso(x0, y0, z0 + h), iso(x1, y0, z0 + h), iso(x1, y1, z0 + h), iso(x0, y1, z0 + h)]
    left = [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z0 + h), iso(x0, y1, z0 + h)]
    right = [iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z0 + h), iso(x1, y0, z0 + h)]
    return top, left, right, hull(top + left + right)


def grain_lines(d, face, a0, a1, n, rampname, t, seed, w=0.7, op=0.45):
    """Veios retos entre as arestas a0 e a1 (pares de pontos), recortados na face."""
    rng = random.Random(seed)
    cid = clip(d, f'<polygon points="{pts(face)}"/>')
    out = ""
    for _ in range(n):
        k = rng.uniform(0.1, 0.9)
        s0, s1 = rng.uniform(0, 0.6), rng.uniform(0.2, 0.5)
        p0 = (a0[0][0] + (a0[1][0] - a0[0][0]) * k, a0[0][1] + (a0[1][1] - a0[0][1]) * k)
        p1 = (a1[0][0] + (a1[1][0] - a1[0][0]) * k, a1[0][1] + (a1[1][1] - a1[0][1]) * k)
        q0 = (p0[0] + (p1[0] - p0[0]) * s0, p0[1] + (p1[1] - p0[1]) * s0)
        q1 = (q0[0] + (p1[0] - p0[0]) * s1, q0[1] + (p1[1] - p0[1]) * s1)
        out += LN(q0, q1, tone(rampname, t + rng.uniform(-0.08, 0.08)), w, f'opacity="{op}"')
    return G(out, f'clip-path="url(#{cid})"')


def raised_bed():
    a, s = sprite("plot_raised_bed"), sprite("plot_raised_bed_shadow")
    d = a.defs
    h, t = BED_HALF, 0.055
    i_ = h - t
    otop = [iso(-h, -h, BED_Z), iso(h, -h, BED_Z), iso(h, h, BED_Z), iso(-h, h, BED_Z)]
    in_x = [iso(-i_, -i_, SOIL_Z), iso(-i_, i_, SOIL_Z), iso(-i_, i_, BED_Z), iso(-i_, -i_, BED_Z)]
    in_y = [iso(-i_, -i_, SOIL_Z), iso(i_, -i_, SOIL_Z), iso(i_, -i_, BED_Z), iso(-i_, -i_, BED_Z)]
    soil = [iso(-i_, -i_, SOIL_Z), iso(i_, -i_, SOIL_Z), iso(i_, i_, SOIL_Z), iso(-i_, i_, SOIL_Z)]
    fy = [iso(-h, h, 0), iso(h, h, 0), iso(h, h, BED_Z), iso(-h, h, BED_Z)]
    fx = [iso(h, -h, 0), iso(h, h, 0), iso(h, h, BED_Z), iso(h, -h, BED_Z)]
    out = P(otop, tone("tabua", 0.78))
    out += P(in_x, tone("tabua", 0.3)) + P(in_y, tone("tabua", 0.5))
    out += P(soil, tone("terra", 0.56))
    sid = clip(d, f'<polygon points="{pts(soil)}"/>')
    sd = ""
    for k in range(5):                                   # camalhões ao longo de x
        v = -i_ + (k + 0.5) * (2 * i_) / 5
        ridge = [iso(-i_, v - 0.035, SOIL_Z), iso(i_, v - 0.035, SOIL_Z), iso(i_, v + 0.03, SOIL_Z), iso(-i_, v + 0.03, SOIL_Z)]
        sd += P(ridge, tone("terra", 0.66), 'opacity="0.75"')
        sd += LN(iso(-i_, v + 0.055, SOIL_Z), iso(i_, v + 0.055, SOIL_Z), tone("terra", 0.08), 1.6, 'opacity="0.7"')
    rng = random.Random(77)
    for k in range(14):
        x, y = iso(rng.uniform(-i_, i_), rng.uniform(-i_, i_), SOIL_Z)
        sd += P(pv.stone_poly(x, y, 1.6, 1.0, 900 + k, n=5), tone("terra", rng.uniform(0.5, 0.85)))
    sd += P([iso(-i_, -i_, SOIL_Z), iso(i_, -i_, SOIL_Z), iso(i_, -i_ + 0.08, SOIL_Z), iso(-i_, -i_ + 0.08, SOIL_Z)],
            tone("terra", 0.0), 'opacity="0.45"')       # sombra da borda de trás
    out += G(sd, f'clip-path="url(#{sid})"')
    out += P(fy, tone("tabua", 0.58)) + P(fx, tone("tabua", 0.28))
    out += LN(iso(-h, h, BED_Z / 2), iso(h, h, BED_Z / 2), tone("tabua", 0.1), 1.0, 'opacity="0.7"')
    out += LN(iso(h, -h, BED_Z / 2), iso(h, h, BED_Z / 2), tone("tabua", 0.0), 1.0, 'opacity="0.7"')
    out += grain_lines(d, fy, (iso(-h, h, 1), iso(-h, h, BED_Z - 1)), (iso(h, h, 1), iso(h, h, BED_Z - 1)), 9, "tabua", 0.35, 5)
    out += grain_lines(d, fx, (iso(h, -h, 1), iso(h, -h, BED_Z - 1)), (iso(h, h, 1), iso(h, h, BED_Z - 1)), 7, "tabua", 0.12, 6)
    for (px, py) in ((h, h), (-h, h), (h, -h)):          # mourões dos cantos
        tp, lf, rt, _ = box(px - 0.035 * (1 if px > 0 else -1), py - 0.035 * (1 if py > 0 else -1), 0.075, 0.075, 0, BED_Z + 4)
        out += P(lf, tone("tabua", 0.62)) + P(rt, tone("tabua", 0.3)) + P(tp, tone("tabua", 0.88))
    for u in (-0.2, 0.2):
        x, y = iso(u, h, BED_Z * 0.75)
        out += P(pv.stone_poly(x, y, 0.9, 0.9, int(u * 100) + 5, n=5), T("ferro", "shadow"))
    sil = hull(otop + fy + fx + [iso(h, h, BED_Z + 4), iso(-h + 0.07, h, BED_Z + 4), iso(h, -h + 0.07, BED_Z + 4)])
    out += rim(d, otop + [iso(-h, h, 0)][:0], tone("tabua", 1.0), 1.3, 0.5)
    out += occlusion(d, sil, tone("tabua", 0.0), 1.2, 0.7)
    a.layer("bed", out)
    s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (-h, h) for y in (-h, h) for z in (0, BED_Z)], 0.9, (40, 12)))
    mark_interactive("plot_raised_bed")
    return fit(a), fit(s, centered=False)


CLUMPS = sorted([(u, v) for u in (-0.21, 0.0, 0.21) for v in (-0.21, 0.0, 0.21)], key=lambda p: (p[0] + p[1], p[0]))


def ear(base, topp, length, width, col_l, col_r, awns=None):
    dx, dy = topp[0] - base[0], topp[1] - base[1]
    m = math.hypot(dx, dy) or 1
    ux, uy = dx / m, dy / m
    nx, ny = -uy, ux
    b = (topp[0] - ux * length * 0.25, topp[1] - uy * length * 0.25)
    tip = (topp[0] + ux * length * 0.75, topp[1] + uy * length * 0.75)
    m1 = (topp[0] + ux * length * 0.1, topp[1] + uy * length * 0.1)
    m2 = (topp[0] + ux * length * 0.45, topp[1] + uy * length * 0.45)
    L1 = (m1[0] + nx * width / 2, m1[1] + ny * width / 2)
    L2 = (m2[0] + nx * width * 0.4, m2[1] + ny * width * 0.4)
    R1 = (m1[0] - nx * width / 2, m1[1] - ny * width / 2)
    R2 = (m2[0] - nx * width * 0.4, m2[1] - ny * width * 0.4)
    out = P([b, L1, L2, tip, R2, R1], col_r) + P([b, L1, L2, tip], col_l)
    if awns:
        for k in (-1, 0, 1):
            out += LN(tip, (tip[0] + ux * 5 + nx * k * 1.6, tip[1] + uy * 5 + ny * k * 1.6), awns, 0.6, 'opacity="0.7"')
    return out


def wheat_clump(u, v, stage, seed):
    rng = random.Random(seed)
    bx, by = iso(u, v, SOIL_Z)
    out = P(pv.stone_poly(bx + 1, by + 1, 6, 2.6, seed, n=6), tone("terra", 0.05), 'opacity="0.55"')
    if stage == 1:                                        # broto: 5 folhinhas pontudas, verde vivo
        for k in range(5):
            lx = bx + (k - 2) * 1.8 + rng.uniform(-0.5, 0.5)
            hgt = rng.uniform(8, 12)
            tip = (lx + (k - 2) * 1.6 + rng.uniform(-1, 1), by - hgt)
            out += P([(lx - 1.2, by), tip, (lx + 1.2, by)], tone("trigo_verde", 0.55 + 0.1 * (2 - k) / 2 + rng.uniform(0, 0.1)))
        return out
    n = 9
    hmax = 28 if stage == 2 else 40
    for k in range(n):                                    # folhas/colmos em leque
        lean = (k - (n - 1) / 2) * 2.0 + rng.uniform(-0.8, 0.8)
        hgt = hmax * rng.uniform(0.78, 1.0)
        top_ = (bx + lean * (1.2 if stage == 2 else 0.8), by - hgt)
        if stage == 2:
            mid = (bx + lean * 0.5 + rng.uniform(-1, 1), by - hgt * 0.5)
            col = tone("trigo_verde", 0.42 + 0.3 * (1 - k / (n - 1)) + rng.uniform(-0.05, 0.05))
            out += P([(bx - 1.4 + lean * 0.1, by), mid, top_, (mid[0] + 1.8, mid[1] + 1), (bx + 1.4 + lean * 0.1, by)], col)
        else:
            out += LN((bx + lean * 0.15, by), top_, tone("trigo", 0.3 + 0.15 * rng.random()), 1.1)
    heads = 4 if stage == 2 else 8
    for k in range(heads):                                # espigas: fusos angulares agrupados no topo
        f = (k - (heads - 1) / 2) / max(1, (heads - 1) / 2)
        lean = f * (5.5 if stage == 3 else 4) + rng.uniform(-1, 1)
        hgt = hmax * rng.uniform(0.86, 1.0) - (2 if stage == 3 else 4)
        top_ = (bx + lean, by - hgt)
        lit = 0.62 - 0.25 * f + rng.uniform(-0.05, 0.05)
        if stage == 2:
            out += ear((bx + lean * 0.3, by), top_, 8, 2.6, tone("trigo_verde", lit + 0.25), tone("trigo_verde", lit))
        else:
            out += ear((bx + lean * 0.3, by), top_, 12, 3.8, tone("trigo", lit + 0.2 + (0.12 if f < -0.4 else 0)),
                       tone("trigo", lit - 0.08), awns=tone("trigo", 0.75))
    return out


def crop_stage(stage: int):
    name = f"crop_wheat_s{stage}"
    a = sprite(name)
    a.layer("plants", "".join(wheat_clump(u, v, stage, 100 * stage + k) for k, (u, v) in enumerate(CLUMPS)))
    out = [fit(a)]
    if stage > 1:
        s = sprite(name + "_shadow")
        hz = 28 if stage == 2 else 40
        s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (-0.3, 0.3) for y in (-0.3, 0.3) for z in (SOIL_Z, SOIL_Z + hz)], 0.7))
        out.append(fit(s, centered=False))
    mark_interactive(name)
    return out


# =========================================================================== PROPS
def straw(d, face, axis_a, axis_b, n, t, seed):
    """Palha: traços curtos paralelos ao eixo do fardo, recortados na face."""
    rng = random.Random(seed)
    cid = clip(d, f'<polygon points="{pts(face)}"/>')
    out = ""
    (a0, a1), (b0, b1) = axis_a, axis_b
    for _ in range(n):
        k, s0 = rng.uniform(0, 1), rng.uniform(-0.1, 0.9)
        L = rng.uniform(0.12, 0.3)
        p = lambda s: (a0[0] + (a1[0] - a0[0]) * s + (b0[0] - a0[0]) * k, a0[1] + (a1[1] - a0[1]) * s + (b0[1] - a0[1]) * k)  # noqa: E731
        out += LN(p(s0), p(s0 + L), tone("feno", t + rng.uniform(-0.16, 0.16)), 1.0, 'opacity="0.6"')
    return G(out, f'clip-path="url(#{cid})"')


def bale(d, cx, cy, sx, sy, z0, h, along, seed):
    top, left, right, sil = box(cx, cy, sx, sy, z0, h)
    x0, x1, y0, y1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2
    out = P(top, tone("feno", 0.84)) + P(left, tone("feno", 0.6)) + P(right, tone("feno", 0.26))
    if along == "x":
        out += straw(d, top, (iso(x0, y0, z0 + h), iso(x1, y0, z0 + h)), (iso(x0, y1, z0 + h), iso(x1, y1, z0 + h)), 22, 0.74, seed)
        out += straw(d, left, (iso(x0, y1, z0 + h), iso(x1, y1, z0 + h)), (iso(x0, y1, z0), iso(x1, y1, z0)), 16, 0.54, seed + 1)
        rng = random.Random(seed + 2)                     # ponta cortada (+x): pontilhado
        cid = clip(d, f'<polygon points="{pts(right)}"/>')
        dots = "".join(P(pv.stone_poly(*iso(x1, rng.uniform(y0, y1), rng.uniform(z0 + 1, z0 + h - 1)), 1.1, 0.9, seed + k, n=4),
                         tone("feno", rng.uniform(0.05, 0.5))) for k in range(26))
        out += G(dots, f'clip-path="url(#{cid})"')
        bands = [x0 + sx * 0.28, x0 + sx * 0.72]
        for bxx in bands:
            out += PL([iso(bxx, y0, z0 + h), iso(bxx, y1, z0 + h), iso(bxx, y1, z0)], tone("linho", 0.3), 1.2)
    else:
        out += straw(d, top, (iso(x0, y0, z0 + h), iso(x0, y1, z0 + h)), (iso(x1, y0, z0 + h), iso(x1, y1, z0 + h)), 22, 0.74, seed)
        out += straw(d, right, (iso(x1, y0, z0 + h), iso(x1, y1, z0 + h)), (iso(x1, y0, z0), iso(x1, y1, z0)), 14, 0.3, seed + 1)
        rng = random.Random(seed + 2)
        cid = clip(d, f'<polygon points="{pts(left)}"/>')
        dots = "".join(P(pv.stone_poly(*iso(rng.uniform(x0, x1), y1, rng.uniform(z0 + 1, z0 + h - 1)), 1.1, 0.9, seed + k, n=4),
                         tone("feno", rng.uniform(0.25, 0.75))) for k in range(26))
        out += G(dots, f'clip-path="url(#{cid})"')
        for byy in (y0 + sy * 0.28, y0 + sy * 0.72):
            out += PL([iso(x0, byy, z0 + h), iso(x1, byy, z0 + h), iso(x1, byy, z0)], tone("linho", 0.3), 1.2)
    out += LN(left[3], left[2], tone("feno", 0.95), 1.0, 'opacity="0.6"')
    return out, sil


def hay_stack():
    a, s = sprite("prop_hay_bales"), sprite("prop_hay_bales_shadow")
    d = a.defs
    H = 17
    b1, s1 = bale(d, 0.02, -0.12, 0.5, 0.22, 0, H, "x", 1)
    b2, s2 = bale(d, 0.02, 0.12, 0.5, 0.22, 0, H, "x", 2)
    b3, s3 = bale(d, 0.0, 0.0, 0.22, 0.48, H, H, "y", 3)
    sil = hull(s1 + s2 + s3)
    loose = ""
    rng = random.Random(9)
    for k in range(14):                                   # palha solta no chão
        x, y = iso(rng.uniform(-0.34, 0.34), rng.uniform(0.2, 0.36))
        ang = rng.uniform(-0.5, 0.5)
        loose += LN((x, y), (x + 6 * math.cos(ang), y + 2 * math.sin(ang)), tone("feno", rng.uniform(0.4, 0.85)), 1.0)
    a.layer("bales", b1 + b2 + b3 + rim(d, sil, tone("feno", 1.0), 1.8, 0.75) + occlusion(d, sil, tone("feno", 0.0), 1.6, 0.85))
    a.layer("loose", loose)
    s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (-0.24, 0.26) for y in (-0.25, 0.25) for z in (0, H)]
                                     + [wpt(x, y, 2 * H) for x in (-0.11, 0.11) for y in (-0.24, 0.24)], 1.0, (34, 10)))
    mark_interactive("prop_hay_bales")
    return fit(a), fit(s, centered=False)


def crate():
    a, s = sprite("prop_crate"), sprite("prop_crate_shadow")
    d = a.defs
    sx, sy, H = 0.46, 0.34, 24
    top, left, right, sil = box(0, 0, sx, sy, 0, H)
    x0, x1, y0, y1 = -sx / 2, sx / 2, -sy / 2, sy / 2
    out = P(top, tone("tabua", 0.06)) + P(left, tone("tabua", 0.08)) + P(right, tone("tabua", 0.04))
    rng = random.Random(4)
    ap = ""                                               # maçãs dentro (aparecem pelo topo)
    for k in range(11):
        u, v = rng.uniform(x0 + 0.06, x1 - 0.06), rng.uniform(y0 + 0.05, y1 - 0.05)
        ap += apple(*iso(u, v, H - 1 + rng.uniform(0, 3)), 3.6)
    out += G(ap, f'clip-path="url(#{clip(d, f"<polygon points=\'{pts(top)}\'/>")})"')
    for z0, z1 in ((1, 7), (9, 15), (17, 23)):           # ripas com frestas
        out += P([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], tone("tabua", 0.74 + rng.uniform(-0.04, 0.04)))
        out += P([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], tone("tabua", 0.3 + rng.uniform(-0.04, 0.04)))
        out += LN(iso(x0, y1, z1), iso(x1, y1, z1), tone("tabua", 0.85), 0.8, 'opacity="0.6"')
    for (px, py, face) in ((x0, y1, "l"), (x1, y1, "c"), (x1, y0, "r")):     # cantoneiras
        if face in "lc":
            out += P([iso(px + (0.05 if face == "l" else -0.05), y1, 0), iso(px, y1, 0), iso(px, y1, H), iso(px + (0.05 if face == "l" else -0.05), y1, H)],
                     tone("tabua", 0.72))
        if face in "cr":
            out += P([iso(x1, py - (0.05 if face == "c" else -0.05), 0), iso(x1, py, 0), iso(x1, py, H), iso(x1, py - (0.05 if face == "c" else -0.05), H)],
                     tone("tabua", 0.4))
    rimtop = [iso(x0, y0, H), iso(x1, y0, H), iso(x1, y1, H), iso(x0, y1, H)]
    out += PL(rimtop + [rimtop[0]], tone("tabua", 0.8), 1.6)
    out += rim(d, sil, tone("tabua", 1.0), 1.8, 0.75) + occlusion(d, sil, tone("tabua", 0.0), 1.4, 0.8)
    a.layer("crate", out)
    s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (0, H)], 1.0, (30, 9)))
    mark_interactive("prop_crate")
    return fit(a), fit(s, centered=False)


FENCE_PIECES = {"x": XP | XN, "y": YP | YN, "corner_n": XP | YP, "corner_e": XN | YP,
                "corner_w": XP | YN, "corner_s": XN | YN, "end_xn": XN, "end_xp": XP}
FENCE_CANVAS = (160, 108, 80, 64)


def rail(b, z, th=5.0, half=0.032):
    """Trilho do centro até além da borda: cor chapada por face e veio reto (emenda no vizinho)."""
    E = 0.62
    if b in (XP, XN):
        s_ = 1 if b == XP else -1
        u0, u1 = 0.0, s_ * E
        top = [iso(u0, -half, z + th), iso(u1, -half, z + th), iso(u1, half, z + th), iso(u0, half, z + th)]
        side = [iso(u0, half, z + th), iso(u1, half, z + th), iso(u1, half, z), iso(u0, half, z)]
        col = tone("madeira_cinza", 0.55)
        g0, g1 = iso(u0, half, z + th * 0.45), iso(u1, half, z + th * 0.45)
    else:
        s_ = 1 if b == YP else -1
        v0, v1 = 0.0, s_ * E
        top = [iso(-half, v0, z + th), iso(-half, v1, z + th), iso(half, v1, z + th), iso(half, v0, z + th)]
        side = [iso(half, v0, z + th), iso(half, v1, z + th), iso(half, v1, z), iso(half, v0, z)]
        col = tone("madeira_cinza", 0.3)
        g0, g1 = iso(half, v0, z + th * 0.45), iso(half, v1, z + th * 0.45)
    return (P(side, col) + P(top, tone("madeira_cinza", 0.8)) + LN(g0, g1, tone("madeira_cinza", 0.15), 0.8, 'opacity="0.6"')
            + LN(side[0], side[1], tone("madeira_cinza", 0.95), 0.8, 'opacity="0.6"')
            + LN(side[3], side[2], tone("madeira_cinza", 0.05), 0.8, 'opacity="0.6"'))


def fence(key: str):
    mask = FENCE_PIECES[key]
    W_, H_, ax, ay = FENCE_CANVAS
    a = Asset(f"prop_fence_{key}", W_, H_, (ax, ay))
    d = a.defs
    right = clip(d, f'<rect x="0" y="{-ay}" width="33" height="{H_}"/>')
    left = clip(d, f'<rect x="-33" y="{-ay}" width="33" height="{H_}"/>')
    clip_of = {XP: right, YN: right, XN: left, YP: left}
    back = [b for b in (XN, YN) if mask & b]
    front = [b for b in (XP, YP) if mask & b]

    def rails(dirs):
        return "".join(f'<g clip-path="url(#{clip_of[b]})">{rail(b, 12)}{rail(b, 28)}</g>' for b in dirs)
    a.layer("rails_back", rails(back))
    ph = 42
    top, lf, rt, sil = box(0, 0, 0.085, 0.085, 0, ph)
    cut = [iso(-0.0425, -0.0425, ph + 3), iso(0.0425, -0.0425, ph + 1), iso(0.0425, 0.0425, ph - 2), iso(-0.0425, 0.0425, ph)]
    lf2 = [lf[0], lf[1], cut[2], cut[3]]
    rt2 = [rt[0], rt[1], cut[2], cut[1]]
    post = P(lf2, tone("madeira_cinza", 0.56)) + P(rt2, tone("madeira_cinza", 0.26)) + P(cut, tone("madeira_cinza", 0.86))
    post += grain_lines(d, lf2, (lf[0], lf[3]), (lf[1], lf[2]), 3, "madeira_cinza", 0.35, 3 + mask)
    post += LN(iso(0.0425, 0.0425, 0), iso(0.0425, 0.0425, ph - 2), tone("madeira_cinza", 0.9), 0.8, 'opacity="0.5"')
    a.layer("post", post)
    a.layer("rails_front", rails(front))
    s = Asset(f"prop_fence_{key}_shadow", 8, 8, (4, 4))
    sh = pv.soft_shadow([wpt(x, y, z) for x in (-0.04, 0.04) for y in (-0.04, 0.04) for z in (0, ph)], 0.9)
    col = T("sombra", "cast")
    for b in front + back:                               # sombra do trilho: segmento centro -> borda
        e = {XP: (0.5, 0), XN: (-0.5, 0), YP: (0, 0.5), YN: (0, -0.5)}[b]
        for z in (14.5, 30.5):
            p0 = pv.cast_points([wpt(0, 0, z)])[0]
            p1 = pv.cast_points([wpt(e[0], e[1], z)])[0]
            sh += LN(p0, p1, col, 3.0, 'opacity="0.18"')
    s.layer("shadow", sh)
    return a, fit(s, centered=False)


# =========================================================================== CONSTRUÇÃO
def barn():
    """Galpão 3×3: tábuas verticais com mata-juntas, fundação de pedra, porta dupla com travessas
    em Z na parede +y (clara), oitão +x (sombra) com janela de feno, telhado de telhas de barro."""
    a, s = sprite("bld_barn_small", (3, 3)), sprite("bld_barn_small_shadow", (3, 3))
    d = a.defs
    hx, hy, WZ, ZR, ov, ovx = 1.2, 1.06, 112, 198, 0.13, 0.1
    EZ = WZ - (ZR - WZ) * ov / hy                         # altura da ponta do beiral
    rng = random.Random(3)
    wall_y = [iso(-hx, hy, 0), iso(hx, hy, 0), iso(hx, hy, WZ), iso(-hx, hy, WZ)]
    gable = [iso(hx, -hy, 0), iso(hx, hy, 0), iso(hx, hy, WZ), iso(hx, 0, ZR - 3), iso(hx, -hy, WZ)]

    def gz(y):
        return WZ + (ZR - 3 - WZ) * (1 - abs(y) / hy)
    out = ""
    # parede +y: tábuas verticais com tom variado (ΔL pequeno) e mata-juntas
    nb = 22
    for i in range(nb):
        x0, x1 = -hx + 2 * hx * i / nb, -hx + 2 * hx * (i + 1) / nb
        out += P([iso(x0, hy, 0), iso(x1, hy, 0), iso(x1, hy, WZ), iso(x0, hy, WZ)], tone("tabua", 0.6 + rng.uniform(-0.05, 0.05)))
        out += P([iso(x1 - 0.012, hy, 0), iso(x1 + 0.012, hy, 0), iso(x1 + 0.012, hy, WZ), iso(x1 - 0.012, hy, WZ)], tone("tabua", 0.72))
        out += LN(iso(x1 + 0.014, hy, 0), iso(x1 + 0.014, hy, WZ), tone("tabua", 0.25), 0.8, 'opacity="0.6"')
    # oitão +x: tábuas na sombra
    ng = 20
    for i in range(ng):
        y0, y1 = -hy + 2 * hy * i / ng, -hy + 2 * hy * (i + 1) / ng
        ym = (y0 + y1) / 2
        out += P([iso(hx, y0, 0), iso(hx, y1, 0), iso(hx, y1, gz(y1)), iso(hx, ym, gz(ym)), iso(hx, y0, gz(y0))],
                 tone("tabua", 0.3 + rng.uniform(-0.04, 0.04)))
        out += LN(iso(hx, y1, 0), iso(hx, y1, gz(y1)), tone("tabua", 0.08), 0.8, 'opacity="0.6"')
    out += grain_lines(d, wall_y, (iso(-hx, hy, 4), iso(-hx, hy, WZ - 4)), (iso(hx, hy, 4), iso(hx, hy, WZ - 4)), 30, "tabua", 0.42, 21, 0.7, 0.4)
    # fundação de pedra
    for side in ("y", "x"):
        n = 14
        for i in range(n):
            t0, t1 = -1 + 2 * i / n, -1 + 2 * (i + 1) / n
            zt = rng.uniform(8, 11)
            if side == "y":
                q = [iso(hx * t0, hy + 0.004, 0), iso(hx * t1, hy + 0.004, 0), iso(hx * t1, hy + 0.004, zt), iso(hx * t0, hy + 0.004, zt + 1.5)]
                col = tone("pedra", 0.55 + rng.uniform(-0.1, 0.1))
            else:
                q = [iso(hx + 0.004, hy * t0, 0), iso(hx + 0.004, hy * t1, 0), iso(hx + 0.004, hy * t1, zt), iso(hx + 0.004, hy * t0, zt + 1.5)]
                col = tone("pedra", 0.28 + rng.uniform(-0.08, 0.08))
            out += P(q, col, f'stroke="{tone("pedra", 0.05)}" stroke-width="0.8"')
    # sujeira perto do chão e sombra do beiral
    out += P(wall_y, pv.ugrad(d, [(0, T("tabua", "deep"), 0.6), (0.3, T("tabua", "deep"), 0.0)], iso(0, hy, WZ), iso(0, hy, WZ - 60)))
    out += P(wall_y, pv.ugrad(d, [(0, T("tabua", "deep"), 0.45), (0.25, T("tabua", "deep"), 0.0)], iso(0, hy, 0), iso(0, hy, 40)))
    out += P(gable, pv.ugrad(d, [(0, T("tabua", "deep"), 0.4), (0.3, T("tabua", "deep"), 0.0)], iso(hx, 0, 0), iso(hx, 0, 40)))
    # porta dupla
    DX, DZ = 0.36, 104
    out += P([iso(-DX - 0.05, hy, 0), iso(DX + 0.05, hy, 0), iso(DX + 0.05, hy, DZ + 6), iso(-DX - 0.05, hy, DZ + 6)], tone("tabua", 0.82))
    for side in (-1, 1):
        u0, u1 = (-DX, -0.008) if side < 0 else (0.008, DX)
        for i in range(4):
            a0, a1 = u0 + (u1 - u0) * i / 4, u0 + (u1 - u0) * (i + 1) / 4
            out += P([iso(a0, hy, 0), iso(a1, hy, 0), iso(a1, hy, DZ), iso(a0, hy, DZ)], tone("tabua", 0.4 + rng.uniform(-0.04, 0.04)),
                     f'stroke="{tone("tabua", 0.12)}" stroke-width="0.7"')
        for zz in (12, DZ - 16):
            out += P([iso(u0, hy, zz), iso(u1, hy, zz), iso(u1, hy, zz + 7), iso(u0, hy, zz + 7)], tone("tabua", 0.58))
        z_lo, z_hi = (19, DZ - 16) if side < 0 else (DZ - 16, 19)
        out += P([iso(u0, hy, z_lo), iso(u0, hy, z_lo + 7), iso(u1, hy, z_hi + 7), iso(u1, hy, z_hi)], tone("tabua", 0.55))
        hinge_u = u0 + 0.02 if side < 0 else u1 - 0.1
        for zz in (14, DZ - 14):
            out += P([iso(hinge_u, hy, zz), iso(hinge_u + 0.08, hy, zz), iso(hinge_u + 0.08, hy, zz + 3), iso(hinge_u, hy, zz + 3)], tone("ferro", 0.3))
    out += P([iso(-DX, hy, 0), iso(DX, hy, 0), iso(DX, hy, DZ), iso(-DX, hy, DZ)],
             pv.ugrad(d, [(0, T("tabua", "deep"), 0.55), (0.35, T("tabua", "deep"), 0.0)], iso(0, hy, DZ), iso(0, hy, DZ - 50)))
    # janela na parede +y e porta de feno no oitão
    for (u, z0, z1, w) in ((0.82, 52, 80, 0.14),):
        out += P([iso(u - w - 0.03, hy, z0 - 4), iso(u + w + 0.03, hy, z0 - 4), iso(u + w + 0.03, hy, z1 + 4), iso(u - w - 0.03, hy, z1 + 4)], tone("tabua", 0.85))
        out += P([iso(u - w, hy, z0), iso(u + w, hy, z0), iso(u + w, hy, z1), iso(u - w, hy, z1)], tone("vidro", 0.25))
        out += P([iso(u - w, hy, z1 - 8), iso(u + w * 0.2, hy, z1), iso(u - w, hy, z1)], tone("vidro", 0.75), 'opacity="0.55"')
        out += LN(iso(u, hy, z0), iso(u, hy, z1), tone("tabua", 0.85), 1.6) + LN(iso(u - w, hy, (z0 + z1) / 2), iso(u + w, hy, (z0 + z1) / 2), tone("tabua", 0.85), 1.6)
    hz0, hz1, hw = 128, 166, 0.2
    out += P([iso(hx, -hw - 0.04, hz0 - 4), iso(hx, hw + 0.04, hz0 - 4), iso(hx, hw + 0.04, hz1 + 3), iso(hx, -hw - 0.04, hz1 + 3)], tone("tabua", 0.5))
    out += P([iso(hx, -hw, hz0), iso(hx, hw, hz0), iso(hx, hw, hz1), iso(hx, -hw, hz1)], tone("tabua", 0.16))
    out += LN(iso(hx, -hw, hz0), iso(hx, hw, hz1), tone("tabua", 0.4), 2.2) + LN(iso(hx, 0, hz0), iso(hx, 0, hz1), tone("tabua", 0.38), 1.6)
    out += LN(iso(hx, -0.06, hz1 + 14), iso(hx, 0.3, hz1 + 14), tone("ferro", 0.25), 2.0)          # viga da roldana
    # telhado: água de trás (filete), água da frente com fiadas de telhas
    rb = [iso(-hx - ovx, 0, ZR + 2), iso(hx + ovx, 0, ZR + 2), iso(hx + ovx, -hy - ov, EZ), iso(-hx - ovx, -hy - ov, EZ)]
    rf = [iso(-hx - ovx, 0, ZR + 2), iso(hx + ovx, 0, ZR + 2), iso(hx + ovx, hy + ov, EZ), iso(-hx - ovx, hy + ov, EZ)]
    out += P(rb, tone("telha", 0.2))
    out += P(rf, tone("telha", 0.5))
    rid = clip(d, f'<polygon points="{pts(rf)}"/>')
    X0, X1, Y1 = -hx - ovx, hx + ovx, hy + ov

    def rz(y):
        return ZR + 2 - (ZR + 2 - EZ) * (y / Y1)
    rows = ""
    nrows, ncol = 12, 30
    for r_ in range(nrows):
        v0, v1 = Y1 * r_ / nrows, Y1 * (r_ + 1) / nrows
        off = 0.5 * (r_ % 2)
        for c_ in range(-1, ncol + 1):
            u0 = X0 + (X1 - X0) * (c_ + off) / ncol
            u1 = X0 + (X1 - X0) * (c_ + off + 1) / ncol
            t = 0.5 + 0.08 * (1 - c_ / ncol) + rng.uniform(-0.06, 0.06) + 0.05 * (r_ / nrows)
            q = [iso(u0, v0, rz(v0)), iso(u1, v0, rz(v0)), iso(u1, v1 + 0.01, rz(v1 + 0.01)), iso(u0, v1 + 0.01, rz(v1 + 0.01))]
            rows += P(q, tone("telha", t))
            rows += LN(iso(u1, v0, rz(v0)), iso(u1, v1, rz(v1)), tone("telha", 0.12), 0.6, 'opacity="0.45"')
        rows += LN(iso(X0, v1, rz(v1)), iso(X1, v1, rz(v1)), tone("telha", 0.05), 1.4, 'opacity="0.65"')
        rows += LN(iso(X0, v1 - 0.01, rz(v1 - 0.01)), iso(X1, v1 - 0.01, rz(v1 - 0.01)), tone("telha", 0.9), 0.7, 'opacity="0.35"')
    for k in range(6):                                    # musgo discreto perto do beiral
        u, v = rng.uniform(X0 + 0.2, X1 - 0.2), rng.uniform(Y1 * 0.6, Y1 * 0.95)
        x, y = iso(u, v, rz(v))
        rows += P(pv.leaf_clump(x, y, rng.uniform(4, 7), 700 + k, n=9, squash=0.5), tone("arbusto", 0.45), 'opacity="0.35"')
    rows += P(rf, pv.ugrad(d, [(0, T("telha", "deep"), 0.0), (1, T("telha", "deep"), 0.35)], iso(X0, Y1 / 2, rz(Y1 / 2)), iso(X1, Y1 / 2, rz(Y1 / 2))))
    out += G(rows, f'clip-path="url(#{rid})"')
    cap = [iso(X0, -0.03, ZR + 5), iso(X1, -0.03, ZR + 5), iso(X1, 0.05, ZR + 1), iso(X0, 0.05, ZR + 1)]
    out += P(cap, tone("telha", 0.35))
    for k in range(16):
        u = X0 + (X1 - X0) * k / 16
        out += LN(iso(u, -0.03, ZR + 5), iso(u, 0.05, ZR + 1), tone("telha", 0.1), 0.8, 'opacity="0.6"')
    out += LN(iso(X0, -0.03, ZR + 5), iso(X1, -0.03, ZR + 5), tone("telha", 0.85), 1.0, 'opacity="0.6"')
    fascia = [iso(X0, Y1, EZ), iso(X1, Y1, EZ), iso(X1, Y1, EZ - 5), iso(X0, Y1, EZ - 5)]
    verge = [iso(X1, 0, ZR + 3), iso(X1, Y1, EZ), iso(X1, Y1, EZ - 5), iso(X1, 0, ZR - 2)]
    verge_b = [iso(X1, 0, ZR + 3), iso(X1, -hy - ov, EZ), iso(X1, -hy - ov, EZ - 5), iso(X1, 0, ZR - 2)]
    out += P(verge_b, tone("tabua", 0.18)) + P(fascia, tone("tabua", 0.45)) + P(verge, tone("tabua", 0.25))
    out += P([iso(-hx, hy, WZ), iso(hx, hy, WZ), iso(hx, hy, WZ - 10), iso(-hx, hy, WZ - 10)],
             pv.ugrad(d, [(0, T("sombra", "contact"), 0.5), (1, T("sombra", "contact"), 0.0)], iso(0, hy, WZ), iso(0, hy, WZ - 10)))
    # realce/oclusão nas formas reais (a envoltória convexa pintaria filetes no vazio ao lado do telhado)
    out += rim(d, rf, tone("telha", 1.0), 1.6, 0.4) + rim(d, wall_y, tone("tabua", 1.0), 1.4, 0.35)
    out += occlusion(d, gable, tone("tabua", 0.0), 1.4, 0.6)
    a.layer("building", out)
    pw = [wpt(x, y, 0) for x in (-hx, hx) for y in (-hy, hy)] + [wpt(x, y, EZ) for x in (X0, X1) for y in (-Y1, Y1)]
    pw += [wpt(x, 0, ZR) for x in (X0, X1)]
    s.layer("shadow", pv.soft_shadow(pw, 1.0))
    mark_interactive("bld_barn_small")
    return fit(a), fit(s, centered=False)


# =========================================================================== PERSONAGEM
def avatar():
    """Fazendeiro adulto (_se): ~6 cabeças, mandíbula marcada, barba curta, olhos de traço."""
    a, s = sprite("avatar_base_idle_se", (0.3, 0.3)), sprite("avatar_base_idle_se_shadow", (0.3, 0.3))
    d = a.defs
    out = ""

    def part(poly, rmp, lo=0.25, hi=0.75, ang=(0, 0, 1, 0.25), do_rim=True, extra=""):
        o = P(poly, pv.grad(d, [tone(rmp, hi), tone(rmp, (lo + hi) / 2), tone(rmp, lo)], *ang), extra)
        if do_rim:
            o += rim(d, poly, tone(rmp, min(1.0, hi + 0.25)), 1.2, 0.55)
        return o
    out += part([(-8.5, 1), (-1.5, 1), (-1.6, -3), (-2.4, -9), (-7.6, -9), (-8.8, -3)], "bota", 0.1, 0.6)
    out += part([(1.8, 1), (9.2, 1.5), (9, -2.5), (7.6, -9), (2.4, -9), (1.6, -3)], "bota", 0.05, 0.45, do_rim=False)
    legs = [(-7.6, -8), (-2.4, -8), (-0.5, -36), (0.5, -36), (2.4, -8), (7.6, -8), (8.6, -46), (-8.4, -46)]
    out += part(legs, "calca", 0.08, 0.7)
    for pth in ([(-5, -12), (-4.5, -24)], [(5.5, -14), (5, -26)], [(-3, -40), (-1, -36)]):
        out += PL(pth, tone("calca", 0.0), 0.8, 'opacity="0.6"')
    torso = [(-9, -46), (9, -46), (10, -58), (12.5, -67), (8, -70), (3, -71), (-3, -71), (-8, -70), (-12.5, -67), (-10, -58)]
    out += part(torso, "linho", 0.3, 0.95)
    out += part([(-9.2, -44), (-2.5, -44), (-3, -60), (-4.4, -70), (-8, -70), (-12.3, -67), (-10.1, -58)], "colete", 0.3, 0.95)
    out += part([(9.2, -44), (2.5, -44), (3, -60), (4.4, -70), (8, -70), (12.3, -67), (10.1, -58)], "colete", 0.0, 0.45, do_rim=False)
    out += P([(-9.3, -46), (9.3, -46), (9.3, -48.6), (-9.3, -48.6)], tone("bota", 0.3))
    out += P([(-1.6, -46.2), (1.6, -46.2), (1.6, -48.4), (-1.6, -48.4)], tone("ferro", 0.7))
    for sgn in (-1, 1):
        def m(p):
            return [(sgn * x, y) for x, y in p]
        lo_, hi_ = (0.3, 0.95) if sgn < 0 else (0.15, 0.55)
        out += part(m([(-12.5, -67), (-8.6, -68), (-9.4, -57), (-10, -50), (-14.6, -50), (-15.3, -58)]), "linho", lo_, hi_, do_rim=sgn < 0)
        out += PL(m([(-11, -60), (-13, -56)]), tone("linho", 0.2), 0.8, 'opacity="0.7"')
        out += P(m([(-14.7, -50.5), (-9.9, -50.5), (-10, -48.4), (-14.8, -48.4)]), tone("linho", 0.5))
        out += part(m([(-14.5, -49), (-10, -49), (-10.6, -39.5), (-14, -39.5)]), "pele", 0.3 if sgn > 0 else 0.45, 0.95, do_rim=sgn < 0)
        out += part(m([(-14, -40), (-10.6, -40), (-10.4, -35.5), (-12, -34), (-14.4, -35.8)]), "pele", 0.25, 0.75, do_rim=False)
    out += P([(-3, -70), (3, -70), (3, -74.5), (-3, -74.5)], tone("pele", 0.3))
    head = [(-5.6, -74.4), (-1.7, -72.6), (2.7, -72.6), (5.7, -75.2), (6.4, -80), (6.1, -84.8), (3.6, -87.2), (-3.6, -87.2),
            (-6.1, -84.8), (-6.5, -80)]
    out += P([(-6.4, -82), (-7.8, -81), (-7.6, -77.8), (-6.2, -77.4)], tone("pele", 0.45))
    out += part(head, "pele", 0.3, 0.95, (0, 0, 1, 0.1))
    hid = clip(d, f'<polygon points="{pts(head)}"/>')
    face = P([(-8, -91), (8, -91), (8, -82.4), (-8, -82)], tone("pele", 0.35), 'opacity="0.7"')          # sombra da aba
    face += P([(-6.8, -78), (-5.4, -73.6), (-1.7, -72.4), (2.7, -72.4), (5.9, -74.8), (6.7, -78.4), (4.6, -77.2), (0.5, -77.8),
               (-3.6, -77.2)], tone("cabelo", 0.3), 'opacity="0.92"')                              # barba curta
    face += LN((-3.4, -81.0), (-1.5, -81.1), tone("cabelo", 0.0), 1.0) + LN((2.0, -81.1), (3.9, -81.0), tone("cabelo", 0.0), 1.0)
    face += LN((-3.6, -83.0), (-1.3, -83.4), tone("cabelo", 0.2), 0.8) + LN((1.8, -83.4), (4.1, -83.0), tone("cabelo", 0.2), 0.8)
    face += P([(0.6, -80.8), (2.2, -78.0), (0.4, -78.1)], tone("pele", 0.3))
    face += LN((-0.8, -76.0), (2.3, -76.1), tone("pele", 0.0), 0.8)
    out += G(face, f'clip-path="url(#{hid})"')
    brim = [(-16, -84), (-10.4, -87.1), (0, -88.5), (10.9, -87.1), (16.5, -83.8), (11.4, -81.8), (0, -81.2), (-10.9, -81.8)]
    crown_ = [(-7, -86.1), (7, -86.1), (6.4, -92.6), (2.6, -94.4), (0, -93.2), (-2.6, -94.4), (-6.4, -92.6)]
    out += part(brim, "chapeu", 0.2, 0.9, (0, 0, 1, 0.3))
    out += part(crown_, "chapeu", 0.15, 0.85, (0, 0, 1, 0))
    out += P([(-7, -86.1), (7, -86.1), (6.8, -88.2), (-6.8, -88.2)], tone("colete", 0.15))
    sil_all = hull(legs + torso + head + brim)
    out += occlusion(d, sil_all, tone("calca", 0.0), 0.0, 0.0)  # (sem efeito; o filete escuro vem das partes)
    a.layer("body", out)
    s.layer("shadow", pv.soft_shadow([wpt(x, y, z) for x in (-0.08, 0.08) for y in (-0.06, 0.06) for z in (0, 60)]
                                     + [wpt(x, y, 88) for x in (-0.12, 0.12) for y in (-0.1, 0.1)], 1.0, (10, 4)))
    mark_interactive("avatar_base_idle_se")
    return fit(a), fit(s, centered=False)


# =========================================================================== UI
def ready_indicator() -> Asset:
    """'Pronto para colher', discreto: losango de pergaminho fosco com espiga, ponta para baixo."""
    a = Asset("ui_indicator_ready", 48, 60, (24, 56), footprint=(0, 0))
    cx, cy, r = 0, -34, 15
    dia = [(cx, cy - r), (cx + r, cy), (cx + 3.2, cy + r - 3.2), (cx, cy + r + 6), (cx - 3.2, cy + r - 3.2), (cx - r, cy)]
    out = P(shift(dia, 1.2, 1.6), T("sombra", "contact"), 'opacity="0.35"')
    out += P(dia, tone("pergaminho", 0.12))
    inner = pv.scale_about(dia, 0.84, (cx, cy + 1))
    out += P(inner, tone("pergaminho", 0.82))
    out += P([inner[0], inner[1], (cx, cy), inner[5]], tone("pergaminho", 0.95), 'opacity="0.7"')
    out += LN((cx + 3, cy + 8), (cx - 2, cy - 2), tone("trigo", 0.2), 1.2)
    for k in range(4):                                     # espiga em grãos angulares
        gx, gy = cx - 2 - k * 1.3 + 1.5, cy - 1 - k * 2.6 + 2
        for sgn in (-1, 1):
            out += P([(gx, gy), (gx + sgn * 2.6, gy - 1.6), (gx + sgn * 1.4, gy - 4.2), (gx, gy - 2.6)], tone("trigo", 0.55 if sgn < 0 else 0.3))
    out += LN((cx - 4.5, cy - 11), (cx - 6.5, cy - 15), tone("trigo", 0.4), 0.8)
    a.layer("badge", out)
    return a


# =========================================================================== CULTURA DO USUÁRIO NO CANTEIRO
USER_CROPS = iv.ART / "export" / "user-items" / "crops"
CROP_WORLD_SCALE = 0.60          # recorte @2x -> sprite de mundo @2x (cabe num canteiro de 0,8 tile)


def premult_resize(im, size, resample=Image.LANCZOS):
    a = np.asarray(im).astype(float) / 255
    pm = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3]])
    r = np.dstack([np.asarray(Image.fromarray((pm[..., c] * 255).round().astype(np.uint8)).resize(size, resample)).astype(float) / 255
                   for c in range(4)])
    al = r[..., 3:4]
    rgb = np.where(al > 1e-3, r[..., :3] / np.maximum(al, 1e-3), 0)
    return Image.fromarray((np.dstack([rgb.clip(0, 1), al.clip(0, 1)]) * 255).round().astype(np.uint8), "RGBA")


def user_crop_world(user_name: str, name: str, fam="crops"):
    """Sprite de mundo a partir do recorte do usuário: escala fixa, âncora = base do monte de terra
    colocada na terra do canteiro (z = SOIL_Z). Exporta @1x/@2x + JSON, como os vetoriais."""
    meta = json.loads((USER_CROPS / f"{user_name}.json").read_text())
    src = Image.open(USER_CROPS / f"{user_name}@2x.png").convert("RGBA")
    ax2, ay2 = meta["anchor_px_1x"][0] * 2, meta["anchor_px_1x"][1] * 2
    bb = src.getbbox()
    k = CROP_WORLD_SCALE
    crop = src.crop(bb)
    w2, h2 = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    small = premult_resize(crop, (w2, h2))
    left = (ax2 - bb[0]) * k + 8
    right = (bb[2] - ax2) * k + 8
    top = (ay2 - bb[1]) * k + 8 + 2 * SOIL_Z
    bottom = (bb[3] - ay2) * k + 8 - 2 * SOIL_Z
    half = _ceil(max(left, right), 4)
    W2 = 2 * half if (2 * half) % 8 == 0 else 2 * half + 4
    AY2 = _ceil(top, 4)
    H2 = _ceil(AY2 + max(bottom, 4), 8)
    cv = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    cv.alpha_composite(small, (round(W2 / 2 - (ax2 - bb[0]) * k), round(AY2 - 2 * SOIL_Z - (ay2 - bb[1]) * k)))
    out = iv.ART / "export" / FAM[fam]
    out.mkdir(parents=True, exist_ok=True)
    cv.save(out / f"{name}@2x.png")
    premult_resize(cv, (W2 // 2, H2 // 2)).save(out / f"{name}@1x.png")
    m = {"name": name, "size_1x": [W2 // 2, H2 // 2], "anchor_px_1x": [W2 // 4, AY2 // 2],
         "origin": [0.5, round(AY2 / H2, 6)], "footprint_tiles": [1, 1], "scales": [1, 2],
         "derived_from": f"art/export/user-items/crops/{user_name}@2x.png", "world_scale_of_user_2x": k, "z_base_px": SOIL_Z}
    (out / f"{name}.json").write_text(json.dumps(m, indent=1) + "\n", encoding="utf-8")
    mark_interactive(name)
    return {"name": name, "size": (W2 // 2, H2 // 2), "anchor": (W2 // 4, AY2 // 2), "user": user_name}


# =========================================================================== CONTORNO DE RASTER
OUTLINE_SKIP = ("ground_", "decor_", "ui_")


def outline_pair(d: Path, name: str):
    """Contorno 3 px no @2x; o @1x é a redução BOX pré-multiplicada do @2x (1,5 px, igual à arte do usuário)."""
    p2 = d / f"{name}@2x.png"
    outline_png(p2, 3)
    im2 = Image.open(p2).convert("RGBA")
    premult_resize(im2, (im2.width // 2, im2.height // 2), Image.BOX).save(d / f"{name}@1x.png")


def outline_png(path: Path, scale: int):
    """Contorno fino escuro-quente (rampa contorno_item) por fora da silhueta: 1 px @1x, 2 px @2x.
    Harmoniza o mundo vetorial com o acabamento da arte do usuário (guia v3, seção 7)."""
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A")
    grown = a.filter(ImageFilter.MaxFilter(2 * scale + 1))
    ring = Image.eval(Image.merge("RGBA", (grown, grown, grown, grown)).getchannel("A"), lambda v: v)
    col = pv.h2r(T("contorno_item", "base"))
    ol = Image.new("RGBA", im.size, col + (0,))
    ol.putalpha(Image.eval(grown, lambda v: int(v * 0.85)))
    ol.alpha_composite(im)
    _ = ring
    ol.save(path)


# =========================================================================== MONTAGEM DOS ASSETS
PATH_MASKS = list(range(16))
EDGE_MASKS = [XP, YP, XN, YN, XP | YP, XN | YN, XN | YP, XP | YN]
_FAM_OF: dict[str, str] = {}
_ASSETS: dict = {}
_RASTER: dict = {}


def build_assets():
    items = []
    add = lambda fam, *assets: items.extend((x, fam) for x in assets)  # noqa: E731
    add("ground", ground_tile("ground_grass_a", "a", 11), ground_tile("ground_grass_b", "b", 23),
        ground_tile("ground_grass_c", "c", 37), water_tile("a", 301), water_tile("b", 433))
    add("ground", *[path_tile(m) for m in PATH_MASKS], path_tile(XP | XN, "_b"), path_tile(YP | YN, "_b"))
    add("ground", *[edge_tile(m, "abc"[k % 3]) for k, m in enumerate(EDGE_MASKS)],
        edge_tile(XP, "b", "b", "_b"), edge_tile(YP, "c", "b", "_b"), edge_tile(XP, "c", "c", "_c"), edge_tile(YP, "a", "c", "_c"))
    add("ground", pond(), grass_patch("decor_grass_patch_a", "grama_seca", 0.6, 0.30, 5, 2),
        grass_patch("decor_grass_patch_b", "grama", 0.25, 0.32, 9, 4), flowers(), pebbles())
    add("nature", *tree("tree_oak_a", OAK_TRUNK, OAK_MASSES, 41, OAK_BRANCH, top_z=150, r_tiles=0.55))
    add("nature", *tree("tree_apple_a", APPLE_TRUNK, APPLE_MASSES, 43, APPLE_BRANCH, apples=14, top_z=115, r_tiles=0.5))
    add("nature", *pine())
    add("nature", *bush("prop_bush_a", [(-17, -16, 16, 12), (16, -17, 16, 12), (0, -29, 18, 13)], 61))
    add("nature", *bush("prop_bush_b", [(-18, -15, 15, 11), (15, -18, 16, 12), (-2, -28, 17, 12)], 67, spikes=9))
    add("nature", *rock_ore())
    add("crops", *raised_bed())
    add("props", *hay_stack(), *crate())
    for k in FENCE_PIECES:
        add("props", *fence(k))
    add("buildings", *barn())
    add("characters", *avatar())
    add("ui", ready_indicator())
    return {a.name: (a, fam) for a, fam in items}


def exp_dir(fam):
    return iv.ART / "export" / FAM[fam]


def src_dir(fam):
    return iv.ART / "source" / FAM[fam]


# =========================================================================== CENA 10x8 (mesma composição do iso-01)
NX, NY = 10, 8
PATH = [(1, 3), (1, 4)] + [(i, 4) for i in range(2, 9)]
PATHSET = set(PATH)
BARN = ("bld_barn_small", 1, 1)
BEDS = {(5, 1): 1, (6, 1): 2, (5, 2): 3, (6, 2): 0}
FENCE_AT = {(4, 0): "corner_n", (5, 0): "x", (6, 0): "x", (7, 0): "corner_e", (4, 1): "y", (4, 2): "y",
            (7, 1): "y", (7, 2): "y", (4, 3): "corner_w", (5, 3): "end_xn", (6, 3): "end_xp", (7, 3): "corner_s"}
PROPS = [("tree_apple_a", 8, 1), ("tree_oak_a", 0, 5), ("tree_pine_a", 9, 5), ("prop_bush_a", 9, 3), ("prop_bush_b", 4, 6),
         ("prop_bush_a", 6, 7), ("prop_hay_bales", 3, 2), ("prop_crate", 3, 1), ("rock_ore_a", 8, 6),
         ("avatar_base_idle_se", 3, 4)]
DECOR = [("ground_pond_2x2", 2.5, 5.5), ("decor_grass_patch_a", 6.4, 6.2), ("decor_grass_patch_b", 8.3, 2.6),
         ("decor_grass_patch_a", 0.6, 1.0), ("decor_grass_patch_b", 5.5, 6.9), ("decor_grass_patch_a", 9.0, 5.0),
         ("decor_flowers_a", 5.6, 5.4), ("decor_flowers_a", 9.1, 6.4), ("decor_flowers_a", 0.4, 6.8), ("decor_flowers_a", 3.3, 0.3),
         ("decor_pebbles_a", 7.3, 5.4), ("decor_pebbles_a", 1.6, 6.9), ("decor_pebbles_a", 8.6, 3.4)]
OVERLAY = [("ui_indicator_ready", 5, 2, -88)]
BOARD_W, BOARD_H, OX, OY = 1280, 800, 576, 196
GROUND_VARIANTS = ["ground_grass_a", "ground_grass_b", "ground_grass_c"]


def path_mask(i, j):
    m = 0
    for b, (di, dj) in ((XP, (1, 0)), (YP, (0, 1)), (XN, (-1, 0)), (YN, (0, -1))):
        if (i + di, j + dj) in PATHSET:
            m |= b
    if (i, j) == (1, 3):
        m |= YN
    return m


def grass_variant(i, j):
    return GROUND_VARIANTS[hsh(i, j) % 3]


def ground_at(i, j):
    if (i, j) in PATHSET:
        m = path_mask(i, j)
        return f"ground_path_dirt_{tag(m)}" + ("_b" if m in (XP | XN, YP | YN) and hsh(i, j, 1) % 2 else "")
    m = (XP if i == NX - 1 else 0) | (YP if j == NY - 1 else 0) | (XN if i == 0 else 0) | (YN if j == 0 else 0)
    if m:
        return f"ground_edge_grass_{tag(m)}" + (["", "_b", "_c"][hsh(i, j, 2) % 3] if m in (XP, YP) else "")
    return grass_variant(i, j)


_CACHE: dict = {}


def load(name, zoom, src=None):
    src = src or (1 if zoom <= 1 else 2)
    key = (name, zoom, src)
    if key in _CACHE:
        return _CACHE[key]
    fam = _FAM_OF[name]
    meta = json.loads((exp_dir(fam) / f"{name}.json").read_text())
    im = Image.open(exp_dir(fam) / f"{name}@{src}x.png").convert("RGBA")
    f = zoom / src
    if abs(f - 1) > 1e-9:
        im = premult_resize(im, (max(1, round(im.width * f)), max(1, round(im.height * f))), Image.BOX)
    ax, ay = meta["anchor_px_1x"]
    _CACHE[key] = (im, (ax * zoom, ay * zoom))
    return _CACHE[key]


def screen(i, j, z):
    return (OX * z + (i - j) * 64 * z, OY * z + (i + j) * 32 * z)


def place(canvas, im, anchor, at):
    canvas.alpha_composite(im, (round(at[0] - anchor[0]), round(at[1] - anchor[1])))


def scene_objects():
    objs = [(BARN[0], BARN[1], BARN[2], (4, 2, 0))]
    for (i, j), st in BEDS.items():
        objs.append(("plot_raised_bed", i, j, (i + j, i, 0)))
        if st:
            objs.append((f"crop_wheat_s{st}", i, j, (i + j, i, 1)))
    for (i, j), k in FENCE_AT.items():
        objs.append((f"prop_fence_{k}", i, j, (i + j, i, 0)))
    for n, i, j in PROPS:
        objs.append((n, i, j, (i + j, i, 0)))
    return sorted(objs, key=lambda o: o[3])


def compose(zoom, src=None, layers=("water", "ground", "decor", "shadows", "objects", "overlay"), bg=None, size=None):
    W_, H_ = size or (round(BOARD_W * zoom), round(BOARD_H * zoom))
    cv = Image.new("RGBA", (W_, H_), bg if bg is not None else pv.h2r(tone("agua", 0.44)) + (255,))
    if "water" in layers:
        for s_ in range(-12, NX + NY + 10):
            for i in range(-8, NX + 8):
                j = s_ - i
                if -8 <= j < NY + 8 and not (0 <= i < NX and 0 <= j < NY):
                    im, an = load("ground_water_" + "ab"[hsh(i, j, 3) % 2], zoom, src)
                    x, y = screen(i, j, zoom)
                    place(cv, im, an, (x, y + CLIFF_H * zoom))
    if "ground" in layers:
        for s_ in range(NX + NY - 1):
            for i in range(NX):
                j = s_ - i
                if 0 <= j < NY:
                    im, an = load(ground_at(i, j), zoom, src)
                    place(cv, im, an, screen(i, j, zoom))
    if "decor" in layers:
        for n, i, j in DECOR:
            im, an = load(n, zoom, src)
            place(cv, im, an, screen(i, j, zoom))
    objs = scene_objects()
    if "shadows" in layers:
        sh = Image.new("RGBA", cv.size, (0, 0, 0, 0))
        for n, i, j, _ in objs:
            if (n + "_shadow") in _FAM_OF:
                im, an = load(n + "_shadow", zoom, src)
                place(sh, im, an, screen(i, j, zoom))
        cv.alpha_composite(sh)
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
def seam_test(zoom):
    cv = compose(zoom, layers=("ground",), bg=(0, 0, 0, 0))
    mask = Image.new("L", cv.size, 0)
    inset = 4 * zoom
    t = screen(0, 0, zoom); r = screen(NX - 1, 0, zoom); b = screen(NX - 1, NY - 1, zoom); lft = screen(0, NY - 1, zoom)
    ImageDraw.Draw(mask).polygon([(t[0], t[1] - 32 * zoom + inset), (r[0] + 64 * zoom - 2 * inset, r[1]),
                                  (b[0], b[1] + 32 * zoom - inset), (lft[0] - 64 * zoom + 2 * inset, lft[1])], fill=255)
    al = np.asarray(cv.getchannel("A")); m = np.asarray(mask) > 0
    holes = int(((al < 255) & m).sum())
    return {"zoom": zoom, "pixels_checked": int(m.sum()), "non_opaque_pixels": holes, "pass": holes == 0}


def repeat_test(name):
    im, an = load(name, 1)
    cv = Image.new("RGBA", (3 * 128 + 64, 3 * 64 + 64 + CLIFF_H), (0, 0, 0, 0))
    ox, oy = cv.width / 2, 64
    for i in range(3):
        for j in range(3):
            place(cv, im, an, (ox + (i - j) * 64, oy + (i + j) * 32))
    mask = Image.new("L", cv.size, 0)
    ImageDraw.Draw(mask).polygon([(ox, oy - 28), (ox + 184, oy + 64), (ox, oy + 156), (ox - 184, oy + 64)], fill=255)
    holes = int(((np.asarray(cv.getchannel("A")) < 255) & (np.asarray(mask) > 0)).sum())
    return {"tile": name, "non_opaque_pixels": holes, "pass": holes == 0}


HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b")


def palette_test(assets):
    bad = {}
    for name, (a, fam) in assets.items():
        off = sorted(h for h in {h.lower() for h in HEX_RE.findall(a.svg())} if not pv.palette_mix_ok(h))
        if off:
            bad[name] = off
    return {"rule": "tom da paleta v3 ou mistura de 2 tons vizinhos da mesma rampa (tol. 2/255)", "off_palette": bad, "pass": not bad}


def contract_test(assets, extra):
    errs = []
    for name, (a, fam) in assets.items():
        ax, ay = a.anchor
        if a.width % 4 or a.height % 4:
            errs.append(f"{name}: canvas não múltiplo de 4")
        if not name.endswith("_shadow") and ax != a.width / 2:
            errs.append(f"{name}: âncora x != W/2")
        if ax % 2 or ay % 2:
            errs.append(f"{name}: âncora ímpar")
        if name.startswith(("ground_", "decor_grass_patch")):
            continue
        for s_ in iv.SCALES:
            al = np.asarray(Image.open(exp_dir(fam) / f"{name}@{s_}x.png").getchannel("A"))
            if max(al[0].max(), al[-1].max(), al[:, 0].max(), al[:, -1].max()) > 0:
                errs.append(f"{name}@{s_}x: encosta na borda do canvas")
    for e in extra:
        al = np.asarray(Image.open(exp_dir("crops") / f"{e['name']}@2x.png").getchannel("A"))
        if max(al[0].max(), al[-1].max(), al[:, 0].max(), al[:, -1].max()) > 0:
            errs.append(f"{e['name']}@2x: encosta na borda do canvas")
    return {"errors": errs, "pass": not errs}


def asset_report(assets, extra):
    groups = {}
    for name, (a, fam) in assets.items():
        for s_ in iv.SCALES:
            groups.setdefault(f"{a.width * s_}x{a.height * s_}", []).append(str(exp_dir(fam) / f"{name}@{s_}x.png"))
    for e in extra:
        w, h = e["size"]
        for s_ in (1, 2):
            groups.setdefault(f"{w * s_}x{h * s_}", []).append(str(exp_dir("crops") / f"{e['name']}@{s_}x.png"))
    res = []
    for size, files in sorted(groups.items()):
        r = subprocess.run([sys.executable, str(REPORT), *files, "--expect-size", size, "--require-alpha", "--json"],
                           capture_output=True, text=True)
        res.append({"size": size, "files": len(files), "exit": r.returncode, "stderr": r.stderr.strip()[:300] if r.returncode else ""})
    return res


# ---------------------------------------------------------------- leitura a zoom 0,5 (regras L1–L5)
def lstar(img):
    a = np.asarray(img.convert("RGB")).astype(float) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    Y = lin @ np.array([0.2126, 0.7152, 0.0722])
    return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)


GROUND_PATCH = ["ground_grass_a", "ground_grass_b", "ground_grass_c"]


def grass_bg(size, anchor, zoom):
    cv = Image.new("RGBA", size, (0, 0, 0, 255))
    for i in range(-4, 5):
        for j in range(-4, 5):
            im, an = load(GROUND_PATCH[(i * 3 + j * 7) % 3], zoom)
            place(cv, im, an, (anchor[0] + (i - j) * 64 * zoom, anchor[1] + (i + j) * 32 * zoom))
    return cv


def legibility(piece: Image.Image, anchor, zoom=0.5):
    """piece: RGBA do objeto já na escala de medida, âncora em `anchor`. Devolve as métricas."""
    bg = grass_bg(piece.size, anchor, zoom)
    comp = bg.copy()
    comp.alpha_composite(piece)
    Lc, Lb = lstar(comp), lstar(bg)
    al = np.asarray(piece.getchannel("A")) > 128
    er1 = np.asarray(Image.fromarray(al.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) > 0
    er2 = np.asarray(Image.fromarray(er1.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) > 0
    ring = al & ~er1
    gx = np.abs(np.diff(Lc, axis=1))[:-1, :]
    gy = np.abs(np.diff(Lc, axis=0))[:, :-1]
    g = (gx + gy) / 2
    interior = er2[:-1, :-1]
    borda = float(np.abs(Lc - Lb)[ring].mean()) if ring.any() else 0.0
    ruido = float(g[interior].mean()) if interior.any() else 1.0
    return {"borda_dL": round(borda, 1), "ruido_miolo": round(ruido, 2), "indice": round(borda / max(ruido, 0.1), 2)}


L_RULES = {"borda_dL": 16.0, "indice": 1.6}       # mínimos (guia v3, regra L5)


def unit_image(parts, zoom):
    """parts: [(nome, dx_tiles, dy_tiles)] -> RGBA + âncora (na escala zoom)."""
    ims = [(load(n, zoom), dx, dy) for n, dx, dy in parts]
    W_, H_ = round(700 * zoom), round(600 * zoom)
    A = (W_ / 2, round(420 * zoom))
    cv = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    for (im, an), dx, dy in ims:
        place(cv, im, an, (A[0] + (dx - dy) * 64 * zoom, A[1] + (dx + dy) * 32 * zoom))
    return cv, A


def old_unit(key, zoom):
    """Peça C da prancha comparativa (antes), sem a sombra, renderizada a 1x e reduzida."""
    svg = (OLD_C / f"{key}.svg").read_text()
    svg = re.sub(r'<g id="shadow"[^>]*>.*?</g><g id="body">', '<g id="body">', svg, flags=re.S)
    w, h = int(re.search(r'width="(\d+)"', svg).group(1)), int(re.search(r'height="(\d+)"', svg).group(1))
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h))).convert("RGBA")
    ax, ay = -vb[0], -vb[1]
    cv = Image.new("RGBA", (700, 600), (0, 0, 0, 0))
    cv.alpha_composite(im, (round(350 - ax), round(420 - ay)))
    if zoom != 1:
        cv = premult_resize(cv, (round(700 * zoom), round(600 * zoom)))
    return cv, (350 * zoom, 420 * zoom)


UNITS = [("canteiro com trigo maduro", "crop", [("plot_raised_bed", 0, 0), ("crop_wheat_s3", 0, 0)]),
         ("pedra com minério", "rock", [("rock_ore_a", 0, 0)]),
         ("árvore folhosa", "tree", [("tree_oak_a", 0, 0)]),
         ("fazendeiro", "farmer", [("avatar_base_idle_se", 0, 0)])]
INTERACTIVE_UNITS = [("galpão", [("bld_barn_small", 0, 0)]), ("macieira", [("tree_apple_a", 0, 0)]),
                     ("pinheiro", [("tree_pine_a", 0, 0)]), ("fardos de feno", [("prop_hay_bales", 0, 0)]),
                     ("caixote", [("prop_crate", 0, 0)]), ("canteiro vazio", [("plot_raised_bed", 0, 0)]),
                     ("trigo broto", [("plot_raised_bed", 0, 0), ("crop_wheat_s1", 0, 0)]),
                     ("trigo crescendo", [("plot_raised_bed", 0, 0), ("crop_wheat_s2", 0, 0)])]


def legibility_suite():
    res = {"rules_min": L_RULES, "antes_depois": [], "pecas_interativas": []}
    for label, old, parts in UNITS:
        o_im, o_an = old_unit(old, 0.5)
        n_im, n_an = unit_image(parts, 0.5)
        res["antes_depois"].append({"unidade": label, "antes": legibility(o_im, o_an), "depois": legibility(n_im, n_an)})
    for label, parts in INTERACTIVE_UNITS:
        n_im, n_an = unit_image(parts, 0.5)
        res["pecas_interativas"].append({"unidade": label, **legibility(n_im, n_an)})
    ok = all(u["depois"]["borda_dL"] >= L_RULES["borda_dL"] and u["depois"]["indice"] >= L_RULES["indice"] for u in res["antes_depois"])
    ok &= all(u["borda_dL"] >= L_RULES["borda_dL"] and u["indice"] >= L_RULES["indice"] for u in res["pecas_interativas"])
    res["pass"] = bool(ok)
    return res


# =========================================================================== PRANCHAS
def font(sz, bold=False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(p, sz) if Path(p).exists() else ImageFont.load_default()


SHEET_BG = (234, 231, 224, 255)
CELL_BG = (247, 245, 240, 255)
INK = (40, 36, 32, 255)


def trim(im, pad=6):
    bb = im.getbbox()
    return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))


def proof_board(leg):
    """Antes (prancha C) x depois (regras v3), a 1x e a 0,5, sobre a mesma grama, com métricas."""
    rows = []
    for (label, old, parts), m in zip(UNITS, leg["antes_depois"]):
        cells = []
        for maker in (lambda z: old_unit(old, z), lambda z: unit_image(parts, z)):
            im1, an1 = maker(1.0)
            im5, an5 = maker(0.5)
            c1 = grass_bg(im1.size, an1, 1.0); c1.alpha_composite(im1)
            c5 = grass_bg(im5.size, an5, 0.5); c5.alpha_composite(im5)
            bb = im1.getbbox(); bb = (bb[0] - 14, bb[1] - 14, bb[2] + 14, bb[3] + 14)
            c1 = c1.crop(bb)
            c5 = c5.crop(tuple(round(v / 2) for v in bb))
            sil = Image.new("RGBA", im5.size, (226, 222, 214, 255))
            sil.paste((52, 48, 44, 255), mask=im5.getchannel("A").point(lambda v: 255 if v > 128 else 0))
            sil = sil.crop(tuple(round(v / 2) for v in bb))
            cells.append((c1, c5, sil))
        rows.append((label, cells, m))
    W_ = 1500
    y = 96
    layout = []
    for label, cells, m in rows:
        h = max(c[0].height for c in cells) + 70
        layout.append((y, label, cells, m, h))
        y += h + 16
    board = Image.new("RGBA", (W_, y + 150), SHEET_BG)
    dr = ImageDraw.Draw(board)
    dr.text((20, 16), "Prova de leitura a zoom 0,5 — antes (peças C da prancha comparativa) × depois (guia v3, regras L1–L5)", fill=INK, font=font(20, True))
    dr.text((20, 46), "Cada lado: 1× | 0,5 (tamanho real no celular) | silhueta a 0,5 em uma cor. Mesma grama de fundo. "
            f"Métricas a 0,5: borda ΔL* (mín. {L_RULES['borda_dL']:.0f}) e índice borda/ruído do miolo (mín. {L_RULES['indice']}).",
            fill=INK, font=font(13))
    dr.text((20, 70), "ANTES", fill=(150, 60, 40, 255), font=font(15, True))
    dr.text((W_ // 2 + 10, 70), "DEPOIS", fill=(40, 110, 60, 255), font=font(15, True))
    for y0, label, cells, m, h in layout:
        for side, (c1, c5, sil) in enumerate(cells):
            x = 20 + side * (W_ // 2)
            dr.rounded_rectangle([x - 6, y0, x + W_ // 2 - 30, y0 + h], radius=8, fill=CELL_BG)
            board.alpha_composite(c1, (x, y0 + 8))
            board.alpha_composite(c5, (x + c1.width + 14, y0 + 8))
            board.alpha_composite(sil, (x + c1.width + c5.width + 28, y0 + 8))
            mm = m["antes" if side == 0 else "depois"]
            okk = mm["borda_dL"] >= L_RULES["borda_dL"] and mm["indice"] >= L_RULES["indice"]
            dr.text((x, y0 + h - 52), label, fill=INK, font=font(14, True))
            dr.text((x, y0 + h - 30), f"borda ΔL* {mm['borda_dL']:.1f} · ruído {mm['ruido_miolo']:.2f} · índice {mm['indice']:.2f}  "
                    + ("passa" if okk else "NÃO passa"), fill=(40, 110, 60, 255) if okk else (170, 50, 40, 255), font=font(13))
    yb = y + 10
    dr.text((20, yb), "Outras peças interativas a 0,5 (depois):", fill=INK, font=font(14, True))
    txt = " · ".join(f"{u['unidade']} {u['borda_dL']:.0f}/{u['indice']:.1f}" for u in leg["pecas_interativas"])
    dr.text((20, yb + 24), txt, fill=INK, font=font(12))
    dr.text((20, yb + 46), "(borda ΔL* / índice). Regras: L1 silhueta, L2 contraste local, L3 menos micro-detalhe, L4 realce + contorno, L5 medida.",
            fill=INK, font=font(12))
    return board


def piece(name, scale=1):
    im, an = load(name, scale, scale)
    base = Image.new("RGBA", im.size, (0, 0, 0, 0))
    if (name + "_shadow") in _FAM_OF:
        sh, san = load(name + "_shadow", scale, scale)
        W_ = max(im.width, round(an[0]) + sh.width - round(san[0]))
        left = max(0, round(san[0] - an[0]))
        base = Image.new("RGBA", (W_ + left, max(im.height, round(an[1]) + sh.height - round(san[1]))), (0, 0, 0, 0))
        base.alpha_composite(sh, (left + round(an[0] - san[0]), round(an[1] - san[1])))
        base.alpha_composite(im, (left, 0))
        return base
    base.alpha_composite(im)
    return base


def sheet():
    sections = [
        ("Chão: grama (3 variantes), água, manchas, flores, seixos, lago 2×2",
         ["ground_grass_a", "ground_grass_b", "ground_grass_c", "ground_water_a", "ground_water_b", "decor_grass_patch_a",
          "decor_grass_patch_b", "decor_flowers_a", "decor_pebbles_a", "ground_pond_2x2"]),
        ("Caminho de terra: autotile de 16 + 2 variantes", [f"ground_path_dirt_{tag(m)}" for m in PATH_MASKS]
         + ["ground_path_dirt_xpxn_b", "ground_path_dirt_ypyn_b"]),
        ("Borda da ilha: barranco (+x, +y), filete de luz (−x, −y)", [f"ground_edge_grass_{tag(m)}" for m in EDGE_MASKS]
         + [f"ground_edge_grass_{t}" for t in ("xp_b", "xp_c", "yp_b", "yp_c")]),
        ("Canteiro (vetor) e trigo do usuário em 3 estágios + indicador", ["plot_raised_bed", "crop_wheat_s1", "crop_wheat_s2", "crop_wheat_s3",
                                                                            "ui_indicator_ready"]),
        ("Natureza e recursos", ["tree_oak_a", "tree_apple_a", "tree_pine_a", "prop_bush_a", "prop_bush_b", "rock_ore_a"]),
        ("Props e cerca", ["prop_hay_bales", "prop_crate"] + [f"prop_fence_{k}" for k in FENCE_PIECES]),
        ("Construção e personagem", ["bld_barn_small", "avatar_base_idle_se"]),
    ]
    W_ = 1500
    pad, lab = 10, 22
    y = 56
    pl = []
    for title, names in sections:
        pl.append(("t", title, (20, y)))
        y += 28
        x, rh = 20, 0
        for n in names:
            im = piece(n)
            if n.startswith("crop_wheat"):
                bed = piece("plot_raised_bed")
                b, ban = load("plot_raised_bed", 1)
                c_, can = load(n, 1)
                cw = max(bed.width, c_.width)
                tmp = Image.new("RGBA", (cw + 20, max(round(ban[1]), round(can[1])) + 40), (0, 0, 0, 0))
                A = (tmp.width / 2, max(ban[1], can[1]) + 2)
                place(tmp, b, ban, A); place(tmp, c_, can, A)
                im = tmp
            im = trim(im, 4)
            cw, ch = max(im.width, 96) + 2 * pad, im.height + 2 * pad + lab
            if x + cw > W_ - 20:
                x, y, rh = 20, y + rh + 8, 0
            pl.append(("c", (im, n), (x, y, cw, ch)))
            x += cw + 8
            rh = max(rh, ch)
        y += rh + 18
    pl.append(("t", "Detalhe @2x: fazendeiro, trigo maduro no canteiro, pedra, fardos, indicador", (20, y)))
    y += 28
    x, rh = 20, 0
    for n in ("avatar_base_idle_se", "crop_wheat_s3", "rock_ore_a", "prop_hay_bales", "ui_indicator_ready"):
        if n == "crop_wheat_s3":
            b, ban = load("plot_raised_bed", 2, 2)
            c_, can = load(n, 2, 2)
            im = Image.new("RGBA", (max(b.width, c_.width) + 20, round(max(ban[1], can[1])) + 70), (0, 0, 0, 0))
            A = (im.width / 2, max(ban[1], can[1]) + 2)
            place(im, b, ban, A); place(im, c_, can, A)
        else:
            im = piece(n, 2)
        im = trim(im, 4)
        cw, ch = im.width + 2 * pad, im.height + 2 * pad + lab
        pl.append(("c", (im, n + " @2x"), (x, y, cw, ch)))
        x += cw + 8
        rh = max(rh, ch)
    y += rh + 24
    sh = Image.new("RGBA", (W_, y), SHEET_BG)
    dr = ImageDraw.Draw(sh)
    dr.text((20, 16), f"Alvo visual v3 — {BATCH} — peças isoladas a 1:1 (@1x) com sombra projetada", fill=INK, font=font(20, True))
    for kind, data, pos in pl:
        if kind == "t":
            dr.text(pos, data, fill=INK, font=font(15, True))
        else:
            im, n = data
            x, y0, cw, ch = pos
            dr.rounded_rectangle([x, y0, x + cw, y0 + ch], radius=6, fill=CELL_BG, outline=(214, 208, 198, 255))
            sh.alpha_composite(im, (x + (cw - im.width) // 2, y0 + pad))
            dr.text((x + 5, y0 + ch - lab + 3), n, fill=INK, font=font(10))
    return sh


def debug_board():
    img = compose(1)
    dr = ImageDraw.Draw(img)
    for i in range(NX):
        for j in range(NY):
            x, y = screen(i, j, 1)
            dr.polygon([(x, y - 32), (x + 64, y), (x, y + 32), (x - 64, y)], outline=(40, 60, 90, 150))
    for n, i, j, _ in scene_objects():
        x, y = screen(i, j, 1)
        dr.line([(x - 6, y), (x + 6, y)], fill=(255, 0, 200, 255), width=2)
        dr.line([(x, y - 6), (x, y + 6)], fill=(255, 0, 200, 255), width=2)
    return img


def tech_sheet():
    cv = Image.new("RGBA", (1100, 640), (255, 255, 255, 255))
    ox, oy = 550, 60
    for s_ in range(15):
        for i in range(8):
            j = s_ - i
            if 0 <= j < 8:
                im, an = load(grass_variant(i + 20, j + 20), 1)
                place(cv, im, an, (ox + (i - j) * 64, oy + (i + j) * 32))
    demo = {(0, 1), (1, 1), (2, 1), (2, 2), (2, 3), (3, 3), (4, 3), (4, 2), (4, 1), (5, 1), (1, 0)}
    pd = Image.new("RGBA", (960, 380), (255, 255, 255, 255))
    ox2, oy2 = 470, 40
    for s_ in range(12):
        for i in range(7):
            j = s_ - i
            if 0 <= j < 5:
                if (i, j) in demo:
                    m = sum(b for b, (di, dj) in ((XP, (1, 0)), (YP, (0, 1)), (XN, (-1, 0)), (YN, (0, -1))) if (i + di, j + dj) in demo)
                    nme = f"ground_path_dirt_{tag(m)}"
                else:
                    nme = grass_variant(i, j)
                im, an = load(nme, 1)
                place(pd, im, an, (ox2 + (i - j) * 64, oy2 + (i + j) * 32))
    out = Image.new("RGBA", (1100, 640 + 380 + 80), (255, 255, 255, 255))
    dr = ImageDraw.Draw(out)
    dr.text((10, 8), "Campo 8×8 só com as 3 variantes de grama (textura periódica comum + miolo por variante)", fill=INK, font=font(14))
    out.alpha_composite(cv.crop((0, 20, 1100, 600)), (0, 30))
    dr.text((10, 630), "Caminho: curvas, T, cruz e pontas (autotile de 16)", fill=INK, font=font(14))
    out.alpha_composite(pd, (70, 660))
    return out


# =========================================================================== MANIFESTO
ROLE = {
    "ground_grass": "chão de grama pintada, variantes a (sol), b (touceira), c (mancha seca + florzinhas); textura periódica comum",
    "ground_water": "água de fundo ao redor da ilha (40 px abaixo da grama), variantes a e b",
    "ground_path_dirt": "caminho de terra batida — autotile de 16 por máscara (+x, +y, -x, -y) + variantes _b dos retos",
    "ground_edge_grass": "borda da ilha: barranco com estratos, raízes e pedras angulares; beiço de grama pendente",
    "ground_pond_2x2": "lago 2x2 de margem irregular (decalque), folhas flutuantes, taboas, seixos",
    "decor_grass_patch_a": "mancha seca de grama (decalque)", "decor_grass_patch_b": "mancha de grama alta (decalque)",
    "decor_flowers_a": "florzinhas do campo (decoração)", "decor_pebbles_a": "seixos angulares (decoração)",
    "tree_oak_a": "árvore folhosa: copa em 6 massas de tufos pontudos, tronco com casca",
    "tree_apple_a": "macieira: copa em 5 massas, maçãs em pares, 2 caídas",
    "tree_pine_a": "pinheiro: 9 andares de saias pontudas, realce no lado da luz",
    "prop_bush_a": "arbusto de tufos pontudos", "prop_bush_b": "arbusto com espigas de flor lilás",
    "rock_ore_a": "pedra angular de 3 planos com 4 pepitas de minério e pedra menor",
    "plot_raised_bed": "canteiro elevado de tábuas com mourões e terra em camalhões (vazio)",
    "crop_wheat": "trigo do usuário (culturas-d.webp) no canteiro: s1 broto, s2 crescendo, s3 maduro (derivado, escala 0,60 do @2x)",
    "prop_hay_bales": "pilha de 3 fardos retangulares de feno com barbante", "prop_crate": "caixote de ripas com maçãs",
    "prop_fence_wood": "cerca de madeira envelhecida: retos, cantos e pontas (8 peças)",
    "bld_barn_small": "galpão 3x3 de tábuas verticais, fundação de pedra, porta dupla, porta de feno, telhado de telhas de barro",
    "avatar_base_idle_se": "fazendeiro adulto (~6 cabeças), camisa de linho, colete, chapéu de palha, barba curta",
    "ui_indicator_ready": "indicador discreto 'pronto para colher' (losango fosco com espiga)",
}


def group_of(name):
    for p in ("ground_grass_", "ground_path_dirt_", "ground_edge_grass_", "ground_water_", "crop_wheat_", "prop_fence_"):
        if name.startswith(p):
            return {"prop_fence_": "prop_fence_wood"}.get(p, p[:-1])
    return name[:-7] if name.endswith("_shadow") else name


def update_manifest(assets, extra, qa_ok):
    mpath = iv.ART / "manifest.json"
    man = json.loads(mpath.read_text(encoding="utf-8"))
    man["assets"] = [e for e in man["assets"] if e.get("batch") != BATCH]
    groups = {}
    for name in assets:
        groups.setdefault(group_of(name), []).append(name)
    for e in extra:
        groups.setdefault(group_of(e["name"]), []).append(e["name"])
    rel = lambda p: str(p.relative_to(ROOT))  # noqa: E731
    for gid, names in groups.items():
        main_ = sorted(n for n in names if not n.endswith("_shadow"))
        files, sources = [], []
        for n in sorted(names):
            fam = _FAM_OF[n]
            files += [rel(exp_dir(fam) / f"{n}@1x.png"), rel(exp_dir(fam) / f"{n}@2x.png"), rel(exp_dir(fam) / f"{n}.json")]
            if n in assets:
                sources.append(rel(src_dir(fam) / f"{n}.svg"))
        fam0 = _FAM_OF[main_[0]]
        meta = json.loads((exp_dir(fam0) / f"{main_[0]}.json").read_text())
        user = gid == "crop_wheat"
        entry = {
            "id": gid, "batch": BATCH, "role": ROLE.get(gid, gid),
            "path": rel(exp_dir(fam0) / f"{main_[0]}@1x.png"), "files": files,
            "source_path": ([f"art/export/user-items/crops/{e['user']}@2x.png" for e in extra] if user
                            else (sources if len(sources) > 1 else sources[0])),
            "status": "in_review", "variants": main_ if len(main_) > 1 else [],
            "technical": {"dimensions": "x".join(map(str, meta["size_1x"])), "alpha": True, "anchor": "centro do losango da pegada",
                          "anchor_px_1x": meta["anchor_px_1x"], "origin": meta["origin"], "footprint_tiles": meta.get("footprint_tiles", [1, 1]),
                          "frames": len(main_) if user else 1, "filtering": "linear", "max_colors": None,
                          "palette": "art/style-guide/palette.json (v3.1)",
                          "shadow": "separada (_shadow, canvas e âncora próprios)" if any(n.endswith("_shadow") for n in names) else "sem sombra",
                          "interactive_rim": any(n in INTERACTIVE for n in names)},
            "visual_locks": ["palette", "projection-2:1", "anchor", "light-direction", "outline-v3"],
            "source": ({"kind": "user_owned", "url_or_tool": "art/source/tools/build_alvo_visual_c_01.py (user_crop_world: escala + âncora)",
                        "creator": "usuário (dono do projeto); recorte e escala pelo agente diretor-de-arte", "created_at": "2026-11-22",
                        "license": "do usuário; uso autorizado (art/source/user-provided/2026-11-22/PROVENIENCIA.md)", "attribution": "",
                        "prompt_or_source_record": "derivado de crop_wheat_s1..s3 (culturas-d.webp), sem edição de pintura"} if user else
                       {"kind": "scripted", "url_or_tool": "art/source/tools/build_alvo_visual_c_01.py + paint_vector.py + iso_vector.py (cairosvg)",
                        "creator": "agente diretor-de-arte (Claude)", "created_at": "2026-11-22",
                        "license": "original do projeto (todos os direitos do projeto)", "attribution": "",
                        "prompt_or_source_record": "SVG gerado por código; sem IA; sem referência externa; nada derivado de "
                                                   "Sunflower Land/Sunnyside; contorno aplicado no raster (outline_png)"}),
            "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False, "technical_checks_passed": qa_ok, "approved_by": ""},
            "review": f"art/review/{BATCH}/prancha.png", "notes": f"alvo visual v3; ver art/review/{BATCH}/notas.md",
        }
        if user:
            entry["technical"]["z_base_px"] = SOIL_Z
        man["assets"].append(entry)
    man["support_files"] = [s for s in man.get("support_files", []) if s.get("batch") != BATCH]
    man["support_files"].append({"path": f"art/review/{BATCH}/", "role": "alvo visual v3 (cenas, prancha, prova de leitura a 0,5, "
                                 "técnica, debug, qa.json, notas.md)", "status": "in_review", "batch": BATCH})
    man["style_version"] = "3.1 (pintado/ilustrado: arte do usuário como alvo + estilo C no mundo) — 2026-11-22"
    mpath.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


# =========================================================================== MAIN
def main():
    global _ASSETS
    assets = build_assets()
    _ASSETS = assets
    for name, (a, fam) in assets.items():
        _FAM_OF[name] = fam
        a.export(src_dir(fam), exp_dir(fam))
        if not name.startswith(OUTLINE_SKIP) and not name.endswith("_shadow"):
            outline_pair(exp_dir(fam), name)
    extra = [user_crop_world(f"crop_wheat_s{k}", f"crop_wheat_s{k}") for k in (1, 2, 3)]
    for e in extra:
        _FAM_OF[e["name"]] = "crops"
    REV.mkdir(parents=True, exist_ok=True)
    compose(1).convert("RGB").save(REV / "cena.png")
    compose(2, src=2).convert("RGB").save(REV / "cena@2x.png")
    half = compose(0.5)
    half.convert("RGB").save(REV / "cena-zoom05.png")
    half.crop((150, 40, 150 + 390, 40 + 360)).convert("RGB").save(REV / "cena-celular.png")
    compose(1.0, src=2).crop((300, 80, 300 + 780, 80 + 720)).convert("RGB").save(REV / "cena-celular-dpr2.png")
    sheet().convert("RGB").save(REV / "prancha.png")
    debug_board().convert("RGB").save(REV / "prancha-debug.png")
    tech_sheet().convert("RGB").save(REV / "prancha-tecnica.png")
    leg = legibility_suite()
    proof_board(leg).convert("RGB").save(REV / "prova-leitura-05.png")
    seams = [seam_test(z) for z in (0.5, 0.75, 1, 1.5, 2)]
    repeats = [repeat_test(n) for n in assets if n.startswith(("ground_grass", "ground_path", "ground_water"))]
    pal = palette_test(assets)
    contract = contract_test(assets, extra)
    report = asset_report(assets, extra)
    ok = (all(s["pass"] for s in seams) and all(r["pass"] for r in repeats) and pal["pass"] and contract["pass"]
          and all(r["exit"] == 0 for r in report) and leg["pass"])
    qa = {"batch": BATCH, "pieces": len([n for n in assets if not n.endswith("_shadow")]) + len(extra),
          "seam_tests": seams, "repeat_3x3": {"tiles": len(repeats), "failed": [r for r in repeats if not r["pass"]]},
          "palette": pal, "contract": contract, "legibility_05": leg, "asset_report": report, "pass": ok}
    (REV / "qa.json").write_text(json.dumps(qa, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    update_manifest(assets, extra, ok)
    print(json.dumps({k: v for k, v in qa.items() if k not in ("asset_report",)}, indent=1, ensure_ascii=False)[:6000])
    print("asset_report:", [(r["size"], r["files"], r["exit"]) for r in report])
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
