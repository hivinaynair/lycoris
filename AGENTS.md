# lycoris

Bun-only Turborepo for an **agentic USDC payment** demo.
## Constraints

- **Bun only.** `bun`, `bunx`, `bun test`. `only-allow bun` fails other installs.
  Do not add npm/pnpm/yarn, Vitest, or ESLint.
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
