import { invalidConfig } from "./errors";
import { BASE_SEPOLIA_CHAIN_ID, type Destination, type HexAddress } from "./types";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isHexAddress(value: string): value is HexAddress {
  return ADDRESS_PATTERN.test(value);
}

export function assertDestination(destination: Destination): Destination {
  if (destination.targetChain !== BASE_SEPOLIA_CHAIN_ID) {
    invalidConfig(`targetChain must be Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`);
  }
  if (!isHexAddress(destination.targetAsset)) {
    invalidConfig("targetAsset must be a 20-byte hex address");
  }
  if (!isHexAddress(destination.recipient)) {
    invalidConfig("recipient must be a 20-byte hex address");
  }
  return destination;
}
