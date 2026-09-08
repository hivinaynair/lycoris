# Sponsored Base Sepolia checkout

The public checkout makes real transfers of Circle test USDC. It uses a dedicated
CDP server wallet, not the visitor's wallet or the developer's personal wallet.
The demo pays gas. No signup, wallet popup, or report-ownership signature is needed.

## Setup

1. Set DATABASE_URL and CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in
   packages/scripts/.env.local.
2. Run `bun run lycoris:setup-sponsored-checkout`. This creates only the sponsored
   payment table/reservation function and a named CDP wallet. It prints its address.
3. Add that address as SPONSORED_WALLET_ADDRESS to apps/lycoris/.env.local, with the
   same server-only CDP credentials and database.
4. Fund the new wallet using `bun run lycoris:fund-wallet ADDRESS --token usdc`
   and `bun run lycoris:fund-wallet ADDRESS --token eth`.
5. Restart the app. For deployment, configure the same server environment variables.

Never add CDP secrets to NEXT_PUBLIC variables or import server wallet code into a
client component. Do not import a personal wallet private key for this demo.

## Payment and recovery

The browser persists an opaque purchase UUID before sending. The server accepts
only that UUID, never arbitrary calldata, recipients, chains or amounts. It checks
the sponsor's USDC balance before the first reservation and constructs exactly one
0.1 USDC transfer on Base Sepolia.

A database function serializes reservations across instances and caps this sponsor
at **10 purchases total (1 USDC)**. Pending or failed reservations also count.
The same purchase UUID is used as the CDP idempotency key, so uncertain requests can
retry without a second transfer. The submitted hash is stored in the database.
Unresolved reservations older than one hour require operator review; they are not
resubmitted. Do not delete real reservation records to reset the budget.

The SDK confirms the receipt, and the report endpoint independently verifies the
transaction calldata, sender, recipient, token and Transfer event. A purchase UUID
is a bearer access capability for its report; access expires 15 minutes after payment.
Report retries do not send payments.

No faucet refill occurs automatically. Exhaustion is a real unavailable state,
never a fallback simulation. The budget is intentionally small for this demo.
Origin checks prevent casual cross-site submissions, but this anonymous endpoint
is not bot-proof: a visitor can consume the remaining budget. Broader public use
needs per-visitor abuse controls and an explicit budget/refill policy.

## Verification

`bun --env-file=packages/scripts/.env.local packages/scripts/check-sponsored-budget.ts`
checks concurrent reservations and duplicate IDs in the configured database,
then removes only its own test rows. It never submits a payment.

Browser tests mock the sponsor and RPC endpoints so automated test runs do not
consume funds. A separately performed live payment verifies the actual CDP path.
