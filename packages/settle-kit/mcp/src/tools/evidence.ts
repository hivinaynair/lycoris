import { jsonError, jsonResult } from "../result";
import type { PaymentStore } from "../store";

export async function getPaymentStatus(payId: string, store: PaymentStore) {
  const record = await store.get(payId);
  if (!record) return jsonError("payment_not_found", { payId, reason: "payment_not_found" });
  return jsonResult({
    payId: record.payId,
    status: record.status,
    settled: record.settled,
    settlementHash: record.settlementHash,
    explorer: record.explorer,
    amount: record.amount,
    url: record.url,
    reason: record.reason,
    gate: record.gate,
  });
}

export async function getDecisionRecordTool(payId: string, store: PaymentStore) {
  const record = await store.get(payId);
  if (!record) return jsonError("payment_not_found", { payId, reason: "payment_not_found" });
  return jsonResult({
    payId: record.payId,
    decisionRecord: record.decisionRecord,
    gate: record.decisionRecord?.failureGate ?? record.gate,
    reason: record.decisionRecord?.rejectionReason ?? record.reason,
    settled: record.settled,
  });
}
