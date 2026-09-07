import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packages = ["core", "react", "agents"];

const forbidden = {
  core: [
    /@settle-kit\/react/,
    /@settle-kit\/agents/,
    /from ["']react["']/,
    /from ["']wagmi["']/,
    /from ["']eve["']/,
  ],
  react: [/@settle-kit\/agents/],
  agents: [/@settle-kit\/react/, /from ["']react["']/],
};

let failed = false;
for (const name of packages) {
  const dir = join(root, "packages/settle-kit", name, "src");
  const glob = new Bun.Glob("**/*.{ts,tsx}");
  for await (const file of glob.scan(dir)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const source = readFileSync(join(dir, file), "utf8");
    for (const pattern of forbidden[name]) {
      if (pattern.test(source)) {
        console.error(`${name}/${file}: forbidden import matching ${pattern}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("ok: settle-kit package imports");
