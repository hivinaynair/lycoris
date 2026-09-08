import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const sdkPackages = ["core", "react", "agents", "server"];
export const root = join(import.meta.dirname, "../..");
export const registry = "https://registry.npmjs.org";

export async function run(command, cwd = root) {
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((await child.exited) !== 0) throw new Error(`Failed: ${command.join(" ")}`);
}

export function assertReleaseVersion(version) {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta|rc)\.(0|[1-9]\d*))?$/.test(version)
  )
    throw new Error("Use a release version such as 0.0.1 or 0.0.2-beta.0");
}

export async function readSdkManifests(expectedVersion) {
  const packages = [];
  for (const name of sdkPackages) {
    const cwd = join(root, "packages/settle-kit", name);
    const manifest = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
    const version = expectedVersion ?? packages[0]?.manifest.version ?? manifest.version;
    assertReleaseVersion(version);
    if (manifest.version !== version) throw new Error(`${name}: expected version ${version}`);
    if (manifest.private || manifest.publishConfig?.access !== "public")
      throw new Error(`${name}: package must be explicitly public`);
    packages.push({ name, cwd, manifest });
  }
  return packages;
}

export async function packSdk(destination, expectedVersion) {
  const packages = await readSdkManifests(expectedVersion);
  await mkdir(destination, { recursive: true });
  for (const pkg of packages) {
    await run(["bun", "run", "build"], pkg.cwd);
    await run(
      ["bun", "pm", "pack", "--ignore-scripts", "--filename", join(destination, `${pkg.name}.tgz`)],
      pkg.cwd,
    );
  }
  return packages;
}

export function validatePackedManifest(manifest, files) {
  const paths = new Set(files);
  const checkTarget = (target) => {
    if (typeof target === "string") {
      if (!paths.has(`package/${target.replace(/^\.\//, "")}`))
        throw new Error(`${manifest.name}: missing export ${target}`);
    } else if (target && typeof target === "object") {
      Object.values(target).forEach(checkTarget);
    }
  };
  checkTarget(manifest.exports);
  for (const group of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, version] of Object.entries(manifest[group] ?? {})) {
      if (name.startsWith("@repo/") || /^(workspace:|file:|link:)/.test(version))
        throw new Error(`${manifest.name}: nonportable dependency ${name}@${version}`);
    }
  }
  if (files.some((file) => /(?:\.test\.[cm]?[jt]sx?$|(?:^|\/)\.env(?:\.|$))/.test(file)))
    throw new Error(`${manifest.name}: test or environment file in package`);
}
