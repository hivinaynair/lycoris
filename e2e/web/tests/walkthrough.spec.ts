import { expect, test } from "@playwright/test";

test("record the local SDK walkthrough", async ({ browser }) => {
  test.skip(process.env.RECORD_WALKTHROUGH !== "1", "Run bun run record:walkthrough explicitly");
  test.setTimeout(120_000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    recordVideo: { dir: "../../test-results/walkthrough", size: { width: 1440, height: 1080 } },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3003/checkout");
  const started = Date.now();
  const at = async (seconds: number) => {
    const remaining = started + seconds * 1000 - Date.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
  };
  await at(10);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await at(17);
  await page.getByRole("button", { name: "Merchant theme", exact: true }).click();
  await at(24);
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await at(30);
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByTestId("checkout-state")).toHaveText("settled");
  await at(40);
  await page.getByLabel("02 / Payment scenario").selectOption("insufficient");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByTestId("simulation-sends")).toHaveText("0");
  await at(50);
  await page.getByLabel("02 / Payment scenario").selectOption("delayed");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByRole("button", { name: "Check payment status" })).toBeVisible();
  await at(61);
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(page.getByTestId("checkout-state")).toHaveText("settled");
  await expect(page.getByTestId("simulation-sends")).toHaveText("1");
  await at(68);
  await page.getByRole("button", { name: "Merchant UI", exact: true }).click();
  await at(75);
  await page
    .getByRole("region", { name: "Bring your own UI", exact: true })
    .scrollIntoViewIfNeeded();
  await at(90);
  const video = page.video();
  await context.close();
  await video?.saveAs("../../test-results/lycoris-walkthrough.webm");
});
