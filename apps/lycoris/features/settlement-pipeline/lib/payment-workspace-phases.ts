// Reserve the full wire envelope, including the request above and receipts below.
export const DIAGRAM_BOUNDS = { y: 28, height: 376 };

export const phases = [
  [
    "Lycoris requests a weather report.",
    "The agents SDK requests the resource. The Weather API uses our server SDK to require payment.",
  ],
  [
    "The API asks for payment.",
    "The Weather API returns HTTP 402 with the USDC price and recipient. x402 is the protocol, not a separate service.",
  ],
  [
    "Check the agent’s identity.",
    "The Weather API sends the signed payment to the facilitator. Verify checks that an ERC-8004 registration matches this payer.",
  ],
  [
    "Check permission to spend.",
    "The same verify and settle path checks the mandate: payer, merchant, ceiling, and expiry. The agent does not make a separate permission call.",
  ],
  [
    "Send USDC to the weather provider.",
    "Lycoris retries the Weather API with a payment signature and mandate. The API calls the facilitator to verify and settle USDC from agent to merchant.",
  ],
  [
    "Save evidence of the decision.",
    "The facilitator confirms settlement and records decision evidence. The API receives the payment receipt.",
  ],
  [
    "Lycoris receives the weather report.",
    "Only after successful settlement does the Weather API return the report and receipt. Lycoris uses the report to answer you.",
  ],
] as const;
