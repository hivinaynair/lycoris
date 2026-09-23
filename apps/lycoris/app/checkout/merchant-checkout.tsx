"use client";

import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import type { CheckoutState } from "@settle-kit/core";
import { useCheckout } from "@settle-kit/react";
import { SETTLE_PHASE_LABEL, type SettlePhase, useSettlePhase } from "./settle-phase";
import { useSettlementExplorerUrl } from "./user-op-explorer";

// Copyable merchant recipe: presentation belongs to the host; payment logic stays in the SDK.
export function MerchantCheckout({
  amount,
  title,
  sponsored = false,
}: {
  amount: string;
  title: string;
  sponsored?: boolean;
}) {
  const { state, pay, reset, retryConfirmation } = useCheckout();
  const txHash = "txHash" in state ? state.txHash : undefined;
  const settlementUrl = useSettlementExplorerUrl();
  return (
    <Card className="w-full rounded-none border border-border shadow-sm">
      <CardHeader>
        <CardDescription>Melbourne weather · test checkout</CardDescription>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-none border border-border p-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-muted text-xl"
          >
            $
          </span>
          <div>
            <p className="font-medium">USDC</p>
            <p className="text-muted-foreground">Base Sepolia · test network</p>
          </div>
        </div>
        <MerchantPaymentStatus state={state} amount={amount} sponsored={sponsored} />
        {state.status === "failed" && (
          <Alert className="rounded-none" variant="destructive">
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
        )}
        {state.status === "settling" && state.confirmationError && (
          <>
            <Alert className="rounded-none">
              <AlertDescription>{state.confirmationError.message}</AlertDescription>
            </Alert>
            <Button onClick={() => void retryConfirmation()}>Check payment status</Button>
          </>
        )}
        {txHash && settlementUrl(txHash) && (
          <a
            className="block break-all text-muted-foreground underline underline-offset-4"
            href={settlementUrl(txHash)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}
        {state.status === "idle" && (
          <Button className="h-11 w-full rounded-none" onClick={() => void pay({ amount, title })}>
            Pay {amount} USDC
          </Button>
        )}
        {(state.status === "failed" || state.status === "settled") && (
          <Button variant="outline" className="h-11 w-full rounded-none" onClick={reset}>
            {state.status === "settled" ? "New purchase" : "Reset"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MerchantPaymentStatus({
  state,
  amount,
  sponsored,
}: {
  state: CheckoutState;
  amount: string;
  sponsored: boolean;
}) {
  const phase = useSettlePhase();
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      {state.status === "idle" && (
        <>
          <p className="font-heading text-4xl tracking-tight">{amount} USDC</p>
          <p className="text-muted-foreground">{idleCopy(sponsored)}</p>
        </>
      )}
      {state.status === "settling" && <p>{settlingCopy(state.txHash, sponsored, phase)}</p>}
      {state.status === "settled" && (
        <p className="rounded-none border border-border bg-muted p-4">
          Payment confirmed: {state.intent.amount} USDC.
        </p>
      )}
    </div>
  );
}

function idleCopy(sponsored: boolean) {
  if (sponsored) {
    return "We cover this payment and network fees. Just click Pay.";
  }
  return "You’ll need a browser wallet with test USDC and Base Sepolia ETH for network fees.";
}

function settlingCopy(txHash: string | undefined, sponsored: boolean, phase: SettlePhase) {
  if (txHash) {
    return "Payment submitted. Waiting for confirmation…";
  }
  // A sponsored payment now runs two visible waits before submission:
  // topping up the visitor's smart account, then the account paying.
  // Naming them is the only place 4337 is legible to someone watching.
  if (sponsored && phase) {
    return SETTLE_PHASE_LABEL[phase];
  }
  if (sponsored) {
    return "Sending your sponsored payment…";
  }
  return "Continue in your wallet…";
}
