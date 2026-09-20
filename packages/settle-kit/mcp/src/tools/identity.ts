import { parseMandateHeader, verifyMandateLocal } from "@settle-kit/agents";
import { type Address, formatUsdcAmount } from "@settle-kit/core";
import { readUsdcBalance } from "../chain.ts";
import { toMoney } from "../money.ts";
import type { SettleMcpOptions } from "../options.ts";
import { jsonError, jsonResult } from "../result.ts";

export async function getAgentIdentity(options: SettleMcpOptions) {
  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  const agentId = parsed?.agentId ?? 0n;
  const registered = options.ports?.lookupRegistered
    ? await options.ports.lookupRegistered({ agentId, address: signer.address })
    : false;
  return jsonResult({
    address: signer.address,
    registryId: agentId.toString(),
    registered,
  });
}

export async function getMandate(options: SettleMcpOptions) {
  const [signer, mandateHeader] = await Promise.all([options.getSigner(), options.getMandate()]);
  const parsed = parseMandateHeader(mandateHeader);
  if (!parsed) return jsonError("mandate_invalid", { reason: "mandate_invalid" });

  const now = options.ports?.now?.() ?? Math.floor(Date.now() / 1000);
  const local = await verifyMandateLocal(parsed.mandate, { agent: signer.address, now });
  const expired = local.ok === false && local.reason === "expired";
  const capAtomic = (parsed.mandate.payload.maxAmountUsdc * 1_000_000n).toString();

  return jsonResult({
    delegator: parsed.mandate.payload.delegator,
    agent: parsed.mandate.payload.agent,
    merchant: parsed.mandate.payload.payTo,
    cap: { atomic: capAtomic, display: `${formatUsdcAmount(capAtomic)} USDC` },
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
