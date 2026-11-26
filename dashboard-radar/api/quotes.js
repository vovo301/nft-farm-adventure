// Servidor de cotações (Vercel). Busca no Yahoo Finance sem chave e sem CORS.
// GET /api/quotes  ->  { ts, quotes: { KEY: {price, prev, open, high, low, time, src} }, candles6L: [...], errors }

const SYMBOLS = {
  IBOV: '^BVSP', BOVA11: 'BOVA11.SA', PETR4: 'PETR4.SA', VALE3: 'VALE3.SA', ITUB4: 'ITUB4.SA',
  BBDC4: 'BBDC4.SA', BBAS3: 'BBAS3.SA', B3SA3: 'B3SA3.SA', ABEV3: 'ABEV3.SA',
  EWZ: 'EWZ', SPX: '^GSPC', ES: 'ES=F', '6L': '6L=F', USDBRL: 'BRL=X'
};

async function chart(sym, withCandles) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarGEX/1.0)' } });
  if (!r.ok) throw new Error(`${sym} HTTP ${r.status}`);
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta) throw new Error(`${sym} sem dados`);
  const m = res.meta;
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const ts = res.timestamp || [];
  let open = null;
  for (let i = 0; i < ts.length; i++) { if (typeof q.open?.[i] === 'number') { open = q.open[i]; break; } }
  const out = {
    price: m.regularMarketPrice ?? null, prev: m.chartPreviousClose ?? m.previousClose ?? null, open,
    high: m.regularMarketDayHigh ?? null, low: m.regularMarketDayLow ?? null,
    time: m.regularMarketTime ? m.regularMarketTime * 1000 : null, src: 'YAHOO'
  };
  if (withCandles) {
    out.candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
      if ([o, h, l, c].every(v => typeof v === 'number' && isFinite(v))) out.candles.push({ t: ts[i] * 1000, o, h, l, c });
    }
  }
  return out;
}

export default async function handler(req, res) {
  const keys = Object.keys(SYMBOLS);
  const results = await Promise.allSettled(keys.map(k => chart(SYMBOLS[k], k === '6L')));
  const out = { ts: Date.now(), quotes: {}, errors: [] };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.quotes[keys[i]] = r.value;
    else out.errors.push(String(r.reason));
  });
  if (out.quotes['6L'] && out.quotes['6L'].candles) { out.candles6L = out.quotes['6L'].candles; delete out.quotes['6L'].candles; }
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(out);
}
