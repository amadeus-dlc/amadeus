#!/usr/bin/env bun

// amadeus-validator のコードレベル検証。
// space テンプレートから合成した一時 workspace（aidlc/spaces/default/）を使い、
// workspace 検証と v2 ライフサイクル（aidlc-state.md + audit + intents.json）の
// Intent record 検証を確認する。

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
  return workspace;
}

function listFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const next = join(path, entry);
    return statSync(next).isDirectory() ? listFiles(next) : [next];
  });
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

// (W4) GD009: intents.md の内容整合検査（Index 生成整合）は退役した。
// 実際の Intent 一覧と内容が食い違っていても、見出し・表構造さえ整っていれば pass する。
const staleIndexWorkspace = workspaceCopy();
writeFileSync(
  join(staleIndexWorkspace, "aidlc/spaces/default/intents/intents.md"),
  [
    "# インテント",
    "",
    "## 一覧",
    "",
    "| 識別子 | 概要 | 依存 | 詳細 |",
    "|---|---|---|---|",
    "",
    "## 依存関係",
    "",
    "| インテント | 依存 | 理由 |",
    "|---|---|---|",
    "",
  ].join("\n"),
);
runExpectSuccessIncludes(["bun", "run", validator, staleIndexWorkspace], "pass");

// (W4b) intents.md が存在する場合は、見出し・表構造の検査は引き続き行う。
const malformedIndexWorkspace = workspaceCopy();
writeFileSync(
  join(malformedIndexWorkspace, "aidlc/spaces/default/intents/intents.md"),
  "# インテント\n\n## 一覧\n\n手動編集された索引。\n",
);
runExpectFailure(
  ["bun", "run", validator, malformedIndexWorkspace],
  "`一覧` の表がある",
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
  skipModuleFile?: boolean;
};

function addIntentRecord(workspace: string, overrides: RecordOverrides = {}): void {
  const intentsDir = join(workspace, "aidlc/spaces/default/intents");
  const recordDir = join(intentsDir, recordDirName);
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  if (!overrides.skipModuleFile) writeFileSync(join(intentsDir, `${recordDirName}.md`), intentModule());
  const state = overrides.state ? overrides.state(stateText()) : stateText();
  writeFileSync(join(recordDir, "aidlc-state.md"), state);
  if (!overrides.skipAudit) {
    const audit = overrides.audit ? overrides.audit(auditText()) : auditText();
    writeFileSync(join(recordDir, "audit/audit.md"), audit);
  }
  writeFileSync(join(intentsDir, "intents.json"), overrides.registry ?? registryText());
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

// ---- GD009: Intent モジュールファイルと intents.md 索引の廃止 ----
// 正準台帳は intents.json のみになり、`<dirName>.md` と `intents.md` は
// 存在する場合だけ検査する任意の旧成果物になる（examples の旧 snapshot 互換のため）。

// (V11a) intents.md がない workspace でも、Intent 指定なしの全体検証は pass する。
const noIndexWorkspace = workspaceCopy();
rmSync(join(noIndexWorkspace, "aidlc/spaces/default/intents/intents.md"), { force: true });
runExpectSuccessIncludes(["bun", "run", validator, noIndexWorkspace], "pass");

// (V11b) Intent モジュールファイルと intents.md の両方がない workspace でも、
// Intent 状態・registry が揃っていれば record 検証は pass する。
const noModuleFileWorkspace = workspaceCopy();
addIntentRecord(noModuleFileWorkspace, { skipModuleFile: true });
rmSync(join(noModuleFileWorkspace, "aidlc/spaces/default/intents/intents.md"), { force: true });
runExpectSuccessIncludes(["bun", "run", validator, noModuleFileWorkspace, recordDirName], "pass");

// ---- v2 契約検査（docs/backward-compatibility.md に記載のない record） ----

// requirements-analysis を completed にした state / audit（V6 と同じ変換）。
function v2CompletedState(): string {
  return stateText()
    .replace("- [-] requirements-analysis", "- [x] requirements-analysis")
    .replace("- **Current Stage**: requirements-analysis", "- **Current Stage**: code-generation")
    .replace("- **Inception**: Active", "- **Inception**: Verified");
}

function v2CompletedAudit(): string {
  return (
    auditText() +
    auditEntry("STAGE_COMPLETED", "requirements approved", "requirements-analysis") +
    auditEntry("PHASE_VERIFIED", "Phase boundary: Inception. pass")
  );
}

function writeStageDefinition(workspace: string, phase: string, slug: string, produces: string[]): void {
  const dir = join(workspace, ".agents/aidlc/aidlc-common/stages", phase);
  mkdirSync(dir, { recursive: true });
  const producesYaml = produces.length === 0 ? "produces: []" : ["produces:", ...produces.map((item) => `  - ${item}`)].join("\n");
  writeFileSync(
    join(dir, `${slug}.md`),
    ["---", `slug: ${slug}`, `phase: ${phase}`, "execution: ALWAYS", producesYaml, "---", "", `# ${slug}`, ""].join("\n"),
  );
}

function writeV2StageDefinitions(workspace: string): void {
  writeStageDefinition(workspace, "initialization", "workspace-scaffold", []);
  writeStageDefinition(workspace, "initialization", "workspace-detection", []);
  writeStageDefinition(workspace, "initialization", "state-init", []);
  writeStageDefinition(workspace, "inception", "reverse-engineering", []);
  writeStageDefinition(workspace, "inception", "requirements-analysis", ["requirements", "requirements-analysis-questions"]);
}

type V2WorkspaceOptions = {
  writeStageDefs?: boolean;
  writeQuestionsArtifact?: boolean;
  writePhaseCheck?: boolean;
  writeAuditShard?: boolean;
};

// backward-compatibility.md に記載のない record（v2 契約検査の対象）を組み立てる。
function setupV2Workspace(options: V2WorkspaceOptions = {}): string {
  const { writeStageDefs = true, writeQuestionsArtifact = true, writePhaseCheck = true, writeAuditShard = true } = options;

  const workspace = workspaceCopy();
  const intentsDir = join(workspace, "aidlc/spaces/default/intents");
  const recordDir = join(intentsDir, recordDirName);
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  writeFileSync(join(intentsDir, `${recordDirName}.md`), intentModule());
  writeFileSync(join(recordDir, "aidlc-state.md"), v2CompletedState());
  writeFileSync(join(intentsDir, "intents.json"), registryText());

  // docs/backward-compatibility.md は存在するが、この record を記載しない
  // （記載なし record への v2 契約検査の適用を確認するため、存在自体は必要）。
  mkdirSync(join(workspace, "docs"), { recursive: true });
  writeFileSync(join(workspace, "docs/backward-compatibility.md"), "# Backward Compatibility\n\n(v2 契約検査テスト用。対象なし)\n");

  if (writeStageDefs) writeV2StageDefinitions(workspace);

  mkdirSync(join(recordDir, "inception/requirements-analysis"), { recursive: true });
  writeFileSync(join(recordDir, "inception/requirements-analysis/requirements.md"), "# Requirements\n");
  if (writeQuestionsArtifact) {
    writeFileSync(join(recordDir, "inception/requirements-analysis/requirements-analysis-questions.md"), "# Questions\n");
  }

  if (writePhaseCheck) {
    mkdirSync(join(recordDir, "verification"), { recursive: true });
    writeFileSync(join(recordDir, "verification/phase-check-inception.md"), "# Phase Check\n");
  }

  if (writeAuditShard) {
    writeFileSync(join(recordDir, "audit/host-a-clone-1.md"), v2CompletedAudit());
  }

  return workspace;
}

// (V12) v2 契約の必須成果物・phase-check・audit shard がすべて揃っていれば pass する。
const v2HappyWorkspace = setupV2Workspace();
runExpectSuccessIncludes(["bun", "run", validator, v2HappyWorkspace, recordDirName], "pass");

// (V13) produces 由来の成果物が欠けていると fail する。
const v2MissingProducesWorkspace = setupV2Workspace({ writeQuestionsArtifact: false });
runExpectFailure(
  ["bun", "run", validator, v2MissingProducesWorkspace, recordDirName],
  "v2 契約: completed のステージは produces 成果物を持つ",
);

// (V14) Verified の phase（上流が phase-check を指示する ideation / inception / construction）に phase-check 成果物がないと fail する。Initialization は Verified でも対象外（上流に phase-check を書く stage がない）。
const v2MissingPhaseCheckWorkspace = setupV2Workspace({ writePhaseCheck: false });
runExpectFailure(
  ["bun", "run", validator, v2MissingPhaseCheckWorkspace, recordDirName],
  "v2 契約: Verified の phase は phase-check 成果物を持つ",
);

// (V17b) stage 定義に produces がないと fail する（silent-pass しない）。
{
  const workspace = setupV2Workspace();
  const stagePath = join(workspace, ".agents/aidlc/aidlc-common/stages/inception/requirements-analysis.md");
  writeFileSync(stagePath, "---\nslug: requirements-analysis\nphase: inception\n---\n");
  runExpectFailure(
    ["bun", "run", validator, workspace, recordDirName],
    "v2 契約: stage 定義の produces を解析できる",
  );
}

// (V14b) docs/backward-compatibility.md が存在しない workspace でも、
// 旧形式標識（audit/audit.md）のない record には v2 契約検査が適用される（legacy へ黙って fallback しない）。
{
  const workspace = setupV2Workspace({ writeQuestionsArtifact: false });
  rmSync(join(workspace, "docs/backward-compatibility.md"));
  runExpectFailure(
    ["bun", "run", validator, workspace, recordDirName],
    "v2 契約: completed のステージは produces 成果物を持つ",
  );
}

// (V15) audit shard が1件もないと fail する。
const v2MissingAuditShardWorkspace = setupV2Workspace({ writeAuditShard: false });
runExpectFailure(
  ["bun", "run", validator, v2MissingAuditShardWorkspace, recordDirName],
  "v2 契約: audit shard が1件以上存在する",
);

// (V16) stage 定義ファイル（.agents/aidlc/aidlc-common/stages/）がないと fail する。
const v2MissingStageDefWorkspace = setupV2Workspace({ writeStageDefs: false });
runExpectFailure(
  ["bun", "run", validator, v2MissingStageDefWorkspace, recordDirName],
  "v2 契約: stage 定義ファイルが存在する",
);

// (V17) backward-compatibility.md に記載された record は旧形式検査を維持する
// （v2 契約が要求する requirements-analysis-questions.md、verification/、stage 定義ファイルがなくても pass する）。
const legacyPreservedWorkspace = workspaceCopy();
addIntentRecord(legacyPreservedWorkspace, {
  state: (text) =>
    text
      .replace("- [-] requirements-analysis", "- [x] requirements-analysis")
      .replace("- **Current Stage**: requirements-analysis", "- **Current Stage**: code-generation"),
  audit: (text) => text + auditEntry("STAGE_COMPLETED", "requirements approved", "requirements-analysis"),
});
mkdirSync(join(legacyPreservedWorkspace, "aidlc/spaces/default/intents", recordDirName, "inception/requirements-analysis"), {
  recursive: true,
});
writeFileSync(
  join(legacyPreservedWorkspace, "aidlc/spaces/default/intents", recordDirName, "inception/requirements-analysis/requirements.md"),
  "# Requirements\n",
);
mkdirSync(join(legacyPreservedWorkspace, "docs"), { recursive: true });
writeFileSync(
  join(legacyPreservedWorkspace, "docs/backward-compatibility.md"),
  `# Backward Compatibility\n\n- 対象: \`aidlc/spaces/default/intents/${recordDirName}/\`\n`,
);
runExpectSuccessIncludes(["bun", "run", validator, legacyPreservedWorkspace, recordDirName], "pass");

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("amadeus validator eval: ok");
