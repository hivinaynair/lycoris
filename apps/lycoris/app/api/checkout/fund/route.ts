import type { Hex } from "viem";
import { fundBurner } from "@/server/sponsored-checkout";
import { readFundRequest } from "@/server/sponsored-request";

export async function POST(request: Request) {
  let purchaseId: string;
  let payer: Hex;
  try {
    ({ purchaseId, payer } = await readFundRequest(request));
  } catch {
    return Response.json({ error: "Invalid funding request." }, { status: 400 });
  }
  try {
    return Response.json(await fundBurner(purchaseId, payer), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Burner funding failed", error instanceof Error ? error.message : "unknown");
    return Response.json(
      {
        error:
          "The sponsored payment is unavailable. Retry this purchase; you will not be charged twice.",
      },
      { status: 503 },
    );
  }
}
