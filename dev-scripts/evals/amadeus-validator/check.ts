#!/usr/bin/env bun

// amadeus-validator のコードレベル検証。
// space テンプレートから合成した一時 workspace（aidlc/spaces/default/）を使い、
// workspace 検証と v2 ライフサイクル（aidlc-state.md + audit + intents.json）の
// Intent record 検証を確認する。

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildIntentsIndex } from "../../../.agents/skills/amadeus-validator/scripts/IndexGenerate";

const root = resolve(import.meta.dir, "../../..");
const validator = ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts";
const spaceTemplates = join(root, ".agents/skills/amadeus-steering/templates/space");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], expected: string, cwd = root): void {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "expected:", expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  if (!stdout.includes(expected) && !stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
}

function runExpectSuccessIncludes(command: string[], expected: string, cwd = root): void {
  const stdout = run(command, cwd);
  if (!stdout.includes(expected)) {
    fail(["command succeeded without expected evidence: " + expected, "stdout:", stdout].join("\n"));
  }
}

function runExpectSuccessExcludes(command: string[], excluded: string, cwd = root): void {
  const stdout = run(command, cwd);
  if (stdout.includes(excluded)) {
    fail(["command succeeded but output unexpectedly includes: " + excluded, "stdout:", stdout].join("\n"));
  }
}

// space テンプレートから最小の有効な workspace を合成する。
function workspaceCopy(): string {
  const workspace = mkdtempSync(join(tmpdir(), "amadeus-validator"));
  cleanups.push(workspace);
  cpSync(spaceTemplates, join(workspace, "aidlc/spaces/default"), { recursive: true });
  rmSync(join(workspace, "aidlc/spaces/default/README.md"), { force: true });
  for (const file of listFiles(join(workspace, "aidlc"))) {
    const text = readFileSync(file, "utf8");
    if (text.includes("<product-name>")) {
      writeFileSync(file, text.replaceAll("<product-name>", "検証対象プロダクト"));
    }
  }
  regenerateSharedIndexes(workspace);
  return workspace;
}

function listFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const next = join(path, entry);
    return statSync(next).isDirectory() ? listFiles(next) : [next];
  });
}

function regenerateSharedIndexes(workspace: string): void {
  writeFileSync(join(workspace, "aidlc/spaces/default/intents/intents.md"), buildIntentsIndex(workspace));
}

// ---- workspace 検証 ----

// (W1) space テンプレート由来の workspace は Intent 指定なしで pass する。
const happyWorkspace = workspaceCopy();
runExpectSuccessIncludes(["bun", "run", validator, happyWorkspace], "pass");

// (W2) 退役確認: 検証結果に旧構造の検査が現れない（.amadeus や state.json を要求しない）。
runExpectSuccessExcludes(["bun", "run", validator, happyWorkspace], ".amadeus");

// (W3) memory 成果物の欠落は fail になる。
const brokenMemoryWorkspace = workspaceCopy();
rmSync(join(brokenMemoryWorkspace, "aidlc/spaces/default/memory/project.md"));
runExpectFailure(
  ["bun", "run", validator, brokenMemoryWorkspace],
  "memory/project.md が存在する",
);

// (W4) intents.md の未再生成は Index 生成整合の fail になる。
const staleIndexWorkspace = workspaceCopy();
writeFileSync(
  join(staleIndexWorkspace, "aidlc/spaces/default/intents/intents.md"),
  "# インテント\n\n## 一覧\n\n手動編集された索引。\n",
);
runExpectFailure(
  ["bun", "run", validator, staleIndexWorkspace],
  "Index 生成整合",
);

// ---- v2 ライフサイクル（aidlc-state.md + audit + intents.json）の Intent record 検証 ----

const recordDirName = "260703-fix-login-timeout";
const recordUuid = "01980000-0000-7000-8000-000000000001";

function intentModule(): string {
  return [
    "# インテント：ログインタイムアウトの修正",
    "",
    "## 概要",
    "",
    "ログインが 30 秒でタイムアウトする不具合を修正する。",
    "",
    "## 依存",
    "",
    "| 依存 | 理由 |",
    "|---|---|",
    "| なし | 単独で完了判断できるため。 |",
    "",
    "## 目標プロファイル",
    "",
    "| フィールド | 値 | 説明 |",
    "|---|---|---|",
    "| goalType | technical | 既存不具合の修正である。 |",
    "| scope | bugfix | 既存コードの特定バグ修正である。 |",
    "| labels | 未確認 | 補足分類は未確認。 |",
    "",
  ].join("\n");
}

// bugfix scope（2.1、2.3、3.5、3.6 実行対象）の inception 進行中 record。
function stateText(): string {
  return [
    "# AI-DLC State Tracking",
    "",
    "## Project Information",
    "- **Project**: ログインタイムアウトの修正",
    "- **Project Type**: Brownfield",
    "- **Scope**: bugfix",
    "- **Start Date**: 2026-07-03T01:00:00Z",
    "- **State Version**: 7",
    "- **Active Agent**: amadeus",
    "- **Worktree Path**: ",
    "- **Bolt Refs**: ",
    "- **Practices Affirmed Timestamp**: ",
    "",
    "## Scope Configuration",
    "- **Stages to Execute**: 0.1, 0.2, 0.3, 2.1, 2.3, 3.5, 3.6",
    "- **Stages to Skip**: all others (out of bugfix scope)",
    "- **Depth**: Minimal",
    "",
    "## Workspace State",
    "- **Project Root**: .",
    "- **Languages**: TypeScript",
    "- **Frameworks**: none",
    "- **Build System**: bun",
    "",
    "## Execution Plan Summary",
    "- **Total Stages**: 7",
    "- **Completed**: 4",
    "- **In Progress**: requirements-analysis",
    "",
    "## Runtime State",
    "- **Revision Count**: 0",
    "",
    "## Phase Progress",
    "",
    "- **Initialization**: Verified",
    "- **Ideation**: Skipped",
    "- **Inception**: Active",
    "- **Construction**: Pending",
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
    "- [S] intent-capture — SKIP: out of bugfix scope",
    "- [S] market-research — SKIP: out of bugfix scope",
    "- [S] feasibility — SKIP: out of bugfix scope",
    "- [S] scope-definition — SKIP: out of bugfix scope",
    "- [S] team-formation — SKIP: out of bugfix scope",
    "- [S] rough-mockups — SKIP: out of bugfix scope",
    "- [S] approval-handoff — SKIP: out of bugfix scope",
    "",
    "### INCEPTION PHASE",
    "- [x] reverse-engineering — EXECUTE",
    "- [S] practices-discovery — SKIP: out of bugfix scope",
    "- [-] requirements-analysis",
    "- [S] user-stories — SKIP: out of bugfix scope",
    "- [S] refined-mockups — SKIP: out of bugfix scope",
    "- [S] application-design — SKIP: out of bugfix scope",
    "- [S] units-generation — SKIP: out of bugfix scope",
    "- [S] delivery-planning — SKIP: out of bugfix scope",
    "",
    "### CONSTRUCTION PHASE",
    "Per unit: implicit",
    "- [S] functional-design — SKIP: out of bugfix scope",
    "- [S] nfr-requirements — SKIP: out of bugfix scope",
    "- [S] nfr-design — SKIP: out of bugfix scope",
    "- [S] infrastructure-design — SKIP: out of bugfix scope",
    "- [ ] code-generation",
    "- [ ] build-and-test",
    "- [S] ci-pipeline — SKIP: out of bugfix scope",
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
    "- **Lifecycle Phase**: INCEPTION",
    "- **Current Stage**: requirements-analysis",
    "- **Next Stage**: code-generation",
    "- **Status**: Running",
    "- **Construction Autonomy Mode**: unset",
    "- **Last Updated**: 2026-07-03T02:00:00Z",
    "",
    "## Session Resume Point",
    "- **Last Completed Stage**: reverse-engineering",
    "- **Next Action**: continue requirements-analysis",
    "- **Pending Artifacts**: requirements.md",
    "",
  ].join("\n");
}

function auditEntry(event: string, details: string, stage?: string): string {
  return [
    `## ${event}`,
    "**Timestamp**: 2026-07-03T01:00:00Z",
    `**Event**: ${event}`,
    ...(stage === undefined ? [] : [`**Stage**: ${stage}`]),
    `**Details**: ${details}`,
    "",
    "---",
    "",
  ].join("\n");
}

function auditText(): string {
  return [
    "# Audit Trail",
    "",
    auditEntry("WORKFLOW_STARTED", "Scope: bugfix"),
    auditEntry("STAGE_COMPLETED", "record scaffold created", "workspace-scaffold"),
    auditEntry("STAGE_COMPLETED", "workspace scanned", "workspace-detection"),
    auditEntry("STAGE_COMPLETED", "state initialised", "state-init"),
    auditEntry("PHASE_SKIPPED", "Phase: Ideation (out of bugfix scope)"),
    auditEntry("STAGE_COMPLETED", "codebase knowledge updated", "reverse-engineering"),
  ].join("\n");
}

function registryText(): string {
  return `${JSON.stringify(
    [
      {
        uuid: recordUuid,
        slug: "fix-login-timeout",
        dirName: recordDirName,
        scope: "bugfix",
        repos: ["app"],
        status: "in_progress",
      },
    ],
    null,
    2,
  )}\n`;
}

type RecordOverrides = {
  state?: (text: string) => string;
  audit?: (text: string) => string;
  registry?: string;
  skipAudit?: boolean;
};

function addIntentRecord(workspace: string, overrides: RecordOverrides = {}): void {
  const intentsDir = join(workspace, "aidlc/spaces/default/intents");
  const recordDir = join(intentsDir, recordDirName);
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  writeFileSync(join(intentsDir, `${recordDirName}.md`), intentModule());
  const state = overrides.state ? overrides.state(stateText()) : stateText();
  writeFileSync(join(recordDir, "aidlc-state.md"), state);
  if (!overrides.skipAudit) {
    const audit = overrides.audit ? overrides.audit(auditText()) : auditText();
    writeFileSync(join(recordDir, "audit/audit.md"), audit);
  }
  writeFileSync(join(intentsDir, "intents.json"), overrides.registry ?? registryText());
  regenerateSharedIndexes(workspace);
}

// (V1) 正常な record は pass する。
const happyIntentWorkspace = workspaceCopy();
addIntentRecord(happyIntentWorkspace);
runExpectSuccessIncludes(["bun", "run", validator, happyIntentWorkspace, recordDirName], "pass");

// (V2) Scope が未知の値なら fail する。
const badScopeWorkspace = workspaceCopy();
addIntentRecord(badScopeWorkspace, {
  state: (text) => text.replace("- **Scope**: bugfix", "- **Scope**: feature-x"),
});
runExpectFailure(["bun", "run", validator, badScopeWorkspace, recordDirName], "`Scope` が既知の値である");

// (V3) Stage Progress の行欠落は fail する。
const missingLineWorkspace = workspaceCopy();
addIntentRecord(missingLineWorkspace, {
  state: (text) => text.replace("- [S] market-research — SKIP: out of bugfix scope\n", ""),
});
runExpectFailure(["bun", "run", validator, missingLineWorkspace, recordDirName], "Stage Progress に全ステージの行がある");

// (V4) scope 外のステージが [S] 以外なら fail する。
const wrongMarkWorkspace = workspaceCopy();
addIntentRecord(wrongMarkWorkspace, {
  state: (text) => text.replace("- [S] intent-capture — SKIP: out of bugfix scope", "- [ ] intent-capture — EXECUTE"),
});
runExpectFailure(["bun", "run", validator, wrongMarkWorkspace, recordDirName], "scope 外のステージが [S] である");

// (V5) 完了ステージに STAGE_COMPLETED イベントがないと fail する。
const missingEventWorkspace = workspaceCopy();
addIntentRecord(missingEventWorkspace, {
  audit: (text) => text.replace('**Stage**: reverse-engineering', "**Stage**: なし"),
});
runExpectFailure(["bun", "run", validator, missingEventWorkspace, recordDirName], "完了ステージは STAGE_COMPLETED イベントを持つ");

// (V6) 完了ステージの必須成果物がないと fail する。
const missingArtifactWorkspace = workspaceCopy();
addIntentRecord(missingArtifactWorkspace, {
  state: (text) =>
    text
      .replace("- [-] requirements-analysis", "- [x] requirements-analysis")
      .replace("- **Current Stage**: requirements-analysis", "- **Current Stage**: code-generation"),
  audit: (text) => text + auditEntry("STAGE_COMPLETED", "requirements approved", "requirements-analysis"),
});
runExpectFailure(["bun", "run", validator, missingArtifactWorkspace, recordDirName], "completed のステージは必須成果物を持つ");

// (V7) Current Stage が scope 外なら fail する。
const badCurrentWorkspace = workspaceCopy();
addIntentRecord(badCurrentWorkspace, {
  state: (text) => text.replace("- **Current Stage**: requirements-analysis", "- **Current Stage**: intent-capture"),
});
runExpectFailure(["bun", "run", validator, badCurrentWorkspace, recordDirName], "`Current Stage` が scope の実行対象である");

// (V8) record 直下の state.json は旧配置として fail する。
const legacyStateWorkspace = workspaceCopy();
addIntentRecord(legacyStateWorkspace);
writeFileSync(join(legacyStateWorkspace, "aidlc/spaces/default/intents", recordDirName, "state.json"), "{}\n");
runExpectFailure(["bun", "run", validator, legacyStateWorkspace, recordDirName], "Intent 直下の旧配置成果物を使わない");

// (V9) registry の uuid が UUIDv7 でないと fail する。
const badUuidWorkspace = workspaceCopy();
addIntentRecord(badUuidWorkspace, {
  registry: registryText().replace(recordUuid, "01980000-0000-4000-8000-000000000001"),
});
runExpectFailure(["bun", "run", validator, badUuidWorkspace, recordDirName], "registry の `uuid` が UUIDv7 である");

// (V10) record が registry に未登録なら fail する。
const unregisteredWorkspace = workspaceCopy();
addIntentRecord(unregisteredWorkspace, { registry: "[]\n" });
runExpectFailure(["bun", "run", validator, unregisteredWorkspace, recordDirName], "record ディレクトリが registry に登録されている");

// (V11) audit の主 shard がないと fail する。
const noAuditWorkspace = workspaceCopy();
addIntentRecord(noAuditWorkspace, { skipAudit: true });
runExpectFailure(["bun", "run", validator, noAuditWorkspace, recordDirName], "audit の主 shard が存在する");

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("amadeus validator eval: ok");
