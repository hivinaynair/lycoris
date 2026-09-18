import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS, type HexAddress } from "@settle-kit/core";
import type { Hex } from "viem";
import { checkSponsorship, type SponsorshipPolicy } from "./sponsorship-policy";

/**
 * Methods the browser may reach through this proxy.
 *
 * CDP serves the bundler and the paymaster from one endpoint whose path segment is
 * the API key, so — unlike a public bundler — neither half can be called directly
 * from the client. Everything goes through here, and anything not named below is
 * refused rather than forwarded: an open JSON-RPC proxy to a credentialed endpoint
 * is worse than no proxy at all.
 */
export const FORWARDED_METHODS = new Set([
  "eth_sendUserOperation",
  "eth_estimateUserOperationGas",
  "eth_getUserOperationReceipt",
  "eth_getUserOperationByHash",
  "eth_supportedEntryPoints",
  "eth_chainId",
  "pm_getPaymasterStubData",
  "pm_getPaymasterData",
]);

/**
 * Methods that either spend the sponsorship or submit the operation that will.
 * These carry a user operation in `params[0]`, and it is checked against the policy
 * before anything reaches CDP.
 */
const POLICY_CHECKED_METHODS = new Set([
  "eth_sendUserOperation",
  "eth_estimateUserOperationGas",
  "pm_getPaymasterStubData",
  "pm_getPaymasterData",
]);

export const demoSponsorshipPolicy = (merchant: HexAddress): SponsorshipPolicy => ({
  asset: BASE_SEPOLIA_USDC_ADDRESS,
  merchant,
  amount: BigInt(WEATHER_AMOUNT_ATOMIC),
});

export type ProxyCheck = { ok: true } | { ok: false; reason: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * The paymaster's gate, as a pure function so it is testable without HTTP.
 *
 * The burner's key sits in the visitor's `localStorage` and is readable by any XSS
 * on the page. That is survivable only because of what happens here: a stolen key
 * can still ask us to sponsor something, and the answer is a USDC transfer to the
 * merchant for the invoice amount, or nothing.
 */
export function checkProxyRequest(body: unknown, policy: SponsorshipPolicy): ProxyCheck {
  const request = asRecord(body);
  const method = request?.method;
  if (typeof method !== "string") return { ok: false, reason: "missing JSON-RPC method" };
  if (!FORWARDED_METHODS.has(method))
    return { ok: false, reason: `method ${method} is not proxied` };
  if (!POLICY_CHECKED_METHODS.has(method)) return { ok: true };

  const params = request?.params;
  const userOperation = asRecord(Array.isArray(params) ? params[0] : undefined);
  if (!userOperation) return { ok: false, reason: `${method} carried no user operation` };

  const callData = userOperation.callData;
  if (typeof callData !== "string" || !callData.startsWith("0x"))
    return { ok: false, reason: "user operation has no callData" };

  return checkSponsorship(callData as Hex, policy);
}
