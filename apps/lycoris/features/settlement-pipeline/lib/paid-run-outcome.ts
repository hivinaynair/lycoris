import type { RawMandate, X402Challenge } from "@repo/shared/types";
import type { HandleMessageStreamEvent } from "eve/client";

/** Exact tool output for the demo's paid fetch, read off `action.result`. */
export type PaidRunOutcome = {
  authorizationNonce?: string | undefined;
  body?: unknown;
  error?: string | undefined;
  httpStatus?: number | undefined;
  payer: string;
  rawMandate?: RawMandate | undefined;
  settlementTxHash?: string | undefined;
  x402Challenge?: X402Challenge | undefined;
};

function sameResource(a: string, b: string) {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

function unwrapToolOutput(output: unknown): Record<string, unknown> | undefined {
  if (!output || typeof output !== "object" || Array.isArray(output)) return undefined;
  const record = output as Record<string, unknown>;
  if (
    record.type === "json" &&
    record.value &&
    typeof record.value === "object" &&
    !Array.isArray(record.value)
  ) {
    return record.value as Record<string, unknown>;
  }
  return record;
}

function toolNameOf(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  if (typeof record.toolName === "string") return record.toolName;
  if (typeof record.name === "string") return record.name;
  return undefined;
}

/**
 * Pulls the demo's primary payment outcome out of a typed `action.result`
 * event. Financial fields are copied verbatim from the tool result rather than
 * from model text, so a hallucinated hash can never reach the UI.
 */
export function outcomeFromEvent(
  event: Extract<HandleMessageStreamEvent, { type: "action.result" }>,
  targetUrl: string,
  payerFallback: string,
): PaidRunOutcome | undefined {
  const name = toolNameOf(event.data.result);
  if (typeof name !== "string" || !name.includes("fetch_paid_resource")) return undefined;

  const result = event.data.result as { output?: unknown };
  const out = unwrapToolOutput(result.output) ?? {};

  const url = typeof out.url === "string" ? out.url : undefined;
  if (url && !sameResource(url, targetUrl)) return undefined;

  const denialReason =
    out.type === "denied" && typeof out.reason === "string" ? out.reason : undefined;
  const streamError =
    event.data.status === "rejected" || event.data.status === "failed"
      ? event.data.error?.message
      : undefined;
  const error =
    typeof out.error === "string"
      ? out.error
      : (denialReason ?? (typeof streamError === "string" ? streamError : undefined));

  return {
    authorizationNonce:
      typeof out.authorizationNonce === "string" ? out.authorizationNonce : undefined,
    body: out.body,
    error,
    httpStatus: typeof out.status === "number" ? out.status : error ? 402 : 200,
    payer: typeof out.payer === "string" ? out.payer : payerFallback,
    rawMandate: out.rawMandate as PaidRunOutcome["rawMandate"],
    settlementTxHash: typeof out.txHash === "string" ? out.txHash : undefined,
    x402Challenge: out.x402Challenge as PaidRunOutcome["x402Challenge"],
  };
}
