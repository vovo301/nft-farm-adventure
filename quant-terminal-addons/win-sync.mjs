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
      if (!m) min.set(t, (m = { t, o: preco, h: preco, l: preco, c: preco, v: 0, ba: 0, sa: 0, gb: 0, gs: 0, gp: 0, net: {} }));
      if (preco > m.h) m.h = preco; if (preco < m.l) m.l = preco;
      m.c = preco; m.v += qtd; n++;
      // regra do tick: subiu = agressão de compra, caiu = de venda, igual = mesmo lado do anterior
      const lado = preco > ultPreco ? 1 : preco < ultPreco ? -1 : ultLado;
      ultPreco = preco; ultLado = lado;
      if (lado > 0) m.ba += qtd; else if (lado < 0) m.sa += qtd;
      if (qtd >= LOTE_GRANDE) { if (lado > 0) m.gb += qtd; else if (lado < 0) m.gs += qtd; m.gp += preco * qtd; }
      const cp = c[9], vd = c[10];
      if (cp !== vd) { m.net[cp] = (m.net[cp] || 0) + qtd; m.net[vd] = (m.net[vd] || 0) - qtd; }
    }
  } catch (e) {
    if (!min.size) throw e; // arquivo cortado no fim: fica com o que deu para ler
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
  const data = iso(dia), tk = contratoWin(dia), arqCache = path.join(CACHE, `${tk}-${data}.v2.json`);
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

const ult = todos.at(-1);
console.log(`Pronto: ${todos.length} velas de 1 minuto (ultimo preco ${ult.c.toLocaleString('pt-BR')}, ${new Date((ult.t - FUSO) * 1000).toISOString().slice(11, 16)} de Brasilia).`);
console.log(`Corretoras que mais negociaram: ${topo.map((b) => `#${b} ${CORRETORAS[b] || ''}`.trim()).join(', ')}`);
console.log('No terminal: Ctrl+F5, digite CSV:WIN e procure "Fluxo WIN" em Indicators.');
