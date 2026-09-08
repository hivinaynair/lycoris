import { BASE_SEPOLIA_USDC_ADDRESS, parseUsdcAmount, SettleKitError } from "@settle-kit/core";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { type NextRequest, NextResponse } from "next/server";
import { isAddress, zeroAddress } from "viem";

export type AgenticPaymentOptions = {
  /** Decimal USDC amount, e.g. "0.10". Never a floating-point number. */
  priceUsdc: string;
  /** This first release supports Base Sepolia USDC only. */
  network: "eip155:84532";
  payTo: string;
  /** Use a facilitator that enforces ERC-8004, AP2 mandates, and balance checks. */
  facilitatorUrl: string;
  description?: string;
};

/**
 * Protect a Next.js App Router resource with x402 and per-request AP2 forwarding.
 *
 * Options are validated eagerly and throw `SettleKitError("invalid_config")`. Each request
 * builds and initializes its own facilitator client and resource server: a buyer's mandate
 * is never shared with a simultaneous buyer, at the cost of that setup per request.
 */
export function withAgenticPayment<Args extends unknown[] = []>(
  handler: (request: NextRequest, ...args: Args) => Response | Promise<Response>,
  options: AgenticPaymentOptions,
): (request: NextRequest, ...args: Args) => Promise<NextResponse> {
  const { amount, facilitatorUrl } = validatePaymentOptions(options);
  // An explicit asset amount avoids dollar-price conversion or token selection.
  const routeConfig = {
    accepts: {
      scheme: "exact",
      network: options.network,
      payTo: options.payTo,
      price: {
        amount,
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        extra: { name: "USDC", version: "2" },
      },
    },
    ...(options.description !== undefined ? { description: options.description } : {}),
  };

  return async (request, ...args) => {
    try {
      const facilitator = requestFacilitator(request, facilitatorUrl);
      const server = new x402ResourceServer(facilitator).register(
        routeConfig.accepts.network,
        new ExactEvmScheme(),
      );
      await server.initialize();
      const protectedHandler = withX402(
        async (paidRequest) => {
          const response = await handler(paidRequest, ...args);
          return new NextResponse(response.body, response);
        },
        routeConfig,
        server,
        undefined,
        undefined,
        false,
      );
      const response = await protectedHandler(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch {
      // Do not expose facilitator URLs, credentials, or upstream exception text.
      return NextResponse.json(
        { error: "agentic_payment_request_failed" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

function validatePaymentOptions(options: AgenticPaymentOptions) {
  const amount = parseUsdcAmount(options.priceUsdc);
  if (options.network !== "eip155:84532") {
    throw new SettleKitError(
      "invalid_config",
      "Agentic payments currently support Base Sepolia only",
    );
  }
  if (!isAddress(options.payTo) || options.payTo.toLowerCase() === zeroAddress) {
    throw new SettleKitError("invalid_config", "payTo must be a nonzero EVM address");
  }
  const url = new URL(options.facilitatorUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new SettleKitError(
      "invalid_config",
      "facilitatorUrl must be an HTTP(S) URL without credentials",
    );
  }
  const facilitatorUrl = url.href;
  return { amount, facilitatorUrl };
}

function requestFacilitator(request: NextRequest, facilitatorUrl: string) {
  const mandate = request.headers.get("X-AP2-Mandate");
  const mandateHeaders: Record<string, string> = mandate ? { "X-AP2-Mandate": mandate } : {};
  // Never share a mutable mandate/client across simultaneous buyers.
  const facilitator = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    createAuthHeaders: async () => ({
      verify: mandateHeaders,
      settle: mandateHeaders,
      supported: {},
    }),
  });
  return facilitator;
}
