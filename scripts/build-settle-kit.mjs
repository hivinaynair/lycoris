import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const name = process.argv[2];
if (!["core", "react", "agents", "server"].includes(name))
  throw new Error("Expected SDK package name");
const cwd = join(import.meta.dirname, "../packages/settle-kit", name);
// Emit modules rather than bundling: this preserves React client boundaries and
// leaves dependencies external. Explicit .js specifiers also work in Node ESM.
await rm(join(cwd, "dist"), { recursive: true, force: true });
const types = Bun.spawn(
  [
    "bunx",
    "tsc",
    "--noEmit",
    "false",
    "--declaration",
    "--declarationMap",
    "false",
    "--incremental",
    "false",
    "--outDir",
    "dist",
  ],
  { cwd, stdout: "inherit", stderr: "inherit" },
);
if ((await types.exited) !== 0) throw new Error("SDK declarations failed");
async function fixSpecifiers(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await fixSpecifiers(file);
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
      const source = await readFile(file, "utf8");
      await writeFile(
        file,
        source.replace(
          /(from\s+|import\s*\()(["'])(\.{1,2}\/[^"']+)\2/g,
          (match, prefix, quote, specifier) =>
            /\.[a-z]+$/i.test(specifier) ? match : `${prefix}${quote}${specifier}.js${quote}`,
        ),
      );
    }
  }
}
await fixSpecifiers(join(cwd, "dist"));
if (name === "react") {
  await mkdir(join(cwd, "dist"), { recursive: true });
  const css = Bun.spawn(
    [
      "bunx",
      "--no-install",
      "@tailwindcss/cli",
      "-i",
      "src/styles.css",
      "-o",
      "dist/styles.css",
      "--minify",
    ],
    { cwd, stdout: "inherit", stderr: "inherit" },
  );
  if ((await css.exited) !== 0) throw new Error("SDK Tailwind compilation failed");
}
