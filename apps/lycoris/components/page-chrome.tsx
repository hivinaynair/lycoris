import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("w-full flex-1 px-6 pt-8 pb-16", className)}>
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
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        {title ? (
          <h1 className="mt-2 font-heading text-[32px] leading-tight tracking-[-0.02em]">
            {title}
          </h1>
        ) : null}
        {question ? (
          <p className="mt-2.5 max-w-[620px] text-[13px] leading-normal text-muted-foreground">
            {question}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}
