#!/usr/bin/env bun
// v2 互換ライフサイクルの examples snapshot を real provider で生成する。
// 使い方:
//   bun run dev-scripts/generate-amadeus-examples.ts --dry-run
//   bun run dev-scripts/generate-amadeus-examples.ts --provider real [--runner <path>] [--from <step-id>]
//
// step id は 01-ideation-completed、02-inception-completed、03-construction-design-ready である。
// --from は既存 snapshot を入力として使い、指定 step 以降の snapshot だけを更新対象にする。
// 生成した snapshot は examples/<step-id>/ に置き、examples/skill-provenance.json を更新する。

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createLlmProvider, type LlmProvider } from "./evals/llm-support/provider";

type Options = {
  dryRun: boolean;
  printProvenance: boolean;
  provider: "real";
  runner: string;
  from?: string;
};

type GenerationStep = {
  id: string;
  snapshot: string;
  prompt: string;
  expectedState: Record<string, string>;
  expectedFiles: string[];
  absentFiles?: string[];
  expectedUnitStates?: Array<{ stage: string; state: string }>;
  provenanceSkillFiles: string[];
};

type SkillFileDigest = {
  path: string;
  md5?: string;
  staleReason?: string;
};

type SkillProvenanceEntry = {
  snapshot: string;
  skillFiles: SkillFileDigest[];
};

type SkillProvenanceManifest = {
  version: number;
  entries: SkillProvenanceEntry[];
};

const root = resolve(import.meta.dir, "..");
const workspace = join(root, ".tmp/amadeus-example-generation/workspace");
const logs = join(root, ".tmp/amadeus-example-generation/logs");
const stagedSnapshots = join(root, ".tmp/amadeus-example-generation/snapshots");
const intentId = "20260703-minimum-purchase-flow";
const defaultRunner = "dev-scripts/run-claude-personal.sh";
const provenanceManifestPath = Bun.env.AMADEUS_EXAMPLES_PROVENANCE_MANIFEST ?? join(root, "examples/skill-provenance.json");

// 生成 workspace に配布する skill 集合。実行時に参照される可能性がある skill だけを置く。
const workspaceSkills = [
  "amadeus",
  "amadeus-steering",
  "amadeus-grilling",
  "amadeus-validator",
  "amadeus-ideation-intent-capture",
  "amadeus-ideation-market-research",
  "amadeus-ideation-feasibility",
  "amadeus-ideation-scope-definition",
  "amadeus-ideation-team-formation",
  "amadeus-ideation-rough-mockups",
  "amadeus-ideation-approval-handoff",
  "amadeus-inception-reverse-engineering",
  "amadeus-inception-practices-discovery",
  "amadeus-inception-requirements-analysis",
  "amadeus-inception-user-stories",
  "amadeus-inception-refined-mockups",
  "amadeus-inception-application-design",
  "amadeus-inception-units-generation",
  "amadeus-inception-delivery-planning",
  "amadeus-construction-functional-design",
  "amadeus-construction-nfr-requirements",
  "amadeus-construction-nfr-design",
  "amadeus-construction-infrastructure-design",
  "amadeus-construction-code-generation",
  "amadeus-construction-build-and-test",
  "amadeus-construction-ci-pipeline",
  "japanese-tech-writing",
];

const ideationSkillFiles = [
  "skills/amadeus-steering/SKILL.md",
  "skills/amadeus/SKILL.md",
  "skills/amadeus-ideation-intent-capture/SKILL.md",
  "skills/amadeus-ideation-market-research/SKILL.md",
  "skills/amadeus-ideation-feasibility/SKILL.md",
  "skills/amadeus-ideation-scope-definition/SKILL.md",
  "skills/amadeus-ideation-team-formation/SKILL.md",
  "skills/amadeus-ideation-rough-mockups/SKILL.md",
  "skills/amadeus-ideation-approval-handoff/SKILL.md",
];

const inceptionSkillFiles = [
  ...ideationSkillFiles,
  "skills/amadeus-inception-reverse-engineering/SKILL.md",
  "skills/amadeus-inception-practices-discovery/SKILL.md",
  "skills/amadeus-inception-requirements-analysis/SKILL.md",
  "skills/amadeus-inception-user-stories/SKILL.md",
  "skills/amadeus-inception-refined-mockups/SKILL.md",
  "skills/amadeus-inception-application-design/SKILL.md",
  "skills/amadeus-inception-units-generation/SKILL.md",
  "skills/amadeus-inception-delivery-planning/SKILL.md",
];

const constructionSkillFiles = [
  ...inceptionSkillFiles,
  "skills/amadeus-construction-functional-design/SKILL.md",
];

const implementationPlanSkillFiles = [
  ...constructionSkillFiles,
  "skills/amadeus-construction-code-generation/SKILL.md",
];

function sharedPromptRules(): string[] {
  return [
    "実行条件:",
    "- 質問せずに続行してください。判断が必要な点は、この指示と既存成果物から最も妥当な内容を選び、成果物に理由を書いてください。",
    "- Birth 提案、ステージの完了承認、ladder の確認など、人間の承認を待つ箇所は、この指示を人間の承認として扱ってください。",
    "- ステージの完了承認は approval に `via: \"conversation\"` で記録してください。",
    "- `.amadeus/` 配下だけを作成、更新してください。git commit、branch 作成、worktree 作成はしないでください。",
    "- 成果物は各 skill の同梱テンプレートと成果物契約に従い、日本語で書いてください。",
    "- 不明な値は空欄にせず `未確認` と書いてください。",
  ];
}

function ideationPrompt(): string {
  return [
    "Amadeus DLC の examples 用 workspace を作ります。",
    "",
    "手順 1: `amadeus-steering` を scaffold-only で実行し、steering layer を作成してください。",
    "",
    "題材:",
    "- プロダクト名: EC サイト最小購入フロー",
    "- 主目的: 利用者が商品を選択して注文を作成できる最小の購入体験を提供する",
    "- 主なアクター: 購入者, 販売管理者",
    "- 外部システム: 在庫管理システム",
    "- 主要領域: 商品選択, 注文作成, 在庫参照",
    "- 技術前提（確定済みとして steering の tech.md に反映する）: TypeScript と Node.js の Web アプリケーション、購入者向け Web UI、在庫管理システムとは REST API で連携、注文はリレーショナルデータベースに記録",
    "",
    "手順 2: `amadeus` skill の Intake を実行してください。",
    "入力テーマは「利用者が商品を選択して注文を作成できる最小の購入フローを実現する」です。",
    "既存 Intent はないため Birth 提案になります。この指示を人間の承認として扱い、次で作成してください。",
    "",
    `- Intent 識別子: \`${intentId}\``,
    "- scope: `feature`",
    "- depth: `Standard`",
    "",
    "手順 3: `amadeus` のルーティングに従い、Ideation の実行対象ステージを順に完了してください。",
    "",
    "条件判定に使う事実:",
    "- 社内の自社サイト向け開発であり、外部市場での位置づけや build-vs-buy の判断はない。",
    "- 在庫管理システムとの連携という統合制約がある。",
    "- 開発は単独開発者で行う。",
    "- 購入者向けの UI がある。",
    "- スコープバックログには、今回やらない作業候補（決済手段の拡張、会員ランク別価格、注文キャンセル）を優先度付きで置いてください。",
    "",
    "手順 4: Ideation の phase 境界処理を行ってください。",
    "phase PR は作成できないため、`https://github.com/example/ec-site/pull/101` が merge 済みであるものとして",
    "`phaseGates.ideation` に approval evidence を記録し、`phase` を `inception` へ進めてください。",
    "Inception のステージは実行せず、そこで停止してください。",
    "",
    ...sharedPromptRules(),
    `- 作業後に \`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . ${intentId}\` を実行し、fail があれば修正してから結果を要約してください。`,
  ].join("\n");
}

function inceptionPrompt(): string {
  return [
    `既存の Amadeus workspace で、Intent \`${intentId}\` の Inception を完了します。`,
    "",
    "手順 1: `amadeus` skill を使い、対象 Intent の続きから再開してください。",
    "",
    "手順 2: `amadeus` のルーティングに従い、Inception の実行対象ステージを順に完了してください。",
    "",
    "条件判定に使う事実:",
    "- 新規開発（greenfield）であり、既存コードベースはない。",
    "- 単独開発者であり、確立済みのチームプラクティスの発見対象はない。",
    "- 購入者向けの UI があり、Ideation の rough mockups がある。",
    "- 商品選択、注文作成、在庫参照を扱う新しいコンポーネントとサービス層の設計が必要である。",
    "",
    "Units Generation と Delivery Planning の指定:",
    "- Unit 識別子は `U001` からの連番にしてください。",
    "- Bolt 識別子は `B001` からの連番にし、最初の Bolt `B001` は注文作成を貫通する walking skeleton にしてください。",
    "",
    "手順 3: Inception の phase 境界処理を行ってください。",
    "phase PR は作成できないため、`https://github.com/example/ec-site/pull/102` が merge 済みであるものとして",
    "`phaseGates.inception` に approval evidence を記録し、`phase` を `construction` へ進めてください。",
    "Construction のステージと Bolt は実行せず、そこで停止してください。",
    "",
    ...sharedPromptRules(),
    `- 作業後に \`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . ${intentId}\` を実行し、fail があれば修正してから結果を要約してください。`,
  ].join("\n");
}

function constructionPrompt(): string {
  return [
    `既存の Amadeus workspace で、Intent \`${intentId}\` の Construction を walking skeleton の設計完了（code generation 前）まで進めます。`,
    "",
    "手順 1: `amadeus` skill を使い、対象 Intent の続きから再開してください。",
    "",
    "手順 2: `amadeus` の「Construction の Bolt 実行」に従い、walking skeleton の Bolt `B001` を開始してください。",
    "branch と worktree は作成できないため、`state.json.bolts` への記録（`state: \"active\"` と束ねる Unit の一覧）だけを行ってください。",
    "",
    "手順 3: `B001` に束ねた Unit について、Stage 3.1 から 3.4 を順に解決してください。",
    "",
    "条件判定に使う事実:",
    "- 注文作成には新しいデータモデルと業務ルール（在庫参照の結果に基づく注文可否）があるため、Functional Design が必要である。",
    "- 性能、セキュリティ、スケーラビリティの特別な要求はなく、技術スタックは確定済みである。",
    "- インフラ変更はなく、デプロイ構成は定義済みである。",
    "",
    "Stage 3.1 Functional Design は成果物を作成し、完了承認まで記録してください。",
    "実行しないステージは、状態を `skipped` にして理由を記録してください。",
    "",
    "手順 4: Stage 3.5 Code Generation は実行せず、`pending` のまま停止してください。",
    "Bolt `B001` も `active` のまま残してください。",
    "",
    ...sharedPromptRules(),
    `- 作業後に \`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . ${intentId}\` を実行し、fail があれば修正してから結果を要約してください。`,
  ].join("\n");
}

function implementationPlanPrompt(): string {
  return [
    `既存の Amadeus workspace で、Intent \`${intentId}\` を実装の直前（実装計画の確定）まで進めます。`,
    "",
    "手順 1: `amadeus` skill を使い、対象 Intent の続きから再開してください。",
    "",
    "手順 2: walking skeleton の Bolt `B001` に束ねた各 Unit について、Stage 3.5 Code Generation を開始してください。",
    "`stages[\"code-generation\"].units[\"<unit-id>\"].state` を `active` にし、対象 Unit の設計成果物と要求を入力に、",
    "`construction/<unit-id>-<slug>/code-generation/plan.md`（実装計画。変更対象、変更順序、検証方法）を作成してください。",
    "",
    "手順 3: `plan.md` の作成までで停止してください。",
    "この workspace は example であり、実装対象のリポジトリを持たないため、次は行わないでください。",
    "",
    "- アプリケーションコードとテストコードの生成",
    "- `code-generation/summary.md` の作成",
    "- 完了承認のゲート提示と `completed` の記録",
    "",
    "各 Unit の状態は `active` のままにし、Bolt `B001` も `active` のまま残してください。",
    "",
    ...sharedPromptRules(),
    `- 作業後に \`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . ${intentId}\` を実行し、fail があれば修正してから結果を要約してください。`,
  ].join("\n");
}

const steps: GenerationStep[] = [
  {
    id: "01-ideation-completed",
    snapshot: "examples/01-ideation-completed",
    prompt: ideationPrompt(),
    expectedState: {
      schemaVersion: "2",
      intentId,
      scope: "feature",
      status: "in_progress",
      phase: "inception",
      "phaseGates.ideation.via": "pr",
      "stages.intent-capture.state": "completed",
      "stages.scope-definition.state": "completed",
      "stages.approval-handoff.state": "completed",
    },
    expectedFiles: [
      ".amadeus/intents.md",
      `.amadeus/intents/${intentId}.md`,
      `.amadeus/intents/${intentId}/ideation/scope-definition/scope-document.md`,
      `.amadeus/intents/${intentId}/ideation/scope-definition/intent-backlog.md`,
      `.amadeus/intents/${intentId}/ideation/approval-handoff/initiative-brief.md`,
      `.amadeus/intents/${intentId}/ideation/decisions.md`,
      `.amadeus/intents/${intentId}/ideation/traceability.md`,
    ],
    provenanceSkillFiles: ideationSkillFiles,
  },
  {
    id: "02-inception-completed",
    snapshot: "examples/02-inception-completed",
    prompt: inceptionPrompt(),
    expectedState: {
      schemaVersion: "2",
      intentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.ideation.via": "pr",
      "phaseGates.inception.via": "pr",
      "stages.requirements-analysis.state": "completed",
      "stages.units-generation.state": "completed",
      "stages.delivery-planning.state": "completed",
    },
    expectedFiles: [
      `.amadeus/intents/${intentId}/inception/requirements-analysis/requirements.md`,
      `.amadeus/intents/${intentId}/inception/units-generation/units.md`,
      `.amadeus/intents/${intentId}/inception/units-generation/unit-dependencies.md`,
      `.amadeus/intents/${intentId}/inception/delivery-planning/bolt-plan.md`,
    ],
    provenanceSkillFiles: inceptionSkillFiles,
  },
  {
    id: "03-construction-design-ready",
    snapshot: "examples/03-construction-design-ready",
    prompt: constructionPrompt(),
    expectedState: {
      schemaVersion: "2",
      intentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.inception.via": "pr",
    },
    expectedFiles: [
      `.amadeus/intents/${intentId}/construction/*/functional-design/business-logic-model.md`,
      `.amadeus/intents/${intentId}/construction/*/functional-design/business-rules.md`,
      `.amadeus/intents/${intentId}/construction/*/functional-design/domain-entities.md`,
    ],
    provenanceSkillFiles: constructionSkillFiles,
  },
  {
    id: "04-construction-implementation-planned",
    snapshot: "examples/04-construction-implementation-planned",
    prompt: implementationPlanPrompt(),
    expectedState: {
      schemaVersion: "2",
      intentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.inception.via": "pr",
    },
    expectedFiles: [
      `.amadeus/intents/${intentId}/construction/*/code-generation/plan.md`,
    ],
    absentFiles: [
      `.amadeus/intents/${intentId}/construction/*/code-generation/summary.md`,
    ],
    expectedUnitStates: [{ stage: "code-generation", state: "active" }],
    provenanceSkillFiles: implementationPlanSkillFiles,
  },
];

function parseArgs(args: string[]): Options {
  const options: Options = {
    dryRun: false,
    printProvenance: false,
    provider: "real",
    runner: defaultRunner,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--print-provenance") {
      options.printProvenance = true;
    } else if (arg === "--provider") {
      const value = args[index + 1];
      if (value !== "real") fail("--provider currently supports only real");
      options.provider = value;
      index += 1;
    } else if (arg === "--runner") {
      const value = args[index + 1];
      if (!value) fail("--runner requires a path");
      options.runner = value;
      index += 1;
    } else if (arg === "--from") {
      const value = args[index + 1];
      if (!value) fail("--from requires a step id");
      options.from = value;
      index += 1;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  return options;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function resetDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function md5File(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
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

function listFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const next = join(path, entry);
    return statSync(next).isDirectory() ? listFiles(next) : [next];
  });
}

// ---- workspace 準備 ----

function prepareWorkspace(inputStep?: GenerationStep): void {
  resetDir(workspace);
  resetDir(logs);
  resetDir(stagedSnapshots);

  ensureDir(join(workspace, ".agents/skills"));
  ensureDir(join(workspace, ".claude/skills"));
  for (const skill of workspaceSkills) {
    const source = join(root, ".agents/skills", skill);
    if (!existsSync(join(source, "SKILL.md"))) fail(`missing promoted skill: ${skill}`);
    cpSync(source, join(workspace, ".agents/skills", skill), { recursive: true });
    cpSync(source, join(workspace, ".claude/skills", skill), { recursive: true });
  }
  cpSync(join(root, ".agents/rules"), join(workspace, ".agents/rules"), { recursive: true });

  const instructions = [
    "- 必ず日本語で返答すること。",
    "- `.agents/rules/**/*.md` を守ること。",
    "- 日本語を書くときは `japanese-tech-writing` skill を使うこと。",
    "- Amadeus 成果物を作る場合は、対象 skill の同梱テンプレートを使うこと。",
    "- git commit はしないでください。",
  ];
  writeFileSync(join(workspace, "AGENTS.md"), ["# AGENTS.md", "", ...instructions, ""].join("\n"));
  writeFileSync(join(workspace, "CLAUDE.md"), ["# CLAUDE.md", "", ...instructions, ""].join("\n"));

  if (inputStep) {
    const inputSnapshot = join(root, inputStep.snapshot, ".amadeus");
    if (!existsSync(inputSnapshot)) fail(`missing input snapshot: ${inputStep.snapshot}`);
    cpSync(inputSnapshot, join(workspace, ".amadeus"), { recursive: true });
  }
}

// ---- 検査 ----

function readState(base: string): Record<string, unknown> {
  const path = join(base, ".amadeus/intents", intentId, "state.json");
  if (!existsSync(path)) fail(`missing state.json: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function stateValue(state: Record<string, unknown>, dottedPath: string): unknown {
  let current: unknown = state;
  for (const key of dottedPath.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function assertExpectedState(step: GenerationStep): void {
  const state = readState(workspace);
  for (const [path, expected] of Object.entries(step.expectedState)) {
    const actual = stateValue(state, path);
    if (String(actual ?? "") !== expected) {
      fail(`${step.id}: state.json の ${path} が期待値と一致しません（期待: ${expected}、実際: ${String(actual ?? "未設定")}）`);
    }
  }
}

// expectedFiles は 1 セグメントだけ `*` を許可する簡易パターンで確認する。
function assertExpectedFiles(step: GenerationStep): void {
  for (const pattern of step.expectedFiles) {
    if (!matchExists(workspace, pattern)) {
      fail(`${step.id}: 期待する成果物が見つかりません: ${pattern}`);
    }
  }
}

function matchExists(base: string, pattern: string): boolean {
  const segments = pattern.split("/");
  let candidates = [base];
  for (const segment of segments) {
    const next: string[] = [];
    for (const candidate of candidates) {
      if (segment === "*") {
        if (!existsSync(candidate) || !statSync(candidate).isDirectory()) continue;
        for (const entry of readdirSync(candidate)) next.push(join(candidate, entry));
      } else {
        const target = join(candidate, segment);
        if (existsSync(target)) next.push(target);
      }
    }
    candidates = next;
    if (candidates.length === 0) return false;
  }
  return candidates.length > 0;
}

function assertAbsentFiles(step: GenerationStep): void {
  for (const pattern of step.absentFiles ?? []) {
    if (matchExists(workspace, pattern)) {
      fail(`${step.id}: 存在してはならない成果物が見つかりました: ${pattern}`);
    }
  }
}

function assertExpectedUnitStates(step: GenerationStep): void {
  if (!step.expectedUnitStates) return;
  const state = readState(workspace);
  for (const expected of step.expectedUnitStates) {
    const units = stateValue(state, `stages.${expected.stage}.units`);
    if (typeof units !== "object" || units === null || Object.keys(units).length === 0) {
      fail(`${step.id}: stages.${expected.stage}.units に Unit がありません`);
    }
    for (const [unitId, entry] of Object.entries(units as Record<string, { state?: string }>)) {
      if (String(entry?.state ?? "") !== expected.state) {
        fail(`${step.id}: stages.${expected.stage}.units.${unitId}.state が期待値と一致しません（期待: ${expected.state}、実際: ${String(entry?.state ?? "未設定")}）`);
      }
    }
  }
}

function assertValidatorPass(step: GenerationStep): void {
  run(["bun", "run", ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts", ".", intentId], workspace);
  console.log(`${step.id}: validator pass`);
}

// ---- snapshot と provenance ----

function stageSnapshot(step: GenerationStep): void {
  const target = join(stagedSnapshots, step.id, ".amadeus");
  rmSync(join(stagedSnapshots, step.id), { recursive: true, force: true });
  ensureDir(target);
  cpSync(join(workspace, ".amadeus"), target, { recursive: true });
}

function applyStagedSnapshots(targetSteps: GenerationStep[]): void {
  for (const step of targetSteps) {
    const source = join(stagedSnapshots, step.id, ".amadeus");
    const target = join(root, step.snapshot, ".amadeus");
    rmSync(join(root, step.snapshot), { recursive: true, force: true });
    ensureDir(join(root, step.snapshot));
    cpSync(source, target, { recursive: true });
  }
}

function loadManifest(): SkillProvenanceManifest {
  if (!existsSync(provenanceManifestPath)) return { version: 1, entries: [] };
  return JSON.parse(readFileSync(provenanceManifestPath, "utf8"));
}

function updatedManifest(targetSteps: GenerationStep[]): SkillProvenanceManifest {
  const manifest = loadManifest();
  const bySnapshot = new Map(manifest.entries.map((entry) => [entry.snapshot, entry]));
  for (const step of steps) {
    if (!targetSteps.includes(step)) continue;
    bySnapshot.set(step.snapshot, {
      snapshot: step.snapshot,
      skillFiles: step.provenanceSkillFiles.map((path) => ({
        path,
        md5: md5File(join(root, path)),
      })),
    });
  }
  const missing = steps.filter((step) => !bySnapshot.has(step.snapshot)).map((step) => step.snapshot);
  if (missing.length > 0) {
    fail([
      `provenance manifest に entry がない snapshot があります: ${missing.join(", ")}`,
      "部分再生成（--from）は既存 manifest の entry を前提にします。--from を外して全 step を再生成してください。",
    ].join("\n"));
  }
  const entries = steps.map((step) => {
    const entry = bySnapshot.get(step.snapshot);
    if (!entry) fail(`provenance manifest の entry を解決できません: ${step.snapshot}`);
    return entry;
  });
  return { version: 1, entries };
}

function writeManifest(manifest: SkillProvenanceManifest): void {
  ensureDir(join(root, "examples"));
  writeFileSync(provenanceManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

// ---- 昇格同期の前提確認 ----

function ensurePromotedSkillMatchesSource(skillFile: string): void {
  const promoted = join(root, ".agents", skillFile.replace(/^skills\//, "skills/"));
  const source = join(root, skillFile);
  if (!existsSync(source)) fail(`missing source skill file: ${skillFile}`);
  if (!existsSync(promoted)) fail(`missing promoted skill file: ${relative(root, promoted)}`);
  if (md5File(source) !== md5File(promoted)) {
    fail(`source skill and promoted skill differ: ${skillFile}`);
  }
}

function ensurePromotedDirectoryMatchesSource(sourceDir: string, label: string): void {
  const source = join(root, sourceDir);
  const promoted = join(root, ".agents", sourceDir);
  for (const file of listFiles(source)) {
    const rel = relative(source, file);
    const other = join(promoted, rel);
    if (!existsSync(other) || md5File(file) !== md5File(other)) {
      fail(`${label} differ: ${rel}`);
    }
  }
}

// ---- plan ----

function buildPlan(options: Options): { inputStep?: GenerationStep; targetSteps: GenerationStep[] } {
  if (!options.from) return { targetSteps: steps };
  const index = steps.findIndex((step) => step.id === options.from);
  if (index === -1) {
    fail(`unknown --from step id: ${options.from}; available step ids: ${steps.map((step) => step.id).join(", ")}`);
  }
  return {
    inputStep: index > 0 ? steps[index - 1] : undefined,
    targetSteps: steps.slice(index),
  };
}

// ---- main ----

const options = parseArgs(Bun.argv.slice(2));
const plan = buildPlan(options);

console.log(`provider: ${options.provider}`);
console.log(`runner: ${options.runner}`);
console.log(`dryRun: ${options.dryRun}`);
if (plan.inputStep) console.log(`input snapshot: ${plan.inputStep.snapshot}`);
for (const step of plan.targetSteps) {
  console.log(`step: ${step.id} -> ${step.snapshot}`);
}

for (const skillFile of new Set(plan.targetSteps.flatMap((step) => step.provenanceSkillFiles))) {
  ensurePromotedSkillMatchesSource(skillFile);
}
ensurePromotedDirectoryMatchesSource("skills/amadeus-validator/validator", "source validator and .agents validator");

if (options.printProvenance) {
  if (!options.dryRun) fail("--print-provenance requires --dry-run");
  console.log("provenance:");
  console.log(JSON.stringify(updatedManifest(plan.targetSteps), null, 2));
}

if (!options.dryRun) {
  prepareWorkspace(plan.inputStep);
  const provider: LlmProvider = createLlmProvider({
    mockCases: {},
    mode: "real",
    root,
    runner: options.runner,
  });
  for (const step of plan.targetSteps) {
    console.log(`running: ${step.id}`);
    const result = await provider.run({
      caseId: step.id,
      outputPath: join(logs, `${step.id}-last-message.md`),
      prompt: step.prompt,
      workspace,
    });
    console.log(`last message: ${result.outputPath}`);
    assertExpectedState(step);
    assertExpectedFiles(step);
    assertAbsentFiles(step);
    assertExpectedUnitStates(step);
    assertValidatorPass(step);
    stageSnapshot(step);
    console.log(`snapshot staged: ${step.snapshot}`);
  }
  applyStagedSnapshots(plan.targetSteps);
  writeManifest(updatedManifest(plan.targetSteps));
  console.log("example generation: ok");
}
