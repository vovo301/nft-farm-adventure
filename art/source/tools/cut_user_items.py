#!/usr/bin/env python3
"""Recorte dos itens enviados pelo usuário (2026-11-22) -> PNG com fundo transparente.

Origem: art/source/user-provided/2026-11-22/*.webp (arte do usuário, uso autorizado; ver
PROVENIENCIA.md). Fundo escuro opaco quase uniforme (ruído ~1,3/255).

Método (determinístico, sem IA):
  1. Fundo B(x, y): mediana global -> máscara de fundo -> média local (janela 121 px) só dos
     pixels de fundo. Segue vinhetas e os painéis levemente mais claros de recursos.webp.
  2. Máscara sólida: pixel mais claro que B (luminância) ou com cor diferente de B; fechamento
     morfológico, buracos preenchidos (flood fill a partir da borda da célula) e 1 px de
     dilatação para manter o contorno escuro da própria arte.
  3. Brilho e partículas: alfa por "unmultiply" sobre o fundo conhecido,
     a = max_c (C - B) / (255 - B), com piso de ruído. Só perto do item (raio 70 px @2x).
  4. Alfa final = max(sólido suavizado, brilho). Cor descontaminada: F = (C - (1 - a)·B) / a,
     o que tira o halo escuro das bordas e mantém o brilho como alfa suave.
  5. Sombras projetadas do fundo (mais escuras que B) são descartadas: no jogo a sombra é
     arquivo separado.
  6. Células: colunas e linhas achadas pela projeção da máscara; cada item vai para um canvas
     fixo por família, @2x = resolução original (sem reamostrar), @1x = metade (LANCZOS).
     Culturas: base do monte de terra alinhada (âncora base-centro). Demais: centro.

    python3 art/source/tools/cut_user_items.py     # sai 0 se o QA passar

Saída: art/export/user-items/{resources,tools,crops}/<nome>@2x.png, @1x.png, <nome>.json
       art/review/2026-11-22-itens-usuario-recortados/ (pranchas claro/escuro, qa.json)
       art/manifest.json (status in_review, source.kind = user_owned)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ART = Path(__file__).resolve().parents[1].parent
ROOT = ART.parent
SRC = ART / "source" / "user-provided" / "2026-11-22"
OUT = ART / "export" / "user-items"
BATCH = "2026-11-22-itens-usuario-recortados"
REV = ART / "review" / BATCH
REPORT = ROOT / ".claude" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"

STAGES = ("s0", "s1", "s2", "s3")
SHEETS = {
    "recursos.webp": dict(family="resources", grid=(4, 2), names=[
        "resource_stone", "resource_ore_gray", "resource_ore_gold", "resource_crystal_blue",
        "resource_crystal_purple", "resource_crystal_green", "resource_log"]),
    "ferramentas.webp": dict(family="tools", grid=(3, 3), names=[
        "tool_shovel", "tool_axe", "tool_pickaxe_iron", "tool_pickaxe_iron_reinforced", "tool_pickaxe_gold",
        "tool_pickaxe_crystal", "tool_drill", "tool_fishing_rod", "tool_rake"]),
    "culturas-a.webp": dict(family="crops", grid=(4, 5), crops=["rice", "pea", "grape", "apple_tree", "mushroom"]),
    "culturas-b.webp": dict(family="crops", grid=(4, 6), crops=["eggplant", "chili_pepper", "bell_pepper", "strawberry",
                                                                 "watermelon", "sunflower"]),
    "culturas-c.webp": dict(family="crops", grid=(4, 6), crops=["beet", "cabbage", "lettuce", "onion", "garlic", "cucumber"]),
    "culturas-d.webp": dict(family="crops", grid=(4, 6), crops=["carrot", "pumpkin", "tomato", "corn", "wheat", "potato"]),
}
LABEL_PT = {"rice": "arroz (espigas pendentes; o PROVENIENCIA.md diz trigo/arroz)", "wheat": "trigo",
            "carrot": "cenoura", "pumpkin": "abóbora", "tomato": "tomate", "corn": "milho", "potato": "batata", "pea": "ervilha", "grape": "uva", "apple_tree": "macieira",
            "mushroom": "cogumelo (brilho)", "eggplant": "berinjela", "chili_pepper": "pimenta", "bell_pepper": "pimentão",
            "strawberry": "morango", "watermelon": "melancia", "sunflower": "girassol", "beet": "beterraba",
            "cabbage": "repolho", "lettuce": "alface", "onion": "cebola", "garlic": "alho", "cucumber": "pepino"}
STAGE_PT = {"s0": "semente", "s1": "broto", "s2": "crescendo", "s3": "madura"}

BG_WIN = 60          # meia-janela da média local do fundo (px)
GLOW_R = 70          # raio de busca do brilho em volta do item (px @2x)
NOISE = 0.022        # piso de ruído do alfa por unmultiply


def box_mean(a: np.ndarray, r: int) -> np.ndarray:
    """Média em janela (2r+1)² por imagem integral (a: HxW)."""
    p = np.pad(a, ((r + 1, r), (r + 1, r)), mode="edge").cumsum(0).cumsum(1)
    k = 2 * r + 1
    return (p[k:, k:] - p[:-k, k:] - p[k:, :-k] + p[:-k, :-k]) / (k * k)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def mfilter(mask: np.ndarray, size: int, kind: str) -> np.ndarray:
    im = Image.fromarray((mask * 255).astype(np.uint8))
    f = ImageFilter.MaxFilter(size) if kind == "max" else ImageFilter.MinFilter(size)
    return np.asarray(im.filter(f)) > 127


def estimate_bg(img: np.ndarray) -> np.ndarray:
    med = np.median(img.reshape(-1, 3), 0)
    fg = np.abs(img - med).max(-1) > 10
    fg = mfilter(fg, 31, "max")
    bgm = (~fg).astype(float)
    den = box_mean(bgm, BG_WIN)
    B = np.stack([box_mean(img[..., c] * bgm, BG_WIN) for c in range(3)], -1)
    with np.errstate(invalid="ignore", divide="ignore"):
        B = np.where(den[..., None] > 0.05, B / den[..., None], med)
    return B


def grad_mag(L: np.ndarray) -> np.ndarray:
    gx = np.zeros_like(L); gy = np.zeros_like(L)
    gx[:, 1:-1] = (L[:, 2:] - L[:, :-2]) / 2
    gy[1:-1, :] = (L[2:, :] - L[:-2, :]) / 2
    return np.hypot(gx, gy)


def candidate_mask(img, B):
    """Tudo que difere do fundo (inclui brilho)."""
    dl = lum(img) - lum(B)
    dc = np.abs((img - img.mean(-1, keepdims=True)) - (B - B.mean(-1, keepdims=True))).max(-1)
    m = (dl > 11) | (dc > 12)
    m = mfilter(m, 3, "min")
    return mfilter(m, 3, "max")


def solid_mask(img, B):
    """Objeto sólido = regiões delimitadas por BORDA NÍTIDA. O brilho cai devagar (gradiente baixo),
    então fica de fora e vira alfa suave depois."""
    L = lum(img)
    Ls = np.asarray(Image.fromarray(L.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)
    E = grad_mag(Ls) > 9
    cand = candidate_mask(img, B)
    E &= mfilter(cand, 5, "max")
    E = mfilter(mfilter(E, 5, "max"), 5, "min")            # fecha falhas da borda
    dl = L - lum(B)
    m1 = box_mean(Ls, 3)
    std = np.sqrt(np.maximum(box_mean(Ls * Ls, 3) - m1 * m1, 0))
    textured = cand & (std > 3.2) & (dl > 3)            # terra, folhas, madeira: textura; brilho liso e sombra (mais escura) ficam fora
    textured = mfilter(mfilter(textured, 5, "max"), 5, "min") & cand & (dl > 0)
    return E | textured | (cand & (dl > 70))


def label_fill(m: np.ndarray, C: np.ndarray, Bc: np.ndarray) -> np.ndarray:
    """Preenche buracos da máscara com cor de objeto (miolo liso, lado escuro colorido);
    buracos com cor de fundo ou só halo fraco (vão entre folhas/espigas) continuam transparentes."""
    im = Image.fromarray(np.pad(m, 1).astype(np.uint8) * 255).copy()   # copy(): fromarray não aceita escrita
    ImageDraw.floodfill(im, (0, 0), 128)
    a = np.array(im)[1:-1, 1:-1]
    holes = a == 0
    big = mfilter(mfilter(holes, 7, "min"), 7, "max") & holes       # buracos que sobrevivem a uma abertura 7x7
    out = m | (holes & ~big)                                         # buracos pequenos: preenche
    big = mfilter(big, 3, "max") & holes
    dlh = lum(C) - lum(Bc)
    dch = np.abs((C - C.mean(-1, keepdims=True)) - (Bc - Bc.mean(-1, keepdims=True))).max(-1)
    lab = Image.fromarray(big.astype(np.uint8) * 255).copy()
    while True:
        ys, xs = np.nonzero(np.asarray(lab) == 255)
        if len(ys) == 0:
            break
        ImageDraw.floodfill(lab, (int(xs[0]), int(ys[0])), 100)
        h = np.asarray(lab) == 100
        if h.sum() < 60 or np.median(dlh[h]) > 12 or np.median(dch[h]) > 18:
            out |= h
        lab = Image.fromarray(np.where(h, 0, np.asarray(lab)).astype(np.uint8)).copy()
    return out


def runs(profile, min_gap, min_len):
    on = profile > 0
    out, start, gap = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None:
                start = i
            gap, last = 0, i
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, last))
                start = None
    if start is not None:
        out.append((start, last))
    return [r for r in out if r[1] - r[0] >= min_len]


def cells_for(m: np.ndarray, grid):
    """Limites das células pela projeção da máscara. Colunas: vãos verticais. Linhas: projeção
    POR COLUNA (itens altos de uma coluna não juntam as linhas das outras); a coluna que não
    separar usa os limites medianos das colunas que separaram."""
    cols, rows = grid
    H, W = m.shape
    xs = runs(m.sum(0), 25, 30)
    assert len(xs) == cols, f"colunas: esperava {cols}, achei {len(xs)}"
    xb = [0] + [(xs[i][1] + xs[i + 1][0]) // 2 for i in range(cols - 1)] + [W]
    per_col = {}
    for c in range(cols):
        for mm, gap in ((m, 8), (m, 3), (mfilter(m, 5, "min"), 4)):
            ys = runs(mm[:, xb[c]:xb[c + 1]].sum(1), gap, 20)
            if len(ys) == rows:
                per_col[c] = [0] + [(ys[i][1] + ys[i + 1][0]) // 2 for i in range(rows - 1)] + [H]
                break
    assert per_col, "nenhuma coluna separou as linhas"
    med = [int(np.median([v[i] for v in per_col.values()])) for i in range(rows + 1)]
    out = []
    for r in range(rows):
        for c in range(cols):
            yb = per_col.get(c, med)
            out.append((xb[c], yb[r], xb[c + 1], yb[r + 1]))
    return out


def main_component(s: np.ndarray) -> np.ndarray:
    """Fica só o item principal: o maior componente (após juntar vizinhos a 4 px) e partículas
    pequenas (< 400 px) longe da borda da célula. Corta pedaços do item da célula vizinha."""
    grown = mfilter(s, 9, "max")
    lab = Image.fromarray(grown.astype(np.uint8) * 255).copy()
    comps = []
    while True:
        ys, xs = np.nonzero(np.asarray(lab) == 255)
        if len(ys) == 0:
            break
        ImageDraw.floodfill(lab, (int(xs[0]), int(ys[0])), 100)
        h = np.asarray(lab) == 100
        comps.append(h & s)
        lab = Image.fromarray(np.where(h, 0, np.asarray(lab)).astype(np.uint8)).copy()
    comps.sort(key=lambda c: -c.sum())
    out = comps[0].copy()
    H, W = s.shape
    for c in comps[1:]:
        ys, xs = np.nonzero(c)
        touches = ys.min() < 3 or ys.max() > H - 4 or xs.min() < 3 or xs.max() > W - 4
        if c.sum() < 400 and not touches:
            out |= c
    return out


# Limiar de "sólido" (diferença de luminância do fundo) por item. Padrão 11. Itens com BRILHO
# usam limiar mais alto para o halo não virar parte opaca; o halo sai como alfa suave (unmultiply).
GLOW_T = {"resource_crystal_blue": 62, "resource_crystal_purple": 62, "resource_crystal_green": 62,
          "resource_ore_gold": 22, "tool_pickaxe_crystal": 34, "tool_pickaxe_gold": 26, "tool_axe": 16}
SOIL_BAND = ("crop_mushroom_",)
# Ajuste por item: fechamento largo para lado de sombra muito escuro e liso (lido como fundo).
CLOSE_FILL = {"crop_beet_s3": (41, "chroma"), "resource_stone": (61, "value"), "resource_ore_gray": (25, "value"),
              "resource_log": (41, "value")}   # brilho + monte de terra escuro: terra (faixa de baixo) usa o limiar padrão


def cell_solid(C, Bc, name):
    """Objeto = o que NÃO é alcançado por um preenchimento a partir da borda da célula, andando só
    por pixels lisos (gradiente baixo: fundo, brilho, sombra suave). Bordas nítidas e o contorno
    escuro da arte bloqueiam. Vãos internos lisos com cor de brilho/fundo voltam a ser
    transparentes (o brilho sai como alfa suave depois)."""
    L = lum(C)
    Ls = np.asarray(Image.fromarray(L.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(float)
    g = grad_mag(Ls)
    dl = L - lum(Bc)
    dch = np.abs((C - C.mean(-1, keepdims=True)) - (Bc - Bc.mean(-1, keepdims=True))).max(-1)
    T = GLOW_T.get(name, 11)
    passable = (g < 6.0) & (dl < max(T, 46 if name.startswith(SOIL_BAND) else T) + 30)
    if not (name in GLOW_T or name.startswith(SOIL_BAND)):
        passable &= (dch < 16) | (dl < 6)                          # superfície colorida lisa (fruto, raiz) bloqueia
    passable |= (np.abs(dl) < 5) & (dch < 8)                      # fundo puro, mesmo com ruído
    im = Image.fromarray(np.pad(passable, 2, constant_values=True).astype(np.uint8) * 255).copy()
    ImageDraw.floodfill(im, (0, 0), 128)
    ext = np.asarray(im)[2:-2, 2:-2] == 128
    m = ~ext
    glowish = passable & (dl <= 14) & (dch <= 18)                  # vãos lisos internos com cor de halo
    m &= ~glowish
    if name in CLOSE_FILL:
        k, mode = CLOSE_FILL[name]
        mc = mfilter(mfilter(m, k, "max"), k, "min")
        m |= mc & (((dch > 16) & (dl > -2)) if mode == "chroma" else (dl > 5))
    m = mfilter(m, 3, "min")
    m = mfilter(mfilter(m, 3, "max"), 3, "max")
    m = mfilter(m, 3, "min")
    return m


def drop_edge_pieces(s):
    """Tira pedaços do item da célula vizinha: componentes (após erosão 5x5) que tocam o topo ou a
    base da célula e não são o maior. Linhas finas (fio da vara) não somem: só sai a vizinhança
    de 4 px desses componentes."""
    er = mfilter(s, 5, "min")
    lab = Image.fromarray(er.astype(np.uint8) * 255).copy()
    comps = []
    while True:
        ys, xs = np.nonzero(np.asarray(lab) == 255)
        if len(ys) == 0:
            break
        ImageDraw.floodfill(lab, (int(xs[0]), int(ys[0])), 100)
        h = np.asarray(lab) == 100
        comps.append(h)
        lab = Image.fromarray(np.where(h, 0, np.asarray(lab)).astype(np.uint8)).copy()
    if len(comps) < 2:
        return s
    comps.sort(key=lambda c: -c.sum())
    H = s.shape[0]
    out = s.copy()
    for c in comps[1:]:
        ys = np.nonzero(c)[0]
        if ys.min() < 4 or ys.max() > H - 5:
            out &= ~mfilter(c, 9, "max")
    return out


def cut_cell(img, B, solid, box, name=""):
    x0, y0, x1, y1 = box
    C, Bc = img[y0:y1, x0:x1], B[y0:y1, x0:x1]
    if solid[y0:y1, x0:x1].sum() < 2000:
        return None
    s_all = label_fill(cell_solid(C, Bc, name), C, Bc)
    s = main_component(drop_edge_pieces(s_all))
    near = mfilter(mfilter(s, GLOW_R + 1, "max"), GLOW_R + 1, "max")
    near = np.asarray(Image.fromarray((near * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))) / 255.0
    brighter = lum(C) > lum(Bc) + 3                                   # sombra quente (mais escura) não vira alfa
    glow = ((C - Bc) / np.maximum(255 - Bc, 1)).max(-1) * brighter
    glow = np.clip((glow - NOISE) / (1 - NOISE), 0, 1) * near
    other = s_all & ~mfilter(s, 15, "max")                           # pedaço da peça vizinha
    glow = glow * ~mfilter(other, 25, "max")
    sd = mfilter(s, 5, "max")                                        # +2 px: contorno escuro da arte
    sa = np.asarray(Image.fromarray((sd * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))) / 255.0
    darker = (lum(C) < lum(Bc) - 6).astype(float)                    # anel só onde é contorno de verdade
    sa = np.where(s, 1.0, sa * darker)
    a = np.maximum(sa, glow)
    with np.errstate(invalid="ignore", divide="ignore"):
        F = (C - (1 - a[..., None]) * Bc) / np.maximum(a[..., None], 1e-3)
    F = np.where(a[..., None] >= 0.999, C, np.clip(F, 0, 255))
    rgba = np.dstack([F, a * 255]).round().clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(a > 0.02)
    bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    sy, sx = np.nonzero(s)
    solid_bb = (sx.min(), sy.min(), sx.max() + 1, sy.max() + 1)
    return Image.fromarray(rgba, "RGBA"), bb, solid_bb


def items():
    out = []
    for fname, spec in SHEETS.items():
        img = np.asarray(Image.open(SRC / fname).convert("RGB")).astype(float)
        B = estimate_bg(img)
        solid = solid_mask(img, B)
        cells = cells_for(solid, spec["grid"])
        if spec["family"] == "crops":
            names = [f"crop_{c}_{s}" for c in spec["crops"] for s in STAGES]
        else:
            names = spec["names"]
        k = 0
        for box in cells:
            r = cut_cell(img, B, solid, box, names[k] if k < len(names) else "")
            if r is None:
                continue
            im, bb, sbb = r
            out.append(dict(name=names[k], family=spec["family"], src=fname, cell=box, img=im, bb=bb, solid_bb=sbb))
            k += 1
        assert k == len(names), f"{fname}: {k} itens recortados, esperava {len(names)}"
    return out


def ceil4(v):
    return int(-(-v // 4) * 4)


CROP_BASE = 12


def place_all(its):
    """Canvas fixo por família (@2x): o maior item + margem. Culturas: base alinhada."""
    global CROP_BASE
    canv = {}
    for fam in ("resources", "tools"):
        fi = [i for i in its if i["family"] == fam]
        w = max(i["bb"][2] - i["bb"][0] for i in fi)
        h = max(i["bb"][3] - i["bb"][1] for i in fi)
        side = ceil4(max(w, h) + 16)
        canv[fam] = (side, side)
    fi = [i for i in its if i["family"] == "crops"]      # extensões medidas a partir da âncora
    half = max(max((i["solid_bb"][0] + i["solid_bb"][2]) / 2 - i["bb"][0], i["bb"][2] - (i["solid_bb"][0] + i["solid_bb"][2]) / 2)
               for i in fi)
    up = max(i["solid_bb"][3] - i["bb"][1] for i in fi)
    down = max(i["bb"][3] - i["solid_bb"][3] for i in fi)
    CROP_BASE = ceil4(down + 8)
    canv["crops"] = (ceil4(2 * half + 16), ceil4(up + 8 + CROP_BASE))
    for i in its:
        W, H = canv[i["family"]]
        x0, y0, x1, y1 = i["bb"]
        crop = i["img"].crop((x0, y0, x1, y1))
        cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if i["family"] == "crops":                    # base do sólido (monte de terra) em H - 12
            base = i["solid_bb"][3]
            cxs = (i["solid_bb"][0] + i["solid_bb"][2]) / 2
            px, py = round(W / 2 - (cxs - x0)), round(H - CROP_BASE - (base - y0))
            anchor = (W // 2, H - CROP_BASE)
        else:
            px, py = round((W - (x1 - x0)) / 2), round((H - (y1 - y0)) / 2)
            anchor = (W // 2, H // 2)
        px = max(0, min(W - (x1 - x0), px))
        py = max(0, min(H - (y1 - y0), py))
        cv.alpha_composite(crop, (px, py))
        i.update(canvas=cv, anchor2=anchor, size2=(W, H),
                 src_box=[int(i["cell"][0] + x0), int(i["cell"][1] + y0), int(i["cell"][0] + x1), int(i["cell"][1] + y1)])


def export(its):
    for i in its:
        d = OUT / i["family"]
        d.mkdir(parents=True, exist_ok=True)
        W, H = i["size2"]
        i["canvas"].save(d / f"{i['name']}@2x.png")
        half = premult_resize(i["canvas"], (W // 2, H // 2))
        half.save(d / f"{i['name']}@1x.png")
        ax, ay = i["anchor2"]
        meta = {"name": i["name"], "size_1x": [W // 2, H // 2], "anchor_px_1x": [ax / 2, ay / 2],
                "origin": [round(ax / W, 6), round(ay / H, 6)], "scales": [1, 2],
                "anchor": "base-centro (base do monte de terra)" if i["family"] == "crops" else "centro",
                "source_file": f"art/source/user-provided/2026-11-22/{i['src']}", "source_box_px": i["src_box"]}
        (d / f"{i['name']}.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def premult_resize(im, size):
    """Reduz em alfa pré-multiplicado (sem franja escura nas bordas suaves)."""
    a = np.asarray(im).astype(float) / 255
    pm = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3]])
    r = np.dstack([np.asarray(Image.fromarray((pm[..., c] * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(float) / 255
                   for c in range(4)])
    al = r[..., 3:4]
    rgb = np.where(al > 1e-3, r[..., :3] / np.maximum(al, 1e-3), 0)
    return Image.fromarray(np.dstack([rgb.clip(0, 1), al.clip(0, 1)]).__mul__(255).round().astype(np.uint8), "RGBA")


# --------------------------------------------------------------------------- QA e pranchas
def qa(its):
    res = {"items": len(its), "halo": [], "asset_report": []}
    groups = {}
    for i in its:
        W, H = i["size2"]
        for s, (w, h) in ((2, (W, H)), (1, (W // 2, H // 2))):
            groups.setdefault(f"{w}x{h}", []).append(str(OUT / i["family"] / f"{i['name']}@{s}x.png"))
        # halo escuro: média de luminância do anel de borda (alfa 0,1–0,6) vs miolo, ponderada
        a = np.asarray(i["canvas"]).astype(float)
        al = a[..., 3] / 255
        ring = (al > 0.1) & (al < 0.6)
        if ring.sum() > 50:
            l_ring = lum(a[..., :3])[ring].mean()
            res["halo"].append({"name": i["name"], "ring_lum": round(float(l_ring), 1)})
        # nada encostando na borda do canvas
        edge = max(al[0].max(), al[-1].max(), al[:, 0].max(), al[:, -1].max())
        if edge > 0.02:
            res.setdefault("touching_edge", []).append(i["name"])
    for size, files in sorted(groups.items()):
        r = subprocess.run([sys.executable, str(REPORT), *files, "--expect-size", size, "--require-alpha", "--json"],
                           capture_output=True, text=True)
        res["asset_report"].append({"size": size, "files": len(files), "exit": r.returncode})
    res["darkest_ring"] = sorted(res["halo"], key=lambda x: x["ring_lum"])[:5]
    res["pass"] = all(r["exit"] == 0 for r in res["asset_report"]) and not res.get("touching_edge")
    return res


def font(sz, bold=False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(p, sz) if Path(p).exists() else ImageFont.load_default()


def sheet(its, family, bg, title, scale=1):
    fi = [i for i in its if i["family"] == family]
    cols = 4 if family == "crops" else (4 if family == "resources" else 3)
    if family == "crops":
        cols = 8
    cw, ch = fi[0]["size2"][0] // (3 - scale) + 16, fi[0]["size2"][1] // (3 - scale) + 34
    rows = -(-len(fi) // cols)
    W, H = cols * cw + 20, rows * ch + 70
    im = Image.new("RGBA", (W, H), bg)
    dr = ImageDraw.Draw(im)
    ink = (30, 30, 30, 255) if sum(bg[:3]) > 380 else (225, 225, 225, 255)
    dr.text((10, 12), title, fill=ink, font=font(18, True))
    for k, i in enumerate(fi):
        x, y = 10 + (k % cols) * cw, 50 + (k // cols) * ch
        sp = OUT / family / f"{i['name']}@{scale}x.png"
        p = Image.open(sp)
        im.alpha_composite(p, (x + 8, y))
        dr.text((x + 8, y + p.height + 4), i["name"].replace("crop_", ""), fill=ink, font=font(11))
    return im


def boards(its):
    REV.mkdir(parents=True, exist_ok=True)
    out = []
    for fam, pt in (("resources", "recursos"), ("tools", "ferramentas"), ("crops", "culturas")):
        for bg, nm in (((236, 233, 226, 255), "claro"), ((40, 44, 38, 255), "escuro"), ((122, 150, 92, 255), "grama")):
            sc = 1
            p = REV / f"prancha-{pt}-{nm}.png"
            sheet(its, fam, bg, f"{BATCH} · {pt} @1x sobre fundo {nm} (recorte com alfa)", sc).convert("RGB").save(p)
            out.append(p)
    # zoom de borda @2x: 4 itens críticos (brilho, partículas, folhas finas) sobre branco e preto
    crit = ["resource_crystal_blue", "tool_pickaxe_crystal", "crop_mushroom_s3", "crop_rice_s3", "crop_wheat_s3"]
    tiles = []
    for n in crit:
        i = next(x for x in its if x["name"] == n)
        for bg in ((255, 255, 255, 255), (0, 0, 0, 255), (196, 64, 160, 255)):
            t = Image.new("RGBA", i["canvas"].size, bg)
            t.alpha_composite(i["canvas"])
            tiles.append(t.resize((260, round(260 * t.height / t.width)), Image.LANCZOS))
    W = 3 * 270 + 10
    H = sum(tiles[k].height + 10 for k in range(0, len(tiles), 3)) + 50
    z = Image.new("RGB", (W, H), (200, 200, 200))
    ImageDraw.Draw(z).text((10, 12), "Borda @2x sobre branco, preto e magenta (halo apareceria como franja)", fill=(20, 20, 20), font=font(16, True))
    y = 44
    for k in range(0, len(tiles), 3):
        for j in range(3):
            z.paste(tiles[k + j].convert("RGB"), (10 + j * 270, y))
        y += tiles[k].height + 10
    z.save(REV / "prancha-bordas-2x.png")
    out.append(REV / "prancha-bordas-2x.png")
    return out


def update_manifest(its, ok):
    mp = ART / "manifest.json"
    man = json.loads(mp.read_text(encoding="utf-8"))
    man["assets"] = [e for e in man["assets"] if e.get("batch") != BATCH]
    for i in its:
        W, H = i["size2"]
        rel = f"art/export/user-items/{i['family']}/{i['name']}"
        if i["family"] == "crops":
            crop, st = i["name"][5:].rsplit("_", 1)
            role = f"cultura {LABEL_PT[crop]}, estágio {st} ({STAGE_PT[st]})"
        else:
            role = {"resources": "recurso", "tools": "ferramenta"}[i["family"]] + " (ícone/sprite do usuário)"
        man["assets"].append({
            "id": i["name"], "batch": BATCH, "role": role,
            "path": rel + "@1x.png", "files": [rel + "@1x.png", rel + "@2x.png", rel + ".json"],
            "source_path": f"art/source/user-provided/2026-11-22/{i['src']}",
            "status": "in_review", "variants": [],
            "technical": {"dimensions": f"{W // 2}x{H // 2}", "dimensions_2x": f"{W}x{H}", "alpha": True,
                          "anchor": "base-centro" if i["family"] == "crops" else "centro",
                          "anchor_px_1x": [i["anchor2"][0] / 2, i["anchor2"][1] / 2], "filtering": "linear",
                          "max_colors": None, "palette": "livre (arte do usuário; referência da paleta v3, rampas 'ilustrado')"},
            "visual_locks": ["user-art"],
            "source": {"kind": "user_owned", "url_or_tool": "art/source/tools/cut_user_items.py (recorte determinístico)",
                       "creator": "usuário (dono do projeto)", "created_at": "2026-11-22",
                       "license": "do usuário; uso no jogo autorizado (art/source/user-provided/2026-11-22/PROVENIENCIA.md)",
                       "attribution": "",
                       "prompt_or_source_record": f"recorte de {i['src']}, caixa {i['src_box']} (x0, y0, x1, y1 em px do original); "
                                                  "fundo removido por unmultiply sobre fundo estimado"},
            "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False,
                             "technical_checks_passed": ok, "approved_by": ""},
            "review": f"art/review/{BATCH}/",
            "notes": "nome descreve o que a imagem mostra; mapeamento para ids do jogo fica para depois",
        })
    man["support_files"] = [s for s in man.get("support_files", []) if s.get("batch") != BATCH]
    man["support_files"].append({"path": f"art/review/{BATCH}/", "role": "pranchas de conferência do recorte (claro, escuro, "
                                 "grama, bordas @2x) + qa.json + notas.md", "status": "in_review", "batch": BATCH})
    mp.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    its = items()
    place_all(its)
    export(its)
    res = qa(its)
    boards(its)
    res["families"] = {f: {"count": sum(1 for i in its if i["family"] == f),
                           "canvas_1x": [s // 2 for s in next(i["size2"] for i in its if i["family"] == f)]}
                       for f in ("resources", "tools", "crops")}
    REV.mkdir(parents=True, exist_ok=True)
    (REV / "qa.json").write_text(json.dumps(res, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    update_manifest(its, res["pass"])
    print(json.dumps({k: v for k, v in res.items() if k != "halo"}, ensure_ascii=False, indent=1))
    return 0 if res["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
