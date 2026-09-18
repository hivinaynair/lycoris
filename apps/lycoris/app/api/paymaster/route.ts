import type { HexAddress } from "@settle-kit/core";
import { env } from "@/env";
import { checkProxyRequest, demoSponsorshipPolicy } from "@/server/paymaster-proxy";
import { sameOrigin } from "@/server/sponsored-request";

/**
 * The browser's only route to the bundler and the paymaster.
 *
 * CDP serves both from one endpoint whose path segment is the API key, so this is a
 * proxy rather than a convenience: shipping that URL to the client would hand every
 * visitor the gas budget. Every request is checked against the sponsorship policy
 * before it is forwarded, which is what makes the burner key in `localStorage`
 * worth nothing to whoever steals it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    sameOrigin(request);
    body = await request.json();
  } catch {
    return Response.json({ error: "Open checkout on this site to continue." }, { status: 400 });
  }

  if (!env.CDP_PAYMASTER_URL)
    return Response.json({ error: "Sponsored checkout is not configured." }, { status: 503 });

  const verdict = checkProxyRequest(body, demoSponsorshipPolicy(env.PAY_TO_ADDRESS as HexAddress));
  if (!verdict.ok) {
    console.error("Paymaster refused a request:", verdict.reason);
    // A JSON-RPC error rather than an HTTP status: viem surfaces it to the caller
    // as a failed operation instead of an opaque transport failure.
    const id = (body as { id?: unknown })?.id ?? null;
    return Response.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Not sponsored: ${verdict.reason}` },
    });
  }

  const upstream = await fetch(env.CDP_PAYMASTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
