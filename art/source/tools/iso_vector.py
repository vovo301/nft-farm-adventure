#!/usr/bin/env python3
"""iso_vector — primitivas vetoriais isométricas (SVG por código -> PNG @1x/@2x).

Ferramenta de produção da direção "isométrica cartoon" (guia: art/style-guide/README.md).
Arte 100% gerada por código: nenhum gerador de imagem, nenhuma referência externa.

Dependências (ver art/source/tools/requirements.txt):
    python3 -m pip install -r art/source/tools/requirements.txt   # cairosvg + Pillow
    (cairosvg usa a libcairo do sistema; no Debian/Ubuntu: apt-get install libcairo2)

Convenções (iguais ao guia):
  * Unidade = px a 1x. Tile de chão = losango 2:1 de 128x64 (TILE_W x TILE_H).
  * iso(x, y, z): x, y em TILES relativos à âncora (centro do losango da pegada),
    z = altura em px. Eixo x desce para a direita, eixo y desce para a esquerda.
  * Toda peça é um `Asset` com viewBox centrado na âncora: a âncora é (0, 0) no SVG.
  * Luz vem do topo-esquerda (tela). Face esquerda = clara, face direita = sombra.
  * Contorno externo = tom `outline` da rampa do material, desenhado POR TRÁS
    (truque do traço atrás: espessura visível = `ow`).

Uso como CLI (renderizar um .svg qualquer em @1x e @2x):
    python3 art/source/tools/iso_vector.py render arquivo.svg --out-dir pasta/ [--name nome]
"""
from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path

import cairosvg

ART = Path(__file__).resolve().parents[2]
PALETTE_PATH = ART / "style-guide" / "palette.json"

TILE_W = 128
TILE_H = 64
HW, HH = TILE_W / 2, TILE_H / 2
SCALES = (1, 2)              # exports obrigatórios: @1x e @2x
GROUND_BLEED = 4             # px de sangria do tile de chão (horizontal; vertical = metade)
OUTLINE = {"small": 2.0, "object": 2.0, "building": 3.0, "inner": 1.0}  # px a 1x

# --------------------------------------------------------------------------- paleta
_PAL: dict | None = None


def palette() -> dict:
    global _PAL
    if _PAL is None:
        _PAL = json.loads(PALETTE_PATH.read_text(encoding="utf-8"))
    return _PAL


def use_palette(path: Path) -> None:
    """Troca a paleta usada por c()/has()/tone_or() (ex.: builds antigos -> paleta arquivada).

    Desde o guia v3 (2026-11-22), `palette.json` é a paleta do estilo C. Os builds dos lotes
    v2.1 chamam isto com art/style-guide/archive/cartoon-v2.1/palette-cartoon-v2.1.json.
    """
    global _PAL, PALETTE_PATH
    PALETTE_PATH = Path(path)
    _PAL = None


def c(ramp: str, tone: str) -> str:
    """Hex de um tom da paleta. Erro se não existir (nenhuma cor fora da paleta)."""
    for t in palette()["ramps"][ramp]["tones"]:
        if t["tone"] == tone:
            return t["hex"]
    raise KeyError(f"tom '{tone}' não existe na rampa '{ramp}'")


def has(ramp: str, tone: str) -> bool:
    return any(t["tone"] == tone for t in palette()["ramps"][ramp]["tones"])


def tone_or(ramp: str, *tones: str) -> str:
    for t in tones:
        if has(ramp, t):
            return c(ramp, t)
    raise KeyError(f"nenhum de {tones} em '{ramp}'")


# --------------------------------------------------------------------------- geometria
def iso(x: float, y: float, z: float = 0.0) -> tuple[float, float]:
    """Tile (x, y) + altura z (px) -> tela (px), âncora em (0, 0)."""
    return ((x - y) * HW, (x + y) * HH - z)


def pts(points) -> str:
    return " ".join(f"{px:.2f},{py:.2f}" for px, py in points)


def footprint(cx: float, cy: float, sx: float, sy: float, z: float = 0.0):
    """Cantos (topo, direita, baixo, esquerda) da pegada sx×sy tiles centrada em (cx, cy)."""
    x0, x1, y0, y1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2
    return [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)]


# --------------------------------------------------------------------------- SVG infra
class Defs:
    """Registro de <defs> com ids únicos (gradientes, clipPaths)."""

    def __init__(self, prefix: str):
        self.prefix, self.items, self.n = prefix, [], 0

    def add(self, kind: str, body: str, attrs: str = "") -> str:
        self.n += 1
        gid = f"{self.prefix}{kind[0]}{self.n}"
        self.items.append(f'<{kind} id="{gid}" {attrs}>{body}</{kind}>')
        return gid

    def svg(self) -> str:
        return "<defs>" + "".join(self.items) + "</defs>"


def _stops(stops) -> str:
    out = []
    for s in stops:
        off, col, op = (s + (1.0,))[:3]
        out.append(f'<stop offset="{off}" stop-color="{col}" stop-opacity="{op}"/>')
    return "".join(out)


def lin(defs: Defs, stops, x1=0, y1=0, x2=0, y2=1, user=False) -> str:
    units = 'gradientUnits="userSpaceOnUse"' if user else ""
    return defs.add("linearGradient", _stops(stops),
                    f'x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" {units}')


def rad(defs: Defs, stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None) -> str:
    fx = cx if fx is None else fx
    fy = cy if fy is None else fy
    return defs.add("radialGradient", _stops(stops),
                    f'cx="{cx}" cy="{cy}" r="{r}" fx="{fx}" fy="{fy}"')


def clip(defs: Defs, shapes: str) -> str:
    return defs.add("clipPath", shapes)


@dataclass
class Asset:
    """Uma peça exportável. Canvas W×H px a 1x; âncora (ax, ay) dentro do canvas."""
    name: str
    width: int
    height: int
    anchor: tuple[float, float]
    footprint: tuple[float, float] = (1, 1)
    layers: list[tuple[str, str]] = field(default_factory=list)   # (id da camada, svg)
    defs: Defs = None

    def __post_init__(self):
        assert self.width % 4 == 0 and self.height % 4 == 0, "canvas deve ser múltiplo de 4"
        self.defs = self.defs or Defs(self.name.replace("_", "")[:10] + "_")

    def layer(self, lid: str, svg: str) -> "Asset":
        self.layers.append((lid, svg))
        return self

    def svg(self, debug: bool = False) -> str:
        ax, ay = self.anchor
        body = "".join(f'<g id="{lid}">{s}</g>' for lid, s in self.layers)
        if debug:
            body += (f'<g id="debug"><polygon points="{pts(footprint(0, 0, *self.footprint))}" '
                     'fill="none" stroke="#00d0ff" stroke-width="1"/>'
                     '<path d="M-6,0H6M0,-6V6" stroke="#ff00c8" stroke-width="1.5"/></g>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" '
                f'viewBox="{-ax} {-ay} {self.width} {self.height}">'
                f'<!-- {self.name} | gerado por art/source/tools/iso_vector.py | ancora=({ax},{ay}) -->'
                f"{self.defs.svg()}{body}</svg>")

    def meta(self) -> dict:
        ax, ay = self.anchor
        return {"name": self.name, "size_1x": [self.width, self.height],
                "anchor_px_1x": [ax, ay], "origin": [round(ax / self.width, 6), round(ay / self.height, 6)],
                "footprint_tiles": list(self.footprint), "scales": list(SCALES)}

    def export(self, src_dir: Path, out_dir: Path) -> list[Path]:
        """Grava <src_dir>/<name>.svg e <out_dir>/<name>@1x.png, @2x.png e <name>.json."""
        src_dir.mkdir(parents=True, exist_ok=True)
        out_dir.mkdir(parents=True, exist_ok=True)
        svg = self.svg()
        (src_dir / f"{self.name}.svg").write_text(svg, encoding="utf-8")
        outs = render_svg(svg, out_dir, self.name, self.width, self.height)
        (out_dir / f"{self.name}.json").write_text(json.dumps(self.meta(), indent=1) + "\n", encoding="utf-8")
        return outs


def render_svg(svg: str, out_dir: Path, name: str, w: int, h: int) -> list[Path]:
    outs = []
    for s in SCALES:
        p = out_dir / f"{name}@{s}x.png"
        cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(p),
                         output_width=w * s, output_height=h * s)
        outs.append(p)
    return outs


# --------------------------------------------------------------------------- primitivas
def ground_diamond(fill: str, bleed: float = GROUND_BLEED) -> str:
    """Losango de chão 128×64 com sangria (bleed px na horizontal, bleed/2 na vertical).

    Borda nítida (crispEdges): em 2:1 nenhum centro de pixel cai sobre a aresta, então
    vizinhos se cobrem sem buraco; a sangria cobre a filtragem linear no engine.
    """
    b = bleed
    p = [(0, -HH - b / 2), (HW + b, 0), (0, HH + b / 2), (-HW - b, 0)]
    return f'<polygon points="{pts(p)}" fill="{fill}" shape-rendering="crispEdges"/>'


def ground_clip(defs: Defs, inset: float = 0.86, bleed: float = 0) -> str:
    """clipPath do losango (inset < 1 = área segura de detalhe que não encosta na borda)."""
    p = [(0, -HH * inset - bleed / 2), (HW * inset + bleed, 0), (0, HH * inset + bleed / 2), (-HW * inset - bleed, 0)]
    return clip(defs, f'<polygon points="{pts(p)}"/>')


def iso_box(defs: Defs, ramp: str, cx=0.0, cy=0.0, sx=0.6, sy=0.6, h=40.0, z0=0.0,
            ow: float = OUTLINE["object"], rim: bool = True) -> str:
    """Bloco isométrico: 3 faces (topo claro, esquerda média, direita sombra) + contorno."""
    A, B, C, D = footprint(cx, cy, sx, sy, z0)
    A2, B2, C2, D2 = footprint(cx, cy, sx, sy, z0 + h)
    silhouette = [A2, B2, B, C, D, D2]
    g_top = lin(defs, [(0, tone_or(ramp, "highlight", "light")), (1, c(ramp, "light"))], 0, 0, 1, 1)
    g_left = lin(defs, [(0, c(ramp, "light")), (1, c(ramp, "base"))], 0, 0, 0, 1)
    g_right = lin(defs, [(0, c(ramp, "shadow")), (1, tone_or(ramp, "deep", "shadow"))], 0, 0, 0, 1)
    out = [
        # contorno por trás (metade do traço fica coberta pelas faces)
        f'<polygon points="{pts(silhouette)}" fill="{c(ramp, "outline")}" stroke="{c(ramp, "outline")}" '
        f'stroke-width="{2 * ow}" stroke-linejoin="round"/>',
        f'<polygon points="{pts([D, C, C2, D2])}" fill="url(#{g_left})"/>',
        f'<polygon points="{pts([C, B, B2, C2])}" fill="url(#{g_right})"/>',
        f'<polygon points="{pts([A2, B2, C2, D2])}" fill="url(#{g_top})"/>',
    ]
    if rim:  # aresta frontal do topo pega luz; aresta vertical frontal em sombra suave
        out.append(f'<polyline points="{pts([D2, C2, B2])}" fill="none" stroke="{tone_or(ramp, "highlight", "light")}" '
                   f'stroke-width="{OUTLINE["inner"]}" stroke-linejoin="round" opacity="0.9"/>')
        out.append(f'<line x1="{C[0]:.2f}" y1="{C[1]:.2f}" x2="{C2[0]:.2f}" y2="{C2[1]:.2f}" '
                   f'stroke="{tone_or(ramp, "deep", "shadow")}" stroke-width="{OUTLINE["inner"]}" opacity="0.7"/>')
    return "".join(out)


def cylinder(defs: Defs, ramp: str, cx=0.0, cy=0.0, r=10.0, h=40.0, z0=0.0,
             ow: float = OUTLINE["object"], cap: bool = True) -> str:
    """Cilindro vertical (tronco, poste, balde). r em px; topo é elipse 2:1."""
    px, py = iso(cx, cy, z0)
    yb, yt = py, py - h
    ry = r / 2
    body = (f"M{px - r:.2f},{yt:.2f} L{px - r:.2f},{yb:.2f} "
            f"A{r:.2f},{ry:.2f} 0 0 0 {px + r:.2f},{yb:.2f} L{px + r:.2f},{yt:.2f} Z")
    g_body = lin(defs, [(0, c(ramp, "light")), (0.45, c(ramp, "base")), (1, c(ramp, "shadow"))], 0, 0, 1, 0)
    g_cap = lin(defs, [(0, tone_or(ramp, "highlight", "light")), (1, c(ramp, "light"))], 0, 0, 1, 1)
    o = c(ramp, "outline")
    out = [f'<path d="{body}" fill="{o}" stroke="{o}" stroke-width="{2 * ow}" stroke-linejoin="round"/>']
    if cap:
        out.append(f'<ellipse cx="{px:.2f}" cy="{yt:.2f}" rx="{r:.2f}" ry="{ry:.2f}" fill="{o}" stroke="{o}" stroke-width="{2 * ow}"/>')
    out.append(f'<path d="{body}" fill="url(#{g_body})"/>')
    if cap:
        out.append(f'<ellipse cx="{px:.2f}" cy="{yt:.2f}" rx="{r:.2f}" ry="{ry:.2f}" fill="url(#{g_cap})"/>')
    return "".join(out)


def fluffy(defs: Defs, ramp: str, blobs, ow: float = OUTLINE["object"], lobes: bool = True) -> str:
    """Massa fofa (copa de árvore, arbusto, nuvem) = união de círculos (x, y, r) em px de tela.

    - contorno externo único da união (traço atrás);
    - cada lobo com degradê radial deslocado para o topo-esquerda (volume local);
    - sombreamento global: canto inferior-direito escurece, topo-esquerdo clareia.
    Ordem: liste do fundo para a frente.
    """
    o = c(ramp, "outline")
    out = ["".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{o}" stroke="{o}" stroke-width="{2 * ow}"/>'
                   for x, y, r in blobs)]
    g = rad(defs, [(0, tone_or(ramp, "highlight", "light")), (0.35, c(ramp, "light")),
                   (0.8, c(ramp, "base")), (1, c(ramp, "shadow"))], cx=0.5, cy=0.5, r=0.62, fx=0.32, fy=0.28)
    for x, y, r in blobs:
        stroke = (f' stroke="{c(ramp, "shadow")}" stroke-width="{OUTLINE["inner"]}"' if lobes else "")
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#{g})"{stroke}/>')
    # volume global da massa
    xs = [b[0] for b in blobs]; ys = [b[1] for b in blobs]; rs = [b[2] for b in blobs]
    x0, x1 = min(x - r for x, r in zip(xs, rs)), max(x + r for x, r in zip(xs, rs))
    y0, y1 = min(y - r for y, r in zip(ys, rs)), max(y + r for y, r in zip(ys, rs))
    cid = clip(defs, "".join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in blobs))
    gs = rad(defs, [(0, tone_or(ramp, "deep", "shadow"), 0.0), (0.55, tone_or(ramp, "deep", "shadow"), 0.0),
                    (1, tone_or(ramp, "deep", "shadow"), 0.55)], cx=0.32, cy=0.28, r=0.85)
    out.append(f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="url(#{gs})" clip-path="url(#{cid})"/>')
    return "".join(out)


def sphere(defs: Defs, ramp: str, x: float, y: float, r: float, ow: float = OUTLINE["small"]) -> str:
    """Esfera simples (fruta, pedrinha, arbusto pequeno)."""
    return fluffy(defs, ramp, [(x, y, r)], ow=ow, lobes=False)


def drop_shadow(defs: Defs, cx=0.0, cy=0.0, rx=40.0, ry=18.0, dx=8.0, dy=4.0, opacity=0.32) -> str:
    """Sombra projetada elíptica e suave no chão (luz topo-esquerda => desloca p/ baixo-direita).

    (cx, cy) em px de tela relativos à âncora. Vai na camada `shadow`, exportada separada.
    """
    col = c("sombra", "cast")
    g = rad(defs, [(0, col, opacity), (0.55, col, opacity * 0.85), (1, col, 0.0)])
    return f'<ellipse cx="{cx + dx:.2f}" cy="{cy + dy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="url(#{g})"/>'


def outline_path(d: str, ramp: str, ow: float = OUTLINE["object"]) -> str:
    """Contorno por trás para qualquer path: desenhe isto ANTES do preenchimento."""
    o = c(ramp, "outline")
    return f'<path d="{d}" fill="{o}" stroke="{o}" stroke-width="{2 * ow}" stroke-linejoin="round" stroke-linecap="round"/>'


def scatter(seed: int, n: int, lim: float = 0.38):
    """Pontos determinísticos (u, v) em tiles dentro de |u|,|v| <= lim (área segura)."""
    rng = random.Random(seed)
    return [(rng.uniform(-lim, lim), rng.uniform(-lim, lim), rng.random()) for _ in range(n)]


# --------------------------------------------------------------------------- primitivas v2.1
# (adicionadas para o lote 2026-11-22-alvo-visual-iso-01; não mudam as anteriores)

def poly_d(points, close: bool = True) -> str:
    """Path 'd' de uma polilinha/polígono em px de tela."""
    s = "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points)
    return s + (" Z" if close else "")


def rounded_d(points, radii, mapf=None) -> str:
    """Polígono fechado com cantos arredondados (convexos ou côncavos).

    points: vértices em qualquer espaço 2D (ex.: (u, v) em tiles); radii: raio por vértice
    no mesmo espaço (0 = canto vivo). O arredondamento é feito ANTES de `mapf` (ex.: lambda
    p: iso(*p)); como a projeção é afim, a curva quadrática continua exata na tela.
    """
    mapf = mapf or (lambda p: p)
    n = len(points)
    segs = []
    for k in range(n):
        p, a, b = points[k], points[k - 1], points[(k + 1) % n]
        r = radii[k]
        if r <= 0:
            segs.append(("L", mapf(p)))
            continue
        la = math.dist(p, a); lb = math.dist(p, b)
        r = min(r, la / 2, lb / 2)
        p1 = (p[0] + (a[0] - p[0]) * r / la, p[1] + (a[1] - p[1]) * r / la)
        p2 = (p[0] + (b[0] - p[0]) * r / lb, p[1] + (b[1] - p[1]) * r / lb)
        segs.append(("L", mapf(p1)))
        segs.append(("Q", mapf(p), mapf(p2)))
    out = []
    for k, s in enumerate(segs):
        if s[0] == "L":
            out.append(("M" if k == 0 else "L") + f"{s[1][0]:.2f},{s[1][1]:.2f}")
        else:
            out.append(f"Q{s[1][0]:.2f},{s[1][1]:.2f} {s[2][0]:.2f},{s[2][1]:.2f}")
    return " ".join(out) + " Z"


def hull(points):
    """Envoltória convexa (cadeia monótona). Pontos em px de tela."""
    p = sorted(set((round(x, 3), round(y, 3)) for x, y in points))
    if len(p) < 3:
        return p

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0:
            lo.pop()
        lo.append(q)
    for q in reversed(p):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], q) <= 0:
            hi.pop()
        hi.append(q)
    return lo[:-1] + hi[:-1]


def ellipse_pts(center, a, b, n: int = 48, t0: float = 0.0, t1: float = 2 * math.pi):
    """Pontos de uma elipse paramétrica c + a·cos t + b·sin t (a, b vetores de tela)."""
    cx, cy = center
    return [(cx + a[0] * math.cos(t) + b[0] * math.sin(t), cy + a[1] * math.cos(t) + b[1] * math.sin(t))
            for t in (t0 + (t1 - t0) * k / (n - 1 if t1 - t0 < 2 * math.pi else n) for k in range(n))]


WORLD_TILE = 72.0   # px "de mundo" de uma aresta de tile (para círculos em planos verticais)


def vdisc_axes(face: str, r: float):
    """Vetores (a, b) de um círculo de raio r (px) num plano vertical.

    face 'y': plano x–z (disco virado para +y, face esquerda/clara);
    face 'x': plano y–z (disco virado para +x, face direita/sombra).
    """
    k = r / WORLD_TILE
    if face == "y":
        return (HW * k, HH * k), (0.0, -r)
    return (-HW * k, HH * k), (0.0, -r)


# --------------------------------------------------------------------------- CLI
def _cli():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("render", help="renderiza um .svg em @1x e @2x")
    r.add_argument("svg", type=Path)
    r.add_argument("--out-dir", type=Path, required=True)
    r.add_argument("--name")
    a = ap.parse_args()
    if a.cmd == "render":
        text = a.svg.read_text(encoding="utf-8")
        import re
        w = int(float(re.search(r'width="([\d.]+)"', text).group(1)))
        h = int(float(re.search(r'height="([\d.]+)"', text).group(1)))
        a.out_dir.mkdir(parents=True, exist_ok=True)
        for p in render_svg(text, a.out_dir, a.name or a.svg.stem, w, h):
            print(p)


if __name__ == "__main__":
    _cli()
