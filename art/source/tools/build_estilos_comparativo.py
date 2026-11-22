#!/usr/bin/env python3
"""Prancha comparativa de estilos — lote 2026-11-22-estilos-comparativo (status: draft).

Depois da reprovação do alvo iso-01 ("muito infantil, tudo muito arredondado"), esta prancha
mostra o MESMO conjunto de peças em 3 direções, para o usuário escolher antes de refazer a cena:

  A  Estilizado maduro   formas angulares/facetadas, contorno fino escuro, 4 tons em planos
  B  Low-poly facetado   malha 3D simples projetada em 2:1, luz por face, sem contorno
  C  Pintado semirreal.  proporções realistas, textura sugerida, paleta terrosa, sombra longa

Peças (cada estilo): árvore folhosa, pinheiro, fazendeiro adulto, galpão 1×1, canteiro com
trigo maduro, pedra com minério, e um trecho 3×3 (grama + caminho) com tudo montado.

100% vetor gerado por código (SVG -> PNG com cairosvg). Sem IA, sem referência externa, nada
derivado de Sunflower Land/Sunnyside. Projeção e escala iguais ao guia v2.1 (tile 128×64).
Não é asset de produção: as paletas ficam em art/source/estilos-comparativo/paletas.json e
só viram palette.json oficial depois da escolha do usuário.

    python3 art/source/tools/build_estilos_comparativo.py     # sai 0 se o QA passar

Gera:
  art/source/estilos-comparativo/{a,b,c}/<peça>.svg   fontes geradas (não editar)
  art/source/estilos-comparativo/paletas.json
  art/source/estilos-comparativo/prancha.svg
  art/review/2026-11-22-estilos-comparativo/prancha.png, prancha@2x.png, qa.json
  art/manifest.json                                   3 entradas draft + support_file
"""
from __future__ import annotations

import json
import math
import random
import re
import subprocess
import sys
from pathlib import Path

import cairosvg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from iso_vector import HH, HW, Defs, clip, hull, iso, lin, pts, rad  # noqa: E402

BATCH = "2026-11-22-estilos-comparativo"
ART = Path(__file__).resolve().parents[2]
ROOT = ART.parent
SRC = ART / "source" / "estilos-comparativo"
REV = ART / "review" / BATCH
REPORT = ROOT / ".claude" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"

# ---------------------------------------------------------------- mundo 3D <-> tela (2:1)
WT = 72.0            # px de mundo por aresta de tile
ZS = 1.0887          # px de tela por px de mundo na vertical (dimétrica 2:1, elevação 30°)
VIEW = (0.6124, 0.6124, 0.5)


def norm(v):
    m = math.sqrt(sum(a * a for a in v)) or 1.0
    return tuple(a / m for a in v)


L_STD = norm((-0.55, 0.30, 0.78))   # luz do topo-esquerda da tela (face +y média, +x sombra)
L_LOW = norm((-0.62, 0.32, 0.72))   # sol mais baixo (estilo C: sombra ~1,6x mais longa)
L_SH = norm((-0.40, 0.21, 0.89))    # sombra projetada de A e B (curta, legível)
LD2 = norm((-0.55, -0.83))          # direção da luz no plano da tela (para planos 2D)


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def mul(a, k):
    return tuple(x * k for x in a)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def scr(p):
    """Ponto de mundo (X, Y, Z em px de mundo) -> tela (âncora em 0, 0)."""
    X, Y, Z = p
    return ((X - Y) * HW / WT, (X + Y) * HH / WT - Z * ZS)


def W(x, y, z):
    """(x, y em tiles; z em px de TELA) -> mundo."""
    return (x * WT, y * WT, z / ZS)


def shadow_hull(points_w, L):
    """Projeta pontos de mundo no chão (z=0) ao longo da luz; devolve envoltória em tela."""
    out = []
    for X, Y, Z in points_w:
        k = max(Z, 0.0) / L[2]
        out.append(scr((X - L[0] * k, Y - L[1] * k, 0.0)))
    return hull(out)


def ellipsoid_pts(c, rx, ry, rz, n=14, rings=(-0.6, 0.0, 0.6)):
    out = []
    for r in rings:
        s = math.sqrt(1 - r * r)
        for i in range(n):
            a = 2 * math.pi * i / n
            out.append((c[0] + rx * s * math.cos(a), c[1] + ry * s * math.sin(a), c[2] + rz * r))
    out += [(c[0], c[1], c[2] + rz), (c[0], c[1], c[2] - rz)]
    return out


# ---------------------------------------------------------------- cor
def h2r(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def r2h(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def mix(a, b, t):
    A, B = h2r(a), h2r(b)
    return r2h(tuple(A[i] + (B[i] - A[i]) * t for i in range(3)))


def ramp_at(stops, t):
    t = max(0.0, min(1.0, t)) * (len(stops) - 1)
    i = min(int(t), len(stops) - 2)
    return mix(stops[i], stops[i + 1], t - i)


# ---------------------------------------------------------------- SVG
def f2(v):
    return f"{v:.2f}"


def P(points, fill, extra=""):
    return f'<polygon points="{pts(points)}" fill="{fill}" {extra}/>'


def PL(points, stroke, w, extra=""):
    return (f'<polyline points="{pts(points)}" fill="none" stroke="{stroke}" stroke-width="{w}" '
            f'stroke-linecap="round" stroke-linejoin="round" {extra}/>')


def LN(a, b, stroke, w, extra=""):
    return (f'<line x1="{f2(a[0])}" y1="{f2(a[1])}" x2="{f2(b[0])}" y2="{f2(b[1])}" stroke="{stroke}" '
            f'stroke-width="{w}" stroke-linecap="round" {extra}/>')


def G(body, extra=""):
    return f"<g {extra}>{body}</g>"


def back_stroke(polys, col, ow):
    """Contorno por trás (traço atrás) da união de vários polígonos: espessura visível = ow."""
    return "".join(f'<polygon points="{pts(p)}" fill="{col}" stroke="{col}" stroke-width="{2 * ow}" '
                   f'stroke-linejoin="miter" stroke-miterlimit="3"/>' for p in polys)


def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def scale_about(poly, k, c=None):
    c = c or centroid(poly)
    return [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in poly]


def zig_region(center, d, off, R, amp, step, seed):
    """Semiplano {p : (p-center)·d > off} com fronteira em zigue-zague (planos angulares)."""
    dx, dy = d
    px, py = -dy, dx
    bx, by = center[0] + dx * off, center[1] + dy * off
    rng = random.Random(seed)
    n = max(2, int(2 * R / step))
    line = []
    for i in range(n + 1):
        t = -R + i * 2 * R / n
        a = amp * (1 if i % 2 else -1) * rng.uniform(0.4, 1.0)
        line.append((bx + px * t + dx * a, by + py * t + dy * a))
    far = [(bx + px * R + dx * R * 2, by + py * R + dy * R * 2),
           (bx - px * R + dx * R * 2, by - py * R + dy * R * 2)]
    return line + far


def jag_poly(cx, cy, rx, ry, n, seed, inner=0.8, rot=0.0, var=0.1):
    rng = random.Random(seed)
    out = []
    for i in range(n):
        a = rot + 2 * math.pi * i / n + rng.uniform(-0.12, 0.12)
        r = (1.0 if i % 2 == 0 else inner) * rng.uniform(1 - var, 1 + var * 0.6)
        out.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
    return out


# ====================================================================== PALETAS
PAL_A = {  # [light, base, shadow, deep], outline
    "grass": (["#b3c77a", "#94ad5c", "#768f48", "#5a7238"], "#34432a"),
    "path": (["#dccaa2", "#c4ad83", "#a38d68", "#7f6c51"], "#4e4232"),
    "leaf": (["#a8c464", "#7fa04a", "#5a7d3c", "#3d5a30"], "#22331f"),
    "pine": (["#7ea37a", "#58805e", "#3e634a", "#2a4838"], "#18291f"),
    "bark": (["#a58566", "#82664d", "#614a39", "#45352b"], "#291f1a"),
    "wall": (["#b86452", "#984b3e", "#763a33", "#582c29"], "#2d1817"),
    "roof": (["#959ba3", "#737a84", "#575d67", "#40454e"], "#23262c"),
    "trim": (["#ece3cc", "#cfc4aa", "#aaa088", "#857c69"], "#3d3830"),
    "stone": (["#bdbab0", "#99968c", "#76746c", "#56554f"], "#2d2c29"),
    "ore": (["#f0cf72", "#d4a849", "#a87c33", "#7a5826"], "#3e2c14"),
    "soil": (["#8d6e53", "#715643", "#574234", "#3f3027"], "#261c17"),
    "wood": (["#b48c62", "#94704c", "#73563b", "#56402d"], "#2e2219"),
    "wheat": (["#ecd690", "#d4b762", "#ad8f45", "#806a33"], "#4a3b1c"),
    "skin": (["#e3b896", "#c9997a", "#a5785f", "#82594a"], "#3b2620"),
    "shirt": (["#c98a6a", "#a86c52", "#844f40", "#633a31"], "#2a1c18"),
    "vest": (["#7d7556", "#635c44", "#4a4535", "#353228"], "#201e18"),
    "pants": (["#7d8ca6", "#5e6d88", "#47546b", "#343e50"], "#1c2230"),
    "boots": (["#7a5a43", "#5c4333", "#443226", "#30231b"], "#1e1612"),
    "hat": (["#ddc283", "#c3a565", "#9d824c", "#776139"], "#3a2e1a"),
    "hair": (["#6b5040", "#523d31", "#3d2d25", "#2b201a"], "#1e1612"),
    "dirt": (["#9a7a5c", "#7e6249", "#634c39", "#4a382b"], "#2a2019"),
}
A_SHADOW, A_INK = "#283040", "#2a221e"

PAL_B = {  # cor-base por material; os tons saem da luz por face (lp_color)
    "grass": ["#7f9a52", "#84a055", "#7a954e"], "path": ["#b9a07a", "#bea47e", "#b49b76"],
    "leaf": ["#628c42", "#6f9848", "#577f3c"], "pine": ["#3f6b4c", "#477654", "#38614a"],
    "bark": ["#6e543f"], "wall": ["#a24f3e"], "roof": ["#5f6670"], "trim": ["#d9cfb8"],
    "door": ["#6e4434"], "stone": ["#94918a", "#8a877f"], "ore": ["#d0a446"],
    "soil": ["#6a4f3c"], "wood": ["#9a7452"], "wheat": ["#ecd078", "#e4c46c"], "stem": ["#cdb060"],
    "skin": ["#c99878"], "shirt": ["#7d8a5e"], "pants": ["#4d5a74"], "boots": ["#4f3d30"],
    "hat": ["#c2a466"], "band": ["#5a4232"], "beard": ["#4f3b2e"], "dirt": ["#7a5c45"],
}
B_SHADOW = "#2a3340"

PAL_C = {  # deep -> highlight (5 tons, terrosos e pouco saturados)
    "grass": ["#3f5228", "#56693a", "#6c7f48", "#86965c", "#a5ae76"],
    "path": ["#6e5c46", "#8d7a60", "#a7957a", "#bfae92", "#d4c6ab"],
    "leaf": ["#24331c", "#3a4f2d", "#55703d", "#76904f", "#a3b26c"],
    "pine": ["#1c2c23", "#2b4233", "#3e5a44", "#587459", "#7d9677"],
    "bark": ["#3a2e25", "#54443a", "#6e5c4e", "#8b7865", "#a89580"],
    "plank": ["#4e3a2c", "#6a5040", "#86684f", "#a08262", "#b89d7c"],
    "tile": ["#5a3428", "#7a4634", "#995a42", "#b47456", "#c99173"],
    "stone": ["#4a4843", "#66635b", "#838076", "#a19d92", "#bdb9ae"],
    "ore": ["#6a3b1f", "#8e5429", "#b07038", "#c99550", "#e0bd78"],
    "soil": ["#2e231c", "#45362b", "#5c4a3a", "#74604c", "#8c7862"],
    "wheat": ["#7a6232", "#9e8343", "#bfa45a", "#d6be78", "#e8d7a0"],
    "skin": ["#7a5240", "#9c6c54", "#b8876a", "#cfa283", "#e0bc9d"],
    "linen": ["#7d7360", "#a09580", "#bcb29c", "#d2c9b4", "#e4dccb"],
    "vest": ["#2e241d", "#43352b", "#594739", "#6f5a49", "#857060"],
    "trousers": ["#2d323c", "#3e4552", "#525b6a", "#6a7484", "#848d9b"],
    "boots": ["#2a1f19", "#3e2e24", "#544032", "#6a5242", "#806652"],
    "hat": ["#5e4a2e", "#7f6640", "#a08455", "#bba06c", "#d1b886"],
    "hair": ["#2a201a", "#3b2e25", "#4e3d31", "#5f4b3c", "#715a48"],
    "dirt": ["#2e241c", "#43362a", "#5a4838", "#6f5b48", "#85705b"],
}
C_SHADOW = "#2a2e2a"


def a(r, i):
    return PAL_A[r][0][i]


def ao(r):
    return PAL_A[r][1]


def cc(r, i):
    return PAL_C[r][i]


# ====================================================================== GEOMETRIA COMUM
BARN = dict(hx=0.43, hy=0.43, wall=76.0, ridge=114.0, ov=0.06, eave=68.0, door=(-0.15, 0.15, 70.0))
BED = dict(h=0.41, z=12.0)


def barn_faces():
    b = BARN
    hx, hy, wz, rz, ov, ez = b["hx"], b["hy"], b["wall"], b["ridge"], b["ov"], b["eave"]
    return {
        "wall_px": [iso(hx, -hy, 0), iso(hx, hy, 0), iso(hx, hy, wz), iso(hx, -hy, wz)],
        "wall_py": [iso(-hx, hy, 0), iso(hx, hy, 0), iso(hx, hy, wz), iso(-hx, hy, wz)],
        "gable_px": [iso(hx, -hy, wz), iso(hx, hy, wz), iso(hx, 0, rz - 2)],
        "verge_back": [iso(hx + ov, 0, rz + 2), iso(hx + ov, -hy - ov, ez), iso(hx + ov, -hy - ov, ez - 4),
                       iso(hx, -hy, wz - 2), iso(hx, 0, rz - 3)],
        "roof_py": [iso(-hx - ov, 0, rz + 2), iso(hx + ov, 0, rz + 2), iso(hx + ov, hy + ov, ez),
                    iso(-hx - ov, hy + ov, ez)],
        "fascia": [iso(-hx - ov, hy + ov, ez), iso(hx + ov, hy + ov, ez), iso(hx + ov, hy + ov, ez - 4),
                   iso(-hx - ov, hy + ov, ez - 4)],
        "verge_py": [iso(hx + ov, 0, rz + 2), iso(hx + ov, hy + ov, ez), iso(hx + ov, hy + ov, ez - 4),
                     iso(hx + ov, 0, rz - 2)],
    }


def barn_proxy_w():
    b = BARN
    hx, hy, ov = b["hx"] + b["ov"], b["hy"] + b["ov"], b["ov"]
    out = []
    for x in (-hx, hx):
        for y in (-hy, hy):
            out += [W(x, y, 0), W(x, y, b["eave"])]
        out.append(W(x, 0, b["ridge"]))
    return out


def roof_z(y):
    b = BARN
    return b["ridge"] + 2 - (b["ridge"] + 2 - b["eave"]) * (y / (b["hy"] + b["ov"]))


def gable_top(y):
    b = BARN
    return b["wall"] + (b["ridge"] - 2 - b["wall"]) * (1 - abs(y) / b["hy"])


GROUND_N = 3
SLAB = 16.0
PATH_Y = (1.0 - 0.3, 1.0 + 0.3)


def ground_corners(z=0.0):
    lo, hi = -0.5, GROUND_N - 0.5
    return [iso(lo, lo, z), iso(hi, lo, z), iso(hi, hi, z), iso(lo, hi, z)]


def in_path(u, v, edge):
    return edge(u)[0] <= v <= edge(u)[1]


def path_edges(seed, jit=0.05, n=7):
    rng = random.Random(seed)
    us = [-0.5 + (GROUND_N) * i / n for i in range(n + 1)]
    top = [(u, PATH_Y[0] + rng.uniform(-jit, jit)) for u in us]
    bot = [(u, PATH_Y[1] + rng.uniform(-jit, jit)) for u in us]

    def edge(u):
        for i in range(n):
            if us[i] <= u <= us[i + 1]:
                t = (u - us[i]) / (us[i + 1] - us[i])
                return (top[i][1] + (top[i + 1][1] - top[i][1]) * t, bot[i][1] + (bot[i + 1][1] - bot[i][1]) * t)
        return PATH_Y
    return top, bot, edge


# Layout do trecho 3×3 (x, y do tile; desenhado por x + y)
SCENE = [("barn", 0.0, 0.0), ("pine", 2.0, 0.0), ("tree", 0.0, 2.0), ("farmer", 1.15, 1.0),
         ("crop", 1.0, 2.0), ("rock", 2.0, 2.0)]


# ====================================================================== ESTILO A
def a_planes(defs, poly, ramp, seed, offs=(0.28, -0.18, -0.62), d=LD2, amp=2.5, step=5.0, R=None,
             inner=None):
    """Massa com 4 tons em planos angulares: light (topo-esq.), base, shadow, deep (baixo-dir.)."""
    tones = PAL_A[ramp][0]
    cx, cy = centroid(poly)
    R = R or max(math.dist((cx, cy), p) for p in poly)
    cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
    nd = (-d[0], -d[1])
    body = (P(zig_region((cx, cy), d, offs[0] * R, R * 1.6, amp, step, seed), tones[0])
            + P(zig_region((cx, cy), nd, -offs[1] * R, R * 1.6, amp, step, seed + 1), tones[2])
            + P(zig_region((cx, cy), nd, -offs[2] * R, R * 1.6, amp, step, seed + 2), tones[3]))
    out = P(poly, tones[1]) + G(body, f'clip-path="url(#{cid})"')
    if inner:
        out += P(poly, "none", f'stroke="{inner}" stroke-width="1" stroke-linejoin="round"')
    return out


def a_split(defs, poly, ramp, sx, slant=0.15, light_dx=None, deep_y=None):
    """Parte de personagem/objeto: base + sombra à direita de x=sx (+ luz à esquerda, deep embaixo)."""
    tones = PAL_A[ramp][0]
    cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
    ys = [p[1] for p in poly]
    y0, y1 = min(ys) - 4, max(ys) + 4
    ym = (y0 + y1) / 2
    body = P([(sx + slant * (y0 - ym), y0), (999, y0), (999, y1), (sx + slant * (y1 - ym), y1)], tones[2])
    if light_dx is not None:
        lx = min(p[0] for p in poly) + light_dx
        body += P([(-999, y0), (lx + slant * (y0 - ym), y0), (lx + slant * (y1 - ym), y1), (-999, y1)], tones[0])
    if deep_y is not None:
        body += P([(sx - 2, deep_y), (999, deep_y - 2), (999, y1), (sx - 2, y1)], tones[3])
    return P(poly, tones[1]) + G(body, f'clip-path="url(#{cid})"')


def a_shadow(points_w):
    return P(shadow_hull(points_w, L_SH), A_SHADOW)


def a_tree(defs):
    trunk = [(-10, 2), (-5, -3), (-5, -40), (-16, -70), (-12, -73), (-2, -52), (2, -52), (12, -78),
             (16, -75), (6, -44), (5, -3), (11, 2), (0, 4)]
    masses = [  # (cx, cy, rx, ry, seed) do fundo para a frente
        (30, -126, 30, 25, 3), (-30, -122, 30, 24, 5), (2, -150, 32, 24, 7),
        (-38, -98, 24, 20, 11), (36, -96, 26, 20, 13), (-6, -118, 34, 27, 17), (6, -88, 30, 20, 19)]
    polys = [jag_poly(cx, cy, rx, ry, 14, s, inner=0.82, rot=s * 0.3) for cx, cy, rx, ry, s in masses]
    out = back_stroke([trunk], ao("bark"), 1.25) + back_stroke(polys, ao("leaf"), 1.25)
    out += a_split(defs, trunk, "bark", 1.5, slant=0.0, light_dx=4, deep_y=-6)
    for i, (poly, m) in enumerate(zip(polys, masses)):
        front = 1.0 if m[1] > -110 else 0.0
        offs = (0.30 + 0.15 * front, -0.12 + 0.1 * front, -0.55 + 0.12 * front)
        out += a_planes(defs, poly, "leaf", seed=m[4] * 7, offs=offs, inner=a("leaf", 3))
        rng = random.Random(m[4])
        for _ in range(3):  # marcas de folha: chevrons angulares
            x = m[0] + rng.uniform(-0.5, 0.3) * m[2]
            y = m[1] + rng.uniform(-0.5, 0.2) * m[3]
            col = a("leaf", 0) if (x - m[0]) * LD2[0] + (y - m[1]) * LD2[1] > 0 else a("leaf", 2)
            out += PL([(x - 3, y - 2), (x, y + 1), (x + 3, y - 2.5)], col, 1.1)
    shadow = a_shadow([W(0, 0, 0), W(0, 0, 60)] + ellipsoid_pts(W(0, 0, 120), 46, 46, 40))
    return out, shadow


def a_pine(defs):
    tiers = [(-108, -36, 46, 1), (-136, -70, 38, 2), (-162, -102, 29, 3), (-186, -132, 19, 4),
             (-204, -160, 10, 5)]
    trunk = [(-4, 2), (4, 2), (3, -42), (-3, -42)]
    polys = []
    for top, bot, w, s in tiers:
        rng = random.Random(s * 31)
        k = 7 + s % 2
        right = [(0, top), (w * 0.45, top + (bot - top) * 0.45), (w * 0.62, top + (bot - top) * 0.62),
                 (w, bot)]
        skirt = []
        for i in range(1, k):
            x = w - 2 * w * i / k
            skirt.append((x + rng.uniform(-1.5, 1.5), bot - (5 if i % 2 else -1) + rng.uniform(-1, 1)))
        left = [(-w, bot - rng.uniform(0, 2)), (-w * 0.6, top + (bot - top) * 0.6),
                (-w * 0.45, top + (bot - top) * 0.47)]
        polys.append(right + skirt + left)
    out = back_stroke([trunk] + polys, ao("pine"), 1.25)
    out += a_split(defs, trunk, "bark", 0.5, slant=0)
    for poly, (top, bot, w, s) in zip(polys, tiers):
        cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
        t = PAL_A["pine"][0]
        body = P([(-999, top - 9), (w * 0.12, top - 9), (w * 0.12 - 0.25 * (bot - top + 18), bot + 9),
                  (-999, bot + 9)], t[0])
        body += P([(w * 0.12, top - 9), (999, top - 9), (999, bot + 9), (w * 0.12 + 0.18 * (bot - top + 18), bot + 9)],
                  t[2])
        band = zig_region((0, bot), (0, 1), -7, w * 1.4, 2.5, 4.5, s)
        body += P(band, t[3], 'opacity="0.85"')
        out += P(poly, t[1]) + G(body, f'clip-path="url(#{cid})"')
        out += P(poly, "none", f'stroke="{t[3]}" stroke-width="1"')
    shadow = a_shadow([W(0, 0, 0)] + [W(math.cos(i) * .35, math.sin(i) * .35, 40) for i in range(8)]
                      + [W(0, 0, 205)])
    return out, shadow


def a_barn(defs):
    f = barn_faces()
    b = BARN
    hx, hy = b["hx"], b["hy"]
    sil = [f["wall_px"], f["wall_py"], f["gable_px"], f["verge_back"], f["roof_py"], f["fascia"], f["verge_py"]]
    out = back_stroke(sil, ao("wall"), 1.5)
    out += P(f["wall_px"], a("wall", 2)) + P(f["wall_py"], a("wall", 1))
    # tábuas verticais
    k = 14
    for i in range(1, k):
        x = -hx + 2 * hx * i / k
        out += LN(iso(x, hy, 6), iso(x, hy, b["wall"] - 1), a("wall", 2), 1)
        y = -hy + 2 * hy * i / k
        out += LN(iso(hx, y, 6), iso(hx, y, b["wall"] - 1), a("wall", 3), 1)
    out += P(f["verge_back"], a("roof", 3)) + P(f["gable_px"], a("wall", 2))
    for i in range(1, k):
        y = -hy + 2 * hy * i / k
        out += LN(iso(hx, y, b["wall"]), iso(hx, y, gable_top(y) - 1), a("wall", 3), 1)
    # fundação de pedra
    out += P([iso(-hx, hy, 0), iso(hx, hy, 0), iso(hx, hy, 7), iso(-hx, hy, 7)], a("stone", 1))
    out += P([iso(hx, -hy, 0), iso(hx, hy, 0), iso(hx, hy, 7), iso(hx, -hy, 7)], a("stone", 2))
    # beirais/cantos em creme
    for x in (-hx, hx - 0.03):
        out += P([iso(x, hy, 7), iso(x + 0.03, hy, 7), iso(x + 0.03, hy, b["wall"]), iso(x, hy, b["wall"])],
                 a("trim", 1))
    out += P([iso(hx, -hy, 7), iso(hx, -hy + 0.03, 7), iso(hx, -hy + 0.03, b["wall"]), iso(hx, -hy, b["wall"])],
             a("trim", 2))
    # porta dupla com travessa em X
    x0, x1, dz = b["door"]
    fr = 0.022
    out += P([iso(x0 - fr, hy, 0), iso(x1 + fr, hy, 0), iso(x1 + fr, hy, dz + 4), iso(x0 - fr, hy, dz + 4)],
             a("trim", 1))
    out += P([iso(x0, hy, 0), iso(x1, hy, 0), iso(x1, hy, dz), iso(x0, hy, dz)], a("wall", 3))
    xm = (x0 + x1) / 2
    for (u0, u1) in ((x0, xm), (xm, x1)):
        out += P([iso(u0 + 0.012, hy, 3), iso(u1 - 0.012, hy, 3), iso(u1 - 0.012, hy, dz - 3),
                  iso(u0 + 0.012, hy, dz - 3)], a("wall", 2))
        out += LN(iso(u0 + 0.02, hy, 5), iso(u1 - 0.02, hy, dz - 5), a("trim", 1), 2.2)
        out += LN(iso(u1 - 0.02, hy, 5), iso(u0 + 0.02, hy, dz - 5), a("trim", 1), 2.2)
        out += P([iso(u0 + 0.012, hy, 3), iso(u1 - 0.012, hy, 3), iso(u1 - 0.012, hy, dz - 3),
                  iso(u0 + 0.012, hy, dz - 3)], "none", f'stroke="{a("trim", 1)}" stroke-width="2"')
    out += LN(iso(xm, hy, 0), iso(xm, hy, dz), a("trim", 2), 1.5)
    # janela do sótão no oitão
    wy, wz0, wz1 = 0.08, 82, 100
    out += P([iso(hx, -wy - 0.02, wz0 - 3), iso(hx, wy + 0.02, wz0 - 3), iso(hx, wy + 0.02, wz1 + 3),
              iso(hx, -wy - 0.02, wz1 + 3)], a("trim", 2))
    out += P([iso(hx, -wy, wz0), iso(hx, wy, wz0), iso(hx, wy, wz1), iso(hx, -wy, wz1)], a("roof", 3))
    out += LN(iso(hx, 0, wz0), iso(hx, 0, wz1), a("trim", 2), 1.4)
    # telhado de chapa com nervuras
    out += P(f["roof_py"], a("roof", 0))
    rid = clip(defs, f'<polygon points="{pts(f["roof_py"])}"/>')
    ribs = ""
    n = 16
    X0, X1 = -hx - b["ov"], hx + b["ov"]
    for i in range(n + 1):
        x = X0 + (X1 - X0) * i / n
        ribs += LN(iso(x, 0, roof_z(0)), iso(x, hy + b["ov"], b["eave"]), a("roof", 2), 1.2)
        ribs += LN(iso(x + 0.012, 0, roof_z(0)), iso(x + 0.012, hy + b["ov"], b["eave"]), a("trim", 0), 0.7,
                   'opacity="0.5"')
    ribs += P([iso(X0, 0, roof_z(0)), iso(X1, 0, roof_z(0)), iso(X1, 0.05, roof_z(0.05)), iso(X0, 0.05, roof_z(0.05))],
              a("roof", 1))
    out += G(ribs, f'clip-path="url(#{rid})"')
    out += P(f["fascia"], a("roof", 3)) + P(f["verge_py"], a("roof", 3))
    # sombra do beiral na parede +y
    out += P([iso(-hx, hy, b["wall"]), iso(hx, hy, b["wall"]), iso(hx, hy, b["wall"] - 6), iso(-hx, hy, b["wall"] - 6)],
             a("wall", 3), 'opacity="0.8"')
    return out, a_shadow(barn_proxy_w())


def a_rock(defs):
    sil = [(-28, 2), (-31, -10), (-24, -26), (-10, -36), (6, -39), (21, -31), (30, -15), (27, -2), (12, 5), (-12, 5)]
    top = [(-24, -26), (-10, -36), (6, -39), (21, -31), (9, -22), (-7, -23)]
    left = [(-28, 2), (-31, -10), (-24, -26), (-7, -23), (-4, -8), (-12, 5)]
    right = [(-7, -23), (9, -22), (21, -31), (30, -15), (27, -2), (12, 5), (-12, 5), (-4, -8)]
    deep = [(9, -9), (30, -15), (27, -2), (12, 5), (-2, 4)]
    out = back_stroke([sil], ao("stone"), 1.25)
    out += P(left, a("stone", 1)) + P(right, a("stone", 2)) + P(deep, a("stone", 3)) + P(top, a("stone", 0))
    out += PL([(-7, -23), (-4, -8), (-12, 5)], a("stone", 3), 1) + PL([(-7, -23), (9, -22), (21, -31)], a("stone", 2), 1)
    out += PL([(9, -22), (9, -9), (-2, 4)], a("stone", 3), 1)
    nuggets = [((-20, -12), 6.5, 0.2), ((-9, -27), 5.5, -0.4), ((14, -29), 5, 0.5), ((-15, -2), 4.2, 0.9),
               ((3, -31), 3.8, 1.3)]
    for (x, y), r, rot in nuggets:
        poly = [(x + r * math.cos(rot + k * 2 * math.pi / 5) * (1 if k % 2 else 0.75),
                 y + r * 0.8 * math.sin(rot + k * 2 * math.pi / 5) * (1 if k % 2 else 0.75)) for k in range(5)]
        out += back_stroke([poly], ao("ore"), 0.9)
        out += a_split(defs, poly, "ore", x + 0.5, slant=0.6, light_dx=r * 0.5)
    out += PL([(16, -12), (21, -6), (19, 0)], a("stone", 3), 1)
    sh = a_shadow([W(x, y, z) for x in (-0.22, 0.22) for y in (-0.2, 0.2) for z in (0, 30)])
    return out, sh


def a_crop(defs):
    h, z = BED["h"], BED["z"]
    frame_py = [iso(-h, h, 0), iso(h, h, 0), iso(h, h, z), iso(-h, h, z)]
    frame_px = [iso(h, -h, 0), iso(h, h, 0), iso(h, h, z), iso(h, -h, z)]
    top = [iso(-h, -h, z), iso(h, -h, z), iso(h, h, z), iso(-h, h, z)]
    i_ = h - 0.05
    soil = [iso(-i_, -i_, z), iso(i_, -i_, z), iso(i_, i_, z), iso(-i_, i_, z)]
    out = back_stroke([frame_py, frame_px, top], ao("wood"), 1.25)
    out += P(frame_py, a("wood", 1)) + P(frame_px, a("wood", 2)) + P(top, a("wood", 0)) + P(soil, a("soil", 1))
    out += LN(iso(-h, h, z / 2), iso(h, h, z / 2), a("wood", 3), 1) + LN(iso(h, -h, z / 2), iso(h, h, z / 2), a("wood", 3), 1)
    for v in (-0.2, 0.0, 0.2):
        out += LN(iso(-i_, v + 0.06, z), iso(i_, v + 0.06, z), a("soil", 3), 1.2)
    tufts = []
    for iu, u in enumerate((-0.27, -0.09, 0.09, 0.27)):
        for iv, v in enumerate((-0.24, -0.02, 0.2)):
            tufts.append((u + 0.02 * ((iu + iv) % 2), v))
    tufts.sort(key=lambda t: t[0] + t[1])
    for n, (u, v) in enumerate(tufts):
        bx, by = iso(u, v, z)
        rng = random.Random(n * 13 + 1)
        for k, lean in enumerate((-4.0, 0.5, 4.5)):
            hgt = 26 + rng.uniform(-3, 3)
            tx, ty = bx + lean * 0.6, by - hgt
            out += LN((bx + lean * 0.15, by), (tx, ty + 8), a("wheat", 2), 1.2)
            sk = lean * 0.12
            ear = [(tx + sk, ty - 3), (tx + 1.6, ty + 1), (tx + 1.5, ty + 5), (tx, ty + 9.5), (tx - 1.5, ty + 5),
                   (tx - 1.6 + sk * 0.5, ty + 1)]
            out += back_stroke([ear], ao("wheat"), 0.7)
            out += P(ear, a("wheat", 1)) + P([ear[0], ear[5], ear[4], ear[3]], a("wheat", 0))
            out += LN((tx - 1.4, ty + 2.5), (tx + 1.4, ty + 1.5), a("wheat", 2), 0.6)
            out += LN((tx - 1.4, ty + 5.5), (tx + 1.4, ty + 4.5), a("wheat", 2), 0.6)
            out += LN((tx, ty - 2), (tx + lean * 0.25, ty - 7), a("wheat", 2), 0.8)
    sh = a_shadow([W(x, y, zz) for x in (-h, h) for y in (-h, h) for zz in (0, z)] + [W(0, 0, 40)])
    return out, sh


def a_farmer(defs):
    parts = []  # (poly, ramp, split, light_dx, deep_y)
    parts += [([(-10, 1), (-1, 1), (-1, -3), (-2, -8), (-9, -8), (-10.5, -3)], "boots", -4, None, None),
              ([(1.5, 1), (11, 1), (11, -3), (9.5, -8), (2, -8), (1.5, -3)], "boots", 5, None, None)]
    parts.append(([(-9.5, -7), (-2, -7), (-0.6, -33), (0.6, -33), (2, -7), (9.5, -7), (10.6, -42), (-10.6, -42)],
                  "pants", 1.5, 3, None))
    parts.append(([(-11, -42), (11, -42), (11, -45.5), (-11, -45.5)], "boots", 3, None, None))
    torso = [(-11, -45), (11, -45), (12.5, -56), (14.5, -64), (10, -67), (4, -68.5), (-4, -68.5), (-10, -67),
             (-14.5, -64), (-12.5, -56)]
    parts.append((torso, "shirt", 3, 4, None))
    parts.append(([(-11, -45), (-3, -45), (-3.5, -60), (-5, -67.3), (-10, -67), (-14.3, -64), (-12.5, -56)],
                  "vest", -6, 3, None))
    parts.append(([(11, -45), (3, -45), (3.5, -60), (5, -67.3), (10, -67), (14.3, -64), (12.5, -56)],
                  "vest", 3, None, None))
    for sgn in (-1, 1):
        def m(p):
            return [(sgn * x, y) for x, y in p]
        sleeve = m([(-14.5, -64), (-10, -66), (-10.5, -54), (-11.5, -47), (-17, -47), (-17.8, -55)])
        fore = m([(-17, -47.5), (-11.5, -47.5), (-12.3, -38.5), (-16.4, -38.5)])
        hand = m([(-16.4, -38.8), (-12.3, -38.8), (-12.4, -33.5), (-14, -32.3), (-16.6, -34)])
        sp = -13.5 if sgn < 0 else 12
        parts += [(sleeve, "shirt", sp, 2 if sgn < 0 else None, None),
                  (fore, "skin", sp, None, None), (hand, "skin", sp, None, None)]
    parts.append(([(-3.5, -67), (3.5, -67), (3.5, -71.5), (-3.5, -71.5)], "skin", -9, None, None))
    head = [(-6.5, -71.5), (-2, -70), (3, -70), (6.5, -72.5), (7.5, -78), (7, -84), (4, -86.5), (-4, -86.5),
            (-7, -84), (-7.5, -78)]
    parts.append(([(-7.4, -80.5), (-9.2, -79.5), (-9, -75.5), (-7.4, -75)], "skin", 9, None, None))
    parts.append((head, "skin", 3, None, None))
    parts.append(([(-7, -77), (-6.5, -72), (-2, -70), (3, -70), (6.5, -72.5), (7.3, -77), (5.5, -75.3), (4, -74.2),
                   (1, -74.6), (-2, -74.2), (-5, -75.4)], "hair", 3, None, None))
    parts.append(([(-7.5, -81.5), (-7, -86.5), (0, -87.5), (7, -86.5), (7.6, -82.5), (6, -83.5), (-6, -83.5)],
                  "hair", 3, None, None))
    brim = [(-17, -84), (-12, -87.5), (0, -89), (12, -87.5), (17, -84), (12, -81.5), (0, -80.8), (-12, -81.5)]
    crown = [(-8, -86), (8, -86), (7, -93), (3, -95.5), (-3, -95.5), (-7, -93)]
    parts += [(brim, "hat", 4, 5, None), (crown, "hat", 2.5, 3, None),
              ([(-8, -86), (8, -86), (7.7, -88.8), (-7.7, -88.8)], "boots", 2.5, None, None)]
    out = back_stroke([p[0] for p in parts], A_INK, 1.25)
    for poly, ramp, sx, ldx, dy in parts:
        out += a_split(defs, poly, ramp, sx, slant=0.12, light_dx=ldx, deep_y=dy)
    # sombra da aba no rosto (plano), rosto contido
    hid = clip(defs, f'<polygon points="{pts(head)}"/>')
    out += G(P([(-12, -90), (12, -90), (12, -79.6), (-12, -78.8)], a("skin", 2)), f'clip-path="url(#{hid})"')
    out += LN((-3.8, -78), (-1.6, -78.1), "#2b2320", 1.1) + LN((2.2, -78.1), (4.3, -78), "#2b2320", 1.1)
    out += P([(1.1, -78), (2.9, -74.6), (0.8, -74.8)], a("skin", 2))
    out += LN((-1.2, -72.4), (2.4, -72.5), a("hair", 3), 0.9)
    out += LN((0, -33), (0.4, -42), a("pants", 3), 0.9)
    body = G(out, 'transform="scale(0.86)"')
    sh = a_shadow([W(x, y, z) for x in (-0.08, 0.08) for y in (-0.08, 0.08) for z in (0, 70)])
    return body, sh


def a_ground(defs):
    corners = ground_corners()
    lo, hi = -0.5, GROUND_N - 0.5
    out = ""
    side_y = [iso(hi, hi, 0), iso(lo, hi, 0), iso(lo, hi, -SLAB), iso(hi, hi, -SLAB)]
    side_x = [iso(hi, lo, 0), iso(hi, hi, 0), iso(hi, hi, -SLAB), iso(hi, lo, -SLAB)]
    out += back_stroke([side_x, side_y, corners], ao("dirt"), 1.25)
    out += P(side_y, a("dirt", 1)) + P(side_x, a("dirt", 2))
    for k, z in enumerate((-6, -11)):
        rng = random.Random(k)
        line_y = [iso(lo + (hi - lo) * i / 8, hi, z + rng.uniform(-1.5, 1.5)) for i in range(9)]
        line_x = [iso(hi, lo + (hi - lo) * i / 8, z + rng.uniform(-1.5, 1.5)) for i in range(9)]
        out += PL(line_y, a("dirt", 2), 1) + PL(line_x, a("dirt", 3), 1)
    out += P([iso(hi, hi, 0), iso(lo, hi, 0), iso(lo, hi, -3), iso(hi, hi, -3)], a("grass", 2))
    out += P([iso(hi, lo, 0), iso(hi, hi, 0), iso(hi, hi, -3), iso(hi, lo, -3)], a("grass", 3))
    out += P(corners, a("grass", 1))
    gid = clip(defs, f'<polygon points="{pts(corners)}"/>')
    rng = random.Random(42)
    det = ""
    for i in range(14):  # manchas angulares de luz e sombra
        u, v = rng.uniform(lo, hi), rng.uniform(lo, hi)
        poly = [iso(u + rng.uniform(-.25, .25), v + rng.uniform(-.2, .2)) for _ in range(5)]
        det += P(hull(poly), a("grass", 0 if i % 2 else 2), 'opacity="0.55"')
    top, bot, edge = path_edges(7)
    path = [iso(*p) for p in top] + [iso(*p) for p in reversed(bot)]
    det += P(path, a("path", 1))
    det += P([iso(*p) for p in top] + [iso(u, v + 0.07) for u, v in reversed(top)], a("path", 3))
    det += P([iso(u, v - 0.05) for u, v in bot] + [iso(*p) for p in reversed(bot)], a("path", 0))
    det += P([iso(u, v + 0.07) for u, v in top] + [iso(u, v + 0.13) for u, v in reversed(top)], a("path", 2),
             'opacity="0.7"')
    for i in range(16):  # cascalho angular
        u = rng.uniform(lo, hi)
        e = edge(u)
        v = rng.uniform(e[0] + 0.12, e[1] - 0.06)
        x, y = iso(u, v)
        s = rng.uniform(1.5, 2.6)
        det += P([(x - s, y), (x - s * 0.3, y - s * 0.7), (x + s, y - s * 0.3), (x + s * 0.4, y + s * 0.5)], a("path", 2))
        det += P([(x - s, y), (x - s * 0.3, y - s * 0.7), (x + s * 0.2, y - s * 0.4)], a("path", 0))
    for i in range(46):  # tufos em V
        u, v = rng.uniform(lo + .05, hi - .05), rng.uniform(lo + .05, hi - .05)
        e = edge(u)
        if e[0] - 0.08 < v < e[1] + 0.05:
            continue
        x, y = iso(u, v)
        s = rng.uniform(0.8, 1.2)
        det += P([(x - 4 * s, y), (x - 3 * s, y - 6 * s), (x - 1.5 * s, y - 1.5 * s), (x, y - 8 * s),
                  (x + 1.4 * s, y - 1.6 * s), (x + 3.5 * s, y - 5.5 * s), (x + 3.5 * s, y)], a("grass", 2))
        det += P([(x - 3 * s, y - 6 * s), (x - 1.5 * s, y - 1.5 * s), (x, y - 8 * s), (x - 0.4 * s, y - 1)],
                 a("grass", 0))
    out += G(det, f'clip-path="url(#{gid})"')
    return out


# ====================================================================== ESTILO B (malha 3D)
class Mesh:
    def __init__(self):
        self.f = []

    def face(self, vs, col, ref):
        e1, e2 = sub(vs[1], vs[0]), sub(vs[2], vs[0])
        n = norm(cross(e1, e2))
        if len(vs) > 3:
            n = norm(add(n, norm(cross(sub(vs[2], vs[0]), sub(vs[3], vs[0])))))
        c = tuple(sum(v[i] for v in vs) / len(vs) for i in range(3))
        if dot(n, sub(c, ref)) < 0:
            n = mul(n, -1)
        self.f.append((vs, col, n))

    def tri_quad(self, q, col, ref):
        self.face([q[0], q[1], q[2]], col, ref)
        self.face([q[0], q[2], q[3]], col, ref)


def lp_color(base, k):
    b = h2r(base)
    t = 0.56 + 0.58 * k
    c = [v * t for v in b]
    if k < 0.35:
        c = [v + (w - v) * (0.35 - k) * 0.5 for v, w in zip(c, (58, 68, 100))]
    if k > 0.72:
        c = [v + (w - v) * (k - 0.72) * 0.55 for v, w in zip(c, (255, 238, 196))]
    return r2h(c)


def m_render(mesh, L=L_STD, sort=True):
    faces = [f for f in mesh.f if dot(f[2], VIEW) > 1e-4]
    if sort:
        faces.sort(key=lambda f: sum(dot(v, VIEW) for v in f[0]) / len(f[0]))
    out = []
    for vs, col, n in faces:
        k = max(0.0, dot(n, L))
        fc = lp_color(col, k)
        out.append(f'<polygon points="{pts([scr(v) for v in vs])}" fill="{fc}" stroke="{fc}" '
                   f'stroke-width="0.6" stroke-linejoin="round"/>')
    return "".join(out)


def m_hexa(m, bot, top, col, cap_bottom=False):
    ref = tuple(sum(v[i] for v in bot + top) / 8 for i in range(3))
    for i in range(4):
        j = (i + 1) % 4
        m.face([bot[i], bot[j], top[j], top[i]], col, ref)
    m.face(list(top), col, ref)
    if cap_bottom:
        m.face(list(bot), col, ref)


def m_box(m, c, sx, sy, z0, h, col, taper=1.0):
    cx, cy = c
    bot = [(cx - sx / 2, cy - sy / 2, z0), (cx + sx / 2, cy - sy / 2, z0), (cx + sx / 2, cy + sy / 2, z0),
           (cx - sx / 2, cy + sy / 2, z0)]
    top = [(cx + (x - cx) * taper, cy + (y - cy) * taper, z0 + h) for x, y, _ in bot]
    m_hexa(m, bot, top, col)


def m_strut(m, p0, p1, r0, r1, n, col, rot=0.0, rng=None, jit=0.0, caps=True):
    ax = norm(sub(p1, p0))
    hlp = (0, 0, 1) if abs(ax[2]) < 0.9 else (1, 0, 0)
    u = norm(cross(ax, hlp))
    v = cross(ax, u)
    ref = mul(add(p0, p1), 0.5)

    def ring(p, r):
        out = []
        for i in range(n):
            t = rot + 2 * math.pi * i / n
            rr = r * (1 + (rng.uniform(-jit, jit) if rng else 0))
            out.append(add(p, add(mul(u, rr * math.cos(t)), mul(v, rr * math.sin(t)))))
        return out
    r_a = ring(p0, r0)
    if r1 <= 0:
        for i in range(n):
            m.face([r_a[i], r_a[(i + 1) % n], p1], col, ref)
    else:
        r_b = ring(p1, r1)
        for i in range(n):
            j = (i + 1) % n
            if jit:
                m.tri_quad([r_a[i], r_a[j], r_b[j], r_b[i]], col, ref)
            else:
                m.face([r_a[i], r_a[j], r_b[j], r_b[i]], col, ref)
        if caps:
            m.face(r_b, col, ref)
    if caps:
        m.face(r_a, col, ref)


def m_blob(m, c, rx, ry, rz, cols, lat=4, lon=7, jit=0.18, seed=0, zmin=None):
    rng = random.Random(seed)
    rings = []
    for i in range(1, lat):
        ph = math.pi * i / lat
        ring = []
        for j in range(lon):
            th = 2 * math.pi * j / lon + (i % 2) * math.pi / lon + seed
            k = 1 + rng.uniform(-jit, jit)
            p = (c[0] + rx * k * math.sin(ph) * math.cos(th), c[1] + ry * k * math.sin(ph) * math.sin(th),
                 c[2] + rz * k * math.cos(ph))
            if zmin is not None:
                p = (p[0], p[1], max(p[2], zmin))
            ring.append(p)
        rings.append(ring)
    top = (c[0] + rng.uniform(-.15, .15) * rx, c[1] + rng.uniform(-.15, .15) * ry, c[2] + rz * (1 + rng.uniform(-jit, 0)))
    bot = (c[0], c[1], c[2] - rz if zmin is None else max(c[2] - rz, zmin))

    def col():
        return rng.choice(cols)
    for j in range(lon):
        m.face([top, rings[0][j], rings[0][(j + 1) % lon]], col(), c)
        m.face([bot, rings[-1][(j + 1) % lon], rings[-1][j]], col(), c)
    for i in range(len(rings) - 1):
        for j in range(lon):
            q = [rings[i][j], rings[i][(j + 1) % lon], rings[i + 1][(j + 1) % lon], rings[i + 1][j]]
            m.tri_quad(q, col(), c)


def b_shadow(mesh, extra=()):
    vs = [v for f in mesh.f for v in f[0]] + list(extra)
    return P(shadow_hull(vs, L_SH), B_SHADOW)


def b_tree(defs):
    m = Mesh()
    rng = random.Random(4)
    m_strut(m, (0, 0, -2), (2, -1, 70), 7, 4.2, 6, PAL_B["bark"][0], rng=rng, jit=0.1)
    m_strut(m, (1, 0, 48), (-16, 10, 82), 3.2, 1.8, 5, PAL_B["bark"][0])
    m_strut(m, (1, -1, 56), (14, -8, 90), 3.0, 1.6, 5, PAL_B["bark"][0])
    blobs = [(-14, 16, 92, 26, 24, 22, 1), (18, -12, 100, 27, 25, 23, 2), (-12, -14, 128, 26, 24, 22, 3),
             (-2, 2, 112, 38, 36, 32, 4), (10, 18, 90, 25, 22, 21, 5), (6, 0, 142, 22, 20, 18, 6)]
    for x, y, z, rx, ry, rz, s in blobs:
        m_blob(m, (x, y, z), rx, ry, rz, PAL_B["leaf"], lat=4, lon=6, jit=0.24, seed=s)
    return m_render(m), b_shadow(m)


def b_pine(defs):
    m = Mesh()
    m_strut(m, (0, 0, 0), (0, 0, 26), 5, 4.2, 5, PAL_B["bark"][0])
    tiers = [(24, 56, 36), (54, 52, 29), (84, 48, 22), (112, 44, 15), (138, 34, 8)]
    for k, (z0, h, r) in enumerate(tiers):
        rng = random.Random(k + 10)
        n = 7
        ring = []
        for i in range(n):
            t = 2 * math.pi * i / n + k * 0.5
            rr = r * rng.uniform(0.85, 1.12)
            ring.append((rr * math.cos(t), rr * math.sin(t), z0 + (-5 if i % 2 else 2) + rng.uniform(-1.5, 1.5)))
        apex = (rng.uniform(-1.5, 1.5), rng.uniform(-1.5, 1.5), z0 + h)
        mid = []
        for i in range(n):  # anel intermediário: facetas quebradas, não cone liso
            p = ring[i]
            mid.append((p[0] * 0.55 * rng.uniform(.9, 1.1), p[1] * 0.55 * rng.uniform(.9, 1.1), z0 + h * 0.45))
        ref = (0, 0, z0 + h * 0.3)
        for i in range(n):
            j = (i + 1) % n
            m.tri_quad([ring[i], ring[j], mid[j], mid[i]], rng.choice(PAL_B["pine"]), ref)
            m.face([mid[i], mid[j], apex], rng.choice(PAL_B["pine"]), ref)
    return m_render(m), b_shadow(m)


def b_farmer_mesh():
    m = Mesh()
    R, F = norm((1, -1, 0)), norm((1, 1, 0))

    def loc(r, f, z):
        return (r * R[0] + f * F[0], r * R[1] + f * F[1], z)
    pb = PAL_B
    for s in (-1, 1):
        m_hexa(m, [loc(s * 4 - 3, -3, 0), loc(s * 4 + 3, -3, 0), loc(s * 4 + 3, 6, 0), loc(s * 4 - 3, 6, 0)],
               [loc(s * 4 - 2.6, -2.6, 6), loc(s * 4 + 2.6, -2.6, 6), loc(s * 4 + 2.6, 3, 6), loc(s * 4 - 2.6, 3, 6)],
               pb["boots"][0])
        m_strut(m, loc(s * 4, 0, 5), loc(s * 4.4, 0, 36), 3.3, 4.1, 5, pb["pants"][0], rot=0.3)
    m_hexa(m, [loc(-8.6, -4.6, 34), loc(8.6, -4.6, 34), loc(8.6, 4.6, 34), loc(-8.6, 4.6, 34)],
           [loc(-8.8, -4.8, 38), loc(8.8, -4.8, 38), loc(8.8, 4.8, 38), loc(-8.8, 4.8, 38)], pb["band"][0])
    m_hexa(m, [loc(-8.6, -4.6, 38), loc(8.6, -4.6, 38), loc(8.6, 4.6, 38), loc(-8.6, 4.6, 38)],
           [loc(-11, -5, 59), loc(11, -5, 59), loc(11, 5, 59), loc(-11, 5, 59)], pb["shirt"][0])
    m_hexa(m, [loc(-11, -5, 59), loc(11, -5, 59), loc(11, 5, 59), loc(-11, 5, 59)],
           [loc(-6, -3.5, 62), loc(6, -3.5, 62), loc(6, 3.5, 62), loc(-6, 3.5, 62)], pb["shirt"][0])
    for s in (-1, 1):
        m_strut(m, loc(s * 11.5, 0, 58), loc(s * 13.5, 1, 45), 3.1, 2.8, 5, pb["shirt"][0])
        m_strut(m, loc(s * 13.5, 1, 45), loc(s * 13, 2.5, 33), 2.6, 2.3, 5, pb["skin"][0])
        m_blob(m, loc(s * 13, 2.6, 31), 2.4, 2.4, 2.8, pb["skin"], lat=3, lon=5, jit=0.05, seed=s + 3)
    m_strut(m, loc(0, 0, 60), loc(0, 0.5, 64), 2.8, 2.6, 5, pb["skin"][0])
    m_blob(m, loc(0, 0.6, 68.5), 5.3, 5.6, 6.6, pb["skin"], lat=3, lon=6, jit=0.04, seed=1)
    m_hexa(m, [loc(-4.2, 2.4, 61.6), loc(4.2, 2.4, 61.6), loc(4.6, 6.4, 63.5), loc(-4.6, 6.4, 63.5)],
           [loc(-5, 1.5, 67), loc(5, 1.5, 67), loc(5.2, 6.2, 67.5), loc(-5.2, 6.2, 67.5)], pb["beard"][0])
    m_strut(m, loc(0, 5.6, 69.5), loc(0, 7.8, 68.2), 1.3, 0, 3, pb["skin"][0])
    m_strut(m, loc(0, 0, 72.5), loc(0, 0, 73.8), 11, 11, 8, pb["hat"][0], rot=0.2)
    m_strut(m, loc(0, 0, 73.8), loc(0, 0, 75.4), 6.4, 6.3, 6, pb["band"][0])
    m_strut(m, loc(0, 0, 75.4), loc(0, 0, 80.5), 6.3, 5.0, 6, pb["hat"][0])
    return m


def b_farmer(defs):
    m = b_farmer_mesh()
    return m_render(m), b_shadow(m)


def b_barn_mesh():
    m = Mesh()
    b = BARN
    hx, hy, ov = b["hx"] * WT, b["hy"] * WT, b["ov"] * WT
    wz, rz, ez = b["wall"] / ZS, b["ridge"] / ZS, b["eave"] / ZS
    pb = PAL_B
    m_box(m, (0, 0), 2 * hx + 3, 2 * hy + 3, 0, 6 / ZS, pb["stone"][0])
    m_box(m, (0, 0), 2 * hx, 2 * hy, 6 / ZS, wz - 6 / ZS, pb["wall"][0])
    ref = (0, 0, wz)
    for sx in (-1, 1):
        m.face([(sx * hx, -hy, wz), (sx * hx, hy, wz), (sx * hx, 0, rz)], pb["wall"][0], ref)
    th = 3.5
    for sy in (-1, 1):
        top = [(-hx - ov, 0, rz + 2), (hx + ov, 0, rz + 2), (hx + ov, sy * (hy + ov), ez), (-hx - ov, sy * (hy + ov), ez)]
        bot = [(x, y, z - th) for x, y, z in top]
        m_hexa(m, bot, top, pb["roof"][0])
    m_strut(m, (-hx - ov, 0, rz + 2.4), (hx + ov, 0, rz + 2.4), 2.6, 2.6, 4, pb["roof"][0], rot=math.pi / 4)
    return m


def b_barn(defs):
    m = b_barn_mesh()
    b = BARN
    hy, hx = b["hy"] * WT + 0.4, b["hx"] * WT + 0.4
    ky = max(0, dot((0, 1, 0), L_STD))
    kx = max(0, dot((1, 0, 0), L_STD))
    x0, x1, dz = b["door"][0] * WT, b["door"][1] * WT, b["door"][2] / ZS
    out = m_render(m)
    trim_y, door_y = lp_color(PAL_B["trim"][0], ky), lp_color(PAL_B["door"][0], ky)
    out += P([scr((x0 - 2, hy, 0)), scr((x1 + 2, hy, 0)), scr((x1 + 2, hy, dz + 3)), scr((x0 - 2, hy, dz + 3))], trim_y)
    xm = (x0 + x1) / 2
    for u0, u1, sh in ((x0, xm, 0.0), (xm, x1, 0.12)):
        out += P([scr((u0 + 0.6, hy, 0)), scr((u1 - 0.6, hy, 0)), scr((u1 - 0.6, hy, dz)), scr((u0 + 0.6, hy, dz))],
                 mix(door_y, "#000000", sh))
        out += P([scr((u0 + 0.6, hy, dz * 0.46)), scr((u1 - 0.6, hy, dz * 0.54)), scr((u1 - 0.6, hy, dz * 0.54 + 2.4)),
                  scr((u0 + 0.6, hy, dz * 0.46 + 2.4))], trim_y)
    wy, w0, w1 = 6.0, 82 / ZS, 100 / ZS
    trim_x = lp_color(PAL_B["trim"][0], kx)
    out += P([scr((hx, -wy - 1.6, w0 - 2)), scr((hx, wy + 1.6, w0 - 2)), scr((hx, wy + 1.6, w1 + 2)),
              scr((hx, -wy - 1.6, w1 + 2))], trim_x)
    out += P([scr((hx, -wy, w0)), scr((hx, wy, w0)), scr((hx, wy, w1)), scr((hx, -wy, w1))],
             lp_color(PAL_B["door"][0], kx * 0.5))
    return out, b_shadow(m)


def b_rock(defs):
    m = Mesh()
    m_blob(m, (0, 0, 8), 30, 26, 26, PAL_B["stone"], lat=3, lon=7, jit=0.26, seed=8, zmin=0)
    m_blob(m, (18, 16, 2), 13, 12, 11, PAL_B["stone"], lat=3, lon=5, jit=0.25, seed=9, zmin=0)
    rng = random.Random(2)
    for i, (vs, col, n) in enumerate(m.f):  # facetas de minério embutidas no lado claro
        c = tuple(sum(v[k] for v in vs) / 3 for k in range(3))
        if n[1] > 0.15 and n[0] < 0.5 and 3 < c[2] < 30 and rng.random() < 0.8:
            m.f[i] = (vs, PAL_B["ore"][0], n)
    shards = [((-14, 18, 6), (-0.4, 0.9, 0.15), 7, 3.4), ((4, 22, 4), (0.2, 1.0, 0.1), 6, 3.0)]
    for p, d, ln, r in shards:
        d = norm(d)
        m_strut(m, sub(p, mul(d, 3)), add(p, mul(d, ln)), r, 0, 4, PAL_B["ore"][0], rot=0.4)
    return m_render(m), b_shadow(m)


def b_crop(defs):
    m = Mesh()
    h, z = BED["h"] * WT, BED["z"] / ZS
    m_box(m, (0, 0), 2 * h, 2 * h, 0, z, PAL_B["wood"][0])
    out = m_render(m)
    i_ = h - 3.5
    k_top = dot((0, 0, 1), L_STD)
    out += P([scr((-i_, -i_, z + 0.1)), scr((i_, -i_, z + 0.1)), scr((i_, i_, z + 0.1)), scr((-i_, i_, z + 0.1))],
             lp_color(PAL_B["soil"][0], k_top))
    for v in (-14, 0, 14):  # sulcos
        out += P([scr((-i_, v + 3, z + 0.1)), scr((i_, v + 3, z + 0.1)), scr((i_, v + 5.5, z + 0.1)),
                  scr((-i_, v + 5.5, z + 0.1))], lp_color(PAL_B["soil"][0], 0.35))
    w = Mesh()
    rng = random.Random(21)
    for u in (-20, -7, 7, 20):
        for v in (-17, -2, 13):
            for k in range(3):
                bx, by = u + rng.uniform(-3, 3), v + rng.uniform(-3, 3)
                hgt = rng.uniform(20, 27)
                lx, ly = rng.uniform(-4, 4), rng.uniform(-4, 4)
                top = (bx + lx, by + ly, z + hgt)
                m_strut(w, (bx, by, z), top, 1.0, 0.8, 3, PAL_B["stem"][0], caps=False)
                tip = (bx + lx * 1.35, by + ly * 1.35, z + hgt + 10)
                m_strut(w, sub(top, (lx * 0.05, ly * 0.05, 1)), tip, 2.6, 0, 5, rng.choice(PAL_B["wheat"]), rot=0.3)
    out += m_render(w)
    return out, b_shadow(m, [v for f in w.f for v in f[0]])


def b_ground(defs):
    lo, hi = -0.5, GROUND_N - 0.5
    sub_n = 6
    N = GROUND_N * sub_n
    step = (hi - lo) / N
    rng = random.Random(77)
    zj = {}
    for i in range(N + 1):
        for j in range(N + 1):
            edge = i in (0, N) or j in (0, N)
            zj[(i, j)] = 0.0 if edge else rng.uniform(-2.6, 2.6)
    top, bot, pe = path_edges(7, jit=0.03)

    def V(i, j):
        u, v = lo + i * step, lo + j * step
        z = zj[(i, j)]
        e = pe(u)
        if e[0] + 0.02 < v < e[1] - 0.02:
            z -= 1.5
        return (u * WT, v * WT, z)
    m = Mesh()
    out_slab = Mesh()
    for i in range(N):
        for j in range(N):
            q = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)]
            for tri in (([q[0], q[1], q[2]]), ([q[0], q[2], q[3]])):
                cu = sum(p[0] for p in tri) / 3 / WT
                cv = sum(p[1] for p in tri) / 3 / WT
                e = pe(cu)
                col = rng.choice(PAL_B["path"] if e[0] < cv < e[1] else PAL_B["grass"])
                m.face(tri, col, (tri[0][0], tri[0][1], -50))
    d = -SLAB / ZS
    for k in range(N):
        u0, u1 = lo + k * step, lo + (k + 1) * step
        r = random.Random(k)
        za, zb = d + r.uniform(-2, 2), d + random.Random(k + 1).uniform(-2, 2)
        out_slab.face([(hi * WT, u0 * WT, 0), (hi * WT, u1 * WT, 0), (hi * WT, u1 * WT, zb), (hi * WT, u0 * WT, za)],
                      PAL_B["dirt"][0], (0, 0, -50))
        out_slab.face([(u0 * WT, hi * WT, 0), (u1 * WT, hi * WT, 0), (u1 * WT, hi * WT, zb), (u0 * WT, hi * WT, za)],
                      PAL_B["dirt"][0], (0, 0, -50))
    return m_render(out_slab, sort=False) + m_render(m, sort=False)


# ====================================================================== ESTILO C (pintado)
def c_grad(defs, stops, x1=0, y1=0, x2=1, y2=1):
    return f'url(#{lin(defs, [(i / (len(stops) - 1), s) for i, s in enumerate(stops)], x1, y1, x2, y2)})'


def c_shadow(points_w, L=L_LOW):
    h = shadow_hull(points_w, L)
    return (G(P(scale_about(h, 1.06), C_SHADOW), 'opacity="0.13"')
            + G(P(scale_about(h, 0.86), C_SHADOW), 'opacity="0.20"'))


def leaf_clump(x, y, r, seed, n=None):
    rng = random.Random(seed)
    n = n or rng.choice((7, 9))
    rot = rng.uniform(0, math.pi)
    out = []
    for i in range(n):
        a_ = rot + 2 * math.pi * i / n
        rr = r * (rng.uniform(0.85, 1.12) if i % 2 == 0 else rng.uniform(0.42, 0.6))
        out.append((x + math.cos(a_) * rr, y + math.sin(a_) * rr * 0.82))
    return out


def c_tree(defs):
    rng = random.Random(5)
    out = ""
    trunk = [(-11, 3), (-6, -4), (-6, -46), (-19, -86), (-15, -88), (-2, -62), (2, -62), (14, -96), (18, -93),
             (6, -52), (6, -4), (12, 3), (0, 5)]
    out += P(trunk, c_grad(defs, [cc("bark", 3), cc("bark", 2), cc("bark", 1), cc("bark", 0)], 0, 0, 1, 0))
    for i in range(16):  # casca: estrias verticais
        x = rng.uniform(-5.5, 5.5)
        y0 = rng.uniform(-50, -6)
        out += PL([(x, y0), (x + rng.uniform(-1, 1), y0 + rng.uniform(-14, -6))],
                  cc("bark", 0) if x > -1 else cc("bark", 4), 0.8, 'opacity="0.6"')
    env = [(0, -124, 58, 44), (-36, -104, 32, 26), (38, -108, 32, 28), (-12, -156, 34, 24), (24, -146, 30, 24),
           (-46, -130, 22, 20), (6, -96, 40, 20)]
    cx, cy = 0, -126

    def inside(x, y):
        return any(((x - ex) / ex_r) ** 2 + ((y - ey) / ey_r) ** 2 < 1 for ex, ey, ex_r, ey_r in env)
    clumps = []
    while len(clumps) < 170:
        x, y = rng.uniform(-80, 80), rng.uniform(-186, -78)
        if inside(x, y):
            clumps.append((x, y, rng.uniform(6.5, 10.5), rng.random()))
    # massa de fundo escura (irregular) e galhos
    for i, (x, y, r, d) in enumerate(clumps):
        out += P(leaf_clump(x, y, r * 1.25, i + 1000), cc("leaf", 0))
    for (x0, y0, x1, y1, w) in ((-14, -84, -34, -112, 3), (12, -92, 30, -122, 2.6), (0, -62, -4, -130, 3.4),
                                (-4, -110, 18, -150, 2), (-20, -100, -10, -146, 2)):
        out += LN((x0, y0), (x1, y1), cc("bark", 1), w)
    clumps.sort(key=lambda c: c[3] + (c[1] - cy) / 120)
    sun = LD2
    for i, (x, y, r, d) in enumerate(clumps):
        vx, vy = (x - cx) / 62, (y - cy) / 48
        lit = 0.42 + 0.42 * (vx * sun[0] + vy * sun[1]) + 0.3 * d - 0.15
        lit += rng.uniform(-0.08, 0.08)
        col = ramp_at(PAL_C["leaf"], lit)
        out += P(leaf_clump(x, y, r, i), col)
        if lit > 0.62:  # pontas iluminadas
            out += P(leaf_clump(x - r * 0.2, y - r * 0.25, r * 0.55, i + 500), ramp_at(PAL_C["leaf"], lit + 0.18))
    sh = c_shadow([W(0, 0, 0), W(0, 0, 60)] + ellipsoid_pts(W(0, 0, 128), 48, 48, 42))
    return out, sh


def c_pine(defs):
    rng = random.Random(9)
    out = P([(-4.5, 3), (4.5, 3), (1.6, -200), (-1.6, -200)],
            c_grad(defs, [cc("bark", 3), cc("bark", 1), cc("bark", 0)], 0, 0, 1, 0))
    tiers = []
    y, w = -30, 44
    for k in range(9):
        h = 30 - k * 1.4
        tiers.append((y - h * 1.35, y, w, k))
        y -= h * 0.72
        w *= 0.84
    for top, bot, w, k in tiers:  # de baixo para cima: a camada de cima cobre a de baixo
        rr = random.Random(k * 17 + 3)
        asym = rr.uniform(-4, 4)
        right = [(0, top), (w * 0.35, top + (bot - top) * 0.35), (w * 0.75 + asym, bot - 6), (w + asym, bot + 2)]
        skirt = []
        m = 13
        for i in range(1, m):
            x = (w + asym) - (2 * w) * i / m
            skirt.append((x, bot + (rr.uniform(3, 7) if i % 2 else rr.uniform(-3, 0))))
        left = [(-w + asym * 0.5, bot + 1), (-w * 0.72, bot - 7), (-w * 0.3, top + (bot - top) * 0.4)]
        poly = right + skirt + left
        out += P(poly, c_grad(defs, [cc("pine", 3), cc("pine", 2), cc("pine", 1), cc("pine", 0)], 0, 0, 1, 0.6))
        cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
        nd = ""
        for i in range(34):  # agulhas
            x = rr.uniform(-w, w)
            yy = rr.uniform(top + (bot - top) * 0.3, bot + 2)
            ln_ = rr.uniform(4, 8)
            ang = 1.1 if x < 0 else 2.0
            ang += rr.uniform(-0.3, 0.3)
            lit = 0.55 - 0.45 * (x / w) - 0.25 * ((yy - top) / (bot - top))
            nd += LN((x, yy), (x + math.cos(ang) * ln_, yy + math.sin(ang) * ln_), ramp_at(PAL_C["pine"], lit), 0.9,
                     'opacity="0.85"')
        nd += P([(-w - 5, bot - 5), (w + 5, bot - 5), (w + 5, bot + 9), (-w - 5, bot + 9)], cc("pine", 0), 'opacity="0.45"')
        out += G(nd, f'clip-path="url(#{cid})"')
    sh = c_shadow([W(0, 0, 0)] + [W(math.cos(i) * .34, math.sin(i) * .34, 40) for i in range(8)] + [W(0, 0, 212)])
    return out, sh


def c_barn(defs):
    f = barn_faces()
    b = BARN
    hx, hy, wz = b["hx"], b["hy"], b["wall"]
    rng = random.Random(3)
    out = ""
    # paredes em tábuas com variação de tom por tábua
    k = 13
    for i in range(k):
        x0, x1 = -hx + 2 * hx * i / k, -hx + 2 * hx * (i + 1) / k
        col = ramp_at(PAL_C["plank"], 0.62 + rng.uniform(-0.1, 0.1))
        out += P([iso(x0, hy, 0), iso(x1, hy, 0), iso(x1, hy, wz), iso(x0, hy, wz)], col)
        out += LN(iso(x1, hy, 0), iso(x1, hy, wz), cc("plank", 0), 0.8, 'opacity="0.7"')
        y0, y1 = -hy + 2 * hy * i / k, -hy + 2 * hy * (i + 1) / k
        colx = ramp_at(PAL_C["plank"], 0.3 + rng.uniform(-0.08, 0.08))
        out += P([iso(hx, y0, 0), iso(hx, y1, 0), iso(hx, y1, gable_top(y1)), iso(hx, (y0 + y1) / 2, gable_top((y0 + y1) / 2)),
                  iso(hx, y0, gable_top(y0))], colx)
        out += LN(iso(hx, y1, 0), iso(hx, y1, gable_top(y1)), cc("plank", 0), 0.8, 'opacity="0.7"')
    for i in range(10):  # nós e veios
        x = rng.uniform(-hx + .05, hx - .05)
        z = rng.uniform(12, wz - 8)
        p = iso(x, hy, z)
        out += PL([p, (p[0] + 0.5, p[1] - rng.uniform(6, 12))], cc("plank", 1), 0.7, 'opacity="0.6"')
    # sujeira/AO perto do chão e sob o beiral
    wy = f["wall_py"]
    out += P(wy, f'url(#{lin(defs, [(0, cc("plank", 0), 0.55), (0.25, cc("plank", 0), 0.0), (0.8, cc("plank", 0), 0.0), (1, cc("plank", 0), 0.5)], 0, 0, 0, 1)})')
    out += P(f["wall_px"], f'url(#{lin(defs, [(0, cc("plank", 0), 0.0), (0.75, cc("plank", 0), 0.0), (1, cc("plank", 0), 0.5)], 0, 0, 0, 1)})')
    # fundação de pedras irregulares
    for side in ("py", "px"):
        n = 9
        for i in range(n):
            t0, t1 = -hx + 2 * hx * i / n, -hx + 2 * hx * (i + 1) / n
            zt = rng.uniform(6, 9)
            if side == "py":
                q = [iso(t0, hy + .005, 0), iso(t1, hy + .005, 0), iso(t1, hy + .005, zt), iso(t0, hy + .005, zt + 1)]
                col = ramp_at(PAL_C["stone"], 0.55 + rng.uniform(-.12, .12))
            else:
                q = [iso(hx + .005, t0, 0), iso(hx + .005, t1, 0), iso(hx + .005, t1, zt), iso(hx + .005, t0, zt + 1)]
                col = ramp_at(PAL_C["stone"], 0.3 + rng.uniform(-.1, .1))
            out += P(q, col, f'stroke="{cc("stone", 0)}" stroke-width="0.8"')
    # porta: tábuas escuras, travessa em Z, dobradiças
    x0, x1, dz = b["door"]
    out += P([iso(x0 - 0.02, hy, 0), iso(x1 + 0.02, hy, 0), iso(x1 + 0.02, hy, dz + 4), iso(x0 - 0.02, hy, dz + 4)],
             cc("plank", 1))
    for i in range(5):
        u0, u1 = x0 + (x1 - x0) * i / 5, x0 + (x1 - x0) * (i + 1) / 5
        out += P([iso(u0, hy, 0), iso(u1, hy, 0), iso(u1, hy, dz), iso(u0, hy, dz)],
                 ramp_at(PAL_C["plank"], 0.35 + rng.uniform(-.06, .06)), f'stroke="{cc("plank", 0)}" stroke-width="0.6"')
    for zz in (10, dz - 12):
        out += P([iso(x0, hy, zz), iso(x1, hy, zz), iso(x1, hy, zz + 5), iso(x0, hy, zz + 5)], cc("plank", 2))
    out += P([iso(x0, hy, 15), iso(x0, hy, 19), iso(x1, hy, dz - 8), iso(x1, hy, dz - 12)], cc("plank", 2))
    for zz in (11, dz - 11):
        out += P([iso(x0 - 0.01, hy, zz), iso(x0 + 0.07, hy, zz), iso(x0 + 0.07, hy, zz + 3), iso(x0 - 0.01, hy, zz + 3)],
                 "#3a3836")
    out += P([iso(x0, hy, 0), iso(x1, hy, 0), iso(x1, hy, dz), iso(x0, hy, dz)],
             f'url(#{lin(defs, [(0, cc("plank", 0), 0.0), (0.8, cc("plank", 0), 0.0), (1, cc("plank", 0), 0.55)], 0, 0, 0, 1)})')
    # janela no oitão
    wyy, wz0, wz1 = 0.08, 84, 100
    out += P([iso(hx, -wyy - .02, wz0 - 3), iso(hx, wyy + .02, wz0 - 3), iso(hx, wyy + .02, wz1 + 3), iso(hx, -wyy - .02, wz1 + 3)],
             cc("plank", 2))
    out += P([iso(hx, -wyy, wz0), iso(hx, wyy, wz0), iso(hx, wyy, wz1), iso(hx, -wyy, wz1)], "#24262a")
    out += P([iso(hx, -wyy, wz1 - 6), iso(hx, wyy, wz1 - 2), iso(hx, wyy, wz1), iso(hx, -wyy, wz1)], "#4a5058", 'opacity="0.7"')
    # telhado de telhas: fiadas paralelas ao beiral, juntas desencontradas
    out += P(f["verge_back"], cc("tile", 0))
    out += P(f["roof_py"], cc("tile", 2))
    rid = clip(defs, f'<polygon points="{pts(f["roof_py"])}"/>')
    rows = ""
    X0, X1 = -hx - b["ov"], hx + b["ov"]
    Y1 = hy + b["ov"]
    nrows = 9
    for r_ in range(nrows):
        v0, v1 = Y1 * r_ / nrows, Y1 * (r_ + 1) / nrows
        ncol = 15
        off = 0.5 * (r_ % 2)
        for c_ in range(-1, ncol + 1):
            u0 = X0 + (X1 - X0) * (c_ + off) / ncol
            u1 = X0 + (X1 - X0) * (c_ + off + 1) / ncol
            t = 0.45 + 0.25 * (1 - c_ / ncol) * 0.6 + rng.uniform(-0.12, 0.12) + 0.12 * (r_ / nrows)
            q = [iso(u0, v0, roof_z(v0)), iso(u1, v0, roof_z(v0)), iso(u1, v1 + 0.012, roof_z(v1 + 0.012)),
                 iso(u0, v1 + 0.012, roof_z(v1 + 0.012))]
            rows += P(q, ramp_at(PAL_C["tile"], t))
            rows += LN(iso(u1, v0, roof_z(v0)), iso(u1, v1, roof_z(v1)), cc("tile", 0), 0.6, 'opacity="0.5"')
        rows += LN(iso(X0, v1, roof_z(v1)), iso(X1, v1, roof_z(v1)), cc("tile", 0), 1.4, 'opacity="0.7"')
        rows += LN(iso(X0, v1 - 0.012, roof_z(v1 - 0.012)), iso(X1, v1 - 0.012, roof_z(v1 - 0.012)), cc("tile", 4), 0.7,
                   'opacity="0.45"')
    rows += P([iso(X0, 0, roof_z(0)), iso(X1, 0, roof_z(0)), iso(X1, 0.045, roof_z(0.045)), iso(X0, 0.045, roof_z(0.045))],
              cc("tile", 1))
    rows += P(f["roof_py"], f'url(#{lin(defs, [(0, "#ffffff", 0.0), (0.5, "#000000", 0.0), (1, "#1a1410", 0.25)], 0, 0, 1, 0.3)})')
    out += G(rows, f'clip-path="url(#{rid})"')
    out += P(f["fascia"], cc("plank", 1)) + P(f["verge_py"], cc("plank", 0))
    out += P([iso(-hx, hy, wz), iso(hx, hy, wz), iso(hx, hy, wz - 9), iso(-hx, hy, wz - 9)],
             f'url(#{lin(defs, [(0, "#1a1410", 0.55), (1, "#1a1410", 0.0)], 0, 0, 0, 1)})')
    return out, c_shadow(barn_proxy_w())


def c_rock(defs):
    rng = random.Random(12)
    sil = [(-30, 3), (-33, -6), (-29, -17), (-22, -27), (-12, -34), (-2, -38), (9, -38), (18, -33), (26, -25),
           (31, -13), (30, -3), (24, 3), (10, 6), (-12, 6)]
    out = P(sil, c_grad(defs, [cc("stone", 4), cc("stone", 3), cc("stone", 2), cc("stone", 1)], 0.1, 0, 0.9, 1))
    cid = clip(defs, f'<polygon points="{pts(sil)}"/>')
    det = P([(-6, -22), (12, -24), (31, -13), (30, -3), (24, 3), (10, 6), (-2, 6), (2, -8)], cc("stone", 1), 'opacity="0.45"')
    det += P([(-29, -17), (-22, -27), (-12, -34), (-2, -38), (9, -38), (12, -24), (-6, -22)], cc("stone", 4), 'opacity="0.35"')
    for _ in range(9):  # líquen
        x, y = rng.uniform(-26, 10), rng.uniform(-34, -14)
        det += P(leaf_clump(x, y, rng.uniform(1.5, 3), rng.randint(0, 999), n=7), "#8b8f6a", 'opacity="0.55"')
    for pth in ([(-6, -22), (-3, -12), (2, -8), (0, 2)], [(12, -24), (16, -14), (14, -6)], [(-20, -8), (-14, -4)]):
        det += PL(pth, cc("stone", 0), 1.0, 'opacity="0.7"')
    veins = [[(-26, -6), (-19, -12), (-13, -11), (-7, -18), (-1, -20)], [(-12, -29), (-4, -30), (3, -26), (8, -28)],
             [(12, -18), (17, -16), (22, -10), (27, -9)]]
    for v in veins:
        det += PL(v, cc("ore", 1), 2.2, 'opacity="0.9"') + PL(v, cc("ore", 3), 1.0)
        for (x, y) in v[1:-1]:
            fl = [(x - 2.2, y + 0.8), (x - 0.6, y - 2.2), (x + 2.4, y - 1), (x + 1.2, y + 1.6)]
            det += P(fl, cc("ore", 2)) + P(fl[:3], cc("ore", 4))
    out += G(det, f'clip-path="url(#{cid})"')
    for i in range(14):  # grama na base
        x = rng.uniform(-30, 26)
        out += LN((x, 5 - abs(x) * 0.08), (x + rng.uniform(-2, 2), -rng.uniform(1, 5)), ramp_at(PAL_C["grass"], rng.uniform(.3, .8)), 0.9)
    sh = c_shadow([W(x, y, z) for x in (-0.24, 0.24) for y in (-0.2, 0.2) for z in (0, 32)])
    return out, sh


def c_crop(defs):
    h, z = BED["h"], BED["z"]
    rng = random.Random(31)
    frame_py = [iso(-h, h, 0), iso(h, h, 0), iso(h, h, z), iso(-h, h, z)]
    frame_px = [iso(h, -h, 0), iso(h, h, 0), iso(h, h, z), iso(h, -h, z)]
    top = [iso(-h, -h, z), iso(h, -h, z), iso(h, h, z), iso(-h, h, z)]
    out = P(frame_py, c_grad(defs, [cc("plank", 3), cc("plank", 2)], 0, 0, 0, 1))
    out += P(frame_px, c_grad(defs, [cc("plank", 1), cc("plank", 0)], 0, 0, 0, 1))
    out += P(top, cc("plank", 3))
    for i in range(6):  # veios
        u = rng.uniform(-h, h)
        out += LN(iso(u, h, z * 0.3), iso(u + 0.12, h, z * 0.6), cc("plank", 1), 0.6, 'opacity="0.6"')
    out += LN(iso(-h, h, z / 2), iso(h, h, z / 2), cc("plank", 0), 0.7, 'opacity="0.7"')
    i_ = h - 0.05
    soil = [iso(-i_, -i_, z), iso(i_, -i_, z), iso(i_, i_, z), iso(-i_, i_, z)]
    out += P(soil, c_grad(defs, [cc("soil", 2), cc("soil", 1)], 0, 0, 1, 1))
    for _ in range(40):
        u, v = rng.uniform(-i_, i_), rng.uniform(-i_, i_)
        x, y = iso(u, v, z)
        out += P(leaf_clump(x, y, rng.uniform(0.8, 1.6), rng.randint(0, 999), n=5), ramp_at(PAL_C["soil"], rng.uniform(0, 1)))
    stems = []
    for _ in range(64):
        u, v = rng.uniform(-i_ + .03, i_ - .03), rng.uniform(-i_ + .03, i_ - .03)
        stems.append((u, v, rng.uniform(26, 34), rng.uniform(-5, 5), rng.random()))
    stems.sort(key=lambda s: s[0] + s[1])
    for k, (u, v, hgt, lean, d) in enumerate(stems):
        bx, by = iso(u, v, z)
        tx, ty = bx + lean, by - hgt
        col = ramp_at(PAL_C["wheat"], 0.35 + 0.4 * d)
        out += f'<path d="M{f2(bx)},{f2(by)} Q{f2(bx + lean * 0.2)},{f2(by - hgt * 0.6)} {f2(tx)},{f2(ty + 9)}" fill="none" stroke="{ramp_at(PAL_C["wheat"], 0.2 + 0.3 * d)}" stroke-width="0.8"/>'
        ang = math.atan2(-9, lean * 0.1)
        for g in range(6):  # grãos da espiga
            gy = ty + 9 - g * 1.8
            gx = tx - lean * 0.03 * g
            for s_ in (-1, 1):
                grain = [(gx, gy), (gx + s_ * 1.6, gy - 1.2), (gx + s_ * 0.9, gy - 2.9), (gx, gy - 1.8)]
                out += P(grain, ramp_at(PAL_C["wheat"], 0.45 + 0.45 * d + (0.15 if s_ < 0 else -0.1)))
        out += LN((tx, ty - 1), (tx + lean * 0.35, ty - 8), ramp_at(PAL_C["wheat"], 0.6), 0.5, 'opacity="0.8"')
        _ = ang
    sh = c_shadow([W(x, y, zz) for x in (-h, h) for y in (-h, h) for zz in (0, z)] + [W(0, 0, 44)])
    return out, sh


def c_farmer(defs):
    """Proporção ~6,5 cabeças; sombreamento por degradê e dobras, sem contorno preto."""
    out = ""
    sk = PAL_C["skin"]

    def part(poly, ramp, lo=1, hi=3, ang=(0, 0, 1, 0.25), extra=""):
        r = PAL_C[ramp]
        return P(poly, c_grad(defs, [r[hi], r[(lo + hi) // 2 + 1 if hi - lo > 1 else hi], r[lo]], *ang), extra)
    # botas
    out += part([(-8.5, 1), (-1.5, 1), (-1.6, -3), (-2.4, -9), (-7.6, -9), (-8.8, -3)], "boots", 0, 3)
    out += part([(1.8, 1), (9.2, 1.5), (9, -2.5), (7.6, -9), (2.4, -9), (1.6, -3)], "boots", 0, 2)
    # calças (perna de apoio levemente fechada)
    out += part([(-7.6, -8), (-2.4, -8), (-0.5, -36), (0.5, -36), (2.4, -8), (7.6, -8), (8.6, -46), (-8.4, -46)],
                "trousers", 0, 3)
    for pth in ([(-5, -12), (-4.5, -24)], [(5.5, -14), (5, -26)], [(-3, -40), (-1, -36)]):
        out += PL(pth, cc("trousers", 0), 0.7, 'opacity="0.6"')
    # camisa de linho
    torso = [(-9, -46), (9, -46), (10, -58), (12.5, -67), (8, -70), (3, -71), (-3, -71), (-8, -70), (-12.5, -67),
             (-10, -58)]
    out += part(torso, "linen", 1, 4)
    # colete escuro aberto
    out += part([(-9.2, -44), (-2.5, -44), (-3, -60), (-4.4, -70), (-8, -70), (-12.3, -67), (-10.1, -58)], "vest", 1, 4)
    out += part([(9.2, -44), (2.5, -44), (3, -60), (4.4, -70), (8, -70), (12.3, -67), (10.1, -58)], "vest", 0, 2)
    out += P([(-9.3, -46), (9.3, -46), (9.3, -48.4), (-9.3, -48.4)], cc("boots", 1))
    for sgn in (-1, 1):
        def m(p):
            return [(sgn * x, y) for x, y in p]
        lo_, hi_ = (1, 4) if sgn < 0 else (0, 2)
        out += part(m([(-12.5, -67), (-8.6, -68), (-9.4, -57), (-10, -50), (-14.6, -50), (-15.3, -58)]), "linen", lo_, hi_)
        out += PL(m([(-11, -60), (-13, -56)]), cc("linen", 1), 0.7, 'opacity="0.7"')
        out += P(m([(-14.7, -50.5), (-9.9, -50.5), (-10, -48.4), (-14.8, -48.4)]), cc("linen", 2))
        out += part(m([(-14.5, -49), (-10, -49), (-10.6, -39.5), (-14, -39.5)]), "skin", 1 if sgn > 0 else 2, 4)
        out += part(m([(-14, -40), (-10.6, -40), (-10.6, -35.5), (-12, -34.2), (-14.2, -35.8)]), "skin", 1, 3)
    # pescoço e cabeça (pequena, mandíbula marcada)
    out += P([(-3, -70), (3, -70), (3, -74), (-3, -74)], cc("skin", 1))
    head = [(-5.3, -74.2), (-1.6, -72.8), (2.6, -72.8), (5.4, -75), (6.1, -79.5), (5.8, -84), (3.4, -86.3), (-3.4, -86.3),
            (-5.8, -84), (-6.2, -79.5)]
    out += P([(-6.1, -81.5), (-7.4, -80.6), (-7.2, -77.6), (-6, -77.2)], cc("skin", 2))
    out += part(head, "skin", 1, 4, (0, 0, 1, 0.1))
    hid = clip(defs, f'<polygon points="{pts(head)}"/>')
    face = P([(-8, -90), (8, -90), (8, -81.6), (-8, -81.2)], cc("skin", 1), 'opacity="0.75"')
    face += P([(-6.5, -77.5), (-5.2, -73.6), (-1.6, -72.6), (2.6, -72.6), (5.6, -74.6), (6.4, -78), (4.5, -76.8),
               (0.5, -77.4), (-3.5, -76.8)], cc("hair", 1), 'opacity="0.9"')
    face += LN((-3.2, -80.4), (-1.4, -80.5), "#2a1f1b", 0.9) + LN((1.9, -80.5), (3.7, -80.4), "#2a1f1b", 0.9)
    face += P([(0.6, -80.2), (2.1, -77.6), (0.4, -77.7)], cc("skin", 1))
    face += LN((-0.8, -75.6), (2.2, -75.7), cc("skin", 0), 0.7)
    out += G(face, f'clip-path="url(#{hid})"')
    # chapéu de aba larga com copa amassada
    out += P([(-15.5, -83.6), (-10, -86.6), (0, -88), (10.5, -86.6), (16, -83.4), (11, -81.4), (0, -80.8), (-10.5, -81.4)],
             c_grad(defs, [cc("hat", 4), cc("hat", 2), cc("hat", 1)], 0, 0, 1, 0.3))
    out += P([(-6.8, -85.6), (6.8, -85.6), (6.2, -92), (2.5, -93.8), (0, -92.6), (-2.5, -93.8), (-6.2, -92)],
             c_grad(defs, [cc("hat", 3), cc("hat", 2), cc("hat", 0)], 0, 0, 1, 0))
    out += P([(-6.8, -85.6), (6.8, -85.6), (6.6, -87.6), (-6.6, -87.6)], cc("vest", 0))
    sh = c_shadow([W(x, y, z) for x in (-0.07, 0.07) for y in (-0.07, 0.07) for z in (0, 86)])
    return out, sh


def c_ground(defs):
    corners = ground_corners()
    lo, hi = -0.5, GROUND_N - 0.5
    rng = random.Random(99)
    side_y = [iso(hi, hi, 0), iso(lo, hi, 0), iso(lo, hi, -SLAB), iso(hi, hi, -SLAB)]
    side_x = [iso(hi, lo, 0), iso(hi, hi, 0), iso(hi, hi, -SLAB), iso(hi, lo, -SLAB)]
    out = P(side_y, c_grad(defs, [cc("dirt", 3), cc("dirt", 1)], 0, 0, 0, 1))
    out += P(side_x, c_grad(defs, [cc("dirt", 1), cc("dirt", 0)], 0, 0, 0, 1))
    for _ in range(26):  # estratos e raízes
        t = rng.uniform(lo, hi)
        z = rng.uniform(-14, -4)
        if rng.random() < 0.5:
            out += LN(iso(t, hi, z), iso(t + rng.uniform(.08, .2), hi, z + rng.uniform(-1.5, 1.5)), cc("dirt", 0), 0.8, 'opacity="0.6"')
        else:
            out += LN(iso(hi, t, z), iso(hi, t + rng.uniform(.08, .2), z + rng.uniform(-1.5, 1.5)), cc("dirt", 4), 0.7, 'opacity="0.5"')
    out += P(corners, cc("grass", 2))
    gid = clip(defs, f'<polygon points="{pts(corners)}"/>')
    det = ""
    for i in range(70):  # manchas pintadas
        u, v = rng.uniform(lo, hi), rng.uniform(lo, hi)
        x, y = iso(u, v)
        r = rng.uniform(8, 22)
        det += P(leaf_clump(x, y, r, i + 50, n=9), ramp_at(PAL_C["grass"], rng.uniform(0.25, 0.8)), 'opacity="0.35"')
    top, bot, edge = path_edges(7, jit=0.07, n=11)
    path = [iso(*p) for p in top] + [iso(*p) for p in reversed(bot)]
    det += P(path, cc("path", 2))
    pid = clip(defs, f'<polygon points="{pts(path)}"/>')
    pd = ""
    for i in range(50):
        u = rng.uniform(lo, hi)
        e = edge(u)
        v = rng.uniform(*e)
        x, y = iso(u, v)
        pd += P(leaf_clump(x, y, rng.uniform(4, 10), i + 300, n=9), ramp_at(PAL_C["path"], rng.uniform(0.2, 0.9)), 'opacity="0.35"')
    for off in (-0.1, 0.1):  # trilhas gastas (rodas)
        pd += PL([iso(u, 1 + off + 0.01 * math.sin(u * 5)) for u in [lo + (hi - lo) * i / 20 for i in range(21)]],
                 cc("path", 1), 3, 'opacity="0.35"')
    pd += P([iso(*p) for p in top] + [iso(u, v + 0.06) for u, v in reversed(top)], cc("path", 0), 'opacity="0.5"')
    for i in range(22):
        u = rng.uniform(lo, hi)
        e = edge(u)
        v = rng.uniform(*e)
        x, y = iso(u, v)
        s = rng.uniform(1.2, 2.4)
        st = [(x - s, y + 0.5), (x - s * 0.6, y - s * 0.7), (x + s * 0.5, y - s * 0.8), (x + s, y), (x + s * 0.2, y + s * 0.6)]
        pd += P(st, ramp_at(PAL_C["stone"], rng.uniform(0.4, 0.7))) + P(st[:3], cc("stone", 4), 'opacity="0.6"')
    det += G(pd, f'clip-path="url(#{pid})"')
    for i in range(780):  # folhas de grama
        u, v = rng.uniform(lo, hi), rng.uniform(lo, hi)
        e = edge(u)
        if e[0] + 0.03 < v < e[1] - 0.03:
            continue
        x, y = iso(u, v)
        hgt = rng.uniform(2.5, 6)
        col = ramp_at(PAL_C["grass"], rng.uniform(0.0, 1.0))
        det += LN((x, y), (x + rng.uniform(-2, 2), y - hgt), col, 0.8, 'opacity="0.85"')
    for i in range(10):  # florzinhas discretas
        u, v = rng.uniform(lo, hi), rng.uniform(lo, hi)
        e = edge(u)
        if e[0] - 0.05 < v < e[1] + 0.05:
            continue
        x, y = iso(u, v)
        det += P([(x - 1, y), (x, y - 1), (x + 1, y), (x, y + 0.8)], "#d8cfa8" if i % 2 else "#c9a95a")
    out += G(det, f'clip-path="url(#{gid})"')
    out += P([iso(hi, hi, 0), iso(lo, hi, 0), iso(lo, hi, -2.5), iso(hi, hi, -2.5)], cc("grass", 1))
    out += P([iso(hi, lo, 0), iso(hi, hi, 0), iso(hi, hi, -2.5), iso(hi, lo, -2.5)], cc("grass", 0))
    return out


# ====================================================================== MONTAGEM
STYLES = {
    "a": dict(title="A · Estilizado maduro",
              desc="Planos angulares, contorno fino escuro, 4 tons, cor viva contida.",
              pieces=dict(tree=a_tree, pine=a_pine, barn=a_barn, farmer=a_farmer, crop=a_crop, rock=a_rock),
              ground=a_ground, shadow_op=0.30),
    "b": dict(title="B · Low-poly facetado",
              desc="Malha 3D simples, luz por face, sem contorno, paleta natural.",
              pieces=dict(tree=b_tree, pine=b_pine, barn=b_barn, farmer=b_farmer, crop=b_crop, rock=b_rock),
              ground=b_ground, shadow_op=0.30),
    "c": dict(title="C · Pintado semirrealista",
              desc="Proporção real, textura sugerida, paleta terrosa, sombra longa.",
              pieces=dict(tree=c_tree, pine=c_pine, barn=c_barn, farmer=c_farmer, crop=c_crop, rock=c_rock),
              ground=c_ground, shadow_op=1.0),
}
LABELS = dict(tree="árvore folhosa", pine="pinheiro", barn="galpão 1×1", farmer="fazendeiro",
              crop="canteiro (trigo)", rock="pedra c/ minério")
PIECE_BOX = dict(tree=(200, 260, 100, 216), pine=(200, 280, 100, 236), barn=(240, 220, 112, 160),
                 farmer=(140, 124, 50, 104), crop=(180, 120, 76, 76), rock=(160, 96, 70, 64))


def scene_svg(key, defs):
    st = STYLES[key]
    out = st["ground"](defs)
    rendered = {name: fn(defs) for name, fn in st["pieces"].items()}
    shadows = ""
    for name, x, y in SCENE:
        sx, sy = iso(x, y)
        shadows += G(rendered[name][1], f'transform="translate({f2(sx)},{f2(sy)})"')
    gid = clip(defs, f'<polygon points="{pts(ground_corners())}"/>')
    out += G(G(shadows, f'opacity="{st["shadow_op"]}"'), f'clip-path="url(#{gid})"')
    for name, x, y in sorted(SCENE, key=lambda s: (s[1] + s[2], s[1])):
        sx, sy = iso(x, y)
        out += G(rendered[name][0], f'transform="translate({f2(sx)},{f2(sy)})"')
    return out


def text(x, y, s, size, weight="normal", fill="#2b2b2b", anchor="start"):
    s = s.replace("&", "&amp;").replace("<", "&lt;")
    return (f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}">{s}</text>')


PW, PH = 1500, 1168
COLW, GUT = 480, 15


def swatches(key):
    if key == "a":
        rows = [(r, PAL_A[r][0] + [PAL_A[r][1]]) for r in ("grass", "path", "leaf", "pine", "bark", "wall", "roof",
                                                             "stone", "ore", "wheat", "skin", "pants")]
    elif key == "b":
        rows = [(r, [lp_color(PAL_B[r][0], k) for k in (1.0, 0.78, 0.3, 0.0)]) for r in
                ("grass", "path", "leaf", "pine", "bark", "wall", "roof", "stone", "ore", "wheat", "skin", "pants")]
    else:
        rows = [(r, PAL_C[r]) for r in ("grass", "path", "leaf", "pine", "bark", "plank", "tile", "stone", "ore",
                                         "wheat", "skin", "trousers")]
    out = ""
    for i, (name, cols) in enumerate(rows):
        cx, cy = (i % 2) * 104, (i // 2) * 24
        for j, col in enumerate(cols):
            out += f'<rect x="{cx + j * 14}" y="{cy}" width="13" height="16" fill="{col}"/>'
        out += text(cx + len(cols) * 14 + 3, cy + 12, name, 9, fill="#555")
    return out


def build():
    SRC.mkdir(parents=True, exist_ok=True)
    REV.mkdir(parents=True, exist_ok=True)
    defs = Defs("ec_")
    body = f'<rect width="{PW}" height="{PH}" fill="#f2efe9"/>'
    body += text(GUT, 34, "Prancha comparativa de estilos — mesmas peças em 3 direções", 22, "bold")
    body += text(GUT, 56, "Peças a 1× (tile 128×64, iso 2:1). Trecho 3×3 montado abaixo e o mesmo trecho a zoom 0,5 "
                 "(celular). Tudo vetor por script, sem IA. Escolha A, B ou C (ou uma mistura).", 12.5, fill="#555")
    qa = {"pieces": {}}
    for ci, key in enumerate(("a", "b", "c")):
        st = STYLES[key]
        x0 = GUT + ci * (COLW + GUT)
        col = text(0, 100, st["title"], 21, "bold") + text(0, 121, st["desc"], 12.5, fill="#444")
        # peças
        col += f'<rect x="0" y="134" width="{COLW}" height="420" rx="6" fill="#e3dfd6"/>'
        pclip = clip(defs, f'<rect x="0" y="134" width="{COLW}" height="420" rx="6"/>')
        pcol = ""
        rows = [(("tree", 80), ("pine", 240), ("barn", 396)), (("farmer", 80), ("crop", 240), ("rock", 400))]
        base_y = (352, 502)
        for r, row in enumerate(rows):
            for name, cx in row:
                svgb, svgs = st["pieces"][name](defs)
                yb = base_y[r]
                pcol += G(G(svgs, f'opacity="{st["shadow_op"]}"') + svgb, f'transform="translate({cx},{yb})"')
                ly = yb + (44 if name in ("barn", "crop") else 22)
                pcol += text(cx, ly, LABELS[name], 11, fill="#555", anchor="middle")
                # fonte da peça isolada
                pdefs = Defs(f"{key}{name[:3]}_")
                pb, ps = st["pieces"][name](pdefs)
                w, h, ax, ay = PIECE_BOX[name]
                psvg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{-ax} {-ay} {w} {h}">'
                        f'<!-- estilo {key.upper()} | {name} | gerado por art/source/tools/build_estilos_comparativo.py -->'
                        f'{pdefs.svg()}<g id="shadow" opacity="{st["shadow_op"]}">{ps}</g><g id="body">{pb}</g></svg>')
                (SRC / key).mkdir(exist_ok=True)
                (SRC / key / f"{name}.svg").write_text(psvg, encoding="utf-8")
                qa["pieces"][f"{key}/{name}"] = len(psvg)
        col += G(pcol, f'clip-path="url(#{pclip})"')
        # trecho 3×3
        col += f'<rect x="0" y="566" width="{COLW}" height="380" rx="6" fill="#d5d0c5"/>'
        col += text(10, 584, "trecho 3×3 a 1×", 11, fill="#555")
        sc = scene_svg(key, defs)
        col += G(sc, 'transform="translate(240,770)"')
        # zoom 0,5 + paleta
        col += f'<rect x="0" y="958" width="{COLW}" height="196" rx="6" fill="#e3dfd6"/>'
        col += text(10, 976, "zoom 0,5", 11, fill="#555")
        col += G(sc, 'transform="translate(118,1072) scale(0.5)"')
        col += text(244, 976, "paleta (amostra)", 11, fill="#555")
        col += G(swatches(key), 'transform="translate(244,986)"')
        body += G(col, f'transform="translate({x0},0)"')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}">'
           f'<!-- {BATCH} | gerado por art/source/tools/build_estilos_comparativo.py -->{defs.svg()}{body}</svg>')
    (SRC / "prancha.svg").write_text(svg, encoding="utf-8")
    for s, nm in ((1, "prancha.png"), (2, "prancha@2x.png")):
        cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(REV / nm), output_width=PW * s,
                         output_height=PH * s)
    pal = {"batch": BATCH, "status": "draft",
           "note": "paletas de comparação; a escolhida vira art/style-guide/palette.json (v3) depois da aprovação",
           "a": {k: {"tones_light_base_shadow_deep": v[0], "outline": v[1]} for k, v in PAL_A.items()},
           "a_extra": {"shadow": A_SHADOW, "ink": A_INK},
           "b": {"base_colors": PAL_B, "shade": "lp_color(base, k) com k = max(0, n·L); L = (-0.55, 0.30, 0.78)",
                 "shadow": B_SHADOW},
           "c": {"ramps_deep_to_highlight": PAL_C, "shadow": C_SHADOW}}
    (SRC / "paletas.json").write_text(json.dumps(pal, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return svg, qa


def qa_checks(svg, qa):
    ok = True
    # A: todo hex usado nas peças A existe na paleta A
    allowed = {h.lower() for v in PAL_A.values() for h in v[0] + [v[1]]} | {A_SHADOW, A_INK, "#2b2320"}
    bad = set()
    for p in (SRC / "a").glob("*.svg"):
        bad |= {h.lower() for h in re.findall(r"#[0-9a-fA-F]{6}", p.read_text())} - allowed
    qa["a_off_palette_hex"] = sorted(bad)
    ok &= not bad
    for nm, size in (("prancha.png", f"{PW}x{PH}"), ("prancha@2x.png", f"{PW * 2}x{PH * 2}")):
        r = subprocess.run([sys.executable, str(REPORT), str(REV / nm), "--expect-size", size, "--json"],
                           capture_output=True, text=True)
        qa[f"asset_report_{nm}"] = r.returncode
        ok &= r.returncode == 0
    qa["ok"] = bool(ok)
    (REV / "qa.json").write_text(json.dumps(qa, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return ok


def update_manifest():
    mp = ART / "manifest.json"
    man = json.loads(mp.read_text(encoding="utf-8"))
    man["assets"] = [x for x in man["assets"] if x.get("batch") != BATCH]
    for key in ("a", "b", "c"):
        st = STYLES[key]
        man["assets"].append({
            "id": f"style_board_{key}",
            "batch": BATCH,
            "role": f"amostra de direção de arte '{st['title']}' (só para escolher estilo; não vai para produção)",
            "path": f"art/review/{BATCH}/prancha.png",
            "files": [f"art/source/estilos-comparativo/{key}/{n}.svg" for n in st["pieces"]],
            "source_path": f"art/source/estilos-comparativo/{key}/",
            "status": "draft",
            "variants": [],
            "technical": {"projection": "iso 2:1, tile 128x64 @1x", "alpha": True, "filtering": "linear",
                          "palette": f"art/source/estilos-comparativo/paletas.json ({key})", "max_colors": None},
            "visual_locks": ["projection-2:1", "light-direction", "scale"],
            "source": {"kind": "scripted",
                       "url_or_tool": "art/source/tools/build_estilos_comparativo.py + iso_vector.py (cairosvg)",
                       "creator": "agente diretor-de-arte (Claude)", "created_at": "2026-11-22",
                       "license": "original do projeto (todos os direitos do projeto)", "attribution": "",
                       "prompt_or_source_record": "SVG gerado por código; sem IA; sem referência externa; nada "
                                                  "derivado de Sunflower Land/Sunnyside"},
            "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False,
                             "technical_checks_passed": True, "approved_by": ""},
            "review": f"art/review/{BATCH}/prancha.png",
            "notes": f"prancha comparativa; ver art/review/{BATCH}/notas.md",
        })
    man["support_files"] = [x for x in man["support_files"] if x.get("batch") != BATCH]
    man["support_files"].append({"path": f"art/review/{BATCH}/", "role": "prancha comparativa de estilos A/B/C "
                                 "(prancha.png, prancha@2x.png, qa.json, notas.md)", "status": "draft", "batch": BATCH})
    mp.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    svg, qa = build()
    ok = qa_checks(svg, qa)
    if ok:
        update_manifest()
    print(json.dumps({k: v for k, v in qa.items() if k != "pieces"}, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
