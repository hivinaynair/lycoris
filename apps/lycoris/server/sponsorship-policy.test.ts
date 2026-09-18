import { expect, it } from "bun:test";
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { createPublicClient, custom, encodeFunctionData, erc20Abi, type Hex, pad } from "viem";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  ACCOUNT_EXECUTE_ABI,
  checkSponsorship,
  type SponsorshipPolicy,
} from "./sponsorship-policy";

/** Checksummed, so the case-insensitivity test below has something real to compare. */
const MERCHANT = "0xABaBaBaBABabABabAbAbABAbABabababaBaBABaB" as const;
const STRANGER = "0xCdCDCdCdcdcdcdCdcDcDCdcDcDCdCdcdCdcDCDcD" as const;

const INVOICE = BigInt(WEATHER_AMOUNT_ATOMIC);

const policy: SponsorshipPolicy = {
  asset: BASE_SEPOLIA_USDC_ADDRESS,
  merchant: MERCHANT,
  amount: INVOICE,
};

function transferData(recipient: Hex = MERCHANT, amount = INVOICE) {
  return encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [recipient, amount] });
}

function executeData({
  target = BASE_SEPOLIA_USDC_ADDRESS as Hex,
  value = 0n,
  data = transferData(),
}: {
  target?: Hex;
  value?: bigint;
  data?: Hex;
} = {}) {
  return encodeFunctionData({
    abi: ACCOUNT_EXECUTE_ABI,
    functionName: "execute",
    args: [target, value, data],
  });
}

/**
 * A Coinbase smart account that encodes calls without a network.
 *
 * `toCoinbaseSmartAccount` resolves its counterfactual address through an `eth_call`
 * to the factory before it hands back an account, so a real transport would make this
 * an integration test. Only `encodeCalls` matters here, and that is pure.
 */
async function offlineSmartAccount() {
  return toCoinbaseSmartAccount({
    client: createPublicClient({
      chain: baseSepolia,
      transport: custom({
        request: async ({ method }) => {
          if (method === "eth_call") return pad("0x000000000000000000000000000000000000da7a");
          throw new Error(`Unexpected RPC call: ${method}`);
        },
      }),
    }),
    owners: [privateKeyToAccount(generatePrivateKey())],
  });
}

/** Asserts the refusal *and* its cause: a test that passes for the wrong reason is not a test. */
function expectRefusal(callData: Hex, reason: string) {
  expect(checkSponsorship(callData, policy)).toEqual({ ok: false, reason });
}

it("sponsors the exact invoice: a USDC transfer of the policy amount to the merchant", () => {
  expect(checkSponsorship(executeData(), policy)).toEqual({ ok: true });
});

it("sponsors the calldata viem's own smart account produces for that transfer", async () => {
  // The one test that would catch a wrapper signature copied from the wrong wallet.
  const account = await offlineSmartAccount();
  const callData = await account.encodeCalls([
    { to: BASE_SEPOLIA_USDC_ADDRESS, data: transferData() },
  ]);
  expect(checkSponsorship(callData, policy)).toEqual({ ok: true });
});

it("ignores address casing on both the asset and the merchant", () => {
  // viem encodes an address only when it is all-lowercase or correctly checksummed, so
  // lowercase is the one alternative casing a real client can put on the wire.
  const callData = executeData({
    target: BASE_SEPOLIA_USDC_ADDRESS.toLowerCase() as Hex,
    data: transferData(MERCHANT.toLowerCase() as Hex),
  });
  expect(checkSponsorship(callData, policy)).toEqual({ ok: true });
});

it("refuses a non-zero value on the outer execute", () => {
  expectRefusal(executeData({ value: 1n }), "execute must not send value");
});

it("refuses a target that is not the sponsored asset", () => {
  expectRefusal(executeData({ target: STRANGER }), "execute must target the sponsored asset");
});

it("refuses an inner call that is not transfer", () => {
  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [MERCHANT, INVOICE],
  });
  expectRefusal(executeData({ data: approve }), "inner call must be transfer");
});

it("refuses a recipient that is not the merchant", () => {
  expectRefusal(executeData({ data: transferData(STRANGER) }), "transfer must pay the merchant");
});

it("refuses an amount below the invoice", () => {
  const callData = executeData({ data: transferData(MERCHANT, INVOICE - 1n) });
  expectRefusal(callData, "transfer must be for the invoice amount");
});

it("refuses an amount above the invoice", () => {
  const callData = executeData({ data: transferData(MERCHANT, INVOICE + 1n) });
  expectRefusal(callData, "transfer must be for the invoice amount");
});

it("refuses outer calldata that does not decode, rather than throwing", () => {
  for (const callData of ["0x", "0xdeadbeef", "0xnothex"] as Hex[]) {
    expectRefusal(callData, "callData is not a single account execute call");
  }
});

it("refuses inner calldata that does not decode, rather than throwing", () => {
  expectRefusal(executeData({ data: "0xdeadbeef" }), "inner call is not a readable ERC-20 call");
});

it("refuses a batch that smuggles a rider call alongside a valid payment", async () => {
  // viem encodes one call as `execute` and several as `executeBatch`. A checkout is one
  // transfer, so a batch is never ours — and sponsoring one carries the rider calls too.
  const account = await offlineSmartAccount();
  const callData = await account.encodeCalls([
    { to: BASE_SEPOLIA_USDC_ADDRESS, data: transferData() },
    { to: STRANGER, data: "0xdeadbeef" },
  ]);
  expectRefusal(callData, "callData is not a single account execute call");
});
