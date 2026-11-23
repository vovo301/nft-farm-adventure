#!/usr/bin/env python3
"""Amplia a paleta v3 com rampas tiradas da arte do usuário (2026-11-22), de forma reproduzível.

Para cada material: pixels opacos (alfa > 0,95) dos recortes indicados, filtrados por matiz e
saturação; ordenados por luminância; 5 faixas (0–15, 15–35, 35–60, 60–85, 85–99 %) e a mediana
de cada faixa vira deep, shadow, base, light, highlight. O contorno das peças vem dos pixels
opacos a até 3 px da borda do alfa (os 30 % mais escuros).

    python3 art/source/tools/extract_palette_v3.py     # depois de cut_user_items.py

Atualiza art/style-guide/palette.json (rampas com "origin": "user_art"); as rampas do estilo C
ficam como estão.
"""
from __future__ import annotations

import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ART = Path(__file__).resolve().parents[2]
ITEMS = ART / "export" / "user-items"
PAL = ART / "style-guide" / "palette.json"
TONES = ("deep", "shadow", "base", "light", "highlight")
BANDS = ((0, 15), (15, 35), (35, 60), (60, 85), (85, 99))

# nome: (uso, [arquivos], (matiz mín, matiz máx em graus), sat mín, sat máx)
MATERIALS = {
    "folha_viva": ("folhas das culturas (verde vivo)", ["crops/crop_pea_s2", "crops/crop_bell_pepper_s2", "crops/crop_cucumber_s2",
                                                       "crops/crop_tomato_s2", "crops/crop_strawberry_s2"], (70, 150), 0.30, 1.0),
    "terra_monte": ("monte de terra das culturas", ["crops/crop_pea_s0", "crops/crop_beet_s0", "crops/crop_carrot_s0",
                                                    "crops/crop_onion_s0"], (5, 45), 0.20, 0.70),
    "fruta_viva": ("frutos vermelhos (tomate, morango, pimenta, maçã)", ["crops/crop_tomato_s3", "crops/crop_strawberry_s3",
                                                                        "crops/crop_chili_pepper_s3"], (-14, 12), 0.45, 1.0),
    "laranja_viva": ("cenoura, abóbora", ["crops/crop_carrot_s3", "crops/crop_pumpkin_s3"], (14, 38), 0.50, 1.0),
    "amarelo_vivo": ("girassol, milho", ["crops/crop_sunflower_s3", "crops/crop_corn_s3"], (40, 60), 0.45, 1.0),
    "roxo_vivo": ("berinjela, uva", ["crops/crop_eggplant_s3", "crops/crop_grape_s3"], (255, 320), 0.25, 1.0),
    "ouro": ("ouro: minério, ferramenta de ouro", ["resources/resource_ore_gold", "tools/tool_pickaxe_gold"], (30, 56), 0.40, 1.0),
    "aco": ("metal das ferramentas", ["tools/tool_shovel", "tools/tool_pickaxe_iron", "tools/tool_drill"], (0, 360), 0.0, 0.14),
    "cabo_madeira": ("cabos de madeira, tora", ["tools/tool_shovel", "tools/tool_rake", "resources/resource_log"], (12, 38), 0.30, 0.80),
    "pedra_ilustrada": ("pedra e minério cinza (itens)", ["resources/resource_stone", "resources/resource_ore_gray"], (0, 360), 0.0, 0.10),
    "cristal_azul": ("cristal azul e brilho", ["resources/resource_crystal_blue"], (185, 225), 0.30, 1.0),
    "cristal_roxo": ("cristal roxo e brilho", ["resources/resource_crystal_purple"], (260, 300), 0.25, 1.0),
    "cristal_verde": ("cristal verde e brilho", ["resources/resource_crystal_green"], (95, 150), 0.35, 1.0),
}


def load(rel):
    return np.asarray(Image.open(ITEMS / f"{rel}@2x.png").convert("RGBA")).astype(float)


def hsv(rgb):
    f = rgb / 255.0
    return np.array([colorsys.rgb_to_hsv(*p) for p in f])


def ramp_from(rels, hue, smin, smax, vmax=None):
    px = []
    for r in rels:
        a = load(r)
        m = a[..., 3] > 242
        px.append(a[..., :3][m])
    px = np.concatenate(px)
    px = px[:: max(1, len(px) // 60000)]
    h = hsv(px)
    hd = h[:, 0] * 360
    lo, hi = hue
    hm = ((hd >= lo % 360) & (hd <= hi)) if lo >= 0 else ((hd >= 360 + lo) | (hd <= hi))
    m = hm & (h[:, 1] >= smin) & (h[:, 1] <= smax) & (h[:, 2] > 0.08)
    if vmax is not None:
        m &= h[:, 2] <= vmax
    sel = px[m]
    lum = sel @ np.array([0.299, 0.587, 0.114])
    order = np.argsort(lum)
    sel = sel[order]
    out = []
    for a_, b_ in BANDS:
        seg = sel[int(len(sel) * a_ / 100): max(int(len(sel) * b_ / 100), int(len(sel) * a_ / 100) + 1)]
        out.append("#%02x%02x%02x" % tuple(int(round(v)) for v in np.median(seg, 0)))
    return out, int(len(sel))


def outline_color():
    cols = []
    for fam in ("resources", "tools", "crops"):
        for p in sorted((ITEMS / fam).glob("*@2x.png"))[::3]:
            a = np.asarray(Image.open(p).convert("RGBA")).astype(float)
            al = Image.fromarray((a[..., 3] > 242).astype(np.uint8) * 255)
            inner = np.asarray(al.filter(ImageFilter.MinFilter(7))) > 0
            ring = (np.asarray(al) > 0) & ~inner
            px = a[..., :3][ring]
            if len(px) == 0:
                continue
            lum = px @ np.array([0.299, 0.587, 0.114])
            cols.append(px[lum <= np.percentile(lum, 30)])
    px = np.concatenate(cols)
    lum = px @ np.array([0.299, 0.587, 0.114])
    px = px[np.argsort(lum)]
    dark = np.median(px[: len(px) // 2], 0)          # metade mais escura do anel
    mid = np.median(px[len(px) // 2:], 0)
    return ["#%02x%02x%02x" % tuple(int(round(v)) for v in c) for c in (dark, mid)]


def main():
    pal = json.loads(PAL.read_text(encoding="utf-8"))
    report = {}
    for name, (use, rels, hue, smin, smax) in MATERIALS.items():
        tones, n = ramp_from(rels, hue, smin, smax, 0.62 if name == "terra_monte" else None)
        pal["ramps"][name] = {"use": use, "origin": "user_art", "source": rels,
                              "tones": [{"tone": t, "hex": h} for t, h in zip(TONES, tones)]}
        report[name] = (tones, n)
    oc = outline_color()
    pal["ramps"]["contorno_item"] = {"use": "contorno das peças no estilo do usuário (escuro quente, nunca preto)",
                                     "origin": "user_art", "source": "anel de 3 px na borda de todos os recortes",
                                     "tones": [{"tone": "deep", "hex": oc[0]}, {"tone": "base", "hex": oc[1]}]}
    pal["version"] = "3.1"
    pal["colors_total"] = sum(len(r["tones"]) for r in pal["ramps"].values())
    cl = [c for c in pal["changelog"] if not c.startswith("3.1")]
    cl.append("3.1 (2026-11-22): +14 rampas extraídas da arte do usuário (estilo-alvo oficial de itens, recursos, "
              "ferramentas e culturas) por art/source/tools/extract_palette_v3.py")
    pal["changelog"] = cl
    pal["description"] = (pal["description"].split(" [3.1]")[0] + " [3.1] Rampas com origin=user_art vêm das imagens do usuário "
                          "e são mais saturadas: use-as em itens, culturas, frutos e efeitos; o chão e as construções seguem "
                          "as rampas terrosas do estilo C, um degrau mais vivas (ver guia).")
    PAL.write_text(json.dumps(pal, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for k, (t, n) in report.items():
        print(f"{k:16s} {n:6d}px  {' '.join(t)}")
    print("contorno_item", oc, "total", pal["colors_total"])


if __name__ == "__main__":
    main()
