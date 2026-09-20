import {
  createRequestStateCodec,
  McpServer,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import type { SettleMcpOptions } from "./options.ts";
import type { PayPhase } from "./state.ts";
import { createMemoryStore } from "./store.ts";
import { getDecisionRecordTool, getPaymentStatus } from "./tools/evidence.ts";
import { getAgentIdentity, getBalance, getMandate } from "./tools/identity.ts";
import { payForResourceTool } from "./tools/pay.ts";
import { quoteResourceTool } from "./tools/quote.ts";

const UrlArgs = z.object({ url: z.string() });
const PayIdArgs = z.object({ pay_id: z.string() });

/**
 * Create a Settle Kit MCP server.
 *
 * Protocol revision 2026-07-28, modern-only. Serve with `{ legacy: "reject" }`.
 */
export function createSettleMcpServer(options: SettleMcpOptions): McpServer {
  const store = options.store ?? createMemoryStore();
  const stateCodec = createRequestStateCodec<PayPhase>({
    key: options.requestStateKey ?? crypto.getRandomValues(new Uint8Array(32)),
    ttlSeconds: options.requestStateTtlSeconds ?? 300,
    bind: (ctx) => String(ctx.mcpReq.method),
  });

  const server = new McpServer(
    { name: "settle-kit", version: "0.0.1" },
    {
      capabilities: { tools: {} },
      requestState: { verify: stateCodec.verify },
    },
  );

  server.registerTool(
    "get_agent_identity",
    {
      title: "Agent identity",
      description: "The configured payer address, prefixed agent id, and ERC-8004 registration.",
      inputSchema: z.object({}),
    },
    async () => getAgentIdentity(options),
  );

  server.registerTool(
    "get_mandate",
    {
      title: "Mandate",
      description: "The configured AP2 mandate: cap, expiry, bound merchant, spent and remaining.",
      inputSchema: z.object({}),
    },
    async () => getMandate(options, store),
  );

  server.registerTool(
    "get_balance",
    {
      title: "USDC balance",
      description: "The configured agent's USDC balance as a money object.",
      inputSchema: z.object({}),
    },
    async () => getBalance(options),
  );

  server.registerTool(
    "quote_resource",
    {
      title: "Quote a resource",
      description: "x402 terms and a preclear verdict for a URL. Does not spend.",
      inputSchema: UrlArgs,
    },
    async ({ url }) => quoteResourceTool(url, options),
  );

  server.registerTool(
    "pay_for_resource",
    {
      title: "Pay for a resource",
      description: "Buy an x402-gated resource. Idempotent for the same business event.",
      inputSchema: UrlArgs,
    },
    async ({ url }, ctx: ServerContext) =>
      payForResourceTool(url, options, store, {
        requestState: () => ctx.mcpReq.requestState<PayPhase>(),
        inputResponses: ctx.mcpReq.inputResponses,
        mint: (phase) => stateCodec.mint(phase, ctx),
      }),
  );

  server.registerTool(
    "get_payment_status",
    {
      title: "Payment status",
      description: "Status, settlement hash and explorer link for a pay_ id.",
      inputSchema: PayIdArgs,
    },
    async ({ pay_id }) => getPaymentStatus(pay_id, store),
  );

  server.registerTool(
    "get_decision_record",
    {
      title: "Decision record",
      description: "Facilitator evidence for a pay_ id, including the failing gate.",
      inputSchema: PayIdArgs,
    },
    async ({ pay_id }) => getDecisionRecordTool(pay_id, store),
  );

  return server;
}
