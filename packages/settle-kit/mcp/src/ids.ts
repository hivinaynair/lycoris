import { createHash } from "node:crypto";

export type PaymentEvent = {
  agent: string;
  resource: string;
  amountAtomic: string;
  quoteNonce: string;
};

function digest(parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 32);
}

/** Stable payment id for an agent, resource, amount, and quote nonce. */
export function derivePaymentId(event: PaymentEvent): string {
  return `pay_${digest([
    event.agent.toLowerCase(),
    event.resource,
    event.amountAtomic,
    event.quoteNonce,
  ])}`;
}

export function quoteNonceFor(input: {
  amountAtomic: string;
  payTo?: string | undefined;
  url: string;
}): string {
  return digest([input.amountAtomic, input.payTo ?? "", input.url]);
}
