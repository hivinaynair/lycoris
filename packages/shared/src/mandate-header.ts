import { isAddress, isHex } from "viem";
import type { SignedMandate } from "./mandate.js";

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

export function toSerializedMandateHeader({
  agentId,
  mandate,
}: MandateHeaderValue): SerializedMandateHeader {
  return {
    agentId: agentId.toString(),
    payload: {
      agent: mandate.payload.agent,
      delegator: mandate.payload.delegator,
      maxAmountUsdc: mandate.payload.maxAmountUsdc.toString(),
      expiry: mandate.payload.expiry.toString(),
      nonce: mandate.payload.nonce.toString(),
    },
    signature: mandate.signature,
  };
}

export function serializeMandateHeader(value: MandateHeaderValue): string {
  return JSON.stringify(toSerializedMandateHeader(value));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Serialized bigints are digit strings. `BigInt("")` is 0n, so an empty value must not reach it. */
function asDigits(value: unknown): bigint | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

/**
 * A mandate header is presented by whoever made the request, so every field is checked
 * rather than asserted. A verifier checks the signature against `delegator`; a malformed
 * one must not reach that comparison wearing the address type.
 */
export function parseSerializedMandateHeader(raw: unknown): MandateHeaderValue | undefined {
  const value = asRecord(raw);
  const body = asRecord(value?.payload);
  if (!value || !body) return undefined;

  const agentId = asDigits(value.agentId);
  const maxAmountUsdc = asDigits(body.maxAmountUsdc);
  const expiry = asDigits(body.expiry);
  const nonce = asDigits(body.nonce);
  if (agentId === undefined || maxAmountUsdc === undefined) return undefined;
  if (expiry === undefined || nonce === undefined) return undefined;

  const { agent, delegator } = body;
  const { signature } = value;
  if (typeof agent !== "string" || !isAddress(agent, { strict: false })) return undefined;
  if (typeof delegator !== "string" || !isAddress(delegator, { strict: false })) return undefined;
  if (typeof signature !== "string" || !isHex(signature)) return undefined;

  return {
    agentId,
    mandate: { payload: { agent, delegator, maxAmountUsdc, expiry, nonce }, signature },
  };
}

export function parseMandateHeader(json: string): MandateHeaderValue | undefined {
  try {
    return parseSerializedMandateHeader(JSON.parse(json));
  } catch {
    return undefined;
  }
}
