import { createDb } from "@repo/db";
import { sql } from "drizzle-orm";

// The Neon driver takes one statement per execute, which is why the sibling
// setup script splits its SQL by hand. Same approach: the migration is a DO
// block followed by an ALTER, and the ALTER is where the second one starts.
const source = await Bun.file(new URL("./sponsored-checkout-4337.sql", import.meta.url)).text();
const split = source.indexOf("ALTER TABLE sponsored_checkout_payments\n  ADD COLUMN");
if (split < 0) throw new Error("Could not find the ADD COLUMN statement to split on");

const db = createDb();
await db.execute(sql.raw(source.slice(0, split)));
await db.execute(sql.raw(source.slice(split)));

const columns = await db.execute(
  sql`SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sponsored_checkout_payments' ORDER BY ordinal_position`,
);
console.log("sponsored_checkout_payments:", columns.rows.map((r) => r.column_name).join(", "));
