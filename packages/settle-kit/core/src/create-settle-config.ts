import { assertDestination } from "./destination";
import { invalidConfig } from "./errors";
import { createUsdcMethod } from "./methods/usdc";
import type { SettleConfig } from "./types";

export type CreateSettleConfigInput = Omit<SettleConfig, "methods"> & {
  methods?: SettleConfig["methods"];
};

export function createSettleConfig(input: CreateSettleConfigInput): SettleConfig {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = input.destination ? assertDestination(input.destination) : undefined;
  const methods = input.methods ?? [createUsdcMethod()];
  if (
    methods.length !== 1 ||
    methods[0]?.id !== "usdc" ||
    typeof methods[0].quote !== "function" ||
    typeof methods[0].settle !== "function" ||
    typeof methods[0].confirm !== "function"
  ) {
    invalidConfig("Provide one USDC method with quote, settle, and confirm");
  }
  return {
    ...(destination ? { destination } : {}),
    getSigner: input.getSigner,
    methods,
    ...(input.quoteUrl !== undefined ? { quoteUrl: input.quoteUrl } : {}),
    ...(input.onSettled ? { onSettled: input.onSettled } : {}),
    ...(input.onFailed ? { onFailed: input.onFailed } : {}),
  };
}
