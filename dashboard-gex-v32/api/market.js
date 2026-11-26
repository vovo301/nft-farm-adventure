// Proxy de dados de mercado (Yahoo Finance) — evita CORS no navegador.
// GET /api/market  ->  { ibov: {...}, brl: {...}, ts }

async function chart(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuantTerminal/1.0)' } });
  if (!r.ok) throw new Error(`Yahoo ${symbol} HTTP ${r.status}`);
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw new Error(`Yahoo ${symbol} sem dados`);
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const ts = res.timestamp || [];
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], c = q.close && q.close[i];
    if ([o, h, l, c].every(v => typeof v === 'number' && isFinite(v))) candles.push({ t: ts[i], o, h, l, c });
  }
  const m = res.meta || {};
  return {
    price: m.regularMarketPrice ?? null,
    prevClose: m.chartPreviousClose ?? m.previousClose ?? null,
    high: m.regularMarketDayHigh ?? null,
    low: m.regularMarketDayLow ?? null,
    marketTime: m.regularMarketTime ?? null,
    candles
  };
}

async function usdAwesome() {
  const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  if (!r.ok) throw new Error(`AwesomeAPI HTTP ${r.status}`);
  const d = await r.json();
  if (!d.USDBRL) throw new Error('AwesomeAPI sem USDBRL');
  return { bid: parseFloat(d.USDBRL.bid), pctChange: parseFloat(d.USDBRL.pctChange) || 0 };
}

export default async function handler(req, res) {
  const [ibov, brl, usd] = await Promise.allSettled([
    chart('^BVSP', '5m', '1d'),
    chart('BRL=X', '5m', '1d'),
    usdAwesome()
  ]);
  const out = { ts: Date.now(), errors: [] };
  if (ibov.status === 'fulfilled') out.ibov = ibov.value; else out.errors.push(String(ibov.reason));
  if (brl.status === 'fulfilled') out.brl = brl.value; else out.errors.push(String(brl.reason));
  if (usd.status === 'fulfilled') out.usd = usd.value; else out.errors.push(String(usd.reason));
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(out);
}
