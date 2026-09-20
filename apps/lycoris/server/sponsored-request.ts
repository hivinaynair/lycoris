import type { Hex } from "viem";
import { z } from "zod";

export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Open checkout on this site to continue.");
}

const purchase = z.object({ purchaseId: z.string().uuid() }).strict();
export async function readSponsoredRequest(request: Request) {
  sameOrigin(request);
  const parsed = purchase.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("Provide a valid purchase ID.");
  return parsed.data.purchaseId;
}

// Funding names the burner to pay, so it cannot go through the strict
// purchase-ID shape above. The address is all the caller may choose: the amount
// and the merchant still come from the server's configuration.
const funding = z
  .object({ purchaseId: z.string().uuid(), payer: z.string().regex(/^0x[0-9a-fA-F]{40}$/) })
  .strict();
export async function readFundRequest(request: Request) {
  sameOrigin(request);
  const parsed = funding.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("Provide a valid purchase ID and payer address.");
  return { purchaseId: parsed.data.purchaseId, payer: parsed.data.payer as Hex };
}

// Releasing the report names the operation that paid for it. The hash is all the
// caller may choose: the payer it must have been sent by was recorded server-side
// at funding time, and the amount and merchant come from configuration.
const report = z
  .object({ purchaseId: z.string().uuid(), userOpHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) })
  .strict();
export async function readReportRequest(request: Request) {
  sameOrigin(request);
  const parsed = report.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("Provide a valid purchase ID and operation hash.");
  return { purchaseId: parsed.data.purchaseId, userOpHash: parsed.data.userOpHash as Hex };
}

const walletReport = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }).strict();
export async function readWalletReportRequest(request: Request) {
  sameOrigin(request);
  const parsed = walletReport.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new Error("Provide a valid transaction hash.");
  return { txHash: parsed.data.txHash as Hex };
}
