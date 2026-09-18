import type { Hex, HexAddress, SettlementHash } from "@settle-kit/core";
import type { Address, Hash } from "viem";

declare const settlement: SettlementHash;
declare const address: HexAddress;
declare const viemAddress: Address;
declare const viemHash: Hash;
declare const plain: `0x${string}`;

// ── viem interop must keep working: the brands are optional, so anything
// ── structurally `0x${string}` still flows in and out unchanged.
export const fromViemAddress: HexAddress = viemAddress;
export const fromViemHash: SettlementHash = viemHash;
export const fromPlain: HexAddress = plain;
export const fromLiteral: HexAddress = "0x1111111111111111111111111111111111111111";
export const toViemAddress: Address = address;
export const toViemHash: Hash = settlement;
export const toHex: Hex = address;

// ── but the two must not be interchangeable: a settlement hash is not a payee.
// @ts-expect-error a SettlementHash must never satisfy an address position
export const hashAsAddress: HexAddress = settlement;
// @ts-expect-error an address must never satisfy a settlement-hash position
export const addressAsHash: SettlementHash = address;
