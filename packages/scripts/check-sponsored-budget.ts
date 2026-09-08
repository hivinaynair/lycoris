import { createDb } from "@repo/db";
import { sql } from "drizzle-orm";

const db = createDb();
const sponsor = `budget-test-${crypto.randomUUID()}`;
const ids = Array.from({ length: 12 }, () => crypto.randomUUID());
try {
  const results = await Promise.allSettled(
    ids.map((id) =>
      db.execute(
        sql`SELECT * FROM reserve_sponsored_checkout(${id}::uuid, ${sponsor}, 'test-recipient')`,
      ),
    ),
  );
  if (results.filter((r) => r.status === "fulfilled").length !== 10)
    throw new Error("Concurrent budget reservation exceeded or missed the cap.");
  const index = results.findIndex((r) => r.status === "fulfilled");
  await db.execute(
    sql`SELECT * FROM reserve_sponsored_checkout(${ids[index]}::uuid, ${sponsor}, 'test-recipient')`,
  );
  const count = await db.execute(
    sql`SELECT count(*)::int AS count FROM sponsored_checkout_payments WHERE sponsor = ${sponsor}`,
  );
  if (count.rows[0]?.count !== 10) throw new Error("Retry allocated another budget slot.");
  console.log("PASS: 12 concurrent requests reserve exactly 10 slots; duplicate reuses its slot.");
} finally {
  await db.execute(sql`DELETE FROM sponsored_checkout_payments WHERE sponsor = ${sponsor}`);
}
