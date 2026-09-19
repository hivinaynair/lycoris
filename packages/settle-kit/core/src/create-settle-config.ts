import { assertDestination } from "./destination";
import { invalidConfig } from "./errors";
import { createUsdcMethod } from "./methods/usdc";
import { SETTLE_METHOD_IDS, type SettleConfig } from "./types";

/** An option bag, not a stored object: callers build it from optional data. */
export type CreateSettleConfigInput = {
  destination?: SettleConfig["destination"] | undefined;
  getSigner: SettleConfig["getSigner"];
  methods?: SettleConfig["methods"] | undefined;
  quoteUrl?: string | undefined;
  onSettled?: SettleConfig["onSettled"] | undefined;
  onFailed?: SettleConfig["onFailed"] | undefined;
};

export function createSettleConfig(input: CreateSettleConfigInput): SettleConfig {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = input.destination ? assertDestination(input.destination) : undefined;
  const methods = input.methods ?? [createUsdcMethod()];
  // One method per id, each complete. This used to demand exactly one method
  // called "usdc", which made `methods` an array that could hold a single
  // hard-coded thing and `selectMethod` a function with nothing to select.
  if (methods.length === 0) invalidConfig("Provide at least one payment method");
  const seen = new Set<string>();
  for (const method of methods) {
    if (!method || !(SETTLE_METHOD_IDS as readonly string[]).includes(method.id)) {
      invalidConfig(`Unknown payment method: ${method?.id}`);
    }
    if (
      typeof method.quote !== "function" ||
      typeof method.settle !== "function" ||
      typeof method.confirm !== "function"
    ) {
      invalidConfig(`Method ${method.id} needs quote, settle, and confirm`);
    }
    // Two adapters under one id would make selectMethod's choice arbitrary.
    if (seen.has(method.id)) invalidConfig(`Duplicate payment method: ${method.id}`);
    seen.add(method.id);
  }
  const config: SettleConfig = { getSigner: input.getSigner, methods };
  if (destination) config.destination = destination;
  if (input.quoteUrl !== undefined) config.quoteUrl = input.quoteUrl;
  if (input.onSettled) config.onSettled = input.onSettled;
  if (input.onFailed) config.onFailed = input.onFailed;
  return config;
}
