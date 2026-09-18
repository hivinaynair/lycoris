import { createDb } from "@repo/db";
import { SPONSORED_CHECKOUT_BUDGET } from "@repo/shared/demo";
import { sql } from "drizzle-orm";

// One CREATE OR REPLACE FUNCTION, so unlike the 4337 migration there is nothing
// to split: the whole file is a single statement as far as the Neon driver is
// concerned. Re-running it is a no-op that reinstalls the same body.
const source = await Bun.file(new URL("./sponsored-budget-50.sql", import.meta.url)).text();

const db = createDb();
await db.execute(sql.raw(source));

// Prove the installed function agrees with the constant the UI quotes, rather
// than trusting that the file on disk is the one that ran.
const definition = await db.execute(
  sql`SELECT prosrc FROM pg_proc WHERE proname = 'reserve_sponsored_checkout'`,
);
const body = String(definition.rows[0]?.prosrc ?? "");
const cap = body.match(/>=\s*(\d+)\s*THEN/)?.[1];
if (cap !== String(SPONSORED_CHECKOUT_BUDGET))
  throw new Error(
    `Installed cap is ${cap}, but SPONSORED_CHECKOUT_BUDGET is ${SPONSORED_CHECKOUT_BUDGET}`,
  );

const used = await db.execute(sql`SELECT count(*)::int AS n FROM sponsored_checkout_payments`);
console.log(`Sponsored budget now ${cap}; ${used.rows[0]?.n} purchases already recorded.`);
