#!/usr/bin/env bun
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const script = join(root, "scripts/check-drift.ts");
let dir: string | null = null;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

function run(cwd: string) {
  try {
    return {
      code: 0,
      out: execFileSync("bun", [script], { cwd, encoding: "utf8" }),
    };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

describe("check-drift", () => {
  test("clean when no product state", () => {
    dir = mkdtempSync(join(tmpdir(), "drift-"));
    const r = run(dir);
    expect(r.code).toBe(0);
    expect(r.out).toContain("no product state");
  });

  test("flags idea_outdated", () => {
    dir = mkdtempSync(join(tmpdir(), "drift-"));
    mkdirSync(join(dir, "docs/product"), { recursive: true });
    writeFileSync(
      join(dir, "docs/product/state.yaml"),
      `product: demo\nidea: runs on paper\nidea_outdated: true\nphases: {}\n`,
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo" }));
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain("idea_outdated");
  });
});
