import { isHex } from "viem";
import { asAddress, asBigInt, asRecord, asString } from "../decode";
import type { MandatePayload, SignedMandate } from "./eip712";

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

/**
 * A mandate header is presented by whoever made the request. Every field is checked:
 * a verifier checks the signature against `delegator`, so a malformed one must not pass.
 */
export function parseMandateHeader(json: string): MandateHeaderValue | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return undefined;
  }

  const value = asRecord(parsed);
  const body = asRecord(value?.payload);
  const agentId = asBigInt(value?.agentId);
  const signature = asString(value?.signature);
  const agent = asAddress(body?.agent);
  const delegator = asAddress(body?.delegator);
  const maxAmountUsdc = asBigInt(body?.maxAmountUsdc);
  const expiry = asBigInt(body?.expiry);
  const nonce = asBigInt(body?.nonce);

  if (agentId === undefined || maxAmountUsdc === undefined) return undefined;
  if (expiry === undefined || nonce === undefined) return undefined;
  if (agent === undefined || delegator === undefined) return undefined;
  if (!isHex(signature)) return undefined;

  const payload: MandatePayload = { agent, delegator, maxAmountUsdc, expiry, nonce };
  return { agentId, mandate: { payload, signature } };
}
