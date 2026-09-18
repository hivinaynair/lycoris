import { describe, expect, it } from "bun:test";
import { replyPartsWithTxLinks, truncateTxHash } from "./tx-hash-display";

const HASH = "0xc736c8f80e9645e897c2b373ecf88439a6b87cf6c1e9a9308dae02f4f03fc1c0";

describe("truncateTxHash", () => {
  it("keeps 0x, an ellipsis, and the last four hex characters", () => {
    expect(truncateTxHash(HASH)).toBe("0x...c1c0");
  });
});

describe("replyPartsWithTxLinks", () => {
  it("turns a settlement hash into a Base Sepolia BaseScan link", () => {
    const reply = `Settlement confirmed on Base Sepolia at ${HASH}.`;
    expect(replyPartsWithTxLinks(reply)).toEqual([
      { type: "text", id: "text:0", value: "Settlement confirmed on Base Sepolia at " },
      {
        type: "tx",
        id: "tx:40",
        hash: HASH,
        href: `https://sepolia.basescan.org/tx/${HASH}`,
        label: "0x...c1c0",
      },
      { type: "text", id: "text:106", value: "." },
    ]);
  });

  it("leaves addresses and other prose alone", () => {
    const reply = "Paid from 0x200c79647C5F73DDc2dBb204dce9C912F494b603.";
    expect(replyPartsWithTxLinks(reply)).toEqual([{ type: "text", id: "text:0", value: reply }]);
  });
});
