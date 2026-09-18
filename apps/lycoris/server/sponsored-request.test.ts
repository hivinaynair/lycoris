import { expect, it } from "bun:test";
import { readFundRequest, readSponsoredRequest } from "./sponsored-request";

function request(body: unknown, origin = "http://localhost:3003") {
  return {
    url: "http://localhost:3003/api/checkout/fund",
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
it("accepts a same-origin funding request naming only the burner to fund", async () => {
  const purchaseId = crypto.randomUUID();
  const payer = `0x${"ab".repeat(20)}`;
  expect(await readFundRequest(request({ purchaseId, payer }))).toEqual({ purchaseId, payer });
  await expect(
    readFundRequest(request({ purchaseId, payer }, "https://other.test")),
  ).rejects.toThrow();
  await expect(readFundRequest(request({ purchaseId }))).rejects.toThrow();
  await expect(readFundRequest(request({ purchaseId, payer: "0xabc" }))).rejects.toThrow();
  await expect(
    readFundRequest(request({ purchaseId, payer, amount: "100", recipient: "0x123" })),
  ).rejects.toThrow();
});
