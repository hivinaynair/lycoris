import { parseMandateHeader, serializeMandateHeader, verifyMandateLocal } from "@settle-kit/agents";
import type { HexAddress } from "@settle-kit/core";
import { lookupRegistered, readUsdcBalance } from "../chain";
import { prefixedId } from "../ids";
import { toMoney, wholeUsdcToMoney } from "../money";
import type { SettleMcpOptions } from "../options";
import { jsonError, jsonResult } from "../result";
import type { PaymentStore } from "../store";

export async function getAgentIdentity(options: SettleMcpOptions) {
  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  const agentId = parsed?.agentId ?? 0n;
  const registered = await (
    options.ports?.lookupRegistered ??
    ((input: { agentId: bigint; address: HexAddress }) => lookupRegistered(input, options))
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
    options.ports?.readUsdcBalance ?? ((address: HexAddress) => readUsdcBalance(address, options))
  )(signer.address);
  return jsonResult({
    address: signer.address,
    balance: toMoney(atomic.toString()),
  });
}

async function spentFromStore(store: PaymentStore, agent: string): Promise<bigint> {
  void agent;
  void store;
  // Per-process store has no index of all payments; spent starts at zero and
  // is only meaningful to hosts that supply a store which can answer this.
  return 0n;
}
