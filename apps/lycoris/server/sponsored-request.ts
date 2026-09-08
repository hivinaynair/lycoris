import { z } from "zod";

const purchase = z.object({ purchaseId: z.string().uuid() }).strict();
export async function readSponsoredRequest(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Open checkout on this site to continue.");
  const parsed = purchase.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("Provide a valid purchase ID.");
  return parsed.data.purchaseId;
}
