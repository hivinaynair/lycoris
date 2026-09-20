# Sponsored Base Sepolia checkout

The playground’s default rail. The visitor clicks Pay without connecting a
personal wallet. Switch to **Your wallet** on `/checkout` to pay from Coinbase
Wallet or another injected EOA instead — that path does not use this faucet.

The browser creates
a disposable Coinbase smart account using a locally stored burner key. A dedicated
CDP server wallet funds it with 0.1 Circle test USDC. That smart account pays the
merchant through an ERC-4337 user operation, with gas sponsored by a CDP paymaster.
The faucet transfer, user operation, and enclosing bundle transaction are distinct.

## Setup

1. Configure DATABASE_URL and the server-only CDP credentials in
   `scripts/.env.local`.
2. Run `bun --env-file=scripts/.env.local scripts/demo/setup-sponsored-checkout.ts`. It creates the reservation
   table/function and a named CDP wallet, then prints its address.
3. Set that address as SPONSORED_WALLET_ADDRESS in `apps/lycoris/.env.local`, along
   with DATABASE_URL, PAY_TO_ADDRESS, the CDP credentials, and CDP_PAYMASTER_URL.
   The latter is the combined bundler/paymaster endpoint and stays server-side.
4. Fund the dedicated server wallet with test USDC and test ETH for faucet gas.
   The full funding allowance is 5 test USDC; a smaller balance supports fewer runs.
5. Restart the app. Apply the same configuration and schema to the deployment.

Fresh setup uses a **50-purchase** reservation cap. Changing the UI constant alone
does not change an existing database function. Inspect the configured database with
`bun --env-file=apps/lycoris/.env.local scripts/demo/check-sponsored-config.ts`; this check reads the function, columns,
and reservation count without creating purchases or sending funds.

CDP keys and the paymaster URL must never be NEXT_PUBLIC variables. The browser’s
burner key is intentionally disposable and is not suitable for personal funds.

## Payment and recovery

The browser persists a purchase UUID before requesting funds. `/api/checkout/fund`
accepts that ID and a payer address; the server fixes the token, amount, chain, and
merchant. A database advisory lock serializes reservations across instances. The
cap is **50 funded purchases / 5 test USDC per sponsor**, including pending or failed
reservations. It is a faucet cap, not a limit on all possible paymaster gas spend.

The UUID is also the CDP funding idempotency key. The server waits for the funding
receipt and records its hash and payer. The browser waits for its RPC to see the
funded balance, submits the smart-account operation, and saves its hash. Funding
reservations older than the one-hour provider retry window require operator review;
the browser rotates stale records without a submitted operation after 50 minutes.
Do not delete uncertain reservations to reset the budget.

`/api/paymaster` forwards only allowed RPC methods. Requests that estimate, sponsor,
or submit an operation must encode one exact 0.1 USDC transfer to the configured
merchant. Batches, approvals, other recipients, amounts, and ETH value are refused.
This policy limits what this proxy sponsors; it does not restrict what a burner
owner could submit through another provider with their own gas.

The SDK reads the user operation’s own success flag. A successful bundle transaction
can contain a reverted operation. Explorer links use the enclosing transaction
hash, while payment recovery uses the operation hash.

The report endpoint independently verifies the operation’s sender against the
server-recorded payer and checks the USDC Transfer event’s token, sender, recipient,
amount, and age. A unique operation claim prevents one payment being used for two
purchases. Report access expires 15 minutes after confirmation; retrying report
delivery does not send another payment.

## Operational limits

Core sessions are in memory. The host saves purchase IDs and hashes, but this is
not a durable reconciliation service. Losing browser storage or crashing between
submission and saving a hash can still require manual investigation. A faucet
reservation does not provide exactly-once guarantees for every later operation.

No automatic faucet refill occurs. Funding failures currently share an unavailable
message; do not infer budget exhaustion from that message alone. The operator must
distinguish funding, configuration, provider, and budget failures. Anonymous visitors
can consume the faucet budget, and gas sponsorship needs its own provider controls.
Broader deployment needs abuse controls, monitoring, and a replenishment policy.

## Verification

`bun --env-file=apps/lycoris/.env.local scripts/demo/check-sponsored-config.ts` is read-only.
It does not submit a payment.

Browser fixtures mock the faucet, bundler, paymaster, and report endpoints. Those
tests prove UI behavior; a separate live testnet run checks provider integration.
