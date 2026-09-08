import { cn } from "@repo/ui/lib/utils";

export function PacketPanel({
  amount,
  from,
  mandate,
  completedAt,
}: {
  amount: string;
  from: string;
  mandate: string;
  completedAt?: string;
}) {
  const createdLabel = completedAt
    ? new Date(completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "after run";

  const rows = [
    ["Amount", `${amount.replace("$", "")} USDC`],
    ["From", from],
    ["To", "configured payTo"],
    ["Mandate", mandate],
    ["Created", createdLabel],
  ];

  return (
    <div className="grid">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between gap-4 py-3 text-sm",
            index < rows.length - 1 && "border-b border-border",
          )}
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 wrap-anywhere text-right font-mono text-foreground">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
