#!/usr/bin/env bun

// aidlc-state-contract の検証。
// vendored の v2 state template（skills/amadeus/references/aidlc-v2/state-template.md）を
// parse でき、行置換の更新が対象行以外を保存することを確認する。

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  AIDLC_PHASES,
  AIDLC_SECTION_HEADINGS,
  AIDLC_STAGE_SLUGS_BY_PHASE,
  checkboxStateName,
  parseAidlcState,
  updateCurrentStatusField,
  updateStageCheckbox,
} from "../../../.agents/skills/amadeus-validator/validator/aidlc-state-contract";

const root = resolve(import.meta.dir, "../../..");

let failures = 0;

function check(name: string, condition: boolean, evidence: string): void {
  if (condition) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`fail: ${name} — ${evidence}`);
  }
}

// --- 1. vendored template を parse できる ---

const templateText = readFileSync(join(root, "skills/amadeus/references/aidlc-v2/state-template.md"), "utf8");
const template = parseAidlcState(templateText);

check(
  "template: v2 の全セクション見出しが見つかる",
  AIDLC_SECTION_HEADINGS.every((heading) => template.sections.some((section) => section.heading === heading)),
  `見つかったセクション: ${template.sections.map((section) => section.heading).join(", ")}`,
);

check("template: phase は 5 個である", AIDLC_PHASES.length === 5, `${AIDLC_PHASES.length}`);

const allSlugs = AIDLC_PHASES.flatMap((phase) => AIDLC_STAGE_SLUGS_BY_PHASE[phase]);
check("template: stage slug は全 32 個である", allSlugs.length === 32, `${allSlugs.length}`);

const templateSlugs = template.stages.map((stage) => stage.slug);
check(
  "template: 全 stage slug の checkbox 行が parse できる",
  allSlugs.every((slug) => templateSlugs.includes(slug)),
  `不足: ${allSlugs.filter((slug) => !templateSlugs.includes(slug)).join(", ")}`,
);

check(
  "template: 全 stage の checkbox が Pending である",
  template.stages.every((stage) => checkboxStateName(stage.mark) === "Pending"),
  template.stages
    .filter((stage) => checkboxStateName(stage.mark) !== "Pending")
    .map((stage) => `${stage.slug}=${stage.mark}`)
    .join(", "),
);

check(
  "template: Phase Progress の 5 phase が Pending で parse できる",
  AIDLC_PHASES.every((phase) => template.phaseProgress[phase] === "Pending"),
  JSON.stringify(template.phaseProgress),
);

// --- 2. 記入済みインスタンスを parse できる ---

const instanceText = [
  "# AI-DLC State Tracking",
  "",
  "## Project Information",
  "- **Project**: Amadeus DLC を AI-DLC v2 に完全準拠させる",
  "- **Project Type**: Brownfield",
  "- **Scope**: refactor",
  "- **Start Date**: 2026-07-03T04:00:00Z",
  "- **State Version**: 7",
  "- **Active Agent**: amadeus",
  "- **Worktree Path**: ",
  "- **Bolt Refs**: implicit",
  "- **Practices Affirmed Timestamp**: ",
  "",
  "## Scope Configuration",
  "- **Stages to Execute**: 0.1, 0.2, 0.3, 2.1, 2.3, 3.1, 3.5, 3.6",
  "- **Stages to Skip**: all others (out of refactor scope)",
  "- **Depth**: Standard",
  "",
  "## Workspace State",
  "- **Project Root**: .",
  "- **Languages**: TypeScript",
  "- **Frameworks**: none",
  "- **Build System**: bun",
  "",
  "## Execution Plan Summary",
  "- **Total Stages**: 8",
  "- **Completed**: 5",
  "- **In Progress**: code-generation",
  "",
  "## Runtime State",
  "- **Revision Count**: 0",
  "",
  "## Phase Progress",
  "<!-- Status values: Pending, Active, Verified, Skipped -->",
  "",
  "- **Initialization**: Verified",
  "- **Ideation**: Skipped",
  "- **Inception**: Verified",
  "- **Construction**: Active",
  "- **Operation**: Pending",
  "",
  "## Stage Progress",
  "",
  "### INITIALIZATION PHASE",
  "- [x] workspace-scaffold — EXECUTE",
  "- [x] workspace-detection — EXECUTE",
  "- [x] state-init — EXECUTE",
  "",
  "### IDEATION PHASE",
  "- [S] intent-capture — SKIP: out of refactor scope",
  "- [S] market-research — SKIP: out of refactor scope",
  "- [S] feasibility — SKIP: out of refactor scope",
  "- [S] scope-definition — SKIP: out of refactor scope",
  "- [S] team-formation — SKIP: out of refactor scope",
  "- [S] rough-mockups — SKIP: out of refactor scope",
  "- [S] approval-handoff — SKIP: out of refactor scope",
  "",
  "### INCEPTION PHASE",
  "- [x] reverse-engineering — EXECUTE",
  "- [S] practices-discovery — SKIP: out of refactor scope",
  "- [x] requirements-analysis",
  "- [S] user-stories — SKIP: out of refactor scope",
  "- [S] refined-mockups — SKIP: out of refactor scope",
  "- [S] application-design — SKIP: out of refactor scope",
  "- [S] units-generation — SKIP: out of refactor scope",
  "- [S] delivery-planning — SKIP: out of refactor scope",
  "",
  "### CONSTRUCTION PHASE",
  "Per unit: implicit",
  "- [x] functional-design — EXECUTE",
  "- [S] nfr-requirements — SKIP: out of refactor scope",
  "- [S] nfr-design — SKIP: out of refactor scope",
  "- [S] infrastructure-design — SKIP: out of refactor scope",
  "- [-] code-generation",
  "- [ ] build-and-test",
  "- [S] ci-pipeline — SKIP: out of refactor scope",
  "",
  "### OPERATION PHASE",
  "- [S] deployment-pipeline — SKIP: out of Amadeus scope",
  "- [S] environment-provisioning — SKIP: out of Amadeus scope",
  "- [S] deployment-execution — SKIP: out of Amadeus scope",
  "- [S] observability-setup — SKIP: out of Amadeus scope",
  "- [S] incident-response — SKIP: out of Amadeus scope",
  "- [S] performance-validation — SKIP: out of Amadeus scope",
  "- [S] feedback-optimization — SKIP: out of Amadeus scope",
  "",
  "## Current Status",
  "- **Lifecycle Phase**: CONSTRUCTION",
  "- **Current Stage**: code-generation",
  "- **Next Stage**: build-and-test",
  "- **Status**: Running",
  "- **Construction Autonomy Mode**: unset",
  "- **Last Updated**: 2026-07-03T05:00:00Z",
  "",
  "## Session Resume Point",
  "- **Last Completed Stage**: functional-design",
  "- **Next Action**: continue code-generation",
  "- **Pending Artifacts**: code-generation-plan.md",
  "",
].join("\n");

const instance = parseAidlcState(instanceText);

check("instance: Scope が読める", instance.fields["Scope"] === "refactor", String(instance.fields["Scope"]));
check("instance: Depth が読める", instance.fields["Depth"] === "Standard", String(instance.fields["Depth"]));
check("instance: Current Stage が読める", instance.fields["Current Stage"] === "code-generation", String(instance.fields["Current Stage"]));
check("instance: Status が読める", instance.fields["Status"] === "Running", String(instance.fields["Status"]));
check("instance: Inception が Verified である", instance.phaseProgress["Inception"] === "Verified", String(instance.phaseProgress["Inception"]));

const requirementsStage = instance.stages.find((stage) => stage.slug === "requirements-analysis");
check(
  "instance: requirements-analysis が Completed である",
  requirementsStage !== undefined && checkboxStateName(requirementsStage.mark) === "Completed",
  String(requirementsStage?.mark),
);

const codeGeneration = instance.stages.find((stage) => stage.slug === "code-generation");
check("instance: construction の stage は unit を持つ", codeGeneration?.unit === "implicit", String(codeGeneration?.unit));
check("instance: code-generation が Active である", codeGeneration !== undefined && checkboxStateName(codeGeneration.mark) === "Active", String(codeGeneration?.mark));

const skippedStage = instance.stages.find((stage) => stage.slug === "practices-discovery");
check(
  "instance: SKIP 注記が読める",
  skippedStage !== undefined && checkboxStateName(skippedStage.mark) === "Skipped" && (skippedStage.annotation ?? "").startsWith("SKIP:"),
  `${skippedStage?.mark} / ${skippedStage?.annotation}`,
);

// --- 3. 行置換の更新が対象行だけを変える ---

const updatedCheckbox = updateStageCheckbox(instanceText, { slug: "code-generation", unit: "implicit" }, "[?]");
{
  const before = instanceText.split("\n");
  const after = updatedCheckbox.split("\n");
  const changed = before.map((line, index) => (line === after[index] ? null : index)).filter((index) => index !== null);
  check("update: checkbox 更新は 1 行だけ変える", before.length === after.length && changed.length === 1, `変更行数: ${changed.length}`);
  const parsedAfter = parseAidlcState(updatedCheckbox);
  const target = parsedAfter.stages.find((stage) => stage.slug === "code-generation" && stage.unit === "implicit");
  check("update: 更新後の checkbox が AwaitingApproval である", target !== undefined && checkboxStateName(target.mark) === "AwaitingApproval", String(target?.mark));
}

const updatedField = updateCurrentStatusField(instanceText, "Current Stage", "build-and-test");
{
  const before = instanceText.split("\n");
  const after = updatedField.split("\n");
  const changed = before.map((line, index) => (line === after[index] ? null : index)).filter((index) => index !== null);
  check("update: フィールド更新は 1 行だけ変える", before.length === after.length && changed.length === 1, `変更行数: ${changed.length}`);
  check("update: 更新後のフィールド値が読める", parseAidlcState(updatedField).fields["Current Stage"] === "build-and-test", parseAidlcState(updatedField).fields["Current Stage"] ?? "なし");
}

// 存在しない stage の更新は入力を変えない。
const unchanged = updateStageCheckbox(instanceText, { slug: "no-such-stage" }, "[x]");
check("update: 不明な stage の更新は入力を変えない", unchanged === instanceText, "変更が発生した");

// --- 4. complete-workflow は最終 phase を Verified にする ---

{
  const workspace = mkdtempSync(join(tmpdir(), "aidlc-state-complete-"));
  try {
    const recordDir = join(workspace, "aidlc", "spaces", "default", "intents", "260704-complete-test");
    mkdirSync(recordDir, { recursive: true });
    writeFileSync(join(workspace, "aidlc", "spaces", "default", "intents", "active-intent"), "260704-complete-test\n", "utf8");
    writeFileSync(
      join(recordDir, "aidlc-state.md"),
      instanceText
        .replace("- **Scope**: refactor", "- **Scope**: mvp")
        .replace("- **Stages to Execute**: 0.1, 0.2, 0.3, 2.1, 2.3, 3.1, 3.5, 3.6", "- **Stages to Execute**: 0.1, 0.2, 0.3, 3.7")
        .replace("- **Total Stages**: 8", "- **Total Stages**: 1")
        .replace("- **Completed**: 5", "- **Completed**: 0")
        .replace("- **In Progress**: code-generation", "- **In Progress**: ci-pipeline")
        .replace("- **Construction**: Active", "- **Construction**: Active")
        .replace("- [-] code-generation", "- [x] code-generation")
        .replace("- [ ] build-and-test", "- [x] build-and-test")
        .replace("- [S] ci-pipeline — SKIP: out of refactor scope", "- [-] ci-pipeline — EXECUTE")
        .replace("- **Current Stage**: code-generation", "- **Current Stage**: ci-pipeline")
        .replace("- **Next Stage**: build-and-test", "- **Next Stage**: none")
        .replace("- **Last Completed Stage**: functional-design", "- **Last Completed Stage**: build-and-test")
        .replace("- **Pending Artifacts**: code-generation-plan.md", "- **Pending Artifacts**: none"),
      "utf8",
    );
    const ciDir = join(recordDir, "construction", "ci-pipeline");
    mkdirSync(ciDir, { recursive: true });
    writeFileSync(join(ciDir, "ci-config.md"), "# CI Config\n\n## 入力\n\nok\n", "utf8");
    writeFileSync(join(ciDir, "quality-gates.md"), "# Quality Gates\n\n## 入力\n\nok\n", "utf8");
    writeFileSync(join(ciDir, "ci-pipeline-questions.md"), "# CI Pipeline Questions\n\n## 入力\n\nok\n", "utf8");

    const result = Bun.spawnSync(
      ["bun", join(root, ".agents/aidlc/tools/aidlc-state.ts"), "complete-workflow", "ci-pipeline"],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const state = readFileSync(join(recordDir, "aidlc-state.md"), "utf8");
    const parsed = parseAidlcState(state);
    check(
      "complete-workflow: Construction が Verified になる",
      result.exitCode === 0 && parsed.phaseProgress["Construction"] === "Verified",
      `exit=${result.exitCode} stderr=${new TextDecoder().decode(result.stderr)} phase=${parsed.phaseProgress["Construction"]}`,
    );
    check(
      "complete-workflow: Status が Completed になる",
      result.exitCode === 0 && parsed.fields["Status"] === "Completed",
      `status=${parsed.fields["Status"]}`,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

// --- 5. practices-promote は既存 memory に対象見出しがなくても昇格できる ---

{
  const workspace = mkdtempSync(join(tmpdir(), "aidlc-state-practices-"));
  try {
    const recordDir = join(workspace, "aidlc", "spaces", "default", "intents", "260704-practices-test");
    const stageDir = join(recordDir, "inception", "practices-discovery");
    const memoryDir = join(workspace, "aidlc", "spaces", "default", "memory");
    mkdirSync(stageDir, { recursive: true });
    mkdirSync(memoryDir, { recursive: true });

    writeFileSync(join(recordDir, "aidlc-state.md"), "# AI-DLC State Tracking\n", "utf8");
    writeFileSync(
      join(memoryDir, "team.md"),
      "# チームの働き方\n\n## 方針\n\n- 既存の日本語見出しだけを持つ。\n",
      "utf8",
    );
    writeFileSync(
      join(memoryDir, "project.md"),
      "# プロジェクト\n\n## 目的\n\n- 既存の日本語見出しだけを持つ。\n",
      "utf8",
    );
    writeFileSync(
      join(stageDir, "team-practices.md"),
      [
        "# Team Practices",
        "",
        "## Way of Working",
        "",
        "Issue と Intent を接続する。",
        "",
        "## Walking Skeleton",
        "",
        "最初の Bolt で縦断確認する。",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(stageDir, "discovered-rules.md"),
      [
        "# Discovered Rules",
        "",
        "## Mandated",
        "",
        "ALWAYS keep validator evidence.",
        "",
        "## Forbidden",
        "",
        "NEVER bypass the memory boundary.",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = Bun.spawnSync(
      [
        "bun",
        join(root, ".agents/aidlc/tools/aidlc-state.ts"),
        "practices-promote",
        "--team-practices",
        join(stageDir, "team-practices.md"),
        "--discovered-rules",
        join(stageDir, "discovered-rules.md"),
        "--affirming-user",
        "eval",
        "--target-dir",
        memoryDir,
      ],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);
    const team = readFileSync(join(memoryDir, "team.md"), "utf8");
    const project = readFileSync(join(memoryDir, "project.md"), "utf8");
    const auditDir = join(recordDir, "audit");

    check(
      "practices-promote: 見出しがない team.md へ practice 節を追加できる",
      result.exitCode === 0 && team.includes("## Way of Working") && team.includes("Issue と Intent を接続する。"),
      `exit=${result.exitCode} stdout=${stdout} stderr=${stderr}`,
    );
    check(
      "practices-promote: 見出しがない project.md へ rule 節を追加できる",
      result.exitCode === 0 && project.includes("## Mandated") && project.includes("ALWAYS keep validator evidence.") && project.includes("## Forbidden") && project.includes("NEVER bypass the memory boundary."),
      `project.md=${project}`,
    );
    check(
      "practices-promote: PRACTICES_AFFIRMED を audit shard に記録する",
      result.exitCode === 0 && existsSync(auditDir) && readFileSync(join(auditDir, readdirFirst(auditDir)), "utf8").includes("PRACTICES_AFFIRMED"),
      `auditDir=${auditDir}`,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function readdirFirst(dir: string): string {
  const entries = Array.from(new Bun.Glob("*").scanSync({ cwd: dir })).sort();
  return entries[0] ?? "";
}

if (failures > 0) {
  console.error(`aidlc-state eval: ${failures} 件失敗`);
  process.exit(1);
}
console.log("aidlc-state eval: pass");
