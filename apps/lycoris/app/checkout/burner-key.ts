import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export const BURNER_KEY_STORAGE_KEY = "lycoris-burner-key";

/**
 * The slice of `localStorage` this module touches.
 *
 * Narrowed to two methods so a test can hand over a plain object — no DOM, no
 * happy-dom globals — and so the failure modes below stay small enough to reason
 * about.
 */
export type KeyStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

/**
 * DEMO SCAFFOLDING — DO NOT COPY THIS INTO A HOST APPLICATION.
 *
 * Returns the owner key for the visitor's demo smart account, generating and
 * persisting one on first visit. The key lives in `localStorage` in plaintext, which
 * is a deliberate choice for this demo and a bad one anywhere else:
 *
 * - It controls 0.1 *test* USDC on Base Sepolia, and nothing else, ever. There is no
 *   mainnet counterpart of this account and no path for one to acquire real value.
 * - The asset worth defending is the paymaster, and this key does not defend it. The
 *   sponsorship policy in our server route does: it sponsors a USDC `transfer`, to
 *   the merchant, for the exact invoice amount, and nothing else. Someone who steals
 *   this key has bought themselves the right to pay the merchant.
 * - The abuse surface that is actually worth money is the faucet route — mint burner
 *   addresses in a loop and drain the demo's budget. That is a rate-limiting problem,
 *   and it is the same problem wherever this key is kept.
 * - Moving the key to IndexedDB, sessionStorage, or "encrypting" it with material the
 *   page also holds would be theatre: any key this JavaScript can use is a key an XSS
 *   on this page can use. The one real hardening is a credential the page can invoke
 *   but never read — `createWebAuthnCredential` / `toWebAuthnAccount`, which
 *   `toCoinbaseSmartAccount` takes as an owner. We did not take it, because a
 *   biometric prompt is exactly the signup step our README promises this demo has not
 *   got.
 *
 * A host application's key guards real money, so none of the above transfers. Use a
 * connected wallet or a passkey owner there.
 *
 * Never throws. Storage access throws outright in Safari's private mode and wherever
 * site data is blocked, and a read can come back empty or mangled. An unpersisted key
 * is survivable — the visitor simply gets a fresh account on the next load — but a
 * thrown one takes the entire checkout with it.
 */
export function loadOrCreateBurnerKey(storage: KeyStorage): Hex {
  const stored = readKey(storage);
  if (stored) return stored;

  const key = generatePrivateKey();
  writeKey(storage, key);
  return key;
}

/** Reads the stored key, treating anything unusable — including a throw — as absent. */
function readKey(storage: KeyStorage): Hex | null {
  try {
    const stored = storage.getItem(BURNER_KEY_STORAGE_KEY);
    return stored && isPrivateKey(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Persists the key, best effort. A failure here costs the visitor their funded
 * account on the next load; throwing would cost them this checkout.
 */
function writeKey(storage: KeyStorage, key: Hex) {
  try {
    storage.setItem(BURNER_KEY_STORAGE_KEY, key);
  } catch {
    // Intentionally swallowed: see the doc comment above.
  }
}

/**
 * Whether a stored string is a key we can actually sign with.
 *
 * Deriving the account is the check, rather than a length or hex test: a 32-byte hex
 * string can still be zero or above the secp256k1 group order, and viem rejects those
 * only at signing time — which here would be mid-payment, long after we could have
 * quietly replaced the value.
 */
function isPrivateKey(value: string): value is Hex {
  try {
    privateKeyToAccount(value as Hex);
    return true;
  } catch {
    return false;
  }
}
