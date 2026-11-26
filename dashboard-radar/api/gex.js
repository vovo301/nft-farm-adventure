// GET /api/gex -> níveis GEX calculados com os arquivos públicos da B3 (cache de 6 h na Vercel)
import { calcularGex } from './_gex.js';
export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  try {
    const out = await calcularGex({ maxStrikesAcao: 60 });
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ erro: String(e.message || e) });
  }
}
