import { invalidConfig } from "./errors";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type HexAddress,
} from "./types";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isHexAddress(value: string): value is HexAddress {
  return ADDRESS_PATTERN.test(value);
}

export function assertDestination(destination: Destination): Destination {
  if (!destination || typeof destination !== "object") invalidConfig("destination is required");
  if (destination.targetChain !== BASE_SEPOLIA_CHAIN_ID) {
    invalidConfig(`targetChain must be Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`);
  }
  if (
    typeof destination.targetAsset !== "string" ||
    destination.targetAsset.toLowerCase() !== BASE_SEPOLIA_USDC_ADDRESS.toLowerCase()
  ) {
    invalidConfig("targetAsset must be Circle USDC on Base Sepolia");
  }
  if (
    typeof destination.recipient !== "string" ||
    !isHexAddress(destination.recipient) ||
    /^0x0{40}$/i.test(destination.recipient)
  ) {
    invalidConfig("recipient must be a nonzero 20-byte hex address");
  }
  return Object.freeze({ ...destination });
}
