"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import type { GateRawData, TraceStep } from "@/lib/trace-steps";
import { GateContent } from "./gate-detail-views";

const GATE_TITLES: Record<GateRawData["gate"], string> = {
  agent: "Agent Identity",
  x402: "x402 Challenge",
  erc8004: "ERC-8004 Identity",
  ap2: "AP2 Mandate",
  settlement: "Settlement",
  attestation: "Attestation",
};

export function GateDetailSheet({
  step,
  onClose,
}: {
  step: TraceStep | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!step?.rawData} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        {step?.rawData && (
          <>
            <SheetHeader className="mb-6 p-0 pr-14">
              <SheetTitle>{GATE_TITLES[step.rawData.gate]}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {step.label} gate · {step.status}
              </p>
            </SheetHeader>
            <GateContent rawData={step.rawData} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
