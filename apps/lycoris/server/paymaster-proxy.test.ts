import { describe, expect, test } from "bun:test";
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { encodeFunctionData, erc20Abi } from "viem";
import { checkProxyRequest, demoSponsorshipPolicy } from "./paymaster-proxy";
import { ACCOUNT_EXECUTE_ABI } from "./sponsorship-policy";

const MERCHANT = "0x2222222222222222222222222222222222222222" as const;
const ATTACKER = "0x3333333333333333333333333333333333333333" as const;
const policy = demoSponsorshipPolicy(MERCHANT);

function callData(to = MERCHANT, amount = BigInt(WEATHER_AMOUNT_ATOMIC)) {
  return encodeFunctionData({
    abi: ACCOUNT_EXECUTE_ABI,
    functionName: "execute",
    args: [
      BASE_SEPOLIA_USDC_ADDRESS,
      0n,
      encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] }),
    ],
  });
}

const rpc = (method: string, params?: unknown[]) => ({ jsonrpc: "2.0", id: 1, method, params });

describe("checkProxyRequest", () => {
  test("forwards a read that spends nothing", () => {
    expect(checkProxyRequest(rpc("eth_supportedEntryPoints", []), policy)).toEqual({ ok: true });
  });

  test("forwards a receipt lookup without a user operation", () => {
    expect(checkProxyRequest(rpc("eth_getUserOperationReceipt", ["0xabc"]), policy)).toEqual({
      ok: true,
    });
  });

  test("sponsors the exact purchase", () => {
    const body = rpc("pm_getPaymasterData", [{ callData: callData() }, "0xEntryPoint", "0x14a34"]);
    expect(checkProxyRequest(body, policy)).toEqual({ ok: true });
  });

  test("checks the operation on submission, not only on sponsorship", () => {
    const body = rpc("eth_sendUserOperation", [{ callData: callData(ATTACKER) }, "0xEntryPoint"]);
    expect(checkProxyRequest(body, policy)).toMatchObject({ ok: false });
  });

  // An open JSON-RPC proxy in front of a credentialed endpoint is worse than none.
  test("refuses a method that is not on the list", () => {
    expect(checkProxyRequest(rpc("eth_sendRawTransaction", ["0xdead"]), policy)).toMatchObject({
      ok: false,
      reason: "method eth_sendRawTransaction is not proxied",
    });
  });

  test("refuses a body with no method at all", () => {
    expect(checkProxyRequest({ jsonrpc: "2.0", id: 1 }, policy)).toMatchObject({ ok: false });
  });

  test("refuses a sponsorship call carrying no user operation", () => {
    expect(checkProxyRequest(rpc("pm_getPaymasterData", []), policy)).toMatchObject({ ok: false });
  });

  test("refuses a user operation with no callData", () => {
    expect(
      checkProxyRequest(rpc("pm_getPaymasterData", [{ sender: MERCHANT }]), policy),
    ).toMatchObject({ ok: false });
  });

  test("refuses paying anyone but the merchant", () => {
    const body = rpc("pm_getPaymasterData", [{ callData: callData(ATTACKER) }]);
    expect(checkProxyRequest(body, policy)).toMatchObject({ ok: false });
  });

  test("refuses an amount that is not the invoice", () => {
    const body = rpc("pm_getPaymasterData", [
      { callData: callData(MERCHANT, BigInt(WEATHER_AMOUNT_ATOMIC) + 1n) },
    ]);
    expect(checkProxyRequest(body, policy)).toMatchObject({ ok: false });
  });

  test("refuses a batch, which is a payment with a passenger", () => {
    const body = rpc("pm_getPaymasterData", [{ callData: "0x34fcd5be00" }]);
    expect(checkProxyRequest(body, policy)).toMatchObject({ ok: false });
  });
});
