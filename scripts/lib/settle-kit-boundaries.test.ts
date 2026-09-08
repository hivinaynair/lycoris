import { expect, it } from "bun:test";
import { checkSdkSource, packageAllowed } from "./settle-kit-boundaries.mjs";

it("rejects forbidden imports through every supported syntax", () => {
  for (const source of [
    'import "@repo/shared";',
    'export * from "@settle-kit/react";',
    'const x = import("@x402/core");',
    'const x = require("wagmi");',
    'type T = import("react").ReactNode;',
    'import x = require("eve");',
    'import "../../apps/agent";',
    "const x = import(moduleName);",
  ])
    expect(
      checkSdkSource("core", "/kit/core/src/index.ts", source, "/kit/core/src").length,
    ).toBeGreaterThan(0);
});
it("allows local files and explicit dependencies but excludes DOM", () => {
  expect(
    checkSdkSource(
      "core",
      "/kit/core/src/index.ts",
      'import { http } from "viem"; export * from "./types";',
      "/kit/core/src",
    ),
  ).toEqual([]);
  expect(
    checkSdkSource(
      "core",
      "/kit/core/src/index.ts",
      'window.document; globalThis["document"];',
      "/kit/core/src",
    ).length,
  ).toBeGreaterThan(0);
  expect(packageAllowed("react", "@settle-kit/agents")).toBe(false);
  expect(packageAllowed("agents", "react/jsx-runtime")).toBe(false);
  expect(packageAllowed("agents", "@x402/core/http")).toBe(true);
});
