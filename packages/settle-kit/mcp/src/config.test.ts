import { describe, expect, it } from "bun:test";
import { generatePrivateKey } from "viem/accounts";
import { readConfig } from "./config";

const key = generatePrivateKey();

describe("readConfig", () => {
  it("names the missing mandate at startup", () => {
    expect(() => readConfig({})).toThrow(/SETTLE_MCP_MANDATE/);
  });

  it("names a missing signer credential", () => {
    expect(() =>
      readConfig({
        SETTLE_MCP_MANDATE: "{}",
        SETTLE_MCP_FACILITATOR_URL: "https://facilitator.test",
        SETTLE_MCP_ALLOWLIST: "https://example.test/x",
      }),
    ).toThrow(/SETTLE_MCP_PRIVATE_KEY/);
  });

  it("parses the allowlist and accepts a private key", () => {
    const config = readConfig({
      SETTLE_MCP_MANDATE: "header",
      SETTLE_MCP_FACILITATOR_URL: "https://facilitator.test/",
      SETTLE_MCP_ALLOWLIST: "https://a.test/x, https://b.test/y",
      SETTLE_MCP_PRIVATE_KEY: key,
    });
    expect(config.allowlist).toEqual(["https://a.test/x", "https://b.test/y"]);
    expect(config.facilitatorUrl).toBe("https://facilitator.test/");
  });
});
