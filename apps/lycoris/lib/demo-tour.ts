export const DEMO_TOUR = [
  {
    title: "Buy a report",
    href: "/checkout?tour=1",
    action: "Try checkout",
    description:
      "Click Pay to unlock Melbourne’s weather report for 0.1 test USDC. Default rail: the demo supplies funds and gas. Switch to Your wallet to pay from Coinbase Wallet or another injected EOA.",
    evidence: "A confirmed payment, a transaction link, and the purchased report.",
  },
  {
    title: "Let an agent buy it",
    href: "/demo?scenario=0&tour=1",
    action: "Try the agent",
    description:
      "Choose Get me the report. The agent requests the paid API, signs the payment, and buys the same report over x402.",
    evidence: "The request, payment terms, facilitator checks, and settlement in one trace.",
  },
  {
    title: "See a purchase refused",
    href: "/demo?scenario=1&tour=1",
    action: "Try the spending limit",
    description:
      "Request the report with the spending-limit scenario. This agent’s mandate cannot cover the price, so the facilitator refuses the payment when it verifies.",
    evidence: "A spending-limit refusal from verification, and no settled purchase.",
  },
  {
    title: "Inspect the evidence",
    href: "/feed?view=auditor&tour=1",
    action: "Open the decision feed",
    description:
      "Open a decision to inspect its recorded checks. Compare approved and blocked attempts, then inspect the available on-chain proof.",
    evidence:
      "Readable decision records and commitment verification. Viewer roles are a demo, not access control.",
  },
] as const;
