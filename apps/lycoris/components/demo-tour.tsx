"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DEMO_TOUR } from "@/lib/demo-tour";

export function DemoTour() {
  const pathname = usePathname();
  const search = useSearchParams();
  if (search.get("tour") !== "1") return null;
  const index =
    pathname === "/checkout"
      ? 0
      : pathname === "/demo"
        ? search.get("scenario") === "1"
          ? 2
          : 1
        : pathname === "/feed"
          ? 3
          : -1;
  if (index === -1) return null;
  const step = DEMO_TOUR[index];
  if (!step) return null;
  const next = DEMO_TOUR[index + 1];
  const exit = new URLSearchParams(search.toString());
  exit.delete("tour");
  const exitHref = `${pathname}${exit.size ? `?${exit}` : ""}`;

  return (
    <aside
      aria-label="Guided walkthrough"
      className="border-b border-border bg-muted/40 px-6 py-4 sm:px-7"
    >
      <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl space-y-1">
          <p className="text-sm font-medium">
            Step {index + 1} of 4 · {step.title}
          </p>
          <p className="text-sm text-muted-foreground">{step.evidence}</p>
        </div>
        <nav
          aria-label="Walkthrough navigation"
          className="flex flex-wrap items-center gap-4 text-sm"
        >
          <Link href="/walkthrough" className="underline underline-offset-4">
            All steps
          </Link>
          <Link
            href={next?.href ?? "/case-study"}
            className="font-medium underline underline-offset-4"
          >
            {next ? `Next: ${next.title} →` : "Read the engineering case study →"}
          </Link>
          <Link href={exitHref} className="text-muted-foreground underline underline-offset-4">
            Exit tour
          </Link>
        </nav>
      </div>
    </aside>
  );
}
