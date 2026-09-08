"use client";
import { BASE_SEPOLIA_USDC_ADDRESS, createUsdcMethod } from "@settle-kit/core";
import { Checkout, SettleProvider, useCheckout } from "@settle-kit/react";
import { useMemo, useState } from "react";

function PurchaseButtons() {
  const { state, begin } = useCheckout();
  return (
    <div>
      <button
        type="button"
        disabled={state.status === "settling" || state.status === "quoting"}
        onClick={() => void begin({ amountUsdc: "12.50", title: "Hoodie" })}
      >
        Choose hoodie
      </button>
      <button
        type="button"
        disabled={state.status === "settling" || state.status === "quoting"}
        onClick={() => void begin({ amountUsdc: "4.00", title: "Patch" })}
      >
        Choose patch
      </button>
    </div>
  );
}
function Status() {
  const { state } = useCheckout();
  return <output data-testid="session-status">{state.status}</output>;
}
export default function Page() {
  const [sent, setSent] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const config = useMemo(
    () => ({
      appName: "Independent merchant",
      destination: {
        targetChain: 84532 as const,
        targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
        recipient: "0x1111111111111111111111111111111111111111" as const,
      },
      getSigner: async () => ({
        address: "0x2222222222222222222222222222222222222222" as const,
        getChainId: async () => 84532,
        sendTransaction: async () => {
          setSent((value) => value + 1);
          return `0x${"ab".repeat(32)}` as const;
        },
      }),
      methods: [
        createUsdcMethod({
          client: { readContract: async () => 100000000n },
          receiptClient: {
            waitForTransactionReceipt: async ({ hash }) => {
              setConfirmed((value) => value + 1);
              return { status: "success", transactionHash: hash };
            },
          },
        }),
      ],
    }),
    [],
  );
  return (
    <main>
      <h1>Independent merchant embed</h1>
      <p>Simulated wallet and receipts. No funds move.</p>
      <SettleProvider config={config}>
        <PurchaseButtons />
        <Checkout />
        <Status />
      </SettleProvider>
      <p>
        Submitted: <output data-testid="sent">{sent}</output> · Confirmed:{" "}
        <output data-testid="confirmed">{confirmed}</output>
      </p>
    </main>
  );
}
