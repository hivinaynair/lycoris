import { getDecisionRecord } from "@repo/shared/facilitator";
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Read the facilitator decision record for a payer after a payment attempt. Use this to report the canonical identity, mandate, and attestation outcome.",
  inputSchema: z.object({
    payer: z.string().describe("Agent wallet address"),
    authorizationNonce: z.string().optional(),
    settlementTxHash: z.string().optional(),
  }),
  async execute({ payer, authorizationNonce, settlementTxHash }) {
    const decisionRecord = await getDecisionRecord({
      facilitatorUrl: process.env.FACILITATOR_URL,
      payer,
      authorizationNonce,
      settlementTxHash,
    });
    return decisionRecord ?? { error: "decision_record_not_found", payer };
  },
});
