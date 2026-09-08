import { withAgenticPayment } from "@settle-kit/server/next";

// Building this route proves the packed server SDK works with Next's bundler.
// The browser checkout smoke never calls this route or a real facilitator.
export const GET = withAgenticPayment(async () => Response.json({ report: "sample" }), {
  priceUsdc: "0.1",
  network: "eip155:84532",
  payTo: "0x1111111111111111111111111111111111111111",
  facilitatorUrl: "http://localhost:1",
});
