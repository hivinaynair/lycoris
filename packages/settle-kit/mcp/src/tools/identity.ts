import { parseMandateHeader, serializeMandateHeader, verifyMandateLocal } from "@settle-kit/agents";
import type { Address } from "@settle-kit/core";
import { lookupRegistered, readUsdcBalance } from "../chain.ts";
import { prefixedId } from "../ids.ts";
import { toMoney, wholeUsdcToMoney } from "../money.ts";
import type { SettleMcpOptions } from "../options.ts";
import { jsonError, jsonResult } from "../result.ts";
import type { PaymentStore } from "../store.ts";

export async function getAgentIdentity(options: SettleMcpOptions) {
  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  const agentId = parsed?.agentId ?? 0n;
  const registered = await (
    options.ports?.lookupRegistered ??
    ((input: { agentId: bigint; address: Address }) => lookupRegistered(input, options))
  )({
    agentId,
    address: signer.address,
  });
  return jsonResult({
    address: signer.address,
    agentId: prefixedId("agt", signer.address.toLowerCase()),
    registryId: agentId.toString(),
    registered,
  });
}

export async function getMandate(options: SettleMcpOptions, store: PaymentStore) {
  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  if (!parsed) return jsonError("mandate_invalid", { reason: "mandate_invalid" });

  const now = options.ports?.now?.() ?? Math.floor(Date.now() / 1000);
  const local = await verifyMandateLocal(parsed.mandate, { agent: signer.address, now });
  const expired = local.ok === false && local.reason === "expired";
  const cap = wholeUsdcToMoney(parsed.mandate.payload.maxAmountUsdc);
  const spentAtomic = await spentFromStore(store, signer.address);
  const remainingAtomic = BigInt(cap.atomic) > spentAtomic ? BigInt(cap.atomic) - spentAtomic : 0n;

  return jsonResult({
    id: prefixedId("mdt", serializeMandateHeader(parsed)),
    delegator: parsed.mandate.payload.delegator,
    agent: parsed.mandate.payload.agent,
    merchant: parsed.mandate.payload.payTo,
    cap,
    spent: toMoney(spentAtomic.toString() === "0" ? "0" : spentAtomic.toString()),
    remaining: toMoney(remainingAtomic.toString() === "0" ? "0" : remainingAtomic.toString()),
    expiry: parsed.mandate.payload.expiry.toString(),
    expired,
    valid: local.ok,
    ...(local.ok ? {} : { reason: local.reason }),
  });
}

export async function getBalance(options: SettleMcpOptions) {
  const signer = await options.getSigner();
  const atomic = await (
    options.ports?.readUsdcBalance ?? ((address: Address) => readUsdcBalance(address, options))
  )(signer.address);
  return jsonResult({
    address: signer.address,
    balance: toMoney(atomic.toString()),
  });
}

async function spentFromStore(store: PaymentStore, agent: string): Promise<bigint> {
  void agent;
  void store;
  // Default store has no aggregate index; spent reports zero.
  return 0n;
}
