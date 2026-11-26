// Gera gex.json com os níveis GEX calculados a partir dos arquivos públicos da B3.
// Uso: node scripts/gex.mjs [AAAA-MM-DD]
import { calcularGex } from '../api/_gex.js';
import fs from 'node:fs';
const out = await calcularGex({ data: process.argv[2], log: (m) => console.error(m) });
fs.writeFileSync(new URL('../gex.json', import.meta.url), JSON.stringify(out));
for (const [tk, a] of Object.entries(out.ativos)) console.log(tk, a.regime, 'spot', a.spotRef.toFixed(2), 'flip', a.flip && a.flip.toFixed(2), 'PW', a.pw1, 'CW', a.cw1, 'bloco', a.block, 'EM', a.emMin.toFixed(2), '-', a.emMax.toFixed(2), 'IV', (a.ivAtm * 100).toFixed(1) + '%', 'net', (a.netGex / 1e6).toFixed(1) + 'M', 'n', a.nOpcoes);
console.log('avisos', out.avisos, 'data', out.dataArquivos, 'DI', out.taxaDi);
