import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES } from "@repo/shared/mandate";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import type { DecisionRecord, RawMandate } from "@repo/shared/types";

export function toRawMandate(entry: MandateHeaderValue): RawMandate {
  return {
    agentId: entry.agentId.toString(),
    domain: {
      name: MANDATE_EIP712_DOMAIN.name,
      version: MANDATE_EIP712_DOMAIN.version,
      chainId: Number(MANDATE_EIP712_DOMAIN.chainId),
    },
    types: {
      MandatePayload: MANDATE_EIP712_TYPES.MandatePayload.map((field) => ({
        name: field.name,
        type: field.type,
      })),
    },
    payload: {
      agent: entry.mandate.payload.agent,
      delegator: entry.mandate.payload.delegator,
      maxAmountUsdc: entry.mandate.payload.maxAmountUsdc.toString(),
      expiry: entry.mandate.payload.expiry.toString(),
      nonce: entry.mandate.payload.nonce.toString(),
    },
    signature: entry.mandate.signature,
  };
}

export type PreclearResult = { ok: true } | { ok: false; reason: string };

export async function preclearPayment(input: {
  amountAtomic: bigint;
  mandateHeader: string;
  payer: string;
  resource: string;
}): Promise<PreclearResult> {
  const baseUrl = process.env.FACILITATOR_URL?.replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, reason: "facilitator_unreachable" };

  const response = await fetch(`${baseUrl}/preclear`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-AP2-Mandate": input.mandateHeader,
    },
    body: JSON.stringify({
      payer: input.payer,
      amountAtomic: input.amountAtomic.toString(),
      resource: input.resource,
    }),
  }).catch(() => undefined);

  if (!response?.ok) {
    return { ok: false, reason: "facilitator_unreachable" };
  }

  const body = (await response.json().catch(() => undefined)) as PreclearResult | undefined;
  if (!body) return { ok: false, reason: "facilitator_unreachable" };
  return body;
}

export async function getDecisionRecord(
  input: {
    authorizationNonce?: string;
    payer: string;
    settlementTxHash?: string;
  },
  retries = 5,
): Promise<DecisionRecord | undefined> {
  const { getDecisionRecord: poll } = await import("@repo/shared/facilitator");
  return poll({ ...input, facilitatorUrl: process.env.FACILITATOR_URL }, retries);
}
