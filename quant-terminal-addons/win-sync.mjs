// win-sync.mjs — WIN (mini índice) e WDO (mini dólar) com volume real e leitura de fluxo, feitos com os negócios públicos da B3.
// Coloque em quant-terminal\scripts e rode:  node scripts/win-sync.mjs        (últimos 5 pregões)
//                                             node scripts/win-sync.mjs 10     (últimos 10 pregões)
//                                             node scripts/win-sync.mjs 5 WIN  (só o WIN; o padrão é WIN e WDO)
// Grava:
//   data/imports/WIN.csv, WDO.csv     velas de 1 minuto (o terminal mostra como os ativos CSV:WIN e CSV:WDO)
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
const IMPORTS = path.join(DADOS, 'imports');
const DIAS = Math.max(1, Math.min(30, parseInt(process.argv[2] || '5', 10) || 5));
const FUSO = 3 * 3600;      // horário de Brasília = UTC-3
const LOTE_GRANDE = 100;    // contratos num único negócio (WIN)
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

function contratoWdo(dia) { // WDO vence no 1º dia útil do mês: o vigente é o próximo vencimento depois de hoje
  const LET = 'FGHJKMNQUVXZ';
  for (let k = 0; k < 14; k++) {
    const y = dia.getUTCFullYear() + Math.floor((dia.getUTCMonth() + k) / 12), m = (dia.getUTCMonth() + k) % 12;
    const v = D(y, m, 1); while (!util(v)) v.setUTCDate(v.getUTCDate() + 1);
    if (v > dia) return 'WDO' + LET[m] + String(y).slice(2);
  }
  return null;
}
const ATIVOS = {
  WIN: { nome: 'mini indice', tick: 5, contrato: contratoWin, lote: 100 },
  WDO: { nome: 'mini dolar', tick: 0.5, contrato: contratoWdo, lote: 50 },
};
const LISTA = String(process.argv[3] || 'WIN,WDO').toUpperCase().split(',').filter((a) => ATIVOS[a]);

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
async function minutosDoArquivo(zip, data, tick = 5, lote = LOTE_GRANDE) {
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
      if (qtd >= lote) { if (lado > 0) m.gb += qtd; else if (lado < 0) m.gs += qtd; m.gp += preco * qtd; }
      const cp = c[9], vd = c[10];
      if (cp !== vd) { m.net[cp] = (m.net[cp] || 0) + qtd; m.net[vd] = (m.net[vd] || 0) - qtd; }
    }
  } catch (e) {
    if (!min.size) throw e; // arquivo cortado no fim: fica com o que deu para ler
  }
  // volume por preço, compacto: [preço mínimo, compra, venda, negócios, compra, venda, negócios, ...] de tick em tick
  for (const m of min.values()) {
    const ps = [...m.pv.keys()], lo = Math.min(...ps), hi = Math.max(...ps), hp = [lo];
    const np = Math.round((hi - lo) / tick);
    for (let k = 0; k <= np; k++) { const x = m.pv.get(Math.round((lo + k * tick) * 100) / 100) || [0, 0, 0]; hp.push(x[0], x[1], x[2]); }
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

const CONFERE = `
const _escolher = (bars) => { // qual ativo (WIN ou WDO) tem os mesmos precos deste grafico? (evita desenhar em cima do ^BVSP)
  for (const D of DADOS.ativos) {
    const T = D.t; let ok = 0, tot = 0, j = 0;
    for (let i = Math.max(0, bars.length - 400); i < bars.length; i++) {
      while (j < T.length && T[j] < bars[i].time) j++;
      if (j >= T.length) break;
      if (T[j] !== bars[i].time) continue;
      const h = D.hp[j], lo = h[0], hi = h[0] + ((h.length - 1) / 3 - 1) * D.tick;
      tot++; if (bars[i].close >= lo - 20 * D.tick && bars[i].close <= hi + 20 * D.tick) ok++;
    }
    if (tot > 0 && ok / tot >= 0.6) return D;
  }
  return null;
};`;

const DIVERG = `
// Divergencias de CVD nos fundos/topos de preco (um fundo/topo so vale quando as R velas seguintes ja fecharam):
//  EXAUSTAO: preco faz fundo mais baixo e o CVD nao acompanha (fundo mais alto) -> vendedores acabaram (compra);
//            preco faz topo mais alto e o CVD nao acompanha -> compradores acabaram (venda).
//  ABSORCAO: o CVD faz fundo mais baixo (venderam mais) mas o preco NAO faz fundo mais baixo -> vendedores absorvidos
//            (compra); o CVD faz topo mais alto mas o preco nao -> compradores absorvidos (venda).
const _diverg = (bars, cvd, L = 5, R = 2, longe = 60) => {
  const n = bars.length, diaDe = (t) => Math.floor((t - 10800) / 86400), out = [];
  const pivo = (i, baixo) => {
    if (i - L < 0 || i + R >= n) return false;
    for (let k = i - L; k <= i + R; k++) {
      if (k === i) continue;
      if (diaDe(bars[k].time) !== diaDe(bars[i].time)) return false;
      if (baixo ? bars[k].low < bars[i].low : bars[k].high > bars[i].high) return false;
    }
    return true;
  };
  let antB = -1, antA = -1;
  const ok = (a, i) => a >= 0 && i - a <= longe && diaDe(bars[a].time) === diaDe(bars[i].time) && Number.isFinite(cvd[a]);
  for (let i = L; i + R < n; i++) {
    if (!Number.isFinite(cvd[i])) continue;
    if (pivo(i, true)) {
      if (ok(antB, i)) {
        if (bars[i].low < bars[antB].low && cvd[i] > cvd[antB]) out.push({ i, de: antB, conf: i + R, lado: 1, tipo: 'exa' });
        else if (bars[i].low >= bars[antB].low && cvd[i] < cvd[antB]) out.push({ i, de: antB, conf: i + R, lado: 1, tipo: 'abs' });
      }
      antB = i;
    }
    if (pivo(i, false)) {
      if (ok(antA, i)) {
        if (bars[i].high > bars[antA].high && cvd[i] < cvd[antA]) out.push({ i, de: antA, conf: i + R, lado: -1, tipo: 'exa' });
        else if (bars[i].high <= bars[antA].high && cvd[i] > cvd[antA]) out.push({ i, de: antA, conf: i + R, lado: -1, tipo: 'abs' });
      }
      antA = i;
    }
  }
  return out;
};
// Niveis de GEX do dia (data/gex-historico.json; os niveis do arquivo da B3 de um dia valem para o pregao seguinte)
// e o regime de gamma: preco acima do Flip = gamma positivo (+1, absorve), abaixo = negativo (-1, acelera).
const _cacheDia = new Map();
const _niveisDia = (D, t) => {
  const dia = new Date((t - 10800) * 1000).toISOString().slice(0, 10), ch = D.nome + dia;
  if (_cacheDia.has(ch)) return _cacheDia.get(ch);
  let melhor = null, chave = '';
  for (const [k, v] of Object.entries(D.gexHist || {})) if (k < dia && k > chave) { chave = k; melhor = v; }
  const r = melhor || D.gex || {};
  _cacheDia.set(ch, r); return r;
};
const _regime = (D, t, preco) => {
  const nv = _niveisDia(D, t);
  if (Number.isFinite(nv.flip)) return preco >= nv.flip ? 1 : -1;
  if (nv.regime) return nv.regime === 'AMO' ? 1 : -1;
  return 0;
};`;

function gravar(nome, codigo) { fs.writeFileSync(path.join(CUSTOM, nome), codigo); }

function gerarIndicadores(mins, topo, ferr) {
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
  gravar('perfil-volume.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// PERFIL DE VOLUME (como o FRVP do TradingView) com POC, VAH e VAL escritos.
// No CSV:WIN e no CSV:WDO usa o volume exato de cada preco, dos negocios da B3 (WIN e WDO), separado em compra e venda.
// Em outros ativos (ou dias sem esse dado) estima espalhando o volume de cada vela entre a minima e a maxima.
// Modo "Periodo escolhido": ao adicionar, clique na vela de inicio; o fim vazio vai ate a ultima vela.
const DADOS = ${ferr};
${CONFERE}
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
    const perfis = [], D = _escolher(bars) || { t: [], hp: [], tick: 5 };
    for (const [a, z] of trechos) {
      const t0 = bars[a].time, t1 = z + 1 < n ? bars[z + 1].time : bars[z].time + passoBar;
      // 1) volume por preco: exato (negocios da B3) ou estimado pelas velas
      const mapa = new Map(); let exato = false;
      let lo = 0, hi = D.t.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (D.t[m] < t0) lo = m + 1; else hi = m; }
      for (let j = lo; j < D.t.length && D.t[j] < t1; j++) {
        const h = D.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q = Math.round((q + D.tick) * 100) / 100) {
          if (!h[k] && !h[k + 1]) continue;
          const x = mapa.get(q) || [0, 0]; x[0] += h[k]; x[1] += h[k + 1]; mapa.set(q, x); exato = true;
        }
      }
      let pmin = Infinity, pmax = -Infinity;
      for (let i = a; i <= z; i++) { pmin = Math.min(pmin, bars[i].low); pmax = Math.max(pmax, bars[i].high); }
      if (!(pmax > pmin)) continue;
      let passo = p.linha > 0 ? p.linha : (pmax - pmin) / 60;
      if (exato && !(p.linha > 0)) passo = Math.max(D.tick, Math.ceil(passo / D.tick) * D.tick);
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
// o delta, o volume total ou o numero de negocios, dos negocios publicos da B3. Use no CSV:WIN ou no CSV:WDO.
// Os numeros aparecem quando as velas estao largas: de zoom (role o mouse no grafico) ate as celulas ficarem legiveis.
// Destaques: compra em negrito verde quando e >= N vezes a venda um degrau abaixo; venda em vermelho quando e >= N vezes
// a compra um degrau acima (desequilibrio). Contorno amarelo = POC da vela. Embaixo da vela, o delta total.
// A B3 publica negocios, nao ordens: uma ordem que varre varios precos aparece como varios negocios.
const DADOS = ${ferr};
${CONFERE}
export default {
  name: 'Footprint WIN WDO (Footprint)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'modo', label: 'Mostrar', type: 'select', default: 'Venda x Compra', options: ['Venda x Compra', 'Delta', 'Volume', 'Negocios'] },
    { key: 'linha', label: 'Agrupar precos de (pontos, 0 = automatico)', type: 'int', default: 0, min: 0 },
    { key: 'deseq', label: 'Desequilibrio (vezes)', type: 'float', default: 3, min: 1.5 },
    { key: 'velas', label: 'Quantas velas (as mais recentes, 0 = todas)', type: 'int', default: 0, min: 0 },
  ],
  outputs: [{ key: 'delta', label: 'Delta da vela', kind: 'line', color: '#00000000' }],
  calc(bars, p) {
    const n = bars.length, delta = new Array(n).fill(NaN), barras = [];
    const D = _escolher(bars);
    if (!D) return { delta, footprint: { barras, passo: 5, modo: p.modo, deseq: p.deseq, aviso: 'Footprint so no CSV:WIN e no CSV:WDO (negocios da B3).' } };
    let passo = Math.max(D.tick, Math.round(p.linha / D.tick) * D.tick);
    if (!p.linha) { // automatico: cerca de 10 linhas na vela tipica
      const am = bars.slice(-Math.min(n, p.velas)).map((b) => b.high - b.low).sort((a, b) => a - b);
      passo = Math.max(D.tick, Math.ceil((am[Math.floor(am.length / 2)] || 10 * D.tick) / 10 / D.tick) * D.tick);
    }
    const T = D.t;
    const passoBar = n > 1 ? bars[1].time - bars[0].time : 60;
    let j = 0;
    for (let i = p.velas > 0 ? Math.max(0, n - p.velas) : 0; i < n; i++) {
      const t0 = bars[i].time, t1 = i + 1 < n ? bars[i + 1].time : t0 + passoBar;
      if (j > 0 && T[j - 1] >= t0) j = 0;
      while (j < T.length && T[j] < t0) j++;
      const mapa = new Map();
      for (; j < T.length && T[j] < t1; j++) {
        const h = D.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q = Math.round((q + D.tick) * 100) / 100) {
          if (!h[k + 2]) continue;
          const key = Math.round((Math.floor(q / passo + 1e-9) * passo + (passo > D.tick ? passo / 2 : 0)) * 100) / 100;
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

  // 9) CVD com divergências
  gravar('cvd-win.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// CVD (delta acumulado do dia) do WIN ou do WDO, dos negocios da B3 (agressor estimado pela regra do tick).
// Marca no grafico as divergencias de ABSORCAO (azul: o CVD avancou e o preco nao) e de EXAUSTAO (roxa: o preco
// avancou e o CVD nao). Com "Filtrar pelo regime de gamma", so mostra a que funciona no regime do momento:
// acima do Gamma Flip (gamma positivo, dealers absorvem) = ABSORCAO; abaixo (gamma negativo, aceleram) = EXAUSTAO.
// A marca aparece 2 velas depois do fundo/topo, quando ele se confirma. Use no CSV:WIN ou no CSV:WDO.
const DADOS = ${ferr};
${CONFERE}
${DIVERG}
export default {
  name: 'CVD WIN WDO com divergencias (CVD)',
  overlay: false,
  inputs: [
    { key: 'esq', label: 'Fundo/topo: velas a esquerda', type: 'int', default: 5, min: 2, max: 30 },
    { key: 'dir', label: 'Fundo/topo: velas de confirmacao a direita', type: 'int', default: 2, min: 1, max: 10 },
    { key: 'longe', label: 'Distancia maxima entre os dois fundos/topos (velas)', type: 'int', default: 60, min: 5, max: 400 },
    { key: 'marcas', label: 'Marcar divergencias no grafico', type: 'select', default: 'Sim', options: ['Sim', 'Nao'] },
    { key: 'regime', label: 'Filtrar pelo regime de gamma (absorcao em G+, exaustao em G-)', type: 'select', default: 'Nao', options: ['Nao', 'Sim'] },
    { key: 'texto', label: 'Texto nas setas (azul = absorcao, roxa = exaustao)', type: 'select', default: 'Nao', options: ['Nao', 'Sim'] },
  ],
  outputs: [{ key: 'cvd', label: 'CVD do dia', kind: 'line', color: '#42a5f5', lineWidth: 2 }],
  levels: [0],
  calc(bars, p) {
    const n = bars.length, cvd = new Array(n).fill(NaN);
    const D = _escolher(bars);
    if (!D) return { cvd };
    const T = D.t, passoBar = n > 1 ? bars[1].time - bars[0].time : 60, diaDe = (t) => Math.floor((t - 10800) / 86400);
    let j = 0, soma = 0, dia = -1, primeira = false;
    for (let i = 0; i < n; i++) {
      const t0 = bars[i].time, t1 = i + 1 < n ? bars[i + 1].time : t0 + passoBar;
      if (diaDe(t0) !== dia) { soma = 0; dia = diaDe(t0); primeira = true; }
      while (j < T.length && T[j] < t0) j++;
      let tem = false, d = 0;
      for (; j < T.length && T[j] < t1; j++) { const h = D.hp[j]; for (let k = 1; k < h.length; k += 3) d += h[k] - h[k + 1]; tem = true; }
      if (!tem) continue;
      if (primeira) { primeira = false; cvd[i] = 0; continue; } // 1a vela do dia: leilao de abertura, sem agressor
      soma += d; cvd[i] = soma;
    }
    const markers = [];
    if (p.marcas === 'Sim')
      for (const d of _diverg(bars, cvd, p.esq, p.dir, p.longe)) {
        const rg = _regime(D, bars[d.conf].time, bars[d.conf].close);
        if (p.regime === 'Sim' && rg !== 0 && (d.tipo === 'abs' ? rg < 0 : rg > 0)) continue; // nao combina com o regime
        markers.push({ time: bars[d.conf].time, position: d.lado > 0 ? 'belowBar' : 'aboveBar', shape: d.lado > 0 ? 'arrowUp' : 'arrowDown',
          color: d.tipo === 'abs' ? '#42a5f5' : '#b388ff', text: p.texto === 'Sim' ? (d.tipo === 'abs' ? 'DIV ABS' : 'DIV EXA') + (rg > 0 ? ' G+' : rg < 0 ? ' G-' : '') : '' });
      }
    return { cvd, markers };
  },
};
`);

  // 8) Big Bubbles: bolhas no preço exato onde entrou volume fora do normal
  gravar('bolhas-win.js', `// Gerado por win-sync.mjs em ${new Date().toISOString()}.
// BIG BUBBLES do WIN: bolha no PRECO EXATO onde entrou um volume muito acima do normal dentro da vela,
// com a cor de quem agrediu: verde = compradores, roxo = vendedores, amarelo = disputa (nenhum lado passou do
// "dominio minimo"). Quanto maior o volume, maior a bolha. Dentro: o volume e o lado que agrediu (C 72% / V 68%).
// Como decide: para cada preco da vela mede o volume (ou o saldo de agressao, em "Medir por") e compara com o
// "normal" = o maior preco de cada vela nas ultimas N velas, em escala logaritmica. Vira bolha quando passa de
// "Sensibilidade" desvios acima desse normal. So velas passadas entram no normal (nada do futuro).
// O primeiro minuto de cada pregao (leilao de abertura, sem agressor) e ignorado.
// Leitura "Absorcao" (padrao): so mostra a bolha quando a agressao forte aconteceu na ponta da vela (vendedor na
// parte de baixo, comprador na de cima) e o preco NAO seguiu nas N velas seguintes: nao passou daquele preco
// (alem de uma folga) e fechou do outro lado. Ou seja, o agressor ficou preso e foi absorvido. Como precisa das
// velas seguintes, a bolha so aparece depois que elas fecham.
// Vendedores agredindo forte no fundo de uma queda e o preco parando de cair costuma indicar absorcao.
// Usa os negocios publicos da B3 (lado comprador/vendedor estimado pela regra do tick). Use no CSV:WIN ou no CSV:WDO.
const DADOS = ${ferr};
${CONFERE}
${DIVERG}
export default {
  name: 'Big Bubbles WIN WDO (Big Bubbles)',
  overlay: true,
  noAutoscale: true,
  inputs: [
    { key: 'sens', label: 'Sensibilidade (desvios acima do normal; menor = mais bolhas)', type: 'float', default: 1.2, min: 0.3, max: 6 },
    { key: 'janela', label: 'Comparar com as ultimas N velas', type: 'int', default: 300, min: 30, max: 3000 },
    { key: 'linha', label: 'Agrupar precos de (pontos, 0 = automatico)', type: 'int', default: 0, min: 0 },
    { key: 'lado', label: 'Mostrar', type: 'select', default: 'Compradores e vendedores', options: ['Compradores e vendedores', 'So vendedores', 'So compradores'] },
    { key: 'porvela', label: 'Bolhas por vela (maximo)', type: 'int', default: 2, min: 1, max: 5 },
    { key: 'tamanho', label: 'Tamanho das bolhas (%)', type: 'int', default: 100, min: 30, max: 300 },
    { key: 'medir', label: 'Medir por', type: 'select', default: 'Saldo de agressao', options: ['Saldo de agressao', 'Volume total'] },
    { key: 'dominio', label: 'Dominio minimo para colorir (% do lado que agrediu)', type: 'int', default: 60, min: 50, max: 95 },
    { key: 'opacidade', label: 'Opacidade (%)', type: 'int', default: 60, min: 10, max: 100 },
    { key: 'leitura', label: 'Leitura', type: 'select', default: 'Absorcao (agressor preso)', options: ['Absorcao (agressor preso)', 'Toda agressao forte'] },
    { key: 'confirmar', label: 'Absorcao: velas seguintes para confirmar', type: 'int', default: 3, min: 1, max: 20 },
    { key: 'ponta', label: 'Absorcao: agressao na ponta da vela (% da vela)', type: 'int', default: 40, min: 10, max: 100 },
    { key: 'minimo', label: 'Minimo de contratos no preco (0 = so o filtro automatico)', type: 'int', default: 0, min: 0 },
    { key: 'zonas', label: 'Caixas de leitura', type: 'select', default: 'So as fortes (nivel GEX ou DIV CVD)', options: ['So as fortes (nivel GEX ou DIV CVD)', 'Absorcao e exaustao', 'So absorcao', 'So exaustao', 'Nenhuma'] },
    { key: 'estilo', label: 'Caixas: so a caixa (laranja = absorcao, roxa = exaustao) ou com o texto', type: 'select', default: 'So a caixa', options: ['So a caixa', 'Com texto'] },
    { key: 'desloc', label: 'Caixa de absorcao: deslocamento maximo do preco (em velas tipicas)', type: 'float', default: 2.5, min: 0.5, max: 6 },
    { key: 'regime', label: 'Caixas: so as que combinam com o regime de gamma (absorcao em G+, exaustao em G-)', type: 'select', default: 'Nao', options: ['Nao', 'Sim'] },
    { key: 'fonte', label: 'Bolhas: agressao concentrada num preco e tambem a espalhada na vela', type: 'select', default: 'Preco e vela', options: ['Preco e vela', 'So concentrada num preco'] },
    { key: 'velaX', label: 'Bolha da vela: saldo da vela >= X vezes a media das ultimas 30 velas', type: 'float', default: 1.5, min: 1, max: 6 },
  ],
  outputs: [{ key: 'vol', label: 'Volume da maior bolha', kind: 'line', color: '#00000000' }],
  calc(bars, p) {
    const n = bars.length, vol = new Array(n).fill(NaN), itens = [];
    const D = _escolher(bars);
    if (!D) return { vol, bolhas: { itens } };
    const T = D.t, passoBar = n > 1 ? bars[1].time - bars[0].time : 60;
    let passo = Math.max(D.tick, Math.round(p.linha / D.tick) * D.tick);
    if (!p.linha) {
      const am = bars.slice(-500).map((b) => b.high - b.low).sort((a, b) => a - b);
      passo = Math.max(D.tick, Math.ceil((am[Math.floor(am.length / 2)] || 10 * D.tick) / 10 / D.tick) * D.tick);
    }
    // celulas (preco, compra, venda) de cada vela
    const cel = new Array(n); let j = 0;
    for (let i = 0; i < n; i++) {
      const t0 = bars[i].time, t1 = i + 1 < n ? bars[i + 1].time : t0 + passoBar;
      if (j > 0 && T[j - 1] >= t0) j = 0;
      while (j < T.length && T[j] < t0) j++;
      const mapa = new Map();
      for (; j < T.length && T[j] < t1; j++) {
        const h = D.hp[j];
        for (let k = 1, q = h[0]; k < h.length; k += 3, q = Math.round((q + D.tick) * 100) / 100) {
          if (!h[k] && !h[k + 1]) continue;
          const key = Math.round((Math.floor(q / passo + 1e-9) * passo + (passo > D.tick ? passo / 2 : 0)) * 100) / 100;
          const x = mapa.get(key) || [key, 0, 0]; x[1] += h[k]; x[2] += h[k + 1]; mapa.set(key, x);
        }
      }
      cel[i] = [...mapa.values()];
    }
    // normal: log do maior preco de cada vela nas ultimas N velas
    const val = (x) => (p.medir === 'Saldo de agressao' ? Math.abs(x[1] - x[2]) : x[1] + x[2]);
    const diaDe = (t) => Math.floor((t - 10800) / 86400);
    const topo = cel.map((c) => (c.length ? Math.log(1 + Math.max(...c.map(val))) : NaN));
    const dVela = cel.map((c) => c.reduce((s, x) => s + x[1] - x[2], 0));
    let maxVol = 1; const cand = [], fortes = [];
    for (let i = 0; i < n; i++) {
      if (!cel[i].length) continue;
      let k0 = i - 1; while (k0 >= 0 && !cel[k0].length) k0--;
      if (k0 < 0 || diaDe(bars[k0].time) !== diaDe(bars[i].time)) continue; // primeira vela do dia: leilao de abertura
      let s = 0, q = 0, c = 0;
      for (let k = Math.max(0, i - p.janela); k < i; k++) if (Number.isFinite(topo[k])) { s += topo[k]; q += topo[k] * topo[k]; c++; }
      if (c < 30) continue;
      const m = s / c, sd = Math.sqrt(Math.max(1e-9, q / c - m * m));
      const lista = cel[i].map((x) => ({ x, z: (Math.log(1 + val(x)) - m) / sd }))
        .filter((o) => o.z >= p.sens);
      if (p.fonte !== 'So concentrada num preco') {
        // agressao espalhada por varios precos: o saldo da vela inteira comparado com o ritmo recente
        // (media do |saldo| das 30 velas anteriores)
        let s2 = 0, c2 = 0;
        for (let k = Math.max(0, i - 30); k < i; k++) if (cel[k].length) { s2 += Math.abs(dVela[k]); c2++; }
        const rv = c2 >= 10 ? Math.abs(dVela[i]) / Math.max(1, s2 / c2) : 0, zv = p.sens + (rv - p.velaX);
        if (rv >= p.velaX) {
          const lado = Math.sign(dVela[i]);
          // a bolha vai no preco onde esse lado mais agrediu
          const melhor = cel[i].reduce((b, x) => ((x[1] - x[2]) * lado > (b[1] - b[2]) * lado ? x : b), cel[i][0]);
          const cT = cel[i].reduce((s, x) => s + x[1], 0), vT = cel[i].reduce((s, x) => s + x[2], 0);
          if (!lista.some((o) => o.x[0] === melhor[0])) lista.push({ x: [melhor[0], cT, vT], z: zv, vela: true });
        }
      }
      lista.sort((a, b) => b.z - a.z);
      let naVela = 0;
      for (const o of lista) {
        if (naVela >= p.porvela) break;
        const tot = o.x[1] + o.x[2], dom = Math.max(o.x[1], o.x[2]) / Math.max(1, tot);
        // na vela inteira o saldo ja foi testado contra o normal: o lado e o sinal do delta
        const lado = o.vela ? Math.sign(o.x[1] - o.x[2]) : dom * 100 < p.dominio ? 0 : o.x[1] > o.x[2] ? 1 : -1;
        if ((p.lado === 'So vendedores' && lado >= 0) || (p.lado === 'So compradores' && lado <= 0)) continue;
        const v = val(o.x);
        if (p.minimo > 0 && v < p.minimo) continue;
        if (lado !== 0) fortes.push({ time: bars[i].time, p: o.x[0], v, lado, i, sub: (lado > 0 ? 'C ' : 'V ') + Math.round(dom * 100) + '%' });
        if (p.leitura !== 'Toda agressao forte') {
          // absorcao: agressao na ponta da vela e o preco nao seguiu nas proximas velas
          if (lado === 0) continue;
          const b = bars[i], faixa = Math.max(D.tick, b.high - b.low), pnt = faixa * p.ponta / 100;
          if (lado < 0 && o.x[0] > b.low + pnt) continue;   // vendedor tem que estar na parte de baixo
          if (lado > 0 && o.x[0] < b.high - pnt) continue;  // comprador na parte de cima
          const fim = i + p.confirmar;
          if (fim >= n || diaDe(bars[fim].time) !== diaDe(b.time)) continue; // ainda nao da para confirmar
          const folga = passo;
          let preso = true;
          for (let k = i + 1; k <= fim; k++) {
            if (lado < 0 && bars[k].low < o.x[0] - folga) { preso = false; break; }  // preco seguiu caindo
            if (lado > 0 && bars[k].high > o.x[0] + folga) { preso = false; break; } // preco seguiu subindo
          }
          if (!preso) continue;
          if (lado < 0 && bars[fim].close <= o.x[0]) continue; // e voltou para cima do preco do vendedor
          if (lado > 0 && bars[fim].close >= o.x[0]) continue;
        }
        maxVol = Math.max(maxVol, v); naVela++;
        const sub = (o.x[1] >= o.x[2] ? 'C ' : 'V ') + Math.round(dom * 100) + '%';
        cand.push({ time: bars[i].time, p: o.x[0], v, lado, i, sub: o.vela ? (lado > 0 ? 'C' : 'V') + ' na vela' : sub });
      }
    }
    // ---- caixas de ABSORCAO e EXAUSTAO (alguem segura o movimento / ninguem empurra mais) ----
    const zonas = [], incluir = new Set();
    if (p.zonas !== 'Nenhuma') {
      const volB = cel.map((c) => c.reduce((s, x) => s + x[1] + x[2], 0));
      const dlB = cel.map((c) => c.reduce((s, x) => s + x[1] - x[2], 0));
      const rg = bars.map((b) => b.high - b.low).slice(-1000).filter((x) => x > 0).sort((x, y) => x - y);
      const medR = rg[Math.floor(rg.length / 2)] || 10 * D.tick, folga = passo;
      const mesmoDia = (a, b) => a >= 0 && diaDe(bars[a].time) === diaDe(bars[b].time);
      const perto = (lo, hi, t) => { // a caixa caiu perto de um nivel de GEX do dia?
        const gex = _niveisDia(D, t);
        for (const [k, nome] of [['pw1', 'PUT WALL'], ['cw1', 'CALL WALL'], ['flip', 'GAMMA FLIP'], ['block', 'KEY LEVEL']]) {
          const v = gex[k]; if (Number.isFinite(v) && v >= lo - 2 * medR && v <= hi + 2 * medR) return ' + ' + nome;
        }
        return '';
      };
      const quer = (tipo) => p.zonas === 'Absorcao e exaustao' || p.zonas.startsWith('So as fortes') || (tipo === 'abs' ? p.zonas === 'So absorcao' : p.zonas === 'So exaustao');
      // ABSORCAO (como no video): em 4 velas, volume ALTO + delta muito de um lado (vendedores ou compradores
      // agredindo), mas o preco quase nao se deslocou, e nas velas seguintes nao seguiu: agressor preso.
      if (quer('abs')) {
        const W = 4, volW = [], dlW = [];
        for (let e = 0; e < n; e++) { let v = 0, d = 0; for (let k = Math.max(0, e - W + 1); k <= e; k++) { v += volB[k]; d += dlB[k]; } volW.push(v); dlW.push(d); }
        const zs = (arr, e) => { let s = 0, q = 0, c = 0; for (let k = Math.max(0, e - 300); k < e - W; k++) { s += arr[k]; q += arr[k] * arr[k]; c++; } if (c < 60) return NaN; const m = s / c; return (arr[e] - m) / Math.sqrt(Math.max(1e-9, q / c - m * m)); };
        let ult = -1;
        for (let e = W; e < n; e++) {
          if (e <= ult || !mesmoDia(e - W + 1, e)) continue;
          const zv = zs(volW, e), zd = zs(dlW, e);
          if (!(zv >= 1) || !(Math.abs(zd) >= 1.2)) continue;
          const lado = zd < 0 ? -1 : 1, a = e - W + 1;
          let lo = Infinity, hi = -Infinity;
          for (let k = a; k <= e; k++) { lo = Math.min(lo, bars[k].low); hi = Math.max(hi, bars[k].high); }
          // delta forte, mas o preco nao se deslocou: termina a janela no maximo N velas tipicas a favor do agressor
          const desloc = (bars[e].close - bars[a - 1].close) * lado;
          if (desloc > p.desloc * medR) continue;
          const fim = e + p.confirmar;
          if (fim >= n || !mesmoDia(e, fim)) continue;
          let preso = true;
          for (let k = e + 1; k <= fim; k++) { if (lado < 0 && bars[k].low < lo - folga) preso = false; if (lado > 0 && bars[k].high > hi + folga) preso = false; }
          if (!preso) continue;
          if (lado < 0 && bars[fim].close <= (lo + hi) / 2) continue;
          if (lado > 0 && bars[fim].close >= (lo + hi) / 2) continue;
          zonas.push({ tipo: 'abs', lado, de: bars[a].time, ate: bars[e].time, pmin: lo, pmax: hi,
            rotulo: 'ABSORÇÃO · ' + (lado < 0 ? 'vendedores presos' : 'compradores presos') + perto(lo, hi, bars[a].time), rg: _regime(D, bars[e].time, bars[e].close) });
          fortes.filter((f) => f.lado === lado && f.i >= a && f.i <= e).forEach((f) => incluir.add(f));
          ult = e + W;
        }
      }
      // EXAUSTAO: depois de um movimento, 4 velas com volume secando, delta perdendo forca e preco parado
      if (quer('exa')) {
        const E = 4, A = 10;
        let ult = -1;
        for (let e = E + A; e < n; e++) {
          if (e <= ult) continue;
          const a = e - E + 1;
          if (!mesmoDia(a - A, e)) continue;
          let volAntes = 0, dlAntes = 0;
          for (let k = a - A; k < a; k++) { volAntes += volB[k] / A; dlAntes += Math.abs(dlB[k]) / A; }
          let lo = Infinity, hi = -Infinity, dlJ = 0, seca = true;
          let volJ = 0;
          for (let k = a; k <= e; k++) { lo = Math.min(lo, bars[k].low); hi = Math.max(hi, bars[k].high); dlJ += Math.abs(dlB[k]) / E; volJ += volB[k] / E; }
          if (volB[e] > 0.7 * volAntes) seca = false; // a ultima vela tem que estar seca
          if (!seca || volJ > 0.6 * volAntes || dlJ > 0.6 * dlAntes || hi - lo > 2.5 * medR) continue;
          const mov = bars[a - 1].close - bars[a - A].open;
          if (Math.abs(mov) < 3 * medR) continue; // precisa de um movimento antes
          const lado = mov < 0 ? -1 : 1;
          if (lado < 0 && Math.min(bars[e].low, bars[e - 1].low) < bars[a].low - folga) continue; // ainda fazendo nova minima
          if (lado > 0 && Math.max(bars[e].high, bars[e - 1].high) > bars[a].high + folga) continue;
          zonas.push({ tipo: 'exa', lado, de: bars[a].time, ate: bars[e].time, pmin: lo, pmax: hi,
            rotulo: 'EXAUSTÃO · ' + (lado < 0 ? 'vendedores sumiram' : 'compradores sumiram') + perto(lo, hi, bars[a].time), rg: _regime(D, bars[e].time, bars[e].close) });
          ult = e + E;
        }
      }
    }
    // divergencia de CVD dentro da caixa (ou logo depois): reforca a leitura, como no video
    if (zonas.length) {
      const cvd = []; let s = 0, dia = -1;
      let prim = false;
      for (let i = 0; i < n; i++) {
        const d = diaDe(bars[i].time); if (d !== dia) { s = 0; dia = d; prim = true; }
        if (!cel[i].length) { cvd.push(NaN); continue; }
        if (prim) { prim = false; cvd.push(0); continue; } // leilao de abertura
        for (const x of cel[i]) s += x[1] - x[2]; cvd.push(s);
      }
      const dv = _diverg(bars, cvd);
      const idx = new Map(bars.map((b, i) => [b.time, i]));
      for (const zn of zonas) {
        const a = idx.get(zn.de), e = idx.get(zn.ate);
        // vendedores presos/sumiram -> procura divergencia de compra (lado +1), e vice-versa
        if (dv.some((d) => d.tipo === zn.tipo && d.lado === -zn.lado && d.i >= a - 2 && d.i <= e + 5)) zn.rotulo += ' + DIV CVD';
      }
    }
    // regime de gamma: absorcao vale em gamma positivo, exaustao em gamma negativo
    for (const zn of zonas) zn.rotulo += zn.rg > 0 ? ' · GAMA +' : zn.rg < 0 ? ' · GAMA -' : '';
    // so as fortes: caiu num nivel de GEX ou veio com divergencia de CVD
    if (p.zonas.startsWith('So as fortes')) for (let k = zonas.length - 1; k >= 0; k--) if (!zonas[k].rotulo.includes(' + ')) zonas.splice(k, 1);
    if (p.regime === 'Sim') for (let k = zonas.length - 1; k >= 0; k--) {
      const zn = zonas[k];
      if (zn.rg !== 0 && (zn.tipo === 'abs' ? zn.rg < 0 : zn.rg > 0)) zonas.splice(k, 1);
    }
    // as bolhas das caixas de absorcao aparecem sempre
    const ja = new Set(cand.map((o) => o.i + ':' + o.p));
    for (const f of incluir) if (!ja.has(f.i + ':' + f.p)) { cand.push(f); maxVol = Math.max(maxVol, f.v); }
    for (const o of cand) {
      const r = Math.sqrt(o.v / maxVol);
      itens.push({ time: o.time, p: o.p, r, lado: o.lado, sub: o.sub, txt: o.v >= 1000 ? (o.v / 1000).toFixed(1).replace('.', ',') + 'k' : String(o.v) });
      vol[o.i] = Math.max(Number.isFinite(vol[o.i]) ? vol[o.i] : 0, o.v);
    }
    return { vol, bolhas: { itens, zonas, discreto: p.estilo !== 'Com texto', escala: p.tamanho / 100, opacidade: p.opacidade / 100 } };
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
fs.mkdirSync(IMPORTS, { recursive: true });
const hoje = process.env.WIN_HOJE ? new Date(process.env.WIN_HOJE + 'T12:00:00Z') : new Date();
const hojeD = D(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
const dias = [];
for (const d = new Date(hojeD); dias.length < DIAS && hojeD - d < 60 * 864e5; d.setUTCDate(d.getUTCDate() - 1)) if (util(d)) dias.push(new Date(d));
dias.reverse();

const todos = {};
for (const ativo of LISTA) {
  const A = ATIVOS[ativo]; todos[ativo] = [];
  console.log(`--- ${ativo} (${A.nome}) ---`);
  for (const dia of dias) {
    const data = iso(dia), tk = A.contrato(dia), arqCache = path.join(CACHE, `${tk}-${data}.v4.json`);
    const fechado = data < iso(hojeD);
    if (fechado && fs.existsSync(arqCache)) {
      const ms = JSON.parse(fs.readFileSync(arqCache, 'utf8'));
      todos[ativo].push(...ms); console.log(`${data} ${tk}: ${ms.length} minutos (guardados)`); continue;
    }
    process.stdout.write(`${data} ${tk}: baixando os negocios da B3... `);
    const zip = await baixar(tk, data);
    if (!zip) { console.log('sem negocios nesse dia'); continue; }
    const { minutos, negocios } = await minutosDoArquivo(zip, data, A.tick, A.lote);
    console.log(`${negocios.toLocaleString('pt-BR')} negocios, ${minutos.length} minutos`);
    if (fechado && minutos.length) fs.writeFileSync(arqCache, JSON.stringify(minutos));
    todos[ativo].push(...minutos);
  }
  const ms = todos[ativo];
  if (!ms.length) { console.log(`Nao encontrei negocios do ${ativo}.`); continue; }
  const csv = ['time,open,high,low,close,volume', ...ms.map((v) => `${new Date(v.t * 1000).toISOString().replace('.000Z', 'Z')},${v.o},${v.h},${v.l},${v.c},${v.v}`)].join('\n') + '\n';
  fs.writeFileSync(path.join(IMPORTS, `${ativo}.csv`), csv);
}
if (!LISTA.some((a) => todos[a].length)) { console.log('Nao encontrei negocios. Tente de novo mais tarde.'); process.exit(1); }

// corretoras: nomes do arquivo do usuário, se existir
try { Object.assign(CORRETORAS, JSON.parse(fs.readFileSync(path.join(DADOS, 'corretoras.json'), 'utf8'))); } catch { /* sem arquivo */ }
const win = todos.WIN || [];
const giro = {};
for (const m of win) for (const [b, x] of Object.entries(m.net)) giro[b] = (giro[b] || 0) + Math.abs(x);
const topo = Object.entries(giro).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([b]) => b);
const gexDe = (a) => { // niveis do gex-sync (custom/gex-winreal.js / gex-wdoreal.js), se existirem
  try { const m = /const v = (\{[^;]*\});/.exec(fs.readFileSync(path.join(CUSTOM, `gex-${a.toLowerCase()}real.js`), 'utf8')); return m ? JSON.parse(m[1]) : {}; } catch { return {}; }
};
const histDe = (a) => { // data/gex-historico.json, gravado pelo gex-sync
  try { const h = JSON.parse(fs.readFileSync(path.join(DADOS, 'gex-historico.json'), 'utf8')); return Object.fromEntries(Object.entries(h).filter(([, v]) => v[a]).map(([k, v]) => [k, v[a]])); } catch { return {}; }
};
const ferr = JSON.stringify({ ativos: LISTA.filter((a) => todos[a].length).map((a) => {
  const c = todos[a].filter((m) => m.hp);
  return { nome: a, tick: ATIVOS[a].tick, gex: gexDe(a), gexHist: histDe(a), t: c.map((m) => m.t), hp: c.map((m) => m.hp) };
}) });
if (fs.existsSync(CUSTOM)) gerarIndicadores(win, topo, ferr);
const desenhos = instalarDesenhos(RAIZ);
if (desenhos === 'instalado') console.log('Desenhos extras instalados no terminal.');
else if (desenhos !== 'ok') console.log('Aviso: os desenhos extras nao foram instalados (' + desenhos + ').');

for (const a of LISTA) {
  const ult = todos[a].at(-1); if (!ult) continue;
  console.log(`Pronto ${a}: ${todos[a].length} velas de 1 minuto (ultimo preco ${ult.c.toLocaleString('pt-BR')}, ${new Date((ult.t - FUSO) * 1000).toISOString().slice(11, 16)} de Brasilia).`);
}
if (topo.length) console.log(`Corretoras que mais negociaram o WIN: ${topo.map((b) => `#${b} ${CORRETORAS[b] || ''}`.trim()).join(', ')}`);
console.log('No terminal: Ctrl+F5 e abra CSV:WIN ou CSV:WDO. Em Indicators: "Big Bubbles", "CVD", "Fluxo WIN"; no menu de tipo de grafico: "Footprint".');
