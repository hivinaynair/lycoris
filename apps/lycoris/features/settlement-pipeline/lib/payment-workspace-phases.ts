// Reserve the full wire envelope, including preflight above and receipts below.
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
    "Lycoris first calls the facilitator’s /preclear endpoint. It checks the agent’s registered identity and mandate before signing.",
  ],
  [
    "Check permission to spend.",
    "The mandate must authorize this purchase. Preflight can stop the agent early; the facilitator enforces these checks again on the API’s payment request.",
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
