import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const host = await mkdtemp(join(tmpdir(), "settle-kit-next-"));
console.log(`Independent host and evidence: ${host}`);
async function run(command, cwd = host) {
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((await child.exited) !== 0) throw new Error(`Failed: ${command.join(" ")}`);
}
await cp(join(root, "e2e/fixtures/settle-kit-next"), host, { recursive: true });
for (const name of ["core", "react"]) {
  await run(
    ["bun", "pm", "pack", "--filename", join(host, `${name}.tgz`), "--ignore-scripts", "--quiet"],
    join(root, "packages/settle-kit", name),
  );
}
// Pin the fixture to the versions installed in this checkout, not registry latest.
const resolveHost = createRequire(join(root, "apps/lycoris/package.json"));
async function installed(name) {
  return JSON.parse(await readFile(resolveHost.resolve(`${name}/package.json`), "utf8")).version;
}
await writeFile(
  join(host, "package.json"),
  JSON.stringify(
    {
      name: "settle-kit-independent-host",
      private: true,
      type: "module",
      scripts: { build: "next build", start: "next start" },
      dependencies: {
        "@settle-kit/core": "file:./core.tgz",
        "@settle-kit/react": "file:./react.tgz",
        next: await installed("next"),
        react: await installed("react"),
        "react-dom": await installed("react-dom"),
        viem: await installed("viem"),
      },
      devDependencies: {
        typescript: await installed("typescript"),
        "@types/react": await installed("@types/react"),
        "@types/node": await installed("@types/node"),
      },
      overrides: { "@settle-kit/core": "file:./core.tgz" },
    },
    null,
    2,
  ),
);
await run(["bun", "install"]);
await run(["bun", "run", "build"]);
const reservation = Bun.serve({ port: 0, fetch: () => new Response() });
const port = reservation.port;
reservation.stop(true);
const server = Bun.spawn(["bun", "run", "start", "--port", String(port)], {
  cwd: host,
  stdout: "inherit",
  stderr: "inherit",
});
const url = `http://localhost:${port}`;
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await Bun.sleep(500);
  }
  if (!ready) throw new Error("Independent Next host did not start");
  const requireE2e = createRequire(join(root, "e2e/web/package.json"));
  const { chromium } = await import(requireE2e.resolve("@playwright/test"));
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Choose hoodie" }).click();
  await page.getByRole("button", { name: "Pay USDC" }).click();
  await page.getByText("Payment confirmed: 12.50 USDC.").waitFor();
  await page.getByRole("button", { name: "Choose patch" }).click();
  await page.getByRole("button", { name: "Pay USDC" }).click();
  await page.getByText("Payment confirmed: 4.00 USDC.").waitFor();
  if (
    (await page.getByTestId("sent").textContent()) !== "2" ||
    (await page.getByTestId("confirmed").textContent()) !== "2"
  )
    throw new Error("Expected exactly two transfers and two confirmations");
  if (errors.length) throw new Error(errors.join("\n"));
  await page.screenshot({ path: join(host, "embed-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
  )
    throw new Error("Mobile overflow");
  await page.screenshot({ path: join(host, "embed-mobile.png"), fullPage: true });
  console.log(
    "PASS: packed SDKs installed outside the workspace; Next production build; two purchases under one Provider; desktop/mobile rendering; no browser errors.",
  );
} finally {
  await browser?.close();
  server.kill();
  await server.exited;
}
