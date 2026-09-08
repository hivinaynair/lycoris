import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readSdkManifests, run, validatePackedManifest } from "./lib/sdk-release.mjs";

const artifacts = resolve(process.argv[2] ?? "dist/settle-kit");
const host = await mkdtemp(join(tmpdir(), "settle-kit-packages-"));
const packages = await readSdkManifests();
const dependencies = {};
for (const pkg of packages) {
  const tarball = join(artifacts, `${pkg.name}.tgz`);
  const unpack = join(host, pkg.name);
  await run(["mkdir", "-p", unpack]);
  await run(["tar", "-xzf", tarball, "-C", unpack]);
  const manifest = JSON.parse(await readFile(join(unpack, "package/package.json"), "utf8"));
  if (manifest.name !== pkg.manifest.name || manifest.version !== pkg.manifest.version)
    throw new Error(`${pkg.name}: artifact does not match source manifest`);
  validatePackedManifest(manifest, await readdir(unpack, { recursive: true }));
  dependencies[manifest.name] = `file:${tarball}`;
}
await writeFile(
  join(host, "package.json"),
  JSON.stringify(
    {
      private: true,
      type: "module",
      dependencies: {
        ...dependencies,
        react: "19.2.0",
        "react-dom": "19.2.0",
        next: "16.3.0",
        viem: "^2",
        typescript: "5.9.2",
        "@types/react": "19.2.2",
        "@types/node": "^22",
      },
      overrides: dependencies,
    },
    null,
    2,
  ),
);
await run(["bun", "install", "--ignore-scripts"], host);
const imports = [
  "@settle-kit/core",
  "@settle-kit/react",
  "@settle-kit/react/ui",
  "@settle-kit/agents",
  "@settle-kit/server/next",
];
await writeFile(
  join(host, "consumer.mjs"),
  imports
    .filter((name) => name !== "@settle-kit/server/next")
    .map((name) => `await import(${JSON.stringify(name)});`)
    .join("\n"),
);
// Node loads the compiled exports, while Bun exercises the advertised source condition.
await run(["node", "consumer.mjs"], host);
await run(["bun", "consumer.mjs"], host);
await writeFile(
  join(host, "consumer.ts"),
  imports
    .map((name, i) => `import * as sdk${i} from ${JSON.stringify(name)};\nvoid sdk${i};`)
    .join("\n"),
);
await run(
  [
    "bunx",
    "--no-install",
    "tsc",
    "--noEmit",
    "--skipLibCheck",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "consumer.ts",
  ],
  host,
);
console.log(`All four SDK packages passed independent import and declaration checks: ${host}`);
