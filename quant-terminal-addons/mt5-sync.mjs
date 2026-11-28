// mt5-sync.mjs — WIN e WDO em TEMPO REAL no Quant Terminal, com os negócios do MetaTrader 5 da sua corretora.
// 1) No MT5, rode o robô QT_Fluxo (só lê dados; grava os negócios na pasta comum do MetaTrader).
// 2) Coloque este arquivo em quant-terminal\scripts e rode:  node scripts/mt5-sync.mjs
//    Deixe a janela aberta durante o pregão (Ctrl+C para parar).
// Ele atualiza a cada 2 segundos:
//   data/imports/WIN.csv e WDO.csv   -> as velas (dias anteriores da B3 + hoje ao vivo)
//   custom/qt-vivo.json              -> volume por preço de hoje, com o lado REAL do agressor (footprint, bolhas, CVD, perfil)
// Opções:  --pasta "C:\...\MetaQuotes\Terminal\Common\Files"   (se o MT5 guardar em outro lugar)
//          --fuso -3   (fuso do horário do servidor da corretora; B3 normalmente é o de Brasília, -3)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = process.env.WIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome, padrao) => { const k = process.argv.indexOf(nome); return k > 0 && process.argv[k + 1] ? process.argv[k + 1] : padrao; };
const PASTA = arg('--pasta', path.join(process.env.APPDATA || '', 'MetaQuotes', 'Terminal', 'Common', 'Files'));
const FUSO_MS = -Number(arg('--fuso', '-3')) * 3600 * 1000; // soma ao horário do servidor para virar UTC
const ATIVOS = { WIN: { tick: 5 }, WDO: { tick: 0.5 } };
const IMPORTS = path.join(RAIZ, 'data', 'imports');
const VIVO = path.join(RAIZ, 'custom', 'qt-vivo.json');

if (!fs.existsSync(PASTA)) {
  console.log(`Nao achei a pasta do MetaTrader: ${PASTA}`);
  console.log('Abra o MT5, rode o robo QT_Fluxo e confira em Arquivo > Abrir pasta de dados > (volte uma pasta) > Common > Files.');
  console.log('Se for outro lugar, rode: node scripts/mt5-sync.mjs --pasta "C:\\caminho\\Common\\Files"');
  process.exit(1);
}

// estado de hoje por ativo
const estado = {};
const brt = () => new Date(Date.now() - 3 * 3600 * 1000);
const hojeStr = () => brt().toISOString().slice(0, 10).replace(/-/g, '');
let dia = hojeStr();
function zerar() { for (const a of Object.keys(ATIVOS)) estado[a] = { pos: 0, resto: '', min: new Map(), mudou: true }; }
zerar();

// lê só o que foi acrescentado ao arquivo desde a última vez
function ler(a) {
  const arq = path.join(PASTA, `qt_${a}_${dia}.csv`), E = estado[a];
  let st; try { st = fs.statSync(arq); } catch { return 0; }
  if (st.size < E.pos) { E.pos = 0; E.resto = ''; E.min.clear(); } // arquivo recriado
  if (st.size === E.pos) return 0;
  const fd = fs.openSync(arq, 'r');
  const buf = Buffer.alloc(Math.min(st.size - E.pos, 32 * 1024 * 1024)); // no maximo 32 MB por vez (arquivo grande no 1o ciclo)
  fs.readSync(fd, buf, 0, buf.length, E.pos); fs.closeSync(fd);
  E.pos += buf.length;
  const linhas = (E.resto + buf.toString('latin1')).split(/\r?\n/);
  E.resto = linhas.pop();
  let n = 0;
  for (const l of linhas) {
    const c = l.split(';'); if (c.length < 4) continue;
    const ms = Number(c[0]) + FUSO_MS, preco = Number(c[1]), qtd = Number(c[2]), lado = Number(c[3]);
    if (!(preco > 0) || !(qtd > 0)) continue;
    const t = Math.floor(ms / 60000) * 60;
    let m = E.min.get(t);
    if (!m) E.min.set(t, (m = { t, o: preco, h: preco, l: preco, c: preco, v: 0, pv: new Map() }));
    if (preco > m.h) m.h = preco; if (preco < m.l) m.l = preco;
    m.c = preco; m.v += qtd;
    let x = m.pv.get(preco); if (!x) m.pv.set(preco, (x = [0, 0, 0]));
    if (lado > 0) x[0] += qtd; else if (lado < 0) x[1] += qtd; x[2]++;
    n++;
  }
  if (n) E.mudou = true;
  return n;
}

// minutos de hoje no mesmo formato do win-sync: [preço mínimo, compra, venda, negócios, ...] de tick em tick
function compacto(a) {
  const tick = ATIVOS[a].tick, mins = [...estado[a].min.values()].sort((x, y) => x.t - y.t);
  return mins.map((m) => {
    const ps = [...m.pv.keys()], lo = Math.min(...ps), hi = Math.max(...ps), hp = [lo];
    const np = Math.round((hi - lo) / tick);
    for (let k = 0; k <= np; k++) { const x = m.pv.get(Math.round((lo + k * tick) * 100) / 100) || [0, 0, 0]; hp.push(x[0], x[1], x[2]); }
    return { m, hp };
  });
}

// velas: dias anteriores (do CSV que o win-sync gravou) + hoje ao vivo
const historico = {};
function carregarHistorico(a) {
  const arq = path.join(IMPORTS, `${a}.csv`);
  let linhas = [];
  try { linhas = fs.readFileSync(arq, 'utf8').trim().split('\n').slice(1); } catch { /* sem historico */ }
  historico[a] = linhas;
}
function gravarVelas(a, lista) {
  if (!lista.length) return;
  const ini = lista[0].m.t;
  const antes = historico[a].filter((l) => Date.parse(l.slice(0, 20)) / 1000 < ini);
  const hoje = lista.map(({ m }) => `${new Date(m.t * 1000).toISOString().replace('.000Z', 'Z')},${m.o},${m.h},${m.l},${m.c},${m.v}`);
  const tmp = path.join(IMPORTS, `${a}.csv.tmp`);
  fs.mkdirSync(IMPORTS, { recursive: true });
  fs.writeFileSync(tmp, ['time,open,high,low,close,volume', ...antes, ...hoje].join('\n') + '\n');
  fs.renameSync(tmp, path.join(IMPORTS, `${a}.csv`));
}

for (const a of Object.keys(ATIVOS)) carregarHistorico(a);
console.log(`Lendo os negocios do MT5 em ${PASTA}`);
console.log('Deixe esta janela aberta durante o pregao. No terminal: abra CSV:WIN ou CSV:WDO (o grafico atualiza sozinho).');

let ultimoAviso = 0;
async function ciclo() {
  if (hojeStr() !== dia) { dia = hojeStr(); zerar(); for (const a of Object.keys(ATIVOS)) carregarHistorico(a); }
  let novos = 0;
  for (const a of Object.keys(ATIVOS)) novos += ler(a);
  if (Object.values(estado).some((E) => E.mudou)) {
    const vivo = { versao: Date.now(), ativos: {} };
    for (const a of Object.keys(ATIVOS)) {
      const lista = compacto(a);
      vivo.ativos[a] = { tick: ATIVOS[a].tick, t: lista.map((x) => x.m.t), hp: lista.map((x) => x.hp) };
      if (estado[a].mudou) gravarVelas(a, lista);
      estado[a].mudou = false;
    }
    const tmp = VIVO + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(vivo)); fs.renameSync(tmp, VIVO);
  }
  if (Date.now() - ultimoAviso > 60000) {
    ultimoAviso = Date.now();
    const r = Object.keys(ATIVOS).map((a) => { const ms = [...estado[a].min.values()]; const u = ms.at(-1); return u ? `${a} ${u.c} (${ms.length} min)` : `${a} sem negocios ainda`; });
    console.log(`${new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(11, 19)} ${r.join(' | ')}`);
  }
  setTimeout(ciclo, 2000);
}
ciclo();
