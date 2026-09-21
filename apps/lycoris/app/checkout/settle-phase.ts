"use client";
import { useSyncExternalStore } from "react";

/**
 * What the demo is doing inside the SDK's `settling` state.
 *
 * The SDK models a payment as prepare → settle → confirm, which is the right shape
 * for a payment and says nothing about how this host funds an account first. These
 * are the two real waits a visitor sits through, and they are worth naming because
 * they are the only visible evidence that a smart account is involved at all.
 *
 * Deliberately absent: a "deploying" phase. The account is counterfactual until its
 * first payment, and the deployment rides inside that same user operation rather
 * than happening before it. A separate step would look better and be a lie.
 */
export type SettlePhase = "funding" | "submitting" | undefined;

let phase: SettlePhase;
const listeners = new Set<() => void>();

export function setSettlePhase(next: SettlePhase) {
  if (phase === next) return;
  phase = next;
  for (const listener of listeners) listener();
}

export function useSettlePhase(): SettlePhase {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => phase,
    () => undefined,
  );
}

export const SETTLE_PHASE_LABEL: Record<NonNullable<SettlePhase>, string> = {
  funding: "Funding your demo account with test USDC…",
  submitting: "Your account is paying the merchant…",
};
