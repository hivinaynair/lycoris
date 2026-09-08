import { BASE_SEPOLIA_CHAIN_ID, type PaymentSigner, SettleKitError } from "@settle-kit/core";
import { createWalletClient, custom, getAddress, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

export async function getBrowserSigner(): Promise<PaymentSigner> {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new SettleKitError(
      "wallet_unavailable",
      "Open this checkout in a browser with a wallet extension, then try again.",
    );
  }

  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const account = getAddress(accounts[0] ?? "");
  const chainIdHex = (await ethereum.request({ method: "eth_chainId" })) as string;
  const chainId = Number(chainIdHex);

  if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch {
      /* core maps a remaining mismatch to wrong_network */
    }
  }

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(ethereum),
  });

  return {
    address: account,
    getChainId: async () => {
      const hex = (await ethereum.request({ method: "eth_chainId" })) as string;
      return Number(hex);
    },
    sendTransaction: async ({ to, data }) => {
      return client.sendTransaction({
        account,
        chain: baseSepolia,
        to,
        data: data as Hex,
      });
    },
  };
}
