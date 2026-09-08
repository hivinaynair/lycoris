"use client";

import { WEATHER_PRICE_USDC, WEATHER_TITLE } from "@repo/shared/demo";
import { Button } from "@repo/ui/components/button";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type HexAddress,
} from "@settle-kit/core";
import { type CheckoutAppearance, SettleProvider, useCheckout } from "@settle-kit/react";
import { Checkout } from "@settle-kit/react/ui";
import { WeatherAccess } from "./weather-access";
import "@settle-kit/react/styles.css";
import { ArrowDown, Check, CloudSun, Code2, Copy, SlidersHorizontal } from "lucide-react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useMemo, useState } from "react";
import { getBrowserSigner } from "@/lib/get-browser-signer";
import styles from "./checkout-layouts.module.css";
import { MerchantCheckout } from "./merchant-checkout";
import { createSimulation, type Scenario, scenarios } from "./simulation";

const layouts = [
  {
    id: "storefront",
    label: "01 / Storefront",
    title: "A little certainty. Before you head out.",
    description:
      "A merchant experience first. Buy the Melbourne weather report, then explore the checkout behind it.",
  },
  {
    id: "studio",
    label: "02 / Embed studio",
    title: "Your app. Your wallet. Your checkout.",
    description:
      "Change the appearance and see the React embed beside it. One payment session, from first click to receipt.",
  },
  {
    id: "guided",
    label: "03 / Guided demo",
    title: "From one click to a confirmed payment.",
    description:
      "Follow a purchase through the SDK. Try a free simulation, then use a browser wallet when you are ready.",
  },
] as const;

const codeTheme: PrismTheme = {
  plain: { color: "var(--foreground)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment"], style: { color: "var(--muted-foreground)", fontStyle: "italic" } },
    { types: ["keyword", "operator"], style: { color: "var(--destructive)" } },
    { types: ["string", "attr-value"], style: { color: "var(--success)" } },
    { types: ["function", "class-name", "tag"], style: { color: "var(--warning)" } },
    { types: ["number", "boolean", "attr-name", "property"], style: { color: "var(--ring)" } },
    { types: ["punctuation"], style: { color: "var(--muted-foreground)" } },
  ],
};

type Look = "default" | "light" | "brand" | "custom";
const appearances: Record<Look, CheckoutAppearance> = {
  default: {
    theme: "inherit",
    variables: { borderRadius: "var(--radius)", controlBorderRadius: "var(--radius)" },
  },
  light: {
    theme: "light",
    variables: {
      colorBackground: "var(--surface-light)",
      colorForeground: "var(--ink-light)",
      colorMuted: "var(--muted-light)",
      colorMutedForeground: "var(--muted-ink-light)",
      colorBorder: "var(--border-light)",
      borderRadius: "var(--radius)",
      controlBorderRadius: "var(--radius)",
    },
  },
  brand: {
    theme: "dark",
    variables: {
      colorPrimary: "var(--checkout-brand)",
      colorPrimaryForeground: "var(--primary-foreground)",
      borderRadius: "var(--radius)",
      controlBorderRadius: "var(--radius)",
    },
    elements: { primaryButton: "merchant-pay" },
  },
  custom: { theme: "inherit" },
};
export function CheckoutShop({ recipient }: { recipient: HexAddress }) {
  const [mode, setMode] = useState<"preview" | "wallet">("preview");
  const [scenario, setScenario] = useState<Scenario>("success");
  const [look, setLook] = useState<Look>("default");
  const [sends, setSends] = useState(0);
  const simulated = useMemo(
    () => createSimulation(scenario, () => setSends((n) => n + 1)),
    [scenario],
  );
  const destination: Destination = {
    targetChain: BASE_SEPOLIA_CHAIN_ID,
    targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
    recipient,
  };
  return (
    <SettleProvider
      appearance={appearances[look]}
      config={{
        appName: "Melbourne weather",
        destination,
        ...(mode === "preview"
          ? simulated
          : { getSigner: getBrowserSigner, quoteUrl: "/api/settle-kit/quote" }),
      }}
    >
      <Playground
        mode={mode}
        setMode={setMode}
        scenario={scenario}
        setScenario={setScenario}
        look={look}
        setLook={setLook}
        sends={sends}
        resetSends={() => setSends(0)}
      />
    </SettleProvider>
  );
}
function Playground({
  mode,
  setMode,
  scenario,
  setScenario,
  look,
  setLook,
  sends,
  resetSends,
}: {
  mode: "preview" | "wallet";
  setMode: (mode: "preview" | "wallet") => void;
  scenario: Scenario;
  setScenario: (scenario: Scenario) => void;
  look: Look;
  setLook: (look: Look) => void;
  sends: number;
  resetSends: () => void;
}) {
  const checkout = useCheckout();
  const [layout, setLayout] = useState<(typeof layouts)[number]["id"]>("storefront");
  const activeLayout = layouts.find((item) => item.id === layout) ?? layouts[0];
  const [copied, setCopied] = useState(false);
  const selected = scenarios.find((item) => item.value === scenario);
  const code =
    look === "custom"
      ? `import { useCheckout } from "@settle-kit/react";\n\n// Your components. The same payment lifecycle.\nconst { state, begin, pay, isBusy } = useCheckout();\n\nawait begin({ amountUsdc: "0.1" });\n// Show your review UI, then call pay() on confirmation.\n// State narrows on state.status.`
      : `import { SettleProvider } from "@settle-kit/react";\nimport { Checkout } from "@settle-kit/react/ui";\nimport "@settle-kit/react/styles.css";\n\n<SettleProvider\n  config={{ appName: "Melbourne weather", destination, getSigner }}\n  appearance={${JSON.stringify(appearances[look], null, 2)}}\n>\n  <Checkout amountUsdc="0.1" title="Melbourne weather report" />\n</SettleProvider>`;
  function changeMode(next: "preview" | "wallet") {
    checkout.reset();
    resetSends();
    setMode(next);
  }
  return (
    <div className={`ui-demo-type ${styles.root}`} data-layout={layout}>
      <fieldset className={styles.switcher} aria-label="Checkout layout">
        <legend className="sr-only">Checkout layout</legend>
        <span className="ui-label text-muted-foreground" aria-hidden="true">
          Explore three directions
        </span>
        <div className="flex flex-wrap gap-2">
          {layouts.map((item) => (
            <Button
              key={item.id}
              variant={layout === item.id ? "default" : "outline"}
              aria-pressed={layout === item.id}
              onClick={() => setLayout(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </fieldset>
      <header className={styles.heading}>
        <div>
          <p className="ui-label text-muted-foreground">
            Lycoris / Settle Kit / Interactive preview
          </p>
          <h1>{activeLayout.title}</h1>
        </div>
        <p>{activeLayout.description}</p>
      </header>
      <div className={styles.layout}>
        <section
          className={styles.story}
          aria-label={layout === "guided" ? "How the payment works" : "About the weather report"}
        >
          {layout === "guided" ? (
            <>
              <p className="ui-label text-muted-foreground">The purchase, explained</p>
              <h2>
                Three steps.
                <br />
                One shared session.
              </h2>
              <ol className={styles.steps}>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Configure once</h3>
                    <p>
                      The merchant supplies the destination. Your app supplies the wallet signer.
                    </p>
                    <code>SettleProvider</code>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Review &amp; pay</h3>
                    <p>
                      Buy opens a quote. Confirm payment to check the USDC balance and submit the
                      transfer.
                    </p>
                    <code>begin → pay</code>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Receive the report</h3>
                    <p>
                      A successful receipt confirms payment. The host verifies access and unlocks
                      Melbourne weather.
                    </p>
                    <code>state.status === "settled"</code>
                  </div>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="ui-label text-muted-foreground">Melbourne / Weather desk</p>
              <div className={styles.weatherArt} aria-hidden="true">
                <CloudSun strokeWidth={0.8} />
                <span>37.81° S / 144.96° E</span>
              </div>
              <h2>
                Will you need
                <br />
                an umbrella?
              </h2>
              <p className={styles.storyDescription}>
                Your Melbourne report: temperature, rain probability, and the outlook for 1 pm.
              </p>
              <div className={styles.facts}>
                <span>One report</span>
                <strong>0.1 USDC</strong>
                <span>Base Sepolia · test payment</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Simulation unlocks a labeled sample. A verified wallet payment unlocks the weather
                report.
              </p>
            </>
          )}
        </section>
        <div className={styles.preview}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary px-6 py-3 ui-label text-primary-foreground">
            <span>
              {mode === "preview" ? "SIMULATED CHECKOUT" : "BASE SEPOLIA WALLET CHECKOUT"}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">USDC → USDC</span>
          </div>
          <p className={styles.modeNotice}>
            {mode === "preview"
              ? "Free simulation · no wallet needed · no funds move"
              : "Wallet payment · 0.1 test USDC + Base Sepolia ETH for gas"}
          </p>
          <div className={styles.checkoutBody}>
            {look === "custom" ? (
              <div className="w-full max-w-[400px]">
                <MerchantCheckout
                  amountUsdc={WEATHER_PRICE_USDC}
                  title={WEATHER_TITLE}
                  simulated={mode === "preview"}
                />
              </div>
            ) : (
              <Checkout
                amountUsdc={WEATHER_PRICE_USDC}
                title={WEATHER_TITLE}
                transactionUrl={mode === "preview" ? () => undefined : undefined}
              />
            )}
          </div>
          <WeatherAccess
            key={checkout.state.status === "settled" ? checkout.state.txHash : "inactive"}
            simulated={mode === "preview"}
          />
          <div className="flex flex-wrap justify-between gap-2 border-t border-border px-6 py-4 text-[length:var(--font-small-size)] text-muted-foreground">
            <span>
              state: <output data-testid="checkout-state">{checkout.state.status}</output>
            </span>
            {mode === "preview" && (
              <span>
                simulated submissions: <output data-testid="simulation-sends">{sends}</output>
              </span>
            )}
          </div>
        </div>
        <aside className={styles.controls} aria-label="Playground controls">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Make it yours
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-[length:var(--font-small-size)] font-medium text-foreground">
              01 / Payment mode
            </legend>
            <div className="flex gap-2">
              {(["preview", "wallet"] as const).map((item) => (
                <Button
                  key={item}
                  className="flex-1 rounded-none"
                  variant={mode === item ? "default" : "outline"}
                  aria-pressed={mode === item}
                  disabled={checkout.isBusy}
                  onClick={() => changeMode(item)}
                >
                  {item === "preview" ? "Simulation" : "Wallet"}
                </Button>
              ))}
            </div>
            <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
              {mode === "preview"
                ? "No wallet. No RPC calls. No funds move. The real SDK runs against a simulated signer and receipts."
                : "Uses your browser wallet. You need test USDC and Base Sepolia ETH. Payment unlocks the same report Lycoris buys through x402."}
            </p>
          </fieldset>
          {mode === "preview" && (
            <div className="space-y-3">
              <label
                htmlFor="scenario"
                className="block text-[length:var(--font-small-size)] font-medium text-foreground"
              >
                02 / Payment scenario
              </label>
              <select
                id="scenario"
                className="min-h-11 w-full rounded-none border border-border bg-background px-3 text-sm"
                disabled={checkout.isBusy}
                value={scenario}
                onChange={(event) => {
                  checkout.reset();
                  resetSends();
                  setScenario(event.target.value as Scenario);
                }}
              >
                {scenarios.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
                {selected?.description}
              </p>
            </div>
          )}
          <fieldset className={styles.appearance} aria-label="Checkout appearance">
            <legend className="mb-3 text-[length:var(--font-small-size)] font-medium text-foreground">
              03 / Appearance
            </legend>
            {(
              [
                ["default", "Default SDK"],
                ["light", "Light"],
                ["brand", "Merchant theme"],
                ["custom", "Merchant UI"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant="ghost"
                className="h-10 w-full justify-between rounded-none border border-border"
                aria-pressed={look === value}
                onClick={() => {
                  setCopied(false);
                  setLook(value);
                }}
              >
                {label}
                {look === value && <Check className="size-4" aria-hidden="true" />}
              </Button>
            ))}
            <p className="text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
              Change the look mid-payment. The session stays intact.
            </p>
          </fieldset>
        </aside>

        <section className={styles.code} aria-labelledby="embed-heading">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="embed-heading" className="flex items-center gap-2 text-sm font-medium">
              <Code2 className="size-4" aria-hidden="true" />
              {look === "custom" ? "Bring your own UI" : "The embed"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <Copy aria-hidden="true" className="size-3.5" />
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
          <section
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the code horizontally.
            tabIndex={0}
            aria-label="Integration code"
            className="overflow-x-auto p-5 text-[length:var(--font-small-size)] leading-7 text-muted-foreground"
          >
            <Highlight code={code} language="tsx" theme={codeTheme}>
              {({ className, style, tokens, getTokenProps }) => (
                <pre className={className} style={style}>
                  <code>
                    {tokens.map((line, lineIndex) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Token positions are regenerated with the snippet.
                      <span key={lineIndex}>
                        {line.map((token, tokenIndex) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: Tokens have no persistent identity.
                          <span key={tokenIndex} {...getTokenProps({ token })} />
                        ))}
                        {lineIndex < tokens.length - 1 ? "\n" : null}
                      </span>
                    ))}
                  </code>
                </pre>
              )}
            </Highlight>
          </section>
          <p className="border-t border-border px-5 py-4 text-[length:var(--font-small-size)] leading-relaxed text-muted-foreground">
            The host supplies destination and getSigner. Appearance changes the UI, not the payment.{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="https://github.com/hivinaynair/lycoris/tree/main/packages/settle-kit/react"
            >
              Read the integration guide{" "}
              <ArrowDown aria-hidden="true" className="inline size-3 -rotate-135" />
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
