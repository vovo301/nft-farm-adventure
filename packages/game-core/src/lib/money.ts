import DecimalJs from "decimal.js";
import type { DecimalString } from "../data/types";

/**
 * Decimal configurado para o jogo: precisão alta e sem notação exponencial em `toString()`,
 * para que saldos serializados sejam estáveis e legíveis. Nunca use float para moeda.
 */
export const Money = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_DOWN,
  toExpNeg: -40,
  toExpPos: 40,
});
export type Money = InstanceType<typeof Money>;

const DECIMAL_RE = /^(0|[1-9]\d*)(\.\d+)?$/;

/** `true` se `value` é uma string decimal canônica não negativa (ex.: "0", "12.5"). */
export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_RE.test(value);
}

export function money(value: DecimalString): Money {
  return new Money(value);
}

export function toDecimalString(value: Money): DecimalString {
  return value.toString();
}
