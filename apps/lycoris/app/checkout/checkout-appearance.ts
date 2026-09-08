import type { CheckoutAppearance } from "@settle-kit/react";

export type Look = "default" | "light" | "brand" | "custom";
export const appearances: Record<Look, CheckoutAppearance> = {
  default: {
    theme: "inherit",
    variables: { borderRadius: "var(--radius)", controlBorderRadius: "var(--radius)" },
  },
  light: {
    theme: "light",
    variables: {
      colorBackground: "var(--surface-light)",
      colorForeground: "var(--ink-light)",
      colorMuted: "var(--muted-light)",
      colorMutedForeground: "var(--muted-ink-light)",
      colorBorder: "var(--border-light)",
      borderRadius: "var(--radius)",
      controlBorderRadius: "var(--radius)",
    },
  },
  brand: {
    theme: "dark",
    variables: {
      colorPrimary: "var(--checkout-brand)",
      colorPrimaryForeground: "var(--primary-foreground)",
      borderRadius: "var(--radius)",
      controlBorderRadius: "var(--radius)",
    },
    elements: { primaryButton: "tracking-[0.02em]" },
  },
  custom: { theme: "inherit" },
};
