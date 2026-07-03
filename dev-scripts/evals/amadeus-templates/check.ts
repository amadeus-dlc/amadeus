#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { domainPlacementContract } from "../../../amadeus-contracts/catalog";

const root = resolve(import.meta.dir, "../../..");
const legacyIntentDomainPattern = `${domainPlacementContract.legacyIntentDomainSegments.join("/")}/**`;

type Contract = {
  skillText: string[];
  files: Record<string, string[]>;
  absentFiles?: string[];
  textExcludes?: Record<string, string[]>;
};

type TextContract = {
  path: string;
  includes: string[];
  excludes: string[];
  promotedPath?: string;
};

const targetSkills: Record<string, Contract> = {
  "amadeus-steering": {
    skillText: ["memory/templates", "templates/space"],
    files: {
      "templates/space/README.md": ["基本方針", "テンプレート一覧"],
      "templates/space/memory/org.md": ["方針", "禁止事項", "判断基準"],
      "templates/space/memory/team.md": ["方針", "禁止事項", "判断基準"],
      "templates/space/memory/project.md": ["目的", "コア能力", "主要ユースケース", "価値仮説", "アーキテクチャ", "主要技術", "開発標準", "開発環境", "主要技術判断", "編成方針", "ディレクトリパターン", "命名規約", "依存関係の整理", "コード構成原則"],
      "templates/space/knowledge/glossary.md": ["用語", "避ける語", "禁止ワード"],
      "templates/space/knowledge/actors.md": ["一覧"],
      "templates/space/knowledge/external-systems.md": ["一覧"],
      "templates/space/knowledge/background.md": ["背景", "前提", "未確認事項"],
      "templates/space/knowledge/domain-map.md": ["Subdomains", "Bounded Contexts"],
      "templates/space/knowledge/context-map.md": ["Dependencies"],
      "templates/space/intents/intents.json": [],
      "templates/space/intents/intents.md": ["一覧", "依存関係"],
    },
    absentFiles: [
      "templates/steering/steering.md",
      "templates/steering/domain/subdomains.md",
      "templates/steering/domain/bounded-contexts.md",
    ],
    textExcludes: {
      "SKILL.md": [
        ".amadeus/",
        "state.json",
        "domain/subdomains.md",
        "domain/bounded-contexts.md",
      ],
      "templates/space/README.md": ["domain/subdomains.md", "domain/bounded-contexts.md"],
    },
  },
  "amadeus-event-storming": {
    skillText: ["memory/templates", "templates/event-storming/session"],
    files: {
      "templates/event-storming/session.md": [
        "Purpose",
        "Scope",
        "Related Intent",
        "Level Status",
        "Next Skill",
        "Supersession",
      ],
      "templates/event-storming/session/events.md": ["一覧"],
      "templates/event-storming/session/flow.md": ["Flow"],
      "templates/event-storming/session/board.md": ["Board"],
      "templates/event-storming/session/aggregate-candidates.md": ["一覧"],
      "templates/event-storming/session/bounded-context-candidates.md": ["一覧"],
      "templates/event-storming/session/hotspots.md": ["一覧"],
      "templates/event-storming/session/state.json": [],
    },
  },
  amadeus: {
    skillText: ["memory/templates", "templates/intents/intent-module"],
    files: {
      "templates/intents/intent-module.md": ["概要", "依存", "目標プロファイル"],
      "references/aidlc-v2/state-template.md": ["Stage Progress", "Current Status"],
      "references/audit-events.md": ["Entry 形式", "Amadeus が使うイベント"],
    },
    absentFiles: ["templates/intents/state.json"],
    textExcludes: {
      "templates/intents/intent-module.md": ["## 目的", "## 成功条件", "## 範囲"],
    },
  },
  "amadeus-ideation-intent-capture": {
    skillText: ["memory/templates", "templates/ideation/intent-capture"],
    files: {
      "templates/ideation/intent-capture/stakeholder-map.md": ["利害関係者", "コミュニケーション要件"],
      "templates/ideation/intent-capture/intent-capture-questions.md": [],
    },
    absentFiles: ["templates/intents/intent-record.md"],
  },
  "amadeus-ideation-market-research": {
    skillText: ["memory/templates", "templates/ideation/market-research"],
    files: {
      "templates/ideation/market-research/competitive-analysis.md": ["競合と代替手段"],
      "templates/ideation/market-research/market-trends.md": ["判断に効く動向"],
      "templates/ideation/market-research/build-vs-buy.md": ["選択肢", "推奨"],
      "templates/ideation/market-research/market-research-questions.md": [],
    },
  },
  "amadeus-ideation-feasibility": {
    skillText: ["memory/templates", "templates/ideation/feasibility"],
    files: {
      "templates/ideation/feasibility/feasibility-assessment.md": ["評価", "結論"],
      "templates/ideation/feasibility/constraint-register.md": ["交渉不能な制約"],
      "templates/ideation/feasibility/raid-log.md": ["記録"],
      "templates/ideation/feasibility/feasibility-questions.md": [],
    },
  },
  "amadeus-ideation-scope-definition": {
    skillText: ["memory/templates", "templates/ideation/scope-definition"],
    files: {
      "templates/ideation/scope-definition/scope-document.md": ["最小スコープ", "対象", "対象外", "順序の方針"],
      "templates/ideation/scope-definition/intent-backlog.md": ["バックログ"],
      "templates/ideation/scope-definition/scope-definition-questions.md": [],
    },
  },
  "amadeus-ideation-team-formation": {
    skillText: ["memory/templates", "templates/ideation/team-formation"],
    files: {
      "templates/ideation/team-formation/team-assessment.md": ["体制評価"],
      "templates/ideation/team-formation/skill-matrix.md": ["スキルと充足"],
      "templates/ideation/team-formation/mob-composition.md": ["構成"],
      "templates/ideation/team-formation/team-formation-questions.md": [],
    },
  },
  "amadeus-ideation-rough-mockups": {
    skillText: ["memory/templates", "templates/ideation/rough-mockups"],
    files: {
      "templates/ideation/rough-mockups/wireframes.md": [],
      "templates/ideation/rough-mockups/user-flow.md": [],
      "templates/ideation/rough-mockups/rough-mockups-questions.md": [],
    },
  },
  "amadeus-ideation-approval-handoff": {
    skillText: ["memory/templates", "templates/ideation/approval-handoff"],
    files: {
      "templates/ideation/approval-handoff/initiative-brief.md": ["目的と成功条件", "スコープ境界", "バックログ要約", "Inception への引き継ぎ"],
      "templates/ideation/approval-handoff/decisions.md": ["一覧"],
      "templates/ideation/approval-handoff/traceability.md": ["成功条件と成果物の対応"],
      "templates/ideation/approval-handoff/approval-handoff-questions.md": [],
    },
  },
  "amadeus-inception-reverse-engineering": {
    skillText: ["memory/templates", "templates/codekb"],
    files: {
      "templates/codekb/business-overview.md": ["概要", "主要な業務フロー"],
      "templates/codekb/architecture.md": ["全体構成", "主要な境界"],
      "templates/codekb/code-structure.md": ["ディレクトリ構成", "主要モジュール"],
      "templates/codekb/api-documentation.md": ["公開 API", "内部 API"],
      "templates/codekb/component-inventory.md": ["一覧"],
      "templates/codekb/technology-stack.md": ["言語とランタイム", "主要ライブラリ"],
      "templates/codekb/dependencies.md": ["外部依存", "内部依存"],
      "templates/codekb/code-quality-assessment.md": ["テストの状態", "主要なリスク"],
      "templates/codekb/timestamp.md": [],
    },
  },
  "amadeus-inception-practices-discovery": {
    skillText: ["memory/templates", "templates/inception/practices-discovery"],
    files: {
      "templates/inception/practices-discovery/team-practices.md": ["プラクティス"],
      "templates/inception/practices-discovery/discovered-rules.md": ["ルール候補"],
      "templates/inception/practices-discovery/evidence.md": ["根拠"],
      "templates/inception/practices-discovery/practices-discovery-timestamp.md": [],
      "templates/inception/practices-discovery/practices-discovery-questions.md": [],
    },
  },
  "amadeus-inception-requirements-analysis": {
    skillText: ["memory/templates", "templates/inception/requirements-analysis"],
    files: {
      "templates/inception/requirements-analysis/requirements.md": ["一覧"],
      "templates/inception/requirements-analysis/requirements-analysis-questions.md": [],
    },
  },
  "amadeus-inception-user-stories": {
    skillText: ["memory/templates", "templates/inception/user-stories"],
    files: {
      "templates/inception/user-stories/stories.md": ["一覧"],
      "templates/inception/user-stories/personas.md": ["一覧"],
      "templates/inception/user-stories/user-stories-assessment.md": ["充足評価"],
      "templates/inception/user-stories/user-stories-questions.md": [],
    },
  },
  "amadeus-inception-refined-mockups": {
    skillText: ["memory/templates", "templates/inception/refined-mockups"],
    files: {
      "templates/inception/refined-mockups/mockups.md": [],
      "templates/inception/refined-mockups/interaction-spec.md": [],
      "templates/inception/refined-mockups/design-system-mapping.md": ["対応"],
      "templates/inception/refined-mockups/accessibility-checklist.md": ["確認"],
      "templates/inception/refined-mockups/refined-mockups-questions.md": [],
    },
  },
  "amadeus-inception-application-design": {
    skillText: ["memory/templates", "templates/inception/application-design"],
    files: {
      "templates/inception/application-design/components.md": ["一覧"],
      "templates/inception/application-design/component-methods.md": [],
      "templates/inception/application-design/services.md": ["一覧"],
      "templates/inception/application-design/component-dependency.md": ["依存関係"],
      "templates/inception/application-design/decisions.md": ["一覧"],
      "templates/inception/application-design/application-design-questions.md": [],
    },
  },
  "amadeus-inception-units-generation": {
    skillText: ["memory/templates", "templates/inception/units-generation"],
    files: {
      "templates/inception/units-generation/unit-of-work.md": ["一覧"],
      "templates/inception/units-generation/unit-of-work-dependency.md": ["依存 DAG"],
      "templates/inception/units-generation/unit-of-work-story-map.md": ["対応"],
      "templates/inception/units-generation/units-generation-questions.md": [],
    },
  },
  "amadeus-inception-delivery-planning": {
    skillText: ["memory/templates", "templates/inception/delivery-planning"],
    files: {
      "templates/inception/delivery-planning/bolt-plan.md": ["一覧"],
      "templates/inception/delivery-planning/team-allocation.md": ["割り当て"],
      "templates/inception/delivery-planning/risk-and-sequencing-rationale.md": ["順序付けの根拠", "リスク"],
      "templates/inception/delivery-planning/external-dependency-map.md": ["外部依存"],
      "templates/inception/delivery-planning/delivery-planning-questions.md": [],
    },
  },
  "amadeus-construction-functional-design": {
    skillText: ["memory/templates", "templates/construction/functional-design"],
    files: {
      "templates/construction/functional-design/business-logic-model.md": ["目的", "対象 Unit", "業務ロジック", "入力", "出力", "未確認事項"],
      "templates/construction/functional-design/business-rules.md": ["目的", "業務ルール", "例外", "Intent Contracts", "未確認事項"],
      "templates/construction/functional-design/domain-entities.md": ["目的", "Domain Entity", "関係", "Domain Map と Context Map への反映候補", "未確認事項"],
      "templates/construction/functional-design/frontend-components.md": ["構成"],
      "templates/construction/functional-design/functional-design-questions.md": [],
    },
  },
  "amadeus-construction-nfr-requirements": {
    skillText: ["memory/templates", "templates/construction/nfr-requirements"],
    files: {
      "templates/construction/nfr-requirements/performance-requirements.md": ["要求", "根拠"],
      "templates/construction/nfr-requirements/security-requirements.md": ["要求", "根拠"],
      "templates/construction/nfr-requirements/scalability-requirements.md": ["要求", "根拠"],
      "templates/construction/nfr-requirements/reliability-requirements.md": ["要求", "根拠"],
      "templates/construction/nfr-requirements/tech-stack-decisions.md": ["判断", "理由"],
      "templates/construction/nfr-requirements/nfr-requirements-questions.md": [],
    },
  },
  "amadeus-construction-nfr-design": {
    skillText: ["memory/templates", "templates/construction/nfr-design"],
    files: {
      "templates/construction/nfr-design/performance-design.md": ["設計", "対応する要求"],
      "templates/construction/nfr-design/security-design.md": ["設計", "対応する要求"],
      "templates/construction/nfr-design/scalability-design.md": ["設計", "対応する要求"],
      "templates/construction/nfr-design/reliability-design.md": ["設計", "対応する要求"],
      "templates/construction/nfr-design/logical-components.md": ["構成", "責務"],
      "templates/construction/nfr-design/nfr-design-questions.md": [],
    },
  },
  "amadeus-construction-infrastructure-design": {
    skillText: ["memory/templates", "templates/construction/infrastructure-design"],
    files: {
      "templates/construction/infrastructure-design/deployment-architecture.md": ["構成", "根拠"],
      "templates/construction/infrastructure-design/infrastructure-services.md": ["対応", "根拠"],
      "templates/construction/infrastructure-design/monitoring-design.md": ["監視項目", "通知"],
      "templates/construction/infrastructure-design/cicd-pipeline.md": ["構成", "トリガー"],
      "templates/construction/infrastructure-design/shared-infrastructure.md": ["共有対象", "影響"],
      "templates/construction/infrastructure-design/infrastructure-design-questions.md": [],
    },
  },
  "amadeus-construction-code-generation": {
    skillText: ["memory/templates", "templates/construction/code-generation"],
    files: {
      "templates/construction/code-generation/code-generation-plan.md": ["変更対象", "変更順序", "検証方法"],
      "templates/construction/code-generation/code-summary.md": ["変更したファイル", "対応した要求"],
      "templates/construction/code-generation/code-generation-questions.md": [],
    },
  },
  "amadeus-construction-build-and-test": {
    skillText: ["memory/templates", "templates/construction/build-and-test"],
    files: {
      "templates/construction/build-and-test/build-instructions.md": ["手順"],
      "templates/construction/build-and-test/unit-test-instructions.md": ["手順"],
      "templates/construction/build-and-test/integration-test-instructions.md": ["手順"],
      "templates/construction/build-and-test/performance-test-instructions.md": ["手順"],
      "templates/construction/build-and-test/security-test-instructions.md": ["手順"],
      "templates/construction/build-and-test/build-and-test-summary.md": ["Definition of Done の充足"],
      "templates/construction/build-and-test/build-test-results.md": ["実行結果"],
    },
  },
  "amadeus-construction-ci-pipeline": {
    skillText: ["memory/templates", "templates/construction/ci-pipeline"],
    files: {
      "templates/construction/ci-pipeline/ci-config.md": ["構成"],
      "templates/construction/ci-pipeline/quality-gates.md": ["ゲート"],
      "templates/construction/ci-pipeline/ci-pipeline-questions.md": [],
    },
  },
};

const textContracts: TextContract[] = [
  {
    path: "skills/amadeus-decision-review/SKILL.md",
    promotedPath: ".agents/skills/amadeus-decision-review/SKILL.md",
    includes: [
      "## Decision Nodes",
      "## Outcome",
      "## Grilling Handoff",
      "`grill_required`",
      "`no_grill`",
      "`repair_only`",
      "`follow_up_issue_candidate`",
      "`upstream_feedback_required`",
      "stage assumptions of the skill supply source and the execution environment",
      "source skill, promoted artifacts, and host environment",
      "stage0, stage1, stage2, and the stage0 adoption decision",
      "The validator's `pass` means that the minimum structural conditions referenceable at runtime are satisfied, and it is not content approval.",
    ],
    excludes: ["Issue #277", "Issue #272"],
  },
  {
    path: "skills/amadeus-history-review/SKILL.md",
    promotedPath: ".agents/skills/amadeus-history-review/SKILL.md",
    includes: [
      "## Reading Targets",
      "## Extraction Results",
      "## Boundaries",
      "Do not update artifacts, do not create GitHub Issues, do not create Intent Records, and do not auto-promote into the Domain Map and Context Map.",
      "`aidlc/spaces/<space>/intents/**/aidlc-state.md`",
      "`aidlc/spaces/<space>/intents/**/construction/**`",
      "`amadeus-learning-review`",
      "the `amadeus` Intake",
      "Do not create GitHub Issues.",
      "Do not create Intent Records.",
      "Do not auto-promote into the Domain Map and Context Map.",
    ],
    excludes: [],
  },
  {
    path: "skills/amadeus-learning-review/SKILL.md",
    promotedPath: ".agents/skills/amadeus-learning-review/SKILL.md",
    includes: [
      "## Inputs",
      "## Classification Results",
      "`current_phase_update_required`",
      "`upstream_feedback_required`",
      "`steering_knowledge_candidate`",
      "`domain_map_candidate`",
      "`context_map_candidate`",
      "`follow_up_issue_candidate`",
      "`follow_up_intent_candidate`",
      "`no_learning_action`",
      "`amadeus-history-review`",
      "`amadeus-grilling`",
      "Do not update artifacts, do not create GitHub Issues, and do not auto-promote into the Domain Map and Context Map.",
      "Do not create GitHub Issues.",
      "Do not auto-promote into the Domain Map and Context Map.",
    ],
    excludes: [],
  },
  {
    path: "README.ja.md",
    includes: [
      "対象 Intent の `domain-notes.md`、`aidlc/spaces/<space>/knowledge/domain-map.md`、`aidlc/spaces/<space>/knowledge/context-map.md`、`inception/traceability.md`、Construction の Functional Design",
    ],
    excludes: [
      "対象 Intent の `domain-notes.md`、`domain/**`、`traceability.md`",
      `対象 Intent の \`domain-notes.md\`、\`${legacyIntentDomainPattern}\``,
    ],
  },
  {
    path: "skills/amadeus-event-storming/SKILL.md",
    promotedPath: ".agents/skills/amadeus-event-storming/SKILL.md",
    includes: [
      "- `aidlc/spaces/<space>/memory/project.md`",
    ],
    excludes: [],
  },
  {
    path: "skills/amadeus-domain-modeling/SKILL.md",
    promotedPath: ".agents/skills/amadeus-domain-modeling/SKILL.md",
    includes: [
      "aidlc/spaces/<space>/knowledge/domain-map.md",
      "aidlc/spaces/<space>/knowledge/context-map.md",
      "Construction Functional Design",
      "inception/traceability.md",
      "inception/decisions.md",
    ],
    excludes: [
      ".amadeus/domain",
      ".amadeus/domain/**",
      ".amadeus/intents/<intent-id>-<slug>/domain/**",
      `.amadeus/intents/<intent-id>-<slug>/${legacyIntentDomainPattern}`,
      ".amadeus/intents/<intent-id>-<slug>/traceability.md",
      ".amadeus/intents/<intent-id>-<slug>/decisions.md",
    ],
  },
  {
    path: "skills/amadeus-domain-grilling/SKILL.md",
    promotedPath: ".agents/skills/amadeus-domain-grilling/SKILL.md",
    includes: [
      "aidlc/spaces/<space>/knowledge/domain-map.md",
      "aidlc/spaces/<space>/knowledge/context-map.md",
      "Construction Functional Design",
      "the target Intent's `inception/traceability.md`",
    ],
    excludes: [
      ".amadeus/domain",
      ".amadeus/domain/**",
      ".amadeus/intents/<intent-id>-<slug>/domain/**",
      `.amadeus/intents/<intent-id>-<slug>/${legacyIntentDomainPattern}`,
      "Intent's `traceability.md`",
    ],
  },
  {
    path: "skills/amadeus-inception-units-generation/SKILL.md",
    promotedPath: ".agents/skills/amadeus-inception-units-generation/SKILL.md",
    includes: [
      "This stage creates only the topology (Unit boundaries and dependencies).",
      "Do not handle implementation ordering, critical path recommendations, or economic sequencing (what to ship first).",
    ],
    excludes: [".amadeus/domain/**", "domain layer"],
  },
  {
    path: "skills/amadeus-validator/SKILL.md",
    promotedPath: ".agents/skills/amadeus-validator/SKILL.md",
    includes: [
      "## Validation Results and Learning Candidates",
      "The validator's result is structural detection.",
      "The validator's `pass` is not content approval.",
      "Do not decide decision review's question necessity or adoption decisions from the validator's result alone.",
      "The evaluator's result is quality evaluation; keep it separate from the validator's judgment.",
      "`current_phase_update_required`",
      "`upstream_feedback_required`",
      "`steering_knowledge_candidate`",
      "`domain_map_candidate`",
      "`context_map_candidate`",
      "`follow_up_intent_candidate`",
      "`no_learning_action`",
    ],
    excludes: [],
  },
  {
    path: "skills/amadeus-construction-functional-design/SKILL.md",
    promotedPath: ".agents/skills/amadeus-construction-functional-design/SKILL.md",
    includes: [
      "Functional Design is the maintenance point for the detailed Domain Model and",
      "After Functional Design approval, record candidates to promote into the Domain",
      "When the target Unit's Functional Design is approved, update the Domain Map only",
      "If a template has supplemental headings outside the Catalog, preserve those",
      "Do not place candidates in the Domain Map or Context Map.",
    ],
    excludes: [".amadeus/domain/**", "domain layer"],
  },
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[]): string {
  return runInCwd(command, root);
}

function runInCwd(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], cwd: string, expected: string): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  const output = `${stdout}\n${stderr}`;
  if (!output.includes(expected)) {
    fail([
      `command failed without expected output: ${expected}`,
      "command: " + command.join(" "),
      "stdout:",
      stdout,
      "stderr:",
      stderr,
    ].join("\n"));
  }
}

function assertFile(path: string): void {
  if (!existsSync(path)) fail(`missing file: ${path}`);
}

function assertFileMissing(path: string): void {
  if (existsSync(path)) fail(`unexpected file: ${path}`);
}

function assertTextIncludes(path: string, needle: string): void {
  const text = readFileSync(path, "utf8");
  if (!text.includes(needle)) fail(`${path} does not include ${JSON.stringify(needle)}`);
}

function assertTextExcludes(path: string, needle: string): void {
  const text = readFileSync(path, "utf8");
  if (text.includes(needle)) fail(`${path} unexpectedly includes ${JSON.stringify(needle)}`);
}

function assertHeading(path: string, heading: string): void {
  const text = readFileSync(path, "utf8");
  if (!new RegExp(`^## ${escapeRegExp(heading)}$`, "m").test(text)) {
    fail(`${path} is missing heading: ## ${heading}`);
  }
}

function assertJsonTemplate(path: string): void {
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} is not valid JSON: ${(error as Error).message}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


for (const [skill, contract] of Object.entries(targetSkills)) {
  const skillMd = join(root, "skills", skill, "SKILL.md");
  assertFile(skillMd);
  for (const needle of contract.skillText) assertTextIncludes(skillMd, needle);

  for (const [relative, headings] of Object.entries(contract.files)) {
    const source = join(root, "skills", skill, relative);
    const promoted = join(root, ".agents/skills", skill, relative);
    assertFile(source);
    assertFile(promoted);
    for (const heading of headings) assertHeading(source, heading);
    if (source.endsWith(".json")) assertJsonTemplate(source);
  }

  for (const relative of contract.absentFiles ?? []) {
    assertFileMissing(join(root, "skills", skill, relative));
    assertFileMissing(join(root, ".agents/skills", skill, relative));
  }

  for (const [relative, needles] of Object.entries(contract.textExcludes ?? {})) {
    const source = join(root, "skills", skill, relative);
    const promoted = join(root, ".agents/skills", skill, relative);
    assertFile(source);
    assertFile(promoted);
    for (const needle of needles) {
      assertTextExcludes(source, needle);
      assertTextExcludes(promoted, needle);
    }
  }
}

for (const contract of textContracts) {
  const source = join(root, contract.path);
  assertFile(source);
  for (const needle of contract.includes) assertTextIncludes(source, needle);
  for (const needle of contract.excludes) assertTextExcludes(source, needle);

  if (contract.promotedPath) {
    const promoted = join(root, contract.promotedPath);
    assertFile(promoted);
    for (const needle of contract.includes) assertTextIncludes(promoted, needle);
    for (const needle of contract.excludes) assertTextExcludes(promoted, needle);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "amadeus-template-promotion"));
const agentsRoot = join(tmp, ".agents/skills");
for (const skill of Object.keys(targetSkills)) {
  run(["bun", "run", "dev-scripts/promote-skill.ts", skill, "--agents-root", agentsRoot]);
  run(["diff", "-qr", `skills/${skill}/templates`, join(agentsRoot, skill, "templates")]);
}

console.log("amadeus template eval: ok");
