import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertReleaseVersion, root, run, sdkPackages } from "./lib/sdk-release.mjs";

const version = process.argv[2];
assertReleaseVersion(version ?? "");
for (const name of sdkPackages) {
  const path = join(root, "packages/settle-kit", name, "package.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.version = version;
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
await run(["bun", "install", "--lockfile-only", "--ignore-scripts"]);
console.log(
  `SDK versions updated to ${version}. Review and commit the manifests and bun.lock before tagging.`,
);
