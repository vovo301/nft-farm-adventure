#!/usr/bin/env python3
"""paint_vector — primitivas do estilo C (pintado semirrealista), guia v3.

Complementa `iso_vector.py` (projeção, Asset, export). Tudo é SVG gerado por código; nenhum
gerador de imagem, nenhuma referência externa. Paleta: art/style-guide/palette.json (v3).

Ideias centrais (ver art/style-guide/README.md, seções 5–8):
  * cor = tom da paleta ou mistura de dois tons VIZINHOS da mesma rampa: `tone(rampa, t)`,
    t em [0, 1] de deep (0) a highlight (1);
  * sem contorno de linha: a silhueta se separa por valor. Peças interativas ganham
    `rim()` (realce de borda no lado da luz) e `occlusion()` (filete escuro no lado da sombra);
  * sombra projetada longa e suave, calculada pela luz (`soft_shadow`), sempre em arquivo
    separado;
  * folhagem em MASSAS (sub-copas) feitas de tufos pontudos (`crown`), não em lobos redondos.
"""
from __future__ import annotations

import math
import random

import iso_vector as iv
from iso_vector import HH, HW, clip, hull, pts

# ------------------------------------------------------------------ mundo 3D <-> tela (2:1)
WT = 72.0        # px de mundo por aresta de tile
ZS = 1.0887      # px de tela por px de mundo na vertical


def norm(v):
    m = math.sqrt(sum(a * a for a in v)) or 1.0
    return tuple(a / m for a in v)


L_FACE = norm((-0.55, 0.30, 0.78))     # luz para sombrear faces (topo-esquerda da tela)
L_CAST = norm((-0.62, 0.32, 0.92))     # luz da sombra projetada: ~0,9x a altura, para a direita
LD2 = norm((-0.55, -0.83))             # direção da luz no plano da tela (para formas 2D)


def scr(p):
    """Ponto de mundo (X, Y, Z em px de mundo) -> tela (âncora em 0, 0)."""
    X, Y, Z = p
    return ((X - Y) * HW / WT, (X + Y) * HH / WT - Z * ZS)


def wpt(x, y, z):
    """(x, y em tiles; z em px de TELA) -> ponto de mundo."""
    return (x * WT, y * WT, z / ZS)


def cast_points(points_w, L=L_CAST):
    out = []
    for X, Y, Z in points_w:
        k = max(Z, 0.0) / L[2]
        out.append(scr((X - L[0] * k, Y - L[1] * k, 0.0)))
    return out


# ------------------------------------------------------------------ cor
def h2r(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def r2h(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c)


def mix(a, b, t):
    A, B = h2r(a), h2r(b)
    return r2h(tuple(A[i] + (B[i] - A[i]) * t for i in range(3)))


TONES = ("deep", "shadow", "base", "light", "highlight")


def ramp(name):
    return [t["hex"] for t in iv.palette()["ramps"][name]["tones"]]


def T(name, tone_name):
    return iv.c(name, tone_name)


def tone(name, t):
    """Cor da rampa em t (0 = deep, 1 = highlight), misturando só tons vizinhos."""
    r = ramp(name)
    t = max(0.0, min(1.0, t)) * (len(r) - 1)
    i = min(int(t), len(r) - 2)
    return mix(r[i], r[i + 1], t - i)


def palette_mix_ok(hexcol, tol=2.0):
    """True se a cor é da paleta ou mistura de dois tons vizinhos de uma rampa (tolerância em RGB)."""
    c = h2r(hexcol)
    for r in iv.palette()["ramps"].values():
        hs = [h2r(t["hex"]) for t in r["tones"]]
        for a, b in zip(hs, hs[1:] + hs[-1:]):
            d = [b[i] - a[i] for i in range(3)]
            dd = sum(x * x for x in d)
            t = 0.0 if dd == 0 else max(0.0, min(1.0, sum((c[i] - a[i]) * d[i] for i in range(3)) / dd))
            if math.dist(c, [a[i] + d[i] * t for i in range(3)]) <= tol:
                return True
    return False


# ------------------------------------------------------------------ SVG
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


def d_of(points):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points) + " Z"


def grad(defs, stops, x1=0, y1=0, x2=1, y2=1):
    """url() de degradê linear com stops (cores) igualmente espaçados (bounding box)."""
    return f'url(#{iv.lin(defs, [(i / (len(stops) - 1), s) for i, s in enumerate(stops)], x1, y1, x2, y2)})'


def ugrad(defs, stops, p1, p2):
    """Degradê linear em coordenadas de usuário (p1 -> p2). stops: [(offset, cor, opacidade)]."""
    return f'url(#{iv.lin(defs, stops, p1[0], p1[1], p2[0], p2[1], user=True)})'


def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def scale_about(poly, k, c=None):
    c = c or centroid(poly)
    return [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in poly]


def shift(poly, dx, dy):
    return [(x + dx, y + dy) for x, y in poly]


# ------------------------------------------------------------------ borda (sem contorno)
def rim(defs, poly, col, w=1.6, op=0.7):
    """Realce de borda: faixa de largura ~w no lado da luz (topo-esquerda), DENTRO da silhueta.

    Truque: (forma XOR forma deslocada para baixo-direita) recortado pela própria forma.
    Usado só nas peças interativas (regra L4 do guia).
    """
    cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
    d = d_of(poly) + " " + d_of(shift(poly, w * 0.75, w))
    return f'<g clip-path="url(#{cid})"><path d="{d}" fill-rule="evenodd" fill="{col}" opacity="{op}"/></g>'


def occlusion(defs, poly, col, w=1.2, op=0.75):
    """Filete escuro no lado da sombra (baixo-direita), dentro da silhueta: recorta a peça do chão."""
    cid = clip(defs, f'<polygon points="{pts(poly)}"/>')
    d = d_of(poly) + " " + d_of(shift(poly, -w * 0.75, -w))
    return f'<g clip-path="url(#{cid})"><path d="{d}" fill-rule="evenodd" fill="{col}" opacity="{op}"/></g>'


# ------------------------------------------------------------------ sombra projetada
def soft_shadow(points_w, strength=1.0, contact=None):
    """Sombra longa e suave: 3 camadas da projeção (mais escura perto da base) + contato.

    points_w: pontos de mundo do volume (use wpt). contact: (rx, ry) da elipse de contato.
    """
    base = [scr((p[0], p[1], 0.0)) for p in points_w]
    proj = cast_points(points_w)
    h = hull(proj + base)
    bc = centroid(hull(base) if len(base) >= 3 else base)
    col = T("sombra", "cast")
    out = (G(P(scale_about(h, 1.05, bc), col), f'opacity="{0.10 * strength:.3f}"')
           + G(P(h, col), f'opacity="{0.10 * strength:.3f}"')
           + G(P(scale_about(h, 0.82, bc), col), f'opacity="{0.08 * strength:.3f}"'))
    if contact:
        rx, ry = contact
        out += (f'<ellipse cx="{f2(bc[0] + rx * 0.12)}" cy="{f2(bc[1] + ry * 0.15)}" rx="{f2(rx)}" ry="{f2(ry)}" '
                f'fill="{T("sombra", "contact")}" opacity="{0.22 * strength:.3f}"/>')
    return out


# ------------------------------------------------------------------ folhagem
def leaf_clump(x, y, r, seed, n=None, squash=0.82):
    """Tufo pontudo (estrela irregular de 7–9 pontas): a unidade da folhagem do estilo C."""
    rng = random.Random(seed)
    n = n or rng.choice((7, 9))
    rot = rng.uniform(0, math.pi)
    out = []
    for i in range(n):
        a_ = rot + 2 * math.pi * i / n
        rr = r * (rng.uniform(0.85, 1.12) if i % 2 == 0 else rng.uniform(0.42, 0.6))
        out.append((x + math.cos(a_) * rr, y + math.sin(a_) * rr * squash))
    return out


def crown(defs, masses, seed, rampname="folhagem", clump_r=(7.0, 11.0), density=0.020, rim_op=0.0,
          gap=0.16, lit_bias=0.0):
    """Copa em MASSAS (regra L1/L3): cada massa (cx, cy, rx, ry) é um volume com luz própria.

    - fundo escuro único (silhueta pontuda) em deep;
    - massas de trás para frente; dentro de cada massa os tufos clareiam no topo-esquerda e
      escurecem no baixo-direita, o que cria um "vão" escuro entre massas (lê a 0,5);
    - tufos de ponta clara só no topo-esquerda da massa (realce dentro da massa).
    Devolve (fundo, frente): desenhe galhos entre os dois.
    """
    rng = random.Random(seed)
    lo, hi = clump_r
    order = sorted(range(len(masses)), key=lambda k: masses[k][1] + masses[k][3] * 0.3)
    allc = []
    for k in order:
        cx, cy, rx, ry = masses[k]
        n = max(8, int(math.pi * rx * ry * density))
        cl = []
        tries = 0
        while len(cl) < n and tries < n * 40:
            tries += 1
            x, y = rng.uniform(cx - rx, cx + rx), rng.uniform(cy - ry, cy + ry)
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if e < 1:
                cl.append((x, y, rng.uniform(lo, hi), e, k))
        allc.append(cl)
    back = ""
    for cl in allc:
        for i, (x, y, r, e, k) in enumerate(cl):
            back += P(leaf_clump(x, y, r * 1.22, seed * 7 + i + 31 * k), T(rampname, "deep"))
    front = ""
    for cl in allc:
        if not cl:
            continue
        k = cl[0][4]
        cx, cy, rx, ry = masses[k]
        cl.sort(key=lambda c: (c[1] - cy) / ry * 0.6 + rng.random() * 0.4)
        for i, (x, y, r, e, _) in enumerate(cl):
            vx, vy = (x - cx) / rx, (y - cy) / ry
            lit = 0.52 + 0.34 * (vx * LD2[0] + vy * LD2[1]) - gap * max(0.0, e - 0.55) * (1 if vx + vy > -0.2 else 0.3)
            lit += lit_bias + rng.uniform(-0.05, 0.05)
            front += P(leaf_clump(x, y, r, seed * 13 + i + 97 * k), tone(rampname, lit))
            if lit > 0.66:
                front += P(leaf_clump(x - r * 0.22, y - r * 0.28, r * 0.5, seed * 17 + i + 53 * k), tone(rampname, lit + 0.16))
    return back, front


def blades(x, y, n, h, spread, rampname, t0, t1, seed, w=0.9, op=0.9, lean=0.0):
    """Leque de lâminas finas (tufo de grama, junco). Base em (x, y)."""
    rng = random.Random(seed)
    out = ""
    for i in range(n):
        bx = x + rng.uniform(-spread, spread)
        hh = h * rng.uniform(0.6, 1.0)
        tx = bx + rng.uniform(-2.2, 2.2) + lean
        out += LN((bx, y), (tx, y - hh), tone(rampname, rng.uniform(t0, t1)), w, f'opacity="{op}"')
    return out


def blade_tuft(x, y, s, rampname, seed, t=(0.35, 0.8), op=1.0):
    """Tufo de 3–5 lâminas PONTUDAS preenchidas (polígonos), mais legível que traços."""
    rng = random.Random(seed)
    out = ""
    n = rng.choice((3, 4, 5))
    for i in range(n):
        bx = x + (i - (n - 1) / 2) * 1.6 * s + rng.uniform(-0.6, 0.6)
        hh = s * rng.uniform(4.5, 8.0)
        tip = (bx + rng.uniform(-2.5, 2.5) * s, y - hh)
        out += P([(bx - 1.0 * s, y), tip, (bx + 1.0 * s, y)], tone(rampname, rng.uniform(*t)), f'opacity="{op}"')
    return out


def stone_poly(x, y, rx, ry, seed, n=7):
    """Seixo angular (polígono irregular, sem arco)."""
    rng = random.Random(seed)
    rot = rng.uniform(0, math.pi)
    return [(x + math.cos(rot + 2 * math.pi * i / n) * rx * rng.uniform(0.8, 1.05),
             y + math.sin(rot + 2 * math.pi * i / n) * ry * rng.uniform(0.8, 1.05)) for i in range(n)]


def stone(defs, x, y, rx, ry, seed, rampname="pedra", t=0.5):
    """Seixo angular com plano claro no topo-esquerda e base escura."""
    p = stone_poly(x, y, rx, ry, seed)
    top = [q for q in p if (q[0] - x) * LD2[0] + (q[1] - y) * LD2[1] > -0.2 * rx]
    out = P(shift(p, 0.6, 0.8), T("sombra", "contact"), 'opacity="0.35"')
    out += P(p, tone(rampname, t - 0.18))
    if len(top) >= 2:
        out += P(top + [(x + 0.1 * rx, y + 0.1 * ry)], tone(rampname, t + 0.14))
    return out
