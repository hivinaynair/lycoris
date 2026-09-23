import { expect, test } from "bun:test";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { SettleProvider } from "@settle-kit/react";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { CheckoutPreview } from "./checkout-preview";

function Preview({ look }: { look: "default" | "brand" | "custom" }) {
  return (
    <SettleProvider
      config={{
        appName: "Merchant",
        destination: {
          targetChain: 84532,
          targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
          recipient: "0x1111111111111111111111111111111111111111",
        },
        getSigner: async () => {
          throw new Error("unused");
        },
      }}
    >
      <CheckoutPreview look={look} rail="sponsored" />
    </SettleProvider>
  );
}

function bodyClass(node: ReactNode) {
  const view = render(node);
  const body = view.container.querySelector("[data-checkout-body]");
  if (!body) throw new Error("checkout body missing");
  return body.className;
}

test("every appearance shares one card slot and the same padding", () => {
  const view = render(<Preview look="brand" />);
  const looks = [...view.container.querySelectorAll("[data-look]")];
  expect(looks.map((cell) => cell.getAttribute("data-look"))).toEqual([
    "default",
    "light",
    "brand",
    "custom",
  ]);
  for (const cell of looks) {
    expect(cell.className).toContain("col-start-1");
    expect(cell.className).toContain("row-start-1");
  }
  const visible = looks.find((cell) => !cell.classList.contains("invisible"));
  expect(visible?.getAttribute("data-look")).toBe("brand");
  expect(bodyClass(<Preview look="default" />)).toBe(bodyClass(<Preview look="brand" />));
  expect(bodyClass(<Preview look="default" />)).not.toContain("[&_.sk-checkout]:p-0");
});
