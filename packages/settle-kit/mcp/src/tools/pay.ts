import {
  acceptedContent,
  type CallToolResult,
  type InputRequiredResult,
  inputRequired,
} from "@modelcontextprotocol/server";
import {
  createPaidFetch,
  type PaidFetch,
  parseMandateHeader,
  payForResource,
  quoteResource,
  verifyMandateLocal,
} from "@settle-kit/agents";
import { failureGateForReason, getDecisionRecord, isHeldReason, preclear } from "../facilitator.ts";
import { derivePaymentId, quoteNonceFor } from "../ids.ts";
import { toMoney } from "../money.ts";
import { BASE_SEPOLIA_CAIP2, type SettleMcpOptions } from "../options.ts";
import { jsonError, jsonResult } from "../result.ts";
import type { PayPhase } from "../state.ts";
import { explorerUrl, type PaymentRecord, type PaymentStore } from "../store.ts";
import { isAllowlisted } from "./quote.ts";

export type PayRound = {
  requestState: () => PayPhase | undefined;
  inputResponses: unknown;
  mint: (phase: PayPhase) => Promise<string>;
};

const APPROVAL_SCHEMA = {
  type: "object" as const,
  properties: { approved: { type: "boolean" as const } },
  required: ["approved"],
};

export async function payForResourceTool(
  url: string,
  options: SettleMcpOptions,
  store: PaymentStore,
  round?: PayRound,
): Promise<CallToolResult | InputRequiredResult> {
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

  const state = round?.requestState();
  if (state?.step === "awaiting-approval") {
    return continueAfterApproval({
      url,
      options,
      store,
      ...(round ? { round } : {}),
      signer,
      mandateHeader,
      quoted,
      quoteNonce,
      payId,
      fetchImpl,
      state,
    });
  }

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

  if (!verdict.ok && isHeldReason(verdict.reason)) {
    if (!round) {
      return jsonError("held", {
        reason: verdict.reason,
        payId,
        amount: toMoney(quoted.amountAtomic),
      });
    }
    return askApproval(round, {
      step: "awaiting-approval",
      payId,
      url,
      amountAtomic: quoted.amountAtomic,
      quoteNonce,
    });
  }

  if (!verdict.ok) {
    return jsonError(verdict.reason, {
      reason: verdict.reason,
      payId,
      gate: failureGateForReason(verdict.reason),
    });
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

async function continueAfterApproval(input: {
  url: string;
  options: SettleMcpOptions;
  store: PaymentStore;
  round?: PayRound;
  signer: Awaited<ReturnType<SettleMcpOptions["getSigner"]>>;
  mandateHeader: string;
  quoted: NonNullable<Awaited<ReturnType<typeof quoteResource>>>;
  quoteNonce: string;
  payId: string;
  fetchImpl: typeof fetch;
  state: PayPhase;
}): Promise<CallToolResult | InputRequiredResult> {
  const accepted = acceptedContent<{ approved: boolean }>(
    input.round?.inputResponses as never,
    "approval",
  );
  if (!accepted?.approved) {
    return jsonError("approval_declined", {
      reason: "approval_declined",
      payId: input.state.payId,
    });
  }

  if (
    input.quoted.amountAtomic !== input.state.amountAtomic ||
    input.quoteNonce !== input.state.quoteNonce ||
    input.url !== input.state.url
  ) {
    if (!input.round) {
      return jsonError("quote_drift", {
        reason: "quote_drift",
        payId: input.state.payId,
        approved: toMoney(input.state.amountAtomic),
        current: toMoney(input.quoted.amountAtomic),
      });
    }
    return askApproval(input.round, {
      step: "awaiting-approval",
      payId: derivePaymentId({
        agent: input.signer.address,
        resource: input.url,
        amountAtomic: input.quoted.amountAtomic,
        quoteNonce: input.quoteNonce,
      }),
      url: input.url,
      amountAtomic: input.quoted.amountAtomic,
      quoteNonce: input.quoteNonce,
    });
  }

  return submitPayment({
    url: input.url,
    options: input.options,
    store: input.store,
    signer: input.signer,
    mandateHeader: input.mandateHeader,
    quoted: input.quoted,
    payId: input.state.payId,
    fetchImpl: input.fetchImpl,
  });
}

async function askApproval(round: PayRound, phase: PayPhase): Promise<InputRequiredResult> {
  const amount = toMoney(phase.amountAtomic);
  return inputRequired({
    inputRequests: {
      approval: inputRequired.elicit({
        message: `Approve payment of ${amount.display} for ${phase.url}?`,
        requestedSchema: APPROVAL_SCHEMA,
      }),
    },
    requestState: await round.mint(phase),
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
