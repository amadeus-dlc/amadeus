#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const checkCommand = ["bun", "run", join(root, "dev-scripts/check-grilling-wiring.ts")];

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

const annexText = [
  "# Question Rendering — Claude Code harness annex",
  "",
  "## Mechanism",
  "",
  "Mode selection renders as a 4-option choice, in this order: Guide me, Grill me,",
  "I'll edit the file, Chat. Guide me stays first and default.",
  "",
  "- Grill me: one question at a time, recommended answer attached (see",
  "  `../../amadeus-grilling/references/engine-bridge.md`).",
  "- Grill me answers are written back as `[Answer]:` and logged with",
  "  `amadeus-log.ts decision` / `amadeus-log.ts answer`.",
  "",
].join("\n");

const conductorText = ["# amadeus", "", "run-stage row references the annex.", ""].join("\n");

const bridgeText = ["# Engine Bridge", "", "Grill me is inserted as the 2nd mode-selection option.", ""].join("\n");

const newStageSkillText = [
  "# amadeus-foo",
  "",
  "1. Run the stage.",
  "",
  "   When this stage asks the user questions, offer Grill me as the 2nd option",
  "   of the mode selection. When the user picks it, follow the grilling bridge",
  "   protocol in `../amadeus-grilling/references/engine-bridge.md` (one",
  "   question at a time, recommended answer attached, answers written back in",
  "   `[Answer]:` format).",
  "",
].join("\n");

const oldStageSkillText = [
  "# amadeus-foo",
  "",
  "1. Run the stage.",
  "",
  "   When this stage asks the user questions, follow the grilling bridge protocol",
  "   in `../amadeus-grilling/references/engine-bridge.md` (one question at a",
  "   time, recommended answer attached, answers written back in `[Answer]:`",
  "   format).",
  "",
].join("\n");

function writeSkillTree(
  fixtureRoot: string,
  options: { stageSkillText: string; annexText: string; withPromotedCopies: boolean; withGrillingSkill: boolean },
): void {
  mkdirSync(join(fixtureRoot, "skills/amadeus/references"), { recursive: true });
  writeFileSync(join(fixtureRoot, "skills/amadeus/SKILL.md"), conductorText);
  writeFileSync(join(fixtureRoot, "skills/amadeus/references/question-rendering.md"), options.annexText);

  if (options.withGrillingSkill) {
    mkdirSync(join(fixtureRoot, "skills/amadeus-grilling/references"), { recursive: true });
    writeFileSync(join(fixtureRoot, "skills/amadeus-grilling/references/engine-bridge.md"), bridgeText);
  }

  mkdirSync(join(fixtureRoot, "skills/amadeus-foo"), { recursive: true });
  writeFileSync(join(fixtureRoot, "skills/amadeus-foo/SKILL.md"), options.stageSkillText);

  if (options.withPromotedCopies) {
    mkdirSync(join(fixtureRoot, ".agents/skills/amadeus/references"), { recursive: true });
    writeFileSync(join(fixtureRoot, ".agents/skills/amadeus/SKILL.md"), conductorText);
    writeFileSync(join(fixtureRoot, ".agents/skills/amadeus/references/question-rendering.md"), options.annexText);
    if (options.withGrillingSkill) {
      mkdirSync(join(fixtureRoot, ".agents/skills/amadeus-grilling/references"), { recursive: true });
      writeFileSync(join(fixtureRoot, ".agents/skills/amadeus-grilling/references/engine-bridge.md"), bridgeText);
    }
    mkdirSync(join(fixtureRoot, ".agents/skills/amadeus-foo"), { recursive: true });
    writeFileSync(join(fixtureRoot, ".agents/skills/amadeus-foo/SKILL.md"), options.stageSkillText);
  }
}

function makeFixture(
  options: Partial<{
    stageSkillText: string;
    annexText: string;
    withPromotedCopies: boolean;
    withGrillingSkill: boolean;
  }> = {},
): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "grilling-wiring"));
  tmpRoots.push(fixtureRoot);
  writeSkillTree(fixtureRoot, {
    stageSkillText: options.stageSkillText ?? newStageSkillText,
    annexText: options.annexText ?? annexText,
    withPromotedCopies: options.withPromotedCopies ?? true,
    withGrillingSkill: options.withGrillingSkill ?? true,
  });
  return fixtureRoot;
}

function expectIssue(stderr: string, needle: string, label: string): void {
  if (stderr.includes(needle)) return;
  fail(`expected ${label} to be reported with "${needle}", got:\n${stderr}`);
}

// 揃った配線の fixture は pass する。
run(checkCommand, makeFixture());

// annex に Grill me のレンダリング規則が欠けている場合は fail する。
const missingAnnexRule = makeFixture({
  annexText: ["# Question Rendering — Claude Code harness annex", "", "## Mechanism", "", "No Grill me here.", ""].join(
    "\n",
  ),
});
expectIssue(runExpectFailure(checkCommand, missingAnnexRule), "missing required marker", "annex missing Grill me rule");

// annex の 4 択順序が崩れている場合は fail する。
const wrongOrderAnnex = makeFixture({
  annexText: [
    "# Question Rendering — Claude Code harness annex",
    "",
    "Mode selection renders as a 4-option choice, in this order: Grill me, Guide me,",
    "I'll edit the file, Chat.",
    "",
    "- Grill me: one question at a time, recommended answer attached (see",
    "  `../../amadeus-grilling/references/engine-bridge.md`).",
    "- Grill me answers are written back as `[Answer]:` and logged with",
    "  `amadeus-log.ts decision` / `amadeus-log.ts answer`.",
    "",
  ].join("\n"),
});
expectIssue(runExpectFailure(checkCommand, wrongOrderAnnex), "mode selection order must be", "annex wrong mode order");

// annex の engine-bridge 参照が相対パスの階層を誤っている場合は fail する
// (question-rendering.md は skills/amadeus/references/ にあるため、
// skills/amadeus-grilling/ へ戻るには `../../` が必要 — `../` では
// skills/amadeus/amadeus-grilling/... という存在しないパスになる)。
const brokenAnnexPath = makeFixture({
  annexText: [
    "# Question Rendering — Claude Code harness annex",
    "",
    "## Mechanism",
    "",
    "Mode selection renders as a 4-option choice, in this order: Guide me, Grill me,",
    "I'll edit the file, Chat. Guide me stays first and default.",
    "",
    "- Grill me: one question at a time, recommended answer attached (see",
    "  `../amadeus-grilling/references/engine-bridge.md`).",
    "- Grill me answers are written back as `[Answer]:` and logged with",
    "  `amadeus-log.ts decision` / `amadeus-log.ts answer`.",
    "",
  ].join("\n"),
});
expectIssue(
  runExpectFailure(checkCommand, brokenAnnexPath),
  "does not resolve to an existing file",
  "annex engine-bridge reference with wrong relative-path depth",
);

// 旧ボイラープレートが残るステージ skill は fail する。
const oldWording = makeFixture({ stageSkillText: oldStageSkillText });
expectIssue(runExpectFailure(checkCommand, oldWording), "OLD unconditional grilling-bridge wording", "old wording present");
expectIssue(runExpectFailure(checkCommand, oldWording), "missing the NEW Grill me mode-selection wording", "new wording missing");

// source と昇格先が食い違うステージ skill は fail する。
const mismatchedPromotion = makeFixture();
writeFileSync(
  join(mismatchedPromotion, ".agents/skills/amadeus-foo/SKILL.md"),
  newStageSkillText.replace("amadeus-foo", "amadeus-foo (stale)"),
);
expectIssue(
  runExpectFailure(checkCommand, mismatchedPromotion),
  "source and promoted (.agents/skills) copies differ",
  "source/promoted mismatch",
);

// 昇格先そのものが欠けている場合も fail する。
const missingPromotion = makeFixture();
rmSync(join(missingPromotion, ".agents/skills/amadeus-foo"), { recursive: true, force: true });
expectIssue(
  runExpectFailure(checkCommand, missingPromotion),
  "missing promoted counterpart",
  "missing promoted counterpart",
);

// 実リポジトリの配線が pass する（Step 5/6 完了後の GREEN 確認）。
run(checkCommand, root);

console.log("grilling wiring eval: ok");
