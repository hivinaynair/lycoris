import { expect, test } from "../playwright.setup";

test("home page shows the Lycoris rail and Run control", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("The Lycoris rail")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run" })).toBeVisible();
});
