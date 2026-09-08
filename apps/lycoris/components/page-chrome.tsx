import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn("mx-auto w-full max-w-8xl flex-1 px-6 pt-14 pb-16 sm:px-7 sm:pt-24", className)}
    >
      <div className="flex w-full flex-col gap-8">{children}</div>
    </main>
  );
}

export function PageHead({
  eyebrow,
  title,
  question,
  right,
}: {
  eyebrow: string;
  title: string;
  question?: string;
  right?: ReactNode;
}) {
  return (
    <div className="grid items-end gap-6 pb-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <div className="max-w-3xl">
        <p className="font-sans text-micro tracking-[0.16em] uppercase in-[.demo-type]:text-meta in-[.demo-type]:tracking-[0.12em] text-muted-foreground">
          {eyebrow}
        </p>
        {title ? (
          <h1 className="text-display leading-[1.04] tracking-[-0.03em] font-medium mt-5">
            {title}
          </h1>
        ) : null}
      </div>
      <div className="space-y-5">
        {question ? (
          <p className="text-lead leading-[1.6] max-w-[480px] text-muted-foreground">{question}</p>
        ) : null}
        {right}
      </div>
    </div>
  );
}
