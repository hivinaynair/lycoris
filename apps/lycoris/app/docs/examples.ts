export const localInstall = `# In the Lycoris repository
bun install
bun run pack:settle-kit

# Add the entries below to your host package.json, then run in the host:
bun install`;

export const localManifest = `{
  "dependencies": {
    "@settle-kit/core": "file:/path/to/lycoris/dist/settle-kit/core.tgz",
    "@settle-kit/react": "file:/path/to/lycoris/dist/settle-kit/react.tgz",
    "react": "^19.2.0",
    "viem": "^2"
  },
  "overrides": {
    "@settle-kit/core": "file:/path/to/lycoris/dist/settle-kit/core.tgz"
  }
}`;

export const reactCheckout = `"use client";

import { SettleProvider, type PaymentSigner } from "@settle-kit/react";
import { Checkout } from "@settle-kit/react/ui";
import "@settle-kit/react/styles.css";

export function Store({ getSigner }: {
  getSigner: () => Promise<PaymentSigner>;
}) {
  return (
    <SettleProvider config={{
      appName: "Your store",
      getSigner,
      destination: {
        targetChain: 84532,
        targetAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        recipient: "0x1111111111111111111111111111111111111111", // replace
      },
    }}>
      <Checkout amountUsdc="0.1" title="Weather report" />
    </SettleProvider>
  );
}`;

export const walletAdapter = `import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import type { PaymentSigner } from "@settle-kit/react";

// Pass the EIP-1193 provider supplied by your wallet connection UI.
export async function getSigner(provider: EIP1193Provider): Promise<PaymentSigner> {
  const wallet = createWalletClient({
    chain: baseSepolia,
    transport: custom(provider),
  });
  const [account] = await wallet.requestAddresses();
  if (!account) throw new Error("Connect a wallet first.");
  return {
    address: account,
    getChainId: () => wallet.getChainId(),
    sendTransaction: ({ to, data }) => wallet.sendTransaction({
      account, chain: baseSepolia, to, data,
    }),
  };
}`;

export const customCheckout = `"use client";
import { useCheckout } from "@settle-kit/react";

// Render inside the same SettleProvider.
export function BuyReport() {
  const { state, begin, pay, reset, retryConfirmation } = useCheckout();
  switch (state.status) {
    case "idle":
      return <button onClick={() => void begin({ amountUsdc: "0.1" })}>
        Buy report
      </button>;
    case "quoting":
      return <p>Preparing payment…</p>;
    case "awaiting_payment":
      return <button onClick={() => void pay()}>Pay {state.quote.amountUsdc} USDC</button>;
    case "settling":
      return state.confirmationError
        ? <button onClick={() => void retryConfirmation()}>Check payment status</button>
        : <p>Waiting for your wallet and confirmation…</p>;
    case "settled":
      return <><p>Payment confirmed.</p><button onClick={reset}>New purchase</button></>;
    case "failed":
      return <><p role="alert">{state.error.message}</p><button onClick={reset}>Reset</button></>;
  }
}`;

export const appearance = `<SettleProvider config={config} appearance={{
  theme: "inherit", // also "light" or "dark"
  variables: { borderRadius: "16px", controlBorderRadius: "8px" },
  elements: { primaryButton: "your-button-class" },
}}>
  <Checkout amountUsdc="0.1" labels={{ buy: "Review order" }} />
</SettleProvider>`;

export const paidFetch = `import { createPaidFetch, payForResource } from "@settle-kit/agents";

type Scheme = Parameters<typeof createPaidFetch>[0]["scheme"];

// Supply an x402 scheme backed by your agent's signer, and its signed mandate.
export async function buyReport(url: string, scheme: Scheme, mandateHeader: string) {
  const paidFetch = createPaidFetch({
    scheme,
    getMandateHeader: () => mandateHeader,
  });
  const result = await payForResource({ url, paidFetch });
  return result; // httpStatus, body, txHash, authorizationNonce, challenge
}`;

export const protectedApi = `// app/api/report/route.ts
import { withAgenticPayment } from "@settle-kit/server/next";

export const GET = withAgenticPayment(
  async () => Response.json({ report: "Your report data" }),
  {
    priceUsdc: "0.1",
    network: "eip155:84532",
    payTo: "0x1111111111111111111111111111111111111111", // replace
    facilitatorUrl: "https://your-facilitator.example.com", // replace
    description: "Weather report",
  },
);`;

export const headless = `import { createCheckout, createSettleConfig, type PaymentSigner } from "@settle-kit/core";

export function preparePayment(getSigner: () => Promise<PaymentSigner>) {
  const config = createSettleConfig({
    getSigner,
    destination: {
      targetChain: 84532,
      targetAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      recipient: "0x1111111111111111111111111111111111111111", // replace
    },
  });
  const checkout = createCheckout(config, { amountUsdc: "0.1" });
  return checkout;
}

// Subscribe to getState(), then await checkout.selectMethod("usdc").
// After the buyer confirms your review UI, await checkout.pay().
// Unsubscribe when the host view is disposed.`;
