# Releasing Settle Kit to npm

The five packages would release together: `@settle-kit/core`, `@settle-kit/react`,
`@settle-kit/agents`, `@settle-kit/server`, and `@settle-kit/mcp`.

**No npm release has happened.** There is no pack, version, or publish pipeline in
this repository. Scope ownership, credentials, and a license decision still do not
exist. No open-source license is granted — do not assume MIT.

Until those exist, consume the packages from this workspace after
`bun run build --filter=@settle-kit/react` (and the siblings you need). Point a host
`package.json` at `packages/settle-kit/*`.

## Consumer entry points

```sh
# After a workspace build, from a host app:
# bun add file:/path/to/lycoris/packages/settle-kit/react
# Headless: packages/settle-kit/core
# Agents: packages/settle-kit/agents
# Next server: packages/settle-kit/server
# MCP: packages/settle-kit/mcp
```

Use `@settle-kit/react` for Provider/hooks, `@settle-kit/react/ui` for `Checkout`,
and `@settle-kit/react/styles.css` for compiled styles. Import
`@settle-kit/server/next` inside a Next App Router route. No `transpilePackages`
setting is needed. See each package README for usage and the Base Sepolia/test-USDC
limitations.
