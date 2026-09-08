# @settle-kit/agents

Paid `fetch` + AP2 mandate helpers. Depends on `@settle-kit/core`, not on React.

x402 is: request URL → **402** → sign → retry with a payment header. This package wraps that. It does not pretend agent pay is a Checkout method. The agent pays the **x402 resource payee**, not the merchant `destination.recipient`.

```ts
import { createPaidFetch, payForResource, quoteResource } from "@settle-kit/agents";

const paidFetch = createPaidFetch({ scheme, getMandateHeader: () => credential.header });
const quote = await quoteResource(url);
await payForResource({ url, paidFetch });
```

Mandate: `signMandate` / `serializeMandateHeader` / `verifyMandateLocal`. EIP-712 domain `AP2Mandate` on chain `84532` — same as the Lycoris facilitator. Optional `X-AP2-Mandate` header. Not KYC.

Stay in the host app: Eve, URL allowlist, credential DB, preclear, gate UI.

## Fetch compatibility and request metadata

`createPaidFetch` preserves the incoming Request's method, body, headers and signal,
including normal `RequestInit` overrides, then adds `X-AP2-Mandate`. Metadata is
isolated per request, including x402 retries. For raw fetch usage:

```ts
const response = await paidFetch(url);
const metadata = paidFetch.getPaymentMetadata(response);
// metadata?.authorizationNonce / metadata?.challenge
```

`payForResource` uses the same response-scoped metadata automatically. There are no
shared `lastAuthorizationNonce` or `lastChallenge` fields; concurrent or later free
requests cannot inherit another request's payment details. Query metadata on the
original response, before making a clone if one is needed.

Distribution: compiled ESM and declarations, with a Bun source entry point.
Run `bun run build` before packing (also run by `prepack`).
