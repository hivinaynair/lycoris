import type { AgentPaymentResult, createPaidFetch, ResourceQuote } from "@settle-kit/agents";
import { type Address, BASE_SEPOLIA_CAIP2 } from "@settle-kit/core";
import type { PaymentStore } from "./store.ts";

export type SettleMcpSigner = {
  address: Address;
  /** x402 scheme client (`ExactEvmScheme` or compatible). */
  client: unknown;
};

export type SettleMcpPorts = {
  fetch?: typeof fetch;
  quoteResource?: (url: string, fetchImpl?: typeof fetch) => Promise<ResourceQuote | undefined>;
  payForResource?: (input: { url: string; paidFetch: unknown }) => Promise<AgentPaymentResult>;
  createPaidFetch?: typeof createPaidFetch;
  readUsdcBalance?: (address: Address) => Promise<bigint>;
  lookupRegistered?: (input: { agentId: bigint; address: Address }) => Promise<boolean>;
  now?: () => number;
};

/**
 * Configuration for `createSettleMcpServer`.
 *
 * Wallet, mandate, facilitator, and allowlist come from the host — never from
 * model arguments.
 */
export type SettleMcpOptions = {
  getSigner: () => Promise<SettleMcpSigner>;
  getMandate: () => Promise<string>;
  facilitatorUrl: string;
  /** Resource URLs this process may pay. */
  allowlist: string[];
  /** Idempotency store. Defaults to a per-process in-memory store. */
  store?: PaymentStore;
  rpcUrl?: string;
  registryAddress?: Address;
  ports?: SettleMcpPorts;
};

export { BASE_SEPOLIA_CAIP2 };
/** ERC-8004 identity registry on Base Sepolia. */
export const ERC8004_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address;
