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
