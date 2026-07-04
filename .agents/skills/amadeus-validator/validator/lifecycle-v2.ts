// v2 ライフサイクルの Intent record 検証。
// 状態の持ち主は record 直下の aidlc-state.md（v2 state template 構造）であり、
// 承認と遷移の履歴は audit/audit.md のイベントが持つ。
// 契約は docs/amadeus/lifecycle/state.md と scopes.md、および
// skills/amadeus/references/aidlc-v2/ の vendored 一次情報に従う。

import {
  AIDLC_CHECKBOX_STATES,
  AIDLC_PHASES,
  AIDLC_SECTION_HEADINGS,
  AIDLC_STAGE_SLUGS_BY_PHASE,
  checkboxStateName,
  parseAidlcState,
} from "./aidlc-state-contract";
import type { AidlcStateDocument } from "./aidlc-state-contract";

type LifecycleV2Context = {
  pass: (target: string, condition: string, evidence: string) => void;
  failRow: (target: string, condition: string, evidence: string) => void;
  checkFile: (path: string, condition: string) => void;
  // v2 契約検査（stage 定義ファイルの frontmatter 参照）専用。存在しなければ undefined を返す。
  readOptional: (path: string) => string | undefined;
};

type LifecycleV2Input = {
  base: string;
  dirName: string;
  stateText: string;
  auditText?: string;
  // true: docs/backward-compatibility.md に記載された record。現行（v2 事前適応）の旧形式検査を維持する。
  // false: 記載のない record。.agents/amadeus/amadeus-common/stages/ の frontmatter から導出した v2 契約検査を適用する。
  legacy: boolean;
  // legacy が false のとき、audit/ 配下に .md shard が1件以上あるかどうか。
  auditShardExists: boolean;
};

type StageDef = {
  slug: string;
  phase: "initialization" | "ideation" | "inception" | "construction";
  perUnit: boolean;
  scopes: readonly string[];
  requiredArtifacts: readonly string[];
};

const scopeValues = new Set([
  "enterprise",
  "feature",
  "mvp",
  "poc",
  "bugfix",
  "refactor",
  "infra",
  "security-patch",
  "workshop",
]);

const depthValues = new Set(["Minimal", "Standard", "Comprehensive"]);
const statusValues = new Set(["Running", "Completed"]);
const projectTypeValues = new Set(["Greenfield", "Brownfield"]);
const autonomyValues = new Set(["unset", "autonomous", "gated"]);
const lifecyclePhaseValues = new Set(["INITIALIZATION", "IDEATION", "INCEPTION", "CONSTRUCTION", "OPERATION"]);
const phaseProgressValues = new Set(["Pending", "Active", "Verified", "Skipped"]);

const allScopes = [...scopeValues];
const businessScopes = ["enterprise", "feature", "mvp"];
const inceptionScopes = [...businessScopes, "workshop"];

// scope 対応は skills/amadeus/references/stage-catalog.md の表と一致させる。
// 成果物名は v2 の実ファイル名（R005）に従う。
// 移行スクリプトと examples 契約が同じ対応表を参照できるよう export する。
export const stageCatalog: readonly StageDef[] = [
  { slug: "workspace-scaffold", phase: "initialization", perUnit: false, scopes: allScopes, requiredArtifacts: [] },
  { slug: "workspace-detection", phase: "initialization", perUnit: false, scopes: allScopes, requiredArtifacts: [] },
  { slug: "state-init", phase: "initialization", perUnit: false, scopes: allScopes, requiredArtifacts: [] },
  { slug: "intent-capture", phase: "ideation", perUnit: false, scopes: [...businessScopes, "poc"], requiredArtifacts: ["ideation/intent-capture/intent-statement.md", "ideation/intent-capture/stakeholder-map.md"] },
  { slug: "market-research", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/market-research/competitive-analysis.md", "ideation/market-research/market-trends.md", "ideation/market-research/build-vs-buy.md"] },
  { slug: "feasibility", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/feasibility/feasibility-assessment.md", "ideation/feasibility/constraint-register.md", "ideation/feasibility/raid-log.md"] },
  { slug: "scope-definition", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/scope-definition/scope-document.md", "ideation/scope-definition/intent-backlog.md"] },
  { slug: "team-formation", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/team-formation/team-assessment.md", "ideation/team-formation/skill-matrix.md", "ideation/team-formation/mob-composition.md"] },
  { slug: "rough-mockups", phase: "ideation", perUnit: false, scopes: businessScopes, requiredArtifacts: ["ideation/rough-mockups/wireframes.md", "ideation/rough-mockups/user-flow.md"] },
  { slug: "approval-handoff", phase: "ideation", perUnit: false, scopes: ["enterprise", "feature"], requiredArtifacts: ["ideation/approval-handoff/initiative-brief.md", "ideation/decisions.md", "ideation/traceability.md"] },
  { slug: "reverse-engineering", phase: "inception", perUnit: false, scopes: [...businessScopes, "poc", "bugfix", "refactor", "security-patch", "workshop"], requiredArtifacts: [] },
  { slug: "practices-discovery", phase: "inception", perUnit: false, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["inception/practices-discovery/team-practices.md", "inception/practices-discovery/discovered-rules.md", "inception/practices-discovery/evidence.md", "inception/practices-discovery/practices-discovery-timestamp.md"] },
  { slug: "requirements-analysis", phase: "inception", perUnit: false, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "infra"], requiredArtifacts: ["inception/requirements-analysis/requirements.md"] },
  { slug: "user-stories", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/user-stories/stories.md", "inception/user-stories/personas.md", "inception/user-stories/user-stories-assessment.md"] },
  { slug: "refined-mockups", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/refined-mockups/mockups.md", "inception/refined-mockups/interaction-spec.md", "inception/refined-mockups/design-system-mapping.md", "inception/refined-mockups/accessibility-checklist.md"] },
  { slug: "application-design", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/application-design/components.md", "inception/application-design/component-methods.md", "inception/application-design/services.md", "inception/application-design/component-dependency.md", "inception/application-design/decisions.md"] },
  { slug: "units-generation", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/units-generation/unit-of-work.md", "inception/units-generation/unit-of-work-dependency.md"] },
  { slug: "delivery-planning", phase: "inception", perUnit: false, scopes: inceptionScopes, requiredArtifacts: ["inception/delivery-planning/bolt-plan.md", "inception/delivery-planning/risk-and-sequencing-rationale.md", "inception/delivery-planning/external-dependency-map.md"] },
  { slug: "functional-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "refactor"], requiredArtifacts: ["functional-design/business-logic-model.md", "functional-design/business-rules.md", "functional-design/domain-entities.md"] },
  { slug: "nfr-requirements", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra", "security-patch"], requiredArtifacts: ["nfr-requirements/performance-requirements.md", "nfr-requirements/security-requirements.md", "nfr-requirements/scalability-requirements.md", "nfr-requirements/reliability-requirements.md", "nfr-requirements/tech-stack-decisions.md"] },
  { slug: "nfr-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["nfr-design/performance-design.md", "nfr-design/security-design.md", "nfr-design/scalability-design.md", "nfr-design/reliability-design.md", "nfr-design/logical-components.md"] },
  { slug: "infrastructure-design", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["infrastructure-design/deployment-architecture.md", "infrastructure-design/infrastructure-services.md", "infrastructure-design/monitoring-design.md", "infrastructure-design/cicd-pipeline.md"] },
  { slug: "code-generation", phase: "construction", perUnit: true, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "security-patch"], requiredArtifacts: ["code-generation/code-generation-plan.md", "code-generation/code-summary.md"] },
  { slug: "build-and-test", phase: "construction", perUnit: false, scopes: [...inceptionScopes, "poc", "bugfix", "refactor", "security-patch"], requiredArtifacts: [] },
  { slug: "ci-pipeline", phase: "construction", perUnit: false, scopes: [...inceptionScopes, "infra"], requiredArtifacts: ["construction/ci-pipeline/ci-config.md", "construction/ci-pipeline/quality-gates.md"] },
] as const;

const stageBySlug = new Map(stageCatalog.map((stage) => [stage.slug, stage]));
const knownSlugs = new Set(AIDLC_PHASES.flatMap((phase) => AIDLC_STAGE_SLUGS_BY_PHASE[phase] ?? []));
const operationSlugs = new Set(AIDLC_STAGE_SLUGS_BY_PHASE["Operation"] ?? []);

type AuditEvent = { event: string; body: string };

export function checkAidlcIntentRecord(ctx: LifecycleV2Context, input: LifecycleV2Input): void {
  const statePath = `${input.base}/aidlc-state.md`;
  const doc = parseAidlcState(input.stateText);
  const events = parseAuditEvents(input.auditText ?? "");

  checkSections(ctx, statePath, doc);
  checkHeaderFields(ctx, statePath, doc);

  const scope = String(doc.fields["Scope"] ?? "");
  if (!scopeValues.has(scope)) return;

  checkStageProgress(ctx, statePath, doc, scope);
  checkPhaseProgress(ctx, statePath, doc);
  checkCurrentStatus(ctx, statePath, doc, scope);
  checkAuditEvidence(ctx, input, doc, events);
  if (input.legacy) {
    checkCompletedArtifacts(ctx, input, doc, scope);
  } else {
    checkCompletedArtifactsV2(ctx, input, doc, scope);
    checkPhaseCheckArtifactsV2(ctx, input, doc);
  }
}

function parseAuditEvents(auditText: string): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const block of auditText.split(/^---$/m)) {
    const match = block.match(/^\*\*Event\*\*: (.+)$/m);
    if (match) events.push({ event: (match[1] ?? "").trim(), body: block });
  }
  return events;
}

function checkSections(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument): void {
  const found = new Set(doc.sections.map((section) => section.heading));
  const missing = AIDLC_SECTION_HEADINGS.filter((heading) => !found.has(heading));
  if (missing.length === 0) {
    ctx.pass(statePath, "aidlc-state.md が v2 state template の全セクションを持つ", `${doc.sections.length} セクション`);
  } else {
    ctx.failRow(statePath, "aidlc-state.md が v2 state template の全セクションを持つ", `不足: ${missing.join(", ")}`);
  }
}

function checkHeaderFields(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument): void {
  checkAllowedField(ctx, statePath, doc, "Scope", scopeValues);
  checkAllowedField(ctx, statePath, doc, "Depth", depthValues);
  checkAllowedField(ctx, statePath, doc, "Project Type", projectTypeValues);
  checkAllowedField(ctx, statePath, doc, "Status", statusValues);
  checkAllowedField(ctx, statePath, doc, "Lifecycle Phase", lifecyclePhaseValues);

  const version = String(doc.fields["State Version"] ?? "");
  if (version === "7") {
    ctx.pass(statePath, "`State Version` が 7 である", version);
  } else {
    ctx.failRow(statePath, "`State Version` が 7 である", version === "" ? "未設定" : version);
  }

  // `Construction Autonomy Mode` の未設定は旧 state 初期化が書いた既存 record の
  // 後方互換として許容する（Issue #455）。設定されている場合のみ許可値を検査する。
  const autonomy = String(doc.fields["Construction Autonomy Mode"] ?? "");
  if (autonomy === "") {
    ctx.pass(statePath, "`Construction Autonomy Mode` が既知の値である", "未設定（後方互換で許容）");
  } else {
    checkAllowedValue(ctx, statePath, "`Construction Autonomy Mode` が既知の値である", autonomy, autonomyValues);
  }
}

function checkAllowedField(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument, key: string, allowed: Set<string>): void {
  checkAllowedValue(ctx, statePath, `\`${key}\` が既知の値である`, String(doc.fields[key] ?? ""), allowed);
}

function checkAllowedValue(ctx: LifecycleV2Context, statePath: string, condition: string, value: string, allowed: Set<string>): void {
  if (allowed.has(value)) {
    ctx.pass(statePath, condition, value);
  } else {
    ctx.failRow(statePath, condition, value === "" ? "未設定" : value);
  }
}

function checkStageProgress(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument, scope: string): void {
  const parsedSlugs = new Set(doc.stages.map((stage) => stage.slug));
  const unknown = [...parsedSlugs].filter((slug) => !knownSlugs.has(slug));
  if (unknown.length === 0) {
    ctx.pass(statePath, "Stage Progress の stage slug がすべて既知である", `${parsedSlugs.size} slug`);
  } else {
    ctx.failRow(statePath, "Stage Progress の stage slug がすべて既知である", `不明: ${unknown.join(", ")}`);
  }

  const missing = [...knownSlugs].filter((slug) => !parsedSlugs.has(slug));
  if (missing.length === 0) {
    ctx.pass(statePath, "Stage Progress に全ステージの行がある", "32 stage");
  } else {
    ctx.failRow(statePath, "Stage Progress に全ステージの行がある", `不足: ${missing.join(", ")}`);
  }

  for (const stage of doc.stages) {
    checkStageMark(ctx, statePath, scope, stage);
  }
}

function checkStageMark(
  ctx: LifecycleV2Context,
  statePath: string,
  scope: string,
  stage: { slug: string; mark: string; unit?: string },
): void {
  const label = stage.unit === undefined ? stage.slug : `${stage.slug}（unit: ${stage.unit}）`;
  if (!(stage.mark in AIDLC_CHECKBOX_STATES)) {
    ctx.failRow(statePath, "ステージの checkbox が既知の語彙である", `${label}: ${stage.mark}`);
    return;
  }

  const def = stageBySlug.get(stage.slug);
  const inScope = def !== undefined && def.scopes.includes(scope);
  if (operationSlugs.has(stage.slug) || (def !== undefined && !inScope)) {
    if (checkboxStateName(stage.mark) === "Skipped") {
      ctx.pass(statePath, "scope 外のステージが [S] である", label);
    } else {
      ctx.failRow(statePath, "scope 外のステージが [S] である", `${label}: ${stage.mark}`);
    }
    return;
  }
  ctx.pass(statePath, "ステージの checkbox が既知の語彙である", `${label}: ${checkboxStateName(stage.mark)}`);
}

function checkPhaseProgress(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument): void {
  for (const phase of AIDLC_PHASES) {
    const value = String(doc.phaseProgress[phase] ?? "");
    checkAllowedValue(ctx, statePath, "Phase Progress の値が既知である", value, phaseProgressValues);
  }

  const lifecycle = String(doc.fields["Lifecycle Phase"] ?? "");
  const activeIndex = AIDLC_PHASES.findIndex((phase) => phase.toUpperCase() === lifecycle);
  if (activeIndex < 0) return;

  const status = String(doc.fields["Status"] ?? "");
  const bound = status === "Completed" ? AIDLC_PHASES.length : activeIndex;
  for (const phase of AIDLC_PHASES.slice(0, bound)) {
    const value = String(doc.phaseProgress[phase] ?? "");
    if (value === "Verified" || value === "Skipped") {
      ctx.pass(statePath, "先行 phase が Verified または Skipped である", `${phase}: ${value}`);
    } else if (phase === "Operation" && status === "Completed") {
      // Amadeus は Operation を実行対象にしないため、Completed でも Skipped 以外を許さない。
      ctx.failRow(statePath, "先行 phase が Verified または Skipped である", `${phase}: ${value}`);
    } else {
      ctx.failRow(statePath, "先行 phase が Verified または Skipped である", `${phase}: ${value === "" ? "未設定" : value}`);
    }
  }
}

function checkCurrentStatus(ctx: LifecycleV2Context, statePath: string, doc: AidlcStateDocument, scope: string): void {
  const status = String(doc.fields["Status"] ?? "");
  if (status === "Completed") {
    ctx.pass(statePath, "`Current Stage` が scope の実行対象である", "Status Completed のため不問");
    return;
  }
  const current = String(doc.fields["Current Stage"] ?? "");
  const expected = new Set(stageCatalog.filter((stage) => stage.scopes.includes(scope)).map((stage) => stage.slug));
  checkAllowedValue(ctx, statePath, "`Current Stage` が scope の実行対象である", current, expected);
}

function checkAuditEvidence(ctx: LifecycleV2Context, input: LifecycleV2Input, doc: AidlcStateDocument, events: AuditEvent[]): void {
  const auditPath = input.legacy ? `${input.base}/audit/audit.md` : `${input.base}/audit`;
  if (input.legacy) {
    ctx.checkFile(auditPath, "audit の主 shard が存在する");
  } else if (input.auditShardExists) {
    ctx.pass(auditPath, "v2 契約: audit shard が1件以上存在する", "shard を確認");
  } else {
    ctx.failRow(auditPath, "v2 契約: audit shard が1件以上存在する", "shard なし");
    return;
  }
  if (input.auditText === undefined) return;

  checkEventPresence(ctx, auditPath, events, "WORKFLOW_STARTED", "WORKFLOW_STARTED が記録されている");
  if (String(doc.fields["Status"] ?? "") === "Completed") {
    checkEventPresence(ctx, auditPath, events, "WORKFLOW_COMPLETED", "Completed の record は WORKFLOW_COMPLETED を持つ");
  }

  for (const stage of doc.stages) {
    if (checkboxStateName(stage.mark) !== "Completed") continue;
    if (!stageBySlug.has(stage.slug)) continue;
    const found = events.some((entry) => entry.event === "STAGE_COMPLETED" && entry.body.includes(stage.slug));
    const label = stage.unit === undefined ? stage.slug : `${stage.slug}（unit: ${stage.unit}）`;
    if (found) {
      ctx.pass(auditPath, "完了ステージは STAGE_COMPLETED イベントを持つ", label);
    } else {
      ctx.failRow(auditPath, "完了ステージは STAGE_COMPLETED イベントを持つ", label);
    }
  }

  checkPhaseEvents(ctx, auditPath, doc, events);
  checkBoltEvents(ctx, auditPath, doc, events);
}

function checkEventPresence(ctx: LifecycleV2Context, auditPath: string, events: AuditEvent[], event: string, condition: string): void {
  if (events.some((entry) => entry.event === event)) {
    ctx.pass(auditPath, condition, event);
  } else {
    ctx.failRow(auditPath, condition, `${event} がない`);
  }
}

function checkPhaseEvents(ctx: LifecycleV2Context, auditPath: string, doc: AidlcStateDocument, events: AuditEvent[]): void {
  // phase 名の照合は大文字小文字非依存（Issue #446）。エンジンは小文字
  // （`**Phase**: ideation` / `**Phase boundary**: initialization → inception`）を
  // 書き、既存 record には大文字表記が残っているため、両方を pass させる。
  const bodyHasPhase = (entry: AuditEvent, phase: string): boolean =>
    entry.body.toLowerCase().includes(phase.toLowerCase());
  for (const phase of ["Ideation", "Inception", "Construction", "Operation"]) {
    const value = String(doc.phaseProgress[phase] ?? "");
    if (value === "Verified") {
      const found = events.some((entry) => entry.event === "PHASE_VERIFIED" && bodyHasPhase(entry, phase));
      if (found) ctx.pass(auditPath, "Verified の phase は PHASE_VERIFIED イベントを持つ", phase);
      else ctx.failRow(auditPath, "Verified の phase は PHASE_VERIFIED イベントを持つ", phase);
    }
    if (value === "Skipped") {
      const found = events.some((entry) => entry.event === "PHASE_SKIPPED" && bodyHasPhase(entry, phase));
      if (found) ctx.pass(auditPath, "Skipped の phase は PHASE_SKIPPED イベントを持つ", phase);
      else ctx.failRow(auditPath, "Skipped の phase は PHASE_SKIPPED イベントを持つ", phase);
    }
  }
}

function checkBoltEvents(ctx: LifecycleV2Context, auditPath: string, doc: AidlcStateDocument, events: AuditEvent[]): void {
  const refs = splitBoltRefs(doc.fields["Bolt Refs"]);
  if (refs.length === 0) return;
  if (String(doc.phaseProgress["Construction"] ?? "") !== "Verified") return;
  for (const ref of refs) {
    const found = events.some((entry) => entry.event === "BOLT_COMPLETED" && entry.body.includes(ref));
    if (found) ctx.pass(auditPath, "完了 Bolt は BOLT_COMPLETED イベントを持つ", ref);
    else ctx.failRow(auditPath, "完了 Bolt は BOLT_COMPLETED イベントを持つ", ref);
  }
}

function splitBoltRefs(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function checkCompletedArtifacts(ctx: LifecycleV2Context, input: LifecycleV2Input, doc: AidlcStateDocument, scope: string): void {
  for (const stage of doc.stages) {
    if (checkboxStateName(stage.mark) !== "Completed") continue;
    const def = stageBySlug.get(stage.slug);
    if (!def || !def.scopes.includes(scope)) continue;
    if (def.perUnit) {
      if (stage.unit === undefined) continue;
      for (const artifact of def.requiredArtifacts) {
        ctx.checkFile(`${input.base}/construction/${stage.unit}/${artifact}`, "completed のステージは必須成果物を持つ");
      }
      continue;
    }
    for (const artifact of def.requiredArtifacts) {
      ctx.checkFile(`${input.base}/${artifact}`, "completed のステージは必須成果物を持つ");
    }
  }

  checkCompletedBoltArtifacts(ctx, input, doc);
}

function checkCompletedBoltArtifacts(ctx: LifecycleV2Context, input: LifecycleV2Input, doc: AidlcStateDocument): void {
  if (String(doc.phaseProgress["Construction"] ?? "") !== "Verified") return;
  const boltArtifacts = ["build-instructions.md", "unit-test-instructions.md", "build-and-test-summary.md", "build-test-results.md"];
  for (const ref of splitBoltRefs(doc.fields["Bolt Refs"])) {
    for (const artifact of boltArtifacts) {
      ctx.checkFile(`${input.base}/construction/bolts/${ref}/${artifact}`, "completed のステージは必須成果物を持つ");
    }
  }
}

// v2 契約検査（backward-compatibility.md に記載のない record 向け）。
// 必須成果物は stageCatalog のハードコードではなく、.agents/amadeus/amadeus-common/stages/<phase>/<stage>.md の
// frontmatter `produces:` から導出する。stage の phase/perUnit は既存 stageCatalog の分類をそのまま使う
// （scope 対応表は stage-catalog.md と一致させており、frontmatter 由来にする対象は produces のみ）。
function checkCompletedArtifactsV2(ctx: LifecycleV2Context, input: LifecycleV2Input, doc: AidlcStateDocument, scope: string): void {
  for (const stage of doc.stages) {
    if (checkboxStateName(stage.mark) !== "Completed") continue;
    const def = stageBySlug.get(stage.slug);
    if (!def || !def.scopes.includes(scope)) continue;

    const stageFilePath = `.agents/amadeus/amadeus-common/stages/${def.phase}/${stage.slug}.md`;
    const stageFileText = ctx.readOptional(stageFilePath);
    if (stageFileText === undefined) {
      ctx.failRow(stageFilePath, "v2 契約: stage 定義ファイルが存在する", "存在しない");
      continue;
    }
    const produces = extractFrontmatterStringList(stageFileText, "produces");
    if (produces === undefined) {
      ctx.failRow(stageFilePath, "v2 契約: stage 定義の produces を解析できる", "produces が欠落しているか解析できない");
      continue;
    }

    if (def.perUnit) {
      if (stage.unit === undefined) {
        ctx.failRow(
          `${input.base}/aidlc-state.md`,
          "v2 契約: per-unit ステージの completed 判定に Per unit 文脈がある",
          `stage ${stage.slug} が completed だが Per unit ブロックの文脈がない`,
        );
        continue;
      }
      for (const artifact of produces) {
        ctx.checkFile(
          `${input.base}/construction/${stage.unit}/${stage.slug}/${artifact}.md`,
          "v2 契約: completed のステージは produces 成果物を持つ",
        );
      }
      continue;
    }
    for (const artifact of produces) {
      ctx.checkFile(`${input.base}/${def.phase}/${stage.slug}/${artifact}.md`, "v2 契約: completed のステージは produces 成果物を持つ");
    }
  }
}

// verification/phase-check-<phase>.md（フェーズ境界検証）は、Phase Progress が Verified の phase について確認する。
// 上流の stage 定義が phase-check の作成を指示するのは ideation（approval-handoff）、
// inception（delivery-planning）、construction（ci-pipeline）の 3 phase だけである。
// Initialization と Operation には phase-check を書く stage が存在しないため検査しない。
const PHASE_CHECK_PHASES = new Set(["Ideation", "Inception", "Construction"]);

function checkPhaseCheckArtifactsV2(ctx: LifecycleV2Context, input: LifecycleV2Input, doc: AidlcStateDocument): void {
  for (const phase of AIDLC_PHASES) {
    if (!PHASE_CHECK_PHASES.has(String(phase))) continue;
    if (String(doc.phaseProgress[phase] ?? "") !== "Verified") continue;
    const slug = phase.toLowerCase();
    ctx.checkFile(`${input.base}/verification/phase-check-${slug}.md`, "v2 契約: Verified の phase は phase-check 成果物を持つ");
  }
}

// stage 定義ファイルの frontmatter から、`key:` の YAML 文字列配列を取り出す最小限のパーサ。
// `key: []`（空）と `key:\n  - item`（複数行リスト）の2形式だけを扱う
// （.agents/amadeus/amadeus-common/stages/**/*.md の `produces:` はこの2形式に限られる）。
// key が frontmatter に存在しない場合は undefined を返す（空リストと区別し、呼び出し側で契約異常として扱う）。
function extractFrontmatterStringList(text: string, key: string): string[] | undefined {
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch?.[1] ?? "";
  const lines = frontmatter.split("\n");
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (startIndex < 0) return undefined;

  const inline = lines[startIndex].slice(key.length + 1).trim();
  if (inline === "[]") return [];
  if (inline.length > 0) return undefined;

  const items: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*-\s+(.+?)\s*$/);
    if (!match || match[1].includes(":")) break;
    items.push(match[1].trim());
  }
  return items;
}
