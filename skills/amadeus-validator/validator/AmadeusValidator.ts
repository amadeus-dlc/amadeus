#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  ciName,
  implementationBranch,
  implementationPath,
  implementationRepository,
  implementationTargetId,
  pullRequestUrl,
} from "./domain/primitives";
import { type CheckResult } from "./domain/results";
import { checkConstructionPhase } from "./phases/construction";
import { checkInceptionPhase } from "./phases/inception";
import { type PhaseValidationContext } from "./phases/types";

type Result = "pass" | "warning" | "fail" | "blocked" | "skipped";

type Row = {
  target: string;
  condition: string;
  result: Result;
  evidence: string;
};

type Table = {
  headers: string[];
  rows: Record<string, string>[];
};

const statusValues = new Set(["not_started", "in_progress", "waiting_approval", "needs_changes", "completed", "skipped"]);
const gateValues = new Set(["not_ready", "waiting_approval", "passed", "failed"]);
const intentDirectoryPattern = /^\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const discoveryDirectoryPattern = /^\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const discoveryStatusValues = new Set(["in_progress", "completed"]);
const discoveryGateValues = new Set(["not_ready", "passed"]);
const discoveryDecisionValues = new Set([
  "single_intent",
  "multi_intent",
  "existing_intent_update",
  "research_only",
  "no_intent",
  "undecided",
]);
const discoveryCandidateStatusValues = new Set(["recommended", "waiting", "intent_record_created", "discarded"]);
const eventStormingDirectoryPattern = /^ES\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const eventStormingStatusValues = new Set(["draft", "reviewing", "ready", "superseded"]);
const eventStormingLevelValues = new Set(["big-picture", "process-modeling", "system-design"]);
const eventStormingScopeValues = new Set(["pre-intent", "intent-scoped"]);
const eventStormingNextSkillValues = new Set([
  "amadeus-discovery",
  "amadeus-ideation",
  "amadeus-inception",
  "amadeus-domain-modeling",
]);
const eventStormingTypeIdPrefixes = new Map([
  ["Actor", "ACT"],
  ["Command", "CMD"],
  ["Domain Event", "DEV"],
  ["Policy", "POL"],
  ["External System", "EXT"],
  ["Read Model", "RM"],
  ["Aggregate Candidate", "AGC"],
  ["Bounded Context Candidate", "BCC"],
]);
const eventStormingFlowTypes = new Set(["Actor", "Command", "Domain Event", "Policy", "External System", "Read Model"]);
const eventStormingBoardTypes = new Set([
  "Actor",
  "Command",
  "Domain Event",
  "Policy",
  "External System",
  "Read Model",
  "Aggregate Candidate",
  "Bounded Context Candidate",
]);
const eventStormingHotspotStatusValues = new Set(["open", "resolved", "accepted"]);
const eventStormingHandoffKinds = new Set(["Aggregate Candidate", "Bounded Context Candidate"]);
const ideationExecutionScopeValues = new Set(["enterprise", "feature", "mvp", "poc", "bugfix", "refactor", "infra", "security-patch", "workshop", "未確認"]);
const ideationDepthValues = new Set(["minimal", "standard", "comprehensive", "未確認"]);
const ideationVerificationStrategyValues = new Set(["minimal", "standard", "comprehensive", "未確認"]);
const ideationStateScopeControlKeys = new Set([
  "scope",
  "executionScope",
  "artifactDepth",
  "depth",
  "verificationStrategy",
  "testStrategy",
  "scopeControls",
  "scopeControlValues",
]);
const ideationTraceabilityScopeControlRows = ["対象境界", "実行制御", "成果物深度", "検証戦略"];
const inceptionTraceabilityScopeHeading = "対象境界からの追跡";
const inceptionTraceabilityScopeColumns = ["対象境界", "要求", "ユーザーストーリー", "ユースケース", "ユニット", "ボルト", "扱い"];
const implementationTargetColumns = ["識別子", "repository", "path", "branch", "PR", "CI"];
const implementationTargetUnavailableValues = new Set(["なし", "未確認"]);
const excludedScopeAllowedContext = ["対象外", "扱わない", "行わない", "しない", "広げない", "未確認", "別境界", "制約", "除外"];
const grillingSessionFilePattern = /^G\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const grillingSessionStatusValues = new Set(["active", "completed", "superseded"]);
const grillingDecisionStatusValues = new Set(["active", "superseded"]);
const unitDesignHeadings = [
  "概要",
  "設計戦略",
  "責務境界",
  "構成候補",
  "データと契約候補",
  "検証観点",
  "Bolt 分割方針",
  "Construction への引き継ぎ",
];
const dddModuleHeadings = ["目的", "責務", "概念関係", "ライフサイクル", "集約候補", "モデル要素", "関連成果物"];
const dddElementTableSpecs = [
  { heading: "集約", idPattern: /^DA\d{3}$/ },
  { heading: "エンティティ", idPattern: /^DE\d{3}$/ },
  { heading: "値オブジェクト", idPattern: /^DVO\d{3}$/ },
  { heading: "ドメインサービス", idPattern: /^DS\d{3}$/ },
  { heading: "ドメインイベント", idPattern: /^DEV\d{3}$/ },
  { heading: "リポジトリ", idPattern: /^DR\d{3}$/ },
  { heading: "ファクトリ", idPattern: /^DF\d{3}$/ },
];
const multiUnitBoltReasonHeading = "複数 Unit を扱う理由";

const indexSpecs: Record<string, { headings: string[]; listHeading: string; columns: string[]; idPattern: RegExp; targetColumn: string }> = {
  "user-stories.md": {
    headings: ["一覧", "依存関係"],
    listHeading: "一覧",
    columns: ["識別子", "アクター", "概要", "要求", "依存", "詳細"],
    idPattern: /^S\d{3}$/,
    targetColumn: "ユーザーストーリー",
  },
  "use-cases.md": {
    headings: ["一覧", "依存関係"],
    listHeading: "一覧",
    columns: ["識別子", "アクター", "外部システム", "ストーリー", "要求", "依存", "詳細"],
    idPattern: /^UC\d{3}$/,
    targetColumn: "ユースケース",
  },
  "units.md": {
    headings: ["一覧", "依存関係"],
    listHeading: "一覧",
    columns: ["識別子", "概要", "要求", "コンテキスト", "依存", "詳細"],
    idPattern: /^U\d{3}$/,
    targetColumn: "ユニット",
  },
  "bolts.md": {
    headings: ["一覧", "依存関係"],
    listHeading: "一覧",
    columns: ["識別子", "概要", "ユニット", "設計", "依存", "詳細"],
    idPattern: /^B\d{3}$/,
    targetColumn: "ボルト",
  },
  "decisions.md": {
    headings: ["一覧", "依存関係"],
    listHeading: "一覧",
    columns: ["識別子", "概要", "状態", "依存", "詳細"],
    idPattern: /^D\d{3}$/,
    targetColumn: "判断",
  },
};

class AmadeusValidator {
  private readonly root: string;
  private readonly intentId?: string;
  private readonly rows: Row[] = [];
  private readonly checkedFiles = new Set<string>();
  private readonly knownIds = new Map<string, Set<string>>();

  constructor(root: string, intentId?: string) {
    this.root = resolve(root);
    this.intentId = this.blank(intentId) ? undefined : intentId;
  }

  run(): string {
    try {
      this.checkWorkspace();
      if (!this.failed()) {
        this.checkFile(".amadeus/README.md", "必須ファイルが存在する");
        this.checkSteeringLayer();
        this.checkGlobalIndexes();
        if (this.intentId) {
          this.checkIntentIndexes(this.intentId);
        } else {
          this.pass(".amadeus/intents.md", "対象 Intent ディレクトリ名", "指定なし。全体成果物だけを検証");
        }
      }
    } catch (error) {
      this.blocked("実行環境", "検証対象を読める", (error as Error).message);
    }

    return this.report();
  }

  private checkWorkspace(): void {
    if (this.isDirectory(this.root)) {
      this.pass(this.root, "検証対象の作業ディレクトリが存在する", "存在を確認");
    } else {
      this.failRow(this.root, "検証対象の作業ディレクトリが存在する", "存在しない");
      return;
    }

    this.checkFile(".amadeus", "Amadeus の成果物ルートが存在する", true);
  }

  private checkSteeringLayer(): void {
    this.checkFile(".amadeus/steering.md", "steering 入口が存在する");
    this.checkHeadings(".amadeus/steering.md", ["役割", "対象成果物", "読む順序", "Intent Layer へ進む基準", "責務境界"]);

    this.checkFile(".amadeus/steering", "steering 詳細ディレクトリが存在する", true);
    this.checkFile(".amadeus/steering/objective.md", "steering の目的一覧が存在する");
    this.checkHeadings(".amadeus/steering/objective.md", ["一覧"]);
    this.checkFile(".amadeus/steering/product.md", "steering のプロダクト概要が存在する");
    this.checkHeadings(".amadeus/steering/product.md", ["コア能力", "主要ユースケース", "価値仮説"]);
    this.checkFile(".amadeus/steering/tech.md", "steering の技術スタックが存在する");
    this.checkHeadings(".amadeus/steering/tech.md", ["アーキテクチャ", "主要技術", "開発標準", "開発環境", "主要技術判断"]);
    this.checkFile(".amadeus/steering/structure.md", "steering のプロジェクト構造が存在する");
    this.checkHeadings(".amadeus/steering/structure.md", ["編成方針", "ディレクトリパターン", "命名規約", "依存関係の整理", "コード構成原則"]);
    this.checkFile(".amadeus/steering/actors.md", "steering のアクター一覧が存在する");
    this.checkHeadings(".amadeus/steering/actors.md", ["一覧"]);
    this.checkFile(".amadeus/steering/external-systems.md", "steering の外部システム一覧が存在する");
    this.checkHeadings(".amadeus/steering/external-systems.md", ["一覧"]);
    this.checkFile(".amadeus/steering/knowledge.md", "steering のナレッジ索引が存在する");
    this.checkHeadings(".amadeus/steering/knowledge.md", ["背景", "前提", "未確認事項"]);
    this.checkFile(".amadeus/steering/knowledge", "steering のナレッジ詳細ディレクトリが存在する", true);
    this.checkFile(".amadeus/steering/knowledge/README.md", "steering のナレッジ詳細入口が存在する");
    this.checkHeadings(".amadeus/steering/knowledge/README.md", ["役割", "記録方針"]);
    this.checkFile(".amadeus/steering/policies.md", "steering のポリシー索引が存在する");
    this.checkHeadings(".amadeus/steering/policies.md", ["方針", "禁止事項", "判断基準"]);
    this.checkFile(".amadeus/steering/policies", "steering のポリシー詳細ディレクトリが存在する", true);
    this.checkFile(".amadeus/steering/policies/README.md", "steering のポリシー詳細入口が存在する");
    this.checkHeadings(".amadeus/steering/policies/README.md", ["役割", "記録方針"]);
  }

  private checkGlobalIndexes(): void {
    this.checkDiscoveries();
    this.checkEventStormingSessions(".amadeus/event-storming", "pre-intent");
    this.checkIntents();
    this.checkSubdomains(".amadeus/domain/subdomains.md", ".amadeus/domain/bounded-contexts.md");
    this.checkBoundedContexts(".amadeus/domain/bounded-contexts.md", true);
    this.checkGrillings(".amadeus/domain");
  }

  private checkDiscoveries(): void {
    const path = ".amadeus/discoveries.md";
    this.checkFile(path, "Discovery 一覧が存在する");
    this.checkHeadings(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["識別子", "テーマ", "状態", "判定", "推奨次アクション", "詳細"]);
    if (!table) return;

    const ids = this.collectIds(path, table, "識別子", discoveryDirectoryPattern);
    this.checkNotBlank(path, table, "テーマ");
    this.checkNotBlank(path, table, "推奨次アクション");
    this.checkDetailLinks(path, table, "詳細");
    this.checkDiscoveryDetailLinks(path, table, ids);

    for (const row of table.rows) {
      const id = String(row["識別子"] ?? "").trim();
      if (!ids.has(id)) continue;
      this.checkDiscovery(id, row);
    }

    const discoveriesRoot = this.absolute(".amadeus/discoveries");
    if (!this.isDirectory(discoveriesRoot)) return;
    const glob = new Bun.Glob("*/state.json");
    const indexed = new Set(ids);
    for (const statePath of glob.scanSync({ cwd: discoveriesRoot })) {
      const id = statePath.split("/", 1)[0];
      if (indexed.has(id)) this.pass(path, "Discovery のモジュールディレクトリが一覧に登録されている", id);
      else this.failRow(path, "Discovery のモジュールディレクトリが一覧に登録されている", id);
    }
  }

  private checkDiscoveryDetailLinks(path: string, table: Table, ids: Set<string>): void {
    if (!table.headers.includes("詳細")) return;
    for (const row of table.rows) {
      const id = String(row["識別子"] ?? "").trim();
      const links = this.markdownLinks(String(row["詳細"] ?? ""));
      if (links.length === 0) continue;
      for (const target of links) {
        const clean = this.cleanLinkTarget(target);
        const match = clean.match(/^discoveries\/([^/]+)\.md$/);
        if (!match) {
          this.failRow(path, "`詳細` が discoveries/<discovery-id>.md を指す", target);
          continue;
        }
        const discoveryId = match[1];
        if (discoveryId === id) this.pass(path, "`詳細` の Discovery ID が識別子と一致する", discoveryId);
        else this.failRow(path, "`詳細` の Discovery ID が識別子と一致する", `${discoveryId} != ${id}`);
        if (ids.has(discoveryId)) this.pass(path, "`詳細` の Discovery ID が一覧内に存在する", discoveryId);
        else this.failRow(path, "`詳細` の Discovery ID が一覧内に存在する", discoveryId);
      }
    }
  }

  private checkEventStormingSessions(rootPath: string, expectedScope: "pre-intent" | "intent-scoped", intentId?: string): void {
    const root = this.absolute(rootPath);
    if (!this.isDirectory(root)) {
      this.skipped(rootPath, "Event Storming 成果物は任意である", "ディレクトリなし");
      return;
    }

    const entries = readdirSync(root).sort();
    const directories = new Set(entries.filter((entry) => this.isDirectory(join(root, entry))));
    const summaryFiles = new Set(
      entries
        .filter((entry) => entry.endsWith(".md"))
        .map((entry) => entry.slice(0, -3))
        .filter((id) => eventStormingDirectoryPattern.test(id)),
    );
    const ids = [...new Set([...directories, ...summaryFiles])].sort();
    for (const id of ids) {
      const base = `${rootPath}/${id}`;
      if (eventStormingDirectoryPattern.test(id)) {
        this.pass(base, "Event Storming ディレクトリ名が ESnnn-<slug> 形式である", id);
      } else {
        this.failRow(base, "Event Storming ディレクトリ名が ESnnn-<slug> 形式である", id);
      }
      this.checkFile(base, "Event Storming セッションディレクトリが存在する", true);
      if (!directories.has(id)) continue;
      this.checkEventStormingSession(base, id, expectedScope, intentId);
    }

    if (ids.length > 0) this.pass(rootPath, "Event Storming セッションが検証対象である", `${ids.length}件`);
    else this.skipped(rootPath, "Event Storming 成果物は任意である", "セッションディレクトリなし");
  }

  private checkEventStormingSession(base: string, id: string, expectedScope: "pre-intent" | "intent-scoped", intentId?: string): void {
    this.checkGrillings(base);

    const statePath = `${base}/state.json`;
    this.checkFile(statePath, "Event Storming 状態ファイルが存在する");
    const state = this.intentState(statePath);
    if (!state) return;

    this.checkJsonValue(statePath, "schemaVersion", state.schemaVersion, "1");
    this.checkJsonValue(statePath, "id", state.id, id);
    this.checkJsonValue(statePath, "phase", state.phase, "event-storming");
    this.checkAllowed(statePath, "status", state.status, eventStormingStatusValues);
    this.checkAllowed(statePath, "currentLevel", state.currentLevel, eventStormingLevelValues);
    this.checkAllowed(statePath, "scope", state.scope, eventStormingScopeValues);
    this.checkJsonValue(statePath, "scope", state.scope, expectedScope);
    this.checkAllowed(statePath, "nextRecommendedSkill", state.nextRecommendedSkill, eventStormingNextSkillValues);
    this.checkEventStormingCompletedLevels(statePath, state);
    this.checkEventStormingNextRecommendedSkill(statePath, state);

    if (expectedScope === "intent-scoped") {
      this.checkJsonValue(statePath, "relatedIntent", state.relatedIntent, intentId ?? "");
    } else {
      this.checkJsonValue(statePath, "relatedIntent", state.relatedIntent, "");
    }

    const level = String(state.currentLevel ?? "").trim();
    const requiresProcessModeling = this.eventStormingRequiresProcessModeling(level, state);
    const requiresSystemDesign = this.eventStormingRequiresSystemDesign(level, state);
    const allowUnknownReferences = String(state.status ?? "").trim() !== "ready";
    const bigPictureReady = this.eventStormingLevelReady(state, "big-picture");
    const processModelingReady = this.eventStormingLevelReady(state, "process-modeling");
    const systemDesignReady = this.eventStormingLevelReady(state, "system-design");
    const summaryPath = `${dirname(base)}/${id}.md`;
    this.checkEventStormingSummary(summaryPath, systemDesignReady);
    const eventIds = this.checkEventStormingEvents(`${base}/events.md`, bigPictureReady);
    const boardIds = this.checkEventStormingBoard(`${base}/board.md`, eventIds, allowUnknownReferences);

    let flowIds = new Set<string>();
    if (requiresProcessModeling) {
      flowIds = this.checkEventStormingFlow(`${base}/flow.md`, eventIds, allowUnknownReferences);
      if (processModelingReady) this.checkEventStormingProcessBoard(`${base}/board.md`, flowIds);
    }
    this.checkEventStormingHotspots(`${base}/hotspots.md`, new Set([...boardIds, ...flowIds]), allowUnknownReferences);
    if (requiresSystemDesign) {
      const aggregateIds = this.checkEventStormingAggregateCandidates(`${base}/aggregate-candidates.md`, eventIds, systemDesignReady, allowUnknownReferences);
      const boundedContextIds = this.checkEventStormingBoundedContextCandidates(
        `${base}/bounded-context-candidates.md`,
        eventIds,
        aggregateIds,
        systemDesignReady,
        allowUnknownReferences,
      );
      this.checkEventStormingSystemDesignBoard(`${base}/board.md`, aggregateIds, boundedContextIds);
      if (systemDesignReady) this.checkEventStormingSystemDesignHandoff(summaryPath, aggregateIds, boundedContextIds);
    }
  }

  private checkEventStormingCompletedLevels(path: string, state: Record<string, any>): void {
    const values = state.completedLevels;
    if (!Array.isArray(values)) {
      this.failRow(path, "`completedLevels` が配列である", this.typeName(values));
      return;
    }
    this.pass(path, "`completedLevels` が配列である", `${values.length}件`);
    const levels = values.map((value: unknown) => String(value ?? "").trim());
    const seen = new Set<string>();
    for (const level of levels) {
      this.checkAllowed(path, "completedLevels", level, eventStormingLevelValues);
      if (seen.has(level)) this.failRow(path, "`completedLevels` が重複しない", level);
      else {
        this.pass(path, "`completedLevels` が重複しない", level);
        seen.add(level);
      }
    }
    if (seen.has("process-modeling") && seen.has("big-picture")) {
      this.pass(path, "`process-modeling` 完了は `big-picture` 完了を前提にする", "big-picture");
    } else if (seen.has("process-modeling")) {
      this.failRow(path, "`process-modeling` 完了は `big-picture` 完了を前提にする", "big-picture がない");
    }
    if (seen.has("system-design") && seen.has("process-modeling")) {
      this.pass(path, "`system-design` 完了は `process-modeling` 完了を前提にする", "process-modeling");
    } else if (seen.has("system-design")) {
      this.failRow(path, "`system-design` 完了は `process-modeling` 完了を前提にする", "process-modeling がない");
    }
  }

  private checkEventStormingNextRecommendedSkill(path: string, state: Record<string, any>): void {
    const scope = String(state.scope ?? "").trim();
    const level = this.eventStormingEffectiveLevel(state);
    const next = String(state.nextRecommendedSkill ?? "").trim();
    const allowed = this.eventStormingNextSkillsFor(scope, level);
    if (allowed.has(next)) {
      this.pass(path, "`nextRecommendedSkill` が scope と level に対応する", `${scope}/${level}: ${next}`);
    } else {
      this.failRow(path, "`nextRecommendedSkill` が scope と level に対応する", `${scope}/${level}: ${next}`);
    }
  }

  private eventStormingNextSkillsFor(scope: string, level: string): Set<string> {
    if (scope === "pre-intent" && level === "big-picture") return new Set(["amadeus-discovery"]);
    if (scope === "pre-intent" && level === "process-modeling") return new Set(["amadeus-discovery", "amadeus-ideation"]);
    if (scope === "pre-intent" && level === "system-design") return new Set(["amadeus-domain-modeling"]);
    if (scope === "intent-scoped" && (level === "big-picture" || level === "process-modeling")) return new Set(["amadeus-inception"]);
    if (scope === "intent-scoped" && level === "system-design") return new Set(["amadeus-domain-modeling"]);
    return new Set();
  }

  private eventStormingEffectiveLevel(state: Record<string, any>): string {
    const currentLevel = String(state.currentLevel ?? "").trim();
    const completedLevels = new Set(this.eventStormingCompletedLevels(state));
    if (currentLevel === "system-design" || completedLevels.has("system-design")) return "system-design";
    if (currentLevel === "process-modeling" || completedLevels.has("process-modeling")) return "process-modeling";
    return currentLevel;
  }

  private eventStormingRequiresProcessModeling(level: string, state: Record<string, any>): boolean {
    return level === "process-modeling" ||
      level === "system-design" ||
      this.eventStormingCompletedLevels(state).some((value) => value === "process-modeling" || value === "system-design");
  }

  private eventStormingRequiresSystemDesign(level: string, state: Record<string, any>): boolean {
    return level === "system-design" || this.eventStormingCompletedLevels(state).includes("system-design");
  }

  private eventStormingCompletedLevels(state: Record<string, any>): string[] {
    return Array.isArray(state.completedLevels) ? state.completedLevels.map((value: unknown) => String(value ?? "").trim()) : [];
  }

  private eventStormingLevelReady(state: Record<string, any>, level: string): boolean {
    if (String(state.status ?? "").trim() !== "ready") return false;
    return String(state.currentLevel ?? "").trim() === level || this.eventStormingCompletedLevels(state).includes(level);
  }

  private checkEventStormingSummary(path: string, systemDesignReady: boolean): void {
    this.checkFile(path, "Event Storming のモジュールファイルが存在する");
    const headings = ["Purpose", "Scope", "Related Discovery", "Related Intent", "Level Status", "Next Skill", "Supersession"];
    this.checkHeadings(path, headings);
    this.checkHeadingBodies(path, headings);
    this.checkTable(path, "Level Status", ["Level", "Status", "Evidence"]);
    if (systemDesignReady) this.checkHeadings(path, ["Handoff To Domain Modeling"]);
  }

  private checkEventStormingEvents(path: string, bigPictureReady: boolean): Set<string> {
    this.checkFile(path, "Event Storming events.md が存在する");
    this.checkHeadings(path, ["一覧"]);
    this.checkHeadingBodies(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["ID", "Domain Event", "Description", "Source", "Excluded Similar Events"]);
    if (!table) return new Set();
    if (bigPictureReady) this.checkTableHasRows(path, table, "big-picture ready の Domain Event が1件以上ある");
    const ids = this.collectIds(path, table, "ID", /^DEV\d{3}$/);
    this.checkNotBlank(path, table, "Domain Event");
    this.checkNotBlank(path, table, "Description");
    this.checkNotBlank(path, table, "Source");
    return ids;
  }

  private checkEventStormingFlow(path: string, eventIds: Set<string>, allowUnknownReferences: boolean): Set<string> {
    this.checkFile(path, "Event Storming flow.md が存在する");
    this.checkHeadings(path, ["Flow"]);
    this.checkHeadingBodies(path, ["Flow"]);
    const table = this.checkTable(path, "Flow", ["ID", "Type", "Label", "Trigger", "Produces", "Related", "Note"]);
    if (!table) return new Set();
    this.checkEventStormingElementIds(path, table, "ID");
    this.checkEventStormingTypes(path, table, "Type", eventStormingFlowTypes);
    this.checkEventStormingTypeIdPrefixes(path, table);
    this.checkNotBlank(path, table, "Label");
    this.checkEventStormingFlowContainsEvents(path, table, eventIds);
    this.checkEventStormingReferences(path, table, ["Trigger", "Produces", "Related"], eventIds, allowUnknownReferences);
    return this.idsFor(path);
  }

  private checkEventStormingBoard(path: string, eventIds: Set<string>, allowUnknownReferences: boolean): Set<string> {
    this.checkFile(path, "Event Storming board.md が存在する");
    this.checkHeadings(path, ["Board"]);
    this.checkHeadingBodies(path, ["Board"]);
    const table = this.checkTable(path, "Board", ["Order", "Type", "ID", "Label", "Related", "Note"]);
    if (!table) return new Set();
    this.checkEventStormingElementIds(path, table, "ID");
    this.checkEventStormingTypes(path, table, "Type", eventStormingBoardTypes);
    this.checkEventStormingTypeIdPrefixes(path, table);
    this.checkEventStormingBoardOrder(path, table);
    this.checkNotBlank(path, table, "Label");
    const boardEventIds = new Set(table.rows.filter((row) => String(row["Type"] ?? "").trim() === "Domain Event").map((row) => String(row["ID"] ?? "").trim()));
    for (const eventId of eventIds) {
      if (boardEventIds.has(eventId)) this.pass(path, "`board.md` が Domain Event を含む", eventId);
      else this.failRow(path, "`board.md` が Domain Event を含む", eventId);
    }
    this.checkEventStormingReferences(path, table, ["Related"], eventIds, allowUnknownReferences);
    return this.idsFor(path);
  }

  private checkEventStormingAggregateCandidates(
    path: string,
    eventIds: Set<string>,
    systemDesignReady: boolean,
    allowUnknownReferences: boolean,
  ): Set<string> {
    this.checkFile(path, "Event Storming aggregate-candidates.md が存在する");
    this.checkHeadings(path, ["一覧"]);
    this.checkHeadingBodies(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["ID", "Candidate", "Rationale", "Related Domain Events", "Consistency Clues", "Open Questions"]);
    if (!table) return new Set();
    if (systemDesignReady) this.checkTableHasRows(path, table, "system-design ready の Aggregate Candidate が1件以上ある");
    const ids = this.collectIds(path, table, "ID", /^AGC\d{3}$/);
    this.checkNotBlank(path, table, "Candidate");
    this.checkNotBlank(path, table, "Rationale");
    this.checkEventStormingExplicitReferences(path, table, "Related Domain Events", eventIds, "Domain Event", allowUnknownReferences);
    return ids;
  }

  private checkEventStormingBoundedContextCandidates(
    path: string,
    eventIds: Set<string>,
    aggregateIds: Set<string>,
    systemDesignReady: boolean,
    allowUnknownReferences: boolean,
  ): Set<string> {
    this.checkFile(path, "Event Storming bounded-context-candidates.md が存在する");
    this.checkHeadings(path, ["一覧"]);
    this.checkHeadingBodies(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", [
      "ID",
      "Candidate",
      "Rationale",
      "Related Domain Events",
      "Related Aggregate Candidates",
      "Open Questions",
    ]);
    if (!table) return new Set();
    if (systemDesignReady) this.checkTableHasRows(path, table, "system-design ready の Bounded Context Candidate が1件以上ある");
    const ids = this.collectIds(path, table, "ID", /^BCC\d{3}$/);
    this.checkNotBlank(path, table, "Candidate");
    this.checkNotBlank(path, table, "Rationale");
    this.checkEventStormingExplicitReferences(path, table, "Related Domain Events", eventIds, "Domain Event", allowUnknownReferences);
    this.checkEventStormingExplicitReferences(path, table, "Related Aggregate Candidates", aggregateIds, "Aggregate Candidate", allowUnknownReferences);
    return ids;
  }

  private checkEventStormingProcessBoard(path: string, flowIds: Set<string>): void {
    const boardIds = this.idsFor(path);
    for (const flowId of flowIds) {
      if (boardIds.has(flowId)) this.pass(path, "`board.md` が process-modeling の要素を含む", flowId);
      else this.failRow(path, "`board.md` が process-modeling の要素を含む", flowId);
    }
  }

  private checkEventStormingSystemDesignBoard(path: string, aggregateIds: Set<string>, boundedContextIds: Set<string>): void {
    const table = this.tableAfterHeading(path, "Board");
    if (!table) return;
    const boardAggregateIds = new Set(
      table.rows.filter((row) => String(row["Type"] ?? "").trim() === "Aggregate Candidate").map((row) => String(row["ID"] ?? "").trim()),
    );
    for (const aggregateId of aggregateIds) {
      if (boardAggregateIds.has(aggregateId)) this.pass(path, "`board.md` が system-design の Aggregate Candidate を含む", aggregateId);
      else this.failRow(path, "`board.md` が system-design の Aggregate Candidate を含む", aggregateId);
    }
    const boardBoundedContextIds = new Set(
      table.rows.filter((row) => String(row["Type"] ?? "").trim() === "Bounded Context Candidate").map((row) => String(row["ID"] ?? "").trim()),
    );
    for (const boundedContextId of boundedContextIds) {
      if (boardBoundedContextIds.has(boundedContextId)) {
        this.pass(path, "`board.md` が system-design の Bounded Context Candidate を含む", boundedContextId);
      } else {
        this.failRow(path, "`board.md` が system-design の Bounded Context Candidate を含む", boundedContextId);
      }
    }
  }

  private checkEventStormingSystemDesignHandoff(path: string, aggregateIds: Set<string>, boundedContextIds: Set<string>): void {
    this.checkHeadings(path, ["Handoff To Domain Modeling"]);
    this.checkHeadingBodies(path, ["Handoff To Domain Modeling"]);
    const table = this.checkTable(path, "Handoff To Domain Modeling", ["Candidate", "Kind", "Evidence", "Open Questions"]);
    if (!table) return;
    this.checkTableHasRows(path, table, "system-design ready の Handoff が1件以上ある");
    for (const row of table.rows) {
      const kind = String(row["Kind"] ?? "").trim();
      const candidate = String(row["Candidate"] ?? "").trim();
      this.checkAllowed(path, "Kind", kind, eventStormingHandoffKinds);
      const ids = kind === "Aggregate Candidate" ? aggregateIds : kind === "Bounded Context Candidate" ? boundedContextIds : new Set<string>();
      if (ids.has(candidate)) this.pass(path, "`Candidate` が system-design 候補 ID である", candidate);
      else this.failRow(path, "`Candidate` が system-design 候補 ID である", candidate);
    }
  }

  private checkEventStormingHotspots(path: string, elementIds: Set<string>, allowUnknownReferences: boolean): void {
    this.checkFile(path, "Event Storming hotspots.md が存在する");
    this.checkHeadings(path, ["一覧"]);
    this.checkHeadingBodies(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["ID", "Type", "Summary", "Source", "Status", "Related", "Next Action"]);
    if (!table) return;
    this.collectIds(path, table, "ID", /^HOT\d{3}$/);
    this.checkNotBlank(path, table, "Type");
    this.checkNotBlank(path, table, "Summary");
    this.checkNotBlank(path, table, "Source");
    this.checkNotBlank(path, table, "Next Action");
    this.checkEventStormingExplicitReferences(path, table, "Related", elementIds, "Event Storming 要素", allowUnknownReferences);
    for (const row of table.rows) this.checkAllowed(path, "Status", row["Status"], eventStormingHotspotStatusValues);
  }

  private checkEventStormingElementIds(path: string, table: Table, column: string): void {
    const ids = new Set<string>();
    for (const row of table.rows) {
      const id = String(row[column] ?? "").trim();
      if (this.eventStormingElementIdPattern(id)) this.pass(path, `${column} が Event Storming 要素 ID 形式に合う`, id);
      else this.failRow(path, `${column} が Event Storming 要素 ID 形式に合う`, id);
      if (ids.has(id)) this.failRow(path, `${column} が重複しない`, id);
      else {
        this.pass(path, `${column} が重複しない`, id);
        ids.add(id);
      }
    }
    this.knownIds.set(path, ids);
  }

  private eventStormingElementIdPattern(id: string): boolean {
    return /^(DEV|CMD|ACT|POL|EXT|RM|AGC|BCC)\d{3}$/.test(id);
  }

  private checkEventStormingTypes(path: string, table: Table, column: string, allowed: Set<string>): void {
    for (const row of table.rows) this.checkAllowed(path, column, row[column], allowed);
  }

  private checkEventStormingTypeIdPrefixes(path: string, table: Table): void {
    if (!table.headers.includes("Type") || !table.headers.includes("ID")) return;
    for (const row of table.rows) {
      const type = String(row["Type"] ?? "").trim();
      const id = String(row["ID"] ?? "").trim();
      const prefix = eventStormingTypeIdPrefixes.get(type);
      if (!prefix) continue;
      if (id.startsWith(prefix)) this.pass(path, "`Type` と `ID` 接頭辞が対応する", `${type}: ${id}`);
      else this.failRow(path, "`Type` と `ID` 接頭辞が対応する", `${type}: ${id}`);
    }
  }

  private checkTableHasRows(path: string, table: Table, description: string): void {
    if (table.rows.length > 0) this.pass(path, description, `${table.rows.length}件`);
    else this.failRow(path, description, "0件");
  }

  private checkEventStormingFlowContainsEvents(path: string, table: Table, eventIds: Set<string>): void {
    const flowEventIds = new Set(
      table.rows.filter((row) => String(row["Type"] ?? "").trim() === "Domain Event").map((row) => String(row["ID"] ?? "").trim()),
    );
    for (const eventId of eventIds) {
      if (flowEventIds.has(eventId)) this.pass(path, "`flow.md` が Domain Event を含む", eventId);
      else this.failRow(path, "`flow.md` が Domain Event を含む", eventId);
    }
  }

  private checkEventStormingBoardOrder(path: string, table: Table): void {
    if (!table.headers.includes("Order")) return;
    const orders = new Set<number>();
    for (const row of table.rows) {
      const value = String(row["Order"] ?? "").trim();
      const order = Number(value);
      if (Number.isInteger(order) && order > 0) {
        this.pass(path, "`Order` が正の整数である", value);
      } else {
        this.failRow(path, "`Order` が正の整数である", value);
        continue;
      }
      if (orders.has(order)) this.failRow(path, "`Order` が重複しない", value);
      else {
        this.pass(path, "`Order` が重複しない", value);
        orders.add(order);
      }
    }
  }

  private checkEventStormingReferences(path: string, table: Table, columns: string[], eventIds: Set<string>, allowUnknownReferences: boolean): void {
    const localIds = this.idsFor(path);
    const ids = new Set([...localIds, ...eventIds]);
    for (const column of columns) {
      if (!table.headers.includes(column)) continue;
      this.checkEventStormingExplicitReferences(path, table, column, ids, "Event Storming 要素", allowUnknownReferences);
    }
  }

  private checkEventStormingExplicitReferences(
    path: string,
    table: Table,
    column: string,
    ids: Set<string>,
    label: string,
    allowUnknownReferences = false,
  ): void {
    if (!table.headers.includes(column)) return;
    const condition = allowUnknownReferences
      ? `\`${column}\` が ${label} ID、なし、または未確認である`
      : `\`${column}\` が ${label} ID またはなしである`;
    for (const row of table.rows) {
      for (const reference of this.splitValues(row[column])) {
        if (reference === "" || reference === "なし" || (allowUnknownReferences && reference === "未確認")) {
          this.pass(path, condition, reference);
        } else if (ids.has(reference)) {
          this.pass(path, condition, reference);
        } else {
          this.failRow(path, condition, reference);
        }
      }
    }
  }

  private checkDiscovery(id: string, row: Record<string, string>): void {
    const base = `.amadeus/discoveries/${id}`;
    this.checkGrillings(base);

    const briefPath = `.amadeus/discoveries/${id}.md`;
    const statePath = `${base}/state.json`;
    this.checkFile(briefPath, "Discovery のモジュールファイルが存在する");
    this.checkHeadings(briefPath, [
      "入力テーマ",
      "確認した前提",
      "判定",
      "判定理由",
      "Intent Draft",
      "Intent 候補",
      "候補判断",
      "既存 Intent との関係",
      "推奨次アクション",
    ]);

    this.checkFile(statePath, "Discovery 状態ファイルが存在する");
    const state = this.intentState(statePath);
    if (!state) return;

    this.checkJsonValue(statePath, "schemaVersion", state.schemaVersion, "1");
    this.checkJsonValue(statePath, "phase", state.phase, "discovery");
    this.checkAllowed(statePath, "status", state.status, discoveryStatusValues);
    this.checkAllowed(statePath, "gate", state.gate, discoveryGateValues);
    this.checkAllowed(statePath, "decision", state.decision, discoveryDecisionValues);
    this.checkJsonValue(".amadeus/discoveries.md", "Discovery 行の状態", row["状態"], String(state.status ?? ""));
    this.checkJsonValue(".amadeus/discoveries.md", "Discovery 行の判定", row["判定"], String(state.decision ?? ""));

    const briefDecision = this.discoveryBriefDecision(briefPath);
    if (briefDecision === String(state.decision ?? "").trim()) {
      this.pass(briefPath, "state.json.decision と Discovery のモジュールファイルの判定が一致する", briefDecision);
    } else {
      this.failRow(briefPath, "state.json.decision と Discovery のモジュールファイルの判定が一致する", `${briefDecision} != ${String(state.decision ?? "").trim()}`);
    }

    if (String(state.gate ?? "").trim() === "passed") this.checkDiscoveryPassedGate(briefPath, state);
  }

  private discoveryBriefDecision(path: string): string {
    const body = this.sectionBody(path, "判定") ?? "";
    return body.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  }

  private checkDiscoveryPassedGate(path: string, state: Record<string, any>): void {
    for (const heading of ["入力テーマ", "確認した前提", "判定理由", "推奨次アクション"]) {
      const body = this.sectionBody(path, heading);
      if (body && body.trim().length > 0) this.pass(path, `Discovery gate passed で \`${heading}\` が空欄でない`, "本文を確認");
      else this.failRow(path, `Discovery gate passed で \`${heading}\` が空欄でない`, "本文がない");
    }

    const decision = String(state.decision ?? "").trim();
    if (decision === "undecided") {
      this.failRow(path, "Discovery gate passed では decision が undecided ではない", decision);
      return;
    }
    this.pass(path, "Discovery gate passed では decision が undecided ではない", decision);

    if (decision === "single_intent") {
      const table = this.checkTable(path, "Intent Draft", ["項目", "内容"]);
      if (table && table.rows.length > 0) this.pass(path, "single_intent の Intent Draft がある", `${table.rows.length}件`);
      else this.failRow(path, "single_intent の Intent Draft がある", "行がない");
      return;
    }

    if (decision === "multi_intent") {
      this.checkMultiIntentDiscovery(path);
      return;
    }

    if (decision === "existing_intent_update") {
      this.checkExistingIntentUpdateDiscovery(path);
      return;
    }

    if (decision === "research_only") {
      const body = this.sectionBody(path, "確認した前提") ?? "";
      if (body.trim().length > 0) this.pass(path, "research_only の調査論点が記録されている", "確認した前提を確認");
      else this.failRow(path, "research_only の調査論点が記録されている", "記録なし");
      return;
    }

    if (decision === "no_intent") {
      const body = this.sectionBody(path, "判定理由") ?? "";
      if (body.trim().length > 0) this.pass(path, "no_intent の Intent にしない理由が記録されている", "判定理由を確認");
      else this.failRow(path, "no_intent の Intent にしない理由が記録されている", "記録なし");
    }
  }

  private checkMultiIntentDiscovery(path: string): void {
    const table = this.checkTable(path, "Intent 候補", ["候補", "状態", "Intent", "課題", "成功状態", "除外範囲", "依存"]);
    if (!table) return;
    if (table.rows.length >= 2) this.pass(path, "multi_intent の Intent 候補が2件以上ある", `${table.rows.length}件`);
    else this.failRow(path, "multi_intent の Intent 候補が2件以上ある", `${table.rows.length}件`);

    let intentRecordCreated = 0, recommended = 0;
    for (const row of table.rows) {
      this.checkAllowed(path, "Intent 候補の状態", row["状態"], discoveryCandidateStatusValues);
      if (String(row["状態"] ?? "").trim() === "intent_record_created") {
        intentRecordCreated += 1;
        this.checkIntentRecordCreatedDiscoveryCandidate(path, row["Intent"]);
      }
      if (String(row["状態"] ?? "").trim() === "recommended") recommended += 1;
      for (const column of ["候補", "課題", "成功状態", "除外範囲", "依存"]) this.checkNotBlankValue(path, column, row[column]);
    }

    if (intentRecordCreated === 0 && recommended === 1) {
      this.pass(path, "Intent Record 作成前の multi_intent は recommended が1件だけである", `${recommended}件`);
    } else if (intentRecordCreated === 0) {
      this.failRow(path, "Intent Record 作成前の multi_intent は recommended が1件だけである", `${recommended}件`);
    } else if (recommended === 0 || recommended === 1) {
      this.pass(path, "Intent Record 作成済み候補がある multi_intent は recommended が0件または1件である", `${recommended}件`);
    } else {
      this.failRow(path, "Intent Record 作成済み候補がある multi_intent は recommended が0件または1件である", `${recommended}件`);
    }
  }

  private checkIntentRecordCreatedDiscoveryCandidate(path: string, value: unknown): void {
    const links = this.markdownLinks(String(value ?? ""));
    if (links.length === 0) {
      this.failRow(path, "intent_record_created の Intent 候補が存在する Intent へリンクしている", String(value ?? ""));
      return;
    }
    for (const target of links) {
      const clean = this.cleanLinkTarget(target);
      if (clean.match(/^\.\.\/intents\/[^/]+\.md$/)) this.checkLink(path, target);
      else this.failRow(path, "intent_record_created の Intent 候補が存在する Intent へリンクしている", target);
    }
  }

  private checkExistingIntentUpdateDiscovery(path: string): void {
    const body = this.sectionBody(path, "既存 Intent との関係") ?? "";
    const intentLinks = this.markdownLinks(body).filter((link) => this.cleanLinkTarget(link).match(/^\.\.\/intents\/[^/]+\.md$/));
    if (intentLinks.length === 1) {
      this.pass(path, "existing_intent_update の対象既存 Intent が1件だけある", intentLinks[0]);
      this.checkLink(path, intentLinks[0]);
    } else {
      this.failRow(path, "existing_intent_update の対象既存 Intent が1件だけある", `${intentLinks.length}件`);
    }
  }

  private checkIntentIndexes(intentId: string): void {
    const base = `.amadeus/intents/${intentId}`;

    this.checkFile(`.amadeus/intents/${intentId}.md`, "Intent のモジュールファイルが存在する");
    this.checkHeadings(`.amadeus/intents/${intentId}.md`, ["目的", "成功条件", "範囲"]);
    this.checkEventStormingSessions(`${base}/event-storming`, "intent-scoped", intentId);

    const statePath = `${base}/state.json`;
    this.checkFile(statePath, "Intent 状態ファイルが存在する");
    const state = this.intentState(statePath);
    if (!state) return;

    this.checkNoLegacyIntentRootArtifacts(base);
    this.checkExistingPhaseGrillings(base);
    this.checkNoIdeationScopeControlValuesInState(statePath, state);

    if (state.phase === "ideation") {
      this.checkIdeationIntent(base, state);
      return;
    }

    if (state.phase === "inception") {
      this.checkIdeationArtifacts(base, state);
      checkInceptionPhase(this.phaseValidationContext(), { base, state });
      this.checkScopeInceptionConsistency(base);
      return;
    }

    if (state.phase === "construction") {
      this.checkIdeationArtifacts(base, state);
      checkConstructionPhase(this.phaseValidationContext(), { base, state });
      this.checkScopeInceptionConsistency(base);
      return;
    }

    this.failRow(statePath, "`phase` が既知である", String(state.phase ?? ""));
  }

  private phaseValidationContext(): PhaseValidationContext {
    return {
      statusValues,
      gateValues,
      indexSpecs,
      intentId: this.intentId,
      pass: (target, condition, evidence) => this.pass(target, condition, evidence),
      failRow: (target, condition, evidence) => this.failRow(target, condition, evidence),
      checkJsonValue: (path, key, actual, expected) => this.checkJsonValue(path, key, actual, expected),
      checkAllowed: (path, key, actual, allowed) => this.checkAllowed(path, key, actual, allowed),
      checkStatePaths: (path, section, key, condition, puml, label) => this.checkStatePaths(path, section, key, condition, puml, label),
      checkRequiredStatePath: (path, section, key, requiredPath, condition) => this.checkRequiredStatePath(path, section, key, requiredPath, condition),
      checkIntentCaptureState: (path, value) => this.checkIntentCaptureState(path, value),
      checkGrillings: (base) => this.checkGrillings(base),
      checkRequirements: (path) => this.checkRequirements(path),
      checkAcceptance: (path, requirementsPath) => this.checkAcceptance(path, requirementsPath),
      checkCodebaseAnalysis: (base, state) => this.checkCodebaseAnalysis(base, state),
      checkNoInceptionDomainArtifacts: (base) => this.checkNoInceptionDomainArtifacts(base),
      checkOptionalIndex: (path, spec) => this.checkOptionalIndex(path, spec),
      checkUnitContextReferences: (base, required, contextsPath, condition) => this.checkUnitContextReferences(base, required, contextsPath, condition),
      checkUnitDesignArtifacts: (base, state) => this.checkUnitDesignArtifacts(base, state),
      checkBoltDesignReferences: (base) => this.checkBoltDesignReferences(base),
      checkNoInceptionBoltDesignBriefArtifacts: (base, state) => this.checkNoInceptionBoltDesignBriefArtifacts(base, state),
      checkNoInceptionConstructionArtifacts: (base) => this.checkNoInceptionConstructionArtifacts(base),
      checkInceptionBoltArtifacts: (base, state) => this.checkInceptionBoltArtifacts(base, state),
      checkTraceability: (path) => this.checkTraceability(path),
      checkFile: (path, condition, directory) => this.checkFile(path, condition, directory),
      checkTaskGenerationTraceability: (path, state) => this.checkTaskGenerationTraceability(path, state),
      checkConstructionTraceability: (path, state) => this.checkConstructionTraceability(path, state),
      checkConstructionBoltArtifacts: (inceptionBase, constructionBase, state) => this.checkConstructionBoltArtifacts(inceptionBase, constructionBase, state),
      recordCheckResults: (results) => this.recordCheckResults(results),
      recordCheckedFiles: (paths) => {
        for (const path of paths) this.checkedFiles.add(this.relativePath(this.absolute(path)));
      },
      isFile: (path) => this.isFile(this.absolute(path)),
      isObject: (value): value is Record<string, any> => this.isObject(value),
      typeName: (value) => this.typeName(value),
      idsFor: (path) => this.idsFor(path),
      unitDirectories: (base, unitIds) => this.unitDirectories(base, unitIds),
      inceptionBaseForStatePath: (path) => this.inceptionBaseForStatePath(path),
      constructionBaseForStatePath: (path) => this.constructionBaseForStatePath(path),
      constructionBoltDirectories: (inceptionBase, constructionBase) => this.constructionBoltDirectories(inceptionBase, constructionBase),
      relativeToIntent: (intentBase, artifactPath) => this.relativeToIntent(intentBase, artifactPath),
    };
  }

  private checkNoLegacyIntentRootArtifacts(base: string): void {
    const legacyFiles = [
      "scope.md",
      "ideation.md",
      "requirements.md",
      "acceptance.md",
      "user-stories.md",
      "use-cases.md",
      "units.md",
      "bolts.md",
      "traceability.md",
      "decisions.md",
      "codebase-analysis.md",
      "grillings.md",
    ];
    const legacyDirectories = [
      "mocks",
      "requirements",
      "user-stories",
      "use-cases",
      "units",
      "bolts",
      "decisions",
      "domain",
      "grillings",
    ];

    for (const file of legacyFiles) {
      const path = `${base}/${file}`;
      if (this.isFile(this.absolute(path))) {
        this.failRow(path, "Intent 直下の旧配置成果物を使わない", `${file} は phase ディレクトリ配下へ置く`);
      }
    }
    for (const directory of legacyDirectories) {
      const path = `${base}/${directory}`;
      if (this.isDirectory(this.absolute(path))) {
        this.failRow(path, "Intent 直下の旧配置成果物を使わない", `${directory}/ は phase ディレクトリ配下へ置く`);
      }
    }
  }

  private checkExistingPhaseGrillings(base: string): void {
    for (const phase of ["ideation", "inception", "construction"]) {
      const phaseBase = `${base}/${phase}`;
      const indexPath = `${phaseBase}/grillings.md`;
      const sessionsPath = `${phaseBase}/grillings`;
      if (this.isFile(this.absolute(indexPath)) || this.isDirectory(this.absolute(sessionsPath))) {
        this.checkGrillings(phaseBase);
      }
    }
  }

  private intentState(path: string): Record<string, any> | undefined {
    if (!this.isFile(this.absolute(path))) return undefined;
    try {
      const state = JSON.parse(this.read(path));
      this.pass(path, "state.json が JSON として解釈できる", "JSON を確認");
      return state;
    } catch (error) {
      this.failRow(path, "state.json が JSON として解釈できる", (error as Error).message);
      return undefined;
    }
  }

  private checkIdeationIntent(base: string, state: Record<string, any>): void {
    const statePath = `${base}/state.json`;
    this.checkStateJson(statePath, state);
    this.checkGrillings(`${base}/ideation`);

    if (this.isIdeationStartedOnly(state)) {
      this.checkNoIdeationDownstreamArtifacts(statePath, base);
      return;
    }

    this.checkIdeationArtifacts(base, state);
  }

  private checkIdeationArtifacts(base: string, state?: Record<string, any>): void {
    const ideationBase = `${base}/ideation`;
    const ideationGatePassed = String(state?.ideation?.gate ?? "").trim() === "passed";

    this.checkFile(`${ideationBase}/scope.md`, "Ideation scope が存在する");
    this.checkIdeationScope(`${ideationBase}/scope.md`, ideationGatePassed);

    this.checkFile(`${ideationBase}/ideation.md`, "Ideation 分析が存在する");
    this.checkHeadings(`${ideationBase}/ideation.md`, ["実現可能性", "体制", "初期モック", "未確定事項", "学習候補"]);

    this.checkIdeationTraceability(`${ideationBase}/traceability.md`);

    this.checkFile(`${ideationBase}/decisions.md`, "Ideation 判断一覧が存在する");
    this.checkOptionalIndex(`${ideationBase}/decisions.md`, indexSpecs["decisions.md"]);
  }

  private checkIdeationScope(path: string, ideationGatePassed = false): void {
    this.checkHeadings(path, ["対象境界", "実行制御", "成果物深度", "検証戦略", "Inception への引き継ぎ"]);

    const includedTable = this.checkSubheadingTable(path, "対象境界", "対象", ["識別子", "境界", "根拠", "状態"]);
    const excludedTable = this.checkSubheadingTable(path, "対象境界", "対象外", ["識別子", "境界", "根拠", "状態"]);
    this.checkScopeIds(path, includedTable, "SC-IN", /^SC-IN-\d{3}$/);
    this.checkScopeIds(path, excludedTable, "SC-OUT", /^SC-OUT-\d{3}$/);
    this.checkScopeIdUniqueness(path, [includedTable, excludedTable]);

    const executionTable = this.checkTable(path, "実行制御", ["項目", "値", "理由"]);
    this.checkControlValue(path, executionTable, "実行スコープ", ideationExecutionScopeValues);
    if (ideationGatePassed) this.checkControlValueConfirmed(path, executionTable, "実行スコープ");
    this.checkOmittedStageReason(path, executionTable);

    const depthTable = this.checkTable(path, "成果物深度", ["項目", "値", "理由"]);
    this.checkControlValue(path, depthTable, "深度", ideationDepthValues);
    if (ideationGatePassed) this.checkControlValueConfirmed(path, depthTable, "深度");

    const verificationTable = this.checkTable(path, "検証戦略", ["項目", "値", "理由"]);
    this.checkControlValue(path, verificationTable, "戦略", ideationVerificationStrategyValues);
    if (ideationGatePassed) this.checkControlValueConfirmed(path, verificationTable, "戦略");
  }

  private checkScopeIds(path: string, table: Table | undefined, prefix: string, pattern: RegExp): void {
    if (!table || !table.headers.includes("識別子")) return;
    for (const row of table.rows) {
      const id = String(row["識別子"] ?? "").trim();
      if (pattern.test(id)) this.pass(path, `${prefix} ID が識別子形式に合う`, id);
      else this.failRow(path, `${prefix} ID が識別子形式に合う`, id);
    }
  }

  private checkScopeIdUniqueness(path: string, tables: Array<Table | undefined>): void {
    const ids = new Set<string>();
    for (const table of tables) {
      if (!table || !table.headers.includes("識別子")) continue;
      for (const row of table.rows) {
        const id = String(row["識別子"] ?? "").trim();
        if (id.length === 0) continue;
        if (ids.has(id)) this.failRow(path, "Scope ID が重複しない", id);
        else {
          this.pass(path, "Scope ID が重複しない", id);
          ids.add(id);
        }
      }
    }
  }

  private checkControlValue(path: string, table: Table | undefined, item: string, allowed: Set<string>): void {
    const row = this.controlRow(table, item);
    if (!row) {
      this.failRow(path, `\`${item}\` が定義されている`, "行がない");
      return;
    }
    this.pass(path, `\`${item}\` が定義されている`, item);
    this.checkAllowed(path, item, row["値"], allowed);
  }

  private checkControlValueConfirmed(path: string, table: Table | undefined, item: string): void {
    const row = this.controlRow(table, item);
    if (!row) return;
    const value = String(row["値"] ?? "").trim();
    if (value.length > 0 && value !== "未確認") this.pass(path, `Ideation gate passed では \`${item}\` が未確認ではない`, value);
    else this.failRow(path, `Ideation gate passed では \`${item}\` が未確認ではない`, value || "空欄");
  }

  private checkOmittedStageReason(path: string, table: Table | undefined): void {
    const row = this.controlRow(table, "省略 stage");
    if (!row) {
      this.failRow(path, "`省略 stage` が定義されている", "行がない");
      return;
    }
    this.pass(path, "`省略 stage` が定義されている", "省略 stage");
    const omittedStage = String(row["値"] ?? "").trim();
    const reason = String(row["理由"] ?? "").trim();
    if (omittedStage === "なし" || omittedStage === "未確認") {
      this.pass(path, "`省略 stage` の理由がある", reason || "該当なし");
      return;
    }
    if (reason.length > 0 && reason !== "未確認" && reason !== "該当なし") {
      this.pass(path, "`省略 stage` の理由がある", reason);
    } else {
      this.failRow(path, "`省略 stage` の理由がある", `${omittedStage}: ${reason || "空欄"}`);
    }
  }

  private controlRow(table: Table | undefined, item: string): Record<string, string> | undefined {
    return table?.rows.find((row) => String(row["項目"] ?? "").trim() === item);
  }

  private checkNoIdeationDownstreamArtifacts(path: string, base: string): void {
    const existing = ["inception", "construction"].filter((phase) => this.isDirectory(this.absolute(`${base}/${phase}`)));
    if (existing.length === 0) {
      this.pass(path, "Ideation phase では後続 stage 成果物が存在しない", "後続 stage なし");
      return;
    }
    this.failRow(path, "Ideation phase では後続 stage 成果物が存在しない", existing.map((phase) => `${phase}/**`).join(", "));
  }

  private checkStateJson(path: string, state: Record<string, any>): void {
    this.checkJsonValue(path, "intent", state.intent, this.intentId ?? "");
    this.checkJsonValue(path, "phase", state.phase, "ideation");
    this.checkAllowed(path, "status", state.status, statusValues);

    const ideation = state.ideation;
    if (!this.isObject(ideation)) {
      this.failRow(path, "`ideation` がオブジェクトである", this.typeName(ideation));
      return;
    }

    this.pass(path, "`ideation` がオブジェクトである", "オブジェクトを確認");
    this.checkAllowed(path, "ideation.status", ideation.status, statusValues);
    this.checkAllowed(path, "ideation.gate", ideation.gate, gateValues);
    this.checkIntentCaptureState(path, ideation.intentCapture);
    this.checkStatePaths(path, ideation, "requiredArtifacts", "Ideation 必須成果物が存在する", false, "ideation");
    this.checkStatePaths(path, ideation, "requiredMocks", "Ideation 必須モックが存在する", true, "ideation");

    if (String(state.status ?? "").trim() === "completed") {
      this.checkJsonValue(path, "ideation.status", ideation.status, "completed");
      this.checkJsonValue(path, "ideation.gate", ideation.gate, "passed");
    }
  }

  private checkNoIdeationScopeControlValuesInState(path: string, state: Record<string, any>): void {
    const targets: Array<[string, unknown]> = [
      ["root", state],
      ["ideation", state.ideation],
    ];
    let found = false;
    for (const [label, value] of targets) {
      if (!this.isObject(value)) continue;
      const keys = Object.keys(value).filter((key) => ideationStateScopeControlKeys.has(key));
      for (const key of keys) {
        found = true;
        this.failRow(path, "state.json に scope 制御値を保存しない", `${label}.${key}`);
      }
    }
    if (!found) this.pass(path, "state.json に scope 制御値を保存しない", "未保存");
  }

  private checkIntentCaptureState(path: string, intentCapture: unknown): void {
    if (!this.isObject(intentCapture)) return this.failRow(path, "`ideation.intentCapture` がオブジェクトである", this.typeName(intentCapture));
    this.pass(path, "`ideation.intentCapture` がオブジェクトである", "オブジェクトを確認");
    this.checkAllowed(path, "ideation.intentCapture.status", intentCapture.status, statusValues);
    this.checkStatePaths(path, intentCapture, "createdArtifacts", "Ideation Intent Record 作成済み成果物が存在する", false, "ideation.intentCapture");
    this.checkJsonValue(path, "ideation.intentCapture.next", intentCapture.next, "ideation/scope-framing");
  }

  private isIdeationStartedOnly(state: Record<string, any>): boolean {
    const ideation = state.ideation;
    if (!this.isObject(ideation) || !this.isObject(ideation.intentCapture)) return false;
    return (
      String(state.status ?? "").trim() === "in_progress" && String(ideation.status ?? "").trim() === "in_progress" &&
      String(ideation.gate ?? "").trim() === "not_ready" &&
      String(ideation.intentCapture.status ?? "").trim() === "completed" &&
      (ideation.requiredArtifacts?.length ?? 0) === 0 && (ideation.requiredMocks?.length ?? 0) === 0
    );
  }

  private checkInceptionBoltArtifacts(base: string, state: Record<string, any>): void {
    const values = state.inception?.requiredBoltArtifacts;
    const isInceptionPhase = String(state.phase ?? "").trim() === "inception";
    const checkedTaskPaths = new Set<string>();
    if (Array.isArray(values)) {
      for (const value of values) {
        const relativePath = String(value ?? "").trim();
        if (relativePath.endsWith("/tasks.md")) {
          const path = `${base}/${relativePath}`;
          checkedTaskPaths.add(path);
          if (isInceptionPhase) this.failRow(path, "Inception は Bolt 配下の tasks.md を持たない", "Task は Construction で生成する");
          else this.checkTasks(path);
        }
      }
    }

    const boltsRoot = this.absolute(`${base}/bolts`);
    if (!this.isDirectory(boltsRoot)) return;
    for (const entry of readdirSync(boltsRoot)) {
      const path = `${base}/bolts/${entry}/tasks.md`;
      if (checkedTaskPaths.has(path) || !this.isFile(this.absolute(path))) continue;
      if (isInceptionPhase) this.failRow(path, "Inception は Bolt 配下の tasks.md を持たない", "Task は Construction で生成する");
      else this.checkTasks(path);
    }
  }

  private checkConstructionBoltArtifacts(inceptionBase: string, constructionBase: string, state: Record<string, any>): void {
    const values = state.construction?.requiredBoltArtifacts;
    const requiredBoltArtifacts = Array.isArray(values) ? values : [];
    const checkedPrPaths = new Set<string>();
    const intentBase = dirname(constructionBase);

    for (const value of requiredBoltArtifacts) {
      const relativePath = String(value ?? "").trim();
      const path = `${intentBase}/${relativePath}`;
      if (relativePath.endsWith("/notes.md")) {
        this.checkFile(path, "Construction ノートが存在する");
        this.checkHeadings(path, ["実行方針", "対象タスク", "未確認事項"]);
      } else if (relativePath.endsWith("/design.md")) {
        this.failRow(path, "Bolt 側 design.md は requiredBoltArtifacts に含めない", relativePath);
      } else if (relativePath.endsWith("/test-results.md")) {
        this.checkFile(path, "Construction テスト結果が存在する");
        this.checkHeadings(path, ["検証結果", "安全性確認", "CI確認", "受け入れ証拠"]);
        const table = this.checkTable(path, "受け入れ証拠", ["要求", "タスク", "証拠", "要約"]);
        if (table) this.checkAcceptanceEvidence(path, table);
      } else if (relativePath.endsWith("/tasks.md")) {
        this.checkTasks(path);
      } else if (relativePath.endsWith("/pr.md")) {
        this.checkPrRecord(path);
        checkedPrPaths.add(path);
      }
    }

    const boltsRoot = this.absolute(`${constructionBase}/bolts`);
    if (this.isDirectory(boltsRoot)) {
      const glob = new Bun.Glob("*/design.md");
      for (const design of glob.scanSync({ cwd: boltsRoot })) {
        const relativePath = this.relativeToIntent(intentBase, `${constructionBase}/bolts/${design}`);
        this.failRow(`${constructionBase}/bolts/${design}`, "Bolt 側 design.md は存在しない", relativePath);
      }
    }

    this.checkExistingPrRecords(constructionBase, checkedPrPaths);
  }

  private checkPrRecord(path: string): void {
    this.checkFile(path, "PR 記録が存在する");
    this.checkHeadings(path, ["Pull Request", "対象", "確認状況"]);
    const targetTable = this.checkTable(path, "対象", ["ボルト", "タスク", "要求"]);
    if (targetTable) this.checkPrTargets(path, targetTable);
    this.checkPrUrl(path);
  }

  private checkAcceptanceEvidence(path: string, table: Table): void {
    const intentBase = this.intentBaseForConstructionBoltArtifact(path);
    const inceptionBase = `${intentBase}/inception`;
    const constructionBase = `${intentBase}/construction`;
    const boltIds = this.idsFor(`${inceptionBase}/bolts.md`);
    const boltDirectories = this.constructionBoltDirectories(inceptionBase, constructionBase);
    this.checkReferenceColumn(path, table, "要求", this.idsFor(`${inceptionBase}/requirements.md`), "受け入れ証拠", false);
    this.checkTaskReferences(path, table, "タスク", boltIds, boltDirectories, "受け入れ証拠");
    this.checkNotBlank(path, table, "証拠");
    this.checkNotBlank(path, table, "要約");
  }

  private checkPrTargets(path: string, table: Table): void {
    const intentBase = this.intentBaseForConstructionBoltArtifact(path);
    const inceptionBase = `${intentBase}/inception`;
    const constructionBase = `${intentBase}/construction`;
    const boltIds = this.idsFor(`${inceptionBase}/bolts.md`);
    const boltDirectories = this.constructionBoltDirectories(inceptionBase, constructionBase);
    this.checkReferenceColumn(path, table, "ボルト", boltIds, "PR 対象", false);
    this.checkReferenceColumn(path, table, "要求", this.idsFor(`${inceptionBase}/requirements.md`), "PR 対象", false);
    this.checkPrTaskTargets(path, table, boltIds, boltDirectories);
  }

  private checkExistingPrRecords(constructionBase: string, checkedPrPaths: Set<string>): void {
    const boltsRoot = this.absolute(`${constructionBase}/bolts`);
    if (!this.isDirectory(boltsRoot)) return;
    const glob = new Bun.Glob("*/pr.md");
    for (const pr of glob.scanSync({ cwd: boltsRoot })) {
      const path = `${constructionBase}/bolts/${pr}`;
      if (checkedPrPaths.has(path)) continue;
      this.checkPrRecord(path);
    }
  }

  private checkPrUrl(path: string): void {
    if (!this.isFile(this.absolute(path))) return;
    const body = this.sectionBody(path, "Pull Request") ?? "";
    const match = body.match(/https?:\/\/\S+/);
    if (match) this.pass(path, "PR 記録が URL を持つ", match[0]);
    else this.failRow(path, "PR 記録が URL を持つ", "URL なし");
  }

  private checkTasks(path: string): void {
    this.checkFile(path, "Task 一覧が存在する");
    if (!this.isFile(this.absolute(path))) return;
    const text = this.read(path);
    const taskMatches = [...text.matchAll(/^- \[[ xX]\] (T\d{3}):[\s\S]*?(?=^- \[[ xX]\] T\d{3}:|(?![\s\S]))/gm)];
    if (taskMatches.length === 0) {
      this.failRow(path, "Task が識別子付きチェックリストである", "Task がない");
      return;
    }
    const intentBase = this.intentBaseForConstructionBoltArtifact(path);
    const inceptionBase = `${intentBase}/inception`;
    const constructionBase = `${intentBase}/construction`;
    const taskIds = new Set<string>();
    for (const match of taskMatches) {
      const taskId = match[1];
      if (taskIds.has(taskId)) this.failRow(path, "Task ID が重複しない", taskId);
      else {
        this.pass(path, "Task ID が重複しない", taskId);
        taskIds.add(taskId);
      }
    }
    for (const match of taskMatches) {
      const taskId = match[1];
      const block = match[0];
      this.pass(path, "Task が識別子付きチェックリストである", taskId);
      for (const label of ["作業", "要求", "ユースケース", "依存", "設計根拠", "証拠"]) {
        if (new RegExp(`^\\s+- ${label}:`, "m").test(block)) this.pass(path, `Task が \`${label}\` を持つ`, taskId);
        else this.failRow(path, `Task が \`${label}\` を持つ`, taskId);
      }
      this.checkTaskLabelReferences(path, block, taskId, "要求", this.idsFor(`${inceptionBase}/requirements.md`), false);
      this.checkTaskLabelReferences(path, block, taskId, "ユースケース", this.idsFor(`${inceptionBase}/use-cases.md`), true);
      this.checkTaskDependencies(path, block, taskId, taskIds, this.idsFor(`${inceptionBase}/bolts.md`), this.constructionBoltDirectories(inceptionBase, constructionBase));
    }
  }

  private checkTaskLabelReferences(path: string, block: string, taskId: string, label: string, ids: Set<string>, allowNone: boolean): void {
    for (const value of this.taskLabelValues(block, label)) {
      if (allowNone && value === "なし") {
        this.pass(path, `Task の \`${label}\` が既存 ID またはなしである`, `${taskId}: ${value}`);
      } else if (ids.has(value)) {
        this.pass(path, `Task の \`${label}\` が既存 ID またはなしである`, `${taskId}: ${value}`);
      } else {
        this.failRow(path, `Task の \`${label}\` が既存 ID またはなしである`, `${taskId}: ${value}`);
      }
    }
  }

  private checkTaskDependencies(path: string, block: string, taskId: string, taskIds: Set<string>, boltIds: Set<string>, boltDirectories: Map<string, string>): void {
    const condition = "Task の `依存` が既存 ID またはなしである";
    for (const value of this.taskLabelValues(block, "依存")) {
      if (value === "なし" || taskIds.has(value)) {
        this.pass(path, condition, `${taskId}: ${value}`);
        continue;
      }
      const match = value.match(/^(B\d{3})\/(T\d{3})$/);
      if (!match) {
        this.failRow(path, condition, `${taskId}: ${value}`);
        continue;
      }
      const [, boltId, dependencyTaskId] = match;
      const boltDir = boltDirectories.get(boltId);
      if (boltIds.has(boltId) && boltDir && this.taskIdsFor(`${boltDir}/tasks.md`).has(dependencyTaskId)) {
        this.pass(path, condition, `${taskId}: ${value}`);
      } else {
        this.failRow(path, condition, `${taskId}: ${value}`);
      }
    }
  }

  private checkReferenceColumn(path: string, table: Table, column: string, ids: Set<string>, context: string, allowNone: boolean): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) {
      for (const target of this.splitValues(row[column])) {
        if ((allowNone && target === "なし") || ids.has(target)) this.pass(path, `${context}の \`${column}\` が一覧内の既存 ID である`, target);
        else this.failRow(path, `${context}の \`${column}\` が一覧内の既存 ID である`, target);
      }
    }
  }

  private checkPrTaskTargets(path: string, table: Table, boltIds: Set<string>, boltDirectories: Map<string, string>): void {
    if (!table.headers.includes("タスク")) return;
    for (const row of table.rows) {
      const rowBoltIds = this.splitValues(row["ボルト"]).filter((value) => value.length > 0);
      for (const value of this.splitValues(row["タスク"])) {
        const qualified = value.match(/^(B\d{3})\/(T\d{3})$/);
        if (qualified) {
          const [, boltId, taskId] = qualified;
          this.checkExistingTask(path, "PR 対象", "タスク", value, boltId, taskId, boltIds, boltDirectories);
          continue;
        }

        const local = value.match(/^(T\d{3})$/);
        if (!local) {
          this.failRow(path, "PR 対象の `タスク` が Task ID または Bolt/Task 参照である", value);
          continue;
        }

        if (rowBoltIds.length === 0) {
          this.failRow(path, "PR 対象の `タスク` が既存 Task を指す", value);
          continue;
        }
        for (const boltId of rowBoltIds) {
          this.checkExistingTask(path, "PR 対象", "タスク", `${boltId}/${value}`, boltId, value, boltIds, boltDirectories);
        }
      }
    }
  }

  private checkStatePaths(path: string, section: Record<string, any>, key: string, condition: string, puml: boolean, label: string): void {
    const values = section[key];
    if (!Array.isArray(values)) {
      this.failRow(path, `\`${label}.${key}\` が配列である`, this.typeName(values));
      return;
    }

    this.pass(path, `\`${label}.${key}\` が配列である`, `${values.length}件`);
    for (const value of values) this.checkStateRelativePath(path, value, condition, puml);
  }

  private checkRequiredStatePath(path: string, section: Record<string, any>, key: string, requiredPath: string, condition: string): void {
    const values = section[key];
    if (!Array.isArray(values)) return;
    const required = new Set(values.map((value: unknown) => String(value ?? "").trim()));
    if (required.has(requiredPath)) this.pass(path, condition, requiredPath);
    else this.failRow(path, condition, requiredPath);
  }

  private checkStateRelativePath(path: string, value: unknown, condition: string, puml: boolean): void {
    const item = String(value ?? "").trim();
    const intentRootFile = `../${basename(dirname(path))}.md`;
    const allowedIntentRootFile = item === intentRootFile && !puml;
    if (item.length === 0 || item.startsWith("/") || (item.split("/").includes("..") && !allowedIntentRootFile)) {
      this.failRow(path, condition, `${item} は Intent ディレクトリ内の相対パスまたは ${intentRootFile} ではない`);
      return;
    }
    if (puml && !item.endsWith(".puml")) {
      this.failRow(path, condition, `${item} は .puml ではない`);
      return;
    }

    const target = this.absolute(join(dirname(path), item));
    if (this.isFile(target)) {
      this.checkedFiles.add(this.relativePath(target));
      this.pass(path, condition, item);
    } else {
      this.failRow(path, condition, `${item} が存在しない`);
    }
  }

  private checkIntents(): void {
    const path = ".amadeus/intents.md";
    this.checkFile(path, "インテント一覧が存在する");
    this.checkHeadings(path, ["一覧", "依存関係"]);
    const table = this.checkTable(path, "一覧", ["識別子", "概要", "依存", "詳細"]);
    if (!table) return;

    const ids = this.collectIds(path, table, "識別子", intentDirectoryPattern);
    this.checkDependencyValues(path, table, "依存", ids);
    this.checkIntentDetailLinks(path, table, ids);
    this.checkIntentStateDirectories(table, ids);

    const depTable = this.checkTable(path, "依存関係", ["インテント", "依存", "理由"]);
    if (!depTable) return;
    this.checkTableTargets(path, depTable, "インテント", ids, false);
    this.checkDependencyValues(path, depTable, "依存", ids);
    this.checkNotBlank(path, depTable, "理由");
  }

  private checkRequirements(path: string): void {
    this.checkFile(path, "要求一覧が存在する");
    this.checkHeadings(path, ["一覧", "依存関係", "受け入れ状態"]);
    const table = this.checkTable(path, "一覧", ["識別子", "概要", "状態", "依存", "詳細"]);
    if (!table) return;

    const ids = this.collectIds(path, table, "識別子", /^R\d{3}$/);
    this.checkDependencyValues(path, table, "依存", ids);
    this.checkDetailLinks(path, table, "詳細");
  }

  private checkAcceptance(path: string, requirementsPath: string): void {
    this.checkFile(path, "受け入れ状態が存在する");
    this.checkHeadings(path, ["要求状態", "状態ルール"]);
    const table = this.checkTable(path, "要求状態", ["要求", "状態", "証拠"]);
    if (!table) return;

    const requirementIds = this.idsFor(requirementsPath);
    this.checkTableTargets(path, table, "要求", requirementIds, false);
    this.checkNotBlank(path, table, "状態");
    this.checkNotBlank(path, table, "証拠");
  }

  private checkCodebaseAnalysis(base: string, state: Record<string, any>): void {
    const path = `${base}/codebase-analysis.md`;
    const intentBase = this.intentBaseForPhaseBase(base);
    const requiredPath = this.relativeToIntent(intentBase, path);
    const required = new Set((state.inception?.requiredArtifacts ?? []).map((value: unknown) => String(value).trim())).has(requiredPath);
    if (required) {
      this.checkFile(path, "既存コード分析が必須成果物として存在する");
      this.checkHeadings(path, ["対象コード", "既存能力", "統合点", "ギャップ", "リスク", "Inception への入力"]);
    } else if (this.isFile(this.absolute(path))) {
      this.pass(path, "既存コード分析が存在する場合は検証対象である", "存在を確認");
      this.checkHeadings(path, ["対象コード", "既存能力", "統合点", "ギャップ", "リスク", "Inception への入力"]);
    } else {
      this.skipped(path, "既存コード分析は条件付き成果物である", "requiredArtifacts に未指定で、ファイルも存在しない");
    }
  }

  private checkIdeationTraceability(path: string): void {
    this.checkFile(path, "Ideation 追跡ファイルが存在する");
    this.checkHeadings(path, ["Ideation からの追跡", "依存関係からの追跡"]);
    const ideationTraceTable = this.checkTable(path, "Ideation からの追跡", ["Ideation 要素", "対象", "定義元", "後続への渡し方"]);
    this.checkIdeationTraceabilityScopeControlRows(path, ideationTraceTable);
    this.checkTable(path, "依存関係からの追跡", ["種別", "対象", "依存", "理由", "定義元"]);
    this.checkRelativeLinks(path);
  }

  private checkIdeationTraceabilityScopeControlRows(path: string, table: Table | undefined): void {
    if (!table || !table.headers.includes("Ideation 要素")) return;
    const elements = new Set(table.rows.map((row) => String(row["Ideation 要素"] ?? "").trim()));
    for (const element of ideationTraceabilityScopeControlRows) {
      if (elements.has(element)) this.pass(path, `Ideation 追跡が \`${element}\` を含む`, element);
      else this.failRow(path, `Ideation 追跡が \`${element}\` を含む`, "行がない");
    }
  }

  private checkScopeInceptionConsistency(base: string): void {
    const scopePath = `${base}/ideation/scope.md`;
    const inceptionBase = `${base}/inception`;
    const tracePath = `${inceptionBase}/traceability.md`;
    if (!this.isFile(this.absolute(scopePath)) || !this.isFile(this.absolute(tracePath))) return;

    const included = this.scopeBoundaryRows(scopePath, "対象", /^SC-IN-\d{3}$/);
    const excluded = this.scopeBoundaryRows(scopePath, "対象外", /^SC-OUT-\d{3}$/);
    this.checkInceptionScopeTraceability(tracePath, included, excluded);
    this.checkExcludedScopeBoundaryWarnings(inceptionBase, excluded);
  }

  private scopeBoundaryRows(path: string, subheading: string, pattern: RegExp): Array<{ id: string; boundary: string; status: string }> {
    const table = this.tableAfterSubheading(path, "対象境界", subheading);
    if (!table) return [];
    return table.rows
      .map((row) => ({
        id: String(row["識別子"] ?? "").trim(),
        boundary: String(row["境界"] ?? "").trim(),
        status: String(row["状態"] ?? "").trim(),
      }))
      .filter((row) => pattern.test(row.id));
  }

  private checkInceptionScopeTraceability(
    path: string,
    included: Array<{ id: string; boundary: string; status: string }>,
    excluded: Array<{ id: string; boundary: string; status: string }>,
  ): void {
    const table = this.checkTable(path, inceptionTraceabilityScopeHeading, inceptionTraceabilityScopeColumns);
    if (!table) return;

    const scopeIds = new Set([...included, ...excluded].map((row) => row.id));
    const tracedScopeIds = new Set<string>();
    for (const row of table.rows) {
      const rowScopeIds = this.splitValues(row["対象境界"]);
      for (const scopeId of rowScopeIds) {
        if (scopeIds.has(scopeId)) {
          this.pass(path, "`対象境界` が scope.md の既存 Scope ID である", scopeId);
          tracedScopeIds.add(scopeId);
        } else {
          this.failRow(path, "`対象境界` が scope.md の既存 Scope ID である", scopeId);
        }
      }
      if (rowScopeIds.some((scopeId) => scopeId.startsWith("SC-IN-"))) {
        this.checkInScopeTraceHasDownstream(path, row);
      }
    }

    for (const row of included.filter((candidate) => candidate.status !== "却下")) {
      if (tracedScopeIds.has(row.id)) this.pass(path, "対象境界からの追跡が採用済み SC-IN を含む", row.id);
      else this.failRow(path, "対象境界からの追跡が採用済み SC-IN を含む", row.id);
    }

    this.checkTableTargets(path, table, "要求", this.idsFor(`${dirname(path)}/requirements.md`), true);
    this.checkTableTargets(path, table, "ユーザーストーリー", this.idsFor(`${dirname(path)}/user-stories.md`), true);
    this.checkTableTargets(path, table, "ユースケース", this.idsFor(`${dirname(path)}/use-cases.md`), true);
    this.checkTableTargets(path, table, "ユニット", this.idsFor(`${dirname(path)}/units.md`), true);
    this.checkTableTargets(path, table, "ボルト", this.idsFor(`${dirname(path)}/bolts.md`), true);
    this.checkNotBlank(path, table, "扱い");
  }

  private checkInScopeTraceHasDownstream(path: string, row: Record<string, string>): void {
    const downstream = ["要求", "ユーザーストーリー", "ユースケース", "ユニット", "ボルト"]
      .flatMap((column) => this.splitValues(row[column]))
      .filter((value) => value !== "なし" && value !== "未確認");
    const scopeIds = this.splitValues(row["対象境界"]).join(", ");
    if (downstream.length > 0) this.pass(path, "SC-IN が Inception 成果物を参照する", `${scopeIds}: ${downstream.join(", ")}`);
    else this.failRow(path, "SC-IN が Inception 成果物を参照する", `${scopeIds}: 参照なし`);
  }

  private checkExcludedScopeBoundaryWarnings(inceptionBase: string, excluded: Array<{ id: string; boundary: string; status: string }>): void {
    const files = this.inceptionContentFiles(inceptionBase);
    let warningCount = 0;
    for (const row of excluded) {
      for (const term of this.excludedScopeTerms(row.boundary)) {
        for (const file of files) {
          const lines = this.read(file).split("\n");
          lines.forEach((line, index) => {
            if (!line.includes(term) || this.hasExcludedScopeAllowedContext(line)) return;
            warningCount += 1;
            this.warningRow(file, "Inception 成果物に SC-OUT に反する可能性がある項目がない", `${row.id}: ${term}: ${index + 1}行目`);
          });
        }
      }
    }
    if (warningCount === 0) {
      this.pass(inceptionBase, "Inception 成果物に SC-OUT に反する可能性がある項目がない", "警告なし");
    }
  }

  private inceptionContentFiles(inceptionBase: string): string[] {
    const root = this.absolute(inceptionBase);
    if (!this.isDirectory(root)) return [];
    const patterns = [
      "requirements.md",
      "requirements/*.md",
      "user-stories.md",
      "user-stories/*.md",
      "use-cases.md",
      "use-cases/*.md",
      "units.md",
      "units/**/*.md",
      "bolts.md",
      "bolts/*.md",
    ];
    const entries = new Set<string>();
    for (const pattern of patterns) {
      for (const entry of new Bun.Glob(pattern).scanSync({ cwd: root })) {
        if (entry.endsWith(".md")) entries.add(entry);
      }
    }
    return [...entries].sort().map((entry) => `${inceptionBase}/${entry}`);
  }

  private excludedScopeTerms(boundary: string): string[] {
    const normalized = boundary
      .replace(/[。．.]/g, "")
      .replace(/は扱わない.*$/, "")
      .replace(/は行わない.*$/, "")
      .replace(/は対象外.*$/, "")
      .replace(/を扱わない.*$/, "")
      .replace(/を行わない.*$/, "")
      .replace(/を対象外.*$/, "")
      .trim();
    return normalized
      .split(/、|と/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2);
  }

  private hasExcludedScopeAllowedContext(line: string): boolean {
    return excludedScopeAllowedContext.some((marker) => line.includes(marker));
  }

  private checkTraceability(path: string): void {
    this.checkFile(path, "追跡ファイルが存在する");
    this.checkHeadings(path, [
      "要求からの追跡",
      inceptionTraceabilityScopeHeading,
      "背景からの追跡",
      "ボルトからの追跡",
      "設計からの追跡",
      "既存コード分析からの追跡",
      "ユニットからの追跡",
      "ドメインモデルからの追跡",
      "依存関係からの追跡",
    ]);
    const requirementTraceTable = this.checkTable(path, "要求からの追跡", ["要求", "アクター", "ストーリー", "ユースケース", "ユニット", "ボルト"]);
    if (requirementTraceTable) this.checkNoInceptionTaskColumn(path, "要求からの追跡", requirementTraceTable);
    const scopeTraceTable = this.checkTable(path, inceptionTraceabilityScopeHeading, inceptionTraceabilityScopeColumns);
    if (scopeTraceTable) this.checkNoInceptionTaskColumn(path, inceptionTraceabilityScopeHeading, scopeTraceTable);
    const designTraceTable = this.checkTable(path, "設計からの追跡", ["設計", "ユニット", "要求", "ユースケース", "ボルト"]);
    if (designTraceTable) this.checkDesignTraceability(path, designTraceTable);
    const codebaseTraceTable = this.checkTable(path, "既存コード分析からの追跡", ["分析", "要求", "ユースケース", "ユニット", "ボルト", "設計", "入力"]);
    if (codebaseTraceTable) this.checkCodebaseAnalysisTraceability(path, codebaseTraceTable);
    this.checkTable(path, "依存関係からの追跡", ["種別", "対象", "依存", "理由", "定義元"]);
    this.checkRelativeLinks(path);
  }

  private checkDesignTraceability(path: string, table: Table): void {
    const base = dirname(path);
    this.checkNoInceptionTaskColumn(path, "設計からの追跡", table);
    this.checkTableTargets(path, table, "要求", this.idsFor(`${base}/requirements.md`), false);
    this.checkTableTargets(path, table, "ユースケース", this.idsFor(`${base}/use-cases.md`), false);
    const unitIds = this.idsFor(`${base}/units.md`);
    this.checkTableTargets(path, table, "ユニット", unitIds, false);
    const boltIds = this.idsFor(`${base}/bolts.md`);
    this.checkTableTargets(path, table, "ボルト", boltIds, false);
    const unitDirectories = this.unitDirectories(base, unitIds);
    const designByUnit = new Map([...unitDirectories.entries()].map(([unitId, unitDir]) => [unitId, `${unitDir}/design.md`]));
    for (const row of table.rows) {
      this.checkDesignLinksForUnits(path, row["設計"], this.splitValues(row["ユニット"]), designByUnit);
    }
  }

  private checkNoInceptionTaskColumn(path: string, heading: string, table: Table): void {
    if (table.headers.includes("タスク")) this.failRow(path, `Inception の \`${heading}\` は \`タスク\` 列を持たない`, "Task は Construction で生成する");
    else this.pass(path, `Inception の \`${heading}\` は \`タスク\` 列を持たない`, "列なし");
  }

  private checkCodebaseAnalysisTraceability(path: string, table: Table): void {
    const base = dirname(path);
    this.checkTableTargets(path, table, "要求", this.idsFor(`${base}/requirements.md`), false);
    this.checkTableTargets(path, table, "ユースケース", this.idsFor(`${base}/use-cases.md`), false);
    const unitIds = this.idsFor(`${base}/units.md`);
    this.checkTableTargets(path, table, "ユニット", unitIds, false);
    this.checkTableTargets(path, table, "ボルト", this.idsFor(`${base}/bolts.md`), false);

    const unitDirectories = this.unitDirectories(base, unitIds);
    const designByUnit = new Map([...unitDirectories.entries()].map(([unitId, unitDir]) => [unitId, `${unitDir}/design.md`]));
    for (const row of table.rows) {
      this.checkCodebaseAnalysisLink(path, row["分析"]);
      this.checkDesignLinksForUnits(path, row["設計"], this.splitValues(row["ユニット"]), designByUnit);
    }
  }

  private checkCodebaseAnalysisLink(path: string, value: unknown): void {
    const expected = this.relativeLink(path, `${dirname(path)}/codebase-analysis.md`);
    const links = this.markdownLinks(String(value ?? ""));
    if (links.some((link) => this.cleanLinkTarget(link) === expected)) {
      this.pass(path, "`分析` が対象 Intent の codebase-analysis.md を指す", expected);
    } else {
      this.failRow(path, "`分析` が対象 Intent の codebase-analysis.md を指す", links.join(", ") || "リンクなし");
    }
  }

  private checkConstructionTraceability(path: string, state: Record<string, any>): void {
    const construction = state.construction;
    const status = String(construction?.status ?? "").trim();
    const gate = String(construction?.gate ?? "").trim();
    if (status !== "completed" && gate !== "passed") return;

    const table = this.checkTable(path, "Construction からの追跡", ["ボルト", "タスク", "証拠", "状態"]);
    if (!table) return;
    if (table.rows.length === 0) {
      this.failRow(path, "`Construction からの追跡` が証拠追跡行を持つ", "行がない");
      return;
    }
    this.pass(path, "`Construction からの追跡` が証拠追跡行を持つ", `${table.rows.length}件`);
    const constructionBase = dirname(path);
    const intentBase = dirname(constructionBase);
    const inceptionBase = `${intentBase}/inception`;
    const boltIds = this.idsFor(`${inceptionBase}/bolts.md`);
    this.checkTableTargets(path, table, "ボルト", boltIds, false);
    this.checkTaskReferences(path, table, "タスク", boltIds, this.constructionBoltDirectories(inceptionBase, constructionBase), "Construction 追跡");
    this.checkNotBlank(path, table, "状態");
    this.checkDetailLinks(path, table, "証拠");
  }

  private checkTaskGenerationTraceability(path: string, state: Record<string, any>): void {
    const construction = state.construction;
    if (!this.hasReadyTaskGeneration(construction)) return;

    const table = this.checkTable(path, "Task Generation からの追跡", ["Evidence", "Task", "実装", "検証", "PR", "状態"]);
    if (!table) return;
    if (table.rows.length === 0) {
      this.failRow(path, "`Task Generation からの追跡` が Task 生成追跡行を持つ", "行がない");
      return;
    }
    this.pass(path, "`Task Generation からの追跡` が Task 生成追跡行を持つ", `${table.rows.length}件`);

    const constructionBase = dirname(path);
    const intentBase = dirname(constructionBase);
    const inceptionBase = `${intentBase}/inception`;
    const boltIds = this.idsFor(`${inceptionBase}/bolts.md`);
    const boltDirectories = this.constructionBoltDirectories(inceptionBase, constructionBase);
    this.checkTaskReferences(path, table, "Task", boltIds, boltDirectories, "Task Generation 追跡");
    this.checkDetailLinks(path, table, "Evidence");
    this.checkNotBlank(path, table, "実装");
    this.checkNotBlank(path, table, "検証");
    this.checkNotBlank(path, table, "PR");
    this.checkNotBlank(path, table, "状態");

    if (this.isObject(construction) && Array.isArray(construction.bolts)) {
      const targetBolts = new Set(
        Array.isArray(construction.targetBolts) ? construction.targetBolts.map((value: unknown) => String(value ?? "").trim()) : [],
      );
      for (const item of construction.bolts) {
        if (!this.isObject(item) || !this.isObject(item.taskGeneration)) continue;
        const boltId = String(item.id ?? "").trim();
        if (!targetBolts.has(boltId)) continue;
        const status = String(item.taskGeneration.status ?? "").trim();
        if (status !== "ready_for_approval" && status !== "passed") continue;

        const taskEvidence = Array.isArray(item.taskGeneration.evidence)
          ? item.taskGeneration.evidence
            .filter((value: unknown) => this.isObject(value) && String(value.kind ?? "").trim() === "tasks")
            .map((value: any) => String(value.path ?? "").trim())
          : [];
        const row = table.rows.find((candidate) => {
          const links = this.markdownLinks(String(candidate["Evidence"] ?? "")).map((link) => this.cleanLinkTarget(link));
          return taskEvidence.some((evidence) => {
            const evidenceLink = evidence.length > 0 ? this.relativeLink(path, `${intentBase}/${evidence}`) : "";
            return links.includes(evidence) || links.includes(evidenceLink);
          });
        });
        if (!row) {
          this.failRow(path, "`Task Generation からの追跡` が tasks evidence を持つ", `${boltId}: ${taskEvidence.join(", ") || "空欄"}`);
          continue;
        }
        this.pass(path, "`Task Generation からの追跡` が tasks evidence を持つ", `${boltId}: ${taskEvidence.join(", ")}`);

        const taskReferences = this.splitValues(row["Task"]);
        const wrongBoltReferences = taskReferences.filter((reference) => !reference.startsWith(`${boltId}/`));
        if (wrongBoltReferences.length === 0) {
          this.pass(path, "`Task Generation からの追跡` が対象 Bolt の Task を指す", boltId);
        } else {
          this.failRow(path, "`Task Generation からの追跡` が対象 Bolt の Task を指す", wrongBoltReferences.join(", "));
        }

        const boltDir = boltDirectories.get(boltId);
        const expectedTaskReferences = boltDir
          ? [...this.taskIdsFor(`${boltDir}/tasks.md`)].map((taskId) => `${boltId}/${taskId}`)
          : [];
        const missing = expectedTaskReferences.filter((reference) => !taskReferences.includes(reference));
        if (missing.length === 0) this.pass(path, "`Task Generation からの追跡` が対象 Bolt の全 Task を指す", boltId);
        else this.failRow(path, "`Task Generation からの追跡` が対象 Bolt の全 Task を指す", missing.join(", "));
      }
    }

    const constructionCompleted =
      String(construction?.status ?? "").trim() === "completed" || String(construction?.gate ?? "").trim() === "passed";
    if (constructionCompleted) {
      for (const row of table.rows) {
        for (const column of ["実装", "検証"]) {
          if (String(row[column] ?? "").trim() === "未実施") {
            this.failRow(path, "Construction 完了時の Task Generation 追跡が未実施を残さない", `${column}: 未実施`);
          }
        }
      }
    }
  }

  private hasReadyTaskGeneration(construction: unknown): boolean {
    if (!this.isObject(construction) || !Array.isArray(construction.bolts)) return false;
    const targetBolts = new Set(
      Array.isArray(construction.targetBolts) ? construction.targetBolts.map((value: unknown) => String(value ?? "").trim()) : [],
    );
    return construction.bolts.some((item: unknown) => {
      if (!this.isObject(item) || !this.isObject(item.taskGeneration)) return false;
      if (!targetBolts.has(String(item.id ?? "").trim())) return false;
      const status = String(item.taskGeneration.status ?? "").trim();
      return status === "ready_for_approval" || status === "passed";
    });
  }

  private checkTaskReferences(path: string, table: Table, column: string, boltIds: Set<string>, boltDirectories: Map<string, string>, context: string): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) {
      for (const reference of this.splitValues(row[column])) {
        const match = reference.match(/^(B\d{3})\/(T\d{3})$/);
        if (!match) {
          this.failRow(path, `${context}の \`${column}\` が Bolt/Task 参照である`, reference);
          continue;
        }
        const [, boltId, taskId] = match;
        this.checkExistingTask(path, context, column, reference, boltId, taskId, boltIds, boltDirectories);
      }
    }
  }

  private checkExistingTask(
    path: string,
    context: string,
    column: string,
    reference: string,
    boltId: string,
    taskId: string,
    boltIds: Set<string>,
    boltDirectories: Map<string, string>,
  ): void {
    if (boltIds.has(boltId)) this.pass(path, `${context}の \`${column}\` が既存 Bolt を指す`, reference);
    else this.failRow(path, `${context}の \`${column}\` が既存 Bolt を指す`, reference);

    const boltDir = boltDirectories.get(boltId);
    if (!boltDir) {
      this.failRow(path, `${context}の \`${column}\` が既存 Task を指す`, reference);
      return;
    }
    const taskIds = this.taskIdsFor(`${boltDir}/tasks.md`);
    if (taskIds.has(taskId)) this.pass(path, `${context}の \`${column}\` が既存 Task を指す`, reference);
    else this.failRow(path, `${context}の \`${column}\` が既存 Task を指す`, reference);
  }

  private checkUnitDesignArtifacts(base: string, state: Record<string, any>): void {
    const checkInceptionRequiredArtifacts = String(state.phase ?? "").trim() === "inception";
    const required = new Set((state.inception?.requiredArtifacts ?? []).map((value: unknown) => String(value).trim()));
    const intentBase = this.intentBaseForPhaseBase(base);
    const unitsPath = `${base}/units.md`;
    const unitIds = this.idsFor(unitsPath);
    const unitDirectories = this.unitDirectories(base, unitIds);

    for (const [unitId, unitDir] of unitDirectories.entries()) {
      const unitPath = `${unitDir}.md`;
      const designPath = `${unitDir}/design.md`;
      this.checkFile(unitPath, "Unit のモジュールファイルが存在する");
      this.checkHeadings(unitPath, ["実装対象", "関連成果物"]);
      this.checkImplementationTargets(unitPath, unitId);
      this.checkUnitRelatedDesignLink(unitPath, designPath);
      this.checkFile(designPath, "Unit Design Brief が存在する");
      this.checkHeadings(designPath, unitDesignHeadings);
      this.checkHeadingBodies(designPath, unitDesignHeadings);

      if (checkInceptionRequiredArtifacts) {
        const relativeUnitPath = this.relativeToIntent(intentBase, unitPath);
        const relativeDesignPath = this.relativeToIntent(intentBase, designPath);
        if (required.has(relativeUnitPath)) this.pass(`${intentBase}/state.json`, "Inception 必須成果物に Unit のモジュールファイルが含まれる", relativeUnitPath);
        else this.failRow(`${intentBase}/state.json`, "Inception 必須成果物に Unit のモジュールファイルが含まれる", relativeUnitPath);
        if (required.has(relativeDesignPath)) this.pass(`${intentBase}/state.json`, "Inception 必須成果物に Unit Design Brief が含まれる", relativeDesignPath);
        else this.failRow(`${intentBase}/state.json`, "Inception 必須成果物に Unit Design Brief が含まれる", relativeDesignPath);
      }
    }
  }

  private checkUnitRelatedDesignLink(unitPath: string, designPath: string): void {
    if (!this.isFile(this.absolute(unitPath))) return;
    const tableOrText = this.sectionBody(unitPath, "関連成果物");
    if (!tableOrText) {
      this.failRow(unitPath, "`関連成果物` が design.md へのリンクを持つ", "本文がない");
      return;
    }
    const expected = this.relativeLink(unitPath, designPath);
    const links = this.markdownLinks(tableOrText);
    if (links.some((link) => this.cleanLinkTarget(link) === expected)) {
      this.pass(unitPath, "`関連成果物` が design.md へのリンクを持つ", expected);
    } else {
      this.failRow(unitPath, "`関連成果物` が design.md へのリンクを持つ", links.join(", ") || "リンクなし");
    }
  }

  private checkBoltDesignReferences(base: string): void {
    const unitsPath = `${base}/units.md`;
    const unitIds = this.idsFor(unitsPath);
    const unitDirectories = this.unitDirectories(base, unitIds);
    const designByUnit = new Map([...unitDirectories.entries()].map(([unitId, unitDir]) => [unitId, `${unitDir}/design.md`]));

    const boltsPath = `${base}/bolts.md`;
    if (!this.isFile(this.absolute(boltsPath))) {
      this.failRow(boltsPath, "bolts.md が存在する", "存在しない");
      return;
    }
    const table = this.tableAfterHeading(boltsPath, "一覧");
    if (!table) return;
    if (!table.headers.includes("設計")) {
      this.failRow(boltsPath, "`一覧` の必須表列が揃っている", "不足: 設計");
      return;
    }

    for (const row of table.rows) {
      const boltId = String(row["識別子"] ?? "").trim();
      const unitValues = this.splitValues(row["ユニット"]);
      const distinctUnitValues = [...new Set(unitValues)];
      if (distinctUnitValues.length === unitValues.length) {
        this.pass(boltsPath, "Bolt の `ユニット` が重複しない", boltId);
      } else {
        this.failRow(boltsPath, "Bolt の `ユニット` が重複しない", `${boltId}: ${unitValues.join(", ")}`);
      }
      for (const unitId of unitValues) {
        if (unitIds.has(unitId)) this.pass(boltsPath, "Bolt の `ユニット` が既存 Unit を参照する", `${boltId}: ${unitId}`);
        else this.failRow(boltsPath, "Bolt の `ユニット` が既存 Unit を参照する", `${boltId}: ${unitId}`);
      }
      this.checkDesignLinksForUnits(boltsPath, row["設計"], distinctUnitValues, designByUnit);

      const detailLinks = this.markdownLinks(String(row["詳細"] ?? ""));
      for (const target of detailLinks) {
        const boltPath = this.cleanLinkTarget(target);
        if (boltPath.match(/^bolts\/[^/]+\.md$/)) {
          this.checkBoltDetailDesignReference(join(dirname(boltsPath), boltPath), boltId, distinctUnitValues, designByUnit);
        }
      }
    }
  }

  private checkBoltDetailDesignReference(path: string, boltId: string, unitValues: string[], designByUnit: Map<string, string>): void {
    this.checkHeadings(path, ["対象ユニット", "設計", "実装対象"]);
    const targetUnits = this.bulletsAfterHeading(path, "対象ユニット");
    const designBody = this.sectionBody(path, "設計") ?? "";
    if (targetUnits.length === 0) {
      this.failRow(path, "`対象ユニット` が空でない", `${boltId}: 箇条書きなし`);
    }
    const units = targetUnits.map((item) => item.split(/[：:]/, 1)[0].trim());
    for (const unitId of unitValues) {
      if (units.includes(unitId)) this.pass(path, "`対象ユニット` が bolts.md のユニットを含む", `${boltId}: ${unitId}`);
      else this.failRow(path, "`対象ユニット` が bolts.md のユニットを含む", `${boltId}: ${unitId}`);
    }
    this.checkDesignLinksForUnits(path, designBody, unitValues, designByUnit);
    this.checkImplementationTargets(path, boltId);
    this.checkMultiUnitBoltReason(path, boltId, unitValues);
  }

  private checkImplementationTargets(path: string, ownerId: string): void {
    const table = this.checkTable(path, "実装対象", implementationTargetColumns);
    if (!table) return;

    if (table.rows.length > 0) {
      this.pass(path, "`実装対象` が実装対象行を持つ", `${ownerId}: ${table.rows.length}件`);
    } else {
      this.failRow(path, "`実装対象` が実装対象行を持つ", `${ownerId}: 行がない`);
      return;
    }

    const ids = new Set<string>();
    for (const row of table.rows) {
      const targetId = String(row["識別子"] ?? "").trim();
      this.checkImplementationTargetPrimitive(path, "実装対象 ID が識別子形式に合う", `${ownerId}: ${targetId || "空欄"}`, () => implementationTargetId(targetId));

      if (ids.has(targetId)) this.failRow(path, "実装対象 ID が重複しない", `${ownerId}: ${targetId}`);
      else {
        this.pass(path, "実装対象 ID が重複しない", `${ownerId}: ${targetId}`);
        ids.add(targetId);
      }

      this.checkImplementationTargetValue(path, targetId, "repository", row["repository"], false);
      this.checkImplementationTargetValue(path, targetId, "path", row["path"], false);
      this.checkImplementationTargetValue(path, targetId, "branch", row["branch"], true);
      this.checkImplementationTargetPr(path, targetId, row["PR"]);
      this.checkImplementationTargetCi(path, targetId, row["CI"]);
    }
  }

  private checkImplementationTargetValue(path: string, targetId: string, column: string, value: unknown, allowNone: boolean): void {
    const text = String(value ?? "").trim();
    if (text.length === 0) {
      this.failRow(path, `実装対象の \`${column}\` が空欄でない`, `${targetId}: 空欄`);
      return;
    }
    if (text === "未確認" || (allowNone && text === "なし")) {
      this.pass(path, `実装対象の \`${column}\` が記録可能な値である`, `${targetId}: ${text}`);
      return;
    }
    if (!allowNone && text === "なし") {
      this.failRow(path, `実装対象の \`${column}\` が記録可能な値である`, `${targetId}: ${text}`);
      return;
    }
    const condition = `実装対象の \`${column}\` が記録可能な値である`;
    const evidence = `${targetId}: ${text}`;
    if (column === "repository") {
      this.checkImplementationTargetPrimitive(path, condition, evidence, () => implementationRepository(text));
      return;
    }
    if (column === "path") {
      this.checkImplementationTargetPrimitive(path, condition, evidence, () => implementationPath(text));
      return;
    }
    if (column === "branch") {
      this.checkImplementationTargetPrimitive(path, condition, evidence, () => implementationBranch(text));
      return;
    }
    this.pass(path, condition, evidence);
  }

  private checkImplementationTargetPr(path: string, targetId: string, value: unknown): void {
    for (const target of this.splitValues(value)) {
      if (implementationTargetUnavailableValues.has(target)) {
        this.pass(path, "実装対象の `PR` が任意値または GitHub PR URL である", `${targetId}: ${target}`);
      } else {
        this.checkImplementationTargetPrimitive(
          path,
          "実装対象の `PR` が任意値または GitHub PR URL である",
          `${targetId}: ${target || "空欄"}`,
          () => pullRequestUrl(target),
        );
      }
    }
  }

  private checkImplementationTargetCi(path: string, targetId: string, value: unknown): void {
    for (const target of this.splitValues(value)) {
      if (implementationTargetUnavailableValues.has(target)) {
        this.pass(path, "実装対象の `CI` が任意値または CI 名である", `${targetId}: ${target}`);
      } else {
        this.checkImplementationTargetPrimitive(path, "実装対象の `CI` が任意値または CI 名である", `${targetId}: ${target || "空欄"}`, () => ciName(target));
      }
    }
  }

  private checkImplementationTargetPrimitive(path: string, condition: string, evidence: string, parse: () => unknown): void {
    try {
      parse();
      this.pass(path, condition, evidence);
    } catch {
      this.failRow(path, condition, evidence);
    }
  }

  private checkMultiUnitBoltReason(path: string, boltId: string, unitValues: string[]): void {
    if (unitValues.length <= 1) return;
    const body = this.sectionBody(path, multiUnitBoltReasonHeading);
    if (body && body.trim().length > 0) {
      this.pass(path, "複数 Unit を同じ Bolt で扱う理由を記録する", boltId);
    } else {
      this.failRow(path, "複数 Unit を同じ Bolt で扱う理由を記録する", `${boltId}: \`${multiUnitBoltReasonHeading}\` 見出しまたは本文がない`);
    }
  }

  private checkDesignLinksForUnits(path: string, value: unknown, unitValues: string[], designByUnit: Map<string, string>): void {
    const links = this.markdownLinks(String(value ?? ""));
    for (const unitId of unitValues) {
      const designPath = designByUnit.get(unitId);
      if (!designPath) {
        this.failRow(path, "`設計` が対象 Unit の Unit Design Brief を指す", `${unitId}: Unit 詳細ディレクトリがない`);
        continue;
      }
      const expected = this.relativeLink(path, designPath);
      if (links.some((link) => this.cleanLinkTarget(link) === expected)) {
        this.pass(path, "`設計` が対象 Unit の Unit Design Brief を指す", `${unitId}: ${expected}`);
      } else {
        this.failRow(path, "`設計` が対象 Unit の Unit Design Brief を指す", `${unitId}: ${links.join(", ") || "リンクなし"}`);
      }
    }
  }

  private checkNoInceptionBoltDesignBriefArtifacts(base: string, state: Record<string, any>): void {
    const inceptionBoltArtifacts = (state.inception?.requiredBoltArtifacts ?? []).map((value: unknown) => String(value).trim());
    const intentBase = this.intentBaseForPhaseBase(base);
    for (const artifact of inceptionBoltArtifacts) {
      if (artifact.match(/^(?:inception\/)?bolts\/[^/]+\/design\.md$/)) {
        this.failRow(`${intentBase}/state.json`, "Inception 必須 Bolt 成果物に旧 Bolt Design Brief を含めない", artifact);
      }
    }

    if (String(state.phase ?? "").trim() === "construction") return;

    const boltsRoot = this.absolute(`${base}/bolts`);
    if (!this.isDirectory(boltsRoot)) return;
    const glob = new Bun.Glob("*/design.md");
    for (const design of glob.scanSync({ cwd: boltsRoot })) {
      this.failRow(`${base}/bolts/${design}`, "Inception 段階では Bolt 配下に旧 Bolt Design Brief を置かない", "旧 Bolt Design Brief");
    }
  }

  private checkNoInceptionConstructionArtifacts(base: string): void {
    const constructionBoltsRoot = this.absolute(`${base}/construction/bolts`);
    if (!this.isDirectory(constructionBoltsRoot)) return;
    const glob = new Bun.Glob("*/{tasks,design,notes,test-results,pr}.md");
    for (const artifact of glob.scanSync({ cwd: constructionBoltsRoot })) {
      const condition = artifact.endsWith("/tasks.md")
        ? "Inception は Bolt 配下の tasks.md を持たない"
        : "Inception は Construction 成果物を持たない";
      this.failRow(`${base}/construction/bolts/${artifact}`, condition, "Construction 成果物は Construction で生成する");
    }
  }

  private checkNoInceptionDomainArtifacts(base: string): void {
    const domainRoot = this.absolute(`${base}/domain`);
    if (!this.isDirectory(domainRoot)) return;
    this.failRow(`${base}/domain`, "Inception は Intent 固有 Domain Model 成果物を持たない", "Domain Model は全体 Domain Model または Construction Functional Design で扱う");
  }

  private checkOptionalIndex(path: string, spec: typeof indexSpecs[string]): void {
    this.checkHeadings(path, spec.headings);
    const table = this.checkTable(path, spec.listHeading, spec.columns);
    if (!table) return;

    const ids = this.collectIds(path, table, "識別子", spec.idPattern);
    this.checkDependencyValues(path, table, "依存", ids);
    if (basename(path) === "units.md") this.unitDirectories(dirname(path), ids);
    if (basename(path) === "bolts.md") this.boltDirectories(dirname(path));
    this.checkDetailLinks(path, table, "詳細");
  }

  private checkUnitContextReferences(base: string, requireContext: boolean, contextIndexPath: string, condition: string): void {
    const unitsPath = `${base}/units.md`;
    const table = this.tableAfterHeading(unitsPath, "一覧");
    if (!table || !table.headers.includes("コンテキスト")) return;

    const contextIds = this.idsFor(contextIndexPath);
    for (const row of table.rows) {
      const unitId = String(row["識別子"] ?? "").trim();
      for (const contextId of this.splitValues(row["コンテキスト"])) {
        if (contextId === "未確認" && !requireContext) {
          this.pass(unitsPath, condition, `${unitId}: ${contextId}`);
        } else if (contextIds.has(contextId)) {
          this.pass(unitsPath, condition, `${unitId}: ${contextId}`);
        } else {
          this.failRow(unitsPath, condition, `${unitId}: ${contextId}`);
        }
      }
    }
  }

  private checkGrillings(base: string): void {
    const indexPath = `${base}/grillings.md`;
    const sessionsPath = `${base}/grillings`;
    const hasIndex = this.isFile(this.absolute(indexPath));
    const hasSessions = this.isDirectory(this.absolute(sessionsPath));

    if (!hasIndex && !hasSessions) {
      this.skipped(base, "grilling decision trail は任意である", "grillings なし");
      return;
    }

    if (hasIndex && hasSessions) {
      this.pass(base, "`grillings.md` と `grillings/` が揃っている", "両方あり");
    } else {
      this.failRow(base, "`grillings.md` と `grillings/` が揃っている", hasIndex ? "grillings/ がない" : "grillings.md がない");
      return;
    }

    this.checkFile(indexPath, "grillings 索引が存在する");
    this.checkFile(sessionsPath, "grilling session ディレクトリが存在する", true);
    this.checkHeadings(indexPath, ["一覧"]);
    const table = this.checkTable(indexPath, "一覧", ["ID", "主題", "対象", "状態", "主な確定判断", "反映先", "詳細"]);
    let indexedSessionIds = new Set<string>();
    const indexedSessionStates = new Map<string, string>();
    if (table) {
      const ids = this.collectIds(indexPath, table, "ID", /^G\d{3}$/);
      indexedSessionIds = ids;
      this.checkNotBlank(indexPath, table, "主題");
      this.checkNotBlank(indexPath, table, "対象");
      this.checkNotBlank(indexPath, table, "主な確定判断");
      this.checkNotBlank(indexPath, table, "反映先");
      this.checkDetailLinks(indexPath, table, "詳細");
      for (const row of table.rows) {
        this.checkAllowed(indexPath, "状態", row["状態"], grillingSessionStatusValues);
        const id = String(row["ID"] ?? "").trim();
        const state = String(row["状態"] ?? "").trim();
        if (id.length > 0) indexedSessionStates.set(id, state);
        this.checkGrillingTarget(indexPath, base, "grilling 索引の `反映先` が存在する", row["反映先"], id);
        const detailLinks = this.markdownLinks(String(row["詳細"] ?? "")).map((link) => this.cleanLinkTarget(link));
        const expectedPrefix = `grillings/${id}-`;
        if (id.length > 0 && ids.has(id) && detailLinks.some((link) => link.startsWith(expectedPrefix) && link.endsWith(".md"))) {
          this.pass(indexPath, "`詳細` が対応する grilling session を指す", id);
        } else {
          this.failRow(indexPath, "`詳細` が対応する grilling session を指す", `${id}: ${detailLinks.join(", ") || "リンクなし"}`);
        }
      }
    }

    const entries = readdirSync(this.absolute(sessionsPath)).sort();
    const sessionFiles = entries.filter((entry) => this.isFile(this.absolute(`${sessionsPath}/${entry}`)));
    if (sessionFiles.length > 0) this.pass(sessionsPath, "grilling session ファイルが1件以上ある", `${sessionFiles.length}件`);
    else this.failRow(sessionsPath, "grilling session ファイルが1件以上ある", "0件");

    const allDecisionIds = new Set<string>();
    for (const entry of sessionFiles) {
      const path = `${sessionsPath}/${entry}`;
      const table = this.tableAfterHeading(path, "確定判断");
      if (!table) continue;

      for (const row of table.rows) {
        const decisionId = String(row["ID"] ?? "").trim();
        if (!/^GD\d{3}$/.test(decisionId)) continue;
        if (allDecisionIds.has(decisionId)) {
          this.failRow(path, "grilling 判断 ID が対象 root 内で重複しない", decisionId);
        } else {
          this.pass(path, "grilling 判断 ID が対象 root 内で重複しない", decisionId);
          allDecisionIds.add(decisionId);
        }
      }
    }

    const seenSessionIds = new Set<string>();
    for (const entry of sessionFiles) {
      const path = `${sessionsPath}/${entry}`;
      const sessionId = entry.match(/^(G\d{3})-/)?.[1];
      if (grillingSessionFilePattern.test(entry)) {
        this.pass(path, "grilling session ファイル名が Gnnn-<topic>.md 形式である", entry);
      } else {
        this.failRow(path, "grilling session ファイル名が Gnnn-<topic>.md 形式である", entry);
      }
      if (sessionId) {
        if (seenSessionIds.has(sessionId)) {
          this.failRow(path, "grilling session ID が対象 root 内で重複しない", sessionId);
        } else {
          this.pass(path, "grilling session ID が対象 root 内で重複しない", sessionId);
          seenSessionIds.add(sessionId);
        }
      }
      if (sessionId && indexedSessionIds.has(sessionId)) {
        this.pass(path, "grilling session が `grillings.md` に登録されている", sessionId);
      } else {
        this.failRow(path, "grilling session が `grillings.md` に登録されている", sessionId ?? entry);
      }
      this.checkGrillingSession(base, path, allDecisionIds, sessionId ? indexedSessionStates.get(sessionId) : undefined);
    }
  }

  private checkGrillingSession(base: string, path: string, allDecisionIds: Set<string>, indexedState: string | undefined): void {
    this.checkHeadings(path, ["概要", "確定判断", "質問記録"]);

    const expectedId = basename(path).match(/^(G\d{3})-/)?.[1];
    const title = this.read(path).split(/\r?\n/, 1)[0] ?? "";
    if (!expectedId || title.includes(expectedId)) this.pass(path, "grilling session 見出しがファイル ID を含む", title || "見出しなし");
    else this.failRow(path, "grilling session 見出しがファイル ID を含む", title);

    const sessionState = this.labeledBulletValue(path, "概要", "状態");
    if (sessionState) this.checkAllowed(path, "状態", sessionState, grillingSessionStatusValues);
    else this.failRow(path, "grilling session の `状態` が空欄でない", "空欄");
    if (indexedState && sessionState && indexedState === sessionState) {
      this.pass(path, "grilling 索引と session の `状態` が一致する", String(sessionState).trim());
    } else if (indexedState && sessionState) {
      this.failRow(path, "grilling 索引と session の `状態` が一致する", `${indexedState} != ${sessionState}`);
    }

    const sessionTarget = this.labeledBulletValue(path, "概要", "反映先");
    if (this.blank(sessionTarget)) this.failRow(path, "grilling session の `反映先` が空欄でない", "空欄");
    else {
      this.pass(path, "grilling session の `反映先` が空欄でない", String(sessionTarget).trim());
      this.checkGrillingTarget(path, base, "grilling session の `反映先` が存在する", sessionTarget, expectedId ?? basename(path));
    }

    const table = this.checkTable(path, "確定判断", ["ID", "判断", "状態", "反映先", "置き換え先"]);
    const decisionIds = table ? this.collectIds(path, table, "ID", /^GD\d{3}$/) : new Set<string>();
    if (table) {
      this.checkNotBlank(path, table, "判断");
      for (const row of table.rows) {
        const decisionId = String(row["ID"] ?? "").trim();
        const target = String(row["反映先"] ?? "").trim();
        if (target.length > 0) {
          this.pass(path, "grilling 判断の `反映先` が空欄でない", `${decisionId}: ${target}`);
          this.checkGrillingTarget(path, base, "grilling 判断の `反映先` が存在する", target, decisionId);
        } else {
          this.failRow(path, "grilling 判断の `反映先` が空欄でない", decisionId);
        }

        const state = String(row["状態"] ?? "").trim();
        this.checkAllowed(path, "状態", state, grillingDecisionStatusValues);
        const replacedBy = String(row["置き換え先"] ?? "").trim();
        if (state === "superseded") {
          const replacementIds = this.grillingDecisionReferences(replacedBy);
          if (replacementIds.length > 0) {
            this.pass(path, "superseded の grilling 判断が置き換え先を持つ", `${decisionId}: ${replacementIds.join(", ")}`);
          } else {
            this.failRow(path, "superseded の grilling 判断が置き換え先を持つ", decisionId);
          }
          for (const replacementId of replacementIds) {
            if (allDecisionIds.has(replacementId) && replacementId !== decisionId) {
              this.pass(path, "superseded の grilling 判断が実在する置き換え先を参照する", `${decisionId}: ${replacementId}`);
            } else {
              this.failRow(path, "superseded の grilling 判断が実在する置き換え先を参照する", `${decisionId}: ${replacementId}`);
            }
          }
        }
      }
    }

    this.checkGrillingQuestions(path, allDecisionIds);
  }

  private checkGrillingQuestions(path: string, decisionIds: Set<string>): void {
    const body = this.sectionBody(path, "質問記録");
    if (!body || body.trim().length === 0) {
      this.failRow(path, "grilling session が質問記録を持つ", "本文なし");
      return;
    }

    const questionMatches = [...body.matchAll(/^###\s+(Q\d{3})\s*$/gm)];
    if (questionMatches.length > 0) this.pass(path, "grilling session が質問記録を持つ", `${questionMatches.length}件`);
    else this.failRow(path, "grilling session が質問記録を持つ", "Qnnn 見出しなし");

    for (const [index, match] of questionMatches.entries()) {
      const questionId = match[1];
      const start = match.index ?? 0;
      const end = questionMatches[index + 1]?.index ?? body.length;
      const block = body.slice(start, end);
      const userAnswer = block.match(/^\s*-\s+ユーザー回答:\s*(.*?)\s*$/m)?.[1]?.trim() ?? "";
      if (userAnswer.length > 0) {
        this.pass(path, "質問記録がユーザー回答を持つ", `${questionId}: ${userAnswer}`);
      } else {
        this.failRow(path, "質問記録がユーザー回答を持つ", questionId);
      }
      const references = [...block.matchAll(/^\s*-\s+確定判断:\s*(.*?)\s*$/gm)]
        .flatMap((referenceMatch) => this.grillingDecisionReferences(referenceMatch[1]));
      if (references.length > 0) {
        this.pass(path, "質問記録が確定判断 ID を参照する", `${questionId}: ${references.join(", ")}`);
      } else {
        this.failRow(path, "質問記録が確定判断 ID を参照する", `${questionId}: 参照なし`);
      }

      for (const reference of references) {
        if (decisionIds.has(reference)) this.pass(path, "質問記録の確定判断 ID が確定判断に存在する", `${questionId}: ${reference}`);
        else this.failRow(path, "質問記録の確定判断 ID が確定判断に存在する", `${questionId}: ${reference}`);
      }
    }
  }

  private checkGrillingTarget(path: string, base: string, condition: string, value: unknown, detail: string): void {
    const text = String(value ?? "").trim();
    const links = this.markdownLinks(text);
    const targets = links.length > 0 ? links : this.splitValues(text);
    let inspected = false;
    for (const target of targets) {
      const clean = this.cleanLinkTarget(target);
      if (clean.length === 0) continue;
      inspected = true;
      if (this.externalLink(clean)) {
        this.failRow(path, condition, `${detail}: ${target} は workspace 内の成果物ではない`);
        continue;
      }
      const resolved = this.absolute(join(base, clean));
      if (existsSync(resolved)) {
        this.checkedFiles.add(this.relativePath(resolved));
        this.pass(path, condition, `${detail}: ${target}`);
      } else {
        this.failRow(path, condition, `${detail}: ${target} -> ${this.relativePath(resolved)}`);
      }
    }
    if (!inspected) this.failRow(path, condition, `${detail}: 参照先なし`);
  }

  private grillingDecisionReferences(value: unknown): string[] {
    const text = String(value ?? "").trim();
    if (text.length === 0 || text === "該当なし") return [];
    return [...new Set([...text.matchAll(/\bGD\d{3}\b/g)].map((match) => match[0]))];
  }

  private checkSubdomains(path: string, boundedContextsPath: string, requireContext = false): void {
    this.checkFile(path, "サブドメイン一覧が存在する");
    this.checkHeadings(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["識別子", "名前", "種別", "役割", "コンテキスト"]);
    if (!table) return;

    this.collectIds(path, table, "識別子", /^SD\d{3}$/);
    const allowedTypes = new Set(["コア", "支援", "汎用", "未分類"]);
    const bcIds = this.idsFor(boundedContextsPath);
    for (const row of table.rows) {
      this.checkAllowed(path, "サブドメイン種別", row["種別"], allowedTypes);
      for (const contextId of this.splitValues(row["コンテキスト"])) {
        if (contextId === "なし" && !requireContext) {
          this.pass(path, "コンテキストが同じ階層の bounded-contexts.md に存在する", `${row["識別子"]}: ${contextId}`);
        } else if (bcIds.has(contextId)) {
          this.pass(path, "サブドメインのコンテキストが解決領域の BC を参照する", `${row["識別子"]}: ${contextId}`);
        } else {
          this.failRow(path, "サブドメインのコンテキストが解決領域の BC を参照する", `${row["識別子"]}: ${contextId}`);
        }
      }
    }
  }

  private checkBoundedContexts(path: string, global: boolean, requireRows = false): void {
    this.checkFile(path, "境界づけられたコンテキスト一覧が存在する");
    const headings = global ? ["一覧", "外部境界", "コンテキスト間の依存", "パターン分類"] : ["コンテキスト", "外部境界", "コンテキスト間の依存"];
    const listHeading = global ? "一覧" : "コンテキスト";
    this.checkHeadings(path, headings);

    const table = this.checkTable(path, listHeading, ["識別子", "名前", "サブドメイン", "役割", "モデル", "契約"]);
    const ids = table ? this.collectIds(path, table, "識別子", /^BC\d{3}$/) : new Set<string>();
    if (table) {
      if (requireRows) {
        if (table.rows.length > 0) this.pass(path, "境界づけられたコンテキストが1件以上存在する", `${table.rows.length}件`);
        else this.failRow(path, "境界づけられたコンテキストが1件以上存在する", "行がない");
      }
      this.checkDetailLinks(path, table, "モデル");
      this.checkDetailLinks(path, table, "契約");
      this.checkBoundedContextModuleFiles(path, table);
      this.checkDddModuleIndexes(path, table);
    }

    const boundaryTable = this.checkTable(path, "外部境界", ["コンテキスト", "名前", "役割", "根拠"]);
    if (boundaryTable) {
      for (const row of boundaryTable.rows) {
        const contextId = String(row["コンテキスト"] ?? "").trim();
        if (ids.has(contextId)) this.pass(path, "外部境界のコンテキストが既存 BC である", contextId);
        else this.failRow(path, "外部境界のコンテキストが既存 BC である", contextId);
        this.checkNotBlankValue(path, "名前", row["名前"]);
        this.checkNotBlankValue(path, "役割", row["役割"]);
        this.checkNotBlankValue(path, "根拠", row["根拠"]);
      }
    }
  }

  private checkBoundedContextModuleFiles(path: string, table: Table): void {
    const base = dirname(path);
    for (const row of table.rows) {
      const contextId = String(row["識別子"] ?? "").trim();
      const links = [
        ...this.markdownLinks(String(row["モデル"] ?? "")),
        ...this.markdownLinks(String(row["契約"] ?? "")),
      ].map((link) => this.cleanLinkTarget(link));
      const detailLink = links.find((link) => link.match(/^bounded-contexts\/[^/]+\/(models|contracts)\.md$/));
      const match = detailLink?.match(/^bounded-contexts\/([^/]+)\/(?:models|contracts)\.md$/);
      if (!match || !match[1].startsWith(`${contextId}-`)) {
        this.failRow(path, "境界づけられたコンテキストのモジュールディレクトリを導出できる", `${contextId}: ${links.join(", ") || "リンクなし"}`);
        continue;
      }

      const modulePath = `${base}/bounded-contexts/${match[1]}.md`;
      this.checkFile(modulePath, "境界づけられたコンテキストのモジュールファイルが存在する");
      this.checkHeadings(modulePath, ["目的", "責務", "外部境界", "関連成果物"]);
      this.checkHeadingBodies(modulePath, ["目的", "責務", "外部境界", "関連成果物"]);
    }
  }

  private checkDddModuleIndexes(path: string, table: Table): void {
    const base = dirname(path);
    for (const row of table.rows) {
      const contextId = String(row["識別子"] ?? "").trim();
      const links = this.markdownLinks(String(row["モデル"] ?? "")).map((link) => this.cleanLinkTarget(link));
      const detailLink = links.find((link) => link.match(/^bounded-contexts\/[^/]+\/models\.md$/));
      const match = detailLink?.match(/^bounded-contexts\/([^/]+)\/models\.md$/);
      if (!match || !match[1].startsWith(`${contextId}-`)) continue;
      this.checkDddModules(`${base}/bounded-contexts/${match[1]}/models.md`);
    }
  }

  private checkDddModules(path: string): void {
    if (!this.isFile(this.absolute(path))) return;
    this.checkHeadings(path, ["一覧"]);
    const table = this.checkTable(path, "一覧", ["識別子", "名前", "役割", "詳細"]);
    if (!table) return;

    const ids = this.collectIds(path, table, "識別子", /^DM\d{3}$/);
    this.checkNotBlank(path, table, "名前");
    this.checkNotBlank(path, table, "役割");

    for (const row of table.rows) {
      const moduleId = String(row["識別子"] ?? "").trim();
      if (!ids.has(moduleId)) continue;
      const links = this.markdownLinks(String(row["詳細"] ?? "")).map((link) => this.cleanLinkTarget(link));
      const moduleLink = links.find((link) => link.match(/^models\/[^/]+\.md$/));
      const match = moduleLink?.match(/^models\/([^/]+)\.md$/);
      if (!match || !match[1].startsWith(`${moduleId}-`)) {
        this.failRow(path, "DDD Module の `詳細` が models/<ddd-module-id>-<slug>.md を指す", `${moduleId}: ${links.join(", ") || "リンクなし"}`);
        continue;
      }

      this.pass(path, "DDD Module の `詳細` が models/<ddd-module-id>-<slug>.md を指す", `${moduleId}: ${moduleLink}`);
      const modulePath = `${dirname(path)}/models/${match[1]}.md`;
      this.checkFile(modulePath, "DDD Module のモジュールファイルが存在する");
      this.checkHeadings(modulePath, dddModuleHeadings);
      this.checkHeadingBodies(modulePath, dddModuleHeadings);
      this.checkDddElementTables(modulePath);
    }
  }

  private checkDddElementTables(path: string): void {
    const elementIds = new Set<string>();
    for (const spec of dddElementTableSpecs) {
      if (this.sectionBody(path, spec.heading) === undefined) continue;
      const table = this.checkTable(path, spec.heading, ["識別子", "名前", "役割", "根拠"]);
      if (!table) continue;
      this.checkNotBlank(path, table, "名前");
      this.checkNotBlank(path, table, "役割");
      this.checkNotBlank(path, table, "根拠");

      for (const row of table.rows) {
        const id = String(row["識別子"] ?? "").trim();
        if (id.length === 0) {
          this.failRow(path, `DDD Module の \`${spec.heading}\` 識別子が空欄でない`, "空欄");
          continue;
        }
        if (spec.idPattern.test(id)) this.pass(path, `DDD Module の \`${spec.heading}\` 識別子が形式に合う`, id);
        else this.failRow(path, `DDD Module の \`${spec.heading}\` 識別子が形式に合う`, id);

        if (elementIds.has(id)) this.failRow(path, "DDD Module のモデル要素識別子が重複しない", id);
        else {
          this.pass(path, "DDD Module のモデル要素識別子が重複しない", id);
          elementIds.add(id);
        }
      }
    }
  }

  private checkFile(path: string, condition: string, directory = false): void {
    const target = this.absolute(path);
    const ok = directory ? this.isDirectory(target) : this.isFile(target);
    if (ok) {
      this.checkedFiles.add(this.relativePath(target));
      this.pass(path, condition, "存在を確認");
    } else {
      this.failRow(path, condition, "存在しない");
    }
  }

  private checkHeadings(path: string, headings: string[]): void {
    if (!this.isFile(this.absolute(path))) return;
    const text = this.read(path);
    for (const heading of headings) {
      if (new RegExp(`^##\\s+${this.escapeRegExp(heading)}\\s*$`, "m").test(text)) {
        this.pass(path, `\`${heading}\` 見出しがある`, "見出しを確認");
      } else {
        this.failRow(path, `\`${heading}\` 見出しがある`, "見出しがない");
      }
    }
  }

  private checkHeadingBodies(path: string, headings: string[]): void {
    if (!this.isFile(this.absolute(path))) return;
    for (const heading of headings) {
      const body = this.sectionBody(path, heading);
      if (body && body.trim().length > 0) this.pass(path, `\`${heading}\` 見出しに本文がある`, "本文を確認");
      else this.failRow(path, `\`${heading}\` 見出しに本文がある`, "本文がない");
    }
  }

  private checkTable(path: string, heading: string, requiredColumns: string[]): Table | undefined {
    if (!this.isFile(this.absolute(path))) return undefined;
    const table = this.tableAfterHeading(path, heading);
    if (!table) {
      this.failRow(path, `\`${heading}\` の表がある`, "表がない");
      return undefined;
    }

    const missing = requiredColumns.filter((column) => !table.headers.includes(column));
    if (missing.length === 0) {
      this.pass(path, `\`${heading}\` の必須表列が揃っている`, requiredColumns.join(", "));
    } else {
      this.failRow(path, `\`${heading}\` の必須表列が揃っている`, `不足: ${missing.join(", ")}`);
    }
    return table;
  }

  private checkSubheadingTable(path: string, heading: string, subheading: string, requiredColumns: string[]): Table | undefined {
    if (!this.isFile(this.absolute(path))) return undefined;
    const table = this.tableAfterSubheading(path, heading, subheading);
    if (!table) {
      this.failRow(path, `\`${heading}\` の \`${subheading}\` の表がある`, "表がない");
      return undefined;
    }

    const missing = requiredColumns.filter((column) => !table.headers.includes(column));
    if (missing.length === 0) {
      this.pass(path, `\`${heading}\` の \`${subheading}\` の必須表列が揃っている`, requiredColumns.join(", "));
    } else {
      this.failRow(path, `\`${heading}\` の \`${subheading}\` の必須表列が揃っている`, `不足: ${missing.join(", ")}`);
    }
    return table;
  }

  private collectIds(path: string, table: Table, column: string, pattern?: RegExp): Set<string> {
    const ids = new Set<string>();
    for (const row of table.rows) {
      const id = String(row[column] ?? "").trim();
      if (id.length === 0) {
        this.failRow(path, `${column} が空欄でない`, "空欄");
        continue;
      }
      if (pattern && !pattern.test(id)) this.failRow(path, `${column} が識別子形式に合う`, id);
      else this.pass(path, `${column} が識別子形式に合う`, id);
      if (ids.has(id)) this.failRow(path, `${column} が重複しない`, id);
      else {
        this.pass(path, `${column} が重複しない`, id);
        ids.add(id);
      }
    }
    this.knownIds.set(path, ids);
    return ids;
  }

  private idsFor(path: string): Set<string> {
    const known = this.knownIds.get(path);
    if (known) return known;
    if (!this.isFile(this.absolute(path))) return new Set();
    const heading = path.endsWith("/domain/bounded-contexts.md") || path === ".amadeus/domain/bounded-contexts.md"
      ? (path.startsWith(".amadeus/intents/") ? "コンテキスト" : "一覧")
      : "一覧";
    const table = this.tableAfterHeading(path, heading);
    if (!table || !table.headers.includes("識別子")) return new Set();
    const ids = new Set(table.rows.map((row) => String(row["識別子"] ?? "").trim()).filter(Boolean));
    this.knownIds.set(path, ids);
    return ids;
  }

  private checkDependencyValues(path: string, table: Table, column: string, ids: Set<string>): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) {
      for (const dependency of this.splitValues(row[column])) {
        if (dependency === "なし" || ids.has(dependency)) this.pass(path, `\`${column}\` がなしまたは同じ一覧内の既存 ID である`, dependency);
        else this.failRow(path, `\`${column}\` がなしまたは同じ一覧内の既存 ID である`, dependency);
      }
    }
  }

  private checkTableTargets(path: string, table: Table, column: string, ids: Set<string>, allowNone: boolean): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) {
      for (const target of this.splitValues(row[column])) {
        if ((allowNone && target === "なし") || ids.has(target)) this.pass(path, `\`${column}\` が一覧内の既存 ID である`, target);
        else this.failRow(path, `\`${column}\` が一覧内の既存 ID である`, target);
      }
    }
  }

  private checkNotBlank(path: string, table: Table, column: string): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) this.checkNotBlankValue(path, column, row[column]);
  }

  private checkNotBlankValue(path: string, column: string, value: unknown): void {
    if (this.blank(value)) this.failRow(path, `\`${column}\` が空欄でない`, "空欄");
    else this.pass(path, `\`${column}\` が空欄でない`, String(value).trim());
  }

  private checkDetailLinks(path: string, table: Table, column: string): void {
    if (!table.headers.includes(column)) return;
    for (const row of table.rows) {
      const links = this.markdownLinks(String(row[column] ?? ""));
      if (links.length === 0) {
        this.failRow(path, `\`${column}\` が相対リンクを持つ`, String(row[column] ?? ""));
        continue;
      }
      for (const target of links) this.checkLink(path, target);
    }
  }

  private checkIntentDetailLinks(path: string, table: Table, ids: Set<string>): void {
    if (!table.headers.includes("詳細")) return;
    for (const row of table.rows) {
      const id = String(row["識別子"] ?? "").trim();
      const links = this.markdownLinks(String(row["詳細"] ?? ""));
      if (links.length === 0) {
        this.failRow(path, "`詳細` が相対リンクを持つ", String(row["詳細"] ?? ""));
        continue;
      }
      for (const target of links) {
        this.checkLink(path, target);
        const clean = this.cleanLinkTarget(target);
        const match = clean.match(/^intents\/([^/]+)\.md$/);
        if (!match) {
          this.failRow(path, "`詳細` が intents/<intent-id>-<slug>.md を指す", target);
          continue;
        }
        const intentId = match[1];
        if (intentId === id) this.pass(path, "`詳細` の Intent ID が識別子と一致する", intentId);
        else this.failRow(path, "`詳細` の Intent ID が識別子と一致する", `${intentId} != ${id}`);
        if (ids.has(intentId)) this.pass(path, "`詳細` の Intent ID が一覧内に存在する", intentId);
        else this.failRow(path, "`詳細` の Intent ID が一覧内に存在する", intentId);
      }
    }
  }

  private checkIntentStateDirectories(table: Table, ids: Set<string>): void {
    for (const row of table.rows) {
      const id = String(row["識別子"] ?? "").trim();
      if (!ids.has(id)) continue;
      this.checkFile(`.amadeus/intents/${id}`, "Intent モジュールディレクトリが存在する", true);
      this.checkFile(`.amadeus/intents/${id}/state.json`, "Intent 状態ファイルが存在する");
    }
  }

  private checkRelativeLinks(path: string): void {
    if (!this.isFile(this.absolute(path))) return;
    for (const target of this.markdownLinks(this.read(path))) this.checkLink(path, target);
  }

  private checkLink(path: string, target: string): void {
    if (this.externalLink(target)) return;
    const clean = this.cleanLinkTarget(target);
    if (clean.length === 0) return;
    const resolved = this.linkPath(path, target);
    if (existsSync(resolved)) {
      this.checkedFiles.add(this.relativePath(resolved));
      this.pass(path, "相対リンクの参照先が存在する", target);
    } else {
      this.failRow(path, "相対リンクの参照先が存在する", `${target} -> ${this.relativePath(resolved)}`);
    }
  }

  private tableAfterHeading(path: string, heading: string): Table | undefined {
    const lines = this.read(path).split(/\r?\n/);
    const headingIndex = lines.findIndex((line) => new RegExp(`^##\\s+${this.escapeRegExp(heading)}\\s*$`).test(line));
    if (headingIndex < 0) return undefined;

    let index = headingIndex + 1;
    while (index < lines.length && !lines[index].startsWith("|") && !lines[index].startsWith("## ")) index += 1;
    if (index >= lines.length || !lines[index].startsWith("|")) return undefined;

    const tableLines: string[] = [];
    while (index < lines.length && lines[index].startsWith("|")) {
      tableLines.push(lines[index]);
      index += 1;
    }
    if (tableLines.length < 2) return undefined;

    const headers = this.splitTableLine(tableLines[0]);
    const rows = tableLines.slice(2).map((line) => {
      const values = this.splitTableLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
    return { headers, rows };
  }

  private tableAfterSubheading(path: string, heading: string, subheading: string): Table | undefined {
    const lines = this.read(path).split(/\r?\n/);
    const headingIndex = lines.findIndex((line) => new RegExp(`^##\\s+${this.escapeRegExp(heading)}\\s*$`).test(line));
    if (headingIndex < 0) return undefined;

    let subheadingIndex = -1;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      if (/^##\s+/.test(lines[index])) break;
      if (new RegExp(`^###\\s+${this.escapeRegExp(subheading)}\\s*$`).test(lines[index])) {
        subheadingIndex = index;
        break;
      }
    }
    if (subheadingIndex < 0) return undefined;

    let index = subheadingIndex + 1;
    while (index < lines.length && !lines[index].startsWith("|") && !/^#{2,3}\s+/.test(lines[index])) index += 1;
    if (index >= lines.length || !lines[index].startsWith("|")) return undefined;

    const tableLines: string[] = [];
    while (index < lines.length && lines[index].startsWith("|")) {
      tableLines.push(lines[index]);
      index += 1;
    }
    if (tableLines.length < 2) return undefined;

    const headers = this.splitTableLine(tableLines[0]);
    const rows = tableLines.slice(2).map((line) => {
      const values = this.splitTableLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
    return { headers, rows };
  }

  private splitTableLine(line: string): string[] {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((value) => value.trim());
  }

  private splitValues(value: unknown): string[] {
    const text = String(value ?? "").trim();
    if (text.length === 0) return [""];
    return text.split(",").map((item) => item.trim()).filter(Boolean);
  }

  private taskReferencesInText(text: string): string[] {
    return [...new Set([...text.matchAll(/\bB\d{3}\/T\d{3}\b/g)].map((match) => match[0]))];
  }

  private taskIdsFor(path: string): Set<string> {
    if (!this.isFile(this.absolute(path))) return new Set();
    const text = this.read(path);
    return new Set([...text.matchAll(/^- \[[ xX]\] (T\d{3}):/gm)].map((match) => match[1]));
  }

  private taskLabelValues(block: string, label: string): string[] {
    const match = block.match(new RegExp(`^\\s+- ${this.escapeRegExp(label)}:\\s*(.*?)\\s*$`, "m"));
    if (!match) return [];
    return this.splitValues(match[1]);
  }

  private bulletsAfterHeading(path: string, heading: string): string[] {
    const body = this.sectionBody(path, heading);
    if (!body) return [];
    return body.split(/\r?\n/)
      .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.trim())
      .filter((value): value is string => Boolean(value));
  }

  private labeledBulletValue(path: string, heading: string, label: string): string | undefined {
    const body = this.sectionBody(path, heading);
    if (!body) return undefined;
    const match = body.match(new RegExp(`^\\s*-\\s+${this.escapeRegExp(label)}:\\s*(.*?)\\s*$`, "m"));
    return match?.[1]?.trim();
  }

  private sectionBody(path: string, heading: string): string | undefined {
    if (!this.isFile(this.absolute(path))) return undefined;
    const lines = this.read(path).split(/\r?\n/);
    const headingIndex = lines.findIndex((line) => new RegExp(`^##\\s+${this.escapeRegExp(heading)}\\s*$`).test(line));
    if (headingIndex < 0) return undefined;
    const bodyLines: string[] = [];
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      if (/^##\s+/.test(lines[index])) break;
      bodyLines.push(lines[index]);
    }
    return bodyLines.join("\n");
  }

  private markdownLinks(text: string): string[] {
    return [...text.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
  }

  private externalLink(target: string): boolean {
    return target.startsWith("#") || target.startsWith("mailto:") || /^https?:\/\//.test(target);
  }

  private checkJsonValue(path: string, key: string, actual: unknown, expected: string): void {
    const value = String(actual ?? "").trim();
    if (value === expected) this.pass(path, `\`${key}\` が ${expected} である`, value);
    else this.failRow(path, `\`${key}\` が ${expected} である`, value);
  }

  private checkAllowed(path: string, column: string, actual: unknown, allowed: Set<string>): void {
    const value = String(actual ?? "").trim();
    if (allowed.has(value)) this.pass(path, `\`${column}\` が許可値である`, value);
    else this.failRow(path, `\`${column}\` が許可値である`, value);
  }

  private read(path: string): string {
    const target = this.absolute(path);
    this.checkedFiles.add(this.relativePath(target));
    return readFileSync(target, "utf8");
  }

  private absolute(path: string): string {
    return isAbsolute(path) ? path : join(this.root, path);
  }

  private relativePath(path: string): string {
    return relative(this.root, resolve(path)) || ".";
  }

  private linkPath(path: string, target: string): string {
    return this.absolute(join(dirname(path), this.cleanLinkTarget(target)));
  }

  private cleanLinkTarget(target: string): string {
    return target.split("#", 2)[0].split(/\s+/, 2)[0] ?? "";
  }

  private relativeLink(fromPath: string, toPath: string): string {
    return relative(dirname(fromPath), toPath).replaceAll("\\", "/");
  }

  private relativeToIntent(base: string, path: string): string {
    return relative(base, path).replaceAll("\\", "/");
  }

  private intentBaseForPhaseBase(base: string): string {
    const phase = basename(base);
    if (phase === "ideation" || phase === "inception" || phase === "construction") {
      return dirname(base);
    }
    return base;
  }

  private inceptionBaseForStatePath(path: string): string {
    return `${dirname(path)}/inception`;
  }

  private constructionBaseForStatePath(path: string): string {
    return `${dirname(path)}/construction`;
  }

  private intentBaseForConstructionBoltArtifact(path: string): string {
    return dirname(dirname(dirname(dirname(path))));
  }

  private unitDirectories(base: string, unitIds: Set<string>): Map<string, string> {
    const results = new Map<string, string>();
    const unitsPath = `${base}/units.md`;
    if (!this.isFile(this.absolute(unitsPath))) return results;
    const table = this.tableAfterHeading(unitsPath, "一覧");
    if (!table) return results;
    if (!table.headers.includes("詳細")) return results;

    for (const row of table.rows) {
      const unitId = String(row["識別子"] ?? "").trim();
      if (!unitIds.has(unitId)) continue;
      const links = this.markdownLinks(String(row["詳細"] ?? "")).map((link) => this.cleanLinkTarget(link));
      const unitLink = links.find((link) => link.match(/^units\/[^/]+\.md$/));
      const match = unitLink?.match(/^units\/([^/]+)\.md$/);
      if (match && match[1].startsWith(`${unitId}-`)) {
        this.pass(unitsPath, "`詳細` が units/<unit-id>-<slug>.md を指す", `${unitId}: ${unitLink}`);
        results.set(unitId, `${base}/units/${match[1]}`);
      } else {
        this.failRow(unitsPath, "`詳細` が units/<unit-id>-<slug>.md を指す", `${unitId}: ${links.join(", ") || "リンクなし"}`);
      }
    }
    for (const unitId of unitIds) {
      if (!results.has(unitId)) this.failRow(`${base}/units.md`, "`詳細` が units/<unit-id>-<slug>.md を指す", unitId);
    }
    return results;
  }

  private boltDirectories(base: string): Map<string, string> {
    const results = new Map<string, string>();
    const boltsPath = `${base}/bolts.md`;
    if (!this.isFile(this.absolute(boltsPath))) return results;
    const table = this.tableAfterHeading(boltsPath, "一覧");
    if (!table || !table.headers.includes("詳細")) return results;

    for (const row of table.rows) {
      const boltId = String(row["識別子"] ?? "").trim();
      const links = this.markdownLinks(String(row["詳細"] ?? "")).map((link) => this.cleanLinkTarget(link));
      const boltLink = links.find((link) => link.match(/^bolts\/[^/]+\.md$/));
      const match = boltLink?.match(/^bolts\/([^/]+)\.md$/);
      if (match && match[1].startsWith(`${boltId}-`)) {
        this.pass(boltsPath, "`詳細` が bolts/<bolt-id>-<slug>.md を指す", `${boltId}: ${boltLink}`);
        results.set(boltId, `${base}/bolts/${match[1]}`);
      } else {
        this.failRow(boltsPath, "`詳細` が bolts/<bolt-id>-<slug>.md を指す", `${boltId}: ${links.join(", ") || "リンクなし"}`);
      }
    }
    return results;
  }

  private constructionBoltDirectories(inceptionBase: string, constructionBase: string): Map<string, string> {
    const inceptionDirectories = this.boltDirectories(inceptionBase);
    return new Map([...inceptionDirectories.entries()].map(([boltId, boltDir]) => [boltId, `${constructionBase}/bolts/${basename(boltDir)}`]));
  }

  private isFile(path: string): boolean {
    return existsSync(path) && statSync(path).isFile();
  }

  private isDirectory(path: string): boolean {
    return existsSync(path) && statSync(path).isDirectory();
  }

  private pass(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "pass", evidence });
  }

  private recordCheckResults(results: CheckResult[]): void {
    this.rows.push(...results);
  }

  private failRow(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "fail", evidence });
  }

  private warningRow(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "warning", evidence });
  }

  private blocked(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "blocked", evidence });
  }

  private skipped(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "skipped", evidence });
  }

  private failed(): boolean {
    return this.rows.some((row) => row.result === "fail");
  }

  private blockedResult(): boolean {
    return this.rows.some((row) => row.result === "blocked");
  }

  private overallResult(): "pass" | "fail" | "blocked" {
    if (this.failed()) return "fail";
    if (this.blockedResult()) return "blocked";
    return "pass";
  }

  private report(): string {
    const failing = this.rows.filter((row) => row.result === "fail");
    const blocking = this.rows.filter((row) => row.result === "blocked");
    const warnings = this.rows.filter((row) => row.result === "warning");
    const passed = this.rows.filter((row) => row.result === "pass");
    const skippedRows = this.rows.filter((row) => row.result === "skipped");

    const lines: string[] = [];
    lines.push("# Amadeus Validator 結果", "", "## 判定", "", this.overallResult(), "", "## 検査サマリ", "");
    lines.push(...this.summaryTable(), "", "## 確認対象", "", ...this.checkedFilesReport(), "", "## 満たしている条件", "");
    const passedSummary = this.summarize(passed);
    lines.push(...(passedSummary.length > 0 ? passedSummary.map((item) => `- ${item}`) : ["- なし"]));
    lines.push("", "## 検査対象外", "");
    const skippedSummary = [...new Set(skippedRows.map((row) => `${row.target}: ${row.condition}。対象: ${row.evidence}`))];
    lines.push(...(skippedSummary.length > 0 ? skippedSummary.map((item) => `- ${item}`) : ["- なし"]));
    lines.push("", "## 警告", "");
    if (warnings.length === 0) {
      lines.push("- なし");
    } else {
      for (const row of warnings) lines.push(`- \`${row.target}\`: ${row.condition}。根拠: ${row.evidence}`);
    }
    lines.push("", "## 不足または矛盾", "");
    if (failing.length === 0 && blocking.length === 0) {
      lines.push("- なし");
    } else {
      for (const row of [...failing, ...blocking]) lines.push(`- \`${row.target}\`: ${row.condition}。根拠: ${row.evidence}`);
    }
    lines.push("", "## 次に使う Amadeus skill", "", "- なし", "");
    lines.push("補足: `pass` は実行時参照に必要な最低限の構造条件を満たすという意味で、gate 通過や内容妥当性の承認ではない。");
    return lines.join("\n");
  }

  private summaryTable(): string[] {
    const categories = new Map<string, Row[]>();
    for (const row of this.rows.filter((row) => row.result !== "skipped")) {
      const category = this.categoryFor(row);
      categories.set(category, [...(categories.get(category) ?? []), row]);
    }
    const lines = ["| 検査カテゴリ | pass | warning | fail | blocked |", "|---|---:|---:|---:|---:|"];
    for (const [category, rows] of [...categories.entries()].sort(([a], [b]) => a.localeCompare(b, "ja"))) {
      lines.push(`| ${category} | ${rows.filter((row) => row.result === "pass").length} | ${rows.filter((row) => row.result === "warning").length} | ${rows.filter((row) => row.result === "fail").length} | ${rows.filter((row) => row.result === "blocked").length} |`);
    }
    return lines;
  }

  private summarize(rows: Row[]): string[] {
    const categories = new Map<string, Row[]>();
    for (const row of rows) {
      const category = this.categoryFor(row);
      categories.set(category, [...(categories.get(category) ?? []), row]);
    }
    return [...categories.entries()].sort(([a], [b]) => a.localeCompare(b, "ja")).map(([category, categoryRows]) => {
      const targets = new Set(categoryRows.map((row) => row.target));
      return `${category}: ${categoryRows.length}件 pass、対象 ${targets.size}件`;
    });
  }

  private checkedFilesReport(): string[] {
    if (this.checkedFiles.size === 0) return ["- なし"];
    const grouped = new Map<string, string[]>();
    for (const file of [...this.checkedFiles].sort()) {
      const category = this.checkedFileCategory(file);
      grouped.set(category, [...(grouped.get(category) ?? []), file]);
    }
    const ordered = [...grouped.entries()].sort(([a], [b]) => this.checkedFileCategoryOrder(a) - this.checkedFileCategoryOrder(b));
    const lines = ["| 対象カテゴリ | 件数 |", "|---|---:|"];
    for (const [category, files] of ordered) lines.push(`| ${category} | ${files.length} |`);
    for (const [category, files] of ordered) {
      lines.push("", `### ${category}`, "");
      for (const file of files) lines.push(`- \`${file}\``);
    }
    return lines;
  }

  private checkedFileCategory(file: string): string {
    if (file === ".amadeus") return "Amadeus ルート";
    if (file.includes("/grillings/") || file.endsWith("/grillings.md")) return "Grilling Decision Trail";
    if (file.startsWith(".amadeus/discoveries/")) return "Discovery";
    if (file.startsWith(".amadeus/event-storming/")) return "Event Storming";
    if (file.startsWith(".amadeus/steering/") || file === ".amadeus/steering" || file === ".amadeus/steering.md") return "Steering";
    if (/^\.amadeus\/[^/]+\.md$/.test(file)) return "全体成果物";
    if (file.startsWith(".amadeus/domain/")) return "全体ドメイン";
    if (/^\.amadeus\/intents\/[^/]+\/state\.json$/.test(file)) return "Intent 状態";
    if (/^\.amadeus\/intents\/[^/]+\/event-storming\//.test(file)) return "Event Storming";
    if (/^\.amadeus\/intents\/[^/]+\/mocks\//.test(file)) return "Intent モック";
    if (/^\.amadeus\/intents\/[^/]+\/[^/]+\.md$/.test(file)) return "Intent 基本成果物";
    if (/^\.amadeus\/intents\/[^/]+\/domain\//.test(file)) return "Intent ドメイン";
    if (/^\.amadeus\/intents\/[^/]+\/bolts\//.test(file)) return "Bolt / Task";
    if (/^\.amadeus\/intents\/[^/]+\/requirements\//.test(file)) return "Requirement 詳細";
    if (/^\.amadeus\/intents\/[^/]+\/user-stories\//.test(file)) return "Story 詳細";
    if (/^\.amadeus\/intents\/[^/]+\/use-cases\//.test(file)) return "Use Case 詳細";
    if (/^\.amadeus\/intents\/[^/]+\/units\//.test(file)) return "Unit 詳細";
    if (/^\.amadeus\/intents\/[^/]+\/decisions\//.test(file)) return "Decision 詳細";
    return "その他";
  }

  private checkedFileCategoryOrder(category: string): number {
    return [
      "Amadeus ルート",
      "全体成果物",
      "Grilling Decision Trail",
      "Discovery",
      "Event Storming",
      "全体ドメイン",
      "Intent 状態",
      "Intent 基本成果物",
      "Intent モック",
      "Intent ドメイン",
      "Requirement 詳細",
      "Story 詳細",
      "Use Case 詳細",
      "Unit 詳細",
      "Bolt / Task",
      "Decision 詳細",
      "その他",
    ].indexOf(category);
  }

  private categoryFor(row: Row): string {
    const condition = row.condition;
    const target = row.target;
    if (target.includes("/grillings") || condition.includes("grilling")) return "Grilling Decision Trail";
    if (condition.includes("作業ディレクトリ") || condition.includes("成果物ルート")) return "実行環境";
    if (target.includes("/event-storming/") || condition.includes("Event Storming") || condition.includes("Domain Event")) return "Event Storming";
    if (target.includes(".amadeus/discoveries") || condition.includes("Discovery") || condition.includes("Intent 候補")) return "Discovery";
    if (condition.includes("対象 Intent ディレクトリ名")) return "検証範囲";
    if (condition.includes("`initialized`")) return "状態";
    if (target.includes("/ideation.md") || target.includes("/scope.md") || condition.includes("Ideation") || condition.includes("Inception")) return "Ideation";
    if (target.endsWith("state.json") || condition.includes("state.json") || condition.includes("`phase`") || condition.includes("`status`")) return "状態";
    if (target.includes("/mocks/") || condition.includes("モック") || condition.includes(".puml")) return "モック";
    if (condition.includes("存在する") && !condition.includes("参照先")) return "ファイル存在";
    if (condition.includes("見出し")) return "見出し";
    if (condition.includes("表列") || condition.includes("表がある")) return "表列";
    if (condition.includes("識別子")) return "識別子";
    if (condition.includes("相対リンク") || condition.includes("を指す")) return "リンク参照";
    if (condition.includes("依存")) return "依存関係";
    if (condition.includes("一覧内の既存 ID")) return "Index ID参照";
    if (condition.includes("空欄")) return "空欄";
    if (target.includes("bounded-contexts.md") || target.includes("subdomains.md") || condition.includes("コンテキスト") || condition.includes("許可値")) return "ドメイン境界";
    return "その他";
  }

  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private typeName(value: unknown): string {
    if (Array.isArray(value)) return "Array";
    if (value === null) return "null";
    return typeof value;
  }

  private blank(value: unknown): boolean {
    return value === undefined || value === null || String(value).trim().length === 0;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

const root = process.argv[2] ?? process.cwd();
const intentId = process.argv[3];
const result = new AmadeusValidator(root, intentId).run();
console.log(result);

const status = result.match(/^pass$|^fail$|^blocked$/m)?.[0];
if (status === "pass") process.exit(0);
if (status === "blocked") process.exit(2);
process.exit(1);
