import { parseMandateHeader, quoteResource } from "@settle-kit/agents";
import { preclear } from "../facilitator";
import { prefixedId, quoteNonceFor } from "../ids";
import { toMoney } from "../money";
import type { SettleMcpOptions } from "../options";
import { jsonError, jsonResult } from "../result";

export function isAllowlisted(url: string, allowlist: string[]): boolean {
  return allowlist.includes(url);
}

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

  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  const verdict = await preclear(
    {
      facilitatorUrl: options.facilitatorUrl,
      amountAtomic: quoted.amountAtomic,
      mandateHeader,
      payer: signer.address,
      resource: url,
    },
    fetchImpl,
  );

  const nonce = quoteNonceFor({
    amountAtomic: quoted.amountAtomic,
    payTo: quoted.payTo,
    url,
  });

  return jsonResult({
    id: prefixedId("qte", nonce),
    url,
    amount: toMoney(quoted.amountAtomic),
    payTo: quoted.payTo,
    quoteNonce: nonce,
    challenge: quoted.challenge,
    preclear: verdict,
    mandateId: parsed ? prefixedId("mdt", mandateHeader) : undefined,
  });
}
