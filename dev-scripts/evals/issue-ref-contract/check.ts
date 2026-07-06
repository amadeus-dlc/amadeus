#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const checkCommand = ["bun", "run", join(root, "dev-scripts/check-issue-ref-contract.ts")];

const tmpRoots: string[] = [];
process.on("exit", () => {
  for (const dir of tmpRoots) rmSync(dir, { recursive: true, force: true });
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stderr;
}

function expectIssue(stderr: string, needle: string, label: string): void {
  if (stderr.includes(needle)) return;
  fail(`expected ${label} to be reported with "${needle}", got:\n${stderr}`);
}

const completeContractText = [
  "# amadeus",
  "",
  "### GitHub Issue references as input",
  "",
  "- When the repository context is resolvable, `#nnn` is equivalent to that Issue's URL.",
  "- Accept the explicit `owner/repo#nnn` form.",
  "- When the repository context is ambiguous, stop and ask the human before treating a bare `#nnn` as an Issue input.",
  "",
].join("\n");

const missingContractText = ["# amadeus", "", "No Issue-reference contract here.", ""].join("\n");

function writeSkillTree(fixtureRoot: string, text: string, withPromotedCopy: boolean): void {
  mkdirSync(join(fixtureRoot, "core/skills/amadeus"), { recursive: true });
  writeFileSync(join(fixtureRoot, "core/skills/amadeus/SKILL.md"), text);
  if (withPromotedCopy) {
    mkdirSync(join(fixtureRoot, ".agents/skills/amadeus"), { recursive: true });
    writeFileSync(join(fixtureRoot, ".agents/skills/amadeus/SKILL.md"), text);
  }
}

function makeFixture(text: string, withPromotedCopy = true): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "issue-ref-contract"));
  tmpRoots.push(fixtureRoot);
  writeSkillTree(fixtureRoot, text, withPromotedCopy);
  return fixtureRoot;
}

// 契約文言が揃った fixture は pass する。
run(checkCommand, makeFixture(completeContractText));

// 契約文言が欠けている fixture は fail する（RED を確認する対象の挙動）。
const missing = makeFixture(missingContractText);
const missingStderr = runExpectFailure(checkCommand, missing);
expectIssue(missingStderr, 'missing required issue-ref-contract marker "#nnn"', "missing #nnn marker");
expectIssue(missingStderr, 'missing required issue-ref-contract marker "owner/repo#nnn"', "missing owner/repo#nnn marker");
expectIssue(missingStderr, 'missing required issue-ref-contract marker "ambiguous"', "missing ambiguous marker");

// 昇格先の SKILL.md が欠けている場合も fail する。
const missingPromotion = makeFixture(completeContractText, false);
expectIssue(
  runExpectFailure(checkCommand, missingPromotion),
  "missing file: .agents/skills/amadeus/SKILL.md",
  "missing promoted counterpart",
);

// source と昇格先で片方だけ契約が欠けている場合も fail する。
const staleMismatch = makeFixture(completeContractText);
writeFileSync(join(staleMismatch, ".agents/skills/amadeus/SKILL.md"), missingContractText);
expectIssue(
  runExpectFailure(checkCommand, staleMismatch),
  'missing required issue-ref-contract marker "#nnn"',
  "stale promoted copy missing markers",
);

// 実リポジトリの配線が pass する（本 Bolt の repair + promote 後の GREEN 確認）。
run(checkCommand, root);

console.log("issue-ref contract eval: ok");
