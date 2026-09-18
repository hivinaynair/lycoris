import { describe, expect, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import { BURNER_KEY_STORAGE_KEY, type KeyStorage, loadOrCreateBurnerKey } from "./burner-key";

/** An in-memory stand-in for `localStorage`, narrowed to the two methods we use. */
function memoryStorage(seed?: string): KeyStorage & { readonly store: Map<string, string> } {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(BURNER_KEY_STORAGE_KEY, seed);
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

/** Storage as a browser hands it over in private mode or with site data blocked. */
function hostileStorage({ read, write }: { read: boolean; write: boolean }): KeyStorage {
  return {
    getItem: () => {
      if (read) throw new Error("The operation is insecure.");
      return null;
    },
    setItem: () => {
      if (write) throw new Error("The quota has been exceeded.");
    },
  };
}

describe("loadOrCreateBurnerKey", () => {
  test("generates a key viem can turn into an account", () => {
    const key = loadOrCreateBurnerKey(memoryStorage());

    expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    // The only definition of well-formed that matters: signing works with it.
    expect(privateKeyToAccount(key).address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test("returns the same key on a second call", () => {
    const storage = memoryStorage();

    const first = loadOrCreateBurnerKey(storage);
    const second = loadOrCreateBurnerKey(storage);

    // A new key each load would mean a new smart account address each load, and the
    // visitor's faucet-funded balance would vanish between page views.
    expect(second).toBe(first);
  });

  test("persists the key it generates under the documented storage key", () => {
    const storage = memoryStorage();

    const key = loadOrCreateBurnerKey(storage);

    expect(storage.store.get(BURNER_KEY_STORAGE_KEY)).toBe(key);
  });

  test("reuses a key written by an earlier session", () => {
    const existing = `0x${"11".repeat(32)}`;
    const storage = memoryStorage(existing);

    expect(loadOrCreateBurnerKey(storage)).toBe(existing);
  });

  test.each([
    ["truncated", "0xdeadbeef"],
    ["not hex at all", "hello"],
    ["empty", ""],
    ["a JSON blob from some other feature", '{"key":"0x1"}'],
    ["off-curve: zero", `0x${"00".repeat(32)}`],
    ["off-curve: above the group order", `0x${"ff".repeat(32)}`],
  ])("replaces a corrupted stored value (%s) rather than throwing", (_label, corrupt) => {
    const storage = memoryStorage(corrupt);

    const key = loadOrCreateBurnerKey(storage);

    expect(key).not.toBe(corrupt);
    expect(privateKeyToAccount(key).address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // The bad value is overwritten, so the next load is a cheap read again.
    expect(storage.store.get(BURNER_KEY_STORAGE_KEY)).toBe(key);
  });

  test("survives storage that throws on read", () => {
    const key = loadOrCreateBurnerKey(hostileStorage({ read: true, write: false }));

    expect(privateKeyToAccount(key).address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test("survives storage that throws on write", () => {
    const key = loadOrCreateBurnerKey(hostileStorage({ read: false, write: true }));

    expect(privateKeyToAccount(key).address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test("survives storage that throws on both read and write", () => {
    const storage = hostileStorage({ read: true, write: true });

    const first = loadOrCreateBurnerKey(storage);
    const second = loadOrCreateBurnerKey(storage);

    // Nothing persists, so the keys differ — an unusable account is the failure we
    // accept here. A throw would take the whole checkout down with it.
    expect(first).not.toBe(second);
    expect(privateKeyToAccount(first).address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});
