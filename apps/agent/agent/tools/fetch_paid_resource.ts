import { BASE_SEPOLIA_CAIP2 } from "@repo/shared/chains";
import { createPaidFetch, payForResource, quoteResource } from "@settle-kit/agents";
import { ExactEvmScheme } from "@x402/evm";
import { defineState } from "eve/context";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getCdp } from "../lib/cdp.js";
import { getAp2CredentialForAgent } from "../lib/credentials.js";
import { paymentScope } from "../lib/payment-scope.js";
import { getDecisionRecord, preclearPayment, toRawMandate } from "../lib/preclear.js";

const attempt = defineState("lycoris.payment-attempt", () => ({ turnId: "" }));

const denied = (reason: string) => ({ type: "denied" as const, reason });

export default defineTool({
  description:
    "Buy Melbourne’s next 1 PM weather report for 0.1 test USDC using the configured wallet. " +
    "If identity or the mandate refuses the payment, it is never signed.",
  inputSchema: z.object({}),
  approval: async (ctx) => {
    const { agentName, url } = paymentScope(
      ctx.session.auth.current?.attributes.paymentAgent,
      process.env.APP_URL,
    );
    if (attempt.get().turnId === ctx.session.turn.id)
      return denied("payment_already_attempted_this_turn");
    attempt.update(() => ({ turnId: ctx.session.turn.id }));

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
  async execute(_input, ctx) {
    const { agentName, url } = paymentScope(
      ctx.session.auth.current?.attributes.paymentAgent,
      process.env.APP_URL,
    );
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
