import { join, resolve } from "node:path";
import { readSdkManifests, run } from "./lib/sdk-release.mjs";

// The existing package check proves the tarballs install and import under Node
// and Bun, and that a NodeNext consumer type checks against them. It cannot see
// how the exports map resolves for consumers using a different mode, and it
// cannot see a condition in the wrong order, because it only ever exercises one
// resolution. These two tools cover that.
//
// publint reads the manifest: condition ordering, file extensions against the
// module type, targets that do not exist.
//
// attw resolves every entry point the way each toolchain actually would, and
// reports a type that is unreachable or misrepresented. The packages are ESM
// only on purpose, so the esm-only profile is the correct baseline: it treats
// the absence of a CJS build as intended rather than as a finding.

// attw resolves every entry point as a module, so a stylesheet export is
// reported as unresolvable. That is a limit of the tool, not a defect in the
// package: the CSS entry is consumed by a bundler, never by a module resolver.
const notModules = { react: ["styles.css"] };

const artifacts = resolve(process.argv[2] ?? "dist/settle-kit");
const packages = await readSdkManifests();
for (const pkg of packages) {
  await run(["bunx", "publint", "--strict", pkg.cwd]);
  // The tarball goes first: --exclude-entrypoints is variadic and would
  // otherwise swallow the path as another entry point name.
  await run([
    "bunx",
    "attw",
    join(artifacts, `${pkg.name}.tgz`),
    "--profile",
    "esm-only",
    ...(notModules[pkg.name]?.flatMap((entry) => ["--exclude-entrypoints", entry]) ?? []),
  ]);
}
console.log(`All ${packages.length} SDK packages passed manifest and resolution checks.`);
