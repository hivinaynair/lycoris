import type { Address } from "@settle-kit/core";
import { env } from "@/env";
import { sponsorChain } from "@/server/sponsored-checkout";
import { readWalletReportRequest } from "@/server/sponsored-request";
import { getMelbourneWeather } from "@/server/weather";
import { verifyTransferWeatherPayment } from "@/server/weather-transfer-payment";

export async function POST(request: Request) {
  try {
    const { txHash } = await readWalletReportRequest(request);
    await verifyTransferWeatherPayment(sponsorChain, {
      txHash,
      recipient: env.PAY_TO_ADDRESS as Address,
    });
    return Response.json(await getMelbourneWeather("public"), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Unable to load your report. Retry without paying again." },
      { status: 503 },
    );
  }
}
