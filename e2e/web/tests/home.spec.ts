import { expect, test } from "@playwright/test";

test("home opens the SDK playground and the agent appendix remains available", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole("heading", { name: "A little certainty. Before you head out." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Agent demo", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("button", { name: "Get me the report" })).toBeVisible();
});
