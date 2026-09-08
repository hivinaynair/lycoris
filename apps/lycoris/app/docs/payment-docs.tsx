import { CodeExample } from "./code-example";
import { DocsSection, DocsTable } from "./docs-section";
import * as examples from "./examples";

export function PaymentDocs() {
  return (
    <>
      <LifecycleSection />
      <CoreSection />
      <AgentsSection />
      <ServerSection />
      <LimitsSection />
    </>
  );
}

function LifecycleSection() {
  return (
    <DocsSection id="lifecycle" title="Understand the payment state">
      <DocsTable
        headers={["State", "Meaning"]}
        rows={[
          ["idle", "No active purchase. Show the product and Buy action."],
          ["quoting", "Locking the amount and validating the quote."],
          ["awaiting_payment", "The quote is ready. Let the buyer review and confirm."],
          [
            "settling",
            "Wallet interaction or receipt lookup is in progress. A transaction hash alone does not mean success.",
          ],
          ["settled", "A successful receipt was observed. onSettled fires here."],
          ["failed", "A known failure. Show the error; retain a transaction link if one exists."],
        ]}
      />
      <p>
        A receipt timeout stays in settling with confirmationError. Show “Check payment status” and
        call retryConfirmation. Do not reset or resend. User errors such as insufficient_usdc,
        wallet_rejected, and wrong_network are state data; invalid host configuration throws.
      </p>
    </DocsSection>
  );
}

function CoreSection() {
  return (
    <DocsSection id="core" title="Use the headless engine">
      <p>
        Core works without React. Subscribe to the manager, render from getState(), and call the
        payment actions from your host UI. Unlike React’s begin, the core API requires
        selectMethod("usdc") before pay().
      </p>
      <CodeExample title="payment.ts" code={examples.headless} language="typescript" />
    </DocsSection>
  );
}

function AgentsSection() {
  return (
    <DocsSection id="agents" title="Let an agent buy a resource">
      <p>
        The agents package wraps x402: request a resource, receive HTTP 402, sign the payment, and
        retry. Supply an x402 scheme backed by your signer and, when required, a signed AP2 mandate
        header.
      </p>
      <CodeExample title="buy-resource.ts" code={examples.paidFetch} language="typescript" />
      <p className="text-muted-foreground">
        The host owns its URL allowlist, signer, credentials, and optional preclear. The package
        also exports quoteResource, signMandate, serializeMandateHeader, and verifyMandateLocal.
        Payment metadata belongs to each response, so concurrent requests do not share a
        last-payment record.
      </p>
    </DocsSection>
  );
}

function ServerSection() {
  return (
    <DocsSection id="server" title="Require payment for an API">
      <p>
        Use the server package in a Next.js App Router route. Choose a facilitator that enforces
        identity, mandate, spending limits, and balance checks. The wrapper forwards the mandate; it
        does not validate authorization locally.
      </p>
      <CodeExample
        title="app/api/report/route.ts"
        code={examples.protectedApi}
        language="typescript"
      />
      <p className="text-muted-foreground">
        Your handler runs after verification but before settlement. Keep it read-only or
        independently idempotent. The wrapper releases the resource after settlement; it cannot undo
        work the handler already performed. Responses are private and not cacheable.
      </p>
    </DocsSection>
  );
}

function LimitsSection() {
  return (
    <DocsSection id="limits" title="Know the demo boundaries">
      <ul className="list-disc space-y-3 pl-5 text-muted-foreground">
        <li>
          Base Sepolia (84532), Circle test USDC only. No mainnet, cards, swaps, bridges, or fiat
          onramp.
        </li>
        <li>
          Sessions live in memory. After a reload or an interrupted payment, inspect the wallet and
          explorer before paying again.
        </li>
        <li>
          Balance preflight is not a lock. One confirmation is demo evidence; replacement
          transactions require manual inspection.
        </li>
        <li>
          The playground starts in simulation. Its sample report and simulated receipts do not prove
          an onchain payment.
        </li>
        <li>
          The SDK is not published to npm. Local tarballs and an independent consumer are the
          distribution proof for this demo.
        </li>
      </ul>
    </DocsSection>
  );
}
