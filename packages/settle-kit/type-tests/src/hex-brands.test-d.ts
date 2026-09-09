import type { Hex, HexAddress, TxHash } from "@settle-kit/core";
import type { Address, Hash } from "viem";

declare const txHash: TxHash;
declare const address: HexAddress;
declare const viemAddress: Address;
declare const viemHash: Hash;
declare const plain: `0x${string}`;

// ── viem interop must keep working: the brands are optional, so anything
// ── structurally `0x${string}` still flows in and out unchanged.
export const fromViemAddress: HexAddress = viemAddress;
export const fromViemHash: TxHash = viemHash;
export const fromPlain: HexAddress = plain;
export const fromLiteral: HexAddress = "0x1111111111111111111111111111111111111111";
export const toViemAddress: Address = address;
export const toViemHash: Hash = txHash;
export const toHex: Hex = address;

// ── but the two must not be interchangeable: a transaction hash is not a payee.
// @ts-expect-error a TxHash must never satisfy an address position
export const hashAsAddress: HexAddress = txHash;
// @ts-expect-error an address must never satisfy a transaction-hash position
export const addressAsHash: TxHash = address;
