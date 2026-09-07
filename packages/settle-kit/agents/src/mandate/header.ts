import type { HexAddress } from "@settle-kit/core";
import type { MandatePayload, SignedMandate } from "./eip712.js";

export type MandateHeaderValue = {
  agentId: bigint;
  mandate: SignedMandate;
};

export type SerializedMandateHeader = {
  agentId: string;
  payload: {
    agent: string;
    delegator: string;
    maxAmountUsdc: string;
    expiry: string;
    nonce: string;
  };
  signature: string;
};

export function serializeMandateHeader(value: MandateHeaderValue): string {
  return JSON.stringify({
    agentId: value.agentId.toString(),
    payload: {
      agent: value.mandate.payload.agent,
      delegator: value.mandate.payload.delegator,
      maxAmountUsdc: value.mandate.payload.maxAmountUsdc.toString(),
      expiry: value.mandate.payload.expiry.toString(),
      nonce: value.mandate.payload.nonce.toString(),
    },
    signature: value.mandate.signature,
  } satisfies SerializedMandateHeader);
}

export function parseMandateHeader(json: string): MandateHeaderValue | undefined {
  try {
    const value = JSON.parse(json) as SerializedMandateHeader;
    if (
      typeof value.agentId !== "string" ||
      typeof value.signature !== "string" ||
      !value.payload ||
      typeof value.payload.agent !== "string"
    ) {
      return undefined;
    }
    const payload: MandatePayload = {
      agent: value.payload.agent as HexAddress,
      delegator: value.payload.delegator as HexAddress,
      maxAmountUsdc: BigInt(value.payload.maxAmountUsdc),
      expiry: BigInt(value.payload.expiry),
      nonce: BigInt(value.payload.nonce),
    };
    return {
      agentId: BigInt(value.agentId),
      mandate: { payload, signature: value.signature as HexAddress },
    };
  } catch {
    return undefined;
  }
}
