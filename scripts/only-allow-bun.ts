/**
 * Vercel's build runner is Node, so installCommand inherits
 * `npm_config_user_agent=npm` even when the command is bun. only-allow then
 * false-positives and fails production installs. Skip on Vercel; otherwise
 * keep the bun-only gate.
 */
export function shouldRunOnlyAllow(env: Record<string, string | undefined> = process.env): boolean {
  return !env.VERCEL;
}

if (import.meta.main) {
  if (!shouldRunOnlyAllow(process.env)) {
    process.exit(0);
  }

  const result = Bun.spawnSync(["bunx", "only-allow@1.2.2", "bun"], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exit(result.exitCode ?? 1);
}
