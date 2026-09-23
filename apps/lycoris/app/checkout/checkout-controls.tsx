"use client";

import { Button } from "@repo/ui/components/button";
import { useCheckout } from "@settle-kit/react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { Look } from "./checkout-appearance";
import styles from "./checkout-layouts";
import { CHECKOUT_RAIL_LABEL, CHECKOUT_RAILS, type CheckoutRail } from "./checkout-rail";

type ControlsProps = {
  look: Look;
  setLook: (value: Look) => void;
  rail: CheckoutRail;
  setRail: (value: CheckoutRail) => void;
};
export function CheckoutControls({ look, setLook, rail, setRail }: ControlsProps) {
  const checkout = useCheckout();
  const settling = checkout.state.status === "settling";
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
        <RailControls rail={rail} setRail={setRail} disabled={settling} />
        <AppearanceControls look={look} setLook={setLook} />
      </aside>
      <div className="flex flex-wrap justify-between gap-2 border-t border-border px-6 py-4 text-[length:var(--font-small-size)] text-muted-foreground">
        <span>
          state: <output data-testid="checkout-state">{checkout.state.status}</output>
        </span>
        <span>
          rail: <output data-testid="checkout-rail">{rail}</output>
        </span>
      </div>
    </details>
  );
}

function ChoiceButton({
  pressed,
  label,
  disabled,
  title,
  onClick,
}: {
  pressed: boolean;
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="h-10 w-full min-w-0 shrink justify-between gap-2 overflow-hidden rounded-none border border-border px-3"
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
    >
      <span className="min-w-0 truncate text-left">{label}</span>
      <Check className={pressed ? "size-4" : "invisible size-4"} aria-hidden="true" />
    </Button>
  );
}

function RailControls({
  rail,
  setRail,
  disabled,
}: {
  rail: CheckoutRail;
  setRail: (value: CheckoutRail) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className={styles.appearance} aria-label="How you pay">
      <legend className="mb-3 text-[length:var(--font-small-size)] font-medium text-foreground">
        How you pay
      </legend>
      {CHECKOUT_RAILS.map((value) => (
        <ChoiceButton
          key={value}
          pressed={rail === value}
          label={CHECKOUT_RAIL_LABEL[value]}
          disabled={disabled}
          {...(disabled ? { title: "Wait for this payment to finish before switching." } : {})}
          onClick={() => {
            setRail(value);
          }}
        />
      ))}
      <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
        Same <code>pay()</code>. Sponsored wraps the USDC method for a faucet and a 4337 receipt.
        Your wallet is an ordinary EOA signer.
      </p>
    </fieldset>
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
        <ChoiceButton
          key={value}
          pressed={look === value}
          label={label}
          onClick={() => {
            setLook(value);
          }}
        />
      ))}
      <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
        Change the look mid-payment. The session stays intact.
      </p>
    </fieldset>
  );
}
