import { expect, type Page } from "@playwright/test";

export const hash = `0x${"ab".repeat(32)}`;
export async function mockSponsored(
  page: Page,
  options: { failFirst?: boolean; revert?: boolean; reportFailFirst?: boolean } = {},
) {
  const ids: string[] = [];
  let reports = 0;
  await page.addInitScript(() => {
    Object.defineProperty(window, "ethereum", {
      get() {
        throw new Error("Sponsored checkout must not access a wallet");
      },
    });
  });
  await page.route("**/api/checkout/sponsored", async (route) => {
    const { purchaseId } = route.request().postDataJSON();
    ids.push(purchaseId);
    if (options.failFirst && ids.length === 1)
      return route.fulfill({ status: 503, json: { error: "Retry this purchase." } });
    await route.fulfill({ json: { txHash: hash } });
  });
  await page.route("**/api/weather/sponsored", async (route) => {
    reports++;
    expect(ids).toContain(route.request().postDataJSON().purchaseId);
    if (options.reportFailFirst && reports === 1)
      return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    await route.fulfill({
      json: {
        temperatureC: 18,
        rainProbabilityPercent: 12,
        willRainAt1Pm: false,
        targetTime: "2026-09-09T03:00:00Z",
        provider: "Open-Meteo",
      },
    });
  });
  await page.route("https://sepolia.base.org/**", async (route) => {
    const request = route.request().postDataJSON();
    const result =
      request.method === "eth_blockNumber"
        ? "0x1"
        : {
            transactionHash: hash,
            transactionIndex: "0x0",
            blockHash: hash,
            blockNumber: "0x1",
            from: "0x1111111111111111111111111111111111111111",
            to: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            cumulativeGasUsed: "0x5208",
            gasUsed: "0x5208",
            contractAddress: null,
            logs: [],
            logsBloom: `0x${"0".repeat(512)}`,
            status: options.revert ? "0x0" : "0x1",
            effectiveGasPrice: "0x1",
            type: "0x2",
          };
    await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });
  return { ids, reports: () => reports };
}
