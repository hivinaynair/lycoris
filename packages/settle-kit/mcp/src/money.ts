import { formatUsdcAmount } from "@settle-kit/core";

/** USDC amount as decimal, atomic units, and display copy. Never a JSON number. */
export type Money = {
  decimal: string;
  atomic: string;
  currency: "USDC";
  display: string;
};

const ATOMIC = /^(0|[1-9]\d*)$/;

/** Parse atomic USDC units into a {@link Money} object. */
export function toMoney(amountAtomic: string): Money {
  if (typeof amountAtomic !== "string" || !ATOMIC.test(amountAtomic)) {
    throw new Error(`Expected atomic USDC units, received ${JSON.stringify(amountAtomic)}`);
  }
  const decimal = formatUsdcAmount(amountAtomic);
  return {
    decimal,
    atomic: amountAtomic,
    currency: "USDC",
    display: `${decimal} USDC`,
  };
}
