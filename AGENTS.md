# lycoris

Bun-only Turborepo for an **agentic USDC payment** demo. Read [README.md](README.md)
for layout and commands. This file is the short version agents need before
touching anything.

## Constraints

- **Bun only.** `bun`, `bunx`, `bun test`. `only-allow bun` fails other installs.
  Do not add npm/pnpm/yarn, Vitest, or ESLint.
- **Demo scope.** Keep the x402 agent → facilitator → Lycoris path. Do not
  reintroduce Sietch ZK / guest / T-bill / desk code.
- **shadcn/ui lives in `packages/ui`** (`@repo/ui`). Never install components
  into an app. Add with `bun run ui:add -- <component>`.
- **Env vars** are validated per app (`env.ts` / `@t3-oss/env-*`). Prefer those
  helpers over raw `process.env` in app code.
- **`@repo/db`** is the demo database (Neon + Drizzle).

## Apps

| App | Port | Job |
|---|---|---|
| `lycoris` | 3003 | Demo UI |
| `agent` | 3002 | Eve agent |
| `facilitator` | (see `.env`) | x402 settle + gates |

## Before merging

```sh
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
```

## Out of scope

ViperNxt playbook (`/next`, shape, journeys, homework) was stripped on purpose.
Do not restore it here.
