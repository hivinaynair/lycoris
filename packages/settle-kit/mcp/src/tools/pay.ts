import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  createPaidFetch,
  type PaidFetch,
  parseMandateHeader,
  payForResource,
  quoteResource,
  verifyMandateLocal,
} from "@settle-kit/agents";
import { failureGateForReason, getDecisionRecord } from "../facilitator.ts";
import { derivePaymentId, quoteNonceFor } from "../ids.ts";
import { toMoney } from "../money.ts";
import { BASE_SEPOLIA_CAIP2, type SettleMcpOptions } from "../options.ts";
import { jsonError, jsonResult } from "../result.ts";
import { explorerUrl, type PaymentRecord, type PaymentStore } from "../store.ts";
import { isAllowlisted } from "./quote.ts";

export async function payForResourceTool(
  url: string,
  options: SettleMcpOptions,
  store: PaymentStore,
): Promise<CallToolResult> {
  if (!isAllowlisted(url, options.allowlist)) {
    return jsonError("not_allowlisted", { url, reason: "not_allowlisted" });
  }

  const fetchImpl = options.ports?.fetch ?? fetch;
  const quoteFn = options.ports?.quoteResource ?? quoteResource;
  const quoted = await quoteFn(url, fetchImpl);
  if (!quoted) return jsonError("not_x402", { url, reason: "not_x402" });

  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const quoteNonce = quoteNonceFor({
    amountAtomic: quoted.amountAtomic,
    payTo: quoted.payTo,
    url,
  });
  const payId = derivePaymentId({
    agent: signer.address,
    resource: url,
    amountAtomic: quoted.amountAtomic,
    quoteNonce,
  });

  const existing = await store.get(payId);
  if (existing?.settled) return jsonResult(existing);

  // The grant the agent already holds. The facilitator checks it again on verify and settle.
  const parsed = parseMandateHeader(mandateHeader);
  if (!parsed) return jsonError("mandate_invalid", { reason: "mandate_invalid", payId });

  const now = options.ports?.now?.() ?? Math.floor(Date.now() / 1000);
  const local = await verifyMandateLocal(parsed.mandate, {
    agent: signer.address,
    ...(quoted.payTo ? { payTo: quoted.payTo } : {}),
    now,
  });
  if (!local.ok) {
    return jsonError(
      local.reason.startsWith("expired") ? "mandate_expired" : `mandate_${local.reason}`,
      {
        reason: local.reason === "expired" ? "mandate_expired" : `mandate_${local.reason}`,
        payId,
        gate: failureGateForReason(
          local.reason === "expired" ? "mandate_expired" : `mandate_${local.reason}`,
        ),
      },
    );
  }

  return submitPayment({
    url,
    options,
    store,
    signer,
    mandateHeader,
    quoted,
    payId,
    fetchImpl,
  });
}

async function submitPayment(input: {
  url: string;
  options: SettleMcpOptions;
  store: PaymentStore;
  signer: Awaited<ReturnType<SettleMcpOptions["getSigner"]>>;
  mandateHeader: string;
  quoted: NonNullable<Awaited<ReturnType<typeof quoteResource>>>;
  payId: string;
  fetchImpl: typeof fetch;
}): Promise<CallToolResult> {
  const createFetch = input.options.ports?.createPaidFetch ?? createPaidFetch;
  const pay = input.options.ports?.payForResource ?? payForResource;
  const paidFetch = createFetch({
    scheme: { network: BASE_SEPOLIA_CAIP2, client: input.signer.client },
    getMandateHeader: () => input.mandateHeader,
    fetch: input.fetchImpl,
  });
  const paid = await pay({ url: input.url, paidFetch: paidFetch as PaidFetch });
  const decisionRecord = await getDecisionRecord(
    {
      facilitatorUrl: input.options.facilitatorUrl,
      authorizationNonce: paid.authorizationNonce,
      payer: input.signer.address,
      settlementTxHash: paid.txHash,
    },
    5,
    input.fetchImpl,
  );

  const settled = Boolean(
    paid.txHash && paid.httpStatus < 400 && !paid.error && !decisionRecord?.rejectionReason,
  );
  const explorer = explorerUrl(paid.txHash);
  const reason = paid.error ?? decisionRecord?.rejectionReason;
  const gate = failureGateForReason(reason);
  const record: PaymentRecord = {
    payId: input.payId,
    url: input.url,
    amount: toMoney(input.quoted.amountAtomic),
    settled,
    status: settled ? "settled" : "failed",
    ...(paid.txHash ? { settlementHash: paid.txHash } : {}),
    ...(explorer ? { explorer } : {}),
    ...(paid.authorizationNonce ? { authorizationNonce: paid.authorizationNonce } : {}),
    ...(decisionRecord ? { decisionRecord } : {}),
    ...(reason ? { reason } : {}),
    ...(gate ? { gate } : {}),
  };
  await input.store.put(input.payId, record);
  return jsonResult(record);
}
