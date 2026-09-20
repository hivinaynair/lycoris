"use client";

import { type Address, type PaymentSigner, SettleKitError } from "@settle-kit/core";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";

type InjectedProvider = EIP1193Provider & {
  providers?: EIP1193Provider[];
  isCoinbaseWallet?: boolean;
};

function readInjectedProvider(): EIP1193Provider {
  const ethereum = (globalThis as { window?: { ethereum?: InjectedProvider } }).window?.ethereum;
  if (!ethereum) {
    throw new SettleKitError(
      "wallet_unavailable",
      "Open Coinbase Wallet or another injected wallet, then try again.",
    );
  }
  const providers = ethereum.providers ?? [ethereum];
  return (
    providers.find((provider) => "isCoinbaseWallet" in provider && provider.isCoinbaseWallet) ??
    providers[0] ??
    ethereum
  );
}

/**
 * Host signer for a visitor EOA. Prefer Coinbase Wallet when several
 * injected providers are present; otherwise use the default injected wallet.
 *
 * The SDK still sees only `address` + `sendTransaction`. Switching to Base
 * Sepolia is the host's job.
 */
export async function getWalletSigner(
  provider: EIP1193Provider = readInjectedProvider(),
): Promise<PaymentSigner> {
  const wallet = createWalletClient({
    chain: baseSepolia,
    transport: custom(provider),
  });
  const [account] = await wallet.requestAddresses();
  if (!account) {
    throw new SettleKitError(
      "wallet_unavailable",
      "Connect Coinbase Wallet or another injected wallet.",
    );
  }
  try {
    await wallet.switchChain({ id: baseSepolia.id });
  } catch (error) {
    if (isRejected(error)) throw error;
    try {
      await wallet.addChain({ chain: baseSepolia });
      await wallet.switchChain({ id: baseSepolia.id });
    } catch (retry) {
      if (isRejected(retry)) throw retry;
      throw new SettleKitError("wrong_network", "Switch the wallet to Base Sepolia.");
    }
  }
  return {
    address: account as Address,
    sendTransaction: ({ to, data }) =>
      wallet.sendTransaction({ account, chain: baseSepolia, to, data }),
  };
}

export function createWalletPayment() {
  return {
    getSigner: () => getWalletSigner(),
  };
}

function isRejected(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === 4001,
  );
}
