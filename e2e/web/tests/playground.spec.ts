import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockSponsored } from "./sponsored-fixture";

test("themes, mobile layout and checkout states pass automated accessibility checks", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSponsored(page);
  await page.goto("/checkout");
  await page.getByText("Customize this demo", { exact: true }).click();
  for (const look of ["Default SDK", "Light", "Merchant theme", "Merchant UI"]) {
    await page.getByRole("button", { name: look, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole("button", { name: "Default SDK", exact: true }).click();
  await page.screenshot({ path: info.outputPath("playground-desktop.png"), fullPage: true });
  await page.getByText("Payment details", { exact: true }).click();
  await expect(page.getByText("Recipient", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("playground-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Pay 0.1 USDC", exact: true }).click();
  await expect(page.getByTestId("checkout-state")).toHaveText("settled");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});

test("keyboard users can skip navigation and change appearance", async ({ page }) => {
  await mockSponsored(page);
  await page.goto("/checkout");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByText("Customize this demo", { exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sk-checkout")).toHaveAttribute("data-sk-theme", "light");
});

test("shared light and dark themes persist and remain accessible", async ({ page }, info) => {
  await mockSponsored(page);
  await page.goto("/checkout");
  await page.getByText("Customize this demo", { exact: true }).click();
  for (const theme of ["light", "dark"] as const) {
    await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(page.getByRole("button", { name: "Pay 0.1 USDC", exact: true })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`playground-${theme}.png`), fullPage: true });
  }
});
