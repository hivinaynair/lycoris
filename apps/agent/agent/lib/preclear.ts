import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES } from "@repo/shared/mandate";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import type { DecisionRecord, RawMandate } from "@repo/shared/types";
import {
  type PreclearResult,
  getDecisionRecord as pollDecisionRecord,
  preclear,
} from "@settle-kit/agents";

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

export type { PreclearResult };

export async function preclearPayment(input: {
  amountAtomic: bigint;
  mandateHeader: string;
  payer: string;
  resource: string;
}): Promise<PreclearResult> {
  const facilitatorUrl = process.env.FACILITATOR_URL;
  if (!facilitatorUrl) return { ok: false, reason: "facilitator_unreachable" };
  return preclear({
    facilitatorUrl,
    amountAtomic: input.amountAtomic.toString(),
    mandateHeader: input.mandateHeader,
    payer: input.payer,
    resource: input.resource,
  });
}

export async function getDecisionRecord(
  input: {
    authorizationNonce?: string;
    payer: string;
    settlementTxHash?: string;
  },
  retries = 5,
): Promise<DecisionRecord | undefined> {
  return pollDecisionRecord(
    { ...input, facilitatorUrl: process.env.FACILITATOR_URL },
    retries,
  ) as Promise<DecisionRecord | undefined>;
}
