// qt-desenhos.mjs — desenhos extras para o Quant Terminal, usados pelo gex-sync e pelo win-sync.
// Instala (ou atualiza, depois de uma atualização do terminal) em public/js/volume-profile.js e public/js/chart.js:
//   LevelProfile  -> perfil de GEX por strike preso na escala de preço e etiquetas dos níveis (CALL WALL...)
//   PerfilVolume  -> perfil de volume por período com POC, VAH e VAL
//   Footprint     -> venda x compra, delta, volume ou negócios em cada preço de cada vela,
//                    também como tipo de gráfico (menu Candles / Heikin Ashi / Footprint)
//   Bolhas        -> bolhas no preço exato onde entrou volume grande (Big Bubbles)
//   Posição       -> ferramenta long/short com entrada, stop e alvo ajustáveis e R:R livre (padrão 3:1)
import fs from 'node:fs';
import path from 'node:path';

const BLOCO = "\n// >>> level-profile (gex-sync) >>>\n// Perfil por nível de preço vindo de um indicador (ex.: GEX por strike). O indicador devolve\n// levelProfile: { rows: [{ price, value, value2?, color?, color2?, label? }], width, labels }.\n// Cada linha vira uma barra presa na lateral direita, crescendo para a esquerda conforme o valor.\n// width limita o perfil a uma fatia do gráfico (em %), para não cobrir os candles.\n// levelLines: [{ price, color, label }] escreve o nome de cada nível numa etiqueta colorida acima da linha.\nexport class LevelProfile {\n  constructor(pane, params = {}, lines = []) {\n    this.pane = pane;\n    this.p = { rows: [], width: 25, labels: true, thickness: 0.35, ...params };\n    this.lines = lines;\n    this._top = {\n      zOrder: () => \"top\",\n      renderer: () => ({\n        draw: (target) =>\n          target.useMediaCoordinateSpace(({ context, mediaSize }) => this.drawLabels(context, mediaSize)),\n      }),\n    };\n    this._view = {\n      zOrder: () => \"bottom\",\n      renderer: () => ({\n        draw: (target) =>\n          target.useMediaCoordinateSpace(({ context, mediaSize }) => this.draw(context, mediaSize)),\n      }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view, this._top]; }\n\n  drawLabels(ctx, size) {\n    if (!this.series || !this.lines.length) return;\n    ctx.font = \"bold 11px -apple-system, Segoe UI, Roboto, sans-serif\";\n    ctx.textBaseline = \"middle\";\n    ctx.textAlign = \"left\";\n    const usados = [], h = 16;\n    for (const l of [...this.lines].sort((a, b) => b.price - a.price)) {\n      const y = this.series.priceToCoordinate(l.price);\n      if (y == null || y < h || y > size.height) continue;\n      const w = ctx.measureText(l.label).width + 12;\n      let x = 8; // níveis no mesmo preço ficam lado a lado\n      for (const u of usados) if (Math.abs(u.y - y) < h && x < u.x + u.w + 4) x = u.x + u.w + 4;\n      usados.push({ x, y, w });\n      const top = y - h - 1;\n      ctx.globalAlpha = 0.92;\n      ctx.fillStyle = l.color;\n      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, top, w, h, 3); ctx.fill(); } else ctx.fillRect(x, top, w, h);\n      ctx.globalAlpha = 1;\n      ctx.fillStyle = l.text || \"#0b0e14\";\n      ctx.fillText(l.label, x + 6, top + h / 2 + 0.5);\n    }\n  }\n\n  draw(ctx, size) {\n    const rows = (this.p.rows || []).filter((r) => Number.isFinite(r.price));\n    if (!rows.length || !this.series) return;\n    const mag = (r) => Math.abs(r.value || 0) + Math.abs(r.value2 || 0);\n    const max = Math.max(...rows.map(mag));\n    if (!(max > 0)) return;\n    const W = (size.width * Math.max(5, Math.min(60, this.p.width))) / 100;\n    const xR = size.width;\n    // espessura: uma fração (thickness) da distância entre strikes vizinhos, em pixels\n    const prices = [...new Set(rows.map((r) => r.price))].sort((a, b) => a - b);\n    let gap = Infinity;\n    for (let i = 1; i < prices.length; i++) gap = Math.min(gap, prices[i] - prices[i - 1]);\n    if (!Number.isFinite(gap)) gap = prices[0] * 0.005;\n    const y0 = this.series.priceToCoordinate(prices[0]);\n    const y1 = this.series.priceToCoordinate(prices[0] + gap);\n    const h = y0 != null && y1 != null ? Math.max(1, Math.min(14, Math.abs(y0 - y1) * Math.max(0.05, Math.min(1, this.p.thickness)))) : 4;\n    ctx.font = \"10px -apple-system, Segoe UI, Roboto, sans-serif\";\n    ctx.textBaseline = \"middle\";\n    for (const r of rows) {\n      const y = this.series.priceToCoordinate(r.price);\n      if (y == null || y < -h || y > size.height + h) continue;\n      const w1 = (Math.abs(r.value || 0) / max) * W, w2 = (Math.abs(r.value2 || 0) / max) * W;\n      ctx.fillStyle = r.color || (r.value >= 0 ? \"rgba(38,166,154,0.6)\" : \"rgba(239,83,80,0.6)\");\n      ctx.fillRect(xR - w1, y - h / 2, w1, h);\n      if (w2) {\n        ctx.fillStyle = r.color2 || \"rgba(239,83,80,0.6)\";\n        ctx.fillRect(xR - w1 - w2, y - h / 2, w2, h);\n      }\n      if (this.p.labels && r.label) {\n        ctx.fillStyle = \"rgba(210,215,225,0.9)\";\n        ctx.textAlign = \"right\";\n        ctx.fillText(r.label, xR - w1 - w2 - 4, y);\n      }\n    }\n  }\n}\n// Perfil de volume por período (estilo FRVP do TradingView) com POC, VAH e VAL escritos.\n// O indicador devolve perfisVolume: [{ de, ate, passo, linhas: [{ p, c, v }], poc, vah, val, largura, estender, rotulos }]\n//   de/ate: tempos (segundos) da primeira e da última vela; linhas: preço da base da linha, volume comprador e vendedor.\nexport class PerfilVolume {\n  constructor(pane, perfis = []) {\n    this.pane = pane;\n    this.perfis = perfis;\n    const vista = (z, fn) => ({\n      zOrder: () => z,\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => fn(context, mediaSize)) }),\n    });\n    this._views = [vista(\"bottom\", (c, s) => this.desenhar(c, s, false)), vista(\"top\", (c, s) => this.desenhar(c, s, true))];\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return this._views; }\n\n  indice(bars, t, depois) { // primeira vela com time >= t (depois) ou última com time <= t\n    let lo = 0, hi = bars.length - 1, r = -1;\n    while (lo <= hi) {\n      const m = (lo + hi) >> 1;\n      if (depois ? bars[m].time >= t : bars[m].time <= t) { r = m; if (depois) hi = m - 1; else lo = m + 1; }\n      else if (depois) lo = m + 1; else hi = m - 1;\n    }\n    return r;\n  }\n\n  desenhar(ctx, size, topo) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale();\n    if (!bars?.length || !this.series) return;\n    const sp = ts.options().barSpacing || 6;\n    for (const pf of this.perfis) {\n      const a = this.indice(bars, pf.de, true), z = this.indice(bars, pf.ate, false);\n      if (a < 0 || z < a) continue;\n      const xa = ts.logicalToCoordinate(a), xz = ts.logicalToCoordinate(z);\n      if (xa == null || xz == null || xz < -50 || xa > size.width + 50) continue;\n      const x0 = xa - sp / 2, span = Math.max(sp, xz - xa + sp);\n      const W = (span * Math.max(5, Math.min(100, pf.largura || 70))) / 100;\n      const y = (p) => this.series.priceToCoordinate(p);\n      if (!topo) {\n        ctx.fillStyle = \"rgba(41,98,255,0.05)\";\n        ctx.fillRect(x0, 0, span, size.height);\n        const max = Math.max(1, ...pf.linhas.map((l) => l.c + l.v));\n        for (const l of pf.linhas) {\n          const yT = y(l.p + pf.passo), yB = y(l.p);\n          if (yT == null || yB == null) continue;\n          const h = Math.max(1, yB - yT - 1);\n          const dentro = l.p >= pf.val && l.p <= pf.vah;\n          const cw = (l.c / max) * W, vw = (l.v / max) * W;\n          ctx.fillStyle = dentro ? \"rgba(38,166,154,0.55)\" : \"rgba(38,166,154,0.22)\";\n          ctx.fillRect(x0, yT, cw, h);\n          ctx.fillStyle = dentro ? \"rgba(239,83,80,0.55)\" : \"rgba(239,83,80,0.22)\";\n          ctx.fillRect(x0 + cw, yT, vw, h);\n        }\n        continue;\n      }\n      // linhas POC / VAH / VAL com nome e preço\n      const xFim = pf.estender ? size.width : x0 + span;\n      const marcas = [\n        { nome: \"VAH\", p: pf.vah + pf.passo / 2, cor: \"#42a5f5\" },\n        { nome: \"POC\", p: pf.poc + pf.passo / 2, cor: \"#ff9800\" },\n        { nome: \"VAL\", p: pf.val + pf.passo / 2, cor: \"#42a5f5\" },\n      ];\n      ctx.font = \"bold 10px -apple-system, Segoe UI, Roboto, sans-serif\";\n      ctx.textBaseline = \"middle\";\n      for (const m of marcas) {\n        const yy = y(m.p);\n        if (yy == null) continue;\n        ctx.strokeStyle = m.cor;\n        ctx.lineWidth = m.nome === \"POC\" ? 2 : 1;\n        ctx.setLineDash(m.nome === \"POC\" ? [] : [5, 3]);\n        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(xFim, yy); ctx.stroke();\n        ctx.setLineDash([]);\n        if (pf.rotulos === false) continue;\n        const txt = `${m.nome} ${(Math.round(m.p * 10) / 10).toLocaleString(\"pt-BR\", { maximumFractionDigits: 1 })}`;\n        const w = ctx.measureText(txt).width + 8, xr = Math.min(xFim, size.width) - w - 2;\n        ctx.globalAlpha = 0.9;\n        ctx.fillStyle = m.cor;\n        ctx.fillRect(xr, yy - 14, w, 13);\n        ctx.globalAlpha = 1;\n        ctx.fillStyle = \"#0b0e14\";\n        ctx.textAlign = \"left\";\n        ctx.fillText(txt, xr + 4, yy - 7);\n      }\n    }\n  }\n}\n// Footprint: em cada vela, uma linha por preço com uma barra do tamanho do volume negociado ali e o volume\n// vendido x comprado (ou delta, volume, negócios). O indicador devolve footprint: { barras: [{ time, rows:\n// [[preço, compra, venda, negócios]], poc }], passo, modo, deseq, tipo, aviso }.\n// tipo = true quando é o tipo de gráfico \"Footprint\": de longe desenha candles, de perto o interior da vela.\n// Embaixo do gráfico, uma faixa com o delta de cada vela fica sempre visível.\nexport class Footprint {\n  constructor(pane, fp = {}) {\n    this.pane = pane;\n    this.fp = fp;\n    this.delta = new Map((fp.barras || []).map((b) => [b.time, b.rows.reduce((s, r) => s + r[1] - r[2], 0)]));\n    this.porTempo = new Map((fp.barras || []).map((b) => [b.time, b]));\n    this._view = {\n      zOrder: () => \"normal\", // as bolhas (top) ficam por cima\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => this.desenhar(context, mediaSize)) }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view]; }\n\n  desenhar(ctx, size) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale(), fp = this.fp;\n    if (!bars?.length || !this.series) return;\n    const vis = ts.getVisibleLogicalRange();\n    if (!vis) return;\n    const sp = ts.options().barSpacing || 6;\n    const zoom = sp >= (fp.limiar || 34);\n    const a = Math.max(0, Math.floor(vis.from) - 1), z = Math.min(bars.length - 1, Math.ceil(vis.to) + 1);\n    const y = (p) => this.series.priceToCoordinate(p);\n    const fmt = (x) => (Math.abs(x) >= 10000 ? (x / 1000).toFixed(0) + \"k\" : Math.abs(x) >= 1000 ? (x / 1000).toFixed(1).replace(\".\", \",\") + \"k\" : String(Math.round(x)));\n    const fonte = (px, b) => `${b ? \"bold \" : \"\"}${px}px -apple-system, Segoe UI, Roboto, sans-serif`;\n    const temDados = this.porTempo.size > 0;\n\n    // 1) tipo de gráfico Footprint: candles desenhados aqui (a série fica transparente)\n    if (fp.tipo) {\n      const corpo = Math.max(1, Math.min(zoom ? 4 : sp * 0.7, 40));\n      for (let i = a; i <= z; i++) {\n        const b = bars[i];\n        if (zoom && this.porTempo.has(b.time)) continue; // de perto: o interior da vela no lugar do candle\n        const x = ts.logicalToCoordinate(i), yo = y(b.open), yc = y(b.close), yh = y(b.high), yl = y(b.low);\n        if (x == null || yo == null || yc == null || yh == null || yl == null) continue;\n        const cor = b.close >= b.open ? \"#26a69a\" : \"#ef5350\";\n        ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1;\n        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, yh); ctx.lineTo(Math.round(x) + 0.5, yl); ctx.stroke();\n        ctx.fillRect(x - corpo / 2, Math.min(yo, yc), corpo, Math.max(1, Math.abs(yc - yo)));\n      }\n    }\n    if (!temDados) {\n      if (fp.aviso) {\n        ctx.font = fonte(12); ctx.fillStyle = \"rgba(207,214,228,0.75)\"; ctx.textAlign = \"center\";\n        ctx.fillText(fp.aviso, size.width / 2, size.height - 30);\n      }\n      return;\n    }\n\n    // 2) interior das velas\n    if (zoom || !fp.tipo) {\n      const passo = fp.passo, deseq = fp.deseq || 3, modo = fp.modo;\n      const meia = Math.max(1, sp / 2 - 1);\n      const p0 = fp.barras[0].rows[0]?.[0] || 0, y0 = y(p0), y1 = y(p0 + passo);\n      const h = y0 != null && y1 != null ? Math.abs(y0 - y1) : 0;\n      const texto = sp >= 46 && h >= 7.5;\n      const px = h >= 13 ? 11 : h >= 9 ? 9 : 8;\n      ctx.textBaseline = \"middle\";\n      for (let i = a; i <= z; i++) {\n        const b = this.porTempo.get(bars[i].time);\n        if (!b) continue;\n        const x = ts.logicalToCoordinate(i);\n        if (x == null) continue;\n        const porP = new Map(b.rows.map((r) => [r[0], r]));\n        const maxV = Math.max(1, ...b.rows.map((r) => r[1] + r[2]));\n        const xe = x - meia + (fp.tipo ? 5 : 0), larg = meia * 2 - (fp.tipo ? 5 : 0);\n        let yMax = -Infinity;\n        for (const r of b.rows) {\n          const [p, c, v, n] = r;\n          const yT = y(p + passo / 2), yB = y(p - passo / 2);\n          if (yT == null || yB == null) continue;\n          yMax = Math.max(yMax, yB);\n          const hh = Math.max(1, yB - yT - (h >= 4 ? 1 : 0));\n          const d = c - v;\n          // fundo e barra do tamanho do volume naquele preço\n          ctx.fillStyle = \"rgba(20,24,33,0.92)\";\n          ctx.fillRect(xe, yT, larg, hh);\n          const forca = (c + v) / maxV, cor = d >= 0 ? \"38,166,154\" : \"239,83,80\";\n          ctx.fillStyle = `rgba(${cor},${(0.3 + 0.45 * Math.abs(d) / Math.max(1, c + v)).toFixed(2)})`;\n          ctx.fillRect(xe, yT, Math.max(1, larg * forca), hh);\n          if (!texto) continue;\n          const vAbaixo = porP.get(p - passo)?.[2] || 0, cAcima = porP.get(p + passo)?.[1] || 0;\n          const desC = c > 0 && c >= deseq * Math.max(1, vAbaixo), desV = v > 0 && v >= deseq * Math.max(1, cAcima);\n          const ym = yT + hh / 2, xm = xe + larg / 2;\n          if (modo === \"Venda x Compra\" || !modo) {\n            ctx.font = fonte(px, desV); ctx.fillStyle = desV ? \"#ff6b6b\" : \"#dfe5f0\"; ctx.textAlign = \"right\"; ctx.fillText(fmt(v), xm - 4, ym);\n            ctx.font = fonte(px); ctx.fillStyle = \"#6b7385\"; ctx.textAlign = \"center\"; ctx.fillText(\"x\", xm, ym);\n            ctx.font = fonte(px, desC); ctx.fillStyle = desC ? \"#3ddc97\" : \"#dfe5f0\"; ctx.textAlign = \"left\"; ctx.fillText(fmt(c), xm + 4, ym);\n          } else {\n            const val = modo === \"Delta\" ? d : modo === \"Negocios\" ? n : c + v;\n            ctx.font = fonte(px); ctx.textAlign = \"center\";\n            ctx.fillStyle = modo === \"Delta\" ? (d >= 0 ? \"#3ddc97\" : \"#ff6b6b\") : \"#dfe5f0\";\n            ctx.fillText((modo === \"Delta\" && d > 0 ? \"+\" : \"\") + fmt(val), xm, ym);\n          }\n        }\n        // candle fininho à esquerda, para não perder a abertura e o fechamento\n        if (fp.tipo) {\n          const k = bars[i], yo = y(k.open), yc = y(k.close), yh = y(k.high), yl = y(k.low);\n          if (yo != null && yc != null && yh != null && yl != null) {\n            const cor = k.close >= k.open ? \"#26a69a\" : \"#ef5350\";\n            ctx.fillStyle = cor; ctx.fillRect(x - meia, yh, 1, Math.max(1, yl - yh));\n            ctx.fillRect(x - meia, Math.min(yo, yc), 3, Math.max(1, Math.abs(yc - yo)));\n          }\n        }\n        // POC da vela\n        const pc = [y(b.poc + passo / 2), y(b.poc - passo / 2)];\n        if (pc[0] != null && pc[1] != null) {\n          ctx.strokeStyle = \"#ffca28\"; ctx.lineWidth = 1.5;\n          ctx.strokeRect(xe + 0.5, pc[0] + 0.5, larg - 1, Math.max(1, pc[1] - pc[0] - 1));\n        }\n      }\n    }\n\n    // 3) faixa de delta sempre visível, junto do volume: número deitado nas velas largas, em pé nas estreitas\n    const deitado = sp >= 26, empe = !deitado && sp >= 7;\n    const hF = deitado ? 20 : empe ? 40 : 12, yF = size.height - hF - 1;\n    let maxD = 1;\n    for (let i = a; i <= z; i++) maxD = Math.max(maxD, Math.abs(this.delta.get(bars[i].time) || 0));\n    ctx.fillStyle = \"rgba(14,17,24,0.8)\";\n    ctx.fillRect(0, yF - 1, size.width, hF + 2);\n    ctx.textBaseline = \"middle\";\n    for (let i = a; i <= z; i++) {\n      const dt = this.delta.get(bars[i].time);\n      if (dt === undefined) continue;\n      const x = ts.logicalToCoordinate(i);\n      if (x == null) continue;\n      const w = Math.max(1, sp - 1), f = Math.abs(dt) / maxD;\n      ctx.fillStyle = `rgba(${dt >= 0 ? \"38,166,154\" : \"239,83,80\"},${(0.25 + 0.7 * f).toFixed(2)})`;\n      ctx.fillRect(x - w / 2, yF, w, hF);\n      const txt = (dt > 0 ? \"+\" : \"\") + fmt(dt);\n      ctx.fillStyle = \"#ffffff\";\n      if (deitado) { ctx.font = fonte(sp >= 46 ? 12 : 11, true); ctx.textAlign = \"center\"; ctx.fillText(txt, x, yF + hF / 2 + 0.5); }\n      else if (empe) {\n        ctx.save(); ctx.translate(x, yF + hF / 2); ctx.rotate(-Math.PI / 2);\n        ctx.font = fonte(Math.max(8, Math.min(11, sp - 1)), true); ctx.textAlign = \"center\"; ctx.fillText(txt, 0, 0.5);\n        ctx.restore();\n      }\n    }\n    ctx.font = fonte(10, true); ctx.textAlign = \"left\"; ctx.fillStyle = \"rgba(207,214,228,0.8)\";\n    ctx.fillText(\"DELTA\", 4, yF - 7);\n  }\n}\n// Bolhas no preço exato (big trades / volume clusters). O indicador devolve\n// bolhas: { itens: [{ time, p, r, lado, txt, sub }], opacidade }: r de 0 a 1 (tamanho), lado +1 compradores /\n// -1 vendedores / 0 disputa; sub = segunda linha (ex.: \"V 68%\").\nexport class Bolhas {\n  constructor(pane, b = {}) {\n    this.pane = pane;\n    this.b = b;\n    this._view = {\n      zOrder: () => \"top\",\n      renderer: () => ({ draw: (t) => t.useMediaCoordinateSpace(({ context, mediaSize }) => this.desenhar(context, mediaSize)) }),\n    };\n  }\n  attached({ series, requestUpdate }) { this.series = series; this.requestUpdate = requestUpdate; }\n  detached() { this.series = null; }\n  updateAllViews() {}\n  paneViews() { return [this._view]; }\n\n  desenhar(ctx, size) {\n    const bars = this.pane.shown, ts = this.pane.chart.timeScale(), itens = this.b.itens || [], zonas = this.b.zonas || [];\n    if (!bars?.length || !this.series || (!itens.length && !zonas.length)) return;\n    const vis = ts.getVisibleLogicalRange();\n    if (!vis) return;\n    const sp = ts.options().barSpacing || 6;\n    const rMax = Math.max(12, Math.min(40, sp * 2.6)) * (this.b.escala || 1);\n    const idx = new Map();\n    const a = Math.max(0, Math.floor(vis.from) - 3), z = Math.min(bars.length - 1, Math.ceil(vis.to) + 3);\n    for (let i = a; i <= z; i++) idx.set(bars[i].time, i);\n    // caixas de ABSORÇÃO (laranja) e EXAUSTÃO (roxo), por baixo das bolhas\n    const xDe = (t) => { let lo = 0, hi = bars.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].time < t) lo = m + 1; else hi = m; } return ts.logicalToCoordinate(lo); };\n    for (const zn of zonas) {\n      const xa = xDe(zn.de), xb = xDe(zn.ate), ya = this.series.priceToCoordinate(zn.pmax), yb = this.series.priceToCoordinate(zn.pmin);\n      if (xa == null || xb == null || ya == null || yb == null) continue;\n      const x0 = xa - sp / 2, w = Math.max(sp, xb - xa + sp), y0 = Math.min(ya, yb) - 3, h = Math.abs(yb - ya) + 6;\n      const cor = zn.tipo === \"abs\" ? \"255,152,0\" : \"179,136,255\";\n      if (this.b.discreto) { // so a caixa: laranja = absorcao, roxa = exaustao, sem texto\n        ctx.fillStyle = `rgba(${cor},0.07)`; ctx.fillRect(x0, y0, w, h);\n        ctx.strokeStyle = `rgba(${cor},0.85)`; ctx.lineWidth = 1.2; ctx.strokeRect(x0, y0, w, h);\n        continue;\n      }\n      ctx.fillStyle = `rgba(${cor},0.10)`; ctx.fillRect(x0, y0, w, h);\n      ctx.strokeStyle = `rgba(${cor},0.95)`; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, w, h);\n      ctx.font = \"bold 10px -apple-system, Segoe UI, Roboto, sans-serif\";\n      const tw = ctx.measureText(zn.rotulo).width + 10, ly = zn.lado < 0 ? y0 + h + 3 : y0 - 17;\n      ctx.fillStyle = `rgba(${cor},0.95)`; ctx.fillRect(x0, ly, tw, 14);\n      ctx.fillStyle = \"#111\"; ctx.textAlign = \"left\"; ctx.textBaseline = \"middle\"; ctx.fillText(zn.rotulo, x0 + 5, ly + 7.5);\n    }\n    const cores = { 1: \"0,230,140\", \"-1\": \"190,70,255\", 0: \"255,193,7\" }; // verde compradores, roxo vendedores, amarelo disputa\n    const op = Math.max(0.1, Math.min(1, this.b.opacidade ?? 0.6));\n    ctx.textAlign = \"center\";\n    ctx.textBaseline = \"middle\";\n    for (const it of [...itens].sort((x, y) => x.r - y.r)) {\n      const i = idx.get(it.time);\n      if (i === undefined) continue;\n      const x = ts.logicalToCoordinate(i), y = this.series.priceToCoordinate(it.p);\n      if (x == null || y == null) continue;\n      const r = 5 + it.r * rMax, cor = cores[it.lado] ?? cores[0];\n      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);\n      g.addColorStop(0, `rgba(${cor},${op.toFixed(2)})`);\n      g.addColorStop(1, `rgba(${cor},${(op * 0.55).toFixed(2)})`);\n      ctx.shadowColor = `rgba(${cor},${(op * 0.9).toFixed(2)})`; ctx.shadowBlur = 8;\n      ctx.fillStyle = g;\n      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();\n      ctx.shadowBlur = 0;\n      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.9, op + 0.2).toFixed(2)})`; ctx.lineWidth = 1.5; ctx.stroke();\n      if (it.txt && r >= 10) {\n        ctx.font = `bold ${r >= 18 ? 11 : 9}px -apple-system, Segoe UI, Roboto, sans-serif`;\n        ctx.fillStyle = it.lado === 0 ? \"#1b1b1b\" : \"#ffffff\";\n        const duas = it.sub && r >= 15;\n        ctx.fillText(it.txt, x, duas ? y - 5 : y);\n        if (duas) { ctx.font = `bold 9px -apple-system, Segoe UI, Roboto, sans-serif`; ctx.fillText(it.sub, x, y + 7); }\n      }\n    }\n  }\n}\n// <<< level-profile (gex-sync) <<<\n";
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
        upColor: "rgba(0,0,0,0)",
        downColor: "rgba(0,0,0,0)",
        borderVisible: false,
        wickVisible: false,
        priceLineColor: "#9aa4b2",
      });
`, true],
  ['    const simple = [\n      "candles",', '    const simple = [\n      "footprint", // gex-sync\n      "candles",', 'troca'],
  ["    // candle colours from indicators (Pine's barcolor), only on charts drawn from the real bars\n", `    // >>> gex-sync footprint
    if (this.cfg.type === "footprint" && n && !this.cfg.indicators.some((x) => x.id === "custom:footprint-win" && !x.hidden)) {
      let fp = { barras: [], aviso: "Footprint: rode node scripts/win-sync.mjs e abra o CSV:WIN ou o CSV:WDO." };
      if (BY_ID["custom:footprint-win"] && /^CSV:(WIN|WDO)/.test(this.cfg.symbol || "")) {
        try { fp = compute("custom:footprint-win", bars, {}).footprint || fp; } catch { /* sem dados */ }
      } else if (BY_ID["custom:footprint-win"]) fp.aviso = "Footprint so tem dados no CSV:WIN e no CSV:WDO (negocios da B3). Aqui: candles.";
      const prim = new Footprint(this, { ...fp, tipo: true });
      this.main.attachPrimitive(prim);
      this.vpPrims.push(prim);
    }
    // <<< gex-sync footprint
`, true],
];
function aplicarTipo(b) {
  // tira a versão anterior (se houver) antes de pôr a atual
  b = b.replace('  ["footprint", "Footprint"], // gex-sync\n', '')
    .replace(/    else if \(t === "footprint"\) \/\/ gex-sync\n[\s\S]*?      \}\);\n/, '')
    .replace('      "footprint", // gex-sync\n', '')
    .replace(/    \/\/ >>> gex-sync footprint\n[\s\S]*?    \/\/ <<< gex-sync footprint\n/, '');
  for (const [ancora, novo, antes] of TIPO) {
    if (!b.includes(ancora)) return null;
    b = b.replace(ancora, antes === 'troca' ? novo : antes ? novo + ancora : ancora + novo);
  }
  return b;
}

// Perfil de volume como ferramenta de desenho (barra da esquerda): dois cliques, início e fim.
const DESENHO = [
  ['import { BY_ID, compute } from "../lib/indicators.js"; // gex-sync\nimport { PerfilVolume } from "./volume-profile.js"; // gex-sync\n', null, 'topo'],
  ['  {\n    id: "fib",\n    label: "Fib retracement",', `  {
    id: "vprofile", // gex-sync
    label: "Perfil de volume (POC VAH VAL)",
    points: 2,
    icon: '<path d="M4 3v18M4 6h8M4 9h13M4 12h16M4 15h10M4 18h5"/>',
  },
`, true],
  ['      case "rect": {\n', `      case "vprofile": { // gex-sync
        desenharPerfil(this, ctx, size, d, a, b, active);
        break;
      }
`, true],
  ['      else if (["rect", "fib", "measure", "long", "short"].includes(d.type)) {', '      else if (["rect", "fib", "measure", "long", "short", "vprofile"].includes(d.type)) {', 'troca'],
];
const FUNCAO_PERFIL = `
// >>> gex-sync perfil
const _pvCache = new Map();
function desenharPerfil(layer, ctx, size, d, a, b, active) {
  const pane = layer.pane, bars = pane.shown || [];
  const t0 = Math.min(d.points[0].time, d.points[1].time), t1 = Math.max(d.points[0].time, d.points[1].time);
  const key = [t0, t1, bars.length, bars.at(-1)?.time, pane.cfg?.symbol, pane.cfg?.tf].join(":");
  let pf = _pvCache.get(key);
  if (pf === undefined) {
    pf = null;
    try {
      if (BY_ID["custom:perfil-volume"])
        pf = compute("custom:perfil-volume", bars, { inicio: t0, fim: t1, modo: "Periodo escolhido", estender: "Nao", largura: 70 }).perfisVolume?.[0] || null;
    } catch { pf = null; }
    if (_pvCache.size > 60) _pvCache.clear();
    _pvCache.set(key, pf);
  }
  ctx.save();
  ctx.strokeStyle = active ? "#2962ff" : "rgba(41,98,255,0.45)";
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(a.x, 0); ctx.lineTo(a.x, size.height); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, size.height); ctx.stroke();
  ctx.setLineDash([]);
  if (!pf) {
    ctx.fillStyle = "#cfd6e4"; ctx.textAlign = "left";
    ctx.fillText(BY_ID["custom:perfil-volume"] ? "Perfil de volume: sem velas nesse trecho" : "Perfil de volume: rode node scripts/win-sync.mjs", Math.min(a.x, b.x) + 6, 30);
  } else {
    const pv = new PerfilVolume(pane, [pf]);
    pv.series = layer.series;
    pv.desenhar(ctx, size, false);
    pv.desenhar(ctx, size, true);
  }
  ctx.restore();
}
// <<< gex-sync perfil
`;
function aplicarDesenho(c) {
  c = c.replace(/import \{ BY_ID, compute \} from "\.\.\/lib\/indicators\.js"; \/\/ gex-sync\n/, '')
    .replace(/import \{ PerfilVolume \} from "\.\/volume-profile\.js"; \/\/ gex-sync\n/, '')
    .replace(/  \{\n    id: "vprofile", \/\/ gex-sync\n[\s\S]*?  \},\n/, '')
    .replace(/      case "vprofile": \{ \/\/ gex-sync\n[\s\S]*?        break;\n      \}\n/, '')
    .replace('"long", "short", "vprofile"].includes', '"long", "short"].includes')
    .replace(/\n\/\/ >>> gex-sync perfil\n[\s\S]*?\/\/ <<< gex-sync perfil\n/, '');
  for (const [ancora, novo, modo] of DESENHO) {
    if (modo === 'topo') { const k = c.indexOf('\nexport const TOOLS'); if (k < 0) return null; c = c.slice(0, k + 1) + ancora + c.slice(k + 1); continue; }
    if (!c.includes(ancora)) return null;
    c = c.replace(ancora, modo === 'troca' ? novo : modo ? novo + ancora : ancora + novo);
  }
  return c + FUNCAO_PERFIL;
}

// Botão (seta) na legenda para recolher / mostrar a lista de indicadores do gráfico.
const LEGENDA = [
  ['    html += "</div>";\n    for (const sym of this.cfg.compare) {',
   '    html += `<button data-act="legtoggle" title="${this.cfg.legendaRecolhida ? "Mostrar indicadores" : "Recolher indicadores"}" style="pointer-events:auto;margin-left:8px;padding:0 6px;border:1px solid rgba(128,128,128,.4);border-radius:4px;background:rgba(128,128,128,.12);color:inherit;cursor:pointer;font-size:11px;line-height:16px">${this.cfg.legendaRecolhida ? "&#9660; " + this.cfg.indicators.length : "&#9650;"}</button>`; // gex-sync\n    html += "</div>";\n    for (const sym of this.cfg.compare) {'],
  ['    for (const ind of this.cfg.indicators) {\n      const def = BY_ID[ind.id];\n      if (!def) continue;\n      const res = this.indResults[ind.uid] || {};',
   '    for (const ind of this.cfg.legendaRecolhida ? [] : this.cfg.indicators) { // gex-sync\n      const def = BY_ID[ind.id];\n      if (!def) continue;\n      const res = this.indResults[ind.uid] || {};'],
  ['    for (const note of this.notes || [])', '    for (const note of this.cfg.legendaRecolhida ? [] : this.notes || []) // gex-sync'],
  ['      if (act === "symbol") return this.app.openSymbolSearch();',
   '      if (act === "symbol") return this.app.openSymbolSearch();\n      if (act === "legtoggle") { this.cfg.legendaRecolhida = !this.cfg.legendaRecolhida; this.app.persist(); return this.updateLegend(); } // gex-sync'],
];
function aplicarLegenda(b) {
  if (b.includes('data-act="legtoggle"')) return b;
  for (const [ancora, novo] of LEGENDA) { if (!b.includes(ancora)) return null; b = b.replace(ancora, novo); }
  return b;
}

// Ferramenta de posição comprada / vendida: entrada, stop e alvo ajustáveis separadamente, R:R livre (padrão 3:1).
const CASO_POSICAO = `      case "long":
      case "short": { // gex-sync posicao
        const dir = d.type === "long" ? 1 : -1;
        const entrada = a.price, stop = b.price, risco = Math.abs(entrada - stop) || entrada * 0.001;
        const alvo = d.alvo ?? alvoDe(d);
        const G = this.posGeo(d);
        if (!G) break;
        const { x1, w, ye, ys, yt } = G;
        ctx.fillStyle = COLORS.up + "0.2)";
        ctx.fillRect(x1, Math.min(ye, yt), w, Math.abs(yt - ye));
        ctx.fillStyle = COLORS.down + "0.2)";
        ctx.fillRect(x1, Math.min(ye, ys), w, Math.abs(ys - ye));
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeStyle = COLORS.up + "0.95)"; line(x1, yt, x1 + w, yt);
        ctx.strokeStyle = COLORS.down + "0.95)"; line(x1, ys, x1 + w, ys);
        ctx.strokeStyle = "#b2b5be"; line(x1, ye, x1 + w, ye);
        const rr = Math.abs(alvo - entrada) / risco;
        const ganho = (alvo - entrada) * dir, perda = (stop - entrada) * dir;
        const pts = (v) => (v >= 0 ? "+" : "-") + price(Math.abs(v));
        const pct = (v) => (v >= 0 ? "+" : "") + ((v / entrada) * 100).toFixed(2).replace(".", ",") + "%";
        ctx.font = "bold 11px -apple-system, Segoe UI, Roboto, sans-serif";
        // etiquetas à direita da caixa, para não cobrir as alças
        const tAlvo = "Alvo " + price(alvo) + "   " + pts(ganho) + " pts (" + pct(ganho) + ")";
        const tStop = "Stop " + price(stop) + "   " + pts(perda) + " pts (" + pct(perda) + ")";
        const tEnt = (dir > 0 ? "Compra " : "Venda ") + price(entrada) + "   R:R " + rr.toFixed(1).replace(".", ",") + " : 1";
        const larg = Math.max(...[tAlvo, tStop, tEnt].map((t) => ctx.measureText(t).width)) + 14;
        const cabe = x1 + w + 8 + larg <= size.width; // não cabe à direita: vai para a esquerda da caixa
        const xl = cabe ? x1 + w + 8 : x1 - 8, al = cabe ? "left" : "right";
        const sep = (y1, y2) => (Math.abs(y1 - y2) < 20 ? (y1 < y2 ? -10 : 10) : 0);
        label(tAlvo, xl, yt + sep(yt, ye), al, COLORS.up + "0.95)");
        label(tStop, xl, ys + sep(ys, ye), al, COLORS.down + "0.95)");
        label(tEnt, xl, ye, al, "rgba(55,60,72,0.95)");
        if (active) { ctx.font = "10px -apple-system, Segoe UI, Roboto, sans-serif"; ctx.fillStyle = "#b2b5be"; ctx.textAlign = al; ctx.fillText("duplo clique = digitar o R:R", xl, ys + (ys > ye ? 24 : -24)); }
        ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
        break;
      }
`;
const GEO_POSICAO = `  // >>> gex-sync posicao geo
  posGeo(d) {
    const [e, s] = d.points;
    const xa = this.x(e.time), xb = this.x(s.time);
    const ye = this.y(e.price), ys = this.y(s.price), yt = this.y(d.alvo ?? alvoDe(d));
    if ([xa, xb, ye, ys, yt].some((v) => v == null)) return null;
    const x1 = Math.min(xa, xb), w = Math.max(Math.abs(xb - xa), 60);
    return { x1, w, ye, ys, yt, top: Math.min(ye, ys, yt), bottom: Math.max(ye, ys, yt) };
  }
  // alças: 0 entrada (esquerda), 1 stop, 2 alvo, 3 largura (direita)
  posHandles(d) {
    const G = this.posGeo(d);
    if (!G) return [];
    return [{ x: G.x1, y: G.ye }, { x: G.x1 + G.w / 2, y: G.ys }, { x: G.x1 + G.w / 2, y: G.yt }, { x: G.x1 + G.w, y: G.ye }];
  }
  // <<< gex-sync posicao geo
`;
const FUNCS_POSICAO = `
// >>> gex-sync posicao funcs
export function rrPadrao() {
  try { const v = parseFloat(localStorage.getItem("qt-rr")); return v > 0 ? v : 3; } catch { return 3; }
}
export function alvoDe(d) {
  const dir = d.type === "long" ? 1 : -1, e = d.points[0].price, s = d.points[1].price;
  const risco = Math.abs(e - s) || e * 0.001;
  return e + dir * risco * (d.rr || rrPadrao());
}
// duplo clique numa posição: digitar o R:R; o valor digitado vira o padrão das próximas
export function pedirRR(d) {
  const dir = d.type === "long" ? 1 : -1, e = d.points[0].price, s = d.points[1].price;
  const risco = Math.abs(e - s) || e * 0.001;
  const atual = Math.abs((d.alvo ?? alvoDe(d)) - e) / risco;
  const txt = prompt("Relacao risco:retorno (alvo em vezes o stop). Ex.: 3 = alvo 3x o stop", atual.toFixed(1).replace(".", ","));
  const v = parseFloat(String(txt || "").replace(",", "."));
  if (!(v > 0)) return false;
  d.alvo = e + dir * risco * v;
  try { localStorage.setItem("qt-rr", String(v)); } catch { /* sem armazenamento */ }
  return true;
}
// <<< gex-sync posicao funcs
`;
function aplicarPosicaoDesenhos(c) {
  const ini = c.indexOf('      case "long":\n      case "short": {'), fim = c.indexOf('      case "text": {');
  if (ini < 0 || fim < ini) return null;
  c = c.slice(0, ini) + CASO_POSICAO + c.slice(fim);
  c = c.replace(/  \/\/ >>> gex-sync posicao geo\n[\s\S]*?  \/\/ <<< gex-sync posicao geo\n/, '');
  const h = '  // Index of the drawing\'s point under (x, y), or -1, for resizing by its handles.\n';
  if (!c.includes(h)) return null;
  c = c.replace(h, GEO_POSICAO + h);
  c = c.replace(/    if \(d\.type === "long" \|\| d\.type === "short"\) \{ \/\/ gex-sync posicao handles\n[\s\S]*?    \}\n/, '');
  const ha = '  handleAt(d, x, y) {\n';
  if (!c.includes(ha)) return null;
  c = c.replace(ha, ha + '    if (d.type === "long" || d.type === "short") { // gex-sync posicao handles\n      return this.posHandles(d).findIndex((h) => Math.hypot(h.x - x, h.y - y) <= 8);\n    }\n');
  c = c.replace(/      else if \(d\.type === "long" \|\| d\.type === "short"\) \{ \/\/ gex-sync posicao hit\n[\s\S]*?      \}\n/, '');
  const hi = '      else if (["rect", "fib", "measure", "long", "short"';
  if (!c.includes(hi)) return null;
  c = c.replace(hi, '      else if (d.type === "long" || d.type === "short") { // gex-sync posicao hit\n        const G = this.posGeo(d);\n        dist = G && x >= G.x1 - 4 && x <= G.x1 + G.w + 4 && y >= G.top - 6 && y <= G.bottom + 6 ? 3 : Infinity;\n      }\n' + hi);
  const al = '      for (const p of pts) {\n        ctx.beginPath();\n        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);';
  const alNovo = '      for (const p of d.type === "long" || d.type === "short" ? this.posHandles(d) : pts) { // gex-sync posicao\n        ctx.beginPath();\n        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);';
  if (!c.includes(alNovo)) { if (!c.includes(al)) return null; c = c.replace(al, alNovo); }
  c = c.replace(/\n\/\/ >>> gex-sync posicao funcs\n[\s\S]*?\/\/ <<< gex-sync posicao funcs\n/, '');
  return c + FUNCS_POSICAO;
}
const POSICAO_CHART = [
  [/import \{ DrawingLayer, TOOL_BY_ID, constrain45, snapToOHLC( , alvoDe, pedirRR)? \} from "\.\/drawings\.js";/, 'import { DrawingLayer, TOOL_BY_ID, constrain45, snapToOHLC, alvoDe, pedirRR } from "./drawings.js";'],
  ['    const orig = item.points.map((p) => ({ ...p }));\n', '    const orig = item.points.map((p) => ({ ...p }));\n    if ((item.type === "long" || item.type === "short") && item.alvo == null) item.alvo = alvoDe(item); // gex-sync posicao\n    const origAlvo = item.alvo; // gex-sync posicao\n'],
  ['      if (handle >= 0) {\n        const pt = this.pointAt({ point: { x, y }, logical: ts.coordinateToLogical(x) });',
   '      if (handle >= 0 && (item.type === "long" || item.type === "short")) { // gex-sync posicao\n        const pt = this.pointAt({ point: { x, y }, logical: ts.coordinateToLogical(x) });\n        const tick = /^CSV:WIN/.test(this.cfg.symbol || "") ? 5 : /^CSV:WDO/.test(this.cfg.symbol || "") ? 0.5 : 0;\n        const pr = (v) => (tick ? Math.round(v / tick) * tick : v);\n        if (pt) {\n          if (handle === 0) item.points[0] = { ...item.points[0], time: pt.time, price: pr(pt.price) };\n          else if (handle === 1) item.points[1] = { ...item.points[1], price: pr(pt.price) };\n          else if (handle === 2) item.alvo = pr(pt.price);\n          else if (handle === 3) item.points[1] = { ...item.points[1], time: pt.time };\n        }\n      } else if (handle >= 0) {\n        const pt = this.pointAt({ point: { x, y }, logical: ts.coordinateToLogical(x) });'],
  ['          return time == null || price == null ? p : { ...p, time, price };\n        });\n',
   '          return time == null || price == null ? p : { ...p, time, price };\n        });\n        if (origAlvo != null) item.alvo = origAlvo + (item.points[0].price - orig[0].price); // gex-sync posicao\n'],
  ['      if (item.points.some((p, i) => p.time !== orig[i].time || p.price !== orig[i].price))',
   '      if (item.alvo !== origAlvo || item.points.some((p, i) => p.time !== orig[i].time || p.price !== orig[i].price)) // gex-sync posicao'],
  ['      d.items.push(item);\n      d.selected = item;',
   '      if ((item.type === "long" || item.type === "short") && item.alvo == null) item.alvo = alvoDe(item); // gex-sync posicao\n      d.items.push(item);\n      d.selected = item;'],
  ['    this.chartEl.addEventListener("mousedown", (e) => this.startDrag(e), true);\n',
   '    this.chartEl.addEventListener("mousedown", (e) => this.startDrag(e), true);\n    this.chartEl.addEventListener("dblclick", () => { const it = this.drawings.selected; if (it && (it.type === "long" || it.type === "short") && pedirRR(it)) { this.drawings.update(); this.app.saveDrawings(this.cfg.symbol, this.drawings.items); } }); // gex-sync posicao\n'],
];
function aplicarPosicaoChart(b) {
  if (b.includes('gex-sync posicao')) return b.replace(POSICAO_CHART[0][0], POSICAO_CHART[0][1]);
  for (const [ancora, novo] of POSICAO_CHART) {
    if (ancora instanceof RegExp) { if (!ancora.test(b)) return null; b = b.replace(ancora, novo); continue; }
    if (!b.includes(ancora)) return null;
    b = b.replace(ancora, novo);
  }
  return b;
}

// app.js: salvar o alvo da posição junto com o desenho
function aplicarApp(t) {
  if (t.includes('alvo, // gex-sync posicao')) return t;
  const a = '      ({ id, type, points, text, color, rr }) => ({', b = '        rr,\n      }),';
  if (!t.includes(a) || !t.includes(b)) return null;
  return t.replace(a, '      ({ id, type, points, text, color, rr, alvo }) => ({').replace(b, '        rr,\n        alvo, // gex-sync posicao\n      }),');
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
  const bl = aplicarLegenda(b);
  if (bl === null) return 'esta versao do terminal mudou (legenda); me avise no chat';
  b = bl;
  const bp = aplicarPosicaoChart(b);
  if (bp === null) return 'esta versao do terminal mudou (posicao no grafico); me avise no chat';
  b = bp;
  const dr = path.join(raiz, 'public', 'js', 'drawings.js');
  const c0 = fs.existsSync(dr) ? fs.readFileSync(dr, 'utf8') : null;
  let c = c0 === null ? null : aplicarDesenho(c0);
  if (c0 !== null && c === null) return 'esta versao do terminal mudou (ferramenta perfil); me avise no chat';
  if (c !== null) { c = aplicarPosicaoDesenhos(c); if (c === null) return 'esta versao do terminal mudou (ferramenta posicao); me avise no chat'; }
  const ap = path.join(raiz, 'public', 'js', 'app.js');
  const t0 = fs.existsSync(ap) ? fs.readFileSync(ap, 'utf8') : null;
  const t = t0 === null ? null : aplicarApp(t0);
  if (t0 !== null && t === null) return 'esta versao do terminal mudou (salvar posicao); me avise no chat';
  if (t !== t0) fs.writeFileSync(ap, t);
  if (a === a0 && b === b0 && c === c0) return t !== t0 ? 'instalado' : 'ok';
  fs.writeFileSync(vp, a); fs.writeFileSync(ch, b);
  if (c !== c0) fs.writeFileSync(dr, c);
  return 'instalado';
}
