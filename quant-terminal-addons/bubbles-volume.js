// Bubbles Volume — adaptado do "Bubbles Volume [BigBeluga]"
// Licenca: CC BY-NC-SA 4.0 (uso pessoal, nao comercial). (c) BigBeluga
export default {
  name: 'Bubbles Volume (BigBeluga)',
  overlay: true,
  inputs: [
    { key: 'threshold', label: 'Threshold', type: 'float', default: 1 },
    { key: 'length', label: 'Volume lookback', type: 'int', default: 200 },
    { key: 'heatmap', label: 'HeatMap (0 = verde, 1 = mapa de calor)', type: 'int', default: 0 },
  ],
  outputs: [],
  calc(bars, p, ta) {
    const vol = bars.map((b) => b.volume || 0);
    const sd = ta.stdev(vol, p.length);
    const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, x, lo, hi) => { const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo))); return hex(a.map((v, i) => v + (b[i] - v) * t)); };
    const darkGreen = [18, 34, 18, 128], green = [76, 175, 80, 255];
    const aqua = [0, 188, 212, 128], green2 = [76, 175, 80, 128];
    const yellow = [255, 235, 59, 128], orange = [255, 152, 0, 179], red = [211, 38, 38, 255];
    const colorFor = (n) => {
      if (!p.heatmap) return mix(darkGreen, green, n, 0, 8);
      if (n < 1) return mix(aqua, green2, n, 0, 1);
      if (n < 4) return mix(yellow, orange, n, 1, 4);
      return mix(orange, red, n, 4, 8);
    };
    const fmt = (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v));
    const markers = [];
    bars.forEach((b, i) => {
      if (!sd[i] || !isFinite(sd[i])) return;
      const n = vol[i] / sd[i], t = p.threshold;
      let size = 0;
      if (n > 6) size = 4;
      else if (n > t + 3) size = 3;
      else if (n > t + 2) size = 2;
      else if (n > t) size = 1;
      else if (n > 0) size = 0.5;
      if (!size) return;
      markers.push({ time: b.time, position: 'inBar', shape: 'circle', color: colorFor(n), size, text: n > 6 ? fmt(vol[i]) : '' });
    });
    if (!vol.some((v) => v > 0) && bars.length) {
      markers.push({ time: bars[bars.length - 1].time, position: 'aboveBar', shape: 'square', color: '#ef5350', text: 'Sem dados de volume. Use outro ativo' });
    }
    return { markers };
  },
};
