import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { shouldRunOnlyAllow } from "./only-allow-bun.ts";

const script = join(import.meta.dir, "only-allow-bun.ts");

function runPreinstall(env: Record<string, string | undefined>) {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== "VERCEL" && key !== "npm_config_user_agent") {
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return Bun.spawnSync(["bun", script], {
    env: merged,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("shouldRunOnlyAllow", () => {
  test("skips on Vercel so inherited npm user-agent cannot fail the install", () => {
    expect(shouldRunOnlyAllow({ VERCEL: "1" })).toBe(false);
    expect(
      shouldRunOnlyAllow({
        VERCEL: "1",
        npm_config_user_agent: "npm/10.9.2 node/v22.22.2 linux x64",
      }),
    ).toBe(false);
  });

  test("runs off Vercel", () => {
    expect(shouldRunOnlyAllow({})).toBe(true);
    expect(
      shouldRunOnlyAllow({
        npm_config_user_agent: "npm/10.9.2 node/v22.22.2 linux x64",
      }),
    ).toBe(true);
  });
});

describe("only-allow-bun preinstall", () => {
  test("allows Vercel builds that inherit npm user-agent", () => {
    const result = runPreinstall({
      VERCEL: "1",
      npm_config_user_agent: "npm/10.9.2 node/v22.22.2 linux x64 workspaces/false",
    });
    expect(result.exitCode).toBe(0);
  });

  test("still rejects npm installs off Vercel", () => {
    const result = runPreinstall({
      npm_config_user_agent: "npm/10.9.2 node/v22.22.2 linux x64 workspaces/false",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString() + result.stderr.toString()).toContain('Use "bun install"');
  });

  test("allows bun user-agent", () => {
    const result = runPreinstall({
      npm_config_user_agent: "bun/1.4.2 npm/? node/v22.22.2 linux x64",
    });
    expect(result.exitCode).toBe(0);
  });
});
