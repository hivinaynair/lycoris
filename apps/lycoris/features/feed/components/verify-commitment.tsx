"use client";

import { committedRecordFrom, verifyCommitment } from "@repo/shared/commitment";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";

export function VerifyCommitment({
  paymentHash,
  payer,
  amountUsdc,
  mandateMaxAmountUsdc,
  identityStatus,
  decision,
  rejectionReason,
  salt,
  commitment,
}: {
  paymentHash: string;
  payer: string;
  amountUsdc: bigint;
  mandateMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason?: string | undefined;
  salt: string | null;
  commitment: string | null;
}) {
  const [matches, setMatches] = useState<boolean | null>(null);
  const disabled = commitment === null || salt === null;

  function onVerify() {
    if (!commitment || !salt) return;
    setMatches(
      verifyCommitment(
        committedRecordFrom({
          paymentHash,
          payer,
          amountUsdc,
          mandateMaxAmountUsdc,
          identityStatus,
          decision,
          rejectionReason,
        }),
        salt as `0x${string}`,
        commitment,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled}
        onClick={onVerify}
      >
        Verify commitment
      </Button>
      {disabled ? (
        <p className="text-xs text-muted-foreground">Legacy row — no commitment to verify.</p>
      ) : matches === true ? (
        <p className="text-xs text-success">matches chain commitment</p>
      ) : matches === false ? (
        <p className="text-xs text-destructive">mismatch</p>
      ) : null}
    </div>
  );
}
