import { schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

/** Bootstrapped wallet for an agent, used only when the run never paid. */
export async function payerFallback(agentName: string) {
  const [row] = await getDb()
    .select({ address: schema.agents.address })
    .from(schema.agents)
    .where(eq(schema.agents.name, agentName))
    .limit(1);
  return row?.address ?? "0x";
}
