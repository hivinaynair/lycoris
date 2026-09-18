import { http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import { env } from "@/env";
import { claimUserOpHash, getSponsoredPurchase, sponsorChain } from "@/server/sponsored-checkout";
import { readReportRequest } from "@/server/sponsored-request";
import { getMelbourneWeather } from "@/server/weather";
import { verifyUserOpWeatherPayment } from "@/server/weather-userop-payment";

export async function POST(request: Request) {
  try {
    const { purchaseId, userOpHash } = await readReportRequest(request);
    const purchase = await getSponsoredPurchase(purchaseId);
    if (!purchase?.payer)
      return Response.json({ error: "Payment has not been submitted." }, { status: 403 });
    if (!env.CDP_PAYMASTER_URL)
      return Response.json({ error: "Sponsored checkout is not configured." }, { status: 503 });

    // The hash names an operation; the payer says whose it must be. That address
    // was written down when we funded the burner, so the caller cannot choose it.
    const bundler = createBundlerClient({
      chain: baseSepolia,
      transport: http(env.CDP_PAYMASTER_URL),
    });
    await verifyUserOpWeatherPayment(
      { bundler, chain: sponsorChain },
      { userOpHash, payer: purchase.payer, recipient: purchase.recipient },
    );
    await claimUserOpHash(purchaseId, userOpHash);

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
