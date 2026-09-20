import { createDb } from "@repo/db";
import { SPONSORED_CHECKOUT_BUDGET } from "@repo/shared/demo";
import { sql } from "drizzle-orm";

// Read-only: do not reserve a purchase, change a cap, or contact a wallet provider.
const db = createDb();
const definition = await db.execute(
  sql`SELECT prosrc FROM pg_proc
      WHERE oid = to_regprocedure('public.reserve_sponsored_checkout(uuid,text,text)')`,
);
const cap = String(definition.rows[0]?.prosrc ?? "").match(/>=\s*(\d+)\s*THEN/)?.[1];
if (cap !== String(SPONSORED_CHECKOUT_BUDGET))
  throw new Error(
    `Configured database cap is ${cap ?? "missing"}; expected ${SPONSORED_CHECKOUT_BUDGET}. Review scripts/demo/setup-sponsored-checkout.ts.`,
  );

const columns = await db.execute(
  sql`SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sponsored_checkout_payments'`,
);
const names = new Set(columns.rows.map((row) => row.column_name));
for (const column of ["funding_tx_hash", "user_op_hash", "payer"])
  if (!names.has(column))
    throw new Error(`Missing ${column}. Review scripts/demo/setup-sponsored-checkout.ts.`);

const counts = await db.execute(
  sql`SELECT count(*)::int AS sponsors, COALESCE(max(used), 0)::int AS largest_usage
      FROM (SELECT count(*) AS used FROM sponsored_checkout_payments GROUP BY sponsor) budgets`,
);
console.log(`Configured database: cap ${cap} per sponsor; smart-account columns present.`);
console.log(
  `Sponsors with reservations: ${counts.rows[0]?.sponsors}; largest reservation count: ${counts.rows[0]?.largest_usage}.`,
);
console.log(
  "Read-only check. Gas-provider limits and deployed environment parity are not checked.",
);
