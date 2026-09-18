/**
 * The browser's record of the current sponsored purchase.
 *
 * Funding is idempotent on this UUID for about an hour (CDP plus the reservation
 * row). Reusing it across retries is what stops a double faucet send. Past that
 * window the server refuses the same id ("operator review"), and reusing it
 * forever is how checkout got stuck on "The USDC transfer failed."
 */

export const SPONSORED_PURCHASE_STORAGE_KEY = "lycoris-sponsored-purchase";

/** Rotate before the server's one-hour operator-review cutoff. */
export const STALE_PURCHASE_MS = 50 * 60 * 1000;

export type StoredPurchase = {
  id: string;
  txHash?: string;
  confirmed?: boolean;
  createdAt?: number;
};

export type PurchaseStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function readSponsoredPurchase(storage: PurchaseStorage): StoredPurchase | undefined {
  try {
    return JSON.parse(storage.getItem(SPONSORED_PURCHASE_STORAGE_KEY) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeSponsoredPurchase(storage: PurchaseStorage, purchase: StoredPurchase) {
  try {
    storage.setItem(SPONSORED_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
  } catch {
    // Same bargain as the burner key: losing the id costs a retry, not checkout.
  }
}

/**
 * An unconfirmed purchase with no submitted hash is dead once it is old enough
 * that the faucet will not retry it. Records written before `createdAt` existed
 * have no age, so they are treated as stale — that is the stuck-browser case.
 */
export function isStalePurchase(purchase: StoredPurchase, now: number): boolean {
  if (purchase.confirmed || purchase.txHash) return false;
  if (purchase.createdAt == null) return true;
  return now - purchase.createdAt >= STALE_PURCHASE_MS;
}

export function beginSponsoredPurchase(
  storage: PurchaseStorage,
  now = Date.now(),
  randomId = () => crypto.randomUUID(),
): StoredPurchase {
  const existing = readSponsoredPurchase(storage);
  // Confirmed purchases are finished: the next Pay is a new faucet reservation.
  // Submitted hashes stay so confirmation can retry without sending again.
  if (existing && !existing.confirmed && !isStalePurchase(existing, now)) return existing;
  const purchase: StoredPurchase = { id: randomId(), createdAt: now };
  writeSponsoredPurchase(storage, purchase);
  return purchase;
}
