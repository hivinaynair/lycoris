import { HighlightedCode } from "@/components/highlighted-code";

export function IntegrationCode({ code }: { code: string }) {
  return (
    <section
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the code horizontally.
      tabIndex={0}
      aria-label="Integration code"
      className="overflow-x-auto p-5 text-[length:var(--font-small-size)] leading-7 text-muted-foreground"
    >
      <HighlightedCode code={code} />
    </section>
  );
}
