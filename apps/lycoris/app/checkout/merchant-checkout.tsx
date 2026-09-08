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
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useCheckout } from "@settle-kit/react";

// Copyable merchant recipe: presentation belongs to the host; payment logic stays in the SDK.
export function MerchantCheckout({
  amountUsdc,
  title,
  simulated = false,
}: {
  amountUsdc: string;
  title: string;
  simulated?: boolean;
}) {
  const { state, begin, pay, reset, retryConfirmation, canPay, isBusy } = useCheckout();
  const txHash = "txHash" in state ? state.txHash : undefined;
  return (
    <Card className="rounded-none border border-border shadow-sm">
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
        <div role="status" aria-live="polite" className="space-y-2">
          {state.status === "idle" && (
            <>
              <p className="font-heading text-4xl tracking-tight">{amountUsdc} USDC</p>
              <p className="text-muted-foreground">
                Base Sepolia. You’ll need a browser wallet with test USDC and Base Sepolia ETH for
                network fees.
              </p>
            </>
          )}
          {state.status === "quoting" && <p>Preparing your USDC payment…</p>}
          {state.status === "awaiting_payment" && (
            <>
              <p className="font-heading text-4xl tracking-tight">{state.quote.amountUsdc} USDC</p>
              <details className="rounded-none border border-border p-3 text-xs">
                <summary className="cursor-pointer font-medium">Payment details</summary>
                <p className="mt-3 break-all text-muted-foreground">
                  Recipient: {state.destination.recipient}
                </p>
                <p className="mt-2 text-muted-foreground">
                  Network fees are paid separately in test ETH. Your wallet shows the fee before
                  confirmation.
                </p>
              </details>
            </>
          )}
          {state.status === "settling" && (
            <p>
              {state.txHash
                ? "Payment submitted. Waiting for confirmation…"
                : "Continue in your wallet…"}
            </p>
          )}
          {state.status === "settled" && (
            <p className="rounded-none border border-border bg-muted p-4">
              Payment confirmed: {state.quote.amountUsdc} USDC.
            </p>
          )}
        </div>
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
        {txHash && !simulated && (
          <a
            className="block break-all text-muted-foreground underline underline-offset-4"
            href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}
        {state.status === "idle" && (
          <Button
            className="h-11 w-full rounded-none"
            disabled={isBusy}
            onClick={() => void begin({ amountUsdc, title })}
          >
            Buy
          </Button>
        )}
        {canPay && (
          <Button className="h-11 w-full rounded-none" onClick={() => void pay()}>
            Pay {state.status === "awaiting_payment" ? state.quote.amountUsdc : amountUsdc} USDC
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
