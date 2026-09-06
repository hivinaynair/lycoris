export async function readLivePipelineGate(facilitatorUrl: string, payer: string, sinceMs: number) {
  const response = await fetch(
    `${facilitatorUrl.replace(/\/+$/, "")}/pipeline/progress?payer=${encodeURIComponent(payer)}&since=${sinceMs}`,
  ).catch(() => undefined);
  if (!response?.ok) return 0;
  const body = (await response.json().catch(() => undefined)) as { gate?: unknown };
  return typeof body?.gate === "number" ? body.gate : 0;
}
