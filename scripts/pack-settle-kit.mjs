import { resolve } from "node:path";
import { packSdk } from "./lib/sdk-release.mjs";

await packSdk(resolve(process.argv[2] ?? "dist/settle-kit"), process.argv[3]);
