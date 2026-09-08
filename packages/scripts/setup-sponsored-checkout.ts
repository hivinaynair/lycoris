import { CdpClient } from "@coinbase/cdp-sdk";
import { createDb } from "@repo/db";
import { sql } from "drizzle-orm";

const source = await Bun.file(new URL("./sponsored-checkout.sql", import.meta.url)).text();
const split = source.indexOf("-- Serialize");
const db = createDb();
await db.execute(sql.raw(source.slice(0, split)));
await db.execute(sql.raw(source.slice(split)));
const cdp = new CdpClient();
const account = await cdp.evm.getOrCreateAccount({ name: "lycoris-checkout-sponsor" });
console.log(`SPONSORED_WALLET_ADDRESS=${account.address}`);
console.log("Database ready. Fund this dedicated wallet with 1 test USDC and test ETH.");
