// gex-sync.mjs — niveis GEX do Radar no Quant Terminal
// Coloque em quant-terminal\scripts e rode:  node scripts/gex-sync.mjs
// Usa o mesmo motor do dashboard-radar (arquivos publicos da B3, sem chave) e grava
// um indicador por ativo na pasta custom (gex-win.js, gex-wdo.js, gex-petr4.js...).
// Motor de GEX a partir de dados públicos da B3 (posição em aberto + preço de referência de cada opção).
// Usado pela função /api/gex (Vercel) e pelo script scripts/gex.mjs (gera gex.json).
//
// Método (o mesmo usado pelos serviços de GEX):
//  1. Posição em aberto por opção: arquivo DerivativesOpenPositionFile da B3.
//  2. Preço de referência por opção: arquivo TradeInformationConsolidatedFile da B3.
//  3. Volatilidade implícita de cada opção por Black-Scholes (Black-76 nas opções de dólar futuro).
//  4. GEX por strike = gamma x posição x multiplicador x S² x 1%  (calls +, puts −: dealer vendido em puts, comprado em calls).
//  5. Gamma Flip = preço em que o GEX total (recalculado em cada preço) troca de sinal; Call Wall / Put Wall = strikes de maior GEX.

const B3_FILES = 'https://arquivos.b3.com.br/api';
const B3_QUOTE = 'https://cotacao.b3.com.br/mds/api/v1/instrumentQuotation/';
const LET_CALL = 'ABCDEFGHIJKL', LET_PUT = 'MNOPQRSTUVWX', LET_FUT = 'FGHJKMNQUVXZ';

// ---------------- calendário B3 ----------------
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
}
const _fer = {};
function feriados(y) {
  if (_fer[y]) return _fer[y];
  const s = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-24', '12-25', '12-31'].map(md => `${y}-${md}`));
  const e = easter(y).getTime();
  [-48, -47, -2, 60].forEach(o => s.add(new Date(e + o * 864e5).toISOString().slice(0, 10)));
  return (_fer[y] = s);
}
const iso = (d) => d.toISOString().slice(0, 10);
const util = (d) => { const w = d.getUTCDay(); return w !== 0 && w !== 6 && !feriados(d.getUTCFullYear()).has(iso(d)); };
const D = (y, m, d) => new Date(Date.UTC(y, m, d));
function nthWeekday(y, m, wd, n) { const w = D(y, m, 1).getUTCDay(); return D(y, m, 1 + ((wd - w + 7) % 7) + 7 * (n - 1)); }
function prevUtil(d) { const x = new Date(d); while (!util(x)) x.setUTCDate(x.getUTCDate() - 1); return x; }
function nextUtil(d) { const x = new Date(d); while (!util(x)) x.setUTCDate(x.getUTCDate() + 1); return x; }
function duEntre(a, b) { let n = 0; const d = new Date(a); while (d < b) { d.setUTCDate(d.getUTCDate() + 1); if (util(d)) n++; } return n; }
// Vencimentos
const vIbov = (y, m) => { const d15 = D(y, m, 15); let off = 3 - d15.getUTCDay(); if (off > 3) off -= 7; if (off < -3) off += 7; return nextUtil(new Date(d15.getTime() + off * 864e5)); };
const vAcao = (y, m) => prevUtil(nthWeekday(y, m, 5, 3));
const vDolar = (y, m) => nextUtil(D(y, m, 1));
// Ano do vencimento: a próxima ocorrência do mês a partir da data do arquivo
function anoDoMes(m, ref, fnVenc) { let y = ref.getUTCFullYear(); if (fnVenc(y, m) < ref) y++; return y; }

// ---------------- Black-Scholes ----------------
const nd = (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
function ncdf(x) { const k = 1 / (1 + 0.2316419 * Math.abs(x)); const p = k * (0.319381530 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429)))); const v = 1 - nd(x) * p; return x >= 0 ? v : 1 - v; }
// fut=true: Black-76 (opção sobre futuro); fut=false: Black-Scholes sem dividendos
function bsPrice(S, K, T, r, v, call, fut) {
  const F = fut ? S : S * Math.exp(r * T), df = Math.exp(-r * T);
  const d1 = (Math.log(F / K) + 0.5 * v * v * T) / (v * Math.sqrt(T)), d2 = d1 - v * Math.sqrt(T);
  return call ? df * (F * ncdf(d1) - K * ncdf(d2)) : df * (K * ncdf(-d2) - F * ncdf(-d1));
}
function bsGamma(S, K, T, r, v, fut) {
  const F = fut ? S : S * Math.exp(r * T);
  const d1 = (Math.log(F / K) + 0.5 * v * v * T) / (v * Math.sqrt(T));
  return (fut ? Math.exp(-r * T) : 1) * nd(d1) / (S * v * Math.sqrt(T));
}
function impliedVol(P, S, K, T, r, call, fut) {
  if (!(P > 0) || !(T > 0)) return NaN;
  const intr = Math.max(0, call ? (fut ? S - K : S - K * Math.exp(-r * T)) : (fut ? K - S : K * Math.exp(-r * T) - S)) * (fut ? Math.exp(-r * T) : 1);
  if (P <= intr + 1e-9) return NaN;
  let lo = 0.005, hi = 4;
  if (bsPrice(S, K, T, r, hi, call, fut) < P) return NaN;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (bsPrice(S, K, T, r, mid, call, fut) > P) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

// ---------------- download dos arquivos ----------------
async function getText(url, ms = 60000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarGEX/1.0)' } }); if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return await r.text(); }
  finally { clearTimeout(t); }
}
async function arquivoB3(nome, data) {
  const meta = JSON.parse(await getText(`${B3_FILES}/download/requestname?fileName=${nome}&date=${data}`, 20000));
  if (!meta.redirectUrl) throw new Error(`${nome} ${data} indisponível`);
  return getText(`${B3_FILES}/${meta.redirectUrl.replace('~/', '')}`);
}
function csv(txt) {
  const linhas = txt.split(/\r?\n/).filter(l => l.includes(';'));
  const cab = linhas[0].split(';');
  return linhas.slice(1).map(l => { const c = l.split(';'); const o = {}; cab.forEach((h, i) => o[h] = c[i]); return o; });
}
const num = (s) => { if (s === undefined || s === null || s === '') return NaN; const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : NaN; };
async function cotacaoB3(sym) {
  try { const j = JSON.parse(await getText(B3_QUOTE + sym, 12000)); return j && j.Trad && j.Trad[0] && j.Trad[0].scty; } catch (e) { return null; }
}
async function emLotes(itens, n, fn) { const out = []; for (let i = 0; i < itens.length; i += n) out.push(...await Promise.all(itens.slice(i, i + n).map(fn))); return out; }

// ---------------- cálculo dos níveis ----------------
function niveis(opts, S0, r, fut, dataRef) {
  // opts: [{K, T, call, oi, mult, iv}]
  const validas = opts.filter(o => isFinite(o.iv) && o.oi > 0 && o.T > 0);
  if (validas.length < 6) return null;
  const gex = (S, o) => (o.call ? 1 : -1) * bsGamma(S, o.K, o.T, r, o.iv, fut) * o.oi * o.mult * S * S * 0.01;
  // GEX por strike no preço atual
  const porK = new Map();
  validas.forEach(o => { const e = porK.get(o.K) || { k: o.K, call: 0, put: 0 }; const g = gex(S0, o); if (o.call) e.call += g; else e.put += g; porK.set(o.K, e); });
  const strikes = [...porK.values()].sort((a, b) => a.k - b.k);
  const cw = strikes.reduce((m, e) => e.call > (m ? m.call : -Infinity) ? e : m, null);
  const pw = strikes.reduce((m, e) => e.put < (m ? m.put : Infinity) ? e : m, null);
  const bl = strikes.reduce((m, e) => Math.abs(e.call + e.put) > (m ? Math.abs(m.call + m.put) : -1) ? e : m, null);
  // Perfil de gamma: GEX total recalculado em cada preço
  const perfil = [];
  for (let p = -0.12; p <= 0.12001; p += 0.0025) { const S = S0 * (1 + p); perfil.push({ s: S, g: validas.reduce((t, o) => t + gex(S, o), 0) }); }
  let flip = NaN, melhor = Infinity;
  for (let i = 1; i < perfil.length; i++) {
    const a = perfil[i - 1], b = perfil[i];
    if ((a.g <= 0 && b.g > 0) || (a.g >= 0 && b.g < 0)) {
      const s = a.s + (b.s - a.s) * (-a.g) / (b.g - a.g);
      if (Math.abs(s - S0) < melhor) { melhor = Math.abs(s - S0); flip = s; }
    }
  }
  const netGex = validas.reduce((t, o) => t + gex(S0, o), 0);
  // Expected move até o vencimento mais próximo (com pelo menos 2 dias úteis) pela IV ATM
  const Ts = [...new Set(validas.map(o => o.T))].sort((a, b) => a - b);
  const Tf = Ts.find(t => t >= 2 / 252) || Ts[0];
  const atm = validas.filter(o => o.T === Tf).sort((a, b) => Math.abs(a.K - S0) - Math.abs(b.K - S0)).slice(0, 4);
  const ivAtm = atm.length ? atm.reduce((t, o) => t + o.iv, 0) / atm.length : NaN;
  const em = S0 * ivAtm * Math.sqrt(Tf);
  const perto = strikes.filter(e => Math.abs(e.k / S0 - 1) <= 0.12);
  return {
    regime: isFinite(flip) ? (S0 >= flip ? 'AMO' : 'AMP') : (netGex >= 0 ? 'AMO' : 'AMP'),
    flip, emMin: S0 - em, emMax: S0 + em, pw1: pw && pw.k, cw1: cw && cw.k, block: bl && bl.k,
    sig1: S0 * (1 - ivAtm * Math.sqrt(1 / 252)), spotRef: S0, netGex, ivAtm, diasVenc: Math.round(Tf * 252),
    nOpcoes: validas.length,
    strikes: perto.map(e => ({ k: e.k, call: Math.round(e.call), put: Math.round(e.put) })),
    perfil: perfil.map(p => ({ s: Math.round(p.s * 100) / 100, g: Math.round(p.g) }))
  };
}

// ---------------- montagem por ativo ----------------
const ACOES = { BOVA: 'BOVA11', PETR: 'PETR4', VALE: 'VALE3', ITUB: 'ITUB4', BBDC: 'BBDC4', BBAS: 'BBAS3', B3SA: 'B3SA3', ABEV: 'ABEV3' };

async function calcularGex({ data, comAcoes = true, janelaDias = 75, maxStrikesAcao = 100, log = () => {} } = {}) {
  // Data: último dia útil com arquivo publicado (tenta hoje e volta até 6 dias)
  let d0 = data ? new Date(data + 'T12:00:00Z') : new Date();
  let pos, neg, dataArq;
  for (let k = 0; k < 7; k++) {
    const d = new Date(d0.getTime() - k * 864e5); if (!util(d)) continue;
    try { pos = await arquivoB3('DerivativesOpenPositionFile', iso(d)); neg = await arquivoB3('TradeInformationConsolidatedFile', iso(d)); dataArq = d; break; }
    catch (e) { log(`sem arquivo ${iso(d)}: ${e.message}`); }
  }
  if (!pos) throw new Error('Arquivos da B3 indisponíveis');
  const ref = D(dataArq.getUTCFullYear(), dataArq.getUTCMonth(), dataArq.getUTCDate());
  const posicoes = csv(pos), negocios = csv(neg);
  const refPric = new Map(); negocios.forEach(n => { const p = num(n.RefPric); const l = num(n.LastPric); refPric.set(n.TckrSymb, isFinite(p) ? p : l); });
  const ultimo = new Map(); negocios.forEach(n => ultimo.set(n.TckrSymb, num(n.LastPric)));
  const di = await cotacaoB3('DI1F' + String(ref.getUTCFullYear() + 2).slice(2));
  const taxa = di && di.SctyQtn && isFinite(di.SctyQtn.curPrc) ? di.SctyQtn.curPrc / 100 : 0.14;
  const r = Math.log(1 + taxa);
  const T = (venc) => duEntre(ref, venc) / 252;
  // Preços do dia útil anterior (só para séries que vierem sem preço no arquivo do dia)
  let _ant = null;
  async function precosAnteriores() {
    if (_ant) return _ant;
    _ant = { ref: new Map(), data: null };
    for (let k = 1; k <= 5; k++) {
      const d = new Date(ref.getTime() - k * 864e5); if (!util(d)) continue;
      try {
        const txt = await arquivoB3('TradeInformationConsolidatedFile', iso(d));
        csv(txt).forEach(n => { const p = num(n.RefPric), l = num(n.LastPric); _ant.ref.set(n.TckrSymb, isFinite(p) ? p : l); });
        _ant.data = iso(d); break;
      } catch (e) { log(`sem preços em ${iso(d)}`); }
    }
    return _ant;
  }
  const out = { geradoEm: new Date().toISOString(), dataArquivos: iso(ref), taxaDi: taxa, ativos: {}, avisos: [] };

  // ---- Dólar: opções de DOL (US$ 50 mil) e WDO (US$ 10 mil) sobre o futuro ----
  {
    const opts = [];
    posicoes.forEach(p => {
      const m = /^(DOL|WDO)([FGHJKMNQUVXZ])(\d{2})([CP])(\d{6})$/.exec(p.TckrSymb || ''); if (!m) return;
      const mes = LET_FUT.indexOf(m[2]), ano = 2000 + parseInt(m[3], 10), venc = vDolar(ano, mes);
      const t = T(venc); if (t <= 0 || t * 252 > janelaDias) return;
      const fut = `${m[1]}${m[2]}${m[3]}`, F = refPric.get(fut) || refPric.get(`DOL${m[2]}${m[3]}`);
      const oi = num(p.OpnIntrst), K = parseInt(m[5], 10), P = refPric.get(p.TckrSymb), call = m[4] === 'C';
      if (!(oi > 0) || !(F > 0)) return;
      opts.push({ K, T: t, call, oi, mult: m[1] === 'DOL' ? 50 : 10, P, F, venc: iso(venc), sym: p.TckrSymb, fut });
    });
    // Preço de referência do futuro vigente (o de vencimento mais próximo com opções)
    const Fs = opts.filter(o => o.T === Math.min(...opts.map(x => x.T)));
    const S0 = Fs.length ? Fs[0].F : NaN;
    // Séries sem preço no arquivo do dia: usa a IV do dia útil anterior (preço da opção e do futuro daquele dia)
    let usouAnterior = 0, dataAnt = null;
    if (opts.filter(o => o.P > 0).length < opts.length * 0.3) {
      const ant = await precosAnteriores(); dataAnt = ant.data;
      opts.forEach(o => {
        if (o.P > 0) return;
        const P = ant.ref.get(o.sym), F = ant.ref.get(o.fut) || ant.ref.get('DOL' + o.fut.slice(3));
        if (P > 0 && F > 0) { o.ivAnt = impliedVol(P, F, o.K, o.T + 1 / 252, r, o.call, true); usouAnterior++; }
      });
    }
    opts.forEach(o => { o.iv = o.P > 0 ? impliedVol(o.P, o.F, o.K, o.T, r, o.call, true) : (isFinite(o.ivAnt) ? o.ivAnt : NaN); });
    preencherIv(opts);
    const n = isFinite(S0) ? niveis(opts, S0, r, true, ref) : null;
    if (n) {
      out.ativos.WDO = { ...n, unidade: 'pontos (R$ por US$ 1.000)', fonte: 'Opções de DOL + WDO (B3)' };
      if (usouAnterior) { out.ativos.WDO.ivDe = dataAnt; out.avisos.push(`WDO: a B3 não publicou os preços das opções de dólar em ${iso(ref)}; volatilidade implícita de ${usouAnterior} séries calculada com os preços de ${dataAnt} (posições em aberto de ${iso(ref)})`); }
    }
    else out.avisos.push('WDO: dados insuficientes');
    log(`WDO: ${opts.length} opções`);
  }

  // ---- IBOV (níveis do WIN): opções de índice, strike = número x 1000 ----
  {
    const q = await cotacaoB3('IBOV'); const sq = q && q.SctyQtn;
    const S0 = sq && isFinite(sq.curPrc) && isFinite(sq.prcFlcn) ? sq.curPrc / (1 + sq.prcFlcn / 100) : NaN; // fechamento da data do arquivo
    const opts = [];
    posicoes.forEach(p => {
      const m = /^IBOV([A-X])(\d{2,3})(W([1-5]))?$/.exec(p.TckrSymb || ''); if (!m) return;
      const call = LET_CALL.includes(m[1]), mes = call ? LET_CALL.indexOf(m[1]) : LET_PUT.indexOf(m[1]);
      const ano = anoDoMes(mes, ref, vIbov);
      const venc = m[4] ? nextUtil(nthWeekday(ano, mes, 3, parseInt(m[4], 10))) : vIbov(ano, mes);
      const t = T(venc); if (t <= 0 || t * 252 > janelaDias) return;
      const oi = num(p.TtlPos), K = parseInt(m[2], 10) * 1000, P = refPric.get(p.TckrSymb);
      if (!(oi > 0)) return;
      opts.push({ K, T: t, call, oi, mult: 1, P, venc: iso(venc) });
    });
    opts.forEach(o => { o.iv = impliedVol(o.P, S0, o.K, o.T, r, o.call, false); });
    preencherIv(opts);
    const n = isFinite(S0) ? niveis(opts, S0, r, false, ref) : null;
    if (n) out.ativos.WIN = { ...n, unidade: 'pontos do IBOV (projetar para o WIN)', fonte: 'Opções de IBOV (B3)' };
    else out.avisos.push('IBOV/WIN: dados insuficientes');
    log(`IBOV: ${opts.length} opções`);
  }

  // ---- Ações e BOVA11: strike pela descrição de cada opção na cotação da B3 ----
  if (comAcoes) {
    for (const [raiz, tk] of Object.entries(ACOES)) {
      const S0 = ultimo.get(tk) || refPric.get(tk);
      if (!(S0 > 0)) { out.avisos.push(`${tk}: sem preço de fechamento`); continue; }
      const cand = [];
      posicoes.forEach(p => {
        const m = new RegExp(`^${raiz}([A-X])(\\d+)(W([1-5]))?$`).exec(p.TckrSymb || ''); if (!m) return;
        if (p.ISIN && !p.ISIN.slice(2, 7).startsWith(raiz)) return;
        if (raiz !== 'BOVA' && p.ISIN && p.ISIN[6] !== tk[4]) return; // separa PETR4 de PETR3 etc.
        const call = LET_CALL.includes(m[1]), mes = call ? LET_CALL.indexOf(m[1]) : LET_PUT.indexOf(m[1]);
        const ano = anoDoMes(mes, ref, vAcao);
        const venc = m[4] ? prevUtil(nthWeekday(ano, mes, 5, parseInt(m[4], 10))) : vAcao(ano, mes);
        const t = T(venc); if (t <= 0 || t * 252 > janelaDias) return;
        const oi = num(p.TtlPos); if (!(oi > 0)) return;
        cand.push({ sym: p.TckrSymb, T: t, call, oi, mult: 1, P: refPric.get(p.TckrSymb), venc: iso(venc) });
      });
      const top = cand.sort((a, b) => b.oi - a.oi).slice(0, maxStrikesAcao);
      await emLotes(top, 12, async (o) => {
        const s = await cotacaoB3(o.sym); const mm = s && /([\d.]+,\d{2})\s*$/.exec(s.desc || '');
        o.K = mm ? num(mm[1]) : NaN;
      });
      const opts = top.filter(o => isFinite(o.K));
      opts.forEach(o => { o.iv = impliedVol(o.P, S0, o.K, o.T, r, o.call, false); });
      preencherIv(opts);
      const n = niveis(opts, S0, r, false, ref);
      if (n) out.ativos[tk] = { ...n, unidade: 'R$', fonte: `Opções de ${tk} (B3, ${opts.length} séries de maior posição)` };
      else out.avisos.push(`${tk}: dados insuficientes`);
      log(`${tk}: ${opts.length}/${cand.length} opções`);
    }
  }
  return out;
}

// Opções sem preço de referência válido recebem a IV mediana do mesmo vencimento
function preencherIv(opts) {
  const porT = new Map();
  opts.forEach(o => { if (isFinite(o.iv) && o.iv > 0.02 && o.iv < 2.5) { const a = porT.get(o.T) || []; a.push(o.iv); porT.set(o.T, a); } else o.iv = NaN; });
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const todas = [].concat(...porT.values());
  opts.forEach(o => { if (!isFinite(o.iv)) { const a = porT.get(o.T); o.iv = a && a.length ? med(a) : (todas.length ? med(todas) : NaN); } });
}

// ======================================================================
// Gerador dos indicadores do Quant Terminal
// ======================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarDesenhos } from './qt-desenhos.mjs';

// Em qual gráfico do terminal cada nível é desenhado, e a escala para casar os preços
const ALVOS = {
  WIN:    { arquivo: 'gex-win',    nome: 'GEX WIN - use no grafico ^BVSP', curto: 'GEX WIN', escala: 1,        dec: 0 },
  WDO:    { arquivo: 'gex-wdo',    nome: 'GEX WDO - use no grafico BRL=X', curto: 'GEX WDO', escala: 1 / 1000, dec: 4 },
  BOVA11: { arquivo: 'gex-bova11', nome: 'GEX BOVA11', curto: 'GEX BOVA11',                     escala: 1,        dec: 2 },
  PETR4:  { arquivo: 'gex-petr4',  nome: 'GEX PETR4', curto: 'GEX PETR4',                      escala: 1,        dec: 2 },
  VALE3:  { arquivo: 'gex-vale3',  nome: 'GEX VALE3', curto: 'GEX VALE3',                      escala: 1,        dec: 2 },
  ITUB4:  { arquivo: 'gex-itub4',  nome: 'GEX ITUB4', curto: 'GEX ITUB4',                      escala: 1,        dec: 2 },
  BBDC4:  { arquivo: 'gex-bbdc4',  nome: 'GEX BBDC4', curto: 'GEX BBDC4',                      escala: 1,        dec: 2 },
  BBAS3:  { arquivo: 'gex-bbas3',  nome: 'GEX BBAS3', curto: 'GEX BBAS3',                      escala: 1,        dec: 2 },
  B3SA3:  { arquivo: 'gex-b3sa3',  nome: 'GEX B3SA3', curto: 'GEX B3SA3',                      escala: 1,        dec: 2 },
  ABEV3:  { arquivo: 'gex-abev3',  nome: 'GEX ABEV3', curto: 'GEX ABEV3',                      escala: 1,        dec: 2 },
};
const LINHAS = [
  { key: 'flip',  label: 'Gamma Flip', tag: 'GAMMA FLIP', color: '#fdd835', w: 2 },
  { key: 'cw1',   label: 'Call Wall',  tag: 'CALL WALL',  color: '#26a69a', w: 2 },
  { key: 'pw1',   label: 'Put Wall',   tag: 'PUT WALL',   color: '#ef5350', w: 2 },
  { key: 'block', label: 'Key Level',  tag: 'KEY LEVEL',  color: '#ab47bc', w: 2 },
  { key: 'emMax', label: 'EM max',     tag: 'EM MAX',     color: '#90a4ae', w: 1 },
  { key: 'emMin', label: 'EM min',     tag: 'EM MIN',     color: '#90a4ae', w: 1 },
  { key: 'sig1',  label: 'Sigma 1',    tag: 'SIGMA 1',    color: '#ff9800', w: 1 },
];

// Contrato vigente do WIN: vence na quarta mais próxima do dia 15 dos meses pares
function codigoWin(hoje) {
  const LET = 'FGHJKMNQUVXZ';
  for (let k = 0; k < 14; k++) {
    const y = hoje.getUTCFullYear() + Math.floor((hoje.getUTCMonth() + k) / 12), m = (hoje.getUTCMonth() + k) % 12;
    if (m % 2 !== 1) continue;
    if (vIbov(y, m) >= D(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())) return 'WIN' + LET[m] + String(y).slice(2);
  }
  return null;
}

const fmt = (v, dec) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function indicador(alvo, a, dataArq, extra) {
  const outputs = [], valores = {}, etiquetas = [];
  for (const L of LINHAS) {
    const v = a[L.key];
    if (!(typeof v === 'number' && isFinite(v))) continue;
    const y = alvo.passo ? Math.round(v * alvo.escala / alvo.passo) * alvo.passo : Math.round(v * alvo.escala * 10000) / 10000;
    let label = `${L.label} ${fmt(y, alvo.dec)}`;
    if (extra && extra.ratio) label += ` (WIN ${fmt(Math.round(v * extra.ratio / 5) * 5, 0)})`;
    if (L.key === 'flip') label += ` [${a.regime}]`;
    outputs.push({ key: L.key, label, kind: 'line', color: L.color, lineWidth: L.w });
    valores[L.key] = y;
    let tag = `${L.tag} ${fmt(y, alvo.dec)}`;
    if (L.key === 'flip') tag += ` · ${a.regime}`;
    etiquetas.push({ price: y, color: L.color, label: tag, text: L.key === 'pw1' || L.key === 'block' ? '#ffffff' : '#0b0e14' });
  }
  const nota = extra && extra.ratio
    ? `// Niveis em pontos do IBOV. Entre parenteses, o mesmo nivel em pontos do ${extra.win} (WIN/IBOV = ${extra.ratio.toFixed(5)}).\n`
    : '';
  return `// Gerado por gex-sync.mjs em ${new Date().toISOString()} com os arquivos da B3 de ${dataArq}.
// Regime ${a.regime}. Fonte: ${a.fonte}. Rode "node scripts/gex-sync.mjs" de novo para atualizar.
${nota}export default {
  name: ${JSON.stringify(alvo.nome.replace(alvo.curto, alvo.curto + ' niveis') + ' (' + alvo.curto + ')')},
  overlay: true,
  inputs: [
    { key: 'nomes', label: 'Nomes nos niveis', type: 'select', default: 'Principais', options: ['Principais', 'Todos', 'Nenhum'] },
  ],
  outputs: ${JSON.stringify(outputs, null, 2).replace(/\n/g, '\n  ')},
  calc(bars, p) {
    const v = ${JSON.stringify(valores)};
    const tags = ${JSON.stringify(etiquetas)};
    const principais = /^(GAMMA FLIP|CALL WALL|PUT WALL|KEY LEVEL)/;
    const out = {};
    for (const k of Object.keys(v)) out[k] = bars.map(() => v[k]);
    out.levelLines = p.nomes === 'Nenhum' ? [] : tags.filter((t) => p.nomes === 'Todos' || principais.test(t.label));
    return out;
  },
};
`;
}

// Perfil de strikes: barras presas na escala de preço, crescendo para a esquerda conforme o GEX.
const FAIXA_PADRAO = 8; // % acima e abaixo do preço
const bi = (v) => { const a = Math.abs(v), s = v < 0 ? '-' : '+'; return a >= 1e9 ? `${s}${fmt(a / 1e9, 1)}bi` : `${s}${fmt(a / 1e6, 0)}mi`; };
function indicadorStrikes(alvo, a, dataArq, extra) {
  const S0 = a.spotRef;
  const lista = (a.strikes || []).filter((e) => e.call || e.put).sort((x, y) => y.k - x.k)
    .map((e) => {
      const y = alvo.passo ? Math.round(e.k * alvo.escala / alvo.passo) * alvo.passo : Math.round(e.k * alvo.escala * 10000) / 10000;
      const win = extra && extra.ratio ? ` | WIN ${fmt(Math.round(e.k * extra.ratio / 5) * 5, 0)}` : '';
      return { price: y, call: e.call, put: e.put, dist: Math.abs(e.k / S0 - 1) * 100, nome: `${fmt(y, alvo.dec)}${win}` };
    });
  if (!lista.length) return null;
  return `// Gerado por gex-sync.mjs em ${new Date().toISOString()} com os arquivos da B3 de ${dataArq}.
// Perfil de GEX por strike, preso na escala de preço. Verde = calls (freiam o preço), vermelho = puts (aceleram).
// Quanto maior o GEX, mais a barra cresce para a esquerda. Precisa do desenho "level-profile" que o gex-sync instala.
const STRIKES = ${JSON.stringify(lista.map(({ price, call, put, dist, nome }) => ({ price, call: Math.round(call), put: Math.round(put), dist: Math.round(dist * 100) / 100, nome })))};
const bi = (v) => { const a = Math.abs(v), s = v < 0 ? '-' : '+'; return a >= 1e9 ? s + (a / 1e9).toFixed(1).replace('.', ',') + 'bi' : s + Math.round(a / 1e6) + 'mi'; };
export default {
  name: ${JSON.stringify(alvo.nome.replace(alvo.curto, alvo.curto + ' perfil de strikes') + ' (' + alvo.curto + ' strikes)')},
  overlay: true,
  inputs: [
    { key: 'width', label: 'Largura maxima (% do grafico)', type: 'int', default: 25, min: 5, max: 60 },
    { key: 'faixa', label: 'Strikes ate (% do preco)', type: 'float', default: ${FAIXA_PADRAO}, min: 1, max: 12 },
    { key: 'espessura', label: 'Espessura (% do espaco entre strikes)', type: 'int', default: 35, min: 5, max: 100 },
    { key: 'modo', label: 'Mostrar', type: 'select', default: 'Liquido', options: ['Liquido', 'Calls e puts'] },
    { key: 'rotulos', label: 'Valores escritos', type: 'select', default: 'Sim', options: ['Sim', 'Nao'] },
  ],
  outputs: [{ key: 'gex', label: 'GEX', kind: 'line', color: '#26a69a' }],
  calc(bars, p) {
    const sel = STRIKES.filter((s) => s.dist <= p.faixa);
    const max = Math.max(1, ...sel.map((s) => Math.abs(s.call + s.put)));
    const maxCP = Math.max(1, ...sel.map((s) => Math.abs(s.call) + Math.abs(s.put)));
    const rows = sel.map((s) => {
      const net = s.call + s.put, forca = Math.abs(net) / max, alfa = (0.3 + 0.55 * forca).toFixed(2);
      return p.modo === 'Liquido'
        ? { price: s.price, value: net, color: net >= 0 ? 'rgba(38,166,154,' + alfa + ')' : 'rgba(239,83,80,' + alfa + ')', label: forca >= 0.3 ? s.nome + '  ' + bi(net) : '' }
        : { price: s.price, value: s.call, value2: s.put, color: 'rgba(38,166,154,0.6)', color2: 'rgba(239,83,80,0.6)', label: Math.abs(s.call) + Math.abs(s.put) >= 0.3 * maxCP ? s.nome + '  ' + bi(s.call) + ' / ' + bi(s.put) : '' };
    });
    return { gex: bars.map(() => NaN), levelProfile: { rows, width: p.width, labels: p.rotulos === 'Sim', thickness: p.espessura / 100 } };
  },
};
`;
}


const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.GEX_OUT || path.join(aqui, '..', 'custom');
if (!fs.existsSync(pasta)) { console.error(`Nao achei a pasta custom em ${pasta}. Coloque este arquivo dentro de quant-terminal\\scripts.`); process.exit(1); }

const perfil = instalarDesenhos(process.env.GEX_ROOT || path.join(aqui, '..'));
if (perfil === 'instalado') console.log('Desenhos extras instalados no terminal.');
else if (perfil !== 'ok') console.log('Aviso: os desenhos extras nao foram instalados (' + perfil + ').');
console.log('Baixando os arquivos da B3 e calculando o GEX (pode levar 1 a 2 minutos)...');
const out = await calcularGex({ log: () => {} });

// Razão WIN/IBOV agora, para mostrar cada nível também em pontos do WIN
let extraWin = null;
try {
  const win = codigoWin(new Date());
  const [qi, qw] = await Promise.all([cotacaoB3('IBOV'), cotacaoB3(win)]);
  const pi = qi && qi.SctyQtn && qi.SctyQtn.curPrc, pw = qw && qw.SctyQtn && qw.SctyQtn.curPrc;
  if (pi > 0 && pw > 0) extraWin = { win, ratio: pw / pi, pi, pw };
} catch (e) { /* sem cotação ao vivo: só os pontos do IBOV */ }

const feitos = [];
for (const [tk, a] of Object.entries(out.ativos)) {
  const alvo = ALVOS[tk]; if (!alvo) continue;
  const ex = tk === 'WIN' ? extraWin : null;
  fs.writeFileSync(path.join(pasta, alvo.arquivo + '.js'), indicador(alvo, a, out.dataArquivos, ex));
  const st = indicadorStrikes(alvo, a, out.dataArquivos, ex);
  if (st) fs.writeFileSync(path.join(pasta, alvo.arquivo + '-strikes.js'), st);
  // WIN de verdade (grafico CSV:WIN, feito pelo win-sync): os mesmos niveis convertidos pela razao WIN/IBOV de agora
  if (tk === 'WIN' && extraWin) {
    const real = { arquivo: 'gex-winreal', nome: `GEX WIN real - use no grafico CSV:WIN`, curto: 'GEX WIN real', escala: extraWin.ratio, dec: 0, passo: 5 };
    fs.writeFileSync(path.join(pasta, real.arquivo + '.js'), indicador(real, a, out.dataArquivos, null));
    const st2 = indicadorStrikes(real, a, out.dataArquivos, null);
    if (st2) fs.writeFileSync(path.join(pasta, real.arquivo + '-strikes.js'), st2);
    feitos.push('WIN real');
  }
  feitos.push(`${tk} (${a.regime})`);
}
console.log(`Pronto. Niveis da B3 de ${out.dataArquivos}: ${feitos.join(', ')}`);
if (extraWin) console.log(`${extraWin.win} ${fmt(extraWin.pw, 0)} / IBOV ${fmt(extraWin.pi, 0)} = ${extraWin.ratio.toFixed(5)}`);
if (out.avisos.length) console.log('Avisos: ' + out.avisos.join(' | '));
console.log('Recarregue a pagina do terminal (Ctrl+F5) e procure "GEX" em Indicators.');
