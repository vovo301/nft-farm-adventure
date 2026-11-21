/**
 * Códigos de erro estáveis. O servidor devolve `code` ao cliente; nunca renomeie um código
 * existente (só acrescente).
 */
export type GameErrorCode =
  | "UNKNOWN_EVENT"
  | "INVALID_ACTION"
  | "INVALID_TIMESTAMP"
  | "INVALID_QUANTITY"
  | "UNKNOWN_ITEM"
  | "UNKNOWN_CROP"
  | "NOT_BUYABLE"
  | "NOT_SELLABLE"
  | "INSUFFICIENT_COINS"
  | "INSUFFICIENT_ITEMS"
  | "MISSING_SEED"
  | "INVALID_PLOT"
  | "PLOT_OCCUPIED"
  | "PLOT_EMPTY"
  | "CROP_NOT_READY"
  | "INVALID_SAVE"
  | "UNSUPPORTED_SCHEMA_VERSION";

export class GameError extends Error {
  readonly code: GameErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(code: GameErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.name = "GameError";
    this.code = code;
    this.details = details;
  }
}

export function isGameError(value: unknown): value is GameError {
  return value instanceof GameError;
}
