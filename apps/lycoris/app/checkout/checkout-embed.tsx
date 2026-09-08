"use client";

import { Button } from "@repo/ui/components/button";
import { ArrowDown, ChevronDown, Code2, Copy } from "lucide-react";
import { useState } from "react";
import { appearances, type Look } from "./checkout-appearance";
import styles from "./checkout-layouts";
import { IntegrationCode } from "./integration-code";

export function CheckoutEmbed({ look }: { look: Look }) {
  const code =
    look === "custom"
      ? `import { useCheckout } from "@settle-kit/react";\n\n// Your components. The same payment lifecycle.\nconst { state, payNow, isBusy } = useCheckout();\n\n// Call from your Pay button.\nawait payNow({ amountUsdc: "0.1" });\n// State narrows on state.status.`
      : `import { SettleProvider } from "@settle-kit/react";\nimport { Checkout } from "@settle-kit/react/ui";\nimport "@settle-kit/react/styles.css";\n\n<SettleProvider\n  config={{ appName: "Melbourne weather", destination, getSigner }}\n  appearance={${JSON.stringify(appearances[look], null, 2)}}\n>\n  <Checkout amountUsdc="0.1" title="Melbourne weather report" skipReview />\n</SettleProvider>`;
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
            {look === "custom" ? "Bring your own UI" : "The embed"}
          </h2>
          <CopyCode key={look} code={code} />
        </div>
        <IntegrationCode code={code} />
        <p className="border-t border-border px-5 py-4 text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
          This example uses your own wallet signer. The live demo instead uses a server-sponsored
          adapter with a fixed price and spending cap.{" "}
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
