import { type Address, decodeFunctionData, erc20Abi, type Hex } from "viem";

/**
 * The single-call execution wrapper of a Coinbase Smart Wallet.
 *
 * A user operation's `callData` is never the ERC-20 call itself — it is the account
 * asking its own contract to make that call. viem's `toCoinbaseSmartAccount` encodes
 * one call as `execute(target, value, data)` and several as `executeBatch`, verified
 * against `encodeCalls` in viem 2.56.3. A checkout is one transfer, so `execute` is
 * the only wrapper we decode, and a batch simply fails to decode and is refused —
 * which is the answer we want anyway, since a batch is a transfer with a passenger.
 *
 * Exported so the tests encode with the same ABI this file decodes with; a policy
 * checked against a signature nobody sends would pass every test and refuse every
 * real payment.
 */
export const ACCOUNT_EXECUTE_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

/** The one call the paymaster is willing to pay for, as data. */
export type SponsorshipPolicy = {
  /** The token contract the transfer must target. */
  asset: Address;
  /** The only address that may receive it. */
  merchant: Address;
  /** The exact atomic amount — not a ceiling. */
  amount: bigint;
};

export type SponsorshipCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether the paymaster should pay for this user operation.
 *
 * Default deny. This function is the entire reason the demo can keep a spendable
 * private key in `localStorage` (see `app/checkout/burner-key.ts`): a stolen key can
 * only ever produce the one operation below, so stealing it buys the thief the right
 * to pay the merchant. Every widening here — a value cap instead of an exact amount,
 * an allowlist of methods, a batch — hands that thief something else to do with it.
 *
 * Never throws. A malformed `callData` is not an edge case, it is the attack: the
 * caller is an untrusted browser, and a thrown decode would turn a refusal into a 500
 * on a route that has already done the work of deciding.
 */
export function checkSponsorship(callData: Hex, policy: SponsorshipPolicy): SponsorshipCheck {
  const execute = decode(ACCOUNT_EXECUTE_ABI, callData);
  if (!execute) return refuse("callData is not a single account execute call");

  const [target, value, innerData] = execute.args;

  // Sponsoring ETH alongside the transfer would spend the account's own balance on
  // whatever the target does with it, which is not a payment we have agreed to.
  if (value !== 0n) return refuse("execute must not send value");
  if (!sameAddress(target, policy.asset)) return refuse("execute must target the sponsored asset");

  const inner = decode(erc20Abi, innerData);
  if (!inner) return refuse("inner call is not a readable ERC-20 call");
  // `approve` to the merchant looks harmless and is not: it moves nothing, so the
  // paymaster would fund a no-op, and the allowance outlives the checkout.
  if (inner.functionName !== "transfer") return refuse("inner call must be transfer");

  const [recipient, amount] = inner.args;
  if (!sameAddress(recipient, policy.merchant)) return refuse("transfer must pay the merchant");
  // Exact, not "at most": an underpayment settles a purchase that was not paid for,
  // and an overpayment is a transfer we did not quote.
  if (amount !== policy.amount) return refuse("transfer must be for the invoice amount");

  return { ok: true };
}

function refuse(reason: string): SponsorshipCheck {
  return { ok: false, reason };
}

/** Decodes against one ABI, treating anything unreadable as absent rather than fatal. */
function decode<abi extends readonly unknown[]>(abi: abi, data: Hex) {
  try {
    return decodeFunctionData({ abi, data });
  } catch {
    return undefined;
  }
}

/**
 * Addresses are hex strings that carry no canonical casing through JSON, so a
 * case-sensitive comparison would refuse a genuine payment whose client happened to
 * checksum its addresses differently from our config.
 */
function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}
