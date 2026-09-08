import { WEATHER_PRICE_USDC } from "@repo/shared/demo";
import { withAgenticPayment } from "@settle-kit/server/next";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getReportRoute, type ReportRouteId } from "@/lib/demo-scenarios";
import { getMelbourneWeather } from "@/server/weather";

export function createWeatherHandler(routeId: ReportRouteId) {
  const route = getReportRoute(routeId);
  return withAgenticPayment(
    async () => {
      const forecast = await getMelbourneWeather(route.id === "premium" ? "rooftop" : "public");
      return NextResponse.json(forecast);
    },
    {
      priceUsdc: WEATHER_PRICE_USDC,
      network: "eip155:84532",
      payTo: env.PAY_TO_ADDRESS,
      facilitatorUrl: env.FACILITATOR_URL,
      description: `${route.title} - ${route.priceLabel} per request`,
    },
  );
}
