import { expect, type Page } from "@playwright/test";

/** The user operation hash the mocked bundler returns. This is what settle() yields. */
export const hash = `0x${"ab".repeat(32)}`;
/** The bundle transaction that carried it — deliberately different from `hash`. */
const bundleTx = `0x${"cd".repeat(32)}`;
const burner = "0x1111111111111111111111111111111111111111";

const pad = (value: string) => `0x${value.replace(/^0x/, "").padStart(64, "0")}`;

/**
 * Mocks the sponsored checkout end to end.
 *
 * Three surfaces, because a sponsored payment now touches three: our faucet route,
 * our paymaster proxy (which fronts both the bundler and the paymaster, since CDP
 * serves them from one credentialed endpoint), and the public chain RPC the smart
 * account uses to resolve its own counterfactual address and its USDC balance.
 */
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

  await page.route("**/api/checkout/fund", async (route) => {
    const { purchaseId } = route.request().postDataJSON();
    ids.push(purchaseId);
    if (options.failFirst && ids.length === 1)
      return route.fulfill({ status: 503, json: { error: "Retry this purchase." } });
    await route.fulfill({ json: { txHash: bundleTx } });
  });

  // Bundler and paymaster, both behind our proxy.
  await page.route("**/api/paymaster", async (route) => {
    const request = route.request().postDataJSON();
    const reply = (result: unknown) =>
      route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
    switch (request.method) {
      case "eth_chainId":
        return reply("0x14a34");
      case "eth_supportedEntryPoints":
        return reply(["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]);
      case "eth_estimateUserOperationGas":
        return reply({
          preVerificationGas: "0xf4240",
          verificationGasLimit: "0xf4240",
          callGasLimit: "0xf4240",
        });
      case "pm_getPaymasterStubData":
      case "pm_getPaymasterData":
        return reply({ paymasterAndData: `0x${"22".repeat(20)}` });
      case "eth_sendUserOperation":
        return reply(hash);
      case "eth_getUserOperationReceipt":
        return reply({
          userOpHash: hash,
          sender: burner,
          // The operation's own outcome, which is not the bundle's. A reverted
          // operation still rides in a transaction whose status is success.
          success: !options.revert,
          actualGasCost: "0x1",
          actualGasUsed: "0x1",
          receipt: {
            transactionHash: bundleTx,
            blockHash: bundleTx,
            blockNumber: "0x1",
            status: "0x1",
            logs: [],
          },
        });
      default:
        return reply(null);
    }
  });

  await page.route("**/api/weather/sponsored", async (route) => {
    reports++;
    const body = route.request().postDataJSON();
    expect(ids).toContain(body.purchaseId);
    expect(body.userOpHash).toBe(hash);
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

  // The public chain: the account resolves its counterfactual address here, and
  // the SDK's balance preflight reads USDC here too.
  await page.route("https://sepolia.base.org/**", async (route) => {
    const request = route.request().postDataJSON();
    const result =
      request.method === "eth_blockNumber"
        ? "0x1"
        : request.method === "eth_chainId"
          ? "0x14a34"
          : request.method === "eth_getCode"
            ? "0x"
            : // eth_call covers both the factory's address prediction and
              // balanceOf; a funded balance keeps the preflight satisfied.
              pad(request.method === "eth_call" ? burner : "0x186a0");
    await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });

  return { ids, reports: () => reports };
}
