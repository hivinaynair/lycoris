"use client";

import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUpRight, Asterisk } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="site-frame mx-auto min-h-svh w-[96%] max-w-[1524px] border-x border-border bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-7">
          <Link
            href="/checkout"
            className="flex items-center gap-2 text-lg font-medium tracking-tight"
            aria-label="Lycoris home"
          >
            <Asterisk aria-hidden="true" className="size-7" />
            Lycoris
            <span className="ml-1 border border-border px-2 py-0.5 text-[10px] font-normal tracking-wide text-muted-foreground">
              SETTLE KIT
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
            {[
              ["/checkout", "Playground"],
              ["/demo", "Agent demo"],
              ["/feed", "Feed"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href ?? "/checkout"}
                prefetch={false}
                aria-current={pathname === href ? "page" : undefined}
                className={cn(
                  "ui-nav-link transition-colors hover:text-foreground",
                  pathname === href ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </Link>
            ))}
            <ThemeToggle />
            <a
              href="https://github.com/hivinaynair/lycoris"
              className="hidden items-center gap-1 bg-primary px-4 py-2 text-primary-foreground sm:flex"
            >
              Source
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          </nav>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-border px-5 py-6 text-xs text-muted-foreground sm:px-7">
        <p>Built by Vinay Nair · An independent SDK exploration</p>
        <p>Base Sepolia only. Test USDC. No mainnet payments.</p>
      </footer>
    </div>
  );
}
