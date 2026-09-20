import { invalidConfig } from "./errors.ts";
import { USDC_DECIMALS } from "./types.ts";

const AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

/** Parse a decimal USDC amount (max 6 places) into atomic units. */
export function parseUsdcAmount(amount: string): string {
  if (typeof amount !== "string") invalidConfig("amount must be a string");
  const trimmed = amount.trim();
  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) {
    invalidConfig(`Invalid USDC amount: ${amount}`);
  }

  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(USDC_DECIMALS, "0");
  if (fraction.length > USDC_DECIMALS) {
    invalidConfig(`USDC amount has more than ${USDC_DECIMALS} decimal places: ${amount}`);
  }

  const atomic = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  if (atomic === "0") {
    invalidConfig("USDC amount must be greater than zero");
  }
  if (BigInt(atomic) > (1n << 256n) - 1n) invalidConfig("USDC amount exceeds uint256");
  return atomic;
}

/** Format atomic USDC units as a decimal string. */
export function formatUsdcAmount(amountAtomic: string): string {
  const digits = amountAtomic.replace(/^0+(?=\d)/, "") || "0";
  const padded = digits.padStart(USDC_DECIMALS + 1, "0");
  const whole = padded.slice(0, -USDC_DECIMALS);
  const fraction = padded.slice(-USDC_DECIMALS);
  const cents = fraction.slice(0, 2);
  const rest = fraction.slice(2).replace(/0+$/, "");
  return rest ? `${whole}.${cents}${rest}` : `${whole}.${cents}`;
}
