import { assertDestination } from "./destination.js";
import { invalidConfig } from "./errors.js";
import { createUsdcMethod } from "./methods/usdc.js";
import type { SettleConfig } from "./types.js";

export type CreateSettleConfigInput = Omit<SettleConfig, "methods"> & {
  methods?: SettleConfig["methods"];
};

export function createSettleConfig(input: CreateSettleConfigInput): SettleConfig {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = assertDestination(input.destination);
  const methods = input.methods ?? [createUsdcMethod()];
  if (methods.length === 0) {
    invalidConfig("At least one payment method is required");
  }
  return {
    destination,
    getSigner: input.getSigner,
    methods,
    quoteUrl: input.quoteUrl,
    onSettled: input.onSettled,
    onFailed: input.onFailed,
  };
}
