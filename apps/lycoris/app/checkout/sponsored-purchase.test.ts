import { describe, expect, test } from "bun:test";
import {
  beginSponsoredPurchase,
  isStalePurchase,
  type PurchaseStorage,
  readSponsoredPurchase,
  SPONSORED_PURCHASE_STORAGE_KEY,
  STALE_PURCHASE_MS,
  type StoredPurchase,
  writeSponsoredPurchase,
} from "./sponsored-purchase";

function memoryStorage(
  seed?: StoredPurchase,
): PurchaseStorage & { readonly store: Map<string, string> } {
  const store = new Map<string, string>();
  if (seed) store.set(SPONSORED_PURCHASE_STORAGE_KEY, JSON.stringify(seed));
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("isStalePurchase", () => {
  test("a submitted or confirmed purchase is never stale", () => {
    expect(isStalePurchase({ id: "a", txHash: "0x1" }, Date.now())).toBe(false);
    expect(isStalePurchase({ id: "a", confirmed: true }, Date.now())).toBe(false);
  });

  test("a record with no createdAt is stale — that is the stuck production shape", () => {
    expect(isStalePurchase({ id: "d98a0428-8b95-42c8-aa31-ff1274251a36" }, Date.now())).toBe(true);
  });

  test("a fresh unconfirmed purchase is reused for faucet idempotency", () => {
    const now = 1_000_000;
    expect(isStalePurchase({ id: "a", createdAt: now - 60_000 }, now)).toBe(false);
  });

  test("an unconfirmed purchase older than the rotate window is stale", () => {
    const now = STALE_PURCHASE_MS * 2;
    expect(isStalePurchase({ id: "a", createdAt: 0 }, now)).toBe(true);
  });
});

describe("beginSponsoredPurchase", () => {
  test("mints an id and records createdAt", () => {
    const storage = memoryStorage();
    const now = 1_700_000_000_000;
    const purchase = beginSponsoredPurchase(storage, now, () => "new-id");
    expect(purchase).toEqual({ id: "new-id", createdAt: now });
    expect(readSponsoredPurchase(storage)).toEqual(purchase);
  });

  test("reuses a fresh unconfirmed purchase so a retry hits the same faucet key", () => {
    const now = 1_700_000_000_000;
    const storage = memoryStorage({ id: "same", createdAt: now - 1_000 });
    expect(beginSponsoredPurchase(storage, now, () => "other").id).toBe("same");
  });

  test("rotates a stuck id that has no createdAt", () => {
    const storage = memoryStorage({ id: "d98a0428-8b95-42c8-aa31-ff1274251a36" });
    const purchase = beginSponsoredPurchase(storage, Date.now(), () => "rotated");
    expect(purchase.id).toBe("rotated");
    expect(purchase.createdAt).toBeGreaterThan(0);
  });

  test("rotates an unconfirmed purchase past the operator-review window", () => {
    const now = 1_700_000_000_000;
    const storage = memoryStorage({ id: "old", createdAt: now - STALE_PURCHASE_MS });
    expect(beginSponsoredPurchase(storage, now, () => "rotated").id).toBe("rotated");
  });

  test("starts a new purchase after confirmation", () => {
    const storage = memoryStorage({ id: "done", confirmed: true, createdAt: 1, txHash: "0x1" });
    expect(beginSponsoredPurchase(storage, 2, () => "next").id).toBe("next");
  });

  test("keeps a submitted hash so confirmation can retry without paying again", () => {
    const storage = memoryStorage({ id: "inflight", txHash: "0xabc", createdAt: 1 });
    expect(beginSponsoredPurchase(storage, Date.now(), () => "other")).toEqual({
      id: "inflight",
      txHash: "0xabc",
      createdAt: 1,
    });
  });

  test("survives unreadable storage by minting a new id", () => {
    const storage: PurchaseStorage = {
      getItem: () => {
        throw new Error("insecure");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(beginSponsoredPurchase(storage, 1, () => "ephemeral").id).toBe("ephemeral");
  });
});

describe("writeSponsoredPurchase", () => {
  test("round-trips the record the report lookup will read", () => {
    const storage = memoryStorage();
    writeSponsoredPurchase(storage, { id: "p", txHash: "0x1", confirmed: true, createdAt: 9 });
    expect(readSponsoredPurchase(storage)).toEqual({
      id: "p",
      txHash: "0x1",
      confirmed: true,
      createdAt: 9,
    });
  });
});
