import { expect, it } from "bun:test";
import { readSponsoredRequest } from "./sponsored-request";

function request(body: unknown, origin = "http://localhost:3003") {
  return {
    url: "http://localhost:3003/api/checkout/sponsored",
    headers: new Headers({ origin }),
    json: async () => body,
  } as Request;
}
it("accepts only a same-origin purchase ID, never caller-selected transfer details", async () => {
  const purchaseId = crypto.randomUUID();
  expect(await readSponsoredRequest(request({ purchaseId }))).toBe(purchaseId);
  await expect(
    readSponsoredRequest(request({ purchaseId }, "https://other.test")),
  ).rejects.toThrow();
  await expect(
    readSponsoredRequest(request({ purchaseId, amount: "100", recipient: "0x123" })),
  ).rejects.toThrow();
  await expect(readSponsoredRequest(request({ purchaseId: "invalid" }))).rejects.toThrow();
});
