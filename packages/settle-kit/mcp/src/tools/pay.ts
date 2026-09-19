import {
  acceptedContent,
  type CallToolResult,
  type InputRequiredResult,
  inputRequired,
} from "@modelcontextprotocol/server";
import {
  createPaidFetch,
  type PaidFetch,
  type PaidFetchFn,
  parseMandateHeader,
  payForResource,
  quoteResource,
  verifyMandateLocal,
} from "@settle-kit/agents";
import { failureGateForReason, getDecisionRecord, isHeldReason, preclear } from "../facilitator";
import { derivePaymentId, quoteNonceFor } from "../ids";
import { toMoney } from "../money";
import { BASE_SEPOLIA_CAIP2, type SettleMcpOptions, type SettleMcpSigner } from "../options";
import { jsonError, jsonResult } from "../result";
import type { PayPhase } from "../state";
import { explorerUrl, type PaymentRecord, type PaymentStore } from "../store";
import { isAllowlisted } from "./quote";

export type PayRound = {
  requestState: () => PayPhase | undefined;
  inputResponses: unknown;
  mint: (phase: PayPhase) => Promise<string>;
};

type QuotedResource = NonNullable<Awaited<ReturnType<typeof quoteResource>>>;

type PaymentAttempt = {
  url: string;
  options: SettleMcpOptions;
  store: PaymentStore;
  signer: SettleMcpSigner;
  mandateHeader: string;
  quoted: QuotedResource;
  payId: string;
  fetchImpl: typeof fetch;
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

  const attempt: PaymentAttempt = {
    url,
    options,
    store,
    signer,
    mandateHeader,
    quoted,
    payId,
    fetchImpl,
  };

  const state = round?.requestState();
  if (round && state?.step === "awaiting-approval") {
    return continueAfterApproval({ ...attempt, round, quoteNonce, state });
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
    const reason = `mandate_${local.reason}`;
    return jsonError(reason, { reason, payId });
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

  if (verdict.ok) return submitPayment(attempt);

  if (!isHeldReason(verdict.reason)) {
    return jsonError(verdict.reason, { reason: verdict.reason, payId });
  }

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

async function continueAfterApproval(
  input: PaymentAttempt & { round: PayRound; quoteNonce: string; state: PayPhase },
): Promise<CallToolResult | InputRequiredResult> {
  const accepted = acceptedContent<{ approved: boolean }>(
    input.round.inputResponses as never,
    "approval",
  );
  if (!accepted?.approved) {
    return jsonError("approval_declined", {
      reason: "approval_declined",
      payId: input.state.payId,
    });
  }

  const quoteMoved =
    input.quoted.amountAtomic !== input.state.amountAtomic ||
    input.quoteNonce !== input.state.quoteNonce ||
    input.url !== input.state.url;
  if (quoteMoved) {
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

  return submitPayment({ ...input, payId: input.state.payId });
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

async function submitPayment(input: PaymentAttempt): Promise<CallToolResult> {
  const createFetch = input.options.ports?.createPaidFetch ?? createPaidFetch;
  const pay = input.options.ports?.payForResource ?? payForResource;
  const paidFetch = createFetch({
    scheme: { network: BASE_SEPOLIA_CAIP2, client: input.signer.client },
    getMandateHeader: () => input.mandateHeader,
    fetch: input.fetchImpl,
  });
  const paid = await pay({ url: input.url, paidFetch: paidFetch as PaidFetch | PaidFetchFn });
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
  const explorer = explorerUrl(paid.txHash) ?? paid.basescan;
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
