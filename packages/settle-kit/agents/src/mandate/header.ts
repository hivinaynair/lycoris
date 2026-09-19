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
    payTo: string;
    maxAmountUsdc: string;
    expiry: string;
    nonce: string;
  };
  signature: string;
};

export function serializeMandateHeader(value: MandateHeaderValue): string {
  const { payload, signature } = value.mandate;
  return JSON.stringify({
    agentId: value.agentId.toString(),
    payload: {
      agent: payload.agent,
      delegator: payload.delegator,
      payTo: payload.payTo,
      maxAmountUsdc: payload.maxAmountUsdc.toString(),
      expiry: payload.expiry.toString(),
      nonce: payload.nonce.toString(),
    },
    signature,
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
  const payTo = asAddress(body?.payTo);
  const maxAmountUsdc = asBigInt(body?.maxAmountUsdc);
  const expiry = asBigInt(body?.expiry);
  const nonce = asBigInt(body?.nonce);

  if (
    agentId === undefined ||
    maxAmountUsdc === undefined ||
    expiry === undefined ||
    nonce === undefined ||
    agent === undefined ||
    delegator === undefined
  ) {
    return undefined;
  }
  // A mandate with no recipient is valid everywhere. Refuse the old shape.
  if (payTo === undefined) return undefined;
  if (!isHex(signature)) return undefined;

  const payload: MandatePayload = { agent, delegator, payTo, maxAmountUsdc, expiry, nonce };
  return { agentId, mandate: { payload, signature } };
}
