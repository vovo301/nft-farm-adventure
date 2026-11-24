#!/usr/bin/env python3
"""Árvore folhosa do mundo pintada em RASTER por script (guia v3.2).

Por que raster: a versão vetorial (v32-nature/tree_oak_a) ficou chapada ao lado das imagens
do usuário. Aqui cada folha é uma pincelada com sombra própria, a copa é feita de massas
irregulares de folhas pontudas com oclusão escura entre elas, o tronco tem casca com estrias e
os galhos aparecem nos vãos. Tudo é determinístico (semente fixa), sem IA e sem referência
externa.

Trabalha a 4x do @1x, reduz em alfa pré-multiplicado (Lanczos) para @2x e @1x.

Saídas:
  art/export/world-painted/tree_leafy_a@{1x,2x}.png + tree_leafy_a.json
  art/export/world-painted/tree_leafy_a_shadow@{1x,2x}.png + tree_leafy_a_shadow.json
  art/review/2026-11-24-arvore-folhosa/{comparativo-v2.png, zoom-0.5.png, qa.json}

Uso:  python3 art/source/tools/paint_tree_leafy.py      (sai 1 se o QA falhar)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
PAL = json.loads((ROOT / "art/style-guide/palette.json").read_text())
OUT = ROOT / "art/export/world-painted"
REV = ROOT / "art/review/2026-11-24-arvore-folhosa"
NAME = "tree_leafy_a"
SEED = 20261124

SS = 4                      # supersample: px de trabalho por px @1x
W1, H1 = 280, 272           # canvas de trabalho @1x (recortado depois)
AX1, AY1 = W1 // 2, 236     # âncora @1x no canvas de trabalho
W, H = W1 * SS, H1 * SS
AX, AY = AX1 * SS, AY1 * SS


def tone(ramp: str, role: str) -> np.ndarray:
    for t in PAL["ramps"][ramp]["tones"]:
        if t["tone"] == role:
            h = t["hex"].lstrip("#")
            return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)
    raise KeyError((ramp, role))


# Rampa da copa (escuro frio -> claro quente). Só tons da paleta v3.2; cada folha usa um tom
# ou a mistura de dois tons VIZINHOS desta sequência.
COPA = [tone("pinho", "deep"), tone("pinho", "shadow"), tone("folhagem", "shadow"),
        tone("folhagem", "base"), tone("folhagem", "light"), tone("folhagem", "highlight"),
        tone("grama_seca", "highlight")]
CASCA = [tone("casca", r) for r in ("deep", "shadow", "base", "light", "highlight")]
OUTLINE = tone("contorno_item", "base")
WARM = tone("grama_seca", "highlight")
SHADOW_CAST = tone("sombra", "cast")
SHADOW_CONTACT = tone("sombra", "contact")
LIGHT3 = np.array([-0.5, -0.75, 0.55]) / np.linalg.norm([-0.5, -0.75, 0.55])

rng = np.random.default_rng(SEED)


def ramp(stops, t):
    t = np.clip(np.asarray(t, float), 0, 1) * (len(stops) - 1)
    i = np.minimum(np.floor(t).astype(int), len(stops) - 2)
    f = (t - i)[..., None]
    s = np.stack(stops)
    return s[i] * (1 - f) + s[i + 1] * f


def vnoise(h, w, cell, seed_rng):
    gh, gw = h // cell + 3, w // cell + 3
    g = seed_rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g, "F").resize((gw * cell, gh * cell), Image.BICUBIC)
    return np.asarray(im)[:h, :w]


def _conv1d(a, k, axis):
    R = len(k) // 2
    pad = [(0, 0)] * a.ndim
    pad[axis] = (R, R)
    p = np.pad(a, pad, mode="edge")
    out = np.zeros_like(a, dtype=np.float64)
    n = a.shape[axis]
    for i, w in enumerate(k):
        out += w * np.take(p, range(i, i + n), axis=axis)
    return out


def blur(a, sigma):
    """Desfoque gaussiano separável (numpy; o Pillow não desfoca imagens 'F')."""
    if sigma <= 0:
        return a.astype(float)
    R = max(1, int(math.ceil(3 * sigma)))
    x = np.arange(-R, R + 1)
    k = np.exp(-x * x / (2 * sigma * sigma))
    k /= k.sum()
    return _conv1d(_conv1d(a.astype(float), k, 0), k, 1)


def box3(a):
    k = np.ones(3) / 3
    return _conv1d(_conv1d(a.astype(float), k, 0), k, 1)


def dilate(a, px):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "L")
    return np.asarray(im.filter(ImageFilter.MaxFilter(2 * px + 1)), float) / 255


def erode(a, px):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "L")
    return np.asarray(im.filter(ImageFilter.MinFilter(2 * px + 1)), float) / 255


def over(dst_rgb, dst_a, src_rgb, src_a):
    """'over' em alfa reto (arrays float)."""
    sa = src_a[..., None]
    out_a = src_a + dst_a * (1 - src_a)
    num = src_rgb * sa + dst_rgb * dst_a[..., None] * (1 - sa)
    out_rgb = np.where(out_a[..., None] > 1e-6, num / np.maximum(out_a[..., None], 1e-6), 0)
    return out_rgb, out_a


# ---------------------------------------------------------------- tronco e galhos
def paint_limb(rgb, alpha, pts, widths, tex):
    """Galho afunilado: centro + larguras (@1x, relativo à âncora). Sombreado de cilindro."""
    P = [(AX + x * SS, AY + y * SS) for x, y in pts]
    Wd = [w * SS / 2 for w in widths]
    best = np.full(alpha.shape, 9.0)
    nxm = np.zeros(alpha.shape)
    nym = np.zeros(alpha.shape)
    for (x0, y0), (x1, y1), w0, w1 in zip(P, P[1:], Wd, Wd[1:]):
        pad = max(w0, w1) + 2
        bx0, bx1 = int(min(x0, x1) - pad), int(max(x0, x1) + pad) + 1
        by0, by1 = int(min(y0, y1) - pad), int(max(y0, y1) + pad) + 1
        bx0, by0 = max(0, bx0), max(0, by0)
        bx1, by1 = min(W, bx1), min(H, by1)
        yy, xx = np.mgrid[by0:by1, bx0:bx1].astype(float)
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0, 1)
        cx, cy = x0 + t * dx, y0 + t * dy
        w = w0 + (w1 - w0) * t
        L = math.sqrt(L2)
        nx, ny = -dy / L, dx / L
        d = ((xx - cx) * nx + (yy - cy) * ny) / w
        dist = np.hypot(xx - cx, yy - cy) / w
        sl = (slice(by0, by1), slice(bx0, bx1))
        upd = dist < best[sl]
        best[sl] = np.where(upd, dist, best[sl])
        nxm[sl] = np.where(upd, d * nx, nxm[sl])
        nym[sl] = np.where(upd, d * ny, nym[sl])
    inside = best <= 1.0
    nz = np.sqrt(np.clip(1 - nxm ** 2 - nym ** 2, 0, 1))
    lum = np.clip(nxm * LIGHT3[0] + nym * LIGHT3[1] + nz * LIGHT3[2], 0, 1)
    v = 0.12 + 0.78 * lum ** 1.1 + (tex - 0.5) * 0.30
    v = np.where(tex < 0.24, v - 0.22, v)            # frestas da casca
    col = ramp(CASCA, np.clip(v, 0.02, 0.92))
    edge = np.clip((1.0 - best) * 3.5, 0, 1)         # borda suave (AA no 4x)
    a = np.where(inside, edge, 0)
    return over(rgb, alpha, col, a)


def paint_trunk(rgb, alpha):
    """Tronco curto e grosso, raízes abertas e 3 forquilhas que entram na copa."""
    trng = np.random.default_rng(SEED + 1)
    # textura da casca: estrias verticais (ruído esticado em y) + grão fino
    streak = np.asarray(Image.fromarray(trng.random((H // 90 + 2, W // 7 + 2)).astype(np.float32), "F")
                        .resize((W, H), Image.BICUBIC))
    grain = vnoise(H, W, 6, trng)
    tex = 0.80 * streak + 0.20 * grain
    tex = (tex - tex.min()) / (tex.max() - tex.min())
    limbs = [
        # raízes abertas no chão
        ([(-10, -14), (-24, -3), (-33, 3)], [20, 12, 5]),
        ([(10, -14), (23, -3), (33, 2)], [20, 12, 5]),
        ([(3, -10), (8, 3), (11, 7)], [16, 10, 4]),
        ([(-5, -10), (-14, 2), (-18, 5)], [14, 8, 3]),
        # tronco curto e grosso
        ([(0, -12), (0, -16), (-1, -36), (0, -58)], [46, 40, 32, 29]),
        # forquilhas (aparecem embaixo da copa)
        ([(-4, -54), (-22, -82), (-38, -104)], [19, 13, 7]),
        ([(4, -54), (23, -84), (36, -106)], [19, 13, 7]),
        ([(0, -58), (3, -86), (5, -102)], [13, 9, 5]),
    ]
    trgb, ta = np.zeros_like(rgb), np.zeros_like(alpha)
    for pts, ws in limbs:
        trgb, ta = paint_limb(trgb, ta, pts, ws, tex)
    # a copa sombreia o alto do tronco
    yy = (np.arange(H)[:, None] - AY) / SS
    k = np.clip((-yy - 40) / 30, 0, 0.55)[..., None]
    trgb = trgb * (1 - k) + CASCA[0] * k
    return over(rgb, alpha, trgb, ta)


# ---------------------------------------------------------------- copa em tufinhos
# Copa "couve-flor" (padrão das árvores, ver guia §8): domo largo feito de muitos tufinhos
# arredondados com borda em pequenos lóbulos; cada tufo tem luz amarelo-esverdeada em cima e
# sombra verde-azulada embaixo, separado dos vizinhos por um vão escuro.
CANOPY = dict(cx=0, cy=-128, rx=100, ry_top=72, ry_bot=74, notch_w=30, notch_h=16)


def canopy_shape(x, y, C, ph):
    """(dentro?, borda de baixo) da silhueta do domo, em px @1x relativos à âncora."""
    ox = (x - C["cx"]) / C["rx"]
    ry = np.where(y < C["cy"], C["ry_top"], C["ry_bot"])
    oy = (y - C["cy"]) / ry
    th = np.arctan2(oy, ox)
    k = 1 + 0.06 * np.sin(5 * th + ph[0]) + 0.03 * np.sin(9 * th + ph[1])
    rr = np.hypot(ox, oy) / k
    bottom = (C["cy"] + C["ry_bot"] * np.sqrt(np.clip(1 - ox * ox, 0, 1))
              - C["notch_h"] * np.exp(-((x - C["cx"]) / C["notch_w"]) ** 2))
    return (rr < 1.0) & (y < bottom), bottom


def canopy_value(x, y, C):
    """Luz do domo inteiro (0 escuro-frio .. 1 claro-quente), luz do topo-esquerda."""
    ox = (x - C["cx"]) / C["rx"]
    oy = (y - C["cy"]) / np.where(y < C["cy"], C["ry_top"], C["ry_bot"])
    nz = np.sqrt(np.clip(1 - ox * ox - oy * oy, 0, 1))
    n = np.stack([ox, oy, nz], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
    diff = np.clip(n @ LIGHT3, 0, 1)
    return 0.15 + 0.70 * diff - 0.12 * ox - 0.10 * oy


def paint_canopy_core(rgb, alpha, C, seed, ramp_stops=None):
    """Miolo escuro do domo (vãos e barriga da copa). Pinte ANTES do tronco/forquilhas."""
    stops = ramp_stops or COPA
    ph = np.random.default_rng(seed).random(2) * 6.28
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    inside, _ = canopy_shape((xx - AX) / SS, (yy - AY) / SS, C, ph)
    core = blur(inside.astype(float), 0.8 * SS) * inside
    return over(rgb, alpha, np.broadcast_to(ramp(stops, 0.03), rgb.shape), core)


def paint_canopy_tufts(rgb, alpha, C, seed, ramp_stops=None, spacing=13.0, tuft_r=(9.0, 12.6)):
    """Pinta a copa em tufinhos densos (DEPOIS do tronco). Reutilizável: troque C, seed e rampa."""
    stops = ramp_stops or COPA
    ph = np.random.default_rng(seed).random(2) * 6.28
    trng = np.random.default_rng(seed + 100)
    # 2) centros dos tufos: grade hexagonal com jitter; nenhum tufo na barriga (forquilhas)
    pts = []
    dy = spacing * 0.866
    j = 0
    for gy in np.arange(C["cy"] - C["ry_top"] * 1.2, C["cy"] + C["ry_bot"], dy):
        for gx in np.arange(C["cx"] - C["rx"] * 1.2, C["cx"] + C["rx"] * 1.2, spacing):
            px = gx + (spacing / 2 if j % 2 else 0) + trng.normal(0, spacing * 0.18)
            py = gy + trng.normal(0, spacing * 0.18)
            ok, bot = canopy_shape(np.array(px), np.array(py), C, ph)
            margin = 12 * math.exp(-((px - C["cx"]) / C["notch_w"]) ** 2)
            if ok and py < bot - margin:
                pts.append((py + trng.normal(0, 1.5), px, py, trng.uniform(*tuft_r)))
        j += 1
    pts.sort()
    # 3) cada tufo: vão escuro (halo) + corpo lobado com luz própria
    for _, x, y, r in pts:
        X, Y, R = AX + x * SS, AY + y * SS, r * SS
        n = int(trng.integers(6, 9))
        ang0 = trng.random() * 6.28
        lobes = [(X, Y, 0.62 * R)]
        for i in range(n):
            a = ang0 + 2 * math.pi * i / n + trng.normal(0, 0.18)
            d = 0.58 * R * trng.uniform(0.9, 1.1)
            lobes.append((X + d * math.cos(a), Y + d * math.sin(a), 0.42 * R * trng.uniform(0.85, 1.15)))
        pad = int(1.3 * R + 3 * SS)
        bx0, by0 = max(0, int(X) - pad), max(0, int(Y) - pad)
        bx1, by1 = min(W, int(X) + pad), min(H, int(Y) + pad)
        sy, sx = np.mgrid[by0:by1, bx0:bx1].astype(float)
        sl = (slice(by0, by1), slice(bx0, bx1))
        L = np.array(lobes)
        dist = np.hypot(sx[None] - L[:, 0, None, None], sy[None] - L[:, 1, None, None])
        sd_all = dist - L[:, 2, None, None]
        sd = sd_all.min(0)
        kk = sd_all.argmin(0)
        # vão escuro ao redor (um pouco para baixo): separa o tufo do que está atrás
        dh = np.hypot(sx[None] - L[:, 0, None, None] - 0.5 * SS,
                      sy[None] - L[:, 1, None, None] - 1.0 * SS) - L[:, 2, None, None]
        halo_a = np.clip(0.5 - (dh.min(0) - 1.3 * SS) / (1.2 * SS), 0, 1) * 0.6
        g = canopy_value((sx - AX) / SS, (sy - AY) / SS, C)
        rgb[sl], alpha[sl] = over(rgb[sl], alpha[sl], ramp(stops, np.clip(g - 0.4, 0, 1) * 0.5), halo_a)
        # luz local: normal do tufo + normal do lóbulo mais próximo (borda recortada clara)
        tx, ty = (sx - X) / R, (sy - Y) / R
        lx = (sx - L[kk, 0]) / L[kk, 2]
        ly = (sy - L[kk, 1]) / L[kk, 2]
        nx, ny = 0.62 * tx + 0.38 * lx, 0.62 * ty + 0.38 * ly
        nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.05, 1))
        nn = np.sqrt(nx * nx + ny * ny + nz * nz)
        ld = np.clip((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / nn, 0, 1)
        t = 0.72 * g + 0.50 * ld - 0.13 - 0.18 * np.clip(ty - 0.2, 0, 1) + trng.normal(0, 0.035)
        body_a = np.clip(0.5 - sd / (0.9 * SS) * 2, 0, 1)
        rgb[sl], alpha[sl] = over(rgb[sl], alpha[sl], ramp(stops, np.clip(t, 0.04, 1)), body_a)
    return rgb, alpha


def paint_dirt(alpha_shape):
    """Terra discreta na base (sem contorno; assenta no gramado). Fica atrás de tudo."""
    drng = np.random.default_rng(SEED + 4)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    x1, y1 = (xx - AX) / SS - 3, (yy - AY) / SS - 3
    th = np.arctan2(y1, x1)
    k = 1 + 0.12 * np.sin(3 * th + 1.3) + 0.07 * np.sin(7 * th + 0.4)
    rr = np.hypot(x1 / 50, y1 / 12) / k
    a = np.clip((1 - rr) * 2.2, 0, 1) * 0.9
    tex = vnoise(H, W, 3 * SS, drng)
    TM = [tone("terra_monte", r) for r in ("deep", "shadow", "base", "light", "highlight")]
    col = ramp(TM, np.clip(0.35 + 0.25 * (tex - 0.5) - 0.15 * y1 / 12 - 0.08 * x1 / 50, 0, 1))
    # torrões claros
    for _ in range(7):
        cx, cy = drng.uniform(-44, 44), drng.uniform(-4, 8)
        if abs(cx) < 30:
            continue
        m = np.hypot((x1 - cx) / 2.2, (y1 + 2 - cy) / 1.4) < 1
        col[m] = ramp(TM, 0.85)
    return col, a


# ---------------------------------------------------------------- acabamento
def finish(rgb, alpha, crown_mask):
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    frng = np.random.default_rng(SEED + 3)
    # textura sutil (pinceladas): ruído em 2 escalas, ±4 %
    tex = 0.6 * vnoise(H, W, 10, frng) + 0.4 * vnoise(H, W, 3, frng)
    rgb = rgb * (1 + (tex[..., None] - 0.5) * 0.08)
    # luz quente no topo-esquerda -> sombra fria no baixo-direita (±10 %)
    ys, xs = np.nonzero(alpha > 0.5)
    gx = (xx - xs.mean()) / (np.ptp(xs) + 1)
    gy = (yy - ys.mean()) / (np.ptp(ys) + 1)
    g = np.clip(-(gx * 0.8 + gy), -0.6, 0.6)[..., None]
    warm = np.array([1.06, 1.04, 0.92])
    cool = np.array([0.86, 0.92, 1.00])
    rgb = np.where(g > 0, rgb * (1 + (warm - 1) * g / 0.6), rgb * (1 + (cool - 1) * (-g) / 0.6))
    # brilho quente na borda iluminada da copa (rim)
    sil = (alpha > 0.5).astype(float)
    shifted = np.roll(np.roll(sil, 3 * SS, 0), 2 * SS, 1)
    rim = np.clip(sil - shifted, 0, 1) * crown_mask
    rim = blur(rim, 1.2 * SS) * sil * np.clip(g[..., 0] / 0.25, 0, 1)   # só do lado da luz
    rim = np.clip(rim * 1.5, 0, 0.45)[..., None]
    rgb = rgb * (1 - rim) + WARM * rim
    # pequenos brilhos (pontos de luz) nas folhas do topo-esquerda
    lum = rgb @ np.array([0.30, 0.59, 0.11])
    cys, cxs = np.nonzero(crown_mask > 0)
    zone = (crown_mask > 0) & (sil > 0) & (yy < cys.mean()) & (xx < cxs.mean())
    cand = np.argwhere(zone & (lum > np.percentile(lum[zone], 85)))
    pick = cand[frng.choice(len(cand), size=min(26, len(cand)), replace=False)]
    spark = np.zeros((H, W))
    for y, x in pick:
        r = frng.uniform(0.8, 1.6) * SS
        y0, y1, x0, x1 = max(0, y - 8), min(H, y + 9), max(0, x - 8), min(W, x + 9)
        sy, sx = np.mgrid[y0:y1, x0:x1]
        spark[y0:y1, x0:x1] += np.exp(-((sy - y) ** 2 + (sx - x) ** 2) / (2 * (r / 2) ** 2))
    spark = np.clip(spark, 0, 1)[..., None] * 0.65 * sil[..., None]
    rgb = rgb * (1 - spark) + WARM * spark
    return np.clip(rgb, 0, 255)


def outline(rgb, alpha):
    """Anel de 3 px @2x (6 px no 4x) em contorno_item.base a 85 %, atrás do corpo."""
    ring_a = blur(dilate((alpha > 0.4).astype(float), 3 * SS // 2), 0.6) * 0.88
    ring_rgb = np.broadcast_to(OUTLINE, rgb.shape).astype(float)
    return over(ring_rgb, ring_a, rgb, alpha)


# ---------------------------------------------------------------- sombra projetada
def cast_shadow(alpha):
    """Projeção pela luz L_CAST do guia: por px de altura h -> (+0,834 h, +0,133 h)."""
    SW, SH = 300 * SS, 100 * SS
    sax, say = 60 * SS, 40 * SS
    dens = np.zeros((SH, SW))
    ys, xs = np.nonzero(alpha > 0.3)
    h = (AY - ys).astype(float)
    keep = h > -2 * SS
    ys, xs, h = ys[keep], xs[keep], np.maximum(h[keep], 0)
    dx = (xs - AX) + 0.834 * h
    dy = 0.133 * h
    X = np.round(sax + dx).astype(int)
    Y = np.round(say + dy).astype(int)
    ok = (X >= 0) & (X < SW) & (Y >= 0) & (Y < SH)
    hn = h / h.max()
    np.maximum.at(dens, (Y[ok], X[ok]), 1.0 - 0.55 * hn[ok])
    # 3 camadas: perto nítida e escura, longe larga e clara
    near = blur(dens * (dens > 0.75), 1.2 * SS)
    mid = blur(dens, 3.0 * SS)
    far = blur(dens, 6.0 * SS)
    a = np.clip(0.42 * near + 0.40 * mid + 0.30 * far, 0, 1) * 0.56
    # contato (22 %)
    yy, xx = np.mgrid[0:SH, 0:SW].astype(float)
    ce = np.exp(-(((xx - sax - 2 * SS) / (20 * SS)) ** 2 + ((yy - say) / (8 * SS)) ** 2) * 2.2)
    a_rgb = np.broadcast_to(SHADOW_CAST, (SH, SW, 3)).astype(float)
    c_rgb = np.broadcast_to(SHADOW_CONTACT, (SH, SW, 3)).astype(float)
    rgb, aa = over(a_rgb, a, c_rgb, ce * 0.22)
    return rgb, aa, (sax, say)


# ---------------------------------------------------------------- export
def reduce_premul(rgb, a, factor):
    h, w = a.shape
    nw, nh = w // factor, h // factor
    out = []
    for ch in [rgb[..., c] * a for c in range(3)] + [a]:
        im = Image.fromarray(ch.astype(np.float32), "F").resize((nw, nh), Image.LANCZOS)
        out.append(np.asarray(im))
    pa = np.clip(out[3], 0, 1)
    prgb = np.stack(out[:3], -1)
    rgb2 = np.where(pa[..., None] > 1e-4, prgb / np.maximum(pa[..., None], 1e-4), 0)
    return np.clip(rgb2, 0, 255), pa


def to_img(rgb, a):
    arr = np.dstack([np.clip(rgb, 0, 255), np.clip(a, 0, 1) * 255]).round().astype(np.uint8)
    arr[arr[..., 3] < 3, 3] = 0          # resíduo do Lanczos (anéis de 1–2/255)
    arr[arr[..., 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def fit_crop(rgb, a, ax, ay, margin=4, symmetric=True):
    """Recorta ao conteúdo (em px @1x), lados múltiplos de 4, âncora x = W/2 se symmetric."""
    ys, xs = np.nonzero(a > 1 / 255)
    x0, x1 = xs.min() // SS, xs.max() // SS + 1
    y0, y1 = ys.min() // SS, ys.max() // SS + 1
    ax1, ay1 = ax // SS, ay // SS
    if symmetric:
        half = max(ax1 - x0, x1 - ax1) + margin
        half += (-half) % 2
        cx0, cw = ax1 - half, 2 * half
    else:
        cx0, cw = x0 - margin, (x1 - x0) + 2 * margin
    cy0, ch = y0 - margin, (y1 - y0) + 2 * margin
    if (ay1 - cy0) % 2:
        cy0 -= 1
        ch += 1
    if not symmetric and (ax1 - cx0) % 2:
        cx0 -= 1
        cw += 1
    cw += (-cw) % 4
    ch += (-ch) % 4
    if symmetric:
        cx0 = ax1 - cw // 2
    sl = (slice(cy0 * SS, (cy0 + ch) * SS), slice(cx0 * SS, (cx0 + cw) * SS))
    rgb_c = np.zeros((ch * SS, cw * SS, 3))
    a_c = np.zeros((ch * SS, cw * SS))
    # copia com recorte seguro (cy0/cx0 podem ser < 0 em teoria)
    sy0, sx0 = max(0, cy0 * SS), max(0, cx0 * SS)
    sy1, sx1 = min(a.shape[0], (cy0 + ch) * SS), min(a.shape[1], (cx0 + cw) * SS)
    ty0, tx0 = sy0 - cy0 * SS, sx0 - cx0 * SS
    rgb_c[ty0:ty0 + sy1 - sy0, tx0:tx0 + sx1 - sx0] = rgb[sy0:sy1, sx0:sx1]
    a_c[ty0:ty0 + sy1 - sy0, tx0:tx0 + sx1 - sx0] = a[sy0:sy1, sx0:sx1]
    return rgb_c, a_c, (ax1 - cx0, ay1 - cy0), (cw, ch)


def export(name, rgb, a, anchor1, size1):
    OUT.mkdir(parents=True, exist_ok=True)
    r2, a2 = reduce_premul(rgb, a, SS // 2)
    r1, a1 = reduce_premul(rgb, a, SS)
    to_img(r2, a2).save(OUT / f"{name}@2x.png", optimize=True)
    to_img(r1, a1).save(OUT / f"{name}@1x.png", optimize=True)
    size1 = [int(v) for v in size1]
    anchor1 = [int(v) for v in anchor1]
    meta = {"name": name, "size_1x": size1, "anchor_px_1x": anchor1,
            "origin": [round(anchor1[0] / size1[0], 6), round(anchor1[1] / size1[1], 6)],
            "footprint_tiles": [1, 1], "scales": [1, 2]}
    (OUT / f"{name}.json").write_text(json.dumps(meta, indent=1) + "\n")
    return meta


# ---------------------------------------------------------------- QA e pranchas
def srgb_to_L(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    Y = lin @ np.array([0.2126, 0.7152, 0.0722])
    f = np.where(Y > 216 / 24389, np.cbrt(Y), (24389 / 27 * Y + 16) / 116)
    return 116 * f - 16


def grass_bg(w, h, scale):
    tile = Image.open(ROOT / f"art/export/v32-ground/ground_grass_a@{scale}x.png").convert("RGBA")
    bg = Image.new("RGBA", (w, h), tuple(int(v) for v in tone("grama", "base")) + (255,))
    tw, th = 128 * scale, 64 * scale
    off = 4 * scale
    for j in range(-2, h // (th // 2) + 3):
        for i in range(-2, w // tw + 3):
            x = i * tw + (tw // 2 if j % 2 else 0) - off
            y = j * th // 2 - off
            _paste_clip(bg, tile, x, y)
    return bg


def _paste_clip(bg, tile, x, y):
    tmp = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    tmp.paste(tile, (x, y))
    bg.alpha_composite(tmp)


def place(canvas, sprite_png, meta, gx, gy, scale, shadow=None):
    if shadow is not None:
        sp, sm = shadow
        im = Image.open(sp).convert("RGBA")
        canvas.alpha_composite(im, (int(gx - sm["anchor_px_1x"][0] * scale),
                                    int(gy - sm["anchor_px_1x"][1] * scale)))
    im = Image.open(sprite_png).convert("RGBA")
    canvas.alpha_composite(im, (int(gx - meta["anchor_px_1x"][0] * scale),
                                int(gy - meta["anchor_px_1x"][1] * scale)))


def read_05(sprite_png, meta):
    """L5: leitura a zoom 0,5 sobre a grama (borda_dL >= 16 e indice >= 1,6)."""
    im = Image.open(sprite_png).convert("RGBA")
    w, h = im.size
    bg = grass_bg(w + 16, h + 16, 1)
    bg.alpha_composite(im, (8, 8))
    small = bg.resize(((w + 16) // 2, (h + 16) // 2), Image.LANCZOS)
    a = Image.new("L", bg.size, 0)
    a.paste(im.getchannel("A"), (8, 8))
    am = np.asarray(a.resize(small.size, Image.LANCZOS), float) / 255 > 0.5
    L = srgb_to_L(np.asarray(small.convert("RGB"), float))
    inner = am & ~(erode(am.astype(float), 1) > 0.5)
    outer = (dilate(am.astype(float), 1) > 0.5) & ~am
    Lout = np.where(outer, L, 0)
    num = box3(Lout)
    den = box3(outer)
    ok = inner & (den > 0)
    borda = float(np.mean(np.abs(L[ok] - num[ok] / den[ok])))
    core = erode(am.astype(float), 2) > 0.5
    Lm = box3(L)
    ruido = float(np.mean(np.abs(L - Lm)[core]))
    return round(borda, 2), round(borda / max(ruido, 1e-6), 2)


def boards(meta, smeta, qa):
    REV.mkdir(parents=True, exist_ok=True)
    vec = ROOT / "art/export/v32-nature/tree_oak_a"
    vmeta = json.loads((ROOT / "art/export/v32-nature/tree_oak_a.json").read_text())
    vsm = json.loads((ROOT / "art/export/v32-nature/tree_oak_a_shadow.json").read_text())
    ui = ROOT / "art/export/user-items"
    log = Image.open(ui / "resources/resource_log@2x.png").convert("RGBA")
    apple = Image.open(ui / "crops/crop_apple_tree_s3@2x.png").convert("RGBA")
    # comparativo v2: macieira do usuário (s3) x árvore folhosa nova, mesma escala (@2x),
    # sobre a grama; embaixo, as duas a zoom 0,5 (1:1) e ampliadas 3x
    Wc, Ht = 1040, 560
    can = grass_bg(Wc, Ht, 2)
    gy = 480
    can.alpha_composite(apple, (60, gy - 250))           # base de terra da macieira em gy
    place(can, OUT / f"{NAME}@2x.png", meta, 720, gy, 2,
          (OUT / f"{NAME}_shadow@2x.png", smeta))
    sc = grass_bg(520, 250, 1)
    ap1 = apple.resize((apple.width // 2, apple.height // 2), Image.LANCZOS)
    sc.alpha_composite(ap1, (30, 210 - 125))
    place(sc, OUT / f"{NAME}@1x.png", meta, 360, 210, 1, (OUT / f"{NAME}_shadow@1x.png", smeta))
    half = sc.resize((260, 125), Image.LANCZOS)
    big = half.resize((780, 375), Image.NEAREST)
    board = Image.new("RGBA", (Wc, Ht + 395), (24, 20, 14, 255))
    board.paste(can, (0, 0))
    board.paste(half, (10, Ht + 10))
    board.paste(big, (Wc - 790, Ht + 10))
    d = ImageDraw.Draw(board)
    for x, y, txt in [(150, 8, "usuario: macieira (s3) @2x"), (600, 8, "arvore folhosa v2 @2x"),
                      (10, Ht + 145, "zoom 0,5 (1:1)"), (Wc - 790, Ht + 388 - 12, "zoom 0,5 ampliado 3x")]:
        d.rectangle([x - 6, y - 2, x + 7 * len(txt) + 6, y + 14], fill=(20, 14, 8, 200))
        d.text((x, y), txt, fill=(245, 236, 210, 255))
    board.convert("RGB").save(REV / "comparativo-v2.png", optimize=True)

    # teste a zoom 0,5: cena @1x reduzida 0,5 (tamanho real) + ampliação 3x para inspeção
    sc = grass_bg(560, 300, 1)
    place(sc, f"{vec}@1x.png", vmeta, 120, 270, 1, (f"{vec}_shadow@1x.png", vsm))
    place(sc, OUT / f"{NAME}@1x.png", meta, 330, 270, 1, (OUT / f"{NAME}_shadow@1x.png", smeta))
    half = sc.resize((280, 150), Image.LANCZOS)
    big = half.resize((840, 450), Image.NEAREST)
    z = Image.new("RGBA", (840 + 280 + 30, 470), (24, 20, 14, 255))
    z.paste(half, (10, 10))
    z.paste(big, (300, 10))
    dz = ImageDraw.Draw(z)
    dz.text((10, 170), "zoom 0,5 (1:1)", fill=(245, 236, 210, 255))
    dz.text((10, 190), "esq: vetorial v32", fill=(245, 236, 210, 255))
    dz.text((10, 205), "dir: pintada nova", fill=(245, 236, 210, 255))
    dz.text((10, 230), f"L5 nova: borda_dL={qa['read_05']['borda_dL']}", fill=(245, 236, 210, 255))
    dz.text((10, 245), f"        indice={qa['read_05']['indice']}", fill=(245, 236, 210, 255))
    dz.text((300, 455 - 12), "ampliado 3x (vizinho mais proximo)", fill=(245, 236, 210, 255))
    z.convert("RGB").save(REV / "zoom-0.5.png", optimize=True)


def main():
    rgb = np.zeros((H, W, 3))
    alpha = np.zeros((H, W))
    rgb, alpha = paint_canopy_core(rgb, alpha, CANOPY, SEED + 2)
    t_rgb, trunk_a = paint_trunk(np.zeros_like(rgb), np.zeros_like(alpha))
    rgb, alpha = over(rgb, alpha, t_rgb, trunk_a)
    rgb, alpha = paint_canopy_tufts(rgb, alpha, CANOPY, SEED + 2)
    crown_mask = np.clip(alpha - trunk_a, 0, 1)
    crown_mask = (blur(crown_mask, 2) > 0.2).astype(float)
    rgb = finish(rgb, alpha, crown_mask)
    rgb, alpha = outline(rgb, alpha)
    srgb, sa, (sax, say) = cast_shadow(alpha)
    drgb, da = paint_dirt(alpha.shape)
    rgb, alpha = over(drgb, da, rgb, alpha)
    full_alpha = alpha

    rgb_c, a_c, anc, size = fit_crop(rgb, full_alpha, AX, AY)
    meta = export(NAME, rgb_c, a_c, anc, size)
    s_rgb, s_a, s_anc, s_size = fit_crop(srgb, sa, sax, say, symmetric=False)
    smeta = export(f"{NAME}_shadow", s_rgb, s_a, s_anc, s_size)

    # QA de contrato
    errs = []
    for nm, m in ((NAME, meta), (f"{NAME}_shadow", smeta)):
        for sc in (1, 2):
            im = Image.open(OUT / f"{nm}@{sc}x.png")
            ew, eh = m["size_1x"][0] * sc, m["size_1x"][1] * sc
            if im.size != (ew, eh):
                errs.append(f"{nm}@{sc}x tamanho {im.size} != {(ew, eh)}")
            a = np.asarray(im.getchannel("A"))
            if a[0].any() or a[-1].any() or a[:, 0].any() or a[:, -1].any():
                errs.append(f"{nm}@{sc}x encosta na borda")
        if m["size_1x"][0] % 4 or m["size_1x"][1] % 4:
            errs.append(f"{nm} lados não múltiplos de 4")
        if m["anchor_px_1x"][0] % 2 or m["anchor_px_1x"][1] % 2:
            errs.append(f"{nm} âncora ímpar")
    if meta["anchor_px_1x"][0] * 2 != meta["size_1x"][0]:
        errs.append("âncora x != W/2")
    a1 = np.asarray(Image.open(OUT / f"{NAME}@1x.png").getchannel("A"))
    rows = np.nonzero(a1.max(1) > 20)[0]
    height = int(meta["anchor_px_1x"][1] - rows.min())
    if not 198 <= height <= 218:
        errs.append(f"altura {height} fora de 200–215 (±2)")
    borda, indice = read_05(OUT / f"{NAME}@1x.png", meta)
    if borda < 16 or indice < 1.6:
        errs.append(f"L5 falhou: borda_dL={borda} indice={indice}")
    qa = {"sprite": meta, "shadow": smeta, "height_px_1x": height,
          "read_05": {"borda_dL": borda, "indice": indice}, "errors": errs}
    boards(meta, smeta, qa)
    (REV / "qa.json").write_text(json.dumps(qa, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(qa, indent=1, ensure_ascii=False))
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
