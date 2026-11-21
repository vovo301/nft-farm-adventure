import { describe, expect, it } from "vitest";
import { createRng, randomAt } from "../src";

describe("PRNG determinístico", () => {
  it("mesma seed ⇒ mesma sequência", () => {
    const a = createRng("farm-1:seed");
    const b = createRng("farm-1:seed");
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("seeds diferentes ⇒ sequências diferentes", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-b");
    expect(Array.from({ length: 10 }, () => a.next())).not.toEqual(Array.from({ length: 10 }, () => b.next()));
  });

  it("valores fixos (regressão: mudar o algoritmo quebra saves/replays)", () => {
    const rng = createRng("golden");
    expect([rng.next(), rng.next(), rng.next()]).toMatchSnapshot();
    expect([randomAt("golden", "farm-1", 0), randomAt("golden", "farm-1", 1)]).toMatchSnapshot();
  });

  it("next() fica em [0, 1) e int() respeita os limites inclusivos", () => {
    const rng = createRng("range");
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x >= 0 && x < 1).toBe(true);
      const n = rng.int(3, 7);
      expect(Number.isInteger(n) && n >= 3 && n <= 7).toBe(true);
    }
  });

  it("distribuição aproximadamente uniforme", () => {
    const rng = createRng("uniform");
    const buckets = new Array<number>(10).fill(0);
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng.next() * 10);
      buckets[idx] = (buckets[idx] ?? 0) + 1;
    }
    for (const count of buckets) expect(Math.abs(count - n / 10)).toBeLessThan(n / 10 * 0.05);
  });

  it("randomAt é sem estado: depende só de (seed, chaves)", () => {
    expect(randomAt("s", "farm-1", 42)).toBe(randomAt("s", "farm-1", 42));
    expect(randomAt("s", "farm-1", 42)).not.toBe(randomAt("s", "farm-1", 43));
    expect(randomAt("s", "farm-1", 42)).not.toBe(randomAt("s", "farm-2", 42));
  });

  it("int() rejeita limites inválidos", () => {
    const rng = createRng("x");
    expect(() => rng.int(5, 1)).toThrow();
    expect(() => rng.int(0.5, 2)).toThrow();
  });
});
