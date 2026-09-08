import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { z } from "zod";
import { env } from "@/env";
import { getMelbourneWeather } from "@/server/weather";
import { InvalidWeatherPayment, verifyWeatherPayment } from "@/server/weather-payment";

const proof = z.object({
  txHash: z.templateLiteral(["0x", z.string()]).refine((value) => /^0x[\da-f]{64}$/i.test(value)),
  signature: z
    .templateLiteral(["0x", z.string()])
    .refine((value) => /^0x[\da-f]{130}$/i.test(value)),
});
const client = createPublicClient({ chain: baseSepolia, transport: http() });

export async function POST(request: Request) {
  const parsed = proof.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Provide a payment hash and wallet signature." },
      { status: 400 },
    );
  try {
    await verifyWeatherPayment(client, {
      ...parsed.data,
      recipient: env.PAY_TO_ADDRESS as `0x${string}`,
    });
    const report = await getMelbourneWeather("public");
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof InvalidWeatherPayment
            ? error.message
            : "Unable to verify payment or load weather. Retry access without paying again.",
      },
      {
        status: error instanceof InvalidWeatherPayment ? 403 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
