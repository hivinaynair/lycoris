"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { VIEWER_ROLES, type ViewerRole } from "@/server/attestation-view";

const captions: Record<ViewerRole, string> = {
  public:
    "On-chain: a commitment and a time. The USDC transfer is still public — this hides the compliance book, not the payment.",
  auditor:
    "Granted view of the decision record. Phase 1 is a demo role (no viewing key). Phase 2 encrypts this to an x25519 key.",
  institution:
    "Full operational record, including the salt. Recompute the commitment to verify the chain event.",
};

const labels: Record<ViewerRole, string> = {
  public: "Public",
  auditor: "Auditor",
  institution: "Institution",
};

export function ViewerToggle() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWER_ROLES).withDefault("public").withOptions({ shallow: false }),
  );

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
        {VIEWER_ROLES.map((role) => (
          <Button
            key={role}
            variant="ghost"
            size="sm"
            onClick={() => void setView(role)}
            className={cn(
              "h-auto rounded-[2px] px-3 py-1.5 text-[12.5px] font-medium",
              view === role
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[role]}
          </Button>
        ))}
      </div>
      <p className="max-w-[620px] text-sm text-muted-foreground">{captions[view]}</p>
    </div>
  );
}
