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
      <Checkout amountUsdc="12.50" />
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
  expect(screen.getByRole("button", { name: /Pay [\d.]+ USDC/ })).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Pay [\d.]+ USDC/ }));
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

it("keeps actions stable and uses the latest committed callbacks during a payment", async () => {
  let checkout!: UseCheckoutResult;
  let confirm!: (value: { status: "success"; transactionHash: typeof hash }) => void;
  const first = mock(() => {});
  const latest = mock(() => {});
  const config = {
    appName: "Merchant",
    destination,
    getSigner: async () => ({ address: destination.recipient, sendTransaction: async () => hash }),
    methods: [
      createUsdcMethod({
        client: { readContract: async () => 100000000n },
        receiptClient: {
          waitForTransactionReceipt: () =>
            new Promise<{ status: "success"; transactionHash: typeof hash }>((resolve) => {
              confirm = resolve;
            }),
        },
      }),
    ],
  };
  function Buyer({ callback }: { callback: () => void }) {
    checkout = useCheckout({ onSettled: callback });
    return null;
  }
  const view = render(
    <SettleProvider config={config}>
      <Buyer callback={first} />
    </SettleProvider>,
  );
  const actions = [
    checkout.begin,
    checkout.pay,
    checkout.reset,
    checkout.selectMethod,
    checkout.retryConfirmation,
  ];
  expect(checkout.canPay).toBe(false);
  await act(async () => {
    await checkout.begin({ amountUsdc: "4" });
  });
  expect(checkout.canPay).toBe(true);
  let payment!: Promise<void>;
  await act(async () => {
    payment = checkout.pay();
  });
  expect(checkout.isBusy).toBe(true);
  expect(checkout.canPay).toBe(false);
  view.rerender(
    <SettleProvider config={{ ...config }}>
      <Buyer callback={latest} />
    </SettleProvider>,
  );
  expect([
    checkout.begin,
    checkout.pay,
    checkout.reset,
    checkout.selectMethod,
    checkout.retryConfirmation,
  ]).toEqual(actions);
  await act(async () => {
    confirm({ status: "success", transactionHash: hash });
    await payment;
  });
  expect(first).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledTimes(1);
  expect(checkout.isBusy).toBe(false);
});

it("supports UI labels, className, destination override and lifecycle callbacks", async () => {
  const onFailed = mock(() => {});
  let observer!: UseCheckoutResult;
  const override = {
    ...destination,
    recipient: "0x3333333333333333333333333333333333333333" as const,
  };
  function Observer() {
    observer = useCheckout();
    return null;
  }
  render(
    <SettleProvider
      config={{
        appName: "Merchant",
        destination,
        getSigner: async () => {
          throw { code: 4001 };
        },
      }}
    >
      <Observer />
      <Checkout
        amountUsdc="7"
        destination={override}
        className="merchant-brand"
        labels={{ buy: "Review order", pay: "Confirm order", reset: "Try again" }}
        onFailed={onFailed}
      />
    </SettleProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Review order" }).closest("section")?.className,
  ).toContain("merchant-brand");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Review order" }));
  });
  expect(observer.state).toMatchObject({
    status: "awaiting_payment",
    destination: override,
    quote: { amountUsdc: "7" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm order" }));
  });
  expect(onFailed).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

it("merges Provider appearance with local overrides without resetting a checkout", async () => {
  let checkout!: UseCheckoutResult;
  function Observer() {
    checkout = useCheckout();
    return null;
  }
  const config = {
    appName: "Merchant",
    destination,
    getSigner: async () => ({ address: destination.recipient, sendTransaction: async () => hash }),
  };
  const content = (theme: "light" | "dark") => (
    <SettleProvider
      config={config}
      appearance={{
        theme,
        variables: { borderRadius: "24px", colorPrimary: "red" },
        elements: { card: "host-card", primaryButton: "host-button" },
      }}
    >
      <Observer />
      <Checkout
        amountUsdc="4"
        appearance={{
          variables: { colorPrimary: "blue" },
          elements: { primaryButton: "local-button" },
        }}
      />
    </SettleProvider>
  );
  const view = render(content("light"));
  const card = screen.getByRole("button", { name: "Buy" }).closest("section");
  if (!card) throw new Error("Checkout card not rendered");
  expect(card.style.getPropertyValue("--sk-radius")).toBe("24px");
  expect(card.style.getPropertyValue("--sk-primary")).toBe("blue");
  expect(card.className).toContain("host-card");
  expect(screen.getByRole("button", { name: "Buy" }).className).toContain("local-button");
  expect(screen.getByRole("button", { name: "Buy" }).className).not.toContain("host-button");
  await act(async () => {
    await checkout.begin({ amountUsdc: "4" });
  });
  view.rerender(content("dark"));
  expect(card.getAttribute("data-sk-theme")).toBe("dark");
  expect(checkout.state.status).toBe("awaiting_payment");
  expect(screen.getByRole("button", { name: "Pay 4 USDC" })).toBeTruthy();
});
