#!/usr/bin/env python3
"""Gráfico PNG do simulador v2.2 (só Pillow, sem matplotlib).

Lê economy/sim/out/daily.csv + summary.json e escreve economy/sim/out/sim-90d.png com cinco painéis:
  1. blocos revelados por perfil nos 90 dias, cenários de Diamantes (a) sem fonte (tracejado) e
     (b) fonte gratuita hipotética (contínuo);
  2. projeção de 3 anos (mesma política): (b) contínuo e (c) pagante tracejado, com o tempo acumulado
     de obra da referência (tracejado cinza);
  3. ganho líquido de Gold por dia (vendas − sementes, média móvel de 7 dias), (a) e (b);
  4. Diamantes/dia necessários para não travar (por perfil e no ritmo da referência) + Diamantes e
     US$ por ilha;
  5. curva das 23 culturas: lucro por hora por canteiro e lucro por colheita.

Uso: python3 economy/sim/plot.py   (ou `pnpm econ:sim`, que roda o simulador antes)
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "out"
S = 2  # supersampling
W, H = 1200, 2480

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
        return f"{k:.0f}k" if k == int(k) else f"{k:.1f}k".replace(".", ",")
    if v != int(v):
        return f"{v:.2f}".rstrip("0").rstrip(".").replace(".", ",")
    return f"{v:.0f}"


def dashed(draw, pts, fill, width, dash=10 * S, gap=7 * S):
    """Polilinha tracejada (Pillow não tem dash nativo)."""
    on, left = True, dash
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        seg = math.hypot(xb - xa, yb - ya)
        pos = 0.0
        while seg - pos > 1e-6:
            step = min(left, seg - pos)
            if on:
                t0, t1 = pos / seg, (pos + step) / seg
                draw.line([(xa + (xb - xa) * t0, ya + (yb - ya) * t0), (xa + (xb - xa) * t1, ya + (yb - ya) * t1)], fill=fill, width=width)
            pos += step
            left -= step
            if left <= 1e-6:
                on = not on
                left = dash if on else gap


def panel(draw, box, series, title, subtitle, days, dashed_series=None):
    x0, y0, x1, y1 = (v * S for v in box)
    f_title, f_sub, f_tick, f_lab = font(17), font(13), font(12), font(13)
    draw.text((x0, y0 - 52 * S), title, fill=TEXT, font=f_title)
    draw.text((x0, y0 - 28 * S), subtitle, fill=TEXT2, font=f_sub)
    vmax = max(max(v) for v in list(series.values()) + list((dashed_series or {}).values()))
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
    for pid, values in (dashed_series or {}).items():
        dashed(draw, [(sx(i + 1), sy(val)) for i, val in enumerate(values)], COLORS[pid], 2 * S)
    for pid, values in series.items():
        pts = [(sx(i + 1), sy(val)) for i, val in enumerate(values)]
        draw.line(pts, fill=COLORS[pid], width=2 * S, joint="curve")
        ex, ey = pts[-1]
        r = 4 * S
        draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=COLORS[pid], outline=SURFACE, width=2 * S)
        draw.text((ex + 10 * S, ey), f"{LABELS[pid].split(' (')[0]}  {fmt(values[-1])}", fill=TEXT, font=f_lab, anchor="lm")


def crop_panel(draw, box, crops):
    """Barras horizontais: lucro/h por canteiro (barra) e lucro por colheita (texto)."""
    x0, y0, x1, y1 = (v * S for v in box)
    draw.text((x0, y0 - 52 * S), "Curva das culturas: lucro por hora por canteiro", fill=TEXT, font=font(17))
    draw.text((x0, y0 - 28 * S), "Barra = lucro/h/canteiro (Gold). Texto = semente → colheita, margem, tempo, lucro por colheita",
              fill=TEXT2, font=font(13))
    vmax = 0.5
    f13 = font(11)
    row_h = (y1 - y0) / len(crops)
    label_w = 120 * S
    bar_x0 = x0 + label_w
    bar_x1 = x0 + (x1 - x0) * 0.55
    sx = lambda v: bar_x0 + (v / vmax) * (bar_x1 - bar_x0)  # noqa: E731
    for v in (0, 0.1, 0.2, 0.3, 0.4, 0.5):
        draw.line([(sx(v), y0), (sx(v), y1)], fill=GRID if v else TEXT2, width=1 * S)
        draw.text((sx(v), y1 + 8 * S), fmt(v), fill=TEXT2, font=font(12), anchor="ma")
    top = max(c["profitPerHourPerPlot"] for c in crops)
    for i, c in enumerate(crops):
        cy = y0 + row_h * (i + 0.5)
        draw.text((x0, cy), c["id"], fill=TEXT, font=f13, anchor="lm")
        v = c["profitPerHourPerPlot"]
        color = "#eb6834" if v == top else "#2a78d6"
        draw.rectangle([sx(0), cy - row_h * 0.3, sx(v), cy + row_h * 0.3], fill=color)
        draw.text((sx(v) + 8 * S, cy), f"{v:.3f}".replace(".", ","), fill=TEXT, font=f13, anchor="lm")
        mins = c["growMinutes"]
        t = f"{mins:g} min" if mins < 60 else (f"{mins / 60:g} h".replace(".", ","))
        info = (f"{gold(c['seedGold'])} → {gold(c['harvestGold'])} · {round(c['marginPct']):d}% · {t} · "
                f"lucro {gold(c['profitGold'])} · {c['unlockBlock']}")
        draw.text((bar_x1 + 60 * S, cy), info, fill=TEXT2, font=f13, anchor="lm")


def gold(v: float) -> str:
    return f"{v:.2f}".replace(".", ",")


def rolling(values, n=7):
    out = []
    for i in range(len(values)):
        lo = max(0, i - n + 1)
        out.append((values[i] - (values[lo - 1] if lo > 0 else 0)) / (i - lo + 1))
    return out


def step_panel(draw, box, series, days, title, subtitle, ref_points=None, xticks=None, dashed_series=None, marks=(7, 19, 40, 65)):
    """Blocos revelados (0–65) × dia, linhas em degrau; ref_points = [(dia, blocos)] tracejado cinza."""
    x0, y0, x1, y1 = (v * S for v in box)
    top = marks[-1]
    draw.text((x0, y0 - 52 * S), title, fill=TEXT, font=font(17))
    draw.text((x0, y0 - 28 * S), subtitle, fill=TEXT2, font=font(13))
    sx = lambda d: x0 + (d / days) * (x1 - x0)  # noqa: E731
    sy = lambda v: y1 - (v / top) * (y1 - y0)  # noqa: E731
    names = dict(zip(marks, ("Ilha 1 completa", "Ilha 2", "Ilha 3", "Ilha 4")))
    for v in (0,) + tuple(marks):
        draw.line([(x0, sy(v)), (x1, sy(v))], fill=GRID if v else TEXT2, width=1 * S)
        draw.text((x0 - 10 * S, sy(v)), str(v), fill=TEXT2, font=font(12), anchor="rm")
        if v:
            draw.text((x1 + 6 * S, sy(v)), names[v], fill=TEXT2, font=font(11), anchor="lm")
    for d in xticks or (0, 15, 30, 45, 60, 75, 90):
        draw.line([(sx(d), y1), (sx(d), y1 + 4 * S)], fill=TEXT2, width=1 * S)
        draw.text((sx(d), y1 + 8 * S), f"dia {d}" if d in (0, days) else str(d), fill=TEXT2, font=font(12), anchor="ma")
    if ref_points:
        dashed(draw, [(sx(d), sy(b)) for d, b in ref_points if d <= days], TEXT2, 2 * S, dash=6 * S, gap=4 * S)

    def steps(pts):
        line = [(sx(0), sy(1))]
        for d, b in pts:
            line += [(sx(d), line[-1][1]), (sx(d), sy(b))]
        line.append((sx(days), line[-1][1]))
        return line
    for pid, pts in (dashed_series or {}).items():
        dashed(draw, steps(pts), COLORS[pid], 2 * S, dash=5 * S, gap=5 * S)
    for k, (pid, pts) in enumerate(series.items()):
        line = steps(pts)
        draw.line(line, fill=COLORS[pid], width=3 * S)
        draw.text((x1 - (4 + 110 * k) * S, line[-1][1] + (6 + 16 * k) * S), f"{LABELS[pid].split(' (')[0]}: {pts[-1][1] if pts else 1}", fill=COLORS[pid], font=font(12), anchor="rt")


def diamond_panel(draw, box, summary, proposed):
    """Barras: Diamantes/dia para que Diamantes nunca atrasem o calendário de obras de cada perfil."""
    x0, y0, x1, y1 = (v * S for v in box)
    draw.text((x0, y0 - 52 * S), "Diamantes/dia necessários para não travar (fonte ainda não decidida)", fill=TEXT, font=font(17))
    draw.text((x0, y0 - 28 * S), "Taxa constante = máx. (Diamantes acumulados até o bloco ÷ dia em que o bloco começaria sem esperar Diamantes)",
              fill=TEXT2, font=font(13))
    proj = summary["scenarios"]["payer"]["projection"]
    ref = summary["referencePace"]["overall"]
    rows = [(LABELS[p], proj[p]["requiredPerDayForThisPace"], COLORS[p]) for p in ("casual", "active", "bot")]
    rows.append(("Ritmo da referência (só obra)", ref, TEXT2))
    vmax = 100
    bar_x0, bar_x1 = x0 + 230 * S, x0 + (x1 - x0) * 0.62
    sx = lambda v: bar_x0 + (v / vmax) * (bar_x1 - bar_x0)  # noqa: E731
    row_h = (y1 - y0) / len(rows)
    for v in range(0, vmax + 1, 20):
        draw.line([(sx(v), y0), (sx(v), y1)], fill=GRID if v else TEXT2, width=1 * S)
        draw.text((sx(v), y1 + 8 * S), str(v), fill=TEXT2, font=font(12), anchor="ma")
    for i, (label, r, color) in enumerate(rows):
        cy = y0 + row_h * (i + 0.5)
        draw.text((x0, cy), label, fill=TEXT, font=font(13), anchor="lm")
        draw.rectangle([sx(0), cy - row_h * 0.28, sx(r["perDay"]), cy + row_h * 0.28], fill=color)
        draw.text((sx(r["perDay"]) + 8 * S, cy), f"{fmt(r['perDay'])}/dia  (pico em {r['block']}, dia {fmt(r['day'])})", fill=TEXT, font=font(12), anchor="lm")
    dashed(draw, [(sx(proposed), y0), (sx(proposed), y1 + 4 * S)], "#c0392b", 2 * S, dash=5 * S, gap=4 * S)
    draw.text((sx(proposed) + 4 * S, y1 + 26 * S), f"proposta (b): {proposed}/dia", fill="#c0392b", font=font(12), anchor="lt")
    tx = bar_x1 + 150 * S
    def usd(v):
        return f"{v:.2f}".replace(".", ",")
    draw.text((tx, y0 - 8 * S), "Diamantes por ilha · US$ base / pacote 15 500", fill=TEXT, font=font(13))
    tot, tb, tp = 0, 0.0, 0.0
    for k, isl in enumerate(summary["islandsData"]):
        u = isl["diamondsUsd"]
        tot, tb, tp = tot + isl["diamonds"], tb + u["base"], tp + u["pack15500"]
        draw.text((tx, y0 + (16 + 22 * k) * S), f"Ilha {k + 1}: {isl['diamonds']:>5} · {usd(u['base'])} / {usd(u['pack15500'])}", fill=TEXT2, font=font(13))
    draw.text((tx, y0 + (16 + 22 * 4) * S), f"Total: {tot} · {usd(tb)} / {usd(tp)}", fill=TEXT, font=font(13))
    draw.text((tx, y0 + (16 + 22 * 5) * S), "100 = US$ 1,50 base, pago em token", fill=TEXT2, font=font(11))


def main() -> None:
    rows = list(csv.DictReader((OUT / "daily.csv").open(encoding="utf8")))
    summary = json.loads((OUT / "summary.json").read_text(encoding="utf8"))
    profiles = list(dict.fromkeys(r["profile"] for r in rows))
    days = summary["days"]
    sc = summary["scenarios"]
    proposed = sc["daily"]["perDay"]

    def series(scenario, fn):
        return {p: [fn(r) for r in rows if r["profile"] == p and r["scenario"] == scenario] for p in profiles}

    def net_day(scenario):
        cum = series(scenario, lambda r: float(r["earned_crops"]) + float(r["earned_resources"]) - float(r["spent_seeds"]))
        return {p: rolling(v) for p, v in cum.items()}

    def block_steps(blocks):
        return sorted((d, i + 1) for i, d in enumerate(blocks) if d is not None and d > 0)

    s90 = {k: {p: block_steps([b["revealedDay"] for b in sc[k]["profiles"][p]["blocks"]]) for p in profiles} for k in ("none", "daily")}
    sproj = {k: {p: block_steps(list(sc[k]["projection"][p]["blocks"].values())) for p in profiles} for k in ("daily", "payer")}
    acc, ref_pts = 0.0, [(0, 1)]
    n = 0
    for isl in summary["islandsData"]:
        acc += isl["buildSeconds"] / 86400
        n += isl["blocks"]
        ref_pts.append((acc, n))
    ref_pts[1] = (ref_pts[1][0], ref_pts[1][1])

    img = Image.new("RGB", (W * S, H * S), SURFACE)
    draw = ImageDraw.Draw(img)
    draw.text((40 * S, 24 * S), "Economia v2.2 (Gold + Diamantes) — 23 culturas + 65 blocos — simulação de 90 dias", fill=TEXT, font=font(21))
    lx = 40 * S
    for p in profiles:
        draw.line([(lx, 72 * S), (lx + 22 * S, 72 * S)], fill=COLORS[p], width=3 * S)
        draw.text((lx + 30 * S, 72 * S), LABELS[p], fill=TEXT, font=font(13), anchor="lm")
        lx += 190 * S
    dashed(draw, [(lx, 72 * S), (lx + 22 * S, 72 * S)], TEXT2, 2 * S, dash=6 * S, gap=4 * S)
    draw.text((lx + 30 * S, 72 * S), "referência: tempo acumulado de obra", fill=TEXT, font=font(13), anchor="lm")
    draw.text((40 * S, 98 * S), f"Cenários de Diamantes: (a) sem fonte = tracejado · (b) {sc['daily']['label'][3:]} = contínuo · (c) pagante (token, 100 = US$ 1,50)",
              fill=TEXT2, font=font(13))

    step_panel(draw, (110, 200, 1040, 500), s90["daily"], days, "Blocos revelados (90 dias): (b) contínuo × (a) sem fonte de Diamantes tracejado",
               "(a) trava em breezewood_03 (1º bloco com Diamantes, 15). Expansões, nós e Diamantes FORA do motor; nível do avatar ignorado",
               ref_points=ref_pts, dashed_series=s90["none"])
    pd = summary["projectionDays"]
    step_panel(draw, (110, 620, 1040, 920), sproj["daily"], pd, f"Projeção {pd} dias: (b) gratuito {proposed}/dia contínuo × (c) pagante tracejado",
               "Tracejado cinza = obra da referência sem esperar material/Gold (16,5 h; 4,7 d; 24 d; 33,6 d por ilha). (a) fica parado em 9 blocos",
               ref_points=ref_pts, xticks=(0, 90, 180, 365, 545, 730, 910, pd), dashed_series=sproj["payer"])
    panel(draw, (110, 1040, 1040, 1290), net_day("daily"), "Ganho líquido de Gold por dia: (b) contínuo × (a) tracejado",
          "Vendas − sementes, média móvel de 7 dias (rótulo = (b), últimos 7 dias); antes de gastar em expansões", days,
          dashed_series=net_day("none"))
    diamond_panel(draw, (40, 1420, 1160, 1600), summary, proposed)
    crop_panel(draw, (40, 1730, 1160, 2400), summary["crops"])
    draw.text((40 * S, 2440 * S),
              "Fonte: economy/economy.csv + economy/expansions.csv → economy/sim/simulate.mjs. v2.2: fonte de Diamantes e preço VIP aguardando decisão do usuário.",
              fill=TEXT2, font=font(12))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(OUT / "sim-90d.png", optimize=True)
    print(f"plot ok — {OUT / 'sim-90d.png'}")


if __name__ == "__main__":
    main()
