import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getReportRoute, type ReportRouteId } from "@/lib/demo-scenarios";
import { getMelbourneWeather } from "@/server/weather";

function makeMandateClient(url: string, mandateJson: string | undefined) {
  if (!mandateJson) return new HTTPFacilitatorClient({ url });

  return new HTTPFacilitatorClient({
    url,
    createAuthHeaders: async () => ({
      verify: { "X-AP2-Mandate": mandateJson },
      settle: { "X-AP2-Mandate": mandateJson },
      supported: {},
    }),
  });
}

export function createWeatherHandler(routeId: ReportRouteId) {
  const route = getReportRoute(routeId);

  const routeConfig = {
    accepts: {
      scheme: "exact",
      price: route.price,
      network: "eip155:84532" as `${string}:${string}`,
      payTo: env.PAY_TO_ADDRESS,
    },
    description: `${route.title} - ${route.priceLabel} per request`,
  };

  const innerHandler = async () => {
    const forecast = await getMelbourneWeather(route.id === "premium" ? "rooftop" : "public");
    return NextResponse.json(forecast);
  };

  // Return a per-request handler so each call uses the mandate from that request.
  return async (request: NextRequest) => {
    try {
      const mandateJson = request.headers.get("X-AP2-Mandate") ?? undefined;
      const facilitator = makeMandateClient(env.FACILITATOR_URL, mandateJson);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const server = new x402ResourceServer(facilitator as any).register(
        "eip155:84532",
        new ExactEvmScheme(),
      );
      await server.initialize();
      const handler = withX402(innerHandler, routeConfig, server, undefined, undefined, false);
      return await handler(request);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  };
}
