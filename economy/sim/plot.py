#!/usr/bin/env python3
"""Gráfico PNG do simulador (só Pillow, sem matplotlib).

Lê economy/sim/out/daily.csv e escreve economy/sim/out/sim-90d.png com dois painéis:
  1. moedas em caixa (acumuladas) por perfil;
  2. itens produzidos acumulados (colheitas + recursos) por perfil — o inventário em mãos
     fica ~0 porque a política simulada vende tudo; o valor em mãos sai em summary.json.

Uso: python3 economy/sim/plot.py   (ou `pnpm econ:sim`, que roda o simulador antes)
"""
from __future__ import annotations

import csv
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "out"
S = 2  # supersampling
W, H = 1200, 980

SURFACE = "#fcfcfb"
TEXT = "#0b0b0b"
TEXT2 = "#52514e"
GRID = "#e4e3df"
# Paleta categórica validada (slots 1–3, ordem fixa): casual, ativo, bot.
COLORS = {"casual": "#2a78d6", "active": "#eb6834", "bot": "#1baf7a"}
LABELS = {"casual": "Casual (2x/dia)", "active": "Ativo (8x/dia)", "bot": "Bot 24/7"}


def font(size: int) -> ImageFont.ImageFont:
    for name in ("DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size * S)
        except OSError:
            pass
    return ImageFont.load_default(size=size * S)


def nice_step(vmax: float, ticks: int = 5) -> float:
    raw = vmax / ticks
    mag = 10 ** math.floor(math.log10(raw))
    for m in (1, 2, 2.5, 5, 10):
        if raw <= m * mag:
            return m * mag
    return 10 * mag


def fmt(v: float) -> str:
    if v >= 1000:
        k = v / 1000
        return f"{k:.0f}k" if k == int(k) else f"{k:.1f}k"
    return f"{v:.0f}"


def panel(draw, box, series, title, subtitle, days):
    x0, y0, x1, y1 = (v * S for v in box)
    f_title, f_sub, f_tick, f_lab = font(17), font(13), font(12), font(13)
    draw.text((x0, y0 - 52 * S), title, fill=TEXT, font=f_title)
    draw.text((x0, y0 - 28 * S), subtitle, fill=TEXT2, font=f_sub)
    vmax = max(max(v) for v in series.values())
    step = nice_step(vmax)
    top = step * math.ceil(vmax / step)
    sx = lambda d: x0 + (d / days) * (x1 - x0)  # noqa: E731
    sy = lambda v: y1 - (v / top) * (y1 - y0)  # noqa: E731
    v = 0.0
    while v <= top + 1e-9:
        y = sy(v)
        draw.line([(x0, y), (x1, y)], fill=GRID if v > 0 else TEXT2, width=1 * S)
        draw.text((x0 - 10 * S, y), fmt(v), fill=TEXT2, font=f_tick, anchor="rm")
        v += step
    for d in (0, 7, 15, 30, 45, 60, 75, 90):
        draw.text((sx(d), y1 + 8 * S), f"dia {d}" if d in (0, 90) else str(d), fill=TEXT2, font=f_tick, anchor="ma")
    for d in (7, 30):
        draw.line([(sx(d), y0), (sx(d), y1)], fill=GRID, width=1 * S)
    for pid, values in series.items():
        pts = [(sx(i + 1), sy(val)) for i, val in enumerate(values)]
        draw.line(pts, fill=COLORS[pid], width=2 * S, joint="curve")
        ex, ey = pts[-1]
        r = 4 * S
        draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=COLORS[pid], outline=SURFACE, width=2 * S)
        draw.text((ex + 10 * S, ey), f"{LABELS[pid].split(' (')[0]}  {fmt(values[-1])}", fill=TEXT, font=f_lab, anchor="lm")


def main() -> None:
    rows = list(csv.DictReader((OUT / "daily.csv").open(encoding="utf8")))
    profiles = list(dict.fromkeys(r["profile"] for r in rows))
    coins = {p: [float(r["coins"]) for r in rows if r["profile"] == p] for p in profiles}
    items = {p: [float(r["items_produced"]) for r in rows if r["profile"] == p] for p in profiles}
    days = len(coins[profiles[0]])

    img = Image.new("RGB", (W * S, H * S), SURFACE)
    draw = ImageDraw.Draw(img)
    draw.text((40 * S, 24 * S), "Economia v0 — simulação de 90 dias (motor real game-core)", fill=TEXT, font=font(21))
    # legenda
    lx = 40 * S
    for p in profiles:
        draw.line([(lx, 72 * S), (lx + 22 * S, 72 * S)], fill=COLORS[p], width=3 * S)
        draw.text((lx + 30 * S, 72 * S), LABELS[p], fill=TEXT, font=font(13), anchor="lm")
        lx += 190 * S
    panel(draw, (110, 170, 1040, 520), coins, "Moedas em caixa (acumuladas)",
          "Saldo no fim de cada dia; fontes = vendas, sumidouro = sementes", days)
    panel(draw, (110, 640, 1040, 900), items, "Itens produzidos (acumulado: colheitas + recursos)",
          "Inventário em mãos ~0: a política simulada vende tudo a cada visita", days)
    draw.text((40 * S, 950 * S), "Fonte: economy/economy.csv → economy/sim/simulate.mjs. Proposta v0, aguardando aprovação.",
              fill=TEXT2, font=font(12))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(OUT / "sim-90d.png", optimize=True)
    print(f"plot ok — {OUT / 'sim-90d.png'}")


if __name__ == "__main__":
    main()
