# Releasing Settle Kit to npm

The four packages release together: `@settle-kit/core`, `@settle-kit/react`,
`@settle-kit/agents`, and `@settle-kit/server`. Releases use Bun to build, pack,
and publish. Consumers receive ESM, declarations, source for Bun's export
condition, and compiled CSS for the optional React UI.

## First release setup

- Confirm ownership of the `@settle-kit` npm organization/scope. If it is not
  available, rename all four packages and their imports before the first release.
- Choose a public license and put its LICENSE file in each SDK package, with
  matching `license` metadata. License approval is still pending; none is assumed.
- Create the GitHub environment `npm`. Add `NPM_TOKEN` as an environment secret:
  a granular npm token with publish access to the four packages and permission
  to bypass interactive 2FA for CI. Set its expiration and rotate it when needed. See the
  [npm token documentation](https://docs.npmjs.com/creating-and-viewing-access-tokens/).
- Restrict that environment to release tags. Optional required reviewers can
  provide an approval gate before the first registry write.

No credentials belong in source files. The publish job alone receives the token.
The workflow uses Bun's token-based publication; it does not claim OIDC or
provenance support. This is a demo release pipeline: npm has announced that
[January 2027 as the target for ending bypass-2FA token direct publishing](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/).
Before that change, migrate publication to a supported trusted or staged
publishing flow. See [Bun publish](https://bun.sh/docs/pm/cli/publish).

## Validate without publishing

```sh
bun install --frozen-lockfile
bun run check-types
bun run check-boundaries
bun run check-tokens
bun test
bun run pack:settle-kit
bun run check:settle-kit-package
bun run --cwd e2e/web e2e:install
bun run smoke:settle-kit "$PWD/dist/settle-kit"
```

You can also run **Release Settle Kit** manually in GitHub Actions. Manual runs
validate and upload tarballs; they do not publish. Pull requests run the package
checks as part of the regular Check workflow.

Artifact checks verify public export targets, declarations, portable runtime
dependencies, and exclusion of tests/environment files. A temporary consumer
outside the workspace loads core, React and agents under Node and Bun, and
checks all four declaration entry points. The Next production fixture compiles
the server adapter in an App Router route. Its browser test completes two
simulated purchases under one provider, checks styles and mobile overflow, and
fails on browser errors. No money moves and no real facilitator is called.

## Publish a version

```sh
bun run version:settle-kit 0.0.2-beta.0
```

Review and commit the four manifests and `bun.lock`. Merge the release commit
into `main`, then create and push its release tag:

```sh
git tag settle-kit-v0.0.2-beta.0
git push origin settle-kit-v0.0.2-beta.0
```

The tag suffix must match every SDK manifest. Tagged commits must belong to
`main`. The workflow reruns validation, uploads the checked tarballs, and then
publishes those exact artifacts in dependency order (core first). Numbered
`alpha`, `beta`, or `rc` releases use npm's `next` dist-tag; stable versions use
`latest`. For the initial `0.0.1`, use `settle-kit-v0.0.1` after setup is complete.

npm publication is not atomic across packages. A rerun skips versions already
present only when their registry integrity matches the checked tarball and continues with the remaining packages. Do not change code under an
existing version/tag. Fixes require a new version; never move a release tag.
Check all four package pages and install them in a fresh consumer after the
first actual publication. Local tarball checks are not evidence of a live npm
release.

## Consumer entry points

```sh
bun add @settle-kit/react viem react
# Headless: bun add @settle-kit/core viem
# Agents: bun add @settle-kit/agents
# Next server: bun add @settle-kit/server next react react-dom
```

Use `@settle-kit/react` for Provider/hooks, `@settle-kit/react/ui` for `Checkout`,
and `@settle-kit/react/styles.css` for compiled styles. Import
`@settle-kit/server/next` inside a Next App Router route; its upstream adapter
requires Next's module resolution. No `transpilePackages` setting is needed.
See each package README for usage and the Base Sepolia/test-USDC limitations.
