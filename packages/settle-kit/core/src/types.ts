export type HexAddress = `0x${string}`;
export type TxHash = `0x${string}`;
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
};

export type CheckoutState =
  | { status: "idle" }
  | { status: "quoting"; amountUsdc: string }
  | { status: "awaiting_payment"; quote: Quote; destination: Destination }
  | { status: "settling"; quote: Quote; destination: Destination }
  | { status: "settled"; quote: Quote; destination: Destination; txHash: TxHash }
  | {
      status: "failed";
      error: SettleError;
      quote?: Quote;
      destination?: Destination;
    };

export type SettleAdapter = {
  id: "usdc";
  quote: (input: { amountUsdc: string; destination: Destination }) => Promise<Quote>;
  settle: (input: {
    quote: Quote;
    destination: Destination;
    signer: PaymentSigner;
  }) => Promise<TxHash>;
};

export type SettleConfig = {
  destination: Destination;
  getSigner: () => Promise<PaymentSigner>;
  methods: SettleAdapter[];
  quoteUrl?: string;
  onSettled?: (state: Extract<CheckoutState, { status: "settled" }>) => void;
  onFailed?: (state: Extract<CheckoutState, { status: "failed" }>) => void;
};

export type CreateCheckoutInput = {
  amountUsdc: string;
  destination?: Destination;
};

export type CheckoutManager = {
  getState: () => CheckoutState;
  subscribe: (listener: () => void) => () => void;
  selectMethod: (id: string) => Promise<void>;
  pay: () => Promise<void>;
  reset: () => void;
};
