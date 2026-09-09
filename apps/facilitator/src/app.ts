import { schema } from "@repo/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { isHex, keccak256 } from "viem";
import { getDb } from "./lib/db.js";
import { verifyDeps } from "./lib/deps.js";
import { parseBigIntField, readJsonObject } from "./lib/http.js";
import { type PaymentBody, readPaymentBody } from "./lib/payment.js";
import { pipelineGateFor } from "./lib/pipeline-progress.js";
import { evaluatePreclear } from "./lib/preclear.js";
import { requestCtx } from "./lib/request-context.js";
import { facilitator } from "./lib/x402.js";

const app = new Hono();

app.get("/supported", (c) => c.json(facilitator.getSupported()));

/** Parse the payment body, run one facilitator call inside the request's mandate scope. */
async function paymentRoute(c: Context, run: (body: PaymentBody) => Promise<unknown>) {
  try {
    const body = await readPaymentBody(c);
    if (body instanceof Response) return body;
    const mandateJson = c.req.header("X-AP2-Mandate");
    const result = await requestCtx.run({ mandateJson }, () => run(body));
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

app.post("/verify", (c) =>
  paymentRoute(c, (body) => facilitator.verify(body.paymentPayload, body.paymentRequirements)),
);

app.post("/settle", (c) =>
  paymentRoute(c, (body) => facilitator.settle(body.paymentPayload, body.paymentRequirements)),
);

app.get("/decision-records/by-settlement/:txHash", async (c) => {
  const txHash = c.req.param("txHash");
  if (!isHex(txHash) || txHash.length !== 66) {
    return c.json({ error: "txHash must be a 32-byte hex hash" }, 400);
  }
  const paymentHash = keccak256(txHash);
  const rows = await getDb()
    .select({ decisionRecord: schema.settlementAttestations.decisionRecord })
    .from(schema.settlementAttestations)
    .where(eq(schema.settlementAttestations.paymentHash, paymentHash))
    .limit(1);
  return c.json({ decisionRecord: rows[0]?.decisionRecord ?? null });
});

app.get("/decision-records/by-auth-nonce/:nonce", async (c) => {
  const nonce = c.req.param("nonce");
  const rows = await getDb()
    .select({ decisionRecord: schema.settlementAttestations.decisionRecord })
    .from(schema.settlementAttestations)
    .where(eq(schema.settlementAttestations.authorizationNonce, nonce))
    .orderBy(desc(schema.settlementAttestations.createdAt))
    .limit(1);
  return c.json({ decisionRecord: rows[0]?.decisionRecord ?? null });
});

app.get("/decision-records/latest", async (c) => {
  const payer = c.req.query("payer")?.toLowerCase();
  if (!payer) return c.json({ error: "payer is required" }, 400);
  const rows = await getDb()
    .select({ decisionRecord: schema.settlementAttestations.decisionRecord })
    .from(schema.settlementAttestations)
    .where(eq(schema.settlementAttestations.payerAddress, payer))
    .orderBy(desc(schema.settlementAttestations.createdAt))
    .limit(1);
  return c.json({ decisionRecord: rows[0]?.decisionRecord ?? null });
});

app.get("/pipeline/progress", (c) => {
  const payer = c.req.query("payer");
  if (!payer?.startsWith("0x")) return c.json({ error: "payer is required" }, 400);
  const since = Number(c.req.query("since") ?? 0);
  return c.json({
    gate: pipelineGateFor(payer, Number.isFinite(since) ? since : 0),
  });
});

app.post("/preclear", async (c) => {
  try {
    const body = await readJsonObject(c);
    if (body instanceof Response) return body;
    if (typeof body.payer !== "string" || !body.payer.startsWith("0x")) {
      return c.json({ error: "payer is required" }, 400);
    }
    const amountAtomic = parseBigIntField(body.amountAtomic, "amountAtomic");
    if (typeof amountAtomic === "string") return c.json({ error: amountAtomic }, 400);
    const payer = body.payer;
    const resource = typeof body.resource === "string" ? body.resource : undefined;
    const mandateJson = c.req.header("X-AP2-Mandate");
    const result = await requestCtx.run({ mandateJson }, () =>
      evaluatePreclear(
        {
          payer,
          amountAtomic,
          resource,
        },
        verifyDeps,
      ),
    );
    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

export default app;
