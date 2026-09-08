import { paySponsored } from "@/server/sponsored-checkout";
import { readSponsoredRequest } from "@/server/sponsored-request";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let id: string;
  try {
    id = await readSponsoredRequest(request);
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  try {
    return Response.json(await paySponsored(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sponsored checkout failed", error instanceof Error ? error.message : "unknown");
    return Response.json(
      {
        error:
          "The sponsored payment is unavailable. Retry this purchase; you will not be charged twice.",
      },
      { status: 503 },
    );
  }
}
