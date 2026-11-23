#!/usr/bin/env python3
"""Alvo visual c-02 — lote 2026-11-23-alvo-visual-c-02 (in_review). Substitui o c-01 a pedido do usuário.

Pedido: "quero que use as imagens/estilo de arte para a cena". O MUNDO (chão, árvores, construções,
cerca, pedras, personagem, água) passa a seguir o estilo das imagens do usuário: pintado/ilustrado,
vivo e saturado, volumes suaves com luz e sombra pintadas, contorno escuro-quente fino.

Reaproveita build_alvo_visual_c_01.py (mesma composição, mesmas peças vetoriais) e muda:
  * paleta v3.2 (rampas do mundo reajustadas lado a lado com a arte do usuário);
  * acabamento pintado no raster (`paint_finish`): degradê de luz quente topo-esquerda -> sombra fria
    baixo-direita, oclusão suave na base e +saturação, antes do contorno;
  * canteiros com várias culturas do usuário em estágios diferentes (trigo, tomate, abóbora, cenoura);
  * recursos do usuário perto dos nós (tora junto da árvore folhosa, minérios junto da pedra).

100% vetor por script + recortes do usuário. Sem IA, sem referência externa.

    python3 art/source/tools/build_alvo_visual_c_02.py      # sai 0 só se todo o QA passar
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_alvo_visual_c_01 as c1  # noqa: E402
import iso_vector as iv  # noqa: E402
import paint_vector as pv  # noqa: E402

BATCH = "2026-11-23-alvo-visual-c-02"
PREV = "2026-11-22-alvo-visual-c-01"
REV = iv.ART / "review" / BATCH
PREV_REV = iv.ART / "review" / PREV
FAM = {k: f"v32-{k}" for k in ("ground", "nature", "crops", "props", "buildings", "characters", "ui")}
FAM_C01 = dict(c1.FAM)

# o c-01 inteiro passa a escrever nas pastas v32-* e no lote c-02
c1.BATCH, c1.REV, c1.FAM = BATCH, REV, FAM

# --------------------------------------------------------------------- canteiros e recursos
# (i, j) -> (cultura do usuário, estágio, escala do recorte @2x no mundo)
BEDS = {(5, 1): ("wheat", 3), (6, 1): ("tomato", 2), (5, 2): ("pumpkin", 3), (6, 2): ("carrot", 1)}
CROP_SCALE = {"wheat": 0.60, "tomato": 0.56, "pumpkin": 0.50, "carrot": 0.58}
USER_EXTRA_CROPS = [("wheat", 1), ("wheat", 2)]          # só para a prancha (estágios do trigo)
RESOURCES = [  # (recorte do usuário, nome no mundo, escala, i, j)
    ("resource_log", "res_log_world", 0.24, 0.70, 6.05),
    ("resource_ore_gray", "res_ore_gray_world", 0.17, 8.78, 6.42),
    ("resource_ore_gold", "res_ore_gold_world", 0.13, 8.30, 6.95),
]
c1.BEDS = {k: 1 for k in BEDS}
c1.OVERLAY = [("ui_indicator_ready", 5, 1, -74)]


def scene_objects():
    objs = [(c1.BARN[0], c1.BARN[1], c1.BARN[2], (4, 2, 0))]
    for (i, j), (crop, st) in BEDS.items():
        objs.append(("plot_raised_bed", i, j, (i + j, i, 0)))
        objs.append((f"crop_{crop}_s{st}", i, j, (i + j, i, 1)))
    for (i, j), k in c1.FENCE_AT.items():
        objs.append((f"prop_fence_{k}", i, j, (i + j, i, 0)))
    for n, i, j in c1.PROPS:
        objs.append((n, i, j, (i + j, i, 0)))
    for _, n, _, i, j in RESOURCES:
        objs.append((n, i, j, (i + j, i, 0)))
    return sorted(objs, key=lambda o: o[3])


c1.scene_objects = scene_objects


# --------------------------------------------------------------------- acabamento pintado (raster)
def paint_finish(path: Path, sat=1.12, light=0.10, ao=0.16):
    """Volume pintado suave por cima do vetor (antes do contorno), como na arte do usuário:
    degradê de luz quente no topo-esquerda -> sombra fria no baixo-direita, oclusão suave na base,
    saturação +12 %. Não cria cor de material nova: só reacende/escurece a pintura existente."""
    im = np.asarray(Image.open(path).convert("RGBA")).astype(float) / 255
    a = im[..., 3]
    if not (a > 0.05).any():
        return
    rgb = im[..., :3]
    ys, xs = np.nonzero(a > 0.05)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    X = np.clip((xx - x0) / max(1, x1 - x0), 0, 1)
    Y = np.clip((yy - y0) / max(1, y1 - y0), 0, 1)
    g = 1 - 2 * (0.55 * X + 0.83 * Y) / 1.38          # +1 topo-esquerda, -1 baixo-direita
    lum = (rgb @ np.array([0.299, 0.587, 0.114]))[..., None]
    rgb = lum + (rgb - lum) * sat
    rgb = rgb * (1 + light * g[..., None])
    rgb = rgb + g[..., None] * np.array([0.022, 0.010, -0.018])   # luz quente, sombra fria
    # oclusão suave: mais escuro perto da base da silhueta (contato com o chão)
    base = np.clip((Y - 0.72) / 0.28, 0, 1) ** 1.6
    rgb = rgb * (1 - ao * base[..., None])
    out = np.dstack([np.clip(rgb, 0, 1), a])
    Image.fromarray((out * 255).round().astype(np.uint8), "RGBA").save(path)


_outline_pair = c1.outline_pair


def outline_pair(d: Path, name: str):
    paint_finish(d / f"{name}@2x.png")
    _outline_pair(d, name)


c1.outline_pair = outline_pair


# --------------------------------------------------------------------- recortes do usuário no mundo
def _export_user_world(src: Image.Image, ax2, ay2, k, name, fam, z_lift, derived, extra_meta):
    bb = src.getbbox()
    crop = src.crop(bb)
    w2, h2 = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    small = c1.premult_resize(crop, (w2, h2))
    left, right = (ax2 - bb[0]) * k + 8, (bb[2] - ax2) * k + 8
    top = (ay2 - bb[1]) * k + 8 + 2 * z_lift
    bottom = (bb[3] - ay2) * k + 8 - 2 * z_lift
    half = c1._ceil(max(left, right), 4)
    W2 = 2 * half if (2 * half) % 8 == 0 else 2 * half + 4
    AY2 = c1._ceil(top, 4)
    H2 = c1._ceil(AY2 + max(bottom, 4), 8)
    cv = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    cv.alpha_composite(small, (round(W2 / 2 - (ax2 - bb[0]) * k), round(AY2 - 2 * z_lift - (ay2 - bb[1]) * k)))
    out = iv.ART / "export" / FAM[fam]
    out.mkdir(parents=True, exist_ok=True)
    cv.save(out / f"{name}@2x.png")
    c1.premult_resize(cv, (W2 // 2, H2 // 2)).save(out / f"{name}@1x.png")
    m = {"name": name, "size_1x": [W2 // 2, H2 // 2], "anchor_px_1x": [W2 // 4, AY2 // 2],
         "origin": [0.5, round(AY2 / H2, 6)], "footprint_tiles": [1, 1], "scales": [1, 2],
         "derived_from": derived, "world_scale_of_user_2x": k, **extra_meta}
    (out / f"{name}.json").write_text(json.dumps(m, indent=1) + "\n", encoding="utf-8")
    c1.mark_interactive(name)
    c1._FAM_OF[name] = fam
    return {"name": name, "size": (W2 // 2, H2 // 2), "anchor": (W2 // 4, AY2 // 2), "fam": fam, "user": derived}


def user_crop(crop, st):
    un = f"crop_{crop}_s{st}"
    meta = json.loads((c1.USER_CROPS / f"{un}.json").read_text())
    src = Image.open(c1.USER_CROPS / f"{un}@2x.png").convert("RGBA")
    ax2, ay2 = meta["anchor_px_1x"][0] * 2, meta["anchor_px_1x"][1] * 2
    return _export_user_world(src, ax2, ay2, CROP_SCALE[crop], un, "crops", c1.SOIL_Z,
                              f"art/export/user-items/crops/{un}@2x.png", {"z_base_px": c1.SOIL_Z})


USER_RES = iv.ART / "export" / "user-items" / "resources"


def user_resource(un, name, k):
    """Recurso do usuário caído no chão: âncora = base da silhueta (contato), sombra de contato separada."""
    src = Image.open(USER_RES / f"{un}@2x.png").convert("RGBA")
    bb = src.getbbox()
    ax2, ay2 = (bb[0] + bb[2]) / 2, bb[3] - 0.08 * (bb[3] - bb[1])
    e = _export_user_world(src, ax2, ay2, k, name, "nature", 0, f"art/export/user-items/resources/{un}@2x.png", {})
    # sombra de contato separada (elipse suave na cor `sombra.contact`)
    w1 = e["size"][0]
    rx, ry = round((bb[2] - bb[0]) * k / 4 * 0.95), round((bb[2] - bb[0]) * k / 4 * 0.30)
    W1, H1 = c1._ceil(2 * rx + 16, 4), c1._ceil(2 * ry + 16, 4)
    out = iv.ART / "export" / FAM["nature"]
    col = pv.h2r(pv.T("sombra", "contact"))
    for s in (1, 2):
        sh = Image.new("L", (W1 * s, H1 * s), 0)
        ImageDraw.Draw(sh).ellipse([(W1 / 2 - rx + 2) * s, (H1 / 2 - ry) * s, (W1 / 2 + rx + 2) * s, (H1 / 2 + ry) * s], fill=95)
        sh = sh.filter(ImageFilter.GaussianBlur(2 * s))
        img = Image.new("RGBA", sh.size, col + (0,))
        img.putalpha(sh)
        img.save(out / f"{name}_shadow@{s}x.png")
    (out / f"{name}_shadow.json").write_text(json.dumps({"name": name + "_shadow", "size_1x": [W1, H1], "anchor_px_1x": [W1 // 2, H1 // 2],
                                                          "origin": [0.5, 0.5], "scales": [1, 2]}, indent=1) + "\n")
    c1._FAM_OF[name + "_shadow"] = "nature"
    _ = w1
    return e, {"name": name + "_shadow", "size": (W1, H1), "fam": "nature", "user": e["user"]}


# --------------------------------------------------------------------- leitura a 0,5
UNITS = [("canteiro com trigo maduro", [("plot_raised_bed", 0, 0), ("crop_wheat_s3", 0, 0)]),
         ("pedra com minério", [("rock_ore_a", 0, 0)]),
         ("árvore folhosa", [("tree_oak_a", 0, 0)]),
         ("fazendeiro", [("avatar_base_idle_se", 0, 0)]),
         ("galpão", [("bld_barn_small", 0, 0)])]
NEW_UNITS = [("macieira", [("tree_apple_a", 0, 0)]), ("pinheiro", [("tree_pine_a", 0, 0)]),
             ("fardos de feno", [("prop_hay_bales", 0, 0)]), ("caixote", [("prop_crate", 0, 0)]),
             ("canteiro vazio", [("plot_raised_bed", 0, 0)]),
             ("canteiro tomate s2", [("plot_raised_bed", 0, 0), ("crop_tomato_s2", 0, 0)]),
             ("canteiro abóbora s3", [("plot_raised_bed", 0, 0), ("crop_pumpkin_s3", 0, 0)]),
             ("canteiro cenoura s1", [("plot_raised_bed", 0, 0), ("crop_carrot_s1", 0, 0)]),
             ("trigo crescendo", [("plot_raised_bed", 0, 0), ("crop_wheat_s2", 0, 0)]),
             ("tora", [("res_log_world", 0, 0)]), ("minério cinza", [("res_ore_gray_world", 0, 0)])]


def with_fam(fam_map, fn):
    old = c1.FAM
    c1.FAM = fam_map
    c1._CACHE.clear()
    try:
        return fn()
    finally:
        c1.FAM = old
        c1._CACHE.clear()


def legibility_suite():
    R = c1.L_RULES
    ok_ = lambda m: m["borda_dL"] >= R["borda_dL"] and m["indice"] >= R["indice"]  # noqa: E731
    res = {"rules_min": R, "antes_depois": [], "pecas_interativas": []}
    for label, parts in UNITS:
        before = with_fam(FAM_C01, lambda: c1.legibility(*c1.unit_image(parts, 0.5)))
        after = c1.legibility(*c1.unit_image(parts, 0.5))
        res["antes_depois"].append({"unidade": label, "antes_c01": before, "depois_c02": after, "pass": ok_(after)})
    for label, parts in NEW_UNITS:
        m = c1.legibility(*c1.unit_image(parts, 0.5))
        res["pecas_interativas"].append({"unidade": label, **m, "pass": ok_(m)})
    res["pass"] = all(u["pass"] for u in res["antes_depois"] + res["pecas_interativas"])
    return res


# --------------------------------------------------------------------- prancha antes x depois
def before_after(leg):
    """Cena inteira c-01 x c-02 a 1x, e recortes @2x (canteiros, galpão, fazendeiro, recursos)."""
    old = Image.open(PREV_REV / "cena.png").convert("RGBA")
    new = Image.open(REV / "cena.png").convert("RGBA")
    old2 = Image.open(PREV_REV / "cena@2x.png").convert("RGBA")
    new2 = Image.open(REV / "cena@2x.png").convert("RGBA")
    crops = [("canteiros e cerca", (1150, 540, 1900, 1020)), ("galpão", (820, 20, 1480, 700)),
             ("fazendeiro", (930, 620, 1100, 880)), ("árvore + tora", (330, 260, 760, 830)),
             ("pedra + minério", (1260, 1180, 1620, 1360))]
    W_ = 2 * 1280 + 60
    rows_h = []
    for _, b in crops:
        rows_h.append(b[3] - b[1])
    H_ = 120 + 800 + 50 + sum(rows_h) // 2 + 60 + 40 * len(crops) + 200
    board = Image.new("RGBA", (W_, H_), c1.SHEET_BG)
    dr = ImageDraw.Draw(board)
    F = c1.font
    dr.text((20, 16), f"Antes (c-01, mundo 'mais calmo', paleta v3.1)  ×  depois (c-02, mundo no estilo das imagens do usuário, paleta v3.2)",
            fill=c1.INK, font=F(24, True))
    dr.text((20, 54), "Mesma composição e mesmas regras (2:1, tile 128×64, âncoras, sombras separadas, L1–L5). Muda: cor, luz pintada, "
            "acabamento; culturas e recursos do usuário no mundo.", fill=c1.INK, font=F(16))
    dr.text((20, 88), "ANTES · c-01", fill=(150, 60, 40, 255), font=F(18, True))
    dr.text((1320, 88), "DEPOIS · c-02", fill=(40, 110, 60, 255), font=F(18, True))
    board.alpha_composite(old, (20, 120))
    board.alpha_composite(new, (1320, 120))
    y = 120 + 800 + 30
    dr.text((20, y), "Detalhes @2x (metade do tamanho na prancha, lado a lado)", fill=c1.INK, font=F(18, True))
    y += 36
    x = 20
    rowh = 0
    for label, b in crops:
        o = old2.crop(b)
        n = new2.crop(b)
        o = o.resize((o.width // 2 * 2 // 2, o.height // 2), Image.LANCZOS) if o.width > 560 else o
        n = n.resize((n.width // 2 * 2 // 2, n.height // 2), Image.LANCZOS) if n.width > 560 else n
        cw = o.width + n.width + 30
        if x + cw > W_ - 20:
            x, y, rowh = 20, y + rowh + 50, 0
        dr.text((x, y), label, fill=c1.INK, font=F(15, True))
        board.alpha_composite(o, (x, y + 24))
        board.alpha_composite(n, (x + o.width + 10, y + 24))
        x += cw + 20
        rowh = max(rowh, o.height + 24)
    y += rowh + 40
    dr.text((20, y), "Leitura a zoom 0,5 (borda ΔL* mín. 16 / índice mín. 1,6) — c-01 → c-02:", fill=c1.INK, font=F(16, True))
    y += 28
    txt = "   ".join(f"{u['unidade']}: {u['antes_c01']['borda_dL']:.1f} → {u['depois_c02']['borda_dL']:.1f}" for u in leg["antes_depois"])
    dr.text((20, y), txt, fill=c1.INK, font=F(14))
    y += 24
    txt = " · ".join(f"{u['unidade']} {u['borda_dL']:.0f}/{u['indice']:.1f}" for u in leg["pecas_interativas"])
    dr.text((20, y), "Outras peças (c-02): " + txt, fill=c1.INK, font=F(13))
    return board.crop((0, 0, W_, y + 50))


# --------------------------------------------------------------------- QA dos recortes no mundo
def extras_checks(extra):
    errs, groups = [], {}
    for e in extra:
        d = iv.ART / "export" / FAM[e["fam"]]
        if not e["name"].endswith("_shadow"):
            al = np.asarray(Image.open(d / f"{e['name']}@2x.png").getchannel("A"))
            if max(al[0].max(), al[-1].max(), al[:, 0].max(), al[:, -1].max()) > 0:
                errs.append(f"{e['name']}@2x: encosta na borda do canvas")
        w, h = e["size"]
        for s in (1, 2):
            groups.setdefault(f"{w * s}x{h * s}", []).append(str(d / f"{e['name']}@{s}x.png"))
    rep = []
    for size, files in sorted(groups.items()):
        r = subprocess.run([sys.executable, str(c1.REPORT), *files, "--expect-size", size, "--require-alpha", "--json"],
                           capture_output=True, text=True)
        rep.append({"size": size, "files": len(files), "exit": r.returncode, "stderr": r.stderr.strip()[:300] if r.returncode else ""})
    return {"errors": errs, "pass": not errs}, rep


# --------------------------------------------------------------------- manifesto
ROLE_EXTRA = {
    "crop_wheat": "trigo do usuário (culturas-d.webp) no canteiro: s1, s2, s3 (escala 0,60 do @2x)",
    "crop_tomato": "tomate do usuário (culturas-d.webp) no canteiro: s2 crescendo (escala 0,56 do @2x)",
    "crop_pumpkin": "abóbora do usuário (culturas-d.webp) no canteiro: s3 madura (escala 0,50 do @2x)",
    "crop_carrot": "cenoura do usuário (culturas-d.webp) no canteiro: s1 broto (escala 0,58 do @2x)",
    "res_log_world": "tora do usuário (recursos.webp) caída junto da árvore folhosa (escala 0,24 do @2x) + sombra de contato",
    "res_ore_gray_world": "minério cinza do usuário (recursos.webp) junto da pedra (escala 0,17 do @2x) + sombra de contato",
    "res_ore_gold_world": "minério dourado do usuário (recursos.webp) junto da pedra (escala 0,13 do @2x) + sombra de contato",
}


def group_of(name):
    for p in ("crop_wheat_", "crop_tomato_", "crop_pumpkin_", "crop_carrot_"):
        if name.startswith(p):
            return p[:-1]
    return c1.group_of(name)


def update_manifest(assets, extra, qa_ok):
    mpath = iv.ART / "manifest.json"
    man = json.loads(mpath.read_text(encoding="utf-8"))
    for e in man["assets"]:
        if e.get("batch") == PREV:
            e["status"] = "rejected"
            e["superseded_by"] = BATCH
            e["notes"] = f"substituído por c-02 a pedido do usuário (2026-11-23: 'quero que use as imagens/estilo de arte para a cena'); ver art/review/{BATCH}/notas.md"
    for s in man.get("support_files", []):
        if s.get("batch") == PREV:
            s["status"] = "rejected"
            s["superseded_by"] = BATCH
    man["assets"] = [e for e in man["assets"] if e.get("batch") != BATCH]
    groups = {}
    for name in assets:
        groups.setdefault(group_of(name), []).append(name)
    for e in extra:
        groups.setdefault(group_of(e["name"]), []).append(e["name"])
    rel = lambda p: str(p.relative_to(c1.ROOT))  # noqa: E731
    user_of = {e["name"]: e["user"] for e in extra}
    for gid, names in groups.items():
        main_ = sorted(n for n in names if not n.endswith("_shadow"))
        files, sources = [], []
        for n in sorted(names):
            d = iv.ART / "export" / FAM[c1._FAM_OF[n]]
            files += [rel(d / f"{n}@1x.png"), rel(d / f"{n}@2x.png"), rel(d / f"{n}.json")]
            if n in assets:
                sources.append(rel(iv.ART / "source" / FAM[c1._FAM_OF[n]] / f"{n}.svg"))
        d0 = iv.ART / "export" / FAM[c1._FAM_OF[main_[0]]]
        meta = json.loads((d0 / f"{main_[0]}.json").read_text())
        user = main_[0] in user_of
        entry = {
            "id": gid, "batch": BATCH, "role": ROLE_EXTRA.get(gid) or c1.ROLE.get(gid, gid),
            "path": rel(d0 / f"{main_[0]}@1x.png"), "files": files,
            "source_path": ([user_of[n] for n in main_] if user else (sources if len(sources) > 1 else sources[0])),
            "status": "in_review", "variants": main_ if len(main_) > 1 else [],
            "technical": {"dimensions": "x".join(map(str, meta["size_1x"])), "alpha": True, "anchor": "centro do losango da pegada" if not gid.startswith("res_") else "base da silhueta (contato)",
                          "anchor_px_1x": meta["anchor_px_1x"], "origin": meta["origin"], "footprint_tiles": meta.get("footprint_tiles", [1, 1]),
                          "frames": len(main_) if gid.startswith("crop_") else 1, "filtering": "linear", "max_colors": None,
                          "palette": "art/style-guide/palette.json (v3.2)" if not user else "arte do usuário (sem requantizar)",
                          "shadow": "separada (_shadow, canvas e âncora próprios)" if any(n.endswith("_shadow") for n in names) else "sem sombra",
                          "interactive_rim": any(n in c1.INTERACTIVE for n in names)},
            "visual_locks": ["palette-v3.2", "projection-2:1", "anchor", "light-direction", "outline-v3", "paint-finish-v3.2"],
            "source": ({"kind": "user_owned", "url_or_tool": "art/source/tools/build_alvo_visual_c_02.py (escala + âncora, sem repintura)",
                        "creator": "usuário (dono do projeto); recorte e escala pelo agente diretor-de-arte", "created_at": "2026-11-23",
                        "license": "do usuário; uso autorizado (art/source/user-provided/2026-11-22/PROVENIENCIA.md)", "attribution": "",
                        "prompt_or_source_record": "derivado dos recortes em art/export/user-items/"} if user else
                       {"kind": "scripted", "url_or_tool": "art/source/tools/build_alvo_visual_c_02.py + build_alvo_visual_c_01.py + paint_vector.py + iso_vector.py (cairosvg)",
                        "creator": "agente diretor-de-arte (Claude)", "created_at": "2026-11-23",
                        "license": "original do projeto (todos os direitos do projeto)", "attribution": "",
                        "prompt_or_source_record": "SVG gerado por código com a paleta v3.2; acabamento pintado (paint_finish) e contorno "
                                                   "no raster; sem IA; sem referência externa; nada derivado de Sunflower Land/Sunnyside"}),
            "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False, "technical_checks_passed": qa_ok, "approved_by": ""},
            "review": f"art/review/{BATCH}/antes-depois.png", "notes": f"alvo visual c-02 (guia v3.2); substitui c-01; ver art/review/{BATCH}/notas.md",
        }
        man["assets"].append(entry)
    man["support_files"] = [s for s in man.get("support_files", []) if s.get("batch") != BATCH]
    man["support_files"].append({"path": f"art/review/{BATCH}/", "role": "alvo visual c-02 (cenas, antes×depois, prancha, qa.json, notas.md)",
                                 "status": "in_review", "batch": BATCH})
    man["style_version"] = "3.2 (o mundo usa o estilo das imagens do usuário: pintado, vivo, saturado) — 2026-11-23"
    mpath.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


# --------------------------------------------------------------------- main
def main():
    iv.use_palette(iv.ART / "style-guide" / "palette.json")
    assets = c1.build_assets()
    c1._ASSETS = assets
    for name, (a, fam) in assets.items():
        c1._FAM_OF[name] = fam
        a.export(c1.src_dir(fam), c1.exp_dir(fam))
        if not name.startswith(c1.OUTLINE_SKIP) and not name.endswith("_shadow"):
            outline_pair(c1.exp_dir(fam), name)
    extra = [user_crop(c, s) for c, s in list(BEDS.values()) + USER_EXTRA_CROPS]
    for un, n, k, _, _ in RESOURCES:
        extra += list(user_resource(un, n, k))
    REV.mkdir(parents=True, exist_ok=True)
    c1.compose(1).convert("RGB").save(REV / "cena.png")
    c1.compose(2, src=2).convert("RGB").save(REV / "cena@2x.png")
    half = c1.compose(0.5)
    half.convert("RGB").save(REV / "cena-zoom05.png")
    c1.compose(1.0, src=2).crop((300, 80, 300 + 780, 80 + 720)).convert("RGB").save(REV / "cena-celular-dpr2.png")
    c1.sheet().convert("RGB").save(REV / "prancha.png")
    leg = legibility_suite()
    before_after(leg).convert("RGB").save(REV / "antes-depois.png")
    seams = [c1.seam_test(z) for z in (0.5, 0.75, 1, 1.5, 2)]
    repeats = [c1.repeat_test(n) for n in assets if n.startswith(("ground_grass", "ground_path", "ground_water"))]
    pal = c1.palette_test(assets)
    contract = c1.contract_test(assets, [])
    ex_contract, ex_report = extras_checks(extra)
    report = c1.asset_report(assets, []) + ex_report
    ok = (all(s["pass"] for s in seams) and all(r["pass"] for r in repeats) and pal["pass"] and contract["pass"]
          and ex_contract["pass"] and all(r["exit"] == 0 for r in report) and leg["pass"])
    qa = {"batch": BATCH, "replaces": PREV, "palette_version": iv.palette()["version"],
          "pieces": len([n for n in assets if not n.endswith("_shadow")]) + len([e for e in extra if not e["name"].endswith("_shadow")]),
          "seam_tests": seams, "repeat_3x3": {"tiles": len(repeats), "failed": [r for r in repeats if not r["pass"]]},
          "palette": pal, "contract": contract, "contract_user_pieces": ex_contract, "legibility_05": leg,
          "asset_report": report, "pass": ok}
    (REV / "qa.json").write_text(json.dumps(qa, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    update_manifest(assets, extra, ok)
    print(json.dumps({"legibility_05": leg, "seams": [s["pass"] for s in seams], "palette": pal["pass"],
                      "contract": contract["errors"][:5] + ex_contract["errors"]}, indent=1, ensure_ascii=False)[:5000])
    print("asset_report:", [(r["size"], r["files"], r["exit"]) for r in report if r["exit"]])
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
