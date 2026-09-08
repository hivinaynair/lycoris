import type { HexAddress } from "@settle-kit/core";

export const MANDATE_CHAIN_ID = 84532;

export const MANDATE_EIP712_DOMAIN = {
  name: "AP2Mandate",
  version: "1",
  chainId: MANDATE_CHAIN_ID,
} as const;

export const MANDATE_EIP712_TYPES = {
  MandatePayload: [
    { name: "agent", type: "address" },
    { name: "delegator", type: "address" },
    { name: "maxAmountUsdc", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export type MandatePayload = {
  agent: HexAddress;
  delegator: HexAddress;
  maxAmountUsdc: bigint;
  expiry: bigint;
  nonce: bigint;
};

export type SignedMandate = {
  payload: MandatePayload;
  signature: HexAddress;
};
