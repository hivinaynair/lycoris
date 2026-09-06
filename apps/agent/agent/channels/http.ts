import { DemoAgentName } from "@repo/shared/types";
import { defineChannel, GET } from "eve/channels";
import { isAddress } from "viem";
import { getCdp } from "../lib/cdp.js";

const AGENT_NAME = "Lycoris Agent";
const AGENT_VERSION = "2.0.0";
const AGENT_CAPABILITIES = ["payment", "settlement"];

// Plain HTTP surface for callers that are not agent sessions: the ERC-8004
// metadata document and the bootstrap wallet listing used by scripts. Demo runs
// go through the eve channel instead, driven by the web app's eve/client.
export default defineChannel({
  routes: [
    GET("/health", async () => new Response("ok")),
    GET("/", async () => new Response("ok")),
    GET("/api/agent/:address", async (_req, { params }) => {
      const address = params.address;
      if (!isAddress(address)) {
        return Response.json({ error: "invalid agent address" }, { status: 400 });
      }
      return Response.json({
        address,
        name: AGENT_NAME,
        version: AGENT_VERSION,
        capabilities: AGENT_CAPABILITIES,
      });
    }),
    GET("/agents", async (req) => {
      const secret = process.env.BOOTSTRAP_SECRET;
      if (secret && req.headers.get("Authorization") !== `Bearer ${secret}`) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const cdp = await getCdp();
      const agents = await Promise.all(
        Object.values(DemoAgentName).map(async (agentName) => {
          const account = await cdp.evm.getOrCreateAccount({ name: agentName });
          return { agentName, address: account.address as string };
        }),
      );
      return Response.json(agents);
    }),
  ],
});
