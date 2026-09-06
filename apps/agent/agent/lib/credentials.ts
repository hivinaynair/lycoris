import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { parseSerializedMandateHeader, serializeMandateHeader } from "@repo/shared/mandate-header";

type AgentCredential = { entry: MandateHeaderValue; header: string };

function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parseJsonObject(parsed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeMandateMap(raw: Record<string, unknown>): Record<string, unknown> {
  const source =
    raw.mandates && typeof raw.mandates === "object" && !Array.isArray(raw.mandates)
      ? (raw.mandates as Record<string, unknown>)
      : raw;

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function readMandateFile(): Record<string, unknown> {
  if (process.env.MANDATES_JSON) {
    const parsed = parseJsonObject(process.env.MANDATES_JSON);
    if (!parsed) {
      console.warn("[credentials] MANDATES_JSON is not valid JSON");
      return {};
    }
    return normalizeMandateMap(parsed);
  }

  const candidates = [
    process.env.MANDATE_FILE,
    resolve(process.cwd(), "mandates.json"),
    resolve(import.meta.dirname, "..", "..", "mandates.json"),
  ].filter((path): path is string => Boolean(path));

  for (const filePath of candidates) {
    try {
      if (!existsSync(filePath)) continue;
      const parsed = parseJsonObject(readFileSync(filePath, "utf-8"));
      if (parsed) return normalizeMandateMap(parsed);
    } catch {
      /* try the next path */
    }
  }

  console.warn("[credentials] mandates.json not found");
  return {};
}

function parseMandateEntry(raw: unknown): MandateHeaderValue | undefined {
  if (typeof raw === "string") {
    const parsed = parseJsonObject(raw);
    return parsed ? parseSerializedMandateHeader(parsed) : undefined;
  }
  return parseSerializedMandateHeader(raw);
}

export function getAp2CredentialForAgent(agentAddress: string): AgentCredential | undefined {
  const normalised = agentAddress.toLowerCase();
  const file = readMandateFile();
  const raw = file[normalised];
  if (!raw) return undefined;

  const entry = parseMandateEntry(raw);
  if (!entry || entry.mandate.payload.agent.toLowerCase() !== normalised) {
    return undefined;
  }

  if (entry.mandate.payload.expiry < BigInt(Math.floor(Date.now() / 1000))) {
    return undefined;
  }

  return {
    entry,
    header: serializeMandateHeader(entry),
  };
}
