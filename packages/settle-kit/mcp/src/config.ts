import type { HexAddress } from "@settle-kit/core";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import type { SettleMcpOptions, SettleMcpSigner } from "./options";

export type ProcessEnv = Record<string, string | undefined>;

function requireEnv(env: ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function parseAllowlist(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasCdp(env: ProcessEnv): boolean {
  return Boolean(
    env.CDP_API_KEY_ID &&
      env.CDP_API_KEY_SECRET &&
      env.CDP_WALLET_SECRET &&
      env.SETTLE_MCP_CDP_ACCOUNT,
  );
}

async function signerFromPrivateKey(privateKey: string): Promise<SettleMcpSigner> {
  const account = privateKeyToAccount(privateKey as HexAddress);
  return { address: account.address, client: new ExactEvmScheme(account) };
}

async function signerFromCdp(accountName: string): Promise<SettleMcpSigner> {
  const { CdpClient } = await import("@coinbase/cdp-sdk");
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: accountName });
  return {
    address: account.address as HexAddress,
    client: new ExactEvmScheme(account as never),
  };
}

export function readConfig(env: ProcessEnv = process.env): SettleMcpOptions {
  const mandate = requireEnv(env, "SETTLE_MCP_MANDATE");
  const facilitatorUrl = requireEnv(env, "SETTLE_MCP_FACILITATOR_URL");
  const allowlist = parseAllowlist(requireEnv(env, "SETTLE_MCP_ALLOWLIST"));
  if (allowlist.length === 0) throw new Error("Missing SETTLE_MCP_ALLOWLIST");

  const privateKey = env.SETTLE_MCP_PRIVATE_KEY?.trim();
  if (!privateKey && !hasCdp(env)) {
    throw new Error("Missing SETTLE_MCP_PRIVATE_KEY");
  }

  if (privateKey) {
    // Fail on a malformed key at startup, not at the first payment.
    privateKeyToAccount(privateKey as HexAddress);
  }

  const getSigner = privateKey
    ? () => signerFromPrivateKey(privateKey)
    : () => signerFromCdp(requireEnv(env, "SETTLE_MCP_CDP_ACCOUNT"));

  return {
    getSigner,
    getMandate: async () => mandate,
    facilitatorUrl,
    allowlist,
    ...(env.SETTLE_MCP_RPC_URL ? { rpcUrl: env.SETTLE_MCP_RPC_URL } : {}),
  };
}
