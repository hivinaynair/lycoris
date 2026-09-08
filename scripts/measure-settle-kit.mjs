import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = join(import.meta.dirname, "..");
const require = createRequire(join(root, "e2e/web/package.json"));
const { build } = require("esbuild");
const imports = {
  core: 'export { createCheckout, createSettleConfig } from "./packages/settle-kit/core/dist/index.js";',
  react: 'export { SettleProvider, useCheckout } from "./packages/settle-kit/react/dist/index.js";',
  ui: 'export { SettleProvider, useCheckout } from "./packages/settle-kit/react/dist/index.js"; export { Checkout } from "./packages/settle-kit/react/dist/ui.js";',
};
const measurements = {};
for (const [name, contents] of Object.entries(imports)) {
  const result = await build({
    stdin: { contents, resolveDir: root },
    bundle: true,
    format: "esm",
    platform: "browser",
    minify: true,
    splitting: true,
    outdir: join(root, "test-results/bundle", name),
    write: false,
    metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
  });
  const scripts = result.outputFiles.filter((file) => file.path.endsWith(".js"));
  const entry = scripts.find((file) => file.path.endsWith("/stdin.js"));
  measurements[name] = {
    entryBytes: entry?.contents.length,
    entryGzipBytes: entry ? gzipSync(entry.contents).length : 0,
    allChunksBytes: scripts.reduce((n, f) => n + f.contents.length, 0),
    allChunksGzipBytes: scripts.reduce((n, f) => n + gzipSync(f.contents).length, 0),
    chunks: scripts.length,
    includesAgentSdk: Object.keys(result.metafile.inputs).some(
      (file) => file.includes("settle-kit/agents") || file.includes("@x402"),
    ),
  };
  if (measurements[name].includesAgentSdk) throw new Error("Agent code leaked into checkout");
}
const css = await readFile(join(root, "packages/settle-kit/react/dist/styles.css"));
const report = {
  measuredAt: new Date().toISOString(),
  methodology:
    "esbuild production minification, ESM splitting, compiled package entry points. React and ReactDOM external; viem included. Gzip sums per-file sizes. SDK costs only, not a Next app or network latency benchmark.",
  measurements,
  css: { bytes: css.length, gzipBytes: gzipSync(css).length },
};
await mkdir(join(root, "test-results"), { recursive: true });
await writeFile(join(root, "test-results/settle-kit-bundle.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
