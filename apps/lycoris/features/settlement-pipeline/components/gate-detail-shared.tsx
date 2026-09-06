"use client";

import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

export function GateDetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn("text-xs break-all", mono && "font-mono text-foreground/80")}>
        {value}
      </span>
    </div>
  );
}

export function GateDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

export function GateTxLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-primary hover:underline"
    >
      view on Basescan ↗
    </a>
  );
}
