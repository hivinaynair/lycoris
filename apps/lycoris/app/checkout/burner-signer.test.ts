import { describe, expect, test } from "bun:test";
import {
  BASE_SEPOLIA_CHAIN_ID,
  type Hex,
  type HexAddress,
  type SettlementHash,
} from "@settle-kit/core";
import { toPaymentSigner, type UserOperationSender } from "./burner-signer";

const smartAccount = { address: "0x1111111111111111111111111111111111111111" as HexAddress };
const usdc = "0x2222222222222222222222222222222222222222" as HexAddress;
const transferCalldata = "0xa9059cbb0000000000000000000000003333" as Hex;
const userOpHash =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as SettlementHash;

/** Derived, so the recorded shape cannot drift from the one the sender declares. */
type SentUserOperation = Parameters<UserOperationSender["sendUserOperation"]>[0];

/** A sender that records the one argument the bundler would have received. */
function recordingSender() {
  const sent: SentUserOperation[] = [];
  const sender: UserOperationSender = {
    account: smartAccount,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    sendUserOperation: async (args) => {
      sent.push(args);
      return userOpHash;
    },
  };
  return { sender, sent };
}

describe("toPaymentSigner", () => {
  test("exposes the smart account's address as the payer", () => {
    const { sender } = recordingSender();

    expect(toPaymentSigner(sender).address).toBe(smartAccount.address);
  });

  test("sends one call carrying the transfer, with no ether attached", async () => {
    const { sender, sent } = recordingSender();

    await toPaymentSigner(sender).sendTransaction({ to: usdc, data: transferCalldata });

    // The exact argument is the contract: a later task hands this straight to viem's
    // `bundlerClient.sendUserOperation`, so a looser assertion would not catch a drift.
    expect(sent).toEqual([
      {
        account: smartAccount,
        calls: [{ to: usdc, value: 0n, data: transferCalldata }],
      },
    ]);
  });

  test("returns the userOpHash the sender produced, unchanged", async () => {
    const { sender } = recordingSender();

    const hash = await toPaymentSigner(sender).sendTransaction({
      to: usdc,
      data: transferCalldata,
    });

    expect(hash).toBe(userOpHash);
  });

  test("reports the configured chain id so the SDK's wrong-network check still runs", async () => {
    const { sender } = recordingSender();

    // `getChainId` is optional on `PaymentSigner`; leaving it off would silently
    // switch the wrong-network check off for every 4337 buyer.
    expect(await toPaymentSigner(sender).getChainId?.()).toBe(BASE_SEPOLIA_CHAIN_ID);
  });

  test("propagates a submission failure, which never yielded a hash to report", async () => {
    const sender: UserOperationSender = {
      account: smartAccount,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      sendUserOperation: async () => {
        throw new Error("bundler rejected the user operation");
      },
    };

    await expect(
      toPaymentSigner(sender).sendTransaction({ to: usdc, data: transferCalldata }),
    ).rejects.toThrow("bundler rejected the user operation");
  });
});
