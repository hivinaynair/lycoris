"use client";

/**
 * The bundle transaction behind a userOp, remembered as it goes past.
 *
 * `createUserOpReceiptClient` deliberately echoes the userOpHash back to the SDK —
 * `confirm()` treats a receipt under a different hash as a replaced transaction, so
 * returning the bundle's hash would fail every settled purchase. The bundle hash is
 * still the only one a chain explorer can resolve, so we keep a copy here rather
 * than asking the bundler for it a second time.
 *
 * Stored per browser: a userOpHash is meaningless to anyone else, and the mapping is
 * a convenience for the link, never something the payment depends on.
 */

const STORAGE_KEY = "lycoris:settlement-tx";

const listeners = new Set<() => void>();
let cache: Record<string, string> | undefined;
let version = 0;

function load(): Record<string, string> {
  if (cache) return cache;
  cache = {};
  if (typeof window === "undefined") return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw) as Record<string, string>;
  } catch {
    /* private mode, blocked storage, or junk: an empty map is a fine answer */
  }
  return cache;
}

export function rememberSettlementTx(userOpHash: string, transactionHash: string) {
  const known = load();
  if (known[userOpHash] === transactionHash) return;
  known[userOpHash] = transactionHash;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(known));
  } catch {
    /* the in-memory copy still serves this page */
  }
  version += 1;
  for (const listener of listeners) listener();
}

export function readSettlementTx(userOpHash: string): string | undefined {
  return load()[userOpHash];
}

export function subscribeSettlementTx(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function settlementTxVersion() {
  return version;
}
