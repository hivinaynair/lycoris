import type { CSSProperties } from "react";

type AppearanceElement =
  | "card"
  | "header"
  | "amount"
  | "paymentMethod"
  | "primaryButton"
  | "status"
  | "details"
  | "footer"
  | "error";

export type CheckoutAppearance = {
  theme?: "inherit" | "light" | "dark";
  variables?: Partial<{
    colorPrimary: string;
    colorPrimaryForeground: string;
    colorBackground: string;
    colorForeground: string;
    colorMuted: string;
    colorMutedForeground: string;
    colorBorder: string;
    colorDanger: string;
    fontFamily: string;
    borderRadius: string;
    controlBorderRadius: string;
  }>;
  elements?: Partial<Record<AppearanceElement, string>>;
};

export type ResolvedAppearance = {
  theme: NonNullable<CheckoutAppearance["theme"]>;
  style: (CSSProperties & Record<string, string>) | undefined;
  classFor: (element: AppearanceElement, base: string) => string;
};

const variableNames = {
  colorPrimary: "--sk-primary",
  colorPrimaryForeground: "--sk-primary-foreground",
  colorBackground: "--sk-surface",
  colorForeground: "--sk-foreground",
  colorMuted: "--sk-muted",
  colorMutedForeground: "--sk-muted-foreground",
  colorBorder: "--sk-border",
  colorDanger: "--sk-danger",
  fontFamily: "--sk-font-family",
  borderRadius: "--sk-radius",
  controlBorderRadius: "--sk-control-radius",
} as const;

export function resolveAppearance(
  global?: CheckoutAppearance,
  local?: CheckoutAppearance,
): ResolvedAppearance {
  const variables = { ...global?.variables, ...local?.variables };
  const style: CSSProperties & Record<string, string> = {};
  for (const key of Object.keys(variableNames) as (keyof typeof variableNames)[]) {
    const value = variables[key];
    if (value !== undefined) style[variableNames[key]] = value;
  }
  const elements = { ...global?.elements, ...local?.elements };
  return {
    theme: local?.theme ?? global?.theme ?? "inherit",
    style: Object.keys(style).length ? style : undefined,
    classFor: (element, base) => [base, elements[element]].filter(Boolean).join(" "),
  };
}
