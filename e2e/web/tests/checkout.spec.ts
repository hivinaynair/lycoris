import { expect, test } from "@playwright/test";
import { mockSponsored } from "./sponsored-fixture";

test("one click pays and opens the report without a wallet or sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const flow = await mockSponsored(page);
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "Simulation" })).toHaveCount(0);
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByText("18°C · 12% rain probability")).toBeVisible();
  expect(flow.ids).toHaveLength(1);
  expect(errors).toEqual([]);
});
test("an uncertain submission retries the same purchase after reload", async ({ page }) => {
  const flow = await mockSponsored(page, { failFirst: true });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByText("18°C · 12% rain probability")).toBeVisible();
  expect(flow.ids).toHaveLength(2);
  expect(flow.ids[0]).toBe(flow.ids[1]);
});
test("report retry does not submit another payment", async ({ page }) => {
  const flow = await mockSponsored(page, { reportFailFirst: true });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await page.getByRole("button", { name: "Retry report" }).click();
  await expect(page.getByText("18°C · 12% rain probability")).toBeVisible();
  expect(flow.ids).toHaveLength(1);
});
test("merchant presentation uses the same sponsored flow and reverted receipts do not unlock", async ({
  page,
}) => {
  const flow = await mockSponsored(page, { revert: true });
  await page.goto("/checkout");
  await page.getByText("Customize this demo", { exact: true }).click();
  await page.getByRole("button", { name: "Merchant UI", exact: true }).click();
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByTestId("checkout-state")).toHaveText("failed");
  expect(flow.reports()).toBe(0);
});
