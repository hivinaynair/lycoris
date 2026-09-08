import { getSponsoredPurchase, sponsorChain } from "@/server/sponsored-checkout";
import { readSponsoredRequest } from "@/server/sponsored-request";
import { getMelbourneWeather } from "@/server/weather";
import { verifyWeatherPayment } from "@/server/weather-payment";

export async function POST(request: Request) {
  try {
    const id = await readSponsoredRequest(request);
    const purchase = await getSponsoredPurchase(id);
    if (!purchase?.tx_hash)
      return Response.json({ error: "Payment has not been submitted." }, { status: 403 });
    await verifyWeatherPayment(sponsorChain, {
      txHash: purchase.tx_hash,
      recipient: purchase.recipient,
      sponsoredPayer: purchase.sponsor,
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
