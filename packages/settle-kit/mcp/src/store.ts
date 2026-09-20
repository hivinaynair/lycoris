import { explorerUrl } from "@settle-kit/core";
import type { DecisionRecord } from "./facilitator.ts";
import type { Money } from "./money.ts";

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

/** Host-provided persistence for payment idempotency. */
export type PaymentStore = {
  get(payId: string): Promise<PaymentRecord | undefined>;
  put(payId: string, record: PaymentRecord): Promise<void>;
};

export { explorerUrl };

/** In-memory idempotency store. Completions are forgotten on process restart. */
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
