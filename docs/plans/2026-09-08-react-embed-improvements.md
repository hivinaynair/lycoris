# React embed improvements

The three-package split and USDC-only core remain intact. The host owns presentation;
the core manager remains the source of payment state through useSyncExternalStore.

- React actions have stable identities. Session callbacks use the initiating hook's
  latest committed callbacks and stop on unmount. Configuration changes affect future
  sessions, not payments already started.
- canPay and isBusy derive from the discriminated state, without another state machine.
  canPay does not promise a sufficient balance or unexpired quote.
- Checkout requires an amount and supports className, destination overrides, action
  labels, onSettled and onFailed. Full localization remains a custom-UI concern.
- Default UI moved to @settle-kit/react/ui; styles are explicitly imported from
  @settle-kit/react/styles.css. No injected inline styles or global reset.
- The Lycoris merchant recipe uses shared shadcn components. The appearance switch
  retains one Provider/session. SDK packages do not import those components.
- All three packages build ESM and declarations. React output retains client directives.
  The independent Next fixture consumes packed output without transpilePackages.

Interview wording:

“I separate the payment lifecycle from presentation. A merchant can use the default
checkout or their existing shadcn components with the same hook. The UI can change
while a payment is pending without losing the session. The packages ship JavaScript
and declarations, and I test the embed outside the monorepo.”

Still Base Sepolia, Circle USDC only; balance preflight and receipt confirmation are
unchanged. No cards, KYC, swaps, bridges or reload recovery.
