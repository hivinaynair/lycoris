declare const brand: unique symbol;
/**
 * The brand is **optional**, which is the whole trick: anything structurally
 * `0x${string}` — a viem `Address`, a `Hash`, a literal — still flows in and out
 * unchanged, so the SDK stays interoperable with the library it is built on. But a
 * value already carrying one brand cannot satisfy the other, so a transaction hash
 * can never land in a payee position. See `@settle-kit/type-tests`.
 */
export type HexAddress = `0x${string}` & { readonly [brand]?: "HexAddress" };
export type TxHash = `0x${string}` & { readonly [brand]?: "TxHash" };
/** Deliberately unbranded: arbitrary calldata, not an identity. */
export type Hex = `0x${string}`;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as HexAddress;
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";
export const USDC_DECIMALS = 6;
export const DEFAULT_QUOTE_TTL_MS = 5 * 60 * 1000;

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
  sendTransaction: (tx: { to: HexAddress; data: Hex }) => Promise<TxHash>;
  getChainId?: () => Promise<number>;
};

export type Quote = {
  requestId: string;
  amountUsdc: string;
  amountAtomic: string;
  expiresAt: number;
  method: "usdc";
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
      txHash?: TxHash;
      confirmationError?: SettleError;
    }
  | { status: "settled"; quote: Quote; destination: Destination; txHash: TxHash }
  | {
      status: "failed";
      error: SettleError;
      quote?: Quote;
      destination?: Destination;
      txHash?: TxHash;
    };

export type SettleAdapter = {
  id: "usdc";
  quote: (input: { amountUsdc: string; destination?: Destination | undefined }) => Promise<Quote>;
  settle: (input: {
    quote: Quote;
    destination: Destination;
    signer: PaymentSigner;
  }) => Promise<TxHash>;
  /** Confirm the submitted hash. Throws mean unknown outcome, never permission to resend. */
  confirm: (input: {
    txHash: TxHash;
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
