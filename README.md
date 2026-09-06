# lycoris

Bun + Turborepo demo of **agentic USDC payments** on Base Sepolia.

An Eve agent pays for a paid API (Melbourne weather) through **x402**. A custom
facilitator runs identity / mandate gates, then settles Circle USDC.
The Lycoris UI shows the run.

Tooling layout matches ViperNxt (Bun-only, Turbo, Biome, `bun test`, Playwright
e2e). Named after *Lycoris Recoil* — agents on a mission. No ZK guest, desk, or T-bill clip.

**Requires** [Bun](https://bun.sh) `1.4.x`.

## Shape

```
apps/
  agent/         Eve agent — tools, wallet, x402 fetch
  facilitator/   Hono x402 facilitator + settlement gates
  lycoris/       Next.js demo UI (port 3003)
packages/
  shared/        Types, ABIs, chain helpers, decision records
  db/            Neon + Drizzle (attestations, agents, policies)
  scripts/       Compile / deploy / fund / bootstrap helpers
  ui/            shadcn components (@repo/ui)
contracts/lycoris/ AttestationRegistry (optional on-chain attest)
e2e/web/         Playwright harness (points at lycoris)
tooling/         typescript-config, mocks, dependency-cruiser
```

## What this is

| Piece | Role |
|---|---|
| Agent | Asks for weather; pays when the API returns HTTP 402 |
| Facilitator | Verifies payment + runs gates; settles USDC |
| Lycoris UI | Operator view of scenarios, gates, and rain answer |
| USDC | Circle Base Sepolia `0x036CbD…CF7e` (existing, not a custom token) |

## What we left out

- Sietch ZK / SP1 / guest ELF / T-bill / desk room
- ViperNxt `/next` skills, playbook hooks, journey/homework scripts
- SaaS starter `apps/web` and `@repo/db`

## Commands

```sh
bun install

# three processes (UI + facilitator + agent)
bun run dev

# or one at a time
bun run dev:ui
bun run dev:facilitator
bun run dev:agent

bun test
bun run check-types
bun run check-boundaries
bun run check-tokens
```

Copy `.env.example` → `.env.local` under `apps/agent`, `apps/facilitator`,
`apps/lycoris`, and `packages/db` (and `packages/scripts` for
bootstrap). See each file for required keys (CDP, Anthropic, Neon, facilitator
URL, etc.).

Demo bootstrap (wallets, mandate seed, funding):

```sh
bun run lycoris:bootstrap
```

## Pitch in one line

Agent wants a paid API → x402 challenge → facilitator gates → USDC settles on
Base Sepolia → weather answer returns.
