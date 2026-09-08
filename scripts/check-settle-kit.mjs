import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSdkSource, packageAllowed } from "./lib/settle-kit-boundaries.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;
for (const name of ["core", "react", "agents"]) {
  const packageDir = join(root, "packages/settle-kit", name);
  const dir = join(packageDir, "src");
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  for (const dep of Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  })) {
    if (!packageAllowed(name, dep)) {
      console.error(`${name}: forbidden manifest dependency ${dep}`);
      failed = true;
    }
  }
  for await (const file of new Bun.Glob("**/*.{ts,tsx}").scan(dir)) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const filename = join(dir, file);
    for (const error of checkSdkSource(name, filename, readFileSync(filename, "utf8"), dir)) {
      console.error(`${name}/${file}: ${error}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("ok: settle-kit package imports and manifests");
