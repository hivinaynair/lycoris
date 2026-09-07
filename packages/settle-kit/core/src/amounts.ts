import { invalidConfig } from "./errors";
import { USDC_DECIMALS } from "./types";

const AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

export function parseUsdcAmount(amountUsdc: string): string {
  const trimmed = amountUsdc.trim();
  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) {
    invalidConfig(`Invalid USDC amount: ${amountUsdc}`);
  }

  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(USDC_DECIMALS, "0");
  if (fraction.length > USDC_DECIMALS) {
    invalidConfig(`USDC amount has more than ${USDC_DECIMALS} decimal places: ${amountUsdc}`);
  }

  const atomic = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  if (atomic === "0") {
    invalidConfig("USDC amount must be greater than zero");
  }
  return atomic;
}

export function formatUsdcAmount(amountAtomic: string): string {
  const digits = amountAtomic.replace(/^0+(?=\d)/, "") || "0";
  const padded = digits.padStart(USDC_DECIMALS + 1, "0");
  const whole = padded.slice(0, -USDC_DECIMALS);
  const fraction = padded.slice(-USDC_DECIMALS);
  const cents = fraction.slice(0, 2);
  const rest = fraction.slice(2).replace(/0+$/, "");
  return rest ? `${whole}.${cents}${rest}` : `${whole}.${cents}`;
}
