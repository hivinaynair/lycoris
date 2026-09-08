# @settle-kit/server

Let AI agents pay for your API with `withAgenticPayment`.

```ts
// app/api/weather/route.ts
import { withAgenticPayment } from "@settle-kit/server/next";
import { env } from "@/env";
import { getWeather } from "@/server/weather";

export const GET = withAgenticPayment(
  async () => Response.json(await getWeather()),
  {
    priceUsdc: "0.10",
    network: "eip155:84532",
    payTo: env.PAY_TO_ADDRESS,
    facilitatorUrl: env.FACILITATOR_URL,
    description: "Weather forecast",
  },
);
```

This first release supports Next.js App Router (16.2.6+ within 16.x) and exact
USDC payments on Base Sepolia. Prices are positive decimal strings with at most
six decimal places. The USDC asset is fixed; the merchant never selects a token
or constructs payment headers. Dynamic route context is passed to your handler.

## Request flow

1. An unpaid request receives HTTP 402 and `PAYMENT-REQUIRED` payment terms.
2. The buyer retries the same API with `PAYMENT-SIGNATURE` and `X-AP2-Mandate`.
3. The wrapper forwards the mandate to the configured facilitator's `/verify`.
4. After verification, your handler prepares the resource. A handler error response
   (status 400+) does not trigger settlement.
5. The wrapper calls `/settle`, forwarding the same request's mandate. Only after
   successful settlement does it release the resource with `PAYMENT-RESPONSE`.

Use a facilitator that enforces ERC-8004 identity, AP2 signature and spending
permission, and USDC balance checks, such as this repository's facilitator.
**The wrapper forwards mandates; it does not validate them locally.** A generic
x402 facilitator is not a substitute for these agent authorization policies.
Each incoming request has its own facilitator client, keeping buyers' mandates
isolated. Responses use `Cache-Control: private, no-store`.

The wrapper builds on `@x402/next` and `@x402/evm`; it does not implement its own
payment protocol. Funds move from the buyer to `payTo`, not into facilitator custody.
Keep resource handlers read-only or independently idempotent: they run after
verification but before settlement. A failed settlement withholds the resource,
but cannot undo work the handler already performed. Transport failure can leave
settlement uncertain; do not automatically retry a purchase without reconciling it.

## The two SDKs

- `@settle-kit/agents` is for the buyer: discover terms, sign, and retry paid fetches.
- `@settle-kit/server/next` is for the provider: require payment and coordinate verification and settlement.

Lycoris's Eve tool additionally calls the facilitator's `/preclear` before signing.
That optional preflight is an early identity/mandate check, not a payment or balance
guarantee. The current tool quotes once before preflight, then paid fetch encounters
another 402 before signing. The facilitator enforces the checks again when the
API forwards the payment. The animation condenses those repeated challenges.

The package ships ESM and declarations, is not published, and contains no demo
allowlists, application environment imports, Eve dependency, or database code.
Tests run real x402 middleware with intercepted facilitator HTTP; they do not
transfer funds or prove onchain settlement.
