import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import type { DecisionRecord } from "./facilitator";
import type { Money } from "./money";

export type PaymentRecord = {
  payId: string;
  url: string;
  amount: Money;
  settled: boolean;
  status: "settled" | "failed";
  settlementHash?: string;
  explorer?: string;
  authorizationNonce?: string;
  decisionRecord?: DecisionRecord;
  reason?: string;
  gate?: string;
};

export type PaymentStore = {
  get(payId: string): Promise<PaymentRecord | undefined>;
  put(payId: string, record: PaymentRecord): Promise<void>;
};

export function explorerUrl(hash?: string): string | undefined {
  return hash ? `${BASE_SEPOLIA_EXPLORER}/tx/${hash}` : undefined;
}

export function createMemoryStore(): PaymentStore {
  const records = new Map<string, PaymentRecord>();
  return {
    async get(payId) {
      return records.get(payId);
    },
    async put(payId, record) {
      const existing = records.get(payId);
      if (existing?.settled) {
        throw new Error(`completed payment ${payId} cannot be overwritten`);
      }
      records.set(payId, record);
    },
  };
}
