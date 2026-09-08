"use client";

import { Button } from "@repo/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { type CodeLanguage, HighlightedCode } from "@/components/highlighted-code";

export function CodeExample({
  title,
  code,
  language = "tsx",
}: {
  title: string;
  code: string;
  language?: CodeLanguage;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <div className="min-w-0 overflow-hidden border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="font-mono text-xs text-muted-foreground">{title}</p>
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label={`Copy ${title}`}>
          {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {status === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      <section
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll code examples.
        tabIndex={0}
        aria-label={title}
        className="overflow-x-auto p-4 text-xs leading-6 sm:p-5 sm:text-sm"
      >
        <HighlightedCode code={code} language={language} />
      </section>
      <p
        role="status"
        className={status === "failed" ? "px-4 pb-3 text-sm text-destructive" : "sr-only"}
      >
        {status === "failed"
          ? "Clipboard unavailable. Select and copy the code above."
          : status === "copied"
            ? "Code copied."
            : ""}
      </p>
    </div>
  );
}
