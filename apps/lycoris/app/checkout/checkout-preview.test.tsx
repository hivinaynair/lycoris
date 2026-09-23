import { expect, test } from "bun:test";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { SettleProvider } from "@settle-kit/react";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { CheckoutPreview } from "./checkout-preview";

function Preview({ look }: { look: "default" | "brand" }) {
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

function cardFrame(node: ReactNode) {
  const view = render(node);
  const card = view.container.querySelector(".sk-checkout");
  if (!card?.parentElement) throw new Error("checkout card missing");
  return card.parentElement.className;
}

test("merchant theme keeps padding inside the checkout card", () => {
  const className = cardFrame(<Preview look="brand" />);
  expect(className).toContain("[&_.sk-checkout]:p-6");
  expect(className).not.toContain("[&_.sk-checkout]:p-0");
});

test("default appearance stays flush with the preview panel", () => {
  const className = cardFrame(<Preview look="default" />);
  expect(className).toContain("[&_.sk-checkout]:p-0");
  expect(className).not.toContain("[&_.sk-checkout]:p-6");
});
