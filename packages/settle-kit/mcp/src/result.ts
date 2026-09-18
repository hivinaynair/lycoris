import { failureGateForReason } from "./facilitator";

export function jsonResult(data: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: asObject(data),
    ...(isError ? { isError: true as const } : {}),
  };
}

export function jsonError(code: string, extra: Record<string, unknown> = {}) {
  const reason = typeof extra.reason === "string" ? extra.reason : undefined;
  return jsonResult(
    {
      code,
      ...extra,
      ...(reason && extra.gate === undefined ? { gate: failureGateForReason(reason) } : {}),
    },
    true,
  );
}

function asObject(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}
