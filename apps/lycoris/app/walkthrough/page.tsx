import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHead } from "@/components/page-chrome";
import { DEMO_TOUR } from "@/lib/demo-tour";

export const metadata: Metadata = {
  title: "A quick tour · Lycoris",
  description:
    "Follow a person and an AI agent buying the same paid API, then inspect a refused purchase and its evidence.",
};

export default function WalkthroughPage() {
  return (
    <PageFrame className="pt-8 sm:pt-12">
      <PageHead
        eyebrow="Start here · A 90-second overview"
        title="One report. Two ways to pay."
        question="Lycoris is a working demo of Settle Kit, the TypeScript SDK I built for USDC checkout and paid agent requests. Weather is the small, tangible example of a paid API."
      />
      <div className="flex flex-wrap items-center gap-5">
        <Link
          href={DEMO_TOUR[0].href}
          className="inline-flex bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Start with checkout →
        </Link>
        <Link href="/case-study" className="text-sm underline underline-offset-4">
          Read the engineering case study
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Live runs use Base Sepolia test USDC and can take longer than the overview while the network
        confirms. Checkout defaults to a sponsored demo wallet; you can also pay from Coinbase
        Wallet or another injected EOA. Each purchase spends 0.1 test USDC.
      </p>
      <ol className="grid gap-px border border-border bg-border md:grid-cols-2">
        {DEMO_TOUR.map((step, index) => (
          <li key={step.href} className="flex flex-col gap-4 bg-background p-6 sm:p-8">
            <p className="font-mono text-sm text-muted-foreground">0{index + 1}</p>
            <h2 className="text-2xl font-medium tracking-tight">{step.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            <p className="text-sm leading-relaxed">
              <span className="font-medium">Look for: </span>
              {step.evidence}
            </p>
            <Link
              href={step.href}
              className="mt-auto pt-2 text-sm font-medium underline underline-offset-4"
            >
              {step.action} →
            </Link>
          </li>
        ))}
      </ol>
      <section
        className="space-y-5 border border-border p-5 sm:p-6"
        aria-labelledby="overview-heading"
      >
        <h2 id="overview-heading" className="font-medium">
          Watch the narrated overview · 90 seconds
        </h2>
        <div className="max-w-5xl space-y-3">
          <video
            className="aspect-[8/5] w-full border border-border"
            controls
            preload="none"
            poster="/walkthrough/poster.png"
            aria-label="Lycoris narrated screen overview"
          >
            <source src="/walkthrough/overview.mp4" type="video/mp4" />
            <track
              kind="captions"
              src="/walkthrough/overview.vtt"
              srcLang="en"
              label="English"
              default
            />
            <a href="/walkthrough/overview.mp4">Download the narrated overview</a>
          </video>
          <p className="text-sm text-muted-foreground">
            Edited screens from the local build, showing live Base Sepolia test runs. Synthetic
            narration with captions. This is a screen overview, not a real-time recording or speed
            benchmark.
          </p>
          <a
            href="/walkthrough/overview.vtt"
            className="inline-block text-sm underline underline-offset-4"
          >
            Read the transcript
          </a>
        </div>
      </section>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        If a live service is unavailable or the sponsor budget is exhausted, use the existing
        records in the{" "}
        <Link href="/feed?view=auditor" className="underline underline-offset-4">
          decision feed
        </Link>{" "}
        to inspect previous attempts. Historical evidence is separate from a new live run.
      </p>
    </PageFrame>
  );
}
