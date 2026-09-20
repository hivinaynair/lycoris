"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { VIEWER_ROLES, type ViewerRole } from "@/server/attestation-view";
import { SegmentedControl } from "./segmented-control";

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

export function ViewerToggle({ trailing }: { trailing?: ReactNode }) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWER_ROLES).withDefault("public").withOptions({ shallow: false }),
  );

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Viewer"
          value={view}
          onChange={(role) => void setView(role)}
          options={VIEWER_ROLES.map((role) => ({ id: role, label: labels[role] }))}
        />
        {trailing}
      </div>
      <p className="max-w-[620px] text-sm text-muted-foreground">{captions[view]}</p>
    </div>
  );
}
