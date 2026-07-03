#!/usr/bin/env bun

// 旧 `.amadeus/` workspace を v2 準拠の `aidlc/spaces/default/` へ一括移行する開発用スクリプト。
// 一回限りの移行に使う（Intent 20260703-aidlc-v2-full-compliance / Issue #387）。
//
// 使い方:
//   bun run dev-scripts/migrate-workspace-to-aidlc.ts <workspace> [--repo <name>] [--delete-old]
//
// 対応関係（Functional Design L4）:
//   steering.md + steering/**      → memory/（org.md、team.md、project.md）
//   glossary / domain-map / context-map / actors / external-systems / knowledge
//                                  → knowledge/
//   knowledge/codebase/<repo>/     → codekb/<repo>/
//   intents/<YYYYMMDD>-<slug>      → intents/<YYMMDD>-<slug>/（state.json → aidlc-state.md、audit 遡及記録、R005 改名）
//   active-intent / intents.md     → intents/ 配下（intents.json を新設し uuid v7 を採番）

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  AIDLC_PHASES,
  AIDLC_STAGE_SLUGS_BY_PHASE,
} from "../.agents/skills/amadeus-validator/validator/aidlc-state-contract";
import { stageCatalog } from "../.agents/skills/amadeus-validator/validator/lifecycle-v2";
import { buildIntentsIndex } from "../.agents/skills/amadeus-validator/scripts/IndexGenerate";

const stageNumbers: Record<string, string> = {
  "workspace-scaffold": "0.1",
  "workspace-detection": "0.2",
  "state-init": "0.3",
  "intent-capture": "1.1",
  "market-research": "1.2",
  feasibility: "1.3",
  "scope-definition": "1.4",
  "team-formation": "1.5",
  "rough-mockups": "1.6",
  "approval-handoff": "1.7",
  "reverse-engineering": "2.1",
  "practices-discovery": "2.2",
  "requirements-analysis": "2.3",
  "user-stories": "2.4",
  "refined-mockups": "2.5",
  "application-design": "2.6",
  "units-generation": "2.7",
  "delivery-planning": "2.8",
  "functional-design": "3.1",
  "nfr-requirements": "3.2",
  "nfr-design": "3.3",
  "infrastructure-design": "3.4",
  "code-generation": "3.5",
  "build-and-test": "3.6",
  "ci-pipeline": "3.7",
};

const artifactRenames: Array<{ dir: RegExp; from: string; to: string }> = [
  { dir: /inception\/units-generation$/, from: "units.md", to: "unit-of-work.md" },
  { dir: /inception\/units-generation$/, from: "unit-dependencies.md", to: "unit-of-work-dependency.md" },
  { dir: /inception\/units-generation$/, from: "unit-story-map.md", to: "unit-of-work-story-map.md" },
  { dir: /inception\/user-stories$/, from: "assessment.md", to: "user-stories-assessment.md" },
  { dir: /inception\/practices-discovery$/, from: "timestamp.md", to: "practices-discovery-timestamp.md" },
  { dir: /inception\/application-design$/, from: "design-decisions.md", to: "decisions.md" },
  { dir: /code-generation$/, from: "plan.md", to: "code-generation-plan.md" },
  { dir: /code-generation$/, from: "summary.md", to: "code-summary.md" },
  { dir: /construction\/bolts\/[^/]+$/, from: "summary.md", to: "build-and-test-summary.md" },
  { dir: /construction\/bolts\/[^/]+$/, from: "test-results.md", to: "build-test-results.md" },
];

const stateNameByOldState: Record<string, string> = {
  pending: "[ ]",
  active: "[-]",
  awaiting_approval: "[?]",
  revising: "[R]",
  completed: "[x]",
  skipped: "[S]",
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function toUtcIso(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function copyIfExists(from: string, to: string): void {
  if (!existsSync(from)) return;
  mkdirSync(join(to, ".."), { recursive: true });
  cpSync(from, to, { recursive: true });
}

function extractSections(text: string, keep: string[]): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let keeping = true;
  for (const line of lines) {
    const heading = line.match(/^## (.+)$/);
    if (heading) keeping = keep.includes((heading[1] ?? "").trim());
    if (keeping || line.startsWith("# ")) output.push(line);
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function sectionBody(text: string, heading: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

function demoteHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.startsWith("# ") ? `#${line}` : line))
    .join("\n");
}

// ---- memory/ の組み立て ----

function buildMemory(amadeusDir: string, spaceDir: string): void {
  const memory = join(spaceDir, "memory");
  mkdirSync(memory, { recursive: true });

  writeFileSync(
    join(memory, "org.md"),
    [
      "# 組織既定",
      "",
      "この文書は、Amadeus DLC の組織既定を扱う。",
      "team.md と project.md は、この既定を上書きできる。",
      "",
      "## 方針",
      "",
      "- 未確認",
      "",
      "## 禁止事項",
      "",
      "- 未確認",
      "",
      "## 判断基準",
      "",
      "- 未確認",
      "",
    ].join("\n"),
  );

  const policiesPath = join(amadeusDir, "steering/policies.md");
  const teamParts: string[] = [
    "# チームの働き方",
    "",
    "この文書は、チームの働き方を扱う。",
    "org.md の既定を上書きし、project.md に上書きされる。",
    "",
  ];
  if (existsSync(policiesPath)) {
    const policies = readText(policiesPath);
    for (const heading of ["方針", "禁止事項", "判断基準"]) {
      teamParts.push(`## ${heading}`, "", sectionBody(policies, heading) || "- 未確認", "");
    }
  }
  const policiesDir = join(amadeusDir, "steering/policies");
  if (existsSync(policiesDir)) {
    for (const entry of readdirSync(policiesDir).sort()) {
      if (!entry.endsWith(".md") || entry === "README.md") continue;
      teamParts.push(demoteHeadings(readText(join(policiesDir, entry))).trimEnd(), "");
    }
  }
  writeFileSync(join(memory, "team.md"), teamParts.join("\n"));

  writeFileSync(join(memory, "project.md"), buildProjectMemory(amadeusDir));

  // 自己開発手順などの method 系の独自文書は memory/ に残す。
  copyIfExists(join(amadeusDir, "development.md"), join(memory, "development.md"));
  copyIfExists(join(amadeusDir, "settings/templates"), join(memory, "templates"));
}

function buildProjectMemory(amadeusDir: string): string {
  const objective = existsSync(join(amadeusDir, "steering/objective.md")) ? readText(join(amadeusDir, "steering/objective.md")) : "";
  const product = existsSync(join(amadeusDir, "steering/product.md")) ? readText(join(amadeusDir, "steering/product.md")) : "";
  const tech = existsSync(join(amadeusDir, "steering/tech.md")) ? readText(join(amadeusDir, "steering/tech.md")) : "";
  const structure = existsSync(join(amadeusDir, "steering/structure.md")) ? readText(join(amadeusDir, "steering/structure.md")) : "";

  const parts: string[] = [
    "# プロジェクト",
    "",
    "この文書は、プロジェクト固有の目的、能力、技術、構造の判断材料を扱う。",
    "team.md の内容を上書きする。",
    "",
    "## 目的",
    "",
    sectionBody(objective, "一覧") || "- 未確認",
    "",
  ];
  const sectionSources: Array<{ source: string; headings: string[] }> = [
    { source: product, headings: ["コア能力", "主要ユースケース", "価値仮説"] },
    { source: tech, headings: ["アーキテクチャ", "主要技術", "開発標準", "開発環境", "主要技術判断"] },
    { source: structure, headings: ["編成方針", "ディレクトリパターン", "命名規約", "依存関係の整理", "コード構成原則"] },
  ];
  for (const { source, headings } of sectionSources) {
    for (const heading of headings) {
      parts.push(`## ${heading}`, "", sectionBody(source, heading) || "- 未確認", "");
    }
  }
  return parts.join("\n");
}

// ---- knowledge/ と codekb/ ----

function buildKnowledge(amadeusDir: string, spaceDir: string): void {
  const knowledge = join(spaceDir, "knowledge");
  mkdirSync(knowledge, { recursive: true });

  copyIfExists(join(amadeusDir, "glossary.md"), join(knowledge, "glossary.md"));
  copyIfExists(join(amadeusDir, "domain-map.md"), join(knowledge, "domain-map.md"));
  copyIfExists(join(amadeusDir, "context-map.md"), join(knowledge, "context-map.md"));
  copyIfExists(join(amadeusDir, "steering/actors.md"), join(knowledge, "actors.md"));
  copyIfExists(join(amadeusDir, "steering/external-systems.md"), join(knowledge, "external-systems.md"));
  copyIfExists(join(amadeusDir, "steering/knowledge.md"), join(knowledge, "background.md"));
  copyIfExists(join(amadeusDir, "event-storming"), join(knowledge, "event-storming"));

  const detailDir = join(amadeusDir, "steering/knowledge");
  if (existsSync(detailDir)) {
    for (const entry of readdirSync(detailDir).sort()) {
      if (entry === "README.md") continue;
      copyIfExists(join(detailDir, entry), join(knowledge, entry));
    }
  }

  copyIfExists(join(amadeusDir, "knowledge/codebase"), join(spaceDir, "codekb"));
}

// ---- record の移行 ----

type OldState = Record<string, any>;

function migrateIntents(amadeusDir: string, spaceDir: string, repo: string): void {
  const oldIntents = join(amadeusDir, "intents");
  const newIntents = join(spaceDir, "intents");
  mkdirSync(newIntents, { recursive: true });
  if (!existsSync(oldIntents)) {
    writeFileSync(join(newIntents, "intents.json"), "[]\n");
    return;
  }

  const registry: Array<Record<string, unknown>> = [];
  const dirNameMap = new Map<string, string>();

  for (const entry of readdirSync(oldIntents).sort()) {
    const oldDir = join(oldIntents, entry);
    if (!statSync(oldDir).isDirectory()) continue;
    const match = entry.match(/^\d{8}-(.+)$/);
    if (!match) fail(`旧 record 名が YYYYMMDD-<slug> 形式ではない: ${entry}`);
    const dirName = entry.slice(2);
    const slug = match[1] ?? "";
    dirNameMap.set(entry, dirName);

    const statePath = join(oldDir, "state.json");
    if (!existsSync(statePath)) fail(`state.json がない record は移行できない: ${entry}`);
    const state: OldState = JSON.parse(readText(statePath));

    migrateRecord(oldIntents, entry, newIntents, dirName, state);
    registry.push({
      uuid: mintUuidV7(),
      slug,
      dirName,
      scope: String(state.scope ?? "feature"),
      repos: [repo],
      status: String(state.status ?? "in_progress"),
    });
  }

  writeFileSync(join(newIntents, "intents.json"), JSON.stringify(registry, null, 2) + "\n");

  const cursor = join(amadeusDir, "active-intent");
  if (existsSync(cursor)) {
    const oldValue = readText(cursor).trim();
    const mapped = dirNameMap.get(oldValue);
    if (mapped) writeFileSync(join(newIntents, "active-intent"), `${mapped}\n`);
  }
}

function mintUuidV7(): string {
  const anyBun = Bun as unknown as { randomUUIDv7?: () => string };
  if (typeof anyBun.randomUUIDv7 === "function") return anyBun.randomUUIDv7();
  fail("Bun.randomUUIDv7 が利用できない。Bun を更新して再実行する");
}

function migrateRecord(oldIntents: string, oldName: string, newIntents: string, dirName: string, state: OldState): void {
  const oldModule = join(oldIntents, `${oldName}.md`);
  if (existsSync(oldModule)) {
    writeFileSync(join(newIntents, `${dirName}.md`), extractSections(readText(oldModule), ["概要", "依存", "目標プロファイル"]));
  }

  const recordDir = join(newIntents, dirName);
  cpSync(join(oldIntents, oldName), recordDir, { recursive: true });
  rmSync(join(recordDir, "state.json"), { force: true });
  applyArtifactRenames(recordDir);
  scaffoldRecord(recordDir);

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  writeFileSync(join(recordDir, "aidlc-state.md"), renderAidlcState(state, nowIso));
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  writeFileSync(join(recordDir, "audit/audit.md"), renderAudit(state, nowIso));
}

function applyArtifactRenames(recordDir: string): void {
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      const relDir = dir.replace(/\\/g, "/");
      for (const rename of artifactRenames) {
        if (entry === rename.from && rename.dir.test(relDir)) {
          cpSync(path, join(dir, rename.to));
          rmSync(path);
          break;
        }
      }
      if (entry === "questions.md") {
        const stage = basename(dir);
        if (Object.keys(stageNumbers).includes(stage)) {
          cpSync(path, join(dir, `${stage}-questions.md`));
          rmSync(path);
        }
      }
    }
  };
  walk(recordDir);
}

function scaffoldRecord(recordDir: string): void {
  for (const phase of AIDLC_PHASES) {
    const phaseDir = join(recordDir, phase.toLowerCase());
    for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE[phase] ?? []) {
      mkdirSync(join(phaseDir, slug), { recursive: true });
    }
  }
  mkdirSync(join(recordDir, "verification"), { recursive: true });
  mkdirSync(join(recordDir, "audit"), { recursive: true });
}

export function renderAidlcState(state: OldState, nowIso: string): string {
  const scope = String(state.scope ?? "feature");
  const inScope = stageCatalog.filter((stage) => stage.scopes.includes(scope));
  const startDate = earliestApproval(state) ?? nowIso;
  const boltRefs = Object.keys(state.bolts ?? {}).join(", ");
  const stageLines = renderStageProgress(state, scope);
  const completedCount = stageLines.filter((line) => line.startsWith("- [x]")).length;
  const status = String(state.status ?? "in_progress") === "completed" ? "Completed" : "Running";

  return [
    "# AI-DLC State Tracking",
    "",
    "## Project Information",
    `- **Project**: ${String(state.intentId ?? "unknown")}`,
    "- **Project Type**: Brownfield",
    `- **Scope**: ${scope}`,
    `- **Start Date**: ${startDate}`,
    "- **State Version**: 7",
    "- **Active Agent**: amadeus",
    "- **Worktree Path**: ",
    `- **Bolt Refs**: ${boltRefs}`,
    "- **Practices Affirmed Timestamp**: ",
    "",
    "## Scope Configuration",
    `- **Stages to Execute**: ${["0.1", "0.2", "0.3", ...inScope.map((stage) => stageNumbers[stage.slug])].join(", ")}`,
    `- **Stages to Skip**: all others (out of ${scope} scope)`,
    `- **Depth**: ${String(state.depth ?? "Standard")}`,
    "",
    "## Workspace State",
    "- **Project Root**: .",
    "- **Languages**: TypeScript",
    "- **Frameworks**: none",
    "- **Build System**: bun",
    "",
    "## Execution Plan Summary",
    `- **Total Stages**: ${3 + inScope.length}`,
    `- **Completed**: ${completedCount}`,
    `- **In Progress**: ${String(state.currentStage ?? "none")}`,
    "",
    "## Runtime State",
    "- **Revision Count**: 0",
    "",
    "## Phase Progress",
    "",
    ...renderPhaseProgress(state),
    "",
    "## Stage Progress",
    "",
    ...stageLines,
    "",
    "## Current Status",
    `- **Lifecycle Phase**: ${String(state.phase ?? "ideation").toUpperCase()}`,
    `- **Current Stage**: ${String(state.currentStage ?? "none")}`,
    `- **Next Stage**: ${nextStage(state, scope)}`,
    `- **Status**: ${status}`,
    `- **Construction Autonomy Mode**: ${autonomyMode(state)}`,
    `- **Last Updated**: ${nowIso}`,
    "",
    "## Session Resume Point",
    `- **Last Completed Stage**: ${lastCompletedStage(state)}`,
    `- **Next Action**: continue ${String(state.currentStage ?? "next stage")}`,
    "- **Pending Artifacts**: none",
    "",
  ].join("\n");
}

function earliestApproval(state: OldState): string | undefined {
  const timestamps: string[] = [];
  for (const entry of Object.values((state.stages ?? {}) as Record<string, any>)) {
    if (entry?.approval?.approvedAt) timestamps.push(String(entry.approval.approvedAt));
    for (const unit of Object.values((entry?.units ?? {}) as Record<string, any>)) {
      if (unit?.approval?.approvedAt) timestamps.push(String(unit.approval.approvedAt));
    }
  }
  timestamps.sort();
  return timestamps.length > 0 ? toUtcIso(timestamps[0], "") || undefined : undefined;
}

function autonomyMode(state: OldState): string {
  const value = String(state.autonomy ?? "");
  if (value === "continue_autonomously") return "autonomous";
  if (value === "gate_every_bolt") return "gated";
  return "unset";
}

function oldStageState(state: OldState, slug: string, unit?: string): string | undefined {
  const entry = (state.stages ?? {})[slug];
  if (!entry) return undefined;
  if (unit !== undefined && entry.units && typeof entry.units === "object") {
    const unitEntry = entry.units[unit];
    return unitEntry ? String(unitEntry.state ?? "pending") : undefined;
  }
  if (entry.units && typeof entry.units === "object") {
    const states = Object.values(entry.units as Record<string, any>).map((item) => String(item?.state ?? "pending"));
    if (states.length === 0) return "pending";
    if (states.every((item) => item === "completed")) return "completed";
    return states.includes("active") || states.includes("awaiting_approval") || states.includes("revising") ? "active" : "pending";
  }
  return String(entry.state ?? "pending");
}

function checkboxFor(state: OldState, scope: string, slug: string, unit?: string): string {
  const def = stageCatalog.find((stage) => stage.slug === slug);
  const inScope = def !== undefined && def.scopes.includes(scope);
  if (!inScope) return `- [S] ${slug} — SKIP: out of ${scope} scope`;
  const oldState = oldStageState(state, slug, unit);
  if (oldState === undefined) return `- [ ] ${slug} — EXECUTE`;
  const mark = stateNameByOldState[oldState] ?? "[ ]";
  if (mark === "[S]") return `- [S] ${slug} — SKIP: condition not met`;
  return `- ${mark} ${slug} — EXECUTE`;
}

function renderStageProgress(state: OldState, scope: string): string[] {
  const lines: string[] = [];
  lines.push("### INITIALIZATION PHASE");
  for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE["Initialization"] ?? []) {
    lines.push(`- [x] ${slug} — EXECUTE`);
  }
  lines.push("");
  for (const phase of ["Ideation", "Inception"]) {
    lines.push(`### ${phase.toUpperCase()} PHASE`);
    for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE[phase] ?? []) {
      lines.push(checkboxFor(state, scope, slug));
    }
    lines.push("");
  }
  lines.push("### CONSTRUCTION PHASE");
  for (const unit of constructionUnits(state)) {
    lines.push(`Per unit: ${unit}`);
    for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE["Construction"] ?? []) {
      lines.push(checkboxFor(state, scope, slug, unit));
    }
  }
  lines.push("");
  lines.push("### OPERATION PHASE");
  for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE["Operation"] ?? []) {
    lines.push(`- [S] ${slug} — SKIP: out of Amadeus scope`);
  }
  return lines;
}

function constructionUnits(state: OldState): string[] {
  const units = new Set<string>();
  for (const entry of Object.values((state.stages ?? {}) as Record<string, any>)) {
    for (const unit of Object.keys((entry?.units ?? {}) as Record<string, any>)) units.add(unit);
  }
  for (const bolt of Object.values((state.bolts ?? {}) as Record<string, any>)) {
    for (const unit of (bolt?.units ?? []) as string[]) units.add(unit);
  }
  return units.size > 0 ? [...units].sort() : ["implicit"];
}

function renderPhaseProgress(state: OldState): string[] {
  const phase = String(state.phase ?? "ideation");
  const status = String(state.status ?? "in_progress");
  const gates = (state.phaseGates ?? {}) as Record<string, any>;
  const progressFor = (name: string, key: string): string => {
    const gate = gates[key];
    if (gate?.skipped === true) return `- **${name}**: Skipped`;
    if (gate?.approvedAt) return `- **${name}**: Verified`;
    if (phase === key && status !== "completed") return `- **${name}**: Active`;
    if (status === "completed") return `- **${name}**: Verified`;
    return `- **${name}**: Pending`;
  };
  return [
    "- **Initialization**: Verified",
    progressFor("Ideation", "ideation"),
    progressFor("Inception", "inception"),
    progressFor("Construction", "construction"),
    status === "completed" ? "- **Operation**: Skipped" : "- **Operation**: Pending",
  ];
}

function nextStage(state: OldState, scope: string): string {
  const order = stageCatalog.filter((stage) => stage.scopes.includes(scope)).map((stage) => stage.slug);
  const current = String(state.currentStage ?? "");
  const index = order.indexOf(current);
  if (index === -1 || index + 1 >= order.length) return "none";
  return order[index + 1] ?? "none";
}

function lastCompletedStage(state: OldState): string {
  let last = "state-init";
  for (const [slug, entry] of Object.entries((state.stages ?? {}) as Record<string, any>)) {
    if (String(entry?.state ?? "") === "completed") last = slug;
    const units = Object.values((entry?.units ?? {}) as Record<string, any>);
    if (units.length > 0 && units.every((unit) => String(unit?.state ?? "") === "completed")) last = slug;
  }
  return last;
}

// ---- audit の遡及記録 ----

function auditEntry(event: string, timestamp: string, fields: Array<[string, string]>): string {
  return [
    `## ${event}`,
    `**Timestamp**: ${timestamp}`,
    `**Event**: ${event}`,
    ...fields.map(([key, value]) => `**${key}**: ${value}`),
    "",
    "---",
    "",
  ].join("\n");
}

export function renderAudit(state: OldState, nowIso: string): string {
  const scope = String(state.scope ?? "feature");
  const startDate = earliestApproval(state) ?? nowIso;
  const parts: string[] = ["# Audit Trail", ""];
  parts.push(auditEntry("WORKFLOW_STARTED", startDate, [["Scope", scope], ["Request", "migrated from state.json (Recovered=true)"]]));
  for (const slug of AIDLC_STAGE_SLUGS_BY_PHASE["Initialization"] ?? []) {
    parts.push(auditEntry("STAGE_COMPLETED", startDate, [["Stage", slug], ["Details", "backfilled by migration (Recovered=true)"]]));
  }
  parts.push(...phaseAuditEntries(state, nowIso));
  parts.push(...stageAuditEntries(state, nowIso));
  parts.push(...boltAuditEntries(state, nowIso));
  return parts.join("\n");
}

function phaseAuditEntries(state: OldState, nowIso: string): string[] {
  const parts: string[] = [];
  const gates = (state.phaseGates ?? {}) as Record<string, any>;
  const names: Record<string, string> = { ideation: "Ideation", inception: "Inception", construction: "Construction" };
  for (const [key, name] of Object.entries(names)) {
    const gate = gates[key];
    if (!gate) continue;
    if (gate.skipped === true) {
      parts.push(auditEntry("PHASE_SKIPPED", nowIso, [["Phase", name], ["Reason", "no stages in scope"]]));
      continue;
    }
    if (gate.approvedAt) {
      const fields: Array<[string, string]> = [["Phase boundary", name], ["Pass/fail", "pass"]];
      if (gate.reference) fields.push(["Details", String(gate.reference)]);
      parts.push(auditEntry("PHASE_VERIFIED", toUtcIso(String(gate.approvedAt), nowIso), fields));
    }
  }
  return parts;
}

function stageAuditEntries(state: OldState, nowIso: string): string[] {
  const parts: string[] = [];
  for (const [slug, entry] of Object.entries((state.stages ?? {}) as Record<string, any>)) {
    if (String(entry?.state ?? "") === "completed" && entry?.approval) {
      parts.push(stageCompletedEntry(slug, entry.approval, nowIso, undefined));
    }
    for (const [unit, unitEntry] of Object.entries((entry?.units ?? {}) as Record<string, any>)) {
      if (String(unitEntry?.state ?? "") === "completed" && unitEntry?.approval) {
        parts.push(stageCompletedEntry(slug, unitEntry.approval, nowIso, unit));
      }
    }
  }
  return parts;
}

function stageCompletedEntry(slug: string, approval: Record<string, any>, nowIso: string, unit: string | undefined): string {
  const details = [
    `via: ${String(approval.via ?? "conversation")}`,
    approval.reference ? `reference: ${String(approval.reference)}` : "",
    unit ? `unit: ${unit}` : "",
    "backfilled by migration (Recovered=true)",
  ]
    .filter(Boolean)
    .join(", ");
  return auditEntry("STAGE_COMPLETED", toUtcIso(String(approval.approvedAt ?? ""), nowIso), [
    ["Stage", slug],
    ["Details", details],
  ]);
}

function boltAuditEntries(state: OldState, nowIso: string): string[] {
  const parts: string[] = [];
  let first = true;
  for (const [boltId, entry] of Object.entries((state.bolts ?? {}) as Record<string, any>)) {
    parts.push(
      auditEntry("BOLT_STARTED", nowIso, [
        ["Bolt names", boltId],
        ["Batch number", "1"],
        ["Walking skeleton", first ? "true" : "false"],
        ["Details", "backfilled by migration (Recovered=true)"],
      ]),
    );
    if (String(entry?.state ?? "") === "completed" && entry?.gate?.reference) {
      parts.push(
        auditEntry("BOLT_COMPLETED", toUtcIso(String(entry.gate.approvedAt ?? ""), nowIso), [
          ["Bolt names", boltId],
          ["Batch number", "1"],
          ["Details", String(entry.gate.reference)],
        ]),
      );
    }
    first = false;
  }
  return parts;
}

// ---- main ----

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) fail("引数が不足しています: <workspace> [--repo <name>] [--delete-old]");
  const workspace = resolve(args[0] ?? "");
  const repoFlag = args.indexOf("--repo");
  const repo = repoFlag !== -1 ? (args[repoFlag + 1] ?? basename(workspace)) : basename(workspace);
  const deleteOld = args.includes("--delete-old");

  const amadeusDir = join(workspace, ".amadeus");
  if (!existsSync(amadeusDir)) fail(`対象 workspace に .amadeus/ が存在しません: ${amadeusDir}`);
  const spaceDir = join(workspace, "aidlc/spaces/default");
  if (existsSync(spaceDir)) fail(`移行先が既に存在します: ${spaceDir}`);

  buildMemory(amadeusDir, spaceDir);
  buildKnowledge(amadeusDir, spaceDir);
  migrateIntents(amadeusDir, spaceDir, repo);
  writeFileSync(join(spaceDir, "intents/intents.md"), buildIntentsIndex(workspace));

  if (deleteOld) rmSync(amadeusDir, { recursive: true, force: true });
  console.log(`migrate: ${spaceDir} へ移行しました${deleteOld ? "（旧 .amadeus/ は削除済み）" : ""}`);
}

if (import.meta.main) {
  main();
}
