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
  function Buyer() {
    buyer = useCheckout();
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
        method: createUsdcMethod({
          client: { readContract: async () => 100000000n },
          receiptClient: {
            waitForTransactionReceipt: async () => ({ status: "success", transactionHash: hash }),
          },
        }),
      }}
    >
      <Buyer />
      <Observer />
      <Checkout amount="12.50" />
    </SettleProvider>,
  );
  return { buyer: () => buyer, observer: () => observer, send };
}

it("supports two SKUs without remounting the Provider", async () => {
  const f = setup();
  for (const amount of ["12.50", "4.00"]) {
    await act(async () => {
      await f.buyer().pay({ amount });
    });
    expect(f.observer().state).toMatchObject({ status: "settled", quote: { amount } });
    await act(async () => {
      f.buyer().reset();
    });
  }
  expect(f.send).toHaveBeenCalledTimes(2);
});

it("rejects replacing an in-flight session and retains the shared payment", async () => {
  let resolve!: (signer: PaymentSigner) => void;
  const f = setup(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let paying!: Promise<void>;
  await act(async () => {
    paying = f.buyer().pay({ amount: "12.50" });
  });
  await act(async () => {
    await f.buyer().pay({ amount: "4.00" });
  });
  expect(f.observer().state.status).toBe("settling");
  await act(async () => {
    resolve({ address: destination.recipient, sendTransaction: f.send });
    await paying;
  });
  expect(f.observer().state).toMatchObject({ status: "settled", quote: { amount: "12.50" } });
});

it("the default Pay button quotes and settles from one click", async () => {
  setup();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Pay 12.50 USDC" }));
  });
  expect(screen.getByText("Payment confirmed: 12.50 USDC.")).toBeTruthy();
});

it("invalid new purchase leaves the existing session intact", async () => {
  const f = setup();
  await act(async () => {
    await f.buyer().pay({ amount: "12.50" });
  });
  await expect(f.buyer().pay({ amount: "abc" })).rejects.toMatchObject({
    code: "invalid_config",
  });
  expect(f.buyer().state.status).toBe("settled");
});

it("keeps actions stable while a payment is in flight", async () => {
  let checkout!: UseCheckoutResult;
  let confirm!: (value: { status: "success"; transactionHash: typeof hash }) => void;
  const config = {
    appName: "Merchant",
    destination,
    getSigner: async () => ({ address: destination.recipient, sendTransaction: async () => hash }),
    method: createUsdcMethod({
      client: { readContract: async () => 100000000n },
      receiptClient: {
        waitForTransactionReceipt: () =>
          new Promise<{ status: "success"; transactionHash: typeof hash }>((resolve) => {
            confirm = resolve;
          }),
      },
    }),
  };
  function Buyer() {
    checkout = useCheckout();
    return null;
  }
  const view = render(
    <SettleProvider config={config}>
      <Buyer />
    </SettleProvider>,
  );
  const actions = [checkout.pay, checkout.reset, checkout.retryConfirmation];
  let payment!: Promise<void>;
  await act(async () => {
    payment = checkout.pay({ amount: "4" });
  });
  view.rerender(
    <SettleProvider config={{ ...config }}>
      <Buyer />
    </SettleProvider>,
  );
  expect([checkout.pay, checkout.reset, checkout.retryConfirmation]).toEqual(actions);
  await act(async () => {
    confirm({ status: "success", transactionHash: hash });
    await payment;
  });
  expect(checkout.state.status).toBe("settled");
});

it("supports UI labels, className, and destination override", async () => {
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
      <Checkout amount="7" destination={override} className="merchant-brand" />
    </SettleProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Pay 7 USDC" }).closest("section")?.className,
  ).toContain("merchant-brand");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Pay 7 USDC" }));
  });
  expect(observer.state).toMatchObject({
    status: "failed",
    destination: override,
    quote: { amount: "7" },
  });
  expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();
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
    method: createUsdcMethod({
      client: { readContract: async () => 100000000n },
      receiptClient: {
        waitForTransactionReceipt: async () => ({ status: "success", transactionHash: hash }),
      },
    }),
  };
  const content = (theme: "light" | "dark") => (
    <SettleProvider
      config={config}
      appearance={{
        theme,
        variables: { borderRadius: "24px", colorPrimary: "red" },
      }}
    >
      <Observer />
      <Checkout
        amount="4"
        appearance={{
          variables: { colorPrimary: "blue" },
        }}
      />
    </SettleProvider>
  );
  const view = render(content("light"));
  const card = screen.getByRole("button", { name: "Pay 4 USDC" }).closest("section");
  if (!card) throw new Error("Checkout card not rendered");
  expect(card.style.getPropertyValue("--sk-radius")).toBe("24px");
  expect(card.style.getPropertyValue("--sk-primary")).toBe("blue");
  await act(async () => {
    await checkout.pay({ amount: "4" });
  });
  view.rerender(content("dark"));
  expect(card.getAttribute("data-sk-theme")).toBe("dark");
  expect(checkout.state.status).toBe("settled");
});

it("pay ignores duplicate calls while payment is pending", async () => {
  let resolve!: (signer: PaymentSigner) => void;
  const f = setup(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let paying!: Promise<void>;
  await act(async () => {
    paying = f.buyer().pay({ amount: "12.50" });
  });
  await act(async () => {
    await f.buyer().pay({ amount: "12.50" });
    resolve({ address: destination.recipient, sendTransaction: f.send });
    await paying;
  });
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.observer().state.status).toBe("settled");
});

it("pay never sends after invalid input and can recover", async () => {
  const f = setup();
  await expect(f.buyer().pay({ amount: "abc" })).rejects.toMatchObject({
    code: "invalid_config",
  });
  expect(f.send).not.toHaveBeenCalled();
  await act(async () => {
    await f.buyer().pay({ amount: "12.50" });
  });
  expect(f.send).toHaveBeenCalledTimes(1);
});

it("takes the recipient from the purchase when the Provider configures none", async () => {
  const perResource = {
    ...destination,
    recipient: "0x3333333333333333333333333333333333333333" as const,
  };
  let buyer!: UseCheckoutResult;
  function Buyer() {
    buyer = useCheckout();
    return null;
  }
  render(
    <SettleProvider
      config={{
        appName: "Marketplace",
        getSigner: async () => ({
          address: destination.recipient,
          sendTransaction: async () => hash,
        }),
        method: createUsdcMethod({
          client: { readContract: async () => 100000000n },
          receiptClient: {
            waitForTransactionReceipt: async () => ({ status: "success", transactionHash: hash }),
          },
        }),
      }}
    >
      <Buyer />
    </SettleProvider>,
  );
  await act(async () => {
    await buyer.pay({ amount: "12.50", destination: perResource });
  });
  expect(buyer.state).toMatchObject({ status: "settled", destination: perResource });
});
