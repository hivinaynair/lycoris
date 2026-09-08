import { expect, test } from "@playwright/test";

const hash = `0x${"ab".repeat(32)}`;
const buyer = "0x2222222222222222222222222222222222222222";
const usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

test("checkout gives actionable missing-wallet guidance and fits mobile", async ({
  page,
}, info) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: /Pay [\d.]+ USDC/ }).click();
  await expect(
    page.getByText("Open this checkout in a browser with a wallet extension, then try again."),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("checkout-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("checkout-mobile.png"), fullPage: true });
});

test("checkout preflight blocks an unfunded wallet before any send", async ({ page }) => {
  await page.addInitScript(
    ({ buyer }) => {
      Object.assign(window, {
        sends: 0,
        ethereum: {
          request: async ({ method }: { method: string }) => {
            if (method === "eth_requestAccounts") return [buyer];
            if (method === "eth_chainId") return "0x14a34";
            if (method === "eth_sendTransaction") {
              Object.assign(window, { sends: 1 });
              throw new Error("must not send");
            }
            throw new Error(`Unexpected wallet call ${method}`);
          },
        },
      });
    },
    { buyer },
  );
  await page.route("https://sepolia.base.org/**", async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: { jsonrpc: "2.0", id: request.id, result: `0x${"0".repeat(64)}` },
    });
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: /Pay [\d.]+ USDC/ }).click();
  await expect(page.getByText("Not enough USDC to complete this payment.")).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "sends"))).toBe(0);
});

test("checkout waits for a receipt and confirms two purchases with a simulated wallet", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ buyer, hash }) => {
      Object.assign(window, {
        sends: 0,
        ethereum: {
          request: async ({ method }: { method: string }) => {
            if (method === "eth_requestAccounts") return [buyer];
            if (method === "eth_chainId") return "0x14a34";
            if (method === "personal_sign") return `0x${"11".repeat(65)}`;
            if (method === "eth_sendTransaction") {
              Reflect.set(window, "sends", Reflect.get(window, "sends") + 1);
              return hash;
            }
            throw new Error(`Unexpected wallet call ${method}`);
          },
        },
      });
    },
    { buyer, hash },
  );
  let accessAttempts = 0;
  await page.route("**/api/weather/checkout", async (route) => {
    accessAttempts++;
    expect(route.request().postDataJSON().txHash).toBe(hash);
    if (accessAttempts === 1)
      return route.fulfill({
        status: 503,
        json: { error: "Weather unavailable. Retry without paying again." },
      });
    await route.fulfill({
      json: {
        city: "Melbourne",
        temperatureC: 18,
        rainProbabilityPercent: 12,
        willRainAt1Pm: false,
        targetTime: "2026-09-09T03:00:00Z",
        provider: "Open-Meteo",
      },
    });
  });
  let sawReceipt = false;
  let releaseReceipt!: () => void;
  let receiptGate: Promise<void>;
  await page.route("https://sepolia.base.org/**", async (route) => {
    const request = route.request().postDataJSON();
    let result: unknown;
    if (request.method === "eth_call") result = `0x${100000000n.toString(16).padStart(64, "0")}`;
    else if (request.method === "eth_blockNumber") result = "0x1";
    else if (request.method === "eth_getTransactionReceipt") {
      await receiptGate;
      sawReceipt = true;
      result = {
        transactionHash: hash,
        transactionIndex: "0x0",
        blockHash: hash,
        blockNumber: "0x1",
        from: buyer,
        to: usdc,
        cumulativeGasUsed: "0x5208",
        gasUsed: "0x5208",
        contractAddress: null,
        logs: [],
        logsBloom: `0x${"0".repeat(512)}`,
        status: "0x1",
        effectiveGasPrice: "0x1",
        type: "0x2",
      };
    } else throw new Error(`Unexpected RPC call ${request.method}`);
    await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  for (let purchase = 0; purchase < 2; purchase++) {
    receiptGate = new Promise<void>((resolve) => {
      releaseReceipt = resolve;
    });
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    await page
      .getByRole("button", { name: purchase === 0 ? "Merchant UI" : "Default SDK", exact: true })
      .click();
    await page.getByRole("button", { name: /Pay [\d.]+ USDC/ }).click();
    await expect(page.getByText("Payment submitted. Waiting for confirmation…")).toBeVisible();
    releaseReceipt();
    await expect(page.getByText("Payment confirmed: 0.1 USDC.")).toBeVisible();
    await page.getByRole("button", { name: "Unlock weather report" }).click();
    if (purchase === 0) {
      await expect(
        page.getByRole("region", { name: "Purchased weather report" }).getByRole("alert"),
      ).toContainText("Retry without paying again");
      await page.getByRole("button", { name: "Unlock weather report" }).click();
    }
    await expect(page.getByText("18°C · 12% rain probability")).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, "sends"))).toBe(purchase + 1);
    if (purchase === 0) await page.getByRole("button", { name: "New purchase" }).click();
  }
  expect(sawReceipt).toBe(true);
  expect(await page.evaluate(() => Reflect.get(window, "sends"))).toBe(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath("checkout-confirmed.png"), fullPage: true });
});

test("merchant checkout preserves the session across appearances and fits mobile", async ({
  page,
}, info) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: "Merchant UI", exact: true }).click();
  await expect(page.getByRole("button", { name: /Pay [\d.]+ USDC/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("merchant-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: /Pay [\d.]+ USDC/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "wallet" })).toBeVisible();
  await page.getByRole("button", { name: "Default SDK", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
});
