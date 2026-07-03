#!/usr/bin/env bun

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generatedContractFiles, staleGeneratedContractFiles, writeGeneratedContractFiles } from "../../amadeus-contracts";

const root = resolve(import.meta.dir, "../../..");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assert(condition: boolean, message: string): void {
  if (!condition) fail(message);
}

const generatedPaths = generatedContractFiles().map((file) => file.path).sort();
for (const path of [
  "amadeus-contracts/generated/skills.json",
  "amadeus-contracts/generated/references.md",
  "skills/amadeus-grilling/references/skill-contract.md",
  "skills/amadeus-validator/references/skill-contract.md",
  ".agents/skills/amadeus-grilling/references/skill-contract.md",
  ".agents/skills/amadeus-validator/references/skill-contract.md",
]) {
  assert(generatedPaths.includes(path), `generated contract file is not tracked: ${path}`);
}

for (const path of [
  "amadeus-contracts/catalog/domain-placement.ts",
  "amadeus-contracts/catalog/skill-contract.ts",
  "amadeus-contracts/catalog/skill-contract-boundary.ts",
  "amadeus-contracts/catalog/skill-contract-condition.ts",
  "amadeus-contracts/catalog/skill-contract-consumer.ts",
  "amadeus-contracts/catalog/skill-contract-consumer-reference.ts",
  "amadeus-contracts/catalog/skill-contract-delegation.ts",
  "amadeus-contracts/catalog/skills.ts",
]) {
  assert(existsSync(join(root, path)), `contract catalog source missing: ${path}`);
}

const stale = staleGeneratedContractFiles();
assert(stale.length === 0, `generated contracts are stale: ${stale.join(", ")}`);

const skillsJson = readFileSync(join(root, "amadeus-contracts/generated/skills.json"), "utf8");
assert(skillsJson.includes("\"skillContracts\""), "skills.json contains skill contracts");
assert(skillsJson.includes("\"consumerReferences\""), "skills.json contains consumer references");

const grillingReference = readFileSync(join(root, "skills/amadeus-grilling/references/skill-contract.md"), "utf8");
assert(grillingReference.includes("## Consumer References"), "skill reference documents include consumer references");
assert(grillingReference.includes("validator"), "skill reference documents include validator consumer");

const tempRoot = mkdtempSync(join(tmpdir(), "amadeus-contracts-eval"));
writeGeneratedContractFiles(tempRoot);
writeFileSync(join(tempRoot, "amadeus-contracts/generated/skills.json"), "{\n  \"edited\": true\n}\n");
const staleAfterSkillEdit = staleGeneratedContractFiles(tempRoot);
assert(
  staleAfterSkillEdit.includes("amadeus-contracts/generated/skills.json"),
  "contracts check detects direct edits to generated skill contracts",
);

console.log("amadeus contracts eval: ok");
