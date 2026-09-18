import { createDb } from "@repo/db";
import { SPONSORED_CHECKOUT_BUDGET } from "@repo/shared/demo";
import { sql } from "drizzle-orm";

const db = createDb();
const sponsor = `budget-test-${crypto.randomUUID()}`;
// Two more than the cap, so the overflow is genuinely concurrent rather than
// sequential: the point is that the advisory lock serializes the count.
const ids = Array.from({ length: SPONSORED_CHECKOUT_BUDGET + 2 }, () => crypto.randomUUID());
try {
  const results = await Promise.allSettled(
    ids.map((id) =>
      db.execute(
        sql`SELECT * FROM reserve_sponsored_checkout(${id}::uuid, ${sponsor}, 'test-recipient')`,
      ),
    ),
  );
  if (results.filter((r) => r.status === "fulfilled").length !== SPONSORED_CHECKOUT_BUDGET)
    throw new Error("Concurrent budget reservation exceeded or missed the cap.");
  const index = results.findIndex((r) => r.status === "fulfilled");
  await db.execute(
    sql`SELECT * FROM reserve_sponsored_checkout(${ids[index]}::uuid, ${sponsor}, 'test-recipient')`,
  );
  const count = await db.execute(
    sql`SELECT count(*)::int AS count FROM sponsored_checkout_payments WHERE sponsor = ${sponsor}`,
  );
  if (count.rows[0]?.count !== SPONSORED_CHECKOUT_BUDGET)
    throw new Error("Retry allocated another budget slot.");
  console.log(
    `PASS: ${ids.length} concurrent requests reserve exactly ${SPONSORED_CHECKOUT_BUDGET} slots; duplicate reuses its slot.`,
  );
} finally {
  await db.execute(sql`DELETE FROM sponsored_checkout_payments WHERE sponsor = ${sponsor}`);
}
