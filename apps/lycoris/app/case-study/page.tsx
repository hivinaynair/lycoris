import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHead } from "@/components/page-chrome";

export const metadata: Metadata = {
  title: "Engineering USDC checkout for people and agents · Lycoris",
  description:
    "Vinay Nair’s engineering case study: checkout state, constrained agent spending, smart-account receipts, and the limits of a testnet payment demo.",
};

const decisions = [
  {
    title: "An uncertain payment stays pending",
    text: "A timeout cannot tell a buyer whether money moved. Once the SDK has a submitted hash, it retains that payment and offers another receipt lookup. It refuses a new payment or reset while settlement is unresolved. The core session is in memory; the sponsored host separately persists purchase IDs and hashes for recovery.",
    source: "packages/settle-kit/core/src/checkout-safety.test.ts",
    label: "Read the payment safety tests",
  },
  {
    title: "Confirm the operation that actually paid",
    text: "A smart-account operation can revert inside a successful bundle transaction. The demo confirms the operation’s own success, then the report endpoint independently checks its sender and the USDC transfer’s token, merchant, amount, and age. A unique operation claim prevents reusing one payment for another purchase.",
    source: "apps/lycoris/server/weather-userop-payment.ts",
    label: "Read the report verification",
  },
  {
    title: "Payment authority belongs to the host",
    text: "The agent can request a report, but its authenticated session determines the wallet and allowed resource. A signed mandate binds the payer, merchant, per-payment ceiling, and expiry. Preclear can refuse a purchase before signing; the facilitator checks permission again at verification and settlement. Identity proves a registry binding, not KYC.",
    source: "apps/agent/agent/tools/fetch_paid_resource.ts",
    label: "Read the agent payment tool",
  },
] as const;

export default function CaseStudyPage() {
  return (
    <PageFrame className="pt-8 sm:pt-12">
      <PageHead
        eyebrow="Engineering case study · Vinay Nair"
        title="Making a payment useful to an application."
        question="I built Lycoris to explore what it takes for a person or an AI agent to buy a paid API response with USDC: permission, confirmation, delivery, and evidence."
      />
      <div className="flex flex-wrap gap-5 text-sm">
        <Link href="/walkthrough" className="font-medium underline underline-offset-4">
          Take the guided tour →
        </Link>
        <a
          href="https://github.com/hivinaynair/lycoris/blob/main/docs/case-study.md"
          className="underline underline-offset-4"
        >
          Full write-up and code references ↗
        </a>
      </div>
      <article className="max-w-3xl space-y-10 text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-2xl font-medium tracking-tight">A deliberately small product</h2>
          <p className="text-muted-foreground">
            Both paths buy Melbourne’s next 1 PM forecast for 0.1 test USDC. Weather makes the
            delivery visible; it stands in for any read-only paid API. A sponsored smart account
            removes signup, funding, and wallet setup from the visitor’s first experience.
          </p>
          <p className="text-muted-foreground">
            Settle Kit is the reusable TypeScript SDK; Lycoris is its host application. The live
            demo runs on Base Sepolia. It is an independent engineering project with no claim of
            production payment volume.
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight">What I built</h2>
          <p className="text-muted-foreground">
            I built the checkout state machine, React integration and replaceable UI, agent and
            paid-route adapters, facilitator policy checks, sponsored checkout, decision records,
            and this demo. The packages separate wallet access, payment state, rendering, and agent
            tooling so a host can adopt the part it needs.
          </p>
          <div className="space-y-4 border-l-2 border-primary pl-5 text-sm">
            <p>
              <strong>Person:</strong> React checkout → funded smart account → USDC transfer →
              verified operation receipt → report.
            </p>
            <p>
              <strong>Agent:</strong> paid API request → HTTP 402 → permission preclear → signed
              retry → facilitator verification and settlement → report and decision evidence.
            </p>
          </div>
          <p className="text-muted-foreground">
            Coinbase CDP supplies wallet, bundler, and paymaster services; viem supplies chain and
            account primitives; x402 supplies the payment protocol; Eve runs the agent; Neon and
            Drizzle store records; Open-Meteo supplies the forecast. My work connects those building
            blocks and defines the application’s behavior around them.
          </p>
        </section>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium tracking-tight">Three decisions that shaped it</h2>
          {decisions.map((decision, index) => (
            <div key={decision.title} className="space-y-3">
              <h3 className="text-lg font-medium">
                {index + 1}. {decision.title}
              </h3>
              <p className="text-muted-foreground">{decision.text}</p>
              <a
                href={`https://github.com/hivinaynair/lycoris/blob/main/${decision.source}`}
                className="text-sm underline underline-offset-4"
              >
                {decision.label} ↗
              </a>
            </div>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-medium tracking-tight">How I check the work</h2>
          <p className="text-muted-foreground">
            Bun tests exercise payment states, refusal paths, quote validation, sponsorship policy,
            and receipt verification. CI also packs the SDK and installs it in a separate Next.js
            consumer. Browser fixtures use mocked payment services; live testnet runs provide
            separate integration evidence. The decision feed lets a reviewer inspect recorded
            attempts.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-medium tracking-tight">Where the demo ends</h2>
          <p className="text-muted-foreground">
            One testnet confirmation is the demo’s release threshold. Production would need durable
            reconciliation, reorg and replacement handling, stronger abuse controls, operational
            monitoring, and a funding policy. The mandate ceiling applies per payment; it is not an
            aggregate spending budget. The feed’s viewer roles demonstrate disclosure shapes, not
            authenticated access control.
          </p>
          <p className="text-muted-foreground">
            The paid handler runs after verification but before settlement, so it must remain
            read-only or independently idempotent. The SDK is experimental, not published to npm,
            and carries no granted open-source license. Those limits are part of the design scope.
          </p>
        </section>
      </article>
      <Link href="/walkthrough" className="text-sm font-medium underline underline-offset-4">
        See those decisions in the demo →
      </Link>
    </PageFrame>
  );
}
