import { createUsdcMethod, type PaymentSigner } from "@settle-kit/core";

export type Scenario = "success" | "rejected" | "insufficient" | "delayed";
export const scenarios: { value: Scenario; label: string; description: string }[] = [
  {
    value: "success",
    label: "Successful payment",
    description: "Balance checked, transfer submitted, receipt confirmed.",
  },
  {
    value: "rejected",
    label: "Wallet rejection",
    description: "The buyer declines. No transfer is submitted.",
  },
  {
    value: "insufficient",
    label: "Insufficient USDC",
    description: "Balance preflight stops the payment before a signature.",
  },
  {
    value: "delayed",
    label: "Delayed confirmation",
    description: "Keep the transaction hash. Check its status without paying again.",
  },
];
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const hash = `0x${"ab".repeat(32)}` as const;
const buyer = "0x2222222222222222222222222222222222222222" as const;

// Host-only simulation. It never connects to a wallet, RPC endpoint or quote API.
// The real SDK still runs balance preflight, encoding and receipt handling.
export function createSimulation(scenario: Scenario, onSend: () => void) {
  let receiptAttempts = 0;
  const getSigner = async (): Promise<PaymentSigner> => ({
    address: buyer,
    getChainId: async () => 84532,
    sendTransaction: async () => {
      await delay(600);
      if (scenario === "rejected")
        throw { code: 4001, message: "Buyer declined the simulated wallet request" };
      receiptAttempts = 0;
      onSend();
      return hash;
    },
  });
  const method = createUsdcMethod({
    client: {
      readContract: async () => {
        await delay(200);
        return scenario === "insufficient" ? 0n : 100000000n;
      },
    },
    receiptClient: {
      waitForTransactionReceipt: async () => {
        await delay(900);
        if (scenario === "delayed" && receiptAttempts++ === 0)
          throw new Error("Simulated receipt delay");
        return { status: "success", transactionHash: hash };
      },
    },
  });
  return { getSigner, methods: [method] };
}
