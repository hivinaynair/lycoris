export const CHECKOUT_RAILS = ["sponsored", "wallet"] as const;
export type CheckoutRail = (typeof CHECKOUT_RAILS)[number];

export const CHECKOUT_RAIL_LABEL: Record<CheckoutRail, string> = {
  sponsored: "Demo pays (4337)",
  wallet: "Your wallet (EOA)",
};
