import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const solc = require("solc") as {
  compile: (input: string) => string;
};

const name = process.argv[2] ?? "AttestationRegistryV2";
const sourcePath = resolve(process.cwd(), `contracts/lycoris/${name}.sol`);
const source = readFileSync(sourcePath, "utf8");

const input = {
  language: "Solidity",
  sources: { [`${name}.sol`]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
  errors?: Array<{ severity: string; formattedMessage: string }>;
  contracts: Record<
    string,
    Record<string, { abi: unknown; evm: { bytecode: { object: string } } }>
  >;
};

const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length > 0) {
  throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
}

const compiled = output.contracts[`${name}.sol`]?.[name];
if (!compiled) throw new Error(`solc produced no contract named ${name}`);

const artifact = { abi: compiled.abi, bytecode: compiled.evm.bytecode.object };
const outPath = resolve(process.cwd(), `contracts/lycoris/artifacts/${name}.json`);
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${outPath}`);
