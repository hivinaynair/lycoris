import { expect, it, mock } from "bun:test";
import { BASE_SEPOLIA_USDC_ADDRESS, createUsdcMethod, type PaymentSigner } from "@settle-kit/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Checkout } from "./checkout";
import { SettleProvider } from "./provider";
import { type UseCheckoutResult, useCheckout } from "./use-checkout";

const destination = {
  targetChain: 84532 as const,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111" as const,
};
const hash = `0x${"ab".repeat(32)}` as const;
function setup(getSigner?: () => Promise<PaymentSigner>) {
  let buyer!: UseCheckoutResult;
  let observer!: UseCheckoutResult;
  const send = mock(async () => hash);
  const onSettled = mock(() => {});
  function Buyer() {
    buyer = useCheckout({ onSettled });
    return null;
  }
  function Observer() {
    observer = useCheckout();
    return <output data-testid="status">{observer.state.status}</output>;
  }
  render(
    <SettleProvider
      config={{
        appName: "Merchant",
        destination,
        getSigner:
          getSigner ?? (async () => ({ address: destination.recipient, sendTransaction: send })),
        methods: [
          createUsdcMethod({
            client: { readContract: async () => 100000000n },
            receiptClient: {
              waitForTransactionReceipt: async () => ({ status: "success", transactionHash: hash }),
            },
          }),
        ],
      }}
    >
      <Buyer />
      <Observer />
      <Checkout />
    </SettleProvider>,
  );
  return { buyer: () => buyer, observer: () => observer, send, onSettled };
}

it("supports begin then pay and two SKUs without remounting the Provider", async () => {
  const f = setup();
  for (const amountUsdc of ["12.50", "4.00"]) {
    await act(async () => {
      await f.buyer().begin({ amountUsdc });
    });
    expect(f.observer().state).toMatchObject({ status: "awaiting_payment", quote: { amountUsdc } });
    await act(async () => {
      await f.buyer().pay();
    });
    expect(screen.getByTestId("status").textContent).toBe("settled");
  }
  expect(f.send).toHaveBeenCalledTimes(2);
  expect(f.onSettled).toHaveBeenCalledTimes(2);
});

it("rejects replacing an in-flight session and retains the shared payment", async () => {
  let resolve!: (signer: PaymentSigner) => void;
  const f = setup(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await act(async () => {
    await f.buyer().begin({ amountUsdc: "12.50" });
  });
  let paying!: Promise<void>;
  await act(async () => {
    paying = f.buyer().pay();
  });
  await expect(f.buyer().begin({ amountUsdc: "4.00" })).rejects.toMatchObject({
    code: "invalid_config",
  });
  expect(f.observer().state.status).toBe("settling");
  await act(async () => {
    resolve({ address: destination.recipient, sendTransaction: f.send });
    await paying;
  });
  expect(f.observer().state).toMatchObject({ status: "settled", quote: { amountUsdc: "12.50" } });
});

it("the default Buy button quotes once and reaches the pay screen", async () => {
  setup();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
  });
  expect(screen.getByRole("button", { name: "Pay USDC" })).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Pay USDC" }));
  });
  expect(screen.getByText("Payment confirmed: 12.50 USDC.")).toBeTruthy();
});

it("invalid new purchase leaves the existing session intact", async () => {
  const f = setup();
  await act(async () => {
    await f.buyer().begin({ amountUsdc: "12.50" });
  });
  await expect(f.buyer().begin({ amountUsdc: "abc" })).rejects.toMatchObject({
    code: "invalid_config",
  });
  expect(f.buyer().state.status).toBe("awaiting_payment");
});
