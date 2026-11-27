// win-sync.mjs — velas de 1 minuto do WIN (mini índice) com volume real, feitas com os negócios públicos da B3.
// Coloque em quant-terminal\scripts e rode:  node scripts/win-sync.mjs        (últimos 3 pregões)
//                                             node scripts/win-sync.mjs 10     (últimos 10 pregões)
// Grava data/imports/WIN.csv, que o terminal mostra como o ativo CSV:WIN (1 minuto e tempos maiores).
// Os dias já fechados ficam guardados em data/b3cache e não são baixados de novo. Rode de novo para atualizar o dia de hoje.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const RAIZ = process.env.WIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = path.join(RAIZ, 'data');
const CACHE = path.join(DADOS, 'b3cache');
const SAIDA = path.join(DADOS, 'imports', 'WIN.csv');
const DIAS = Math.max(1, Math.min(30, parseInt(process.argv[2] || '3', 10) || 3));
const FUSO = 3 * 3600; // horário de Brasília = UTC-3

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
  const url = `https://arquivos.b3.com.br/rapinegocios/tickercsv/${ticker}/${data}`;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; win-sync/1.0)' } });
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

// Lê os negócios em fluxo (o arquivo aberto passa de 400 MB) e monta velas de 1 minuto.
async function velasDoArquivo(zip, data) {
  const nl = zip.readUInt16LE(26), el = zip.readUInt16LE(28);
  const fluxo = Readable.from([zip.subarray(30 + nl + el)]).pipe(zlib.createInflateRaw());
  const linhas = readline.createInterface({ input: fluxo, crlfDelay: Infinity });
  const velas = new Map();
  let n = 0, cab = true;
  try {
    for await (const l of linhas) {
      if (cab) { cab = false; continue; }
      const c = l.split(';');
      if (c.length < 9 || c[2] !== '0' || c[8] !== data) continue; // só negócios novos daquele pregão
      const preco = parseFloat(c[3].replace(',', '.')), qtd = parseInt(c[4], 10), h = c[5];
      if (!(preco > 0) || !(qtd > 0) || h.length < 6) continue;
      const hh = h.length === 9 ? +h.slice(0, 2) : +h.slice(0, h.length - 7), mm = +h.slice(-7, -5);
      const t = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), hh, mm) / 1000 + FUSO;
      let v = velas.get(t);
      if (!v) velas.set(t, (v = { t, o: preco, h: preco, l: preco, c: preco, v: 0 }));
      if (preco > v.h) v.h = preco; if (preco < v.l) v.l = preco;
      v.c = preco; v.v += qtd; n++;
    }
  } catch (e) {
    if (!velas.size) throw e; // arquivo cortado no fim: fica com o que deu para ler
  }
  return { velas: [...velas.values()].sort((a, b) => a.t - b.t), negocios: n };
}

// ---------- principal ----------
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
const hoje = new Date(); const hojeD = D(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
const dias = [];
for (const d = new Date(hojeD); dias.length < DIAS && hojeD - d < 60 * 864e5; d.setUTCDate(d.getUTCDate() - 1)) if (util(d)) dias.push(new Date(d));
dias.reverse();

const todas = [];
for (const dia of dias) {
  const data = iso(dia), tk = contratoWin(dia), arqCache = path.join(CACHE, `${tk}-${data}.json`);
  const fechado = data < iso(hojeD);
  if (fechado && fs.existsSync(arqCache)) {
    const vs = JSON.parse(fs.readFileSync(arqCache, 'utf8'));
    todas.push(...vs); console.log(`${data} ${tk}: ${vs.length} velas (guardadas)`); continue;
  }
  process.stdout.write(`${data} ${tk}: baixando os negocios da B3... `);
  const zip = await baixar(tk, data);
  if (!zip) { console.log('sem negocios nesse dia'); continue; }
  const { velas, negocios } = await velasDoArquivo(zip, data);
  console.log(`${negocios.toLocaleString('pt-BR')} negocios, ${velas.length} velas`);
  if (fechado && velas.length) fs.writeFileSync(arqCache, JSON.stringify(velas));
  todas.push(...velas);
}
if (!todas.length) { console.log('Nao encontrei negocios do WIN. Tente de novo mais tarde.'); process.exit(1); }

const csv = ['time,open,high,low,close,volume', ...todas.map((v) => `${new Date(v.t * 1000).toISOString().replace('.000Z', 'Z')},${v.o},${v.h},${v.l},${v.c},${v.v}`)].join('\n') + '\n';
fs.writeFileSync(SAIDA, csv);
const ult = todas.at(-1);
console.log(`Pronto: ${todas.length} velas de 1 minuto em data/imports/WIN.csv (ultimo preco ${ult.c.toLocaleString('pt-BR')}, ${new Date((ult.t - FUSO) * 1000).toISOString().slice(11, 16)} de Brasilia).`);
console.log('No terminal, digite CSV:WIN para abrir o grafico.');
