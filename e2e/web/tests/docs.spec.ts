import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("docs link from navigation, expose copyable examples, and fit mobile", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/docs");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Docs" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Payments, in your app." })).toBeVisible();
  await page.getByRole("button", { name: "Copy store.tsx", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "export function Store",
  );
  for (const link of await page
    .getByRole("navigation", { name: "Documentation sections" })
    .getByRole("link")
    .all()) {
    const href = await link.getAttribute("href");
    if (!href) throw new Error("Missing documentation link target");
    await expect(page.locator(href)).toHaveCount(1);
  }
  await page.screenshot({ path: info.outputPath("docs-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("docs-mobile.png"), fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});
