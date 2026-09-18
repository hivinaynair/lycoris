import { formatUsdcAmount } from "@settle-kit/core";

export type Money = {
  decimal: string;
  atomic: string;
  currency: "USDC";
  display: string;
};

const ATOMIC = /^(0|[1-9]\d*)$/;

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

/** Mandate caps are whole USDC; money on the wire is always atomic. */
export function wholeUsdcToMoney(whole: bigint | string): Money {
  return toMoney((BigInt(whole) * 1_000_000n).toString());
}
