import { assertDestination } from "./destination.ts";
import { invalidConfig } from "./errors.ts";
import { createUsdcMethod } from "./methods/usdc.ts";
import { SETTLE_METHOD_IDS, type SettleConfig } from "./types.ts";

/** Input to {@link createSettleConfig}. Omitted fields use defaults. */
export type CreateSettleConfigInput = {
  destination?: SettleConfig["destination"] | undefined;
  getSigner: SettleConfig["getSigner"];
  methods?: SettleConfig["methods"] | undefined;
  quoteUrl?: string | undefined;
  onSettled?: SettleConfig["onSettled"] | undefined;
  onFailed?: SettleConfig["onFailed"] | undefined;
};

/**
 * Validate checkout options and fill defaults.
 *
 * Throws `SettleKitError("invalid_config")` when methods are missing, duplicated,
 * or unknown. When `methods` is omitted, a single `"usdc"` adapter is used.
 */
export function createSettleConfig(input: CreateSettleConfigInput): SettleConfig {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = input.destination ? assertDestination(input.destination) : undefined;
  const methods = input.methods ?? [createUsdcMethod()];
  if (methods.length === 0) invalidConfig("Provide at least one payment method");
  const seen = new Set<string>();
  for (const method of methods) {
    if (!method || !(SETTLE_METHOD_IDS as readonly string[]).includes(method.id))
      invalidConfig(`Unknown payment method: ${method?.id}`);
    if (
      typeof method.quote !== "function" ||
      typeof method.settle !== "function" ||
      typeof method.confirm !== "function"
    )
      invalidConfig(`Method ${method.id} needs quote, settle, and confirm`);
    if (seen.has(method.id)) invalidConfig(`Duplicate payment method: ${method.id}`);
    seen.add(method.id);
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
