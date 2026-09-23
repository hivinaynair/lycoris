import { quoteResource } from "@settle-kit/agents";
import { quoteNonceFor } from "../ids.ts";
import { toMoney } from "../money.ts";
import type { SettleMcpOptions } from "../options.ts";
import { jsonError, jsonResult } from "../result.ts";

export function isAllowlisted(url: string, allowlist: string[]): boolean {
  return allowlist.includes(url);
}

/** x402 terms only. Permission is enforced later, on verify and settle. */
export async function quoteResourceTool(url: string, options: SettleMcpOptions) {
  if (!isAllowlisted(url, options.allowlist)) {
    return jsonError("not_allowlisted", { url, reason: "not_allowlisted" });
  }

  const fetchImpl = options.ports?.fetch ?? fetch;
  const quoteFn = options.ports?.quoteResource ?? quoteResource;
  const quoted = await quoteFn(url, fetchImpl);
  if (!quoted) {
    return jsonError("not_x402", { url, reason: "not_x402" });
  }

  const nonce = quoteNonceFor({
    amountAtomic: quoted.amountAtomic,
    payTo: quoted.payTo,
    url,
  });

  return jsonResult({
    url,
    amount: toMoney(quoted.amountAtomic),
    payTo: quoted.payTo,
    quoteNonce: nonce,
    challenge: quoted.challenge,
  });
}
