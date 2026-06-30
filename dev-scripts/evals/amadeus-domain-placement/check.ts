#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { domainPlacementContract } from "../../../amadeus-contracts/catalog";

const root = resolve(import.meta.dir, "../../..");
const legacyIntentDomainRoot = domainPlacementContract.legacyIntentDomainSegments.join("/");
const legacyIntentDomainPattern = `${legacyIntentDomainRoot}/**`;

const humanFacingFiles = [
  "CONTEXT.md",
  "README.md",
  ...listMarkdownFiles("docs"),
  ...listMarkdownFiles("skills").filter((file) => file.startsWith("skills/amadeus-")),
  ...listMarkdownFiles(".agents/skills").filter((file) => file.startsWith(".agents/skills/amadeus-")),
];

const constructionExample = "examples/04-construction-design-ready/.amadeus/intents/20260629-minimum-purchase-flow";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function listMarkdownFiles(directory: string): string[] {
  const absoluteDirectory = join(root, directory);
  if (!existsSync(absoluteDirectory)) return [];
  return walk(absoluteDirectory)
    .map((path) => path.slice(root.length + 1))
    .filter((path) => path.endsWith(".md"))
    .sort();
}

function walk(directory: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      paths.push(...walk(path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

for (const file of humanFacingFiles) {
  const path = join(root, file);
  assert(existsSync(path), `missing file: ${file}`);
  const text = readFileSync(path, "utf8");
  assert(!text.includes(legacyIntentDomainRoot), `${file} must not mention ${legacyIntentDomainRoot}`);
  assert(!text.includes(legacyIntentDomainPattern), `${file} must not mention ${legacyIntentDomainPattern}`);
}

for (const snapshot of [
  "examples/03-inception-completed/.amadeus/intents/20260629-minimum-purchase-flow",
  constructionExample,
]) {
  assert(
    !existsSync(join(root, snapshot, ...domainPlacementContract.legacyIntentDomainSegments)),
    `${snapshot} must not include the legacy Intent domain directory`,
  );
}

for (const noteFile of domainPlacementContract.intentNoteFiles) {
  assert(noteFile.endsWith(".md"), `intent note file must be Markdown: ${noteFile}`);
}

assert(
  existsSync(join(root, constructionExample, "construction/U002-order-creation/functional-design")),
  "construction example must keep Unit Functional Design",
);
for (const snapshot of [
  "examples/01-discovery-completed",
  "examples/02-ideation-completed",
  "examples/03-inception-completed",
  "examples/04-construction-design-ready",
]) {
  assert(!existsSync(join(root, snapshot, domainPlacementContract.legacySharedDomainRoot)), `${snapshot} must not include the legacy shared domain directory`);
  for (const artifact of domainPlacementContract.sharedDomainArtifacts) {
    assert(existsSync(join(root, snapshot, artifact)), `${snapshot} must include ${artifact}`);
  }
}
assert(existsSync(join(root, "examples/01-discovery-completed/.amadeus/glossary.md")), "examples must keep Glossary");

console.log("amadeus domain placement eval: ok");
