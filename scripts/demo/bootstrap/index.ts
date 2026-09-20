import { bootstrapAgent, fetchAgentList } from "./agents.js";
import { createBootstrapContext } from "./context.js";

async function main() {
  console.log("[bootstrap] Starting demo bootstrap...");

  const agentList = await fetchAgentList();
  const context = createBootstrapContext();

  console.log(`[bootstrap] Delegator: ${context.delegator.address}`);

  for (const agent of agentList) {
    await bootstrapAgent(context, agent);
  }

  console.log("\n[bootstrap] Done.");
}

main().catch((err) => {
  console.error("[bootstrap] Fatal:", err);
  process.exit(1);
});
