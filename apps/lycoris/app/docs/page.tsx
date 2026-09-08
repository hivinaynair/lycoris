import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/page-chrome";
import { CheckoutDocs } from "./checkout-docs";
import { CodeExample } from "./code-example";
import { DocsSection, DocsTable } from "./docs-section";
import { localInstall, localManifest } from "./examples";
import { PaymentDocs } from "./payment-docs";

export const metadata: Metadata = {
  title: "Settle Kit docs · Lycoris",
  description: "Integrate USDC checkout, agent payments, and paid APIs with Settle Kit.",
};

const sections = [
  ["start", "Get started"],
  ["react", "React checkout"],
  ["wallet", "Wallet adapter"],
  ["custom-ui", "Custom UI"],
  ["appearance", "Appearance"],
  ["lifecycle", "Payment lifecycle"],
  ["core", "Headless core"],
  ["agents", "Agent payments"],
  ["server", "Paid APIs"],
  ["limits", "Demo limits"],
] as const;

export default function DocsPage() {
  return (
    <PageFrame className="pt-10 sm:pt-14">
      <div className="grid min-w-0 gap-10 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-16">
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Documentation
          </p>
          <nav
            aria-label="Documentation sections"
            className="flex flex-wrap gap-x-5 gap-y-3 lg:flex-col"
          >
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="https://github.com/hivinaynair/lycoris/tree/main/packages/settle-kit"
            className="mt-6 inline-block text-sm underline underline-offset-4"
          >
            Package source ↗
          </a>
        </aside>
        <article className="min-w-0 max-w-4xl space-y-12 leading-7">
          <header className="space-y-5">
            <span className="inline-block border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
              DEMO SDK · BASE SEPOLIA
            </span>
            <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
              Payments, in your app.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Give your checkout a USDC payment flow. Give your agent a way to buy a resource. Keep
              your wallet, your UI, and your application logic.
            </p>
            <Link
              href="/checkout"
              className="inline-flex min-h-11 items-center bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Try the playground →
            </Link>
          </header>
          <DocsSection id="start" title="Get started">
            <p>
              You can explore the demo without installing anything. To embed the SDK in another app,
              build local tarballs and install them there. The packages are not on npm; publishing
              is optional for this demo.
            </p>
            <CodeExample title="Build and install" code={localInstall} language="bash" />
            <CodeExample title="Host package.json entries" code={localManifest} language="json" />
            <p className="text-muted-foreground">
              Replace /path/to/lycoris with the absolute repository path. The core override keeps
              transitive dependencies local while the packages are unpublished. For agents or
              server, add the corresponding agents.tgz or server.tgz dependency with the same core
              override.
            </p>
            <p className="text-muted-foreground">
              Use React 19 and viem 2 for checkout. The server adapter supports Next.js 16.2.6+
              within 16.x. Build and pack with Bun; the resulting ESM packages can be consumed by
              other package managers.
            </p>
            <DocsTable
              headers={["Package", "Use it for"]}
              rows={[
                [
                  "@settle-kit/core",
                  "Headless sessions, amount validation, balance preflight, transfer and receipt confirmation.",
                ],
                [
                  "@settle-kit/react",
                  "Provider, hooks, and optional Checkout UI with compiled styles.",
                ],
                ["@settle-kit/agents", "x402 paid fetch and AP2 mandate helpers."],
                [
                  "@settle-kit/server/next",
                  "Paid Next.js API routes with request-scoped mandate forwarding.",
                ],
              ]}
            />
          </DocsSection>
          <CheckoutDocs />
          <PaymentDocs />
        </article>
      </div>
    </PageFrame>
  );
}
