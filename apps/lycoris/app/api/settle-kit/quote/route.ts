import { DEFAULT_QUOTE_TTL_MS, parseUsdcAmount } from "@settle-kit/core";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("amountUsdc" in body) ||
      typeof body.amountUsdc !== "string"
    ) {
      return Response.json({ error: "amountUsdc must be a string" }, { status: 400 });
    }
    const amountAtomic = parseUsdcAmount(body.amountUsdc);
    return Response.json({
      requestId: crypto.randomUUID(),
      amountUsdc: body.amountUsdc,
      amountAtomic,
      expiresAt: Date.now() + DEFAULT_QUOTE_TTL_MS,
      method: "usdc",
    });
  } catch {
    return Response.json(
      { error: "Provide a positive USDC amount with at most six decimal places" },
      { status: 400 },
    );
  }
}
