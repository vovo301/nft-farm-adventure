import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { economy } from "../src";
import { world } from "../src/data";

describe("economy data (contrato do gerador)", () => {
  it("tem 23 culturas (5 basic, 9 medium, 9 advanced) e 11 recursos (economia v2)", () => {
    const crops = Object.values(economy.crops);
    expect(crops).toHaveLength(23);
    expect(Object.values(economy.items).filter((i) => i.kind === "resource")).toHaveLength(11);
    const h = (c: { growSeconds: number }) => c.growSeconds / 3600;
    expect(crops.filter((c) => h(c) <= 0.5)).toHaveLength(5);
    expect(crops.filter((c) => h(c) >= 1 && h(c) <= 12)).toHaveLength(9);
    expect(crops.filter((c) => h(c) >= 16 && h(c) <= 48)).toHaveLength(9);
  });

  it("curva: semente de 0,01 a 10 Gold; quanto mais longa, mais lucro por colheita e menos lucro/h (exceto a 1ª)", () => {
    const rows = Object.values(economy.crops)
      .map((c) => {
        const seed = new Decimal(economy.items[c.seedItemId]?.buyPrice ?? "NaN");
        const profit = new Decimal(economy.items[c.harvestItemId]?.sellPrice ?? "NaN").times(c.harvestQty).minus(seed);
        return { id: c.id, seed, profit, perHour: profit.div(c.growSeconds / 3600), margin: profit.div(seed) };
      })
      .sort((a, b) => a.seed.comparedTo(b.seed));
    expect(rows[0]?.seed.toString()).toBe("0.01");
    expect(rows[0]?.margin.toNumber()).toBe(1);
    expect(rows.at(-1)?.seed.toString()).toBe("10");
    expect(rows.at(-1)?.margin.toNumber()).toBeCloseTo(0.3, 2);
    const byTime = Object.values(economy.crops).sort((a, b) => a.growSeconds - b.growSeconds);
    const ordered = byTime.map((c) => rows.find((x) => x.id === c.id) ?? rows[0]);
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      if (!prev || !cur) throw new Error("tabela vazia");
      expect(cur.profit.gt(prev.profit), `${cur.id} lucro/colheita > ${prev.id}`).toBe(true);
      if (i >= 3) expect(cur.perHour.lte(prev.perHour), `${cur.id} lucro/h <= ${prev.id}`).toBe(true);
    }
  });

  it("ids das chaves batem com o campo id", () => {
    for (const [key, item] of Object.entries(economy.items)) expect(item.id).toBe(key);
    for (const [key, crop] of Object.entries(economy.crops)) expect(crop.id).toBe(key);
  });

  it("cada cultura referencia semente e produto existentes, com tempos/quantidades inteiros > 0", () => {
    for (const crop of Object.values(economy.crops)) {
      expect(economy.items[crop.seedItemId]?.kind).toBe("seed");
      expect(economy.items[crop.harvestItemId]?.kind).toBe("crop");
      expect(Number.isInteger(crop.growSeconds) && crop.growSeconds > 0).toBe(true);
      expect(Number.isInteger(crop.harvestQty) && crop.harvestQty > 0).toBe(true);
    }
  });

  it("preços são strings decimais não negativas", () => {
    for (const item of Object.values(economy.items)) {
      for (const price of [item.buyPrice, item.sellPrice]) {
        if (price === null) continue;
        expect(typeof price).toBe("string");
        expect(new Decimal(price).isNegative()).toBe(false);
      }
    }
  });

  it("Gold tem precisão de 0,01: todo preço e o saldo inicial são múltiplos de 0,01", () => {
    const cents = (v: string) => new Decimal(v).times(100);
    expect(cents(economy.rules.startingCoins).isInteger()).toBe(true);
    for (const item of Object.values(economy.items)) {
      for (const price of [item.buyPrice, item.sellPrice]) {
        if (price !== null) expect(cents(price).isInteger(), `${item.id}: ${price}`).toBe(true);
      }
    }
  });

  it("toda cultura dá lucro de pelo menos 0,01 Gold por colheita", () => {
    for (const crop of Object.values(economy.crops)) {
      const seed = new Decimal(economy.items[crop.seedItemId]?.buyPrice ?? "NaN");
      const gross = new Decimal(economy.items[crop.harvestItemId]?.sellPrice ?? "NaN").times(crop.harvestQty);
      expect(seed.gte("0.01"), crop.id).toBe(true);
      expect(gross.minus(seed).gte("0.01"), crop.id).toBe(true);
    }
  });

  it("regras iniciais são válidas", () => {
    const { rules } = economy;
    expect(new Decimal(rules.startingCoins).isNegative()).toBe(false);
    expect(Number.isInteger(rules.startingPlotCount) && rules.startingPlotCount > 0).toBe(true);
    expect(Number.isInteger(rules.maxQuantityPerAction) && rules.maxQuantityPerAction > 0).toBe(true);
    for (const [id, qty] of Object.entries(rules.startingInventory)) {
      expect(economy.items[id]).toBeDefined();
      expect(Number.isInteger(qty) && qty > 0).toBe(true);
    }
  });
});

describe("world data (ilhas, blocos, nós) — só dados", () => {
  const blocks = world.blockOrder.map((id) => {
    const b = world.blocks[id];
    if (!b) throw new Error(`bloco ${id} ausente`);
    return b;
  });

  it("65 blocos em 4 ilhas (7/12/21/25: terreno inicial + 6/12/21/25 da tabela do usuário), em ordem, com o terreno inicial grátis", () => {
    expect(blocks).toHaveLength(65);
    expect(Object.values(world.islands).map((i) => i.blockIds.length)).toEqual([7, 12, 21, 25]);
    blocks.forEach((b, i) => {
      expect(b.order).toBe(i + 1);
    });
    const first = blocks[0];
    if (!first) throw new Error("sem blocos");
    expect(first.cost.gold).toBe("0");
    expect(first.cost.diamonds).toBe(0);
    expect(first.buildSeconds).toBe(0);
    expect(first.adds.plots).toBe(economy.rules.startingPlotCount);
  });

  it("todo material cobrado tem nó revelado num bloco anterior (grafo alcançável)", () => {
    const revealed = new Set<string>();
    const nodeOfItem = Object.fromEntries(Object.values(world.nodes).map((n) => [n.itemId, n.id]));
    const started = new Set<string>();
    for (const b of blocks) {
      const needs = { ...b.cost.items };
      if (!started.has(b.islandId)) {
        started.add(b.islandId);
        Object.assign(needs, world.islands[b.islandId]?.crossingCost ?? {});
      }
      for (const item of Object.keys(needs)) expect(revealed.has(nodeOfItem[item] ?? "?"), `${b.id}: ${item}`).toBe(true);
      for (const node of Object.keys(b.adds.nodes)) revealed.add(node);
    }
    expect(revealed.size).toBe(Object.keys(world.nodes).length);
  });

  it("nós e custos referenciam recursos existentes; quantidades inteiras > 0; Gold múltiplo de 0,01", () => {
    for (const n of Object.values(world.nodes)) {
      expect(economy.items[n.itemId]?.kind).toBe("resource");
      expect(Number.isInteger(n.rechargeSeconds) && n.rechargeSeconds > 0).toBe(true);
      expect(Number.isInteger(n.yieldQty) && n.yieldQty > 0).toBe(true);
    }
    for (const b of blocks) {
      expect(new Decimal(b.cost.gold).times(100).isInteger()).toBe(true);
      for (const [id, q] of [...Object.entries(b.cost.items), ...Object.entries(b.adds.nodes)]) {
        expect(economy.items[id] ?? world.nodes[id], id).toBeDefined();
        expect(Number.isInteger(q) && q > 0).toBe(true);
      }
    }
  });

  it("Diamantes por bloco: inteiro >= 0; totais por ilha = gema da tabela do usuário 1:1 (0 / 225 / 1 020 / 3 690)", () => {
    const totals = Object.values(world.islands).map((isl) =>
      isl.blockIds.reduce((sum, id) => {
        const d = world.blocks[id]?.cost.diamonds ?? Number.NaN;
        expect(Number.isInteger(d) && d >= 0, id).toBe(true);
        return sum + d;
      }, 0),
    );
    expect(totals).toEqual([0, 225, 1020, 3690]);
  });

  it("frutas não pagam expansão (v2.2): nenhum custo de bloco ou travessia cobra item de frutífera", () => {
    const fruitItems = new Set(Object.values(world.nodes).filter((n) => /_(tree|palm)$/.test(n.id) && n.id !== "tree").map((n) => n.itemId));
    expect(fruitItems.size).toBeGreaterThan(0);
    for (const b of blocks) for (const id of Object.keys(b.cost.items)) expect(fruitItems.has(id), `${b.id}: ${id}`).toBe(false);
    for (const isl of Object.values(world.islands)) for (const id of Object.keys(isl.crossingCost)) expect(fruitItems.has(id), id).toBe(false);
  });

  it("toda cultura tem unlockBlock existente e consistente com unlocksCrops", () => {
    expect(Object.keys(world.cropUnlockBlock).sort()).toEqual(Object.keys(economy.crops).sort());
    for (const [crop, blockId] of Object.entries(world.cropUnlockBlock)) {
      expect(world.blocks[blockId]?.unlocksCrops).toContain(crop);
    }
    const start = new Set(Object.keys(economy.rules.startingInventory).map((id) => id.replace(/_seed$/, "")));
    for (const c of start) expect(world.cropUnlockBlock[c]).toBe(world.blockOrder[0]);
  });
});
