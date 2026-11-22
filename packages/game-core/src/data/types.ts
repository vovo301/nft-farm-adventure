/**
 * Tipos das tabelas de dados do jogo.
 *
 * O conteúdo (números) vem SEMPRE de `economy.generated.ts`, produzido pelo gerador do
 * economista a partir de `economy/economy.csv`. Estes tipos são o contrato que o gerador deve
 * respeitar.
 *
 * Convenções:
 * - Preços/saldos são strings decimais (ex.: "1.25"), nunca float. São lidos com decimal.js.
 * - Tempos são inteiros em segundos.
 * - Quantidades são inteiros > 0.
 * - `null` em `buyPrice`/`sellPrice` = não pode ser comprado/vendido na loja.
 */

/** String decimal não negativa, ex.: "0", "3", "12.5". */
export type DecimalString = string;

export type ItemKind = "seed" | "crop" | "resource";

export interface ItemDef {
  readonly id: string;
  readonly kind: ItemKind;
  /** Preço de compra na loja, em moedas off-chain. `null` = não vendido na loja. */
  readonly buyPrice: DecimalString | null;
  /** Preço de venda para a loja, em moedas off-chain. `null` = não pode ser vendido. */
  readonly sellPrice: DecimalString | null;
}

export interface CropDef {
  readonly id: string;
  /** Item consumido ao plantar (deve existir em `items` com kind "seed"). */
  readonly seedItemId: string;
  /** Item recebido ao colher (deve existir em `items` com kind "crop"). */
  readonly harvestItemId: string;
  /** Tempo de crescimento, inteiro em segundos (> 0). */
  readonly growSeconds: number;
  /** Quantidade colhida por plot, inteiro (> 0). */
  readonly harvestQty: number;
}

export interface EconomyMeta {
  /** Versão da tabela (ex.: hash/data da planilha). */
  readonly version: string;
  /** `true` enquanto os números forem provisórios (não oficiais). */
  readonly placeholder: boolean;
  /** Origem dos dados (ex.: "economy/economy.csv@<hash>"). */
  readonly source: string;
}

export interface EconomyRules {
  /** Moedas iniciais de uma fazenda nova. */
  readonly startingCoins: DecimalString;
  /** Número de plots de uma fazenda nova (inteiro > 0). */
  readonly startingPlotCount: number;
  /** Itens iniciais de uma fazenda nova. */
  readonly startingInventory: Readonly<Record<string, number>>;
  /** Limite de quantidade por ação de compra/venda (anti-abuso). */
  readonly maxQuantityPerAction: number;
}

export interface EconomyData {
  readonly meta: EconomyMeta;
  readonly rules: EconomyRules;
  readonly items: Readonly<Record<string, ItemDef>>;
  readonly crops: Readonly<Record<string, CropDef>>;
}

// =============================================================================================
// Mundo: ilhas, blocos de expansão, nós de recurso e desbloqueio de culturas.
// Gerado em `world.generated.ts` a partir de economy/economy.csv + economy/expansions.csv.
// SÓ DADOS: ainda não há reducer que leia estes tipos (expansão, coleta e desbloqueio são
// pendências do game-core). Quantidades de material são inteiros > 0; Gold é DecimalString.
// =============================================================================================

/** Nó de recurso posicionável (árvore, pedra, minério, frutífera). */
export interface ResourceNodeDef {
  readonly id: string;
  /** Item (kind "resource") recebido a cada coleta. */
  readonly itemId: string;
  /** Recarga após a coleta, inteiro em segundos (> 0). */
  readonly rechargeSeconds: number;
  /** Unidades recebidas por coleta (inteiro > 0). */
  readonly yieldQty: number;
}

/**
 * Custo de um bloco: Gold + Diamantes + materiais (item id → quantidade). Nunca token.
 * Diamantes (`diamond`) = moeda premium off-chain (3ª moeda, ao lado de Gold e token); substitui a
 * "gema" da referência 1:1 (decisão do usuário 2026-11-22). Como se obtêm ainda não foi decidido e
 * o `GameState` ainda não tem saldo de Diamantes (pendência do game-core).
 */
export interface ExpansionCost {
  readonly gold: DecimalString;
  /** Diamantes, inteiro >= 0 (0 = bloco não pede Diamantes). */
  readonly diamonds: number;
  readonly items: Readonly<Record<string, number>>;
}

export interface IslandDef {
  readonly id: string;
  /** 1 = ilha inicial. */
  readonly order: number;
  /** Blocos da ilha, na ordem de revelação. */
  readonly blockIds: readonly string[];
  /** Custo de mudança para ENTRAR nesta ilha (pago junto com o 1º bloco dela); `{}` na ilha inicial. */
  readonly crossingCost: Readonly<Record<string, number>>;
}

export interface ExpansionBlockDef {
  readonly id: string;
  readonly islandId: string;
  /** Posição global na sequência (1 = terreno inicial). */
  readonly order: number;
  /** Duração da obra, inteiro em segundos (0 no terreno inicial). */
  readonly buildSeconds: number;
  /** Nível mínimo do avatar (ainda sem sistema de XP; base da referência). */
  readonly minLevel: number;
  /** Idade mínima da conta em dias (anti-multiconta). */
  readonly minAccountDays: number;
  readonly cost: ExpansionCost;
  /** O que a revelação acrescenta: canteiros e nós (node id → quantidade). */
  readonly adds: { readonly plots: number; readonly nodes: Readonly<Record<string, number>> };
  /** Culturas cuja semente entra na loja ao revelar este bloco. */
  readonly unlocksCrops: readonly string[];
}

export interface WorldData {
  readonly meta: EconomyMeta;
  readonly islands: Readonly<Record<string, IslandDef>>;
  /** Todos os blocos na ordem de revelação. */
  readonly blockOrder: readonly string[];
  readonly blocks: Readonly<Record<string, ExpansionBlockDef>>;
  readonly nodes: Readonly<Record<string, ResourceNodeDef>>;
  /** cultura → bloco que a desbloqueia (`unlockBlock`). */
  readonly cropUnlockBlock: Readonly<Record<string, string>>;
}
