"use client";

import { Button } from "@repo/ui/components/button";
import { useCheckout } from "@settle-kit/react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { Look } from "./checkout-appearance";
import styles from "./checkout-layouts";

type ControlsProps = { look: Look; setLook: (value: Look) => void };
export function CheckoutControls({ look, setLook }: ControlsProps) {
  const checkout = useCheckout();
  return (
    <details className={styles.disclosure}>
      <summary className={styles.summary}>
        <span className="flex items-center gap-3">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Customize this demo
        </span>
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <aside className={styles.controls} aria-label="Playground controls">
        <AppearanceControls look={look} setLook={setLook} />
      </aside>
      <div className="flex flex-wrap justify-between gap-2 border-t border-border px-6 py-4 text-[length:var(--font-small-size)] text-muted-foreground">
        <span>
          state: <output data-testid="checkout-state">{checkout.state.status}</output>
        </span>
      </div>
    </details>
  );
}

function AppearanceControls({ look, setLook }: Pick<ControlsProps, "look" | "setLook">) {
  return (
    <fieldset className={styles.appearance} aria-label="Checkout appearance">
      <legend className="mb-3 text-[length:var(--font-small-size)] font-medium text-foreground">
        Appearance
      </legend>
      {(
        [
          ["default", "Default SDK"],
          ["light", "Light"],
          ["brand", "Merchant theme"],
          ["custom", "Merchant UI"],
        ] as const
      ).map(([value, label]) => (
        <Button
          key={value}
          variant="ghost"
          className="h-10 w-full justify-between rounded-none border border-border"
          aria-pressed={look === value}
          onClick={() => {
            setLook(value);
          }}
        >
          {label}
          {look === value && <Check className="size-4" aria-hidden="true" />}
        </Button>
      ))}
      <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
        Change the look mid-payment. The session stays intact.
      </p>
    </fieldset>
  );
}
