import type { Address, Hex, SettlementHash } from "@settle-kit/core";
import type { Hash, Address as ViemAddress } from "viem";

declare const settlement: SettlementHash;
declare const address: Address;
declare const viemAddress: ViemAddress;
declare const viemHash: Hash;
declare const plain: `0x${string}`;

// Brands are optional: viem `Address` / `Hash` and plain `0x${string}` assign in both directions.
export const fromViemAddress: Address = viemAddress;
export const fromViemHash: SettlementHash = viemHash;
export const fromPlain: Address = plain;
export const fromLiteral: Address = "0x1111111111111111111111111111111111111111";
export const toViemAddress: ViemAddress = address;
export const toViemHash: Hash = settlement;
export const toHex: Hex = address;

// Address and SettlementHash are not interchangeable.
// @ts-expect-error a SettlementHash must never satisfy an address position
export const hashAsAddress: Address = settlement;
// @ts-expect-error an address must never satisfy a settlement-hash position
export const addressAsHash: SettlementHash = address;
