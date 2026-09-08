import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readSdkManifests, registry, run } from "./lib/sdk-release.mjs";

const version = process.argv[2];
if (!version) throw new Error("Expected the version from the settle-kit-v tag");
const artifacts = resolve(process.argv[3] ?? "dist/settle-kit");
const packages = await readSdkManifests(version);
const dryRun = process.argv.includes("--dry-run");
if (
  !dryRun &&
  packages.some(({ manifest }) => !manifest.license || manifest.license === "UNLICENSED")
)
  throw new Error(
    "Choose and include a public SDK license before publishing; see docs/settle-kit-releases.md",
  );
const tag = version.includes("-") ? "next" : "latest";
for (const { name, manifest } of packages) {
  const tarball = join(artifacts, `${name}.tgz`);
  if (dryRun) {
    await run(["bun", "publish", tarball, "--access", "public", "--tag", tag, "--dry-run"]);
    continue;
  }
  const response = await fetch(`${registry}/${encodeURIComponent(manifest.name)}/${version}`);
  if (response.ok) {
    const published = await response.json();
    const integrity = `sha512-${createHash("sha512")
      .update(await readFile(tarball))
      .digest("base64")}`;
    if (published.dist?.integrity !== integrity)
      throw new Error(
        `${manifest.name}@${version} already exists with different contents. Use a new version.`,
      );
    console.log(`${manifest.name}@${version} already exists; skipping for release recovery`);
    continue;
  }
  if (response.status !== 404) throw new Error(`Registry check failed: ${response.status}`);
  await run(["bun", "publish", join(artifacts, `${name}.tgz`), "--access", "public", "--tag", tag]);
}
