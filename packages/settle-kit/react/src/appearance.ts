import type { CSSProperties } from "react";

/**
 * Theme tokens for the default checkout card.
 *
 * Provider values merge with per-component values; component values win.
 */
export type CheckoutAppearance = {
  /** `"inherit"` uses the host theme. `"light"` and `"dark"` set explicit palettes. */
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

export function resolveAppearance(global?: CheckoutAppearance, local?: CheckoutAppearance) {
  const variables = { ...global?.variables, ...local?.variables };
  const style: CSSProperties & Record<string, string> = {};
  for (const key of Object.keys(variableNames) as (keyof typeof variableNames)[]) {
    const value = variables[key];
    if (value !== undefined) style[variableNames[key]] = value;
  }
  return {
    theme: local?.theme ?? global?.theme ?? "inherit",
    style: Object.keys(style).length ? style : undefined,
  };
}
