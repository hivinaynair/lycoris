declare const brand: unique symbol;

/**
 * A 20-byte EVM address. Accepts any `0x${string}`, including viem's `Address`.
 * Distinct from {@link SettlementHash}: a hash cannot be passed as a payee.
 */
export type Address = `0x${string}` & { readonly [brand]?: "Address" };

/**
 * Identifier for a confirmed settlement: a transaction hash, or a userOpHash
 * under ERC-4337.
 */
export type SettlementHash = `0x${string}` & { readonly [brand]?: "SettlementHash" };

/** Hex-encoded bytes. Not an identity; use {@link Address} or {@link SettlementHash} for those. */
export type Hex = `0x${string}`;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
/** CAIP-2 id for Base Sepolia. */
export const BASE_SEPOLIA_CAIP2 = "eip155:84532";
/** Circle USDC on Base Sepolia. */
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

/** Basescan URL for a transaction or user operation hash. */
export function explorerUrl(txHash?: string) {
  return txHash ? `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}` : undefined;
}
export const USDC_DECIMALS = 6;
/** Default session lifetime for a prepared intent: 5 minutes. */
export const DEFAULT_INTENT_TTL_MS = 5 * 60 * 1000;

/** Supported payment method ids. `"usdc-4337"` is the same transfer with a userOp receipt. */
export const SETTLE_METHOD_IDS = ["usdc", "usdc-4337"] as const;
export type SettleMethodId = (typeof SETTLE_METHOD_IDS)[number];

/** Where USDC is sent. v1 supports Base Sepolia Circle USDC only. */
export type Destination = {
  targetChain: typeof BASE_SEPOLIA_CHAIN_ID;
  targetAsset: Address;
  recipient: Address;
};

export type SettleErrorCode =
  | "insufficient_usdc"
  | "expired"
  | "wallet_rejected"
  | "wallet_unavailable"
  | "wrong_network"
  | "transfer_failed"
  | "invalid_config";

export type SettleError = {
  code: SettleErrorCode;
  /** Copy safe to show a buyer. */
  message: string;
};

/** Wallet used to submit the USDC transfer. The host owns the network. */
export type PaymentSigner = {
  address: Address;
  sendTransaction: (tx: { to: Address; data: Hex }) => Promise<SettlementHash>;
};

/**
 * Frozen terms for one pay() attempt.
 *
 * This is not an FX quote: USDC in is USDC out. `prepare` binds amount, method,
 * and optional destination so settle cannot silently change them. A merchant
 * server PaymentIntent is a later layer; this object is still created locally.
 */
export type Intent = {
  requestId: string;
  /** Display amount, e.g. `"12.50"`. */
  amount: string;
  /** Amount in USDC atomic units (6 decimals). */
  amountAtomic: string;
  /** Unix timestamp in milliseconds. */
  expiresAt: number;
  method: SettleMethodId;
  /**
   * Recipient for this purchase. Set by prepare when the payee belongs to the
   * resource rather than the host app.
   */
  destination?: Destination | undefined;
};

/**
 * Lifecycle of a checkout session. Discriminate on `status`.
 *
 * `pay()` leaves idle for `settling` immediately. `intent` and `destination`
 * appear once prepare succeeds. `settled` always includes `txHash`.
 */
export type CheckoutState =
  | { status: "idle" }
  | {
      status: "settling";
      amount: string;
      intent?: Intent;
      destination?: Destination;
      txHash?: SettlementHash;
      confirmationError?: SettleError;
    }
  | { status: "settled"; intent: Intent; destination: Destination; txHash: SettlementHash }
  | {
      status: "failed";
      error: SettleError;
      intent?: Intent;
      destination?: Destination;
      txHash?: SettlementHash;
    };

/**
 * The payment rail. Hosts usually pass `createUsdcMethod()`; wrap it to add
 * funding or tracking (see the sponsored checkout demo).
 */
export type SettleAdapter = {
  id: SettleMethodId;
  prepare: (input: { amount: string; destination?: Destination | undefined }) => Promise<Intent>;
  settle: (input: {
    intent: Intent;
    destination: Destination;
    signer: PaymentSigner;
  }) => Promise<SettlementHash>;
  /**
   * Confirm the submitted hash.
   *
   * Return `"success"` or `"reverted"` from a receipt. Throw when the outcome is
   * unknown — never treat that as permission to send again.
   */
  confirm: (input: {
    txHash: SettlementHash;
    intent: Intent;
    destination: Destination;
  }) => Promise<"success" | "reverted">;
};

export type CreateCheckoutInput = {
  amount: string;
  destination?: Destination | undefined;
  getSigner: () => Promise<PaymentSigner>;
  method?: SettleAdapter | undefined;
};

export type CheckoutManager = {
  getState: () => CheckoutState;
  subscribe: (listener: () => void) => () => void;
  /** Prepare, submit, then wait for a receipt. Requires `idle`. */
  pay: () => Promise<void>;
  /** Retry receipt lookup only. Never resubmits. */
  retryConfirmation: () => Promise<void>;
  /** Return to idle. Refused while `settling`. */
  reset: () => void;
};
