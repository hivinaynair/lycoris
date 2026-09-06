"use client";

import { cn } from "@repo/ui/lib/utils";
import { Activity, Bot, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Demo", sub: "The live rail", icon: Zap },
  { href: "/feed", label: "Feed", sub: "Flight recorder", icon: Activity },
  { href: "/agents", label: "Agents", sub: "Identity + mandates", icon: Bot },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-[244px] shrink-0 flex-col overflow-hidden border-r border-border bg-card lg:flex">
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo-mark-light.svg"
              alt="Lycoris"
              width={28}
              height={28}
              className="size-7 shrink-0"
              priority
            />
            <span className="font-heading text-[21px] leading-none tracking-tight">Lycoris</span>
          </Link>
          <p className="mt-3.5 font-heading text-[15px] leading-tight text-muted-foreground">
            Compliance before
            <br />
            settlement, not after.
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-[11px] rounded-md px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-primary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-[17px] shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.sub}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="status-dot-live size-2.5 rounded-full" />
            Live · Base Sepolia
          </p>
          <p className="mt-2.5 text-[11px] leading-normal text-muted-foreground">
            A settlement-layer compliance demo for tokenized, agent-native payments.
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
          <Link href="/" className="font-heading text-xl tracking-tight">
            Lycoris
          </Link>
          <nav className="ml-auto flex items-center gap-4 overflow-x-auto text-xs text-muted-foreground">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("whitespace-nowrap", active && "font-medium text-foreground")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
