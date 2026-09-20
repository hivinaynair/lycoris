import { describe, expect, test } from "bun:test";
import { getWalletSigner } from "./eoa-payment";

const account = "0x1111111111111111111111111111111111111111";
const baseSepoliaId = "0x14a34";

function provider(handlers: Record<string, (params?: unknown) => unknown>) {
  return {
    request: async ({ method, params }: { method: string; params?: unknown }) => {
      if (!(method in handlers)) throw new Error(`unexpected ${method}`);
      return handlers[method]?.(params);
    },
  };
}

describe("getWalletSigner", () => {
  test("exposes the connected EOA and sends transfer calldata to USDC", async () => {
    const sent: unknown[] = [];
    const signer = await getWalletSigner(
      provider({
        eth_requestAccounts: () => [account],
        eth_accounts: () => [account],
        eth_chainId: () => baseSepoliaId,
        wallet_switchEthereumChain: () => null,
        eth_sendTransaction: (params) => {
          sent.push(params);
          return `0x${"ab".repeat(32)}`;
        },
      }),
    );
    expect(signer.address).toBe(account);
    const hash = await signer.sendTransaction({
      to: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      data: "0xdead",
    });
    expect(hash).toBe(`0x${"ab".repeat(32)}`);
    expect(sent).toHaveLength(1);
  });

  test("maps a missing provider to wallet_unavailable", async () => {
    await expect(getWalletSigner()).rejects.toMatchObject({ code: "wallet_unavailable" });
  });

  test("keeps a wallet rejection as a 4001 so checkout can map it", async () => {
    await expect(
      getWalletSigner(
        provider({
          eth_requestAccounts: () => {
            throw { code: 4001, message: "User rejected the request." };
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 4001 });
  });
});
