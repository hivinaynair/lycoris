import { createDb, schema } from "@repo/db";
import { DEMO_SCENARIO_AGENTS } from "@repo/shared/demo";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DELEGATOR_KEY } from "./config.js";
import { ensureMandate } from "./mandates.js";

// Refresh existing identities only: no faucet requests, registration, or payments.
const db = createDb();
const rows = await db.select().from(schema.agents);
const delegator = privateKeyToAccount(DELEGATOR_KEY);
for (const agentName of DEMO_SCENARIO_AGENTS) {
  const row = rows.find((agent) => agent.name === agentName);
  if (!row) throw new Error(`Bootstrap identity first: ${agentName}`);
  await ensureMandate({
    delegator,
    agentName,
    address: row.address as Address,
    addressLower: row.address.toLowerCase(),
    onChainAgentId: row.agentId,
  });
}
console.log("Refreshed local demo mandates; no funds moved.");
