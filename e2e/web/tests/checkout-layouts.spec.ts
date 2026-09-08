import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("checkout layouts preserve a purchase and fit desktop and mobile", async ({ page }, info) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  for (const name of ["02 / Embed studio", "03 / Guided demo", "01 / Storefront"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("checkout-state")).toHaveText("awaiting_payment");
    await expect(page.getByRole("button", { name: "Pay 0.1 USDC" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Pay 0.1 USDC" }).click();
  await expect(page.getByTestId("checkout-state")).toHaveText("settled");
  for (const name of ["01 / Storefront", "02 / Embed studio", "03 / Guided demo"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("simulation-sends")).toHaveText("1");
    await expect(page.getByRole("heading", { name: "Sample report unlocked" })).toBeVisible();
  }
  await page.getByRole("button", { name: "New purchase" }).click();
  for (const theme of ["light", "dark"]) {
    const toggle = page.getByRole("button", { name: `Switch to ${theme} theme` });
    if (await toggle.count()) await toggle.click();
    for (const name of ["01 / Storefront", "02 / Embed studio", "03 / Guided demo"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.setViewportSize({ width: 1435, height: 1100 });
      expect(
        (await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`${theme}-${name.slice(0, 2)}.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${theme}-${name.slice(0, 2)}-mobile.png`),
        fullPage: true,
      });
    }
  }
});
