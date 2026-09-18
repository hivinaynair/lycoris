declare const brand: unique symbol;
/**
 * The brand is **optional**, which is the whole trick: anything structurally
 * `0x${string}` — a viem `Address`, a `Hash`, a literal — still flows in and out
 * unchanged, so the SDK stays interoperable with the library it is built on. But a
 * value already carrying one brand cannot satisfy the other, so a settlement hash
 * can never land in a payee position. See `@settle-kit/type-tests`.
 */
export type HexAddress = `0x${string}` & { readonly [brand]?: "HexAddress" };
/** The hash that identifies a settlement: a transaction hash, or a userOpHash under ERC-4337. */
export type SettlementHash = `0x${string}` & { readonly [brand]?: "SettlementHash" };
/** Deliberately unbranded: arbitrary calldata, not an identity. */
export type Hex = `0x${string}`;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as HexAddress;
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";
export const USDC_DECIMALS = 6;
export const DEFAULT_QUOTE_TTL_MS = 5 * 60 * 1000;

/**
 * The payment methods an adapter can be.
 *
 * This was the literal `"usdc"` until a second method existed, which made
 * `SettleConfig.methods` an array that could hold exactly one thing and
 * `selectMethod` a function with nothing to select. Confirming a user operation
 * needs its own adapter — a different receipt client, a hash that is not a
 * transaction hash — so the literal had to go.
 */
export type SettleMethodId = "usdc" | "usdc-4337";

/**
 * What a settlement is identified by, once a payer might be a smart account.
 *
 * Mutual exclusion rather than a branded union: the hex brands are optional
 * phantom properties, so `TransactionHash | UserOpHash` would admit any hex
 * string and narrow to nothing. `?: never` makes the two shapes genuinely
 * incompatible and lets a consumer branch on which key is present.
 */
export type Settlement =
  | { transactionHash: SettlementHash; userOpHash?: never }
  | { userOpHash: SettlementHash; transactionHash?: never };

export type Destination = {
  targetChain: typeof BASE_SEPOLIA_CHAIN_ID;
  targetAsset: HexAddress;
  recipient: HexAddress;
};

export type SettleErrorCode =
  | "insufficient_usdc"
  | "quote_expired"
  | "wallet_rejected"
  | "wallet_unavailable"
  | "wrong_network"
  | "transfer_failed"
  | "invalid_config";

export type SettleError = {
  code: SettleErrorCode;
  message: string;
};

export type PaymentSigner = {
  address: HexAddress;
  sendTransaction: (tx: { to: HexAddress; data: Hex }) => Promise<SettlementHash>;
  getChainId?: () => Promise<number>;
};

export type Quote = {
  requestId: string;
  amountUsdc: string;
  amountAtomic: string;
  expiresAt: number;
  method: SettleMethodId;
  /** Set by the quote server when the recipient belongs to the resource, not the app. */
  destination?: Destination | undefined;
};

export type CheckoutState =
  | { status: "idle" }
  | { status: "quoting"; amountUsdc: string }
  | { status: "awaiting_payment"; quote: Quote; destination: Destination }
  | {
      status: "settling";
      quote: Quote;
      destination: Destination;
      txHash?: SettlementHash;
      confirmationError?: SettleError;
    }
  | { status: "settled"; quote: Quote; destination: Destination; txHash: SettlementHash }
  | {
      status: "failed";
      error: SettleError;
      quote?: Quote;
      destination?: Destination;
      txHash?: SettlementHash;
    };

export type SettleAdapter = {
  id: SettleMethodId;
  quote: (input: { amountUsdc: string; destination?: Destination | undefined }) => Promise<Quote>;
  settle: (input: {
    quote: Quote;
    destination: Destination;
    signer: PaymentSigner;
  }) => Promise<SettlementHash>;
  /** Confirm the submitted hash. Throws mean unknown outcome, never permission to resend. */
  confirm: (input: {
    txHash: SettlementHash;
    quote: Quote;
    destination: Destination;
  }) => Promise<"success" | "reverted">;
};

export type SettleConfig = {
  /** Optional default. Per-checkout input or the quote may supply it instead. */
  destination?: Destination;
  getSigner: () => Promise<PaymentSigner>;
  methods: SettleAdapter[];
  quoteUrl?: string;
  onSettled?: (state: Extract<CheckoutState, { status: "settled" }>) => void;
  onFailed?: (state: Extract<CheckoutState, { status: "failed" }>) => void;
};

export type CreateCheckoutInput = {
  amountUsdc: string;
  destination?: Destination | undefined;
};

export type CheckoutManager = {
  getState: () => CheckoutState;
  subscribe: (listener: () => void) => () => void;
  selectMethod: (id: string) => Promise<void>;
  pay: () => Promise<void>;
  retryConfirmation: () => Promise<void>;
  reset: () => void;
};
