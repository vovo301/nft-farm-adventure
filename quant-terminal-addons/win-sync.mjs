// win-sync.mjs — WIN (mini índice) com volume real e leitura de fluxo, feitos com os negócios públicos da B3.
// Coloque em quant-terminal\scripts e rode:  node scripts/win-sync.mjs        (últimos 5 pregões)
//                                             node scripts/win-sync.mjs 10     (últimos 10 pregões)
// Grava:
//   data/imports/WIN.csv              velas de 1 minuto (o terminal mostra como o ativo CSV:WIN)
//   custom/fluxo-win-agressao.js      saldo de agressão por vela e acumulado no dia
//   custom/fluxo-win-players.js       saldo acumulado das corretoras que mais negociam e das estrangeiras
//   custom/fluxo-win-lotes.js         bolhas nas velas com lotes grandes (100 contratos ou mais por negócio)
//   custom/fluxo-win-placar.js        placar de viés (-100 a +100) e sinal de compra/venda para testar
// Os dias já fechados ficam guardados em data/b3cache e não são baixados de novo. Rode de novo para atualizar hoje.
// Os dados da B3 chegam com uns 15 minutos de atraso: servem para ler o contexto, não para tempo real.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { instalarDesenhos } from './qt-desenhos.mjs';

const RAIZ = process.env.WIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = path.join(RAIZ, 'data');
const CACHE = path.join(DADOS, 'b3cache');
const CUSTOM = path.join(RAIZ, 'custom');
const SAIDA = path.join(DADOS, 'imports', 'WIN.csv');
const DIAS = Math.max(1, Math.min(30, parseInt(process.argv[2] || '5', 10) || 5));
const FUSO = 3 * 3600;      // horário de Brasília = UTC-3
const LOTE_GRANDE = 100;    // contratos num único negócio
const ZIPS = process.env.WIN_ZIPS || null; // (teste) pasta com os arquivos da B3 já baixados

// Nomes das corretoras pelo código da B3. Edite data/corretoras.json para corrigir ou acrescentar.
const CORRETORAS = {
  3: 'XP', 8: 'UBS', 13: 'Merrill Lynch', 16: 'J.P. Morgan', 27: 'Santander', 39: 'Agora', 40: 'Morgan Stanley',
  45: 'Credit Suisse', 72: 'Bradesco', 77: 'Citigroup', 85: 'BTG Pactual', 93: 'Nova Futura', 107: 'Terra',
  114: 'Itau', 120: 'Genial', 127: 'Tullett Prebon', 147: 'Ativa', 238: 'Goldman Sachs', 251: 'BNP Paribas',
  262: 'Mirae', 308: 'Clear', 386: 'Rico', 1099: 'Inter', 1130: 'StoneX', 1618: 'Ideal', 1982: 'Modal', 4090: 'Toro',
};
const ESTRANGEIRAS = [8, 13, 16, 40, 45, 77, 238, 251]; // UBS, Merrill, JPM, MS, CS, Citi, Goldman, BNP

// ---------- calendário B3 ----------
function pascoa(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const iso = (d) => d.toISOString().slice(0, 10);
function feriado(d) {
  const y = d.getUTCFullYear(), s = iso(d);
  if (['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-24', '12-25', '12-31'].some((md) => s === `${y}-${md}`)) return true;
  const p = pascoa(y);
  return [-48, -47, -2, 60].some((o) => iso(new Date(p + o * 864e5)) === s);
}
const util = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !feriado(d);
const D = (y, m, d) => new Date(Date.UTC(y, m, d));
function vencIbov(y, m) { // quarta-feira mais próxima do dia 15 (dia útil seguinte se for feriado)
  const d15 = D(y, m, 15); let off = 3 - d15.getUTCDay(); if (off > 3) off -= 7; if (off < -3) off += 7;
  const x = new Date(d15.getTime() + off * 864e5); while (!util(x)) x.setUTCDate(x.getUTCDate() + 1); return x;
}
function contratoWin(dia) { // contrato vigente naquele dia (meses pares, vence na quarta perto do dia 15)
  const LET = 'FGHJKMNQUVXZ';
  for (let k = 0; k < 14; k++) {
    const y = dia.getUTCFullYear() + Math.floor((dia.getUTCMonth() + k) / 12), m = (dia.getUTCMonth() + k) % 12;
    if (m % 2 === 1 && vencIbov(y, m) >= dia) return 'WIN' + LET[m] + String(y).slice(2);
  }
  return null;
}

// ---------- download e leitura do arquivo de negócios da B3 ----------
async function baixar(ticker, data) {
  if (ZIPS) { const f = path.join(ZIPS, `${ticker}-${data}.zip`); return fs.existsSync(f) ? fs.readFileSync(f) : null; }
  const url = `https://arquivos.b3.com.br/rapinegocios/tickercsv/${ticker}/${data}`;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; win-sync/2.0)' } });
      if (r.status === 404 || r.status === 204) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) return null; // sem negócios nesse dia
      return buf;
    } catch (e) {
      if (tentativa === 3) throw new Error(`não consegui baixar ${ticker} ${data}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 3000 * tentativa));
    }
  }
}

// Lê os negócios em fluxo (o arquivo aberto passa de 400 MB) e monta, para cada minuto:
// a vela, o volume agredido na compra e na venda (regra do tick), os lotes grandes e o saldo de cada corretora.
async function minutosDoArquivo(zip, data) {
  const nl = zip.readUInt16LE(26), el = zip.readUInt16LE(28);
  const fluxo = Readable.from([zip.subarray(30 + nl + el)]).pipe(zlib.createInflateRaw());
  const linhas = readline.createInterface({ input: fluxo, crlfDelay: Infinity });
  const min = new Map();
  let n = 0, cab = true, ultPreco = 0, ultLado = 0;
  const base = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10)) / 1000 + FUSO;
  try {
    for await (const l of linhas) {
      if (cab) { cab = false; continue; }
      const c = l.split(';');
      if (c.length < 11 || c[2] !== '0' || c[8] !== data) continue; // só negócios novos daquele pregão
      const preco = parseFloat(c[3].replace(',', '.')), qtd = parseInt(c[4], 10), h = c[5];
      if (!(preco > 0) || !(qtd > 0) || h.length < 7) continue;
      const hh = +h.slice(0, h.length - 7), mm = +h.slice(-7, -5);
      const t = base + hh * 3600 + mm * 60;
      let m = min.get(t);
      if (!m) min.set(t, (m = { t, o: preco, h: preco, l: preco, c: preco, v: 0, ba: 0, sa: 0, gb: 0, gs: 0, gp: 0, net: {}, pv: new Map() }));
      if (preco > m.h) m.h = preco; if (preco < m.l) m.l = preco;
      m.c = preco; m.v += qtd; n++;
      // regra do tick: subiu = agressão de compra, caiu = de venda, igual = mesmo lado do anterior
      const lado = preco > ultPreco ? 1 : preco < ultPreco ? -1 : ultLado;
      ultPreco = preco; ultLado = lado;
      if (lado > 0) m.ba += qtd; else if (lado < 0) m.sa += qtd;
      { let x = m.pv.get(preco); if (!x) m.pv.set(preco, (x = [0, 0, 0])); if (lado < 0) x[1] += qtd; else x[0] += qtd; x[2]++; }
      if (qtd >= LOTE_GRANDE) { if (lado > 0) m.gb += qtd; else if (lado < 0) m.gs += qtd; m.gp += preco * qtd; }
      const cp = c[9], vd = c[10];
      if (cp !== vd) { m.net[cp] = (m.net[cp] || 0) + qtd; m.net[vd] = (m.net[vd] || 0) - qtd; }
    }
  } catch (e) {
    if (!min.size) throw e; // arquivo cortado no fim: fica com o que deu para ler
  }
  // volume por preço, compacto: [preço mínimo, compra, venda, negócios, compra, venda, negócios, ...] de 5 em 5 pontos
  for (const m of min.values()) {
    const ps = [...m.pv.keys()], lo = Math.min(...ps), hi = Math.max(...ps), hp = [lo];
    for (let q = lo; q <= hi; q += 5) { const x = m.pv.get(q) || [0, 0, 0]; hp.push(x[0], x[1], x[2]); }
    m.hp = hp; delete m.pv;
  }
  return { minutos: [...min.values()].sort((a, b) => a.t - b.t), negocios: n };
}

// ---------- indicadores gerados ----------
// Cada indicador leva os dados por minuto embutidos e os soma nas velas do gráfico (1 min, 5 min, 15 min...).
const AJUDA = `
const _m = (bars) => { // para cada vela, o intervalo de minutos [a, b) que cai dentro dela
  const r = [], T = DADOS.t; let j = 0;
  const passo = bars.length > 1 ? bars[1].time - bars[0].time : 60;
  for (let i = 0; i < bars.length; i++) {
    const ini = bars[i].time, fim = i + 1 < bars.length ? bars[i + 1].time : ini + passo;
    while (j < T.length && T[j] < ini) j++;
    const a = j; while (j < T.length && T[j] < fim) j++;
    r.push([a, j]);
  }
  return r;
};
const _soma = (arr, a, b) => { let s = 0; for (let k = a; k < b; k++) s += arr[k]; return s; };
const _nan = (n) => new Array(n).fill(NaN);`;

const PLACAR = `
function _placar(bars, p) { // placar de -100 a +100, so com velas ja fechadas
  const n = bars.length, r = _m(bars), N = p.janela;
  const agr = r.map(([a, b]) => _soma(DADOS.dl, a, b));
  const est = r.map(([a, b]) => _soma(DADOS.est, a, b));
  const lot = r.map(([a, b]) => _soma(DADOS.gb, a, b) - _soma(DADOS.gs, a, b));
  const rol = (x) => x.map((_, i) => { let s = 0; for (let k = Math.max(0, i - N + 1); k <= i; k++) s += x[k]; return s; });
  const z = (x) => x.map((v, i) => {
    const a = Math.max(0, i - 299); if (i - a < 50) return NaN;
    let s = 0, q = 0, c = 0; for (let k = a; k <= i; k++) { s += x[k]; q += x[k] * x[k]; c++; }
    const sd = Math.sqrt(Math.max(0, q / c - (s / c) ** 2)); return sd > 0 ? Math.max(-2.5, Math.min(2.5, v / sd)) : 0;
  });
  const za = z(rol(agr)), ze = z(rol(est)), zl = z(rol(lot));
  const ps = p.peso_agr + p.peso_est + p.peso_lot || 1;
  return r.map(([a, b], i) => (b > a && Number.isFinite(za[i])
    ? Math.round(100 * Math.max(-1, Math.min(1, (p.peso_agr * za[i] + p.peso_est * ze[i] + p.peso_lot * zl[i]) / ps / 2)))
    : NaN));
}`;

function gravar(nome, codigo) { fs.writeFileSync(path.join(CUSTOM, nome), codigo); }

function gerarIndicadores(mins, topo) {
  const dia = []; let d = -1, ultDia = '';
  for (const m of mins) { const s = new Date((m.t - FUSO) * 1000).toISOString().slice(0, 10); if (s !== ultDia) { d++; ultDia = s; } dia.push(d); }
  const estr = mins.map((m) => ESTRANGEIRAS.reduce((s, b) => s + (m.net[b] || 0), 0));
  const dados = {
    t: mins.map((m) => m.t), dia, v: mins.map((m) => m.v),
    dl: mins.map((m) => m.ba - m.sa),
    gb: mins.map((m) => m.gb), gs: mins.map((m) => m.gs),
    gp: mins.map((m) => (m.gb + m.gs ? Math.round(m.gp / (m.gb + m.gs)) : 0)),
    est: estr,
    p: Object.fromEntries(topo.map((b) => [b, mins.map((m) => m.net[b] || 0)])),
  };
  const cab = `// Gerado por win-sync.mjs em ${new Date().toISOString()} com os negocios publicos da B3 (${mins.length} minutos).\n// Rode "node scripts/win-sync.mjs" de novo para atualizar. Use no grafico CSV:WIN.\n`;
  const DADOS = `const DADOS = ${JSON.stringify(dados)};`;

  // 1) Agressão
  gravar('fluxo-win-agressao.js', `${cab}${DADOS}${AJUDA}
export default {
  name: 'Fluxo WIN agressao (Agressao)',
  overlay: false,
  inputs: [{ key: 'mostrar', label: 'Mostrar', type: 'select', default: 'Acumulado do dia', options: ['Acumulado do dia', 'Saldo de cada vela'] }],
  outputs: [
    { key: 'saldo', label: 'Saldo da vela', kind: 'histogram', color: '#26a69a' },
    { key: 'acum', label: 'Acumulado do dia', kind: 'line', color: '#ff9800', lineWidth: 2 },
  ],
  calc(bars, p) {
    const r = _m(bars), saldo = _nan(bars.length), acum = _nan(bars.length), colors = [];
    let s = 0, dAnt = -1;
    r.forEach(([a, b], i) => {
      if (a === b) { colors.push(null); return; }
      if (DADOS.dia[a] !== dAnt) { s = 0; dAnt = DADOS.dia[a]; }
      const x = _soma(DADOS.dl, a, b); s += x;
      saldo[i] = x; acum[i] = s; colors.push(x >= 0 ? '#26a69a' : '#ef5350');
    });
    if (p.mostrar === 'Saldo de cada vela') return { saldo, acum: _nan(bars.length), colors };
    return { saldo: _nan(bars.length), acum, colors };
  },
};
`);

  // 2) Players
  const cores = ['#42a5f5', '#ab47bc', '#ffca28', '#26c6da', '#8d6e63', '#ec407a'];
  const nomeDe = (b) => `#${b} ${CORRETORAS[b] || ''}`.trim();
  const saidas = [{ key: 'est', label: 'Estrangeiras', kind: 'line', color: '#ffffff', lineWidth: 3 },
    ...topo.map((b, i) => ({ key: 'c' + b, label: nomeDe(b), kind: 'line', color: cores[i % cores.length], lineWidth: 1 }))];
  gravar('fluxo-win-players.js', `${cab}// Saldo acumulado no dia (contratos comprados menos vendidos) das corretoras que mais negociam o WIN,
// e a soma das estrangeiras: ${ESTRANGEIRAS.map(nomeDe).join(', ')}.
// Corretora nao e cliente: XP, BTG, Ideal e Genial juntam muitos clientes, a maioria pessoa fisica.
${DADOS}${AJUDA}
export default {
  name: 'Fluxo WIN players (Players)',
  overlay: false,
  inputs: [],
  outputs: ${JSON.stringify(saidas)},
  levels: [0],
  calc(bars) {
    const r = _m(bars), out = {};
    const series = { est: DADOS.est, ...Object.fromEntries(Object.entries(DADOS.p).map(([b, a]) => ['c' + b, a])) };
    for (const [k, arr] of Object.entries(series)) {
      const o = _nan(bars.length); let s = 0, dAnt = -1;
      r.forEach(([a, b], i) => { if (a === b) return; if (DADOS.dia[a] !== dAnt) { s = 0; dAnt = DADOS.dia[a]; } s += _soma(arr, a, b); o[i] = s; });
      out[k] = o;
    }
    return out;
  },
};
`);

  // 3) Lotes grandes
  gravar('fluxo-win-lotes.js', `${cab}// Bolhas nas velas onde entraram lotes de ${LOTE_GRANDE}+ contratos num unico negocio. Verde = agressao de compra
// venceu, vermelho = de venda. Quanto maior o volume desses lotes, maior a bolha.
${DADOS}${AJUDA}
export default {
  name: 'Fluxo WIN lotes grandes (Lotes grandes)',
  overlay: true,
  inputs: [{ key: 'minimo', label: 'Minimo de contratos em lotes grandes na vela (0 = automatico)', type: 'int', default: 0, min: 0 }],
  outputs: [{ key: 'preco', label: 'Preco medio dos lotes', kind: 'line', color: '#ffca28' }],
  calc(bars, p) {
    const r = _m(bars), preco = _nan(bars.length), markers = [];
    const tot = r.map(([a, b]) => _soma(DADOS.gb, a, b) + _soma(DADOS.gs, a, b));
    const max = Math.max(1, ...tot);
    let minimo = p.minimo;
    if (!minimo) { const o = tot.filter((x) => x > 0).sort((x, y) => x - y); minimo = Math.max(${LOTE_GRANDE}, o[Math.floor(o.length * 0.95)] || 0); }
    r.forEach(([a, b], i) => {
      const g = tot[i]; if (g < minimo) return;
      const sb = _soma(DADOS.gb, a, b) - _soma(DADOS.gs, a, b);
      const k = (g / max) ** 0.5;
      markers.push({ time: bars[i].time, position: sb >= 0 ? 'belowBar' : 'aboveBar', shape: 'circle',
        color: sb >= 0 ? '#26a69a' : '#ef5350', size: 0.6 + 2.4 * k, text: (sb >= 0 ? '+' : '') + sb });
    });
    return { preco, markers };
  },
};
`);

  // 5) Direção: simples, comprado / vendido / fora
  gravar('fluxo-win-direcao.js', `${cab}// DIRECAO: diz se o fluxo esta COMPRADO, VENDIDO ou FORA, e pinta os candles.
// Regra: o placar de fluxo (janela 30 velas) passa de +60 -> COMPRADO; passa de -60 -> VENDIDO.
// Fica na posicao ate o sinal contrario. As 17:50 (horario de Brasilia) zera.
// Testado em 8 pregoes de nov/2026: positivo, mas parecido com seguir a tendencia do preco. NAO e garantia.
// Use primeiro no Paper trading. Sempre com stop. Os dados da B3 chegam ~15 min atrasados.
${DADOS}${AJUDA}
${PLACAR}
export default {
  name: 'Fluxo WIN direcao (Direcao)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'janela', label: 'Janela (velas)', type: 'int', default: 30, min: 3, max: 120 },
    { key: 'limiar', label: 'Limiar', type: 'int', default: 60, min: 5, max: 95 },
    { key: 'pintar', label: 'Pintar candles', type: 'select', default: 'Sim', options: ['Sim', 'Nao'] },
  ],
  outputs: [{ key: 'posicao', label: 'Posicao (+1 comprado, -1 vendido, 0 fora)', kind: 'line', color: '#00000000' }],
  calc(bars, p) {
    const n = bars.length, sc = _placar(bars, { janela: p.janela, peso_agr: 1, peso_est: 1, peso_lot: 1 });
    const posicao = new Array(n).fill(0), barColors = new Array(n).fill(null), markers = [];
    const hm = (t) => { const d = new Date((t - 10800) * 1000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
    let pos = 0, desde = 0;
    for (let i = 0; i < n; i++) {
      const m = hm(bars[i].time), novoDia = i > 0 && Math.floor((bars[i].time - 10800) / 86400) !== Math.floor((bars[i - 1].time - 10800) / 86400);
      let alvo = novoDia ? 0 : pos;
      if (m >= 1070) alvo = 0; // 17:50
      else if (m >= 545 && Number.isFinite(sc[i])) { if (sc[i] >= p.limiar) alvo = 1; else if (sc[i] <= -p.limiar) alvo = -1; } // a partir de 09:05
      if (alvo !== pos) {
        if (alvo) markers.push({ time: bars[i].time, position: alvo > 0 ? 'belowBar' : 'aboveBar', shape: alvo > 0 ? 'arrowUp' : 'arrowDown', color: alvo > 0 ? '#26a69a' : '#ef5350', text: alvo > 0 ? 'COMPRA' : 'VENDE', size: 2 });
        else if (pos && !novoDia) markers.push({ time: bars[i].time, position: 'aboveBar', shape: 'square', color: '#90a4ae', text: 'ZERA' });
        pos = alvo; desde = bars[i].time;
      }
      posicao[i] = pos;
      if (p.pintar === 'Sim' && pos) barColors[i] = pos > 0 ? '#26a69a' : '#ef5350';
    }
    if (n) {
      const h = new Date((desde - 10800) * 1000).toISOString().slice(11, 16);
      markers.push({ time: bars[n - 1].time, position: pos >= 0 ? 'aboveBar' : 'belowBar', shape: 'square',
        color: pos > 0 ? '#26a69a' : pos < 0 ? '#ef5350' : '#90a4ae',
        text: pos > 0 ? 'COMPRADO desde ' + h : pos < 0 ? 'VENDIDO desde ' + h : 'FORA' });
    }
    return { posicao, barColors, markers };
  },
};
`);

  // 6) Perfil de volume com POC, VAH e VAL
  const comHp = mins.filter((m) => m.hp);
  gravar('perfil-volume.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// PERFIL DE VOLUME (como o FRVP do TradingView) com POC, VAH e VAL escritos.
// No CSV:WIN usa o volume exato de cada preco, dos negocios da B3 (${comHp.length} minutos), separado em compra e venda.
// Em outros ativos (ou dias sem esse dado) estima espalhando o volume de cada vela entre a minima e a maxima.
// Modo "Periodo escolhido": ao adicionar, clique na vela de inicio; o fim vazio vai ate a ultima vela.
const DADOS = ${JSON.stringify({ t: comHp.map((m) => m.t), hp: comHp.map((m) => m.hp) })};
export default {
  name: 'Perfil de Volume POC VAH VAL (Perfil de Volume)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'inicio', label: 'Inicio', type: 'time', default: 0 },
    { key: 'fim', label: 'Fim (vazio = ultima vela)', type: 'time', default: 0 },
    { key: 'modo', label: 'Modo', type: 'select', default: 'Periodo escolhido', options: ['Periodo escolhido', 'Cada dia'] },
    { key: 'linha', label: 'Tamanho da linha em pontos (0 = automatico)', type: 'float', default: 0, min: 0 },
    { key: 'area', label: 'Value area %', type: 'int', default: 70, min: 10, max: 99 },
    { key: 'largura', label: 'Largura (% do periodo)', type: 'int', default: 70, min: 5, max: 100 },
    { key: 'estender', label: 'Estender POC/VAH/VAL para a direita', type: 'select', default: 'Sim', options: ['Sim', 'Nao'] },
  ],
  outputs: [
    { key: 'poc', label: 'POC', kind: 'line', color: '#00000000' },
    { key: 'vah', label: 'VAH', kind: 'line', color: '#00000000' },
    { key: 'val', label: 'VAL', kind: 'line', color: '#00000000' },
  ],
  calc(bars, p) {
    const n = bars.length, poc = new Array(n).fill(NaN), vah = new Array(n).fill(NaN), val = new Array(n).fill(NaN);
    if (!n) return { poc, vah, val };
    const passoBar = n > 1 ? bars[1].time - bars[0].time : 60;
    const diaDe = (t) => Math.floor((t - 10800) / 86400);
    const trechos = [];
    if (p.modo === 'Cada dia') {
      let a = 0;
      for (let i = 1; i <= n; i++) if (i === n || diaDe(bars[i].time) !== diaDe(bars[a].time)) { trechos.push([a, i - 1]); a = i; }
    } else {
      let a = p.inicio ? bars.findIndex((b) => b.time >= p.inicio) : Math.max(0, n - 150);
      let z = n - 1;
      if (p.fim) { z = -1; for (let i = n - 1; i >= 0; i--) if (bars[i].time <= p.fim) { z = i; break; } }
      if (a >= 0 && z >= a) trechos.push([a, z]);
    }
    const perfis = [];
    for (const [a, z] of trechos) {
      const t0 = bars[a].time, t1 = z + 1 < n ? bars[z + 1].time : bars[z].time + passoBar;
      // 1) volume por preco: exato (negocios da B3) ou estimado pelas velas
      const mapa = new Map(); let exato = false;
      let lo = 0, hi = DADOS.t.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (DADOS.t[m] < t0) lo = m + 1; else hi = m; }
      for (let j = lo; j < DADOS.t.length && DADOS.t[j] < t1; j++) {
        const h = DADOS.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q += 5) {
          if (!h[k] && !h[k + 1]) continue;
          const x = mapa.get(q) || [0, 0]; x[0] += h[k]; x[1] += h[k + 1]; mapa.set(q, x); exato = true;
        }
      }
      let pmin = Infinity, pmax = -Infinity;
      for (let i = a; i <= z; i++) { pmin = Math.min(pmin, bars[i].low); pmax = Math.max(pmax, bars[i].high); }
      if (!(pmax > pmin)) continue;
      let passo = p.linha > 0 ? p.linha : (pmax - pmin) / 60;
      if (exato && !(p.linha > 0)) passo = Math.max(5, Math.ceil(passo / 5) * 5);
      const base = exato ? pmin - passo / 2 : pmin;
      const nl = Math.max(1, Math.ceil((pmax - base) / passo) + 1);
      const c = new Array(nl).fill(0), v = new Array(nl).fill(0);
      if (exato) {
        for (const [q, x] of mapa) { const k = Math.min(nl - 1, Math.max(0, Math.floor((q - base) / passo))); c[k] += x[0]; v[k] += x[1]; }
      } else {
        for (let i = a; i <= z; i++) {
          const b = bars[i], vol = b.volume || 0; if (!vol) continue;
          const ka = Math.max(0, Math.floor((b.low - base) / passo)), kz = Math.min(nl - 1, Math.floor((b.high - base) / passo));
          const parte = vol / (kz - ka + 1);
          for (let k = ka; k <= kz; k++) (b.close >= b.open ? c : v)[k] += parte;
        }
      }
      const tot = c.map((x, k) => x + v[k]), soma = tot.reduce((s, x) => s + x, 0);
      if (!soma) continue;
      // 2) POC e value area (abre a partir do POC pelo lado de maior volume)
      let kp = 0; tot.forEach((x, k) => { if (x > tot[kp]) kp = k; });
      let ka = kp, kz = kp, dentro = tot[kp];
      while (dentro < soma * p.area / 100 && (ka > 0 || kz < nl - 1)) {
        const baixo = ka > 0 ? tot[ka - 1] : -1, cima = kz < nl - 1 ? tot[kz + 1] : -1;
        if (cima >= baixo) dentro += tot[++kz]; else dentro += tot[--ka];
      }
      const pr = (k) => base + k * passo;
      perfis.push({ de: t0, ate: bars[z].time, passo, linhas: tot.map((_, k) => ({ p: pr(k), c: c[k], v: v[k] })).filter((l) => l.c + l.v > 0),
        poc: pr(kp), vah: pr(kz), val: pr(ka), largura: p.largura, estender: p.estender === 'Sim' && (p.modo !== 'Cada dia' || z === n - 1), rotulos: true });
      for (let i = a; i <= z; i++) { poc[i] = pr(kp) + passo / 2; vah[i] = pr(kz) + passo / 2; val[i] = pr(ka) + passo / 2; }
    }
    return { poc, vah, val, perfisVolume: perfis };
  },
};
`);

  // 7) Footprint
  gravar('footprint-win.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// FOOTPRINT do WIN: em cada vela, o volume vendido x comprado (agressao estimada pela regra do tick) em cada preco,
// o delta, o volume total ou o numero de negocios, dos negocios publicos da B3. Use no CSV:WIN.
// Os numeros aparecem quando as velas estao largas: de zoom (role o mouse no grafico) ate as celulas ficarem legiveis.
// Destaques: compra em negrito verde quando e >= N vezes a venda um degrau abaixo; venda em vermelho quando e >= N vezes
// a compra um degrau acima (desequilibrio). Contorno amarelo = POC da vela. Embaixo da vela, o delta total.
// A B3 publica negocios, nao ordens: uma ordem que varre varios precos aparece como varios negocios.
const DADOS = ${JSON.stringify({ t: comHp.map((m) => m.t), hp: comHp.map((m) => m.hp) })};
export default {
  name: 'Footprint WIN (Footprint)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'modo', label: 'Mostrar', type: 'select', default: 'Venda x Compra', options: ['Venda x Compra', 'Delta', 'Volume', 'Negocios'] },
    { key: 'linha', label: 'Agrupar precos de (pontos, 0 = automatico)', type: 'int', default: 0, min: 0 },
    { key: 'deseq', label: 'Desequilibrio (vezes)', type: 'float', default: 3, min: 1.5 },
    { key: 'velas', label: 'Quantas velas (as mais recentes)', type: 'int', default: 400, min: 10, max: 3000 },
  ],
  outputs: [{ key: 'delta', label: 'Delta da vela', kind: 'line', color: '#00000000' }],
  calc(bars, p) {
    const n = bars.length, delta = new Array(n).fill(NaN), barras = [];
    let passo = Math.max(5, Math.round(p.linha / 5) * 5);
    if (!p.linha) { // automatico: cerca de 10 linhas na vela tipica
      const am = bars.slice(-Math.min(n, p.velas)).map((b) => b.high - b.low).sort((a, b) => a - b);
      passo = Math.max(5, Math.ceil((am[Math.floor(am.length / 2)] || 50) / 10 / 5) * 5);
    }
    const T = DADOS.t;
    const passoBar = n > 1 ? bars[1].time - bars[0].time : 60;
    let j = 0;
    for (let i = Math.max(0, n - p.velas); i < n; i++) {
      const t0 = bars[i].time, t1 = i + 1 < n ? bars[i + 1].time : t0 + passoBar;
      if (j > 0 && T[j - 1] >= t0) j = 0;
      while (j < T.length && T[j] < t0) j++;
      const mapa = new Map();
      for (; j < T.length && T[j] < t1; j++) {
        const h = DADOS.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q += 5) {
          if (!h[k + 2]) continue;
          const key = Math.floor(q / passo) * passo + (passo > 5 ? passo / 2 : 0);
          const x = mapa.get(key) || [key, 0, 0, 0]; x[1] += h[k]; x[2] += h[k + 1]; x[3] += h[k + 2]; mapa.set(key, x);
        }
      }
      if (!mapa.size) continue;
      const rows = [...mapa.values()].sort((a, b) => b[0] - a[0]);
      let poc = rows[0]; for (const r of rows) if (r[1] + r[2] > poc[1] + poc[2]) poc = r;
      delta[i] = rows.reduce((s, r) => s + r[1] - r[2], 0);
      barras.push({ time: t0, rows, poc: poc[0] });
    }
    return { delta, footprint: { barras, passo, modo: p.modo, deseq: p.deseq } };
  },
};
`);

  // 8) Big Bubbles: bolhas no preço exato onde entrou volume fora do normal
  gravar('bolhas-win.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// BIG BUBBLES do WIN: bolha no PRECO EXATO onde entrou um volume muito acima do normal dentro da vela,
// com a cor de quem agrediu: verde = compradores, roxo = vendedores. Quanto maior o volume, maior a bolha.
// "Normal" = o maior preco de cada vela nas ultimas N velas (so velas passadas, nada do futuro).
// Vendedores agredindo forte no fundo de uma queda e o preco parando de cair costuma indicar absorcao.
// Usa os negocios publicos da B3 (lado comprador/vendedor estimado pela regra do tick). Use no CSV:WIN.
const DADOS = ${JSON.stringify({ t: comHp.map((m) => m.t), hp: comHp.map((m) => m.hp) })};
export default {
  name: 'Big Bubbles WIN (Big Bubbles)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'sens', label: 'Sensibilidade (desvios acima do normal; menor = mais bolhas)', type: 'float', default: 1.2, min: 0.3, max: 6 },
    { key: 'janela', label: 'Comparar com as ultimas N velas', type: 'int', default: 300, min: 30, max: 3000 },
    { key: 'linha', label: 'Agrupar precos de (pontos, 0 = automatico)', type: 'int', default: 0, min: 0 },
    { key: 'lado', label: 'Mostrar', type: 'select', default: 'Compradores e vendedores', options: ['Compradores e vendedores', 'So vendedores', 'So compradores'] },
    { key: 'porvela', label: 'Bolhas por vela (maximo)', type: 'int', default: 2, min: 1, max: 5 },
    { key: 'tamanho', label: 'Tamanho das bolhas (%)', type: 'int', default: 100, min: 30, max: 300 },
  ],
  outputs: [{ key: 'vol', label: 'Volume da maior bolha', kind: 'line', color: '#00000000' }],
  calc(bars, p) {
    const n = bars.length, vol = new Array(n).fill(NaN), itens = [];
    const T = DADOS.t, passoBar = n > 1 ? bars[1].time - bars[0].time : 60;
    let passo = Math.max(5, Math.round(p.linha / 5) * 5);
    if (!p.linha) {
      const am = bars.slice(-500).map((b) => b.high - b.low).sort((a, b) => a - b);
      passo = Math.max(5, Math.ceil((am[Math.floor(am.length / 2)] || 50) / 10 / 5) * 5);
    }
    // celulas (preco, compra, venda) de cada vela
    const cel = new Array(n); let j = 0;
    for (let i = 0; i < n; i++) {
      const t0 = bars[i].time, t1 = i + 1 < n ? bars[i + 1].time : t0 + passoBar;
      if (j > 0 && T[j - 1] >= t0) j = 0;
      while (j < T.length && T[j] < t0) j++;
      const mapa = new Map();
      for (; j < T.length && T[j] < t1; j++) {
        const h = DADOS.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q += 5) {
          if (!h[k] && !h[k + 1]) continue;
          const key = Math.floor(q / passo) * passo + (passo > 5 ? passo / 2 : 0);
          const x = mapa.get(key) || [key, 0, 0]; x[1] += h[k]; x[2] += h[k + 1]; mapa.set(key, x);
        }
      }
      cel[i] = [...mapa.values()];
    }
    // normal: log do maior preco de cada vela nas ultimas N velas
    const topo = cel.map((c) => (c.length ? Math.log(1 + Math.max(...c.map((x) => x[1] + x[2]))) : NaN));
    let maxVol = 1; const cand = [];
    for (let i = 0; i < n; i++) {
      if (!cel[i].length) continue;
      let s = 0, q = 0, c = 0;
      for (let k = Math.max(0, i - p.janela); k < i; k++) if (Number.isFinite(topo[k])) { s += topo[k]; q += topo[k] * topo[k]; c++; }
      if (c < 30) continue;
      const m = s / c, sd = Math.sqrt(Math.max(1e-9, q / c - m * m));
      const lista = cel[i].map((x) => ({ x, z: (Math.log(1 + x[1] + x[2]) - m) / sd }))
        .filter((o) => o.z >= p.sens).sort((a, b) => b.z - a.z).slice(0, p.porvela);
      for (const o of lista) {
        const lado = o.x[1] >= o.x[2] ? 1 : -1;
        if ((p.lado === 'So vendedores' && lado > 0) || (p.lado === 'So compradores' && lado < 0)) continue;
        const v = o.x[1] + o.x[2]; maxVol = Math.max(maxVol, v);
        cand.push({ time: bars[i].time, p: o.x[0], v, lado, i });
      }
    }
    for (const o of cand) {
      const r = Math.sqrt(o.v / maxVol);
      itens.push({ time: o.time, p: o.p, r, lado: o.lado, txt: o.v >= 1000 ? (o.v / 1000).toFixed(1).replace('.', ',') + 'k' : String(o.v) });
      vol[o.i] = Math.max(Number.isFinite(vol[o.i]) ? vol[o.i] : 0, o.v);
    }
    return { vol, bolhas: { itens, escala: p.tamanho / 100 } };
  },
};
`);

  // 4) Placar
  gravar('fluxo-win-placar.js', `${cab}// Placar de vies de -100 a +100: junta, nas ultimas N velas, o saldo de agressao, o saldo das estrangeiras
// e o saldo dos lotes grandes, cada um comparado com o seu proprio normal (desvio padrao das ultimas 300 velas).
// So usa velas ja fechadas (nada do futuro). "sinal" vale +1 (compra), -1 (venda) ou 0, para alertas e testes.
${DADOS}${AJUDA}
${PLACAR}
export default {
  name: 'Fluxo WIN placar (Placar)',
  overlay: false,
  inputs: [
    { key: 'janela', label: 'Janela (velas)', type: 'int', default: 15, min: 3, max: 120 },
    { key: 'limiar', label: 'Limiar do sinal', type: 'int', default: 40, min: 5, max: 95 },
    { key: 'peso_agr', label: 'Peso agressao', type: 'float', default: 1, min: 0 },
    { key: 'peso_est', label: 'Peso estrangeiras', type: 'float', default: 1, min: 0 },
    { key: 'peso_lot', label: 'Peso lotes grandes', type: 'float', default: 1, min: 0 },
  ],
  outputs: [
    { key: 'placar', label: 'Placar', kind: 'histogram', color: '#26a69a' },
    { key: 'sinal', label: 'Sinal', kind: 'line', color: '#ffca28' },
  ],
  levels: [-40, 0, 40],
  calc(bars, p) {
    const n = bars.length, sc = _placar(bars, p);
    const placar = _nan(n), sinal = _nan(n), colors = [];
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(sc[i])) { colors.push(null); continue; }
      placar[i] = sc[i]; sinal[i] = sc[i] >= p.limiar ? 1 : sc[i] <= -p.limiar ? -1 : 0;
      colors.push(sc[i] >= p.limiar ? '#26a69a' : sc[i] <= -p.limiar ? '#ef5350' : sc[i] >= 0 ? '#26a69a66' : '#ef535066');
    }
    return { placar, sinal, colors };
  },
};
`);
}

// ---------- principal ----------
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
const hoje = process.env.WIN_HOJE ? new Date(process.env.WIN_HOJE + 'T12:00:00Z') : new Date();
const hojeD = D(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
const dias = [];
for (const d = new Date(hojeD); dias.length < DIAS && hojeD - d < 60 * 864e5; d.setUTCDate(d.getUTCDate() - 1)) if (util(d)) dias.push(new Date(d));
dias.reverse();

const todos = [];
for (const dia of dias) {
  const data = iso(dia), tk = contratoWin(dia), arqCache = path.join(CACHE, `${tk}-${data}.v4.json`);
  const fechado = data < iso(hojeD);
  if (fechado && fs.existsSync(arqCache)) {
    const ms = JSON.parse(fs.readFileSync(arqCache, 'utf8'));
    todos.push(...ms); console.log(`${data} ${tk}: ${ms.length} minutos (guardados)`); continue;
  }
  process.stdout.write(`${data} ${tk}: baixando os negocios da B3... `);
  const zip = await baixar(tk, data);
  if (!zip) { console.log('sem negocios nesse dia'); continue; }
  const { minutos, negocios } = await minutosDoArquivo(zip, data);
  console.log(`${negocios.toLocaleString('pt-BR')} negocios, ${minutos.length} minutos`);
  if (fechado && minutos.length) fs.writeFileSync(arqCache, JSON.stringify(minutos));
  todos.push(...minutos);
}
if (!todos.length) { console.log('Nao encontrei negocios do WIN. Tente de novo mais tarde.'); process.exit(1); }

const csv = ['time,open,high,low,close,volume', ...todos.map((v) => `${new Date(v.t * 1000).toISOString().replace('.000Z', 'Z')},${v.o},${v.h},${v.l},${v.c},${v.v}`)].join('\n') + '\n';
fs.writeFileSync(SAIDA, csv);

// corretoras: nomes do arquivo do usuário, se existir
try { Object.assign(CORRETORAS, JSON.parse(fs.readFileSync(path.join(DADOS, 'corretoras.json'), 'utf8'))); } catch { /* sem arquivo */ }
const giro = {};
for (const m of todos) for (const [b, x] of Object.entries(m.net)) giro[b] = (giro[b] || 0) + Math.abs(x);
const topo = Object.entries(giro).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([b]) => b);
if (fs.existsSync(CUSTOM)) gerarIndicadores(todos, topo);
const desenhos = instalarDesenhos(RAIZ);
if (desenhos === 'instalado') console.log('Desenhos extras instalados no terminal.');
else if (desenhos !== 'ok') console.log('Aviso: os desenhos extras nao foram instalados (' + desenhos + ').');

const ult = todos.at(-1);
console.log(`Pronto: ${todos.length} velas de 1 minuto (ultimo preco ${ult.c.toLocaleString('pt-BR')}, ${new Date((ult.t - FUSO) * 1000).toISOString().slice(11, 16)} de Brasilia).`);
console.log(`Corretoras que mais negociaram: ${topo.map((b) => `#${b} ${CORRETORAS[b] || ''}`.trim()).join(', ')}`);
console.log('No terminal: Ctrl+F5, digite CSV:WIN e procure "Fluxo WIN", "Perfil de Volume" ou "Footprint" em Indicators.');
