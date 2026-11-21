/** Toda ação carrega `createdAt` (ms). É a ÚNICA fonte de tempo dos reducers. */
export interface Action<T extends string, P> {
  readonly type: T;
  readonly payload: P;
  readonly createdAt: number;
}

/** Comprar sementes na loja. O preço vem da tabela, nunca do cliente. */
export type SeedBoughtAction = Action<"seed.bought", { readonly itemId: string; readonly qty: number }>;

/** Plantar uma cultura num plot vazio; consome 1 semente. */
export type CropPlantedAction = Action<"crop.planted", { readonly plotIndex: number; readonly cropId: string }>;

/** Colher um plot cuja cultura já cresceu. */
export type CropHarvestedAction = Action<"crop.harvested", { readonly plotIndex: number }>;

/** Vender itens para a loja. O preço vem da tabela, nunca do cliente. */
export type ItemSoldAction = Action<"item.sold", { readonly itemId: string; readonly qty: number }>;

export type GameAction = SeedBoughtAction | CropPlantedAction | CropHarvestedAction | ItemSoldAction;

export type GameActionType = GameAction["type"];
