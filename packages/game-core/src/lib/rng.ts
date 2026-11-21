/**
 * PRNG determinístico (sfc32) com seed em string (hash cyrb128).
 *
 * Uso previsto: o servidor gera a seed da fazenda; reducers derivam números com
 * `randomAt(seed, farmId, counter)` (sem estado) ou `createRng(seed)` (sequência).
 * Nunca use `Math.random()` em game-core.
 *
 * ATENÇÃO: mudar o algoritmo muda resultados de replays/saves — há teste de valores fixos.
 */

export interface Rng {
  /** Próximo número em [0, 1). */
  next(): number;
  /** Inteiro uniforme em [min, max] (inclusivo). */
  int(min: number, max: number): number;
}

/** Hash de string em 4 palavras de 32 bits (cyrb128). */
function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function createRng(seed: string): Rng {
  let [a, b, c, d] = cyrb128(seed);

  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  // Descarta as primeiras saídas para misturar bem o estado inicial.
  for (let i = 0; i < 15; i++) next();

  return {
    next,
    int(min: number, max: number): number {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError(`rng.int: limites inválidos (${String(min)}, ${String(max)})`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}

/** Número em [0, 1) derivado só de (seed, chaves). Sem estado: ideal para reducers. */
export function randomAt(seed: string, ...keys: readonly (string | number)[]): number {
  return createRng([seed, ...keys.map(String)].join("\u001f")).next();
}
