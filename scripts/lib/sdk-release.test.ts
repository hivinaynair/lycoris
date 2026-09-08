import { describe, expect, it } from "bun:test";
import { assertReleaseVersion, validatePackedManifest } from "./sdk-release.mjs";

const manifest = {
  name: "@settle-kit/test",
  exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
  dependencies: { "@settle-kit/core": "0.0.1" },
};
const files = ["package/dist/index.js", "package/dist/index.d.ts"];

describe("release artifact validation", () => {
  it("accepts portable compiled packages", () => {
    expect(() => validatePackedManifest(manifest, files)).not.toThrow();
  });
  it("rejects missing declaration and JavaScript exports", () => {
    for (const file of files)
      expect(() => validatePackedManifest(manifest, [file])).toThrow("missing export");
  });
  it("rejects private workspace and local runtime dependencies", () => {
    for (const dependencies of [
      { "@repo/db": "0.0.1" },
      { "@settle-kit/core": "workspace:*" },
      { dependency: "file:../dependency" },
      { dependency: "link:../dependency" },
    ])
      expect(() => validatePackedManifest({ ...manifest, dependencies }, files)).toThrow(
        "nonportable",
      );
  });
  it("rejects tests and environment files", () => {
    for (const file of ["package/src/a.test.ts", "package/.env", "package/.env.local"])
      expect(() => validatePackedManifest(manifest, [...files, file])).toThrow(
        "test or environment",
      );
  });
  it("accepts stable and explicitly numbered demo prereleases", () => {
    for (const version of ["0.0.1", "1.0.0", "0.1.0-beta.0", "0.1.0-rc.12"])
      expect(() => assertReleaseVersion(version)).not.toThrow();
  });
  it("rejects malformed versions before a package can be changed or published", () => {
    for (const version of ["", "v1.0.0", "01.0.0", "1.0", "1.0.0-beta", "1.0.0;echo secret"])
      expect(() => assertReleaseVersion(version)).toThrow();
  });
});
