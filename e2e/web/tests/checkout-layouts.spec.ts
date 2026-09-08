import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockSponsored } from "./sponsored-fixture";

test("checkout disclosures preserve a purchase and fit desktop and mobile", async ({
  page,
}, info) => {
  await mockSponsored(page);
  await page.goto("/checkout");
  await expect(page.getByRole("group", { name: "Checkout layout" })).toHaveCount(0);
  await expect(page.getByLabel("Payment scenario")).toBeHidden();
  await expect(page.getByRole("region", { name: "Integration code" })).toBeVisible();
  await page.getByRole("button", { name: "Pay 0.1 USDC", exact: true }).click();
  for (const name of ["Customize this demo", "Add checkout to your app"]) {
    await page.getByText(name, { exact: true }).click();
    await expect(page.getByTestId("checkout-state")).toHaveText("settled");
    await page.getByText(name, { exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Your Melbourne weather report" })).toBeVisible();
  await page.getByText("Customize this demo", { exact: true }).click();
  await page.getByRole("button", { name: "Merchant UI", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Melbourne weather report" })).toBeVisible();
  await page.getByRole("button", { name: "Default SDK", exact: true }).click();
  await page.getByText("Customize this demo", { exact: true }).click();
  await page.getByRole("button", { name: "New purchase" }).click();
  for (const theme of ["light", "dark"]) {
    const toggle = page.getByRole("button", { name: `Switch to ${theme} theme` });
    if (await toggle.count()) await toggle.click();
    for (const width of [1435, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        (await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze())
          .violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath(`${theme}-${width}.png`), fullPage: true });
    }
  }
});
