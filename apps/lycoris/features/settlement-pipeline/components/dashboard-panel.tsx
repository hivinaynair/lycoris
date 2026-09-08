import { ScrollArea } from "@repo/ui/components/scroll-area";
import type { ReactNode } from "react";

export function DashboardPanel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-0">
      <div className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="ml-auto">{action}</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">{children}</div>
      </ScrollArea>
    </section>
  );
}
