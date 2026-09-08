import { CodeExample } from "./code-example";
import { DocsSection, DocsTable } from "./docs-section";
import * as examples from "./examples";

export function CheckoutDocs() {
  return (
    <>
      <ReactSection />
      <WalletSection />
      <CustomUiSection />
      <AppearanceSection />
    </>
  );
}

function ReactSection() {
  return (
    <DocsSection id="react" title="Add a React checkout">
      <p>
        Mount one Provider around your store. Supply a wallet signer and, optionally, a default
        merchant destination: each purchase can override it, and a quote endpoint can return its own
        recipient. Then render Checkout for each purchase. Amounts are decimal strings with at most
        six decimal places.
      </p>
      <CodeExample title="store.tsx" code={examples.reactCheckout} />
      <p className="text-muted-foreground">
        Replace the example recipient with your merchant address. Import the compiled CSS once;
        consumers need no Tailwind setup or Next.js transpilePackages configuration.
      </p>
    </DocsSection>
  );
}

function WalletSection() {
  return (
    <DocsSection id="wallet" title="Bring your wallet">
      <p>
        The host owns wallet connection. PaymentSigner needs an address and sendTransaction; provide
        getChainId so the SDK can check the network before sending. The buyer needs test USDC and
        Base Sepolia ETH for gas.
      </p>
      <p className="text-muted-foreground">
        The public demo uses a separate sponsored adapter: a server wallet pays the fixed merchant
        with test funds. Visitors never connect a wallet. This browser-wallet example is for apps
        where customers pay from their own balances.
      </p>
      <CodeExample title="wallet.ts" code={examples.walletAdapter} language="typescript" />
      <p className="text-muted-foreground">
        Pass a callback such as <code>{"getSigner: () => getSigner(provider)"}</code> to your
        Provider configuration, using your connected wallet’s provider. The SDK sends to the USDC
        contract, with the merchant recipient encoded in the transfer.
      </p>
    </DocsSection>
  );
}

function CustomUiSection() {
  return (
    <DocsSection id="custom-ui" title="Use your own components">
      <p>
        useCheckout exposes the same session to every component under the Provider. begin selects
        USDC and requests a quote; pay submits only after the buyer confirms. Keep your own buttons,
        dialogs, and design system.
      </p>
      <CodeExample title="buy-report.tsx" code={examples.customCheckout} />
      <DocsTable
        headers={["API", "What it does"]}
        rows={[
          [
            "begin({ amountUsdc, title?, destination? })",
            "Starts a purchase and quotes USDC. Existing in-flight payments cannot be replaced.",
          ],
          [
            "pay()",
            "Requires awaiting_payment. Checks quote expiry, network, and USDC balance before submission.",
          ],
          [
            "retryConfirmation()",
            "Checks the submitted transaction’s receipt again. Never sends another transfer.",
          ],
          ["reset()", "Returns to idle. Refuses to reset a payment that is still settling."],
          [
            "canPay / isBusy",
            "UI conveniences. They do not replace the checks performed by pay().",
          ],
        ]}
      />
    </DocsSection>
  );
}

function AppearanceSection() {
  return (
    <DocsSection id="appearance" title="Match your app">
      <p>
        Set appearance on the Provider or override it on Checkout. Changes apply without resetting
        the active payment. The optional UI supports inherited, light, and dark themes.
      </p>
      <CodeExample title="Appearance configuration" code={examples.appearance} />
      <p className="text-muted-foreground">
        variables set inline CSS custom properties; elements add classes to slots such as card and
        primaryButton. For a CSP that forbids style attributes, use classes and an external
        stylesheet instead.
      </p>
    </DocsSection>
  );
}
