"""Deriva árvores do mundo a partir da macieira do usuário (user_owned).

tree_leafy_a = macieira s3 sem as maçãs (frutos substituídos por folhagem da própria copa).
Uso: python3 art/source/tools/derive_trees_from_user.py
"""
import json, pathlib, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / "art/export/user-items/crops/crop_apple_tree_s3@2x.png"
OUT = ROOT / "art/export/world-painted"


def apple_mask(a):
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    red = (r > 150) & (g < 95) & (b < 95) & (al > 0)
    red[180:, :] = False  # só a copa (tronco e terra têm tons avermelhados)
    # desloca a máscara para cima para cobrir cabinho e folhinha, e arredonda com blur
    up = np.zeros_like(red)
    for k in range(0, 26, 2):
        up[:-k or None, :] |= red[k:, :]
    m = Image.fromarray((up * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(7))
    return np.array(m) > 40


def components(mask):
    from collections import deque
    seen = np.zeros_like(mask, bool); out = []
    H, W = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for ny, nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        ys, xs = zip(*pts); out.append((min(ys), max(ys)+1, min(xs), max(xs)+1))
    return out


def main():
    im = Image.open(SRC).convert("RGBA"); a = np.array(im)
    mask = apple_mask(a)
    canopy = (a[..., 3] > 250) & ~mask
    res = a.copy().astype(float)
    H, W = mask.shape
    rng = np.random.default_rng(7)
    R = 13  # raio do tufo copiado
    yy, xx = np.mgrid[-R:R+1, -R:R+1]
    disk = np.clip(1.0 - (np.sqrt(yy**2 + xx**2) / R) ** 3, 0, 1)[..., None]
    # fontes: centros cuja janela é toda copa, fora das maçãs
    full = np.array(Image.fromarray((~canopy*255).astype("uint8")).filter(ImageFilter.MaxFilter(2*R+1))) == 0
    src_ys, src_xs = np.nonzero(full)
    targets = [(y, x) for y in range(0, H, 6) for x in range(0, W, 6) if mask[y, x]]
    for _ in range(3):  # três passadas para cobrir bem
        rng.shuffle(targets)
        for ty, tx in targets:
            if ty < R or tx < R or ty+R >= H or tx+R >= W: continue
            # fonte com altura parecida (mesma luz), lado aleatório
            near = np.nonzero(np.abs(src_ys - (ty + rng.integers(-10, 11))) < 12)[0]
            if not len(near): continue
            k = near[rng.integers(len(near))]; sy, sx = src_ys[k], src_xs[k]
            patch = a[sy-R:sy+R+1, sx-R:sx+R+1].astype(float)
            region = res[ty-R:ty+R+1, tx-R:tx+R+1]
            m = disk * mask[ty-R:ty+R+1, tx-R:tx+R+1, None].astype(float)
            m = np.maximum(m, disk*0.0)
            res[ty-R:ty+R+1, tx-R:tx+R+1, :3] = region[..., :3]*(1-m) + patch[..., :3]*m
    # casa a luz do preenchimento com o anel de folhagem em volta e suaviza a borda
    ring = (np.array(Image.fromarray((mask*255).astype("uint8")).filter(ImageFilter.MaxFilter(17))) > 0) & ~mask & canopy
    if ring.any():
        diff = a[ring][:, :3].astype(float).mean(0) - res[mask][:, :3].mean(0)
        res[mask, :3] = np.clip(res[mask, :3] + diff, 0, 255)
    soft = np.array(Image.fromarray((mask*255).astype("uint8")).filter(ImageFilter.GaussianBlur(4))) / 255.0
    soft = soft[..., None]
    res[..., :3] = a[..., :3]*(1-soft) + res[..., :3]*soft
    res = res.astype("uint8")
    # mantém o alfa original da silhueta
    res[..., 3] = a[..., 3]
    OUT.mkdir(parents=True, exist_ok=True)
    out2 = Image.fromarray(res)
    out2.save(OUT / "tree_leafy_a@2x.png")
    out2.resize((W//2, H//2), Image.LANCZOS).save(OUT / "tree_leafy_a@1x.png")
    meta = json.loads((SRC.with_name("crop_apple_tree_s3.json")).read_text())
    meta.update({"id": "tree_leafy_a", "derived_from": "crop_apple_tree_s3 (user_owned)",
                 "method": "macieira do usuário com maçãs trocadas por folhagem da própria copa"})
    (OUT / "tree_leafy_a.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    for old in ("tree_leafy_a_shadow@1x.png", "tree_leafy_a_shadow@2x.png"):
        (OUT / old).unlink(missing_ok=True)
    print("ok", W, H)

main()
