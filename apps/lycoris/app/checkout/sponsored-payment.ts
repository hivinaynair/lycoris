"use client";
import { WEATHER_PRICE_USDC } from "@repo/shared/demo";
import {
  createUsdcMethod,
  type HexAddress,
  type SettleAdapter,
  SettleKitError,
} from "@settle-kit/core";

const storageKey = "lycoris-sponsored-purchase";
type StoredPurchase = { id: string; txHash?: string; confirmed?: boolean };
function readPurchase(): StoredPurchase | undefined {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}
export function sponsoredPurchaseId(txHash: string) {
  return localStorage.getItem(`${storageKey}:${txHash}`);
}
export function createSponsoredPayment(recipient: HexAddress) {
  const method = createUsdcMethod();
  const adapter: SettleAdapter = {
    ...method,
    async quote(input) {
      let purchase = readPurchase();
      if (!purchase || purchase.confirmed) {
        purchase = { id: crypto.randomUUID() };
        localStorage.setItem(storageKey, JSON.stringify(purchase));
      }
      if (input.amountUsdc !== WEATHER_PRICE_USDC || input.destination?.recipient !== recipient)
        throw new SettleKitError("invalid_config", "Only the demo weather report is sponsored.");
      const quote = await method.quote(input);
      return { ...quote, requestId: purchase.id };
    },
    async settle({ quote }) {
      const response = await fetch("/api/checkout/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: quote.requestId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit payment.");
      localStorage.setItem(
        storageKey,
        JSON.stringify({ id: quote.requestId, txHash: result.txHash }),
      );
      localStorage.setItem(`${storageKey}:${result.txHash}`, quote.requestId);
      return result.txHash;
    },
    async confirm(input) {
      const result = await method.confirm(input);
      const purchase = readPurchase();
      if (purchase?.txHash === input.txHash) {
        localStorage.setItem(storageKey, JSON.stringify({ ...purchase, confirmed: true }));
      }
      return result;
    },
  };
  return {
    methods: [adapter],
    getSigner: async () => ({
      address: recipient,
      sendTransaction: async (): Promise<`0x${string}`> => {
        throw new Error("Payments are submitted by the sponsor service.");
      },
    }),
  };
}
