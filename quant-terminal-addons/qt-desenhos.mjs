// qt-desenhos.mjs — desenhos extras para o Quant Terminal, usados pelo gex-sync e pelo win-sync.
// Instala (ou atualiza, depois de uma atualização do terminal) em public/js/volume-profile.js e public/js/chart.js:
//   LevelProfile  -> perfil de GEX por strike preso na escala de preço e etiquetas dos níveis (CALL WALL...)
//   PerfilVolume  -> perfil de volume por período com POC, VAH e VAL
//   Footprint     -> venda x compra, delta, volume ou negócios em cada preço de cada vela,
//                    também como tipo de gráfico (menu Candles / Heikin Ashi / Footprint)
//   Bolhas        -> bolhas no preço exato onde entrou volume grande (Big Bubbles)
import fs from 'node:fs';
import path from 'node:path';

const BLOCO = "\n// >>> level-profile (gex-sync) >>>\n// Perfil por nível de preço vindo de um indicador (ex.: GEX por strike). O indicador devolve\n// levelProfile: { rows: [{ price, value, value2?, color?, color2?, label? }], width, labels }.\n// Cada linha vira uma barra presa na lateral direita, crescendo para a esquerda conforme o valor.\n// width limita o perfil a uma fatia do gráfico (em %), para não cobrir os candles.\n// levelLines: [{ price, color, label }] escreve o nome de cada nível numa etiqueta colorida acima da linha.\nexport class LevelProfile {\n  constructor(pane, params = {}, lines = []) {\n    this.pane = pane;\n    this.p = { rows: [], width: 25, labels: true, thickness: 0.35, ...params };\n    this.lines = lines;\n    this._top = {\n      zOrder: () => \"top\",\n      renderer: () => ({\n        draw: (target) =>\n          target.useMediaCoordinateSpace(({ context, mediaSize }) => this.drawLabels(context, mediaSize)),\n      }),\n    };\n    this._view = {\n      zOrder: () => \"bottom\",\n      renderer: () => ({\n        draw: (target) =>\n          target.useMediaCoordinateSpace(({ context, mediaSize }) => this.draw(context, mediaSize)),\n      }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view, this._top]; }\n\n  drawLabels(ctx, size) {\n    if (!this.series || !this.lines.length) return;\n    ctx.font = \"bold 11px -apple-system, Segoe UI, Roboto, sans-serif\";\n    ctx.textBaseline = \"middle\";\n    ctx.textAlign = \"left\";\n    const usados = [], h = 16;\n    for (const l of [...this.lines].sort((a, b) => b.price - a.price)) {\n      const y = this.series.priceToCoordinate(l.price);\n      if (y == null || y < h || y > size.height) continue;\n      const w = ctx.measureText(l.label).width + 12;\n      let x = 8; // níveis no mesmo preço ficam lado a lado\n      for (const u of usados) if (Math.abs(u.y - y) < h && x < u.x + u.w + 4) x = u.x + u.w + 4;\n      usados.push({ x, y, w });\n      const top = y - h - 1;\n      ctx.globalAlpha = 0.92;\n      ctx.fillStyle = l.color;\n      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, top, w, h, 3); ctx.fill(); } else ctx.fillRect(x, top, w, h);\n      ctx.globalAlpha = 1;\n      ctx.fillStyle = l.text || \"#0b0e14\";\n      ctx.fillText(l.label, x + 6, top + h / 2 + 0.5);\n    }\n  }\n\n  draw(ctx, size) {\n    const rows = (this.p.rows || []).filter((r) => Number.isFinite(r.price));\n    if (!rows.length || !this.series) return;\n    const mag = (r) => Math.abs(r.value || 0) + Math.abs(r.value2 || 0);\n    const max = Math.max(...rows.map(mag));\n    if (!(max > 0)) return;\n    const W = (size.width * Math.max(5, Math.min(60, this.p.width))) / 100;\n    const xR = size.width;\n    // espessura: uma fração (thickness) da distância entre strikes vizinhos, em pixels\n    const prices = [...new Set(rows.map((r) => r.price))].sort((a, b) => a - b);\n    let gap = Infinity;\n    for (let i = 1; i < prices.length; i++) gap = Math.min(gap, prices[i] - prices[i - 1]);\n    if (!Number.isFinite(gap)) gap = prices[0] * 0.005;\n    const y0 = this.series.priceToCoordinate(prices[0]);\n    const y1 = this.series.priceToCoordinate(prices[0] + gap);\n    const h = y0 != null && y1 != null ? Math.max(1, Math.min(14, Math.abs(y0 - y1) * Math.max(0.05, Math.min(1, this.p.thickness)))) : 4;\n    ctx.font = \"10px -apple-system, Segoe UI, Roboto, sans-serif\";\n    ctx.textBaseline = \"middle\";\n    for (const r of rows) {\n      const y = this.series.priceToCoordinate(r.price);\n      if (y == null || y < -h || y > size.height + h) continue;\n      const w1 = (Math.abs(r.value || 0) / max) * W, w2 = (Math.abs(r.value2 || 0) / max) * W;\n      ctx.fillStyle = r.color || (r.value >= 0 ? \"rgba(38,166,154,0.6)\" : \"rgba(239,83,80,0.6)\");\n      ctx.fillRect(xR - w1, y - h / 2, w1, h);\n      if (w2) {\n        ctx.fillStyle = r.color2 || \"rgba(239,83,80,0.6)\";\n        ctx.fillRect(xR - w1 - w2, y - h / 2, w2, h);\n      }\n      if (this.p.labels && r.label) {\n        ctx.fillStyle = \"rgba(210,215,225,0.9)\";\n        ctx.textAlign = \"right\";\n        ctx.fillText(r.label, xR - w1 - w2 - 4, y);\n      }\n    }\n  }\n}\n// Perfil de volume por período (estilo FRVP do TradingView) com POC, VAH e VAL escritos.\n// O indicador devolve perfisVolume: [{ de, ate, passo, linhas: [{ p, c, v }], poc, vah, val, largura, estender, rotulos }]\n//   de/ate: tempos (segundos) da primeira e da última vela; linhas: preço da base da linha, volume comprador e vendedor.\nexport class PerfilVolume {\n  constructor(pane, perfis = []) {\n    this.pane = pane;\n    this.perfis = perfis;\n    const vista = (z, fn) => ({\n      zOrder: () => z,\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => fn(context, mediaSize)) }),\n    });\n    this._views = [vista(\"bottom\", (c, s) => this.desenhar(c, s, false)), vista(\"top\", (c, s) => this.desenhar(c, s, true))];\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return this._views; }\n\n  indice(bars, t, depois) { // primeira vela com time >= t (depois) ou última com time <= t\n    let lo = 0, hi = bars.length - 1, r = -1;\n    while (lo <= hi) {\n      const m = (lo + hi) >> 1;\n      if (depois ? bars[m].time >= t : bars[m].time <= t) { r = m; if (depois) hi = m - 1; else lo = m + 1; }\n      else if (depois) lo = m + 1; else hi = m - 1;\n    }\n    return r;\n  }\n\n  desenhar(ctx, size, topo) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale();\n    if (!bars?.length || !this.series) return;\n    const sp = ts.options().barSpacing || 6;\n    for (const pf of this.perfis) {\n      const a = this.indice(bars, pf.de, true), z = this.indice(bars, pf.ate, false);\n      if (a < 0 || z < a) continue;\n      const xa = ts.logicalToCoordinate(a), xz = ts.logicalToCoordinate(z);\n      if (xa == null || xz == null || xz < -50 || xa > size.width + 50) continue;\n      const x0 = xa - sp / 2, span = Math.max(sp, xz - xa + sp);\n      const W = (span * Math.max(5, Math.min(100, pf.largura || 70))) / 100;\n      const y = (p) => this.series.priceToCoordinate(p);\n      if (!topo) {\n        ctx.fillStyle = \"rgba(41,98,255,0.05)\";\n        ctx.fillRect(x0, 0, span, size.height);\n        const max = Math.max(1, ...pf.linhas.map((l) => l.c + l.v));\n        for (const l of pf.linhas) {\n          const yT = y(l.p + pf.passo), yB = y(l.p);\n          if (yT == null || yB == null) continue;\n          const h = Math.max(1, yB - yT - 1);\n          const dentro = l.p >= pf.val && l.p <= pf.vah;\n          const cw = (l.c / max) * W, vw = (l.v / max) * W;\n          ctx.fillStyle = dentro ? \"rgba(38,166,154,0.55)\" : \"rgba(38,166,154,0.22)\";\n          ctx.fillRect(x0, yT, cw, h);\n          ctx.fillStyle = dentro ? \"rgba(239,83,80,0.55)\" : \"rgba(239,83,80,0.22)\";\n          ctx.fillRect(x0 + cw, yT, vw, h);\n        }\n        continue;\n      }\n      // linhas POC / VAH / VAL com nome e preço\n      const xFim = pf.estender ? size.width : x0 + span;\n      const marcas = [\n        { nome: \"VAH\", p: pf.vah + pf.passo / 2, cor: \"#42a5f5\" },\n        { nome: \"POC\", p: pf.poc + pf.passo / 2, cor: \"#ff9800\" },\n        { nome: \"VAL\", p: pf.val + pf.passo / 2, cor: \"#42a5f5\" },\n      ];\n      ctx.font = \"bold 10px -apple-system, Segoe UI, Roboto, sans-serif\";\n      ctx.textBaseline = \"middle\";\n      for (const m of marcas) {\n        const yy = y(m.p);\n        if (yy == null) continue;\n        ctx.strokeStyle = m.cor;\n        ctx.lineWidth = m.nome === \"POC\" ? 2 : 1;\n        ctx.setLineDash(m.nome === \"POC\" ? [] : [5, 3]);\n        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(xFim, yy); ctx.stroke();\n        ctx.setLineDash([]);\n        if (pf.rotulos === false) continue;\n        const txt = `${m.nome} ${Math.round(m.p).toLocaleString(\"pt-BR\")}`;\n        const w = ctx.measureText(txt).width + 8, xr = Math.min(xFim, size.width) - w - 2;\n        ctx.globalAlpha = 0.9;\n        ctx.fillStyle = m.cor;\n        ctx.fillRect(xr, yy - 14, w, 13);\n        ctx.globalAlpha = 1;\n        ctx.fillStyle = \"#0b0e14\";\n        ctx.textAlign = \"left\";\n        ctx.fillText(txt, xr + 4, yy - 7);\n      }\n    }\n  }\n}\n// Footprint: em cada vela, uma célula por preço com o volume vendido x comprado (agressão), o delta, o volume\n// ou o número de negócios. O indicador devolve footprint: { barras: [{ time, rows: [[preço, compra, venda, negócios]], poc }],\n// passo, modo, deseq }. Com as velas largas (zoom) escreve os números; estreitas, só pinta as células.\nexport class Footprint {\n  constructor(pane, fp = {}) {\n    this.pane = pane;\n    this.fp = fp;\n    this._view = {\n      zOrder: () => \"top\",\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => this.desenhar(context, mediaSize)) }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view]; }\n\n  desenhar(ctx, size) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale(), fp = this.fp;\n    if (!bars?.length || !this.series) return;\n    if (!fp.barras?.length) {\n      ctx.font = \"13px -apple-system, Segoe UI, Roboto, sans-serif\";\n      ctx.fillStyle = \"rgba(207,214,228,0.8)\";\n      ctx.textAlign = \"center\";\n      ctx.fillText(fp.aviso || \"Footprint: abra o CSV:WIN (dados da B3).\", size.width / 2, 40);\n      return;\n    }\n    const vis = ts.getVisibleLogicalRange();\n    if (!vis) return;\n    const sp = ts.options().barSpacing || 6;\n    const meia = Math.max(1, sp / 2 - 1);\n    const passo = fp.passo, deseq = fp.deseq || 3, modo = fp.modo;\n    const y = (p) => this.series.priceToCoordinate(p);\n    const y0 = y(fp.barras[0].rows[0]?.[0] || 0), y1 = y((fp.barras[0].rows[0]?.[0] || 0) + passo);\n    const h = y0 != null && y1 != null ? Math.abs(y0 - y1) : 0;\n    const texto = sp >= 46 && h >= 9;\n    const fmt = (x) => (Math.abs(x) >= 10000 ? (x / 1000).toFixed(0) + \"k\" : Math.abs(x) >= 1000 ? (x / 1000).toFixed(1).replace(\".\", \",\") + \"k\" : String(Math.round(x)));\n    ctx.font = `${h >= 13 ? 11 : 9}px -apple-system, Segoe UI, Roboto, monospace`;\n    ctx.textBaseline = \"middle\";\n    ctx.textAlign = \"center\";\n    // índice das velas pelo tempo\n    const idx = new Map();\n    const a = Math.max(0, Math.floor(vis.from) - 1), z = Math.min(bars.length - 1, Math.ceil(vis.to) + 1);\n    for (let i = a; i <= z; i++) idx.set(bars[i].time, i);\n    // maior volume de célula entre as velas visíveis, para a intensidade da cor\n    let max = 1;\n    for (const b of fp.barras) if (idx.has(b.time)) for (const r of b.rows) max = Math.max(max, modo === \"Delta\" ? Math.abs(r[1] - r[2]) : r[1] + r[2]);\n    for (const b of fp.barras) {\n      const i = idx.get(b.time);\n      if (i === undefined) continue;\n      const x = ts.logicalToCoordinate(i);\n      if (x == null) continue;\n      const porP = new Map(b.rows.map((r) => [r[0], r]));\n      let deltaTot = 0, yMin = Infinity, yMax = -Infinity;\n      for (const r of b.rows) {\n        const [p, c, v, n] = r;\n        deltaTot += c - v;\n        const yT = y(p + passo / 2), yB = y(p - passo / 2);\n        if (yT == null || yB == null) continue;\n        yMin = Math.min(yMin, yT); yMax = Math.max(yMax, yB);\n        const hh = Math.max(1, yB - yT - (texto ? 1 : 0));\n        const d = c - v, forca = Math.min(1, (modo === \"Delta\" ? Math.abs(d) : c + v) / max);\n        if (texto) { ctx.fillStyle = \"rgba(14,17,24,0.88)\"; ctx.fillRect(x - meia, yT, meia * 2, hh); }\n        const cor = d >= 0 ? \"38,166,154\" : \"239,83,80\";\n        ctx.fillStyle = `rgba(${cor},${(0.12 + 0.6 * forca).toFixed(2)})`;\n        ctx.fillRect(x - meia, yT, meia * 2, hh);\n        if (!texto) continue;\n        // desequilíbrio: compra neste preço contra venda um degrau abaixo, e venda contra compra um degrau acima\n        const vAbaixo = porP.get(p - passo)?.[2] || 0, cAcima = porP.get(p + passo)?.[1] || 0;\n        const desC = c > 0 && c >= deseq * Math.max(1, vAbaixo), desV = v > 0 && v >= deseq * Math.max(1, cAcima);\n        const ym = yT + hh / 2;\n        if (modo === \"Venda x Compra\") {\n          ctx.fillStyle = desV ? \"#ff6b6b\" : \"#cfd6e4\";\n          ctx.font = `${desV ? \"bold \" : \"\"}${h >= 13 ? 11 : 9}px -apple-system, Segoe UI, Roboto, monospace`;\n          ctx.textAlign = \"right\"; ctx.fillText(fmt(v), x - 3, ym);\n          ctx.fillStyle = \"#6b7385\"; ctx.textAlign = \"center\"; ctx.fillText(\"x\", x, ym);\n          ctx.fillStyle = desC ? \"#3ddc97\" : \"#cfd6e4\";\n          ctx.font = `${desC ? \"bold \" : \"\"}${h >= 13 ? 11 : 9}px -apple-system, Segoe UI, Roboto, monospace`;\n          ctx.textAlign = \"left\"; ctx.fillText(fmt(c), x + 3, ym);\n          ctx.textAlign = \"center\";\n        } else {\n          const val = modo === \"Delta\" ? d : modo === \"Negocios\" ? n : c + v;\n          ctx.fillStyle = modo === \"Delta\" ? (d >= 0 ? \"#3ddc97\" : \"#ff6b6b\") : \"#cfd6e4\";\n          ctx.fillText((modo === \"Delta\" && d > 0 ? \"+\" : \"\") + fmt(val), x, ym);\n        }\n      }\n      // POC da vela\n      const pc = b.poc != null ? [y(b.poc + passo / 2), y(b.poc - passo / 2)] : null;\n      if (pc && pc[0] != null && pc[1] != null) {\n        ctx.strokeStyle = \"#ffca28\"; ctx.lineWidth = 1;\n        ctx.strokeRect(x - meia + 0.5, pc[0] + 0.5, meia * 2 - 1, Math.max(1, pc[1] - pc[0] - 1));\n      }\n      // delta da vela embaixo\n      if (sp >= 30 && Number.isFinite(yMax)) {\n        ctx.font = \"bold 10px -apple-system, Segoe UI, Roboto, sans-serif\";\n        ctx.fillStyle = deltaTot >= 0 ? \"#3ddc97\" : \"#ff6b6b\";\n        ctx.textAlign = \"center\";\n        ctx.fillText((deltaTot > 0 ? \"+\" : \"\") + fmt(deltaTot), x, yMax + 9);\n        ctx.font = `${h >= 13 ? 11 : 9}px -apple-system, Segoe UI, Roboto, monospace`;\n      }\n    }\n  }\n}\n// Bolhas no preço exato (big trades / volume clusters). O indicador devolve\n// bolhas: { itens: [{ time, p, r, lado, txt }] }: r de 0 a 1 (tamanho), lado +1 compradores / -1 vendedores.\nexport class Bolhas {\n  constructor(pane, b = {}) {\n    this.pane = pane;\n    this.b = b;\n    this._view = {\n      zOrder: () => \"top\",\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => this.desenhar(context, mediaSize)) }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view]; }\n\n  desenhar(ctx, size) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale(), itens = this.b.itens || [];\n    if (!bars?.length || !this.series || !itens.length) return;\n    const vis = ts.getVisibleLogicalRange();\n    if (!vis) return;\n    const sp = ts.options().barSpacing || 6;\n    const rMax = Math.max(9, Math.min(34, sp * 2.2)) * (this.b.escala || 1);\n    const idx = new Map();\n    const a = Math.max(0, Math.floor(vis.from) - 3), z = Math.min(bars.length - 1, Math.ceil(vis.to) + 3);\n    for (let i = a; i <= z; i++) idx.set(bars[i].time, i);\n    const cores = { 1: \"38,198,140\", \"-1\": \"171,71,188\" }; // verde compradores, roxo vendedores\n    ctx.textAlign = \"center\";\n    ctx.textBaseline = \"middle\";\n    for (const it of [...itens].sort((x, y) => x.r - y.r)) {\n      const i = idx.get(it.time);\n      if (i === undefined) continue;\n      const x = ts.logicalToCoordinate(i), y = this.series.priceToCoordinate(it.p);\n      if (x == null || y == null) continue;\n      const r = 3 + it.r * rMax, cor = cores[it.lado] || cores[1];\n      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);\n      g.addColorStop(0, `rgba(${cor},0.85)`);\n      g.addColorStop(1, `rgba(${cor},0.35)`);\n      ctx.fillStyle = g;\n      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();\n      ctx.strokeStyle = `rgba(${cor},0.95)`; ctx.lineWidth = 1; ctx.stroke();\n      if (it.txt && r >= 11) {\n        ctx.font = `bold ${r >= 18 ? 11 : 9}px -apple-system, Segoe UI, Roboto, sans-serif`;\n        ctx.fillStyle = \"#ffffff\";\n        ctx.fillText(it.txt, x, y);\n      }\n    }\n  }\n}\n// <<< level-profile (gex-sync) <<<\n";
const INICIO = '\n// >>> level-profile (gex-sync) >>>', FIM = '// <<< level-profile (gex-sync) <<<';
const GANCHO = `      // >>> gex-sync
      if (res.levelProfile || res.levelLines) {
        const lp = new LevelProfile(this, res.levelProfile || {}, res.levelLines || []);
        this.main.attachPrimitive(lp);
        this.vpPrims.push(lp);
      }
      if (res.perfisVolume) {
        const pv = new PerfilVolume(this, res.perfisVolume);
        this.main.attachPrimitive(pv);
        this.vpPrims.push(pv);
      }
      if (res.footprint) {
        const fp = new Footprint(this, res.footprint);
        this.main.attachPrimitive(fp);
        this.vpPrims.push(fp);
      }
      if (res.bolhas) {
        const bo = new Bolhas(this, res.bolhas);
        this.main.attachPrimitive(bo);
        this.vpPrims.push(bo);
      }
      // <<< gex-sync
`;
const GANCHOS_ANTIGOS = [
  `      if (res.levelProfile) { // gex-sync
        const lp = new LevelProfile(this, res.levelProfile);
        this.main.attachPrimitive(lp);
        this.vpPrims.push(lp);
      }
`,
  `      if (res.levelProfile || res.levelLines) { // gex-sync
        const lp = new LevelProfile(this, res.levelProfile || {}, res.levelLines || []);
        this.main.attachPrimitive(lp);
        this.vpPrims.push(lp);
      }
`,
];
const PONTO = '      const outs = def.outputs.filter((o) => Array.isArray(res[o.key]));';
const IMPORT_RE = /import \{ VolumeProfile, SessionVolumeProfile, RangeVolumeProfile[^}]*\} from "\.\/volume-profile\.js";/;
const IMPORT = 'import { VolumeProfile, SessionVolumeProfile, RangeVolumeProfile, LevelProfile, PerfilVolume, Footprint, Bolhas } from "./volume-profile.js";';

// Footprint como tipo de gráfico (menu Candles / Heikin Ashi / ...). Cada item: [âncora, texto novo, antes?]
const TIPO = [
  ['  ["heikin", "Heikin Ashi"],\n', '  ["footprint", "Footprint"], // gex-sync\n', false],
  ['    else\n      this.main = this.chart.addSeries(LW.CandlestickSeries, {\n        ...common,\n        upColor: up,', `    else if (t === "footprint") // gex-sync
      this.main = this.chart.addSeries(LW.CandlestickSeries, {
        ...common,
        upColor: "rgba(38,166,154,0.12)",
        downColor: "rgba(239,83,80,0.12)",
        borderVisible: false,
        wickUpColor: "rgba(38,166,154,0.45)",
        wickDownColor: "rgba(239,83,80,0.45)",
      });
`, true],
  ['    const simple = [\n      "candles",', '    const simple = [\n      "footprint", // gex-sync\n      "candles",', 'troca'],
  ["    // candle colours from indicators (Pine's barcolor), only on charts drawn from the real bars\n", `    // >>> gex-sync footprint
    if (this.cfg.type === "footprint" && n && !this.cfg.indicators.some((x) => x.id === "custom:footprint-win" && !x.hidden)) {
      let fp = { barras: [], aviso: "Footprint: rode node scripts/win-sync.mjs e abra o CSV:WIN." };
      if (BY_ID["custom:footprint-win"]) {
        try { fp = compute("custom:footprint-win", bars, {}).footprint || fp; } catch { /* sem dados */ }
        if (!fp.barras?.length) fp.aviso = "Footprint so tem dados no CSV:WIN (negocios da B3).";
      }
      const prim = new Footprint(this, fp);
      this.main.attachPrimitive(prim);
      this.vpPrims.push(prim);
    }
    // <<< gex-sync footprint
`, true],
];
function aplicarTipo(b) {
  if (b.includes('["footprint", "Footprint"]')) return b;
  for (const [ancora, novo, antes] of TIPO) {
    if (!b.includes(ancora)) return null;
    b = b.replace(ancora, antes === 'troca' ? novo : antes ? novo + ancora : ancora + novo);
  }
  return b;
}

export function instalarDesenhos(raiz) {
  const vp = path.join(raiz, 'public', 'js', 'volume-profile.js'), ch = path.join(raiz, 'public', 'js', 'chart.js');
  if (!fs.existsSync(vp) || !fs.existsSync(ch)) return 'nao achei public/js do terminal';
  const a0 = fs.readFileSync(vp, 'utf8'), b0 = fs.readFileSync(ch, 'utf8');
  // volume-profile.js: troca o bloco inteiro pela versão atual
  let a = a0;
  const i = a.indexOf(INICIO), f = a.indexOf(FIM);
  a = i < 0 ? a + BLOCO : a.slice(0, i) + BLOCO + a.slice(f + FIM.length + 1);
  // chart.js: import e gancho
  let b = b0;
  if (!IMPORT_RE.test(b) || !b.includes(PONTO)) return 'esta versao do terminal mudou; me avise no chat';
  b = b.replace(IMPORT_RE, IMPORT);
  for (const g of GANCHOS_ANTIGOS) b = b.replace(g, '');
  const gi = b.indexOf('      // >>> gex-sync\n'), gf = b.indexOf('      // <<< gex-sync\n');
  if (gi >= 0 && gf > gi) b = b.slice(0, gi) + b.slice(gf + '      // <<< gex-sync\n'.length);
  b = b.replace(PONTO, GANCHO + PONTO);
  const bt = aplicarTipo(b);
  if (bt === null) return 'esta versao do terminal mudou (tipo footprint); me avise no chat';
  b = bt;
  if (a === a0 && b === b0) return 'ok';
  fs.writeFileSync(vp, a); fs.writeFileSync(ch, b);
  return 'instalado';
}
