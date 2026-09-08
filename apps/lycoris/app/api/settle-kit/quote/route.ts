import { DEFAULT_QUOTE_TTL_MS, parseUsdcAmount } from "@settle-kit/core";

export async function POST(request: Request) {
  const body = (await request.json()) as { amountUsdc?: string };
  if (!body.amountUsdc) {
    return Response.json({ error: "amountUsdc is required" }, { status: 400 });
  }

  const amountAtomic = parseUsdcAmount(body.amountUsdc);
  return Response.json({
    requestId: crypto.randomUUID(),
    amountUsdc: body.amountUsdc,
    amountAtomic,
    expiresAt: Date.now() + DEFAULT_QUOTE_TTL_MS,
    method: "usdc",
  });
}
