import { WEATHER_AMOUNT_ATOMIC, WEATHER_PRICE_USDC } from "@repo/shared/demo";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  DEFAULT_QUOTE_TTL_MS,
  type HexAddress,
  parseUsdcAmount,
} from "@settle-kit/core";
import { env } from "@/env";

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
    if (amountAtomic !== WEATHER_AMOUNT_ATOMIC)
      return Response.json({ error: "This report costs 0.1 USDC." }, { status: 400 });
    return Response.json({
      requestId: crypto.randomUUID(),
      amountUsdc: WEATHER_PRICE_USDC,
      amountAtomic,
      expiresAt: Date.now() + DEFAULT_QUOTE_TTL_MS,
      method: "usdc",
      destination: {
        targetChain: BASE_SEPOLIA_CHAIN_ID,
        targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
        recipient: env.PAY_TO_ADDRESS as HexAddress,
      },
    });
  } catch {
    return Response.json(
      { error: "Provide a positive USDC amount with at most six decimal places" },
      { status: 400 },
    );
  }
}
