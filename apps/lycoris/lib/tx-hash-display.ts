import { BASE_SEPOLIA_EXPLORER } from "@repo/shared/chains";

const TX_HASH_PATTERN = /0x[a-fA-F0-9]{64}/g;

export type ReplyPart =
  | { type: "text"; id: string; value: string }
  | { type: "tx"; id: string; hash: string; href: string; label: string };

/** `0x` + ellipsis + last 4 hex chars, e.g. `0x...c1c0`. */
export function truncateTxHash(hash: string) {
  return `0x...${hash.slice(-4)}`;
}

export function baseSepoliaTxUrl(hash: string) {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`;
}

export function replyPartsWithTxLinks(text: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TX_HASH_PATTERN)) {
    const hash = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", id: `text:${lastIndex}`, value: text.slice(lastIndex, index) });
    }
    parts.push({
      type: "tx",
      id: `tx:${index}`,
      hash,
      href: baseSepoliaTxUrl(hash),
      label: truncateTxHash(hash),
    });
    lastIndex = index + hash.length;
  }
  if (lastIndex < text.length || parts.length === 0) {
    parts.push({ type: "text", id: `text:${lastIndex}`, value: text.slice(lastIndex) });
  }
  return parts;
}
