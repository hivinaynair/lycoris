import type { AgentPaymentResult, createPaidFetch, ResourceQuote } from "@settle-kit/agents";
import type { HexAddress } from "@settle-kit/core";
import type { PaymentStore } from "./store";

export type SettleMcpSigner = {
  address: HexAddress;
  /** The x402 scheme client (ExactEvmScheme or compatible). */
  client: unknown;
};

export type SettleMcpPorts = {
  fetch?: typeof fetch;
  quoteResource?: (url: string, fetchImpl?: typeof fetch) => Promise<ResourceQuote | undefined>;
  payForResource?: (input: { url: string; paidFetch: unknown }) => Promise<AgentPaymentResult>;
  createPaidFetch?: typeof createPaidFetch;
  readUsdcBalance?: (address: HexAddress) => Promise<bigint>;
  lookupRegistered?: (input: { agentId: bigint; address: HexAddress }) => Promise<boolean>;
  now?: () => number;
};

export type SettleMcpOptions = {
  getSigner: () => Promise<SettleMcpSigner>;
  getMandate: () => Promise<string>;
  facilitatorUrl: string;
  allowlist: string[];
  store?: PaymentStore;
  requestStateKey?: Uint8Array;
  requestStateTtlSeconds?: number;
  rpcUrl?: string;
  registryAddress?: HexAddress;
  ports?: SettleMcpPorts;
};

export const BASE_SEPOLIA_CAIP2 = "eip155:84532";
export const ERC8004_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as HexAddress;
