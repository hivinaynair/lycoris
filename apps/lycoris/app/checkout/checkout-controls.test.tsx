import { expect, test } from "bun:test";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { SettleProvider } from "@settle-kit/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CheckoutControls } from "./checkout-controls";
import type { CheckoutRail } from "./checkout-rail";

function Controls() {
  const [rail, setRail] = useState<CheckoutRail>("sponsored");
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
      <CheckoutControls look="default" setLook={() => undefined} rail={rail} setRail={setRail} />
    </SettleProvider>
  );
}

test("switches from the sponsored rail to the wallet rail", () => {
  render(<Controls />);
  expect(screen.getByTestId("checkout-rail").textContent).toBe("sponsored");
  fireEvent.click(screen.getByRole("button", { name: "Your wallet (EOA)" }));
  expect(screen.getByTestId("checkout-rail").textContent).toBe("wallet");
});
