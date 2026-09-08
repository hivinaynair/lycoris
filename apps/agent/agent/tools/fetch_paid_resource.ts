import { BASE_SEPOLIA_CAIP2 } from "@repo/shared/chains";
import { DemoAgentName } from "@repo/shared/types";
import { createPaidFetch, payForResource, quoteResource } from "@settle-kit/agents";
import { ExactEvmScheme } from "@x402/evm";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getCdp } from "../lib/cdp.js";
import { getAp2CredentialForAgent } from "../lib/credentials.js";
import { getDecisionRecord, preclearPayment, toRawMandate } from "../lib/preclear.js";
import { isAllowedPaymentUrl } from "../lib/run-request.js";

const denied = (reason: string) => ({ type: "denied" as const, reason });

export default defineTool({
  description:
    "Quote, preclear, then pay an allowlisted x402 resource with a named Lycoris agent wallet. " +
    "If identity or the mandate refuses the payment, it is never signed.",
  inputSchema: z.object({
    agentName: z.enum([
      DemoAgentName.AGENT_1,
      DemoAgentName.AGENT_2,
      DemoAgentName.AGENT_3,
      DemoAgentName.GHOST,
    ]),
    url: z.string().url().describe("Allowlisted x402 URL to fetch"),
  }),
  approval: async ({ toolInput }) => {
    const url = toolInput?.url;
    const agentName = toolInput?.agentName;
    const appUrl = process.env.APP_URL;
    if (typeof url !== "string" || typeof agentName !== "string") {
      return denied("agentName and url are required");
    }
    if (!appUrl) return denied("APP_URL is not configured");
    if (!isAllowedPaymentUrl(url, appUrl)) {
      return denied("url is not an allowlisted Lycoris or external x402 resource");
    }

    const cdp = await getCdp();
    const account = await cdp.evm.getOrCreateAccount({ name: agentName });
    const credential = getAp2CredentialForAgent(account.address);
    if (!credential) return denied("mandate_missing");

    let quoted: Awaited<ReturnType<typeof quoteResource>>;
    try {
      quoted = await quoteResource(url);
    } catch (err) {
      return denied(`Could not quote ${url}: ${(err as Error).message}`);
    }
    if (!quoted) return denied(`${url} is not an x402-gated resource`);

    const verdict = await preclearPayment({
      amountAtomic: BigInt(quoted.amountAtomic),
      mandateHeader: credential.header,
      payer: account.address,
      resource: url,
    });
    if (!verdict.ok) return denied(verdict.reason);
    return "not-applicable";
  },
  async execute({ agentName, url }) {
    const cdp = await getCdp();
    const account = await cdp.evm.getOrCreateAccount({ name: agentName });
    const credential = getAp2CredentialForAgent(account.address);
    if (!credential) {
      return { settled: false, url, error: "mandate_missing", payer: account.address };
    }

    const paidFetch = createPaidFetch({
      scheme: {
        network: BASE_SEPOLIA_CAIP2,
        client: new ExactEvmScheme(account as never),
      },
      getMandateHeader: () => credential.header,
    });
    const paid = await payForResource({ url, paidFetch });
    const error =
      paid.paymentRequiredError ??
      (paid.httpStatus >= 400 && paid.body && typeof paid.body === "object" && "error" in paid.body
        ? String((paid.body as { error?: unknown }).error)
        : undefined);

    const decisionRecord = await getDecisionRecord({
      authorizationNonce: paid.authorizationNonce,
      payer: account.address,
      settlementTxHash: paid.txHash,
    });

    return {
      settled: Boolean(paid.txHash && paid.httpStatus < 400 && !decisionRecord?.rejectionReason),
      url,
      payer: account.address,
      status: paid.httpStatus,
      body: paid.body,
      txHash: paid.txHash,
      authorizationNonce: paid.authorizationNonce,
      x402Challenge: paid.challenge,
      error: error ?? decisionRecord?.rejectionReason,
      decisionRecord,
      rawMandate: toRawMandate(credential.entry),
    };
  },
});
