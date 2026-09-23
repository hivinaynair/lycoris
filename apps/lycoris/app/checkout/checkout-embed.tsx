"use client";

import { Button } from "@repo/ui/components/button";
import { ArrowDown, ChevronDown, Code2, Copy } from "lucide-react";
import { useState } from "react";
import { appearances, type Look } from "./checkout-appearance";
import styles from "./checkout-layouts";
import type { CheckoutRail } from "./checkout-rail";
import { IntegrationCode } from "./integration-code";

const LOOKS = ["default", "light", "brand", "custom"] as const satisfies readonly Look[];

function embedCode(look: Look, rail: CheckoutRail) {
  if (look === "custom") {
    return `import { useCheckout } from "@settle-kit/react";\n\n// Your components. The same payment lifecycle.\nconst { state, pay } = useCheckout();\n\n// Call from your Pay button.\nawait pay({ amount: "0.1" });\n// State narrows on state.status.`;
  }
  const appearance = JSON.stringify(appearances[look], null, 2);
  return rail === "wallet"
    ? `import { SettleProvider } from "@settle-kit/react";\nimport { Checkout } from "@settle-kit/react/ui";\nimport "@settle-kit/react/styles.css";\n\n<SettleProvider\n  config={{ appName: "Melbourne weather", destination, getSigner }}\n  appearance={${appearance}}\n>\n  <Checkout amount="0.1" title="Melbourne weather report" />\n</SettleProvider>`
    : `import { SettleProvider } from "@settle-kit/react";\nimport { Checkout } from "@settle-kit/react/ui";\nimport "@settle-kit/react/styles.css";\n\n<SettleProvider\n  config={{ appName: "Melbourne weather", destination, ...createSponsoredPayment(recipient) }}\n  appearance={${appearance}}\n>\n  <Checkout amount="0.1" title="Melbourne weather report" />\n</SettleProvider>`;
}

export function CheckoutEmbed({ look, rail }: { look: Look; rail: CheckoutRail }) {
  const code = embedCode(look, rail);
  return (
    <details className={styles.disclosure} open>
      <summary className={styles.summary}>
        <span className="flex items-center gap-3">
          <Code2 className="size-4" aria-hidden="true" />
          Add checkout to your app
        </span>
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <section className={styles.code} aria-labelledby="embed-heading">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="embed-heading" className="flex items-center gap-2 text-sm font-medium">
            <Code2 className="size-4" aria-hidden="true" />
            {look === "custom"
              ? "Bring your own UI"
              : rail === "wallet"
                ? "Your wallet"
                : "Sponsored 4337"}
          </h2>
          <CopyCode key={`${look}:${rail}`} code={code} />
        </div>
        <div className="grid">
          {LOOKS.map((value) => {
            const active = value === look;
            return (
              <div
                key={value}
                className={active ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"}
                inert={active ? undefined : true}
                aria-hidden={active ? undefined : true}
              >
                <IntegrationCode code={embedCode(value, rail)} />
              </div>
            );
          })}
        </div>
        <p className="border-t border-border px-5 py-4 text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
          {rail === "wallet"
            ? "This matches the live Your wallet rail: getSigner is a Coinbase Wallet or other injected EOA. pay({ amount }) is unchanged."
            : "This matches the live Demo pays rail: the host wraps createUsdcMethod for a faucet and a userOp receipt. pay({ amount }) is unchanged."}{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="https://github.com/hivinaynair/lycoris/tree/main/packages/settle-kit/react"
          >
            Read the integration guide{" "}
            <ArrowDown aria-hidden="true" className="inline size-3 -rotate-135" />
          </a>
        </p>
      </section>
    </details>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-none"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      <Copy aria-hidden="true" className="size-3.5" />
      {copied ? "Copied" : "Copy code"}
    </Button>
  );
}
