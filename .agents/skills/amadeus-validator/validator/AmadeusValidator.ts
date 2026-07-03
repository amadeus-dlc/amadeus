#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { cleanMarkdownLinkTarget } from "./domain/artifact-links";
import { buildIntentsIndex, HeadingContractViolationError } from "../scripts/IndexGenerate";
import { checkAidlcIntentRecord } from "./lifecycle-v2";
import { spaceBase } from "./space-paths";

type Result = "pass" | "warning" | "fail" | "blocked" | "skipped";

type Row = {
  target: string;
  condition: string;
  result: Result;
  evidence: string;
};

type RowCategoryRule = {
  category: string;
  matches: (row: Row) => boolean;
};

type CheckedFileCategoryRule = {
  category: string;
  matches: (file: string) => boolean;
};

type GrillingIndexState = {
  sessionIds: Set<string>;
  sessionStates: Map<string, string>;
};

type Table = {
  headers: string[];
  rows: Record<string, string>[];
};
const intentDirectoryPattern = /^\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const registryStatusValues = new Set(["in_progress", "parked", "completed"]);
const registryScopeValues = new Set(["enterprise", "feature", "mvp", "poc", "bugfix", "refactor", "infra", "security-patch", "workshop"]);
const eventStormingDirectoryPattern = /^ES\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const eventStormingStatusValues = new Set(["draft", "reviewing", "ready", "superseded"]);
const eventStormingLevelValues = new Set(["big-picture", "process-modeling", "system-design"]);
const eventStormingScopeValues = new Set(["pre-intent", "intent-scoped"]);
const eventStormingNextSkillValues = new Set([
  "amadeus",
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
const intentGoalTypeValues = new Set(["business", "technical", "mixed", "未確認"]);
const ideationExecutionScopeValues = new Set(["enterprise", "feature", "mvp", "poc", "bugfix", "refactor", "infra", "security-patch", "workshop", "未確認"]);
const grillingSessionFilePattern = /^G\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const grillingSessionStatusValues = new Set(["active", "completed", "superseded"]);
const grillingDecisionStatusValues = new Set(["active", "superseded"]);
const domainMapStatusValues = new Set(["adopted", "retired"]);
const subdomainTypeValues = new Set(["コア", "支援", "汎用", "未分類"]);
const organizationPatternValues = new Set(["パートナーシップ", "別々の道", "順応者", "顧客／供給者"]);
const integrationPatternValues = new Set(["共有カーネル", "巨大な泥団子", "公開ホストサービス（OHS）", "公表された言語（PL）", "腐敗防止層（ACL）"]);

const rowCategoryRules: RowCategoryRule[] = [
  {
    category: "v2 ライフサイクル",
    matches: ({ condition }) =>
      condition.includes("aidlc-state.md") ||
      condition.includes("Stage Progress") ||
      condition.includes("Phase Progress") ||
      condition.includes("checkbox") ||
      condition.includes("scope の実行対象") ||
      condition.includes("scope 外のステージ") ||
      condition.includes("イベントを持つ") ||
      condition.includes("WORKFLOW_STARTED") ||
      condition.includes("WORKFLOW_COMPLETED") ||
      condition.includes("audit の主 shard") ||
      condition.includes("先行 phase") ||
      condition === "completed のステージは必須成果物を持つ",
  },
  {
    category: "Intent Registry",
    matches: ({ target, condition }) => target.endsWith("intents.json") || target.endsWith("active-intent") || condition.includes("registry"),
  },
  {
    category: "Index 生成整合",
    matches: ({ condition }) => condition.startsWith("Index 生成整合"),
  },
  {
    category: "Grilling Decision Trail",
    matches: ({ target, condition }) => target.includes("/grillings") || condition.includes("grilling"),
  },
  {
    category: "実行環境",
    matches: ({ condition }) => condition.includes("作業ディレクトリ") || condition.includes("成果物ルート"),
  },
  {
    category: "Event Storming",
    matches: ({ target, condition }) => target.includes("/event-storming/") || condition.includes("Event Storming") || condition.includes("Domain Event"),
  },
  {
    category: "検証範囲",
    matches: ({ condition }) => condition.includes("対象 Intent ディレクトリ名"),
  },
  {
    category: "状態",
    matches: ({ condition }) => condition.includes("`initialized`"),
  },
  {
    category: "Ideation",
    matches: ({ target, condition }) => target.includes("/ideation.md") || target.includes("/scope.md") || condition.includes("Ideation") || condition.includes("Inception"),
  },
  {
    category: "状態",
    matches: ({ target, condition }) =>
      target.endsWith("state.json") || target.endsWith("aidlc-state.md") || condition.includes("state.json") || condition.includes("`phase`") || condition.includes("`status`"),
  },
  {
    category: "モック",
    matches: ({ target, condition }) => target.includes("/mocks/") || condition.includes("モック") || condition.includes(".puml"),
  },
  {
    category: "ファイル存在",
    matches: ({ condition }) => condition.includes("存在する") && !condition.includes("参照先"),
  },
  {
    category: "見出し",
    matches: ({ condition }) => condition.includes("見出し"),
  },
  {
    category: "表列",
    matches: ({ condition }) => condition.includes("表列") || condition.includes("表がある"),
  },
  {
    category: "識別子",
    matches: ({ condition }) => condition.includes("識別子"),
  },
  {
    category: "リンク参照",
    matches: ({ condition }) => condition.includes("相対リンク") || condition.includes("を指す"),
  },
  {
    category: "依存関係",
    matches: ({ condition }) => condition.includes("依存"),
  },
  {
    category: "Index ID参照",
    matches: ({ condition }) => condition.includes("一覧内の既存 ID"),
  },
  {
    category: "空欄",
    matches: ({ condition }) => condition.includes("空欄"),
  },
  {
    category: "ドメイン境界",
    matches: ({ target, condition }) => target.includes("domain-map.md") || target.includes("context-map.md") || condition.includes("コンテキスト") || condition.includes("Domain Map") || condition.includes("Context Map") || condition.includes("許可値"),
  },
];

const spacePrefix = /^aidlc\/spaces\/[^/]+\//;
const intentRecordPrefix = /^aidlc\/spaces\/[^/]+\/intents\/[^/]+\//;

const checkedFileCategoryRules: CheckedFileCategoryRule[] = [
  {
    category: "Amadeus ルート",
    matches: (file) => file === "aidlc" || /^aidlc\/spaces\/[^/]+$/.test(file),
  },
  {
    category: "Grilling Decision Trail",
    matches: (file) => file.includes("/grillings/") || file.endsWith("/grillings.md"),
  },
  {
    category: "Event Storming",
    matches: (file) => file.includes("/event-storming/"),
  },
  {
    category: "Memory",
    matches: (file) => spacePrefix.test(file) && file.replace(spacePrefix, "").startsWith("memory"),
  },
  {
    category: "全体ドメイン",
    matches: (file) => file.endsWith("/knowledge/domain-map.md") || file.endsWith("/knowledge/context-map.md"),
  },
  {
    category: "Knowledge",
    matches: (file) => spacePrefix.test(file) && file.replace(spacePrefix, "").startsWith("knowledge"),
  },
  {
    category: "Intent Registry",
    matches: (file) => file.endsWith("/intents/intents.json") || file.endsWith("/intents/intents.md") || file.endsWith("/intents/active-intent"),
  },
  {
    category: "Intent 状態",
    matches: (file) => intentRecordPrefix.test(file) && (file.endsWith("/aidlc-state.md") || file.includes("/audit/")),
  },
  {
    category: "Intent 基本成果物",
    matches: (file) => /^aidlc\/spaces\/[^/]+\/intents\/[^/]+\.md$/.test(file) || /^aidlc\/spaces\/[^/]+\/intents\/[^/]+\/[^/]+\.md$/.test(file),
  },
  {
    category: "Bolt / Task",
    matches: (file) => intentRecordPrefix.test(file) && file.includes("/bolts/"),
  },
];

class AmadeusValidator {
  private readonly root: string;
  private readonly intentId?: string;
  private readonly space: string;
  private readonly rows: Row[] = [];
  private readonly checkedFiles = new Set<string>();
  private readonly knownIds = new Map<string, Set<string>>();

  constructor(root: string, intentId?: string) {
    this.root = resolve(root);
    this.intentId = this.blank(intentId) ? undefined : intentId;
    this.space = spaceBase(this.root);
  }

  run(): string {
    try {
      this.checkWorkspace();
      if (!this.failed()) {
        this.checkSpaceLayers();
        this.checkGlobalIndexes();
        if (this.intentId) {
          this.checkIntentIndexes(this.intentId);
        } else {
          this.pass(`${this.space}/intents/intents.md`, "対象 Intent ディレクトリ名", "指定なし。全体成果物だけを検証");
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

    this.checkFile("aidlc", "Amadeus の成果物ルートが存在する", true);
    this.checkFile("aidlc/spaces", "Space の親ディレクトリが存在する", true);
    this.checkFile(this.space, "対象 Space が存在する", true);
  }

  private checkSpaceLayers(): void {
    this.checkFile(`${this.space}/memory`, "memory ディレクトリが存在する", true);
    this.checkFile(`${this.space}/memory/org.md`, "memory/org.md が存在する");
    this.checkFile(`${this.space}/memory/team.md`, "memory/team.md が存在する");
    this.checkFile(`${this.space}/memory/project.md`, "memory/project.md が存在する");
    this.checkOptionalDirectory(`${this.space}/memory/phases`, "memory/phases は任意である");
    this.checkOptionalDirectory(`${this.space}/memory/templates`, "memory/templates は任意である");
    this.checkFile(`${this.space}/knowledge`, "knowledge ディレクトリが存在する", true);
    this.checkOptionalDirectory(`${this.space}/codekb`, "codekb は brownfield で作られる任意ディレクトリである");
    this.checkFile(`${this.space}/intents`, "intents ディレクトリが存在する", true);
  }

  private checkOptionalDirectory(path: string, condition: string): void {
    if (this.isDirectory(this.absolute(path))) {
      this.checkedFiles.add(path);
      this.pass(path, condition, "存在を確認");
    } else {
      this.skipped(path, condition, "ディレクトリなし");
    }
  }

  private checkGlobalIndexes(): void {
    this.checkEventStormingSessions(`${this.space}/knowledge/event-storming`, "pre-intent");
    this.checkIntents();
    this.checkIntentsRegistry();
    this.checkIndexGeneration();
    this.checkDomainMap(`${this.space}/knowledge/domain-map.md`);
    this.checkContextMap(`${this.space}/knowledge/context-map.md`);
  }

  private checkIntentsRegistry(): void {
    const path = `${this.space}/intents/intents.json`;
    this.checkFile(path, "Intent registry（intents.json）が存在する");
    if (!this.isFile(this.absolute(path))) return;

    let entries: unknown;
    try {
      entries = JSON.parse(this.read(path));
    } catch (error) {
      this.failRow(path, "intents.json が JSON として解釈できる", (error as Error).message);
      return;
    }
    if (!Array.isArray(entries)) {
      this.failRow(path, "intents.json が registry の配列である", this.typeName(entries));
      return;
    }
    this.pass(path, "intents.json が registry の配列である", `${entries.length} 件`);

    const dirNames = new Set<string>();
    for (const entry of entries as Record<string, any>[]) {
      this.checkRegistryEntry(path, entry, dirNames);
    }
    this.checkRegistryCoverage(path, dirNames);
    this.checkActiveIntentCursor(dirNames);
  }

  private checkRegistryEntry(path: string, entry: Record<string, any>, dirNames: Set<string>): void {
    const dirName = String(entry.dirName ?? "");
    const label = dirName === "" ? "(dirName 未設定)" : dirName;
    if (uuidV7Pattern.test(String(entry.uuid ?? ""))) {
      this.pass(path, "registry の `uuid` が UUIDv7 である", label);
    } else {
      this.failRow(path, "registry の `uuid` が UUIDv7 である", `${label}: ${String(entry.uuid ?? "未設定")}`);
    }
    if (intentDirectoryPattern.test(dirName)) {
      this.pass(path, "registry の `dirName` が <YYMMDD>-<label> 形式である", dirName);
    } else {
      this.failRow(path, "registry の `dirName` が <YYMMDD>-<label> 形式である", label);
    }
    if (this.blank(entry.slug)) {
      this.failRow(path, "registry の `slug` が空欄でない", label);
    } else {
      this.pass(path, "registry の `slug` が空欄でない", String(entry.slug));
    }
    this.checkAllowed(path, "scope", entry.scope, registryScopeValues);
    this.checkAllowed(path, "status", entry.status, registryStatusValues);
    if (Array.isArray(entry.repos)) {
      this.pass(path, "registry の `repos` が配列である", `${label}: ${entry.repos.length} 件`);
    } else {
      this.failRow(path, "registry の `repos` が配列である", label);
    }
    if (dirName !== "") dirNames.add(dirName);
  }

  private checkRegistryCoverage(path: string, dirNames: Set<string>): void {
    const intentsDir = this.absolute(`${this.space}/intents`);
    if (!this.isDirectory(intentsDir)) return;
    const records = readdirSync(intentsDir)
      .filter((entry) => this.isDirectory(join(intentsDir, entry)))
      .filter((entry) => intentDirectoryPattern.test(entry))
      .sort();
    for (const record of records) {
      if (dirNames.has(record)) {
        this.pass(path, "record ディレクトリが registry に登録されている", record);
      } else {
        this.failRow(path, "record ディレクトリが registry に登録されている", record);
      }
    }
    for (const dirName of [...dirNames].sort()) {
      if (!records.includes(dirName)) {
        this.failRow(path, "registry の `dirName` の record ディレクトリが存在する", dirName);
      }
    }
  }

  private checkActiveIntentCursor(dirNames: Set<string>): void {
    const path = `${this.space}/intents/active-intent`;
    if (!this.isFile(this.absolute(path))) {
      this.skipped(path, "active-intent カーソルは任意である", "ファイルなし");
      return;
    }
    this.checkedFiles.add(path);
    const value = this.read(path).trim();
    if (dirNames.has(value)) {
      this.pass(path, "active-intent が registry の record を指す", value);
    } else {
      this.failRow(path, "active-intent が registry の record を指す", value === "" ? "空" : value);
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
    if (scope === "pre-intent" && level === "big-picture") return new Set(["amadeus"]);
    if (scope === "pre-intent" && level === "process-modeling") return new Set(["amadeus"]);
    if (scope === "pre-intent" && level === "system-design") return new Set(["amadeus-domain-modeling"]);
    if (scope === "intent-scoped" && (level === "big-picture" || level === "process-modeling")) return new Set(["amadeus"]);
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
    const headings = ["Purpose", "Scope", "Related Intent", "Level Status", "Next Skill", "Supersession"];
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

  private checkIntentIndexes(intentId: string): void {
    const base = `${this.space}/intents/${intentId}`;

    this.checkFile(`${this.space}/intents/${intentId}.md`, "Intent のモジュールファイルが存在する");
    this.checkHeadings(`${this.space}/intents/${intentId}.md`, ["概要", "依存", "目標プロファイル"]);
    this.checkIntentGoalProfile(`${this.space}/intents/${intentId}.md`);
    this.checkEventStormingSessions(`${base}/event-storming`, "intent-scoped", intentId);

    const statePath = `${base}/aidlc-state.md`;
    this.checkFile(statePath, "Intent 状態ファイル（aidlc-state.md）が存在する");
    if (!this.isFile(this.absolute(statePath))) return;
    const stateText = this.read(statePath);
    const legacy = this.isBackwardCompatRecord(base);
    const { auditText, auditShardExists } = this.readAuditEvidence(base, legacy);

    this.checkNoLegacyIntentRootArtifacts(base);
    this.checkExistingPhaseGrillings(base);
    checkAidlcIntentRecord(
      {
        pass: (target, condition, evidence) => this.pass(target, condition, evidence),
        failRow: (target, condition, evidence) => this.failRow(target, condition, evidence),
        checkFile: (path, condition) => this.checkFile(path, condition),
        readOptional: (path) => (this.isFile(this.absolute(path)) ? this.read(path) : undefined),
      },
      { base, dirName: intentId, stateText, auditText, legacy, auditShardExists },
    );
  }

  // docs/backward-compatibility.md に記載された record かどうかを判定する。
  // ファイル自体がなければ、既存 record への影響を避けるため現行（旧形式）検査を維持する。
  private isBackwardCompatRecord(base: string): boolean {
    const docPath = "docs/backward-compatibility.md";
    if (!this.isFile(this.absolute(docPath))) return true;
    return this.read(docPath).includes(`${base}/`);
  }

  // legacy record は audit/audit.md 単一ファイルを主 shard として読む。
  // v2 契約の record は audit/ 配下の .md ファイルすべてを shard として結合する。
  private readAuditEvidence(base: string, legacy: boolean): { auditText?: string; auditShardExists: boolean } {
    if (legacy) {
      const auditPath = `${base}/audit/audit.md`;
      const auditText = this.isFile(this.absolute(auditPath)) ? this.read(auditPath) : undefined;
      return { auditText, auditShardExists: auditText !== undefined };
    }
    const auditDir = `${base}/audit`;
    if (!this.isDirectory(this.absolute(auditDir))) return { auditText: undefined, auditShardExists: false };
    const shardFiles = readdirSync(this.absolute(auditDir))
      .filter((entry) => entry.endsWith(".md") && this.isFile(this.absolute(`${auditDir}/${entry}`)))
      .sort();
    if (shardFiles.length === 0) return { auditText: undefined, auditShardExists: false };
    const auditText = shardFiles.map((entry) => this.read(`${auditDir}/${entry}`)).join("\n");
    return { auditText, auditShardExists: true };
  }

  private checkNoLegacyIntentRootArtifacts(base: string): void {
    const legacyFiles = [
      "state.json",
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
        const guidance = file === "state.json" ? "state.json は退役した。状態は aidlc-state.md が持つ" : `${file} は phase ディレクトリ配下へ置く`;
        this.failRow(path, "Intent 直下の旧配置成果物を使わない", guidance);
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

  private checkIntentGoalProfile(path: string): void {
    const table = this.checkTable(path, "目標プロファイル", ["フィールド", "値", "説明"]);
    if (!table) {
      this.failRow(path, "Intent 目標プロファイルが存在する", "表がない");
      return;
    }
    this.pass(path, "Intent 目標プロファイルが存在する", "表を確認");

    this.checkIntentProfileField(path, table, "goalType", intentGoalTypeValues);
    this.checkIntentProfileField(path, table, "scope", ideationExecutionScopeValues);
    this.checkIntentLabelsField(path, table);
  }

  private checkIntentProfileField(path: string, table: Table, field: string, allowed: Set<string>): void {
    const row = table.rows.find((item) => String(item["フィールド"] ?? "").trim() === field);
    if (!row) {
      this.failRow(path, `Intent 目標プロファイルに \`${field}\` がある`, "行がない");
      return;
    }
    this.pass(path, `Intent 目標プロファイルに \`${field}\` がある`, field);
    this.checkAllowed(path, field, row["値"], allowed);
  }

  private checkIntentLabelsField(path: string, table: Table): void {
    const row = table.rows.find((item) => String(item["フィールド"] ?? "").trim() === "labels");
    if (!row) {
      this.failRow(path, "Intent 目標プロファイルに `labels` がある", "行がない");
      return;
    }
    this.pass(path, "Intent 目標プロファイルに `labels` がある", "labels");

    const value = String(row["値"] ?? "").trim();
    if (value.length === 0) this.failRow(path, "`labels` が空欄ではない", "空欄");
    else this.pass(path, "`labels` が空欄ではない", value);
  }

  private checkIntents(): void {
    const path = `${this.space}/intents/intents.md`;
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

  // 共有インデックス（intents.md）の不整合検査。
  // 生成ロジック（buildIntentsIndex）を再利用し、導出した期待内容と実ファイルの
  // 完全一致で判定する（BL006、BR008）。列構造検査（checkIntents）とは独立して行う。
  private checkIndexGeneration(): void {
    this.checkIndexGenerationTarget(`${this.space}/intents/intents.md`, () => buildIntentsIndex(this.root));
  }

  private checkIndexGenerationTarget(path: string, build: () => string): void {
    const condition = "Index 生成整合: 生成物が配下モジュールの導出内容と一致する";
    let expected: string;
    try {
      expected = build();
    } catch (error) {
      if (error instanceof HeadingContractViolationError) {
        for (const violation of error.violations) {
          this.failRow(
            path,
            "Index 生成整合: 配下モジュールが見出し契約を満たす",
            `${violation.file}: ${violation.missing.join("、")} が不足`,
          );
        }
        return;
      }
      throw error;
    }

    if (!this.isFile(this.absolute(path))) {
      this.failRow(path, condition, "生成物が存在しない");
      return;
    }
    const actual = this.read(path);
    if (actual === expected) {
      this.pass(path, condition, "配下モジュールからの導出内容と完全一致を確認");
      return;
    }
    this.failRow(path, condition, this.describeIndexMismatch(actual, expected));
  }

  private describeIndexMismatch(actual: string, expected: string): string {
    const actualLines = actual.split("\n");
    const expectedLines = expected.split("\n");
    const sizeNote = `実際 ${actualLines.length} 行 / 期待 ${expectedLines.length} 行`;
    const maxLines = Math.max(actualLines.length, expectedLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (actualLines[i] !== expectedLines[i]) {
        const actualLine = actualLines[i] === undefined ? "(行なし)" : JSON.stringify(actualLines[i]);
        const expectedLine = expectedLines[i] === undefined ? "(行なし)" : JSON.stringify(expectedLines[i]);
        return `${i + 1} 行目が一致しない（実際: ${actualLine}、期待: ${expectedLine}）。${sizeNote}`;
      }
    }
    return `内容が一致しない。${sizeNote}`;
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
    const indexState = this.checkGrillingsIndex(base, indexPath);
    const sessionFiles = this.grillingSessionFiles(sessionsPath);
    const allDecisionIds = this.collectGrillingDecisionIds(sessionsPath, sessionFiles);
    this.checkGrillingSessionFiles(base, sessionsPath, sessionFiles, indexState, allDecisionIds);
  }

  private checkGrillingsIndex(base: string, indexPath: string): GrillingIndexState {
    this.checkHeadings(indexPath, ["一覧"]);
    const table = this.checkTable(indexPath, "一覧", ["ID", "主題", "対象", "状態", "主な確定判断", "反映先", "詳細"]);
    if (!table) return { sessionIds: new Set(), sessionStates: new Map() };

    const sessionIds = this.collectIds(indexPath, table, "ID", /^G\d{3}$/);
    const sessionStates = new Map<string, string>();
    this.checkNotBlank(indexPath, table, "主題");
    this.checkNotBlank(indexPath, table, "対象");
    this.checkNotBlank(indexPath, table, "主な確定判断");
    this.checkNotBlank(indexPath, table, "反映先");
    this.checkDetailLinks(indexPath, table, "詳細");
    for (const row of table.rows) {
      this.checkGrillingsIndexRow(base, indexPath, row, sessionIds, sessionStates);
    }
    return { sessionIds, sessionStates };
  }

  private checkGrillingsIndexRow(
    base: string,
    indexPath: string,
    row: Record<string, string>,
    sessionIds: Set<string>,
    sessionStates: Map<string, string>,
  ): void {
    this.checkAllowed(indexPath, "状態", row["状態"], grillingSessionStatusValues);
    const id = String(row["ID"] ?? "").trim();
    const state = String(row["状態"] ?? "").trim();
    if (id.length > 0) sessionStates.set(id, state);
    this.checkGrillingTarget(indexPath, base, "grilling 索引の `反映先` が存在する", row["反映先"], id);
    const detailLinks = this.markdownLinks(String(row["詳細"] ?? "")).map((link) => this.cleanLinkTarget(link));
    const expectedPrefix = `grillings/${id}-`;
    if (id.length > 0 && sessionIds.has(id) && detailLinks.some((link) => link.startsWith(expectedPrefix) && link.endsWith(".md"))) {
      this.pass(indexPath, "`詳細` が対応する grilling session を指す", id);
    } else {
      this.failRow(indexPath, "`詳細` が対応する grilling session を指す", `${id}: ${detailLinks.join(", ") || "リンクなし"}`);
    }
  }

  private grillingSessionFiles(sessionsPath: string): string[] {
    const entries = readdirSync(this.absolute(sessionsPath)).sort();
    const sessionFiles = entries.filter((entry) => this.isFile(this.absolute(`${sessionsPath}/${entry}`)));
    if (sessionFiles.length > 0) this.pass(sessionsPath, "grilling session ファイルが1件以上ある", `${sessionFiles.length}件`);
    else this.failRow(sessionsPath, "grilling session ファイルが1件以上ある", "0件");
    return sessionFiles;
  }

  private collectGrillingDecisionIds(sessionsPath: string, sessionFiles: string[]): Set<string> {
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
    return allDecisionIds;
  }

  private checkGrillingSessionFiles(
    base: string,
    sessionsPath: string,
    sessionFiles: string[],
    indexState: GrillingIndexState,
    allDecisionIds: Set<string>,
  ): void {
    const seenSessionIds = new Set<string>();
    for (const entry of sessionFiles) {
      const path = `${sessionsPath}/${entry}`;
      const sessionId = entry.match(/^(G\d{3})-/)?.[1];
      this.checkGrillingSessionFileName(path, entry);
      this.checkUniqueGrillingSessionId(path, sessionId, seenSessionIds);
      if (sessionId && indexState.sessionIds.has(sessionId)) {
        this.pass(path, "grilling session が `grillings.md` に登録されている", sessionId);
      } else {
        this.failRow(path, "grilling session が `grillings.md` に登録されている", sessionId ?? entry);
      }
      this.checkGrillingSession(base, path, allDecisionIds, sessionId ? indexState.sessionStates.get(sessionId) : undefined);
    }
  }

  private checkGrillingSessionFileName(path: string, entry: string): void {
    if (grillingSessionFilePattern.test(entry)) {
      this.pass(path, "grilling session ファイル名が Gnnn-<topic>.md 形式である", entry);
    } else {
      this.failRow(path, "grilling session ファイル名が Gnnn-<topic>.md 形式である", entry);
    }
  }

  private checkUniqueGrillingSessionId(path: string, sessionId: string | undefined, seenSessionIds: Set<string>): void {
    if (!sessionId) return;
    if (seenSessionIds.has(sessionId)) {
      this.failRow(path, "grilling session ID が対象 root 内で重複しない", sessionId);
    } else {
      this.pass(path, "grilling session ID が対象 root 内で重複しない", sessionId);
      seenSessionIds.add(sessionId);
    }
  }

  private checkGrillingSession(base: string, path: string, allDecisionIds: Set<string>, indexedState: string | undefined): void {
    this.checkHeadings(path, ["概要", "確定判断", "質問記録"]);

    const expectedId = basename(path).match(/^(G\d{3})-/)?.[1];
    this.checkGrillingSessionTitle(path, expectedId);
    this.checkGrillingSessionState(path, indexedState);
    this.checkGrillingSessionTarget(base, path, expectedId);
    this.checkGrillingDecisions(base, path, allDecisionIds);
    this.checkGrillingQuestions(path, allDecisionIds);
  }

  private checkGrillingSessionTitle(path: string, expectedId: string | undefined): void {
    const title = this.read(path).split(/\r?\n/, 1)[0] ?? "";
    if (!expectedId || title.includes(expectedId)) {
      this.pass(path, "grilling session 見出しがファイル ID を含む", title || "見出しなし");
    } else {
      this.failRow(path, "grilling session 見出しがファイル ID を含む", title);
    }
  }

  private checkGrillingSessionState(path: string, indexedState: string | undefined): void {
    const sessionState = this.labeledBulletValue(path, "概要", "状態");
    if (sessionState) this.checkAllowed(path, "状態", sessionState, grillingSessionStatusValues);
    else this.failRow(path, "grilling session の `状態` が空欄でない", "空欄");
    this.checkGrillingSessionStateMatchesIndex(path, indexedState, sessionState);
  }

  private checkGrillingSessionStateMatchesIndex(
    path: string,
    indexedState: string | undefined,
    sessionState: string | undefined,
  ): void {
    if (indexedState && sessionState && indexedState === sessionState) {
      this.pass(path, "grilling 索引と session の `状態` が一致する", String(sessionState).trim());
    } else if (indexedState && sessionState) {
      this.failRow(path, "grilling 索引と session の `状態` が一致する", `${indexedState} != ${sessionState}`);
    }
  }

  private checkGrillingSessionTarget(base: string, path: string, expectedId: string | undefined): void {
    const sessionTarget = this.labeledBulletValue(path, "概要", "反映先");
    if (this.blank(sessionTarget)) this.failRow(path, "grilling session の `反映先` が空欄でない", "空欄");
    else {
      this.pass(path, "grilling session の `反映先` が空欄でない", String(sessionTarget).trim());
      this.checkGrillingTarget(path, base, "grilling session の `反映先` が存在する", sessionTarget, expectedId ?? basename(path));
    }
  }

  private checkGrillingDecisions(base: string, path: string, allDecisionIds: Set<string>): void {
    const table = this.checkTable(path, "確定判断", ["ID", "判断", "状態", "反映先", "置き換え先"]);
    if (!table) return;

    this.collectIds(path, table, "ID", /^GD\d{3}$/);
    this.checkNotBlank(path, table, "判断");
    for (const row of table.rows) {
      this.checkGrillingDecisionRow(base, path, row, allDecisionIds);
    }
  }

  private checkGrillingDecisionRow(
    base: string,
    path: string,
    row: Record<string, string>,
    allDecisionIds: Set<string>,
  ): void {
    const decisionId = String(row["ID"] ?? "").trim();
    this.checkGrillingDecisionTarget(base, path, decisionId, row["反映先"]);

    const state = String(row["状態"] ?? "").trim();
    this.checkAllowed(path, "状態", state, grillingDecisionStatusValues);
    const replacedBy = String(row["置き換え先"] ?? "").trim();
    const replacementIds = this.grillingDecisionReferences(replacedBy);
    if (state === "active") {
      this.checkActiveGrillingDecisionReplacement(path, decisionId, replacementIds);
    } else if (state === "superseded") {
      this.checkSupersededGrillingDecisionReplacement(path, decisionId, replacementIds, allDecisionIds);
    }
  }

  private checkGrillingDecisionTarget(base: string, path: string, decisionId: string, value: unknown): void {
    const target = String(value ?? "").trim();
    if (target.length > 0) {
      this.pass(path, "grilling 判断の `反映先` が空欄でない", `${decisionId}: ${target}`);
      this.checkGrillingTarget(path, base, "grilling 判断の `反映先` が存在する", target, decisionId);
    } else {
      this.failRow(path, "grilling 判断の `反映先` が空欄でない", decisionId);
    }
  }

  private checkActiveGrillingDecisionReplacement(path: string, decisionId: string, replacementIds: string[]): void {
    if (replacementIds.length === 0) {
      this.pass(path, "active の grilling 判断が置き換え先を持たない", decisionId);
    } else {
      this.failRow(path, "active の grilling 判断が置き換え先を持たない", `${decisionId}: ${replacementIds.join(", ")}`);
    }
  }

  private checkSupersededGrillingDecisionReplacement(
    path: string,
    decisionId: string,
    replacementIds: string[],
    allDecisionIds: Set<string>,
  ): void {
    if (replacementIds.length > 0) {
      this.pass(path, "superseded の grilling 判断が置き換え先を持つ", `${decisionId}: ${replacementIds.join(", ")}`);
    } else {
      this.failRow(path, "superseded の grilling 判断が置き換え先を持つ", decisionId);
    }
    this.checkExistingGrillingDecisionReplacements(path, decisionId, replacementIds, allDecisionIds);
  }

  private checkExistingGrillingDecisionReplacements(
    path: string,
    decisionId: string,
    replacementIds: string[],
    allDecisionIds: Set<string>,
  ): void {
    for (const replacementId of replacementIds) {
      if (allDecisionIds.has(replacementId) && replacementId !== decisionId) {
        this.pass(path, "superseded の grilling 判断が実在する置き換え先を参照する", `${decisionId}: ${replacementId}`);
      } else {
        this.failRow(path, "superseded の grilling 判断が実在する置き換え先を参照する", `${decisionId}: ${replacementId}`);
      }
    }
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
      this.checkGrillingQuestionBullet(path, block, questionId, "確認したいこと", "質問記録が確認したいことを持つ");
      this.checkGrillingQuestionBullet(path, block, questionId, "確認が必要な理由", "質問記録が確認が必要な理由を持つ");
      this.checkGrillingQuestionBullet(path, block, questionId, "推奨回答", "質問記録が推奨回答を持つ");
      this.checkGrillingQuestionBullet(path, block, questionId, "推奨理由", "質問記録が推奨理由を持つ");
      this.checkGrillingQuestionBullet(path, block, questionId, "ユーザー回答", "質問記録がユーザー回答を持つ");
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

  private checkGrillingQuestionBullet(path: string, block: string, questionId: string, label: string, condition: string): void {
    const value = block.match(new RegExp(`^\\s*-\\s+${this.escapeRegExp(label)}:\\s*(.*?)\\s*$`, "m"))?.[1]?.trim() ?? "";
    if (value.length > 0) {
      this.pass(path, condition, `${questionId}: ${value}`);
    } else {
      this.failRow(path, condition, questionId);
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
      const resolved = resolve(this.absolute(join(base, clean)));
      if (this.grillingTargetInsideBase(base, clean, resolved)) {
        this.pass(path, "grilling の `反映先` が対象 root 内に収まる", `${detail}: ${target}`);
      } else {
        this.failRow(path, "grilling の `反映先` が対象 root 内に収まる", `${detail}: ${target} -> ${this.relativePath(resolved)}`);
        continue;
      }
      if (existsSync(resolved)) {
        this.checkedFiles.add(this.relativePath(resolved));
        this.pass(path, condition, `${detail}: ${target}`);
      } else {
        this.failRow(path, condition, `${detail}: ${target} -> ${this.relativePath(resolved)}`);
      }
    }
    if (!inspected) this.failRow(path, condition, `${detail}: 参照先なし`);
  }

  private grillingTargetInsideBase(base: string, cleanTarget: string, resolved: string): boolean {
    if (this.grillingCompanionTargetAllowed(base, cleanTarget, resolved)) {
      return true;
    }
    const baseRoot = resolve(this.absolute(base));
    const relativeTarget = relative(baseRoot, resolved);
    return relativeTarget.length === 0 || (!relativeTarget.startsWith("..") && !isAbsolute(relativeTarget));
  }

  private grillingCompanionTargetAllowed(base: string, cleanTarget: string, resolved: string): boolean {
    const companionRoots = [`${this.space}/knowledge/event-storming`];
    if (!companionRoots.some((root) => base.startsWith(`${root}/`))) return false;
    const companionName = basename(base);
    return cleanTarget === `../${companionName}.md` && resolved === resolve(this.absolute(`${dirname(base)}/${companionName}.md`));
  }

  private grillingDecisionReferences(value: unknown): string[] {
    const text = String(value ?? "").trim();
    if (text.length === 0 || text === "該当なし") return [];
    return [...new Set([...text.matchAll(/\bGD\d{3}\b/g)].map((match) => match[0]))];
  }

  private checkDomainMap(path: string): void {
    this.checkFile(path, "Domain Map が存在する");
    this.checkHeadings(path, ["Subdomains", "Bounded Contexts"]);

    const subdomainTable = this.checkTable(path, "Subdomains", ["識別子", "名前", "種別", "役割", "状態", "根拠"]);
    const subdomainIds = subdomainTable ? this.collectIds(path, subdomainTable, "識別子", /^SD\d{3}$/) : new Set<string>();
    if (subdomainTable) {
      this.checkNotBlank(path, subdomainTable, "名前");
      this.checkNotBlank(path, subdomainTable, "役割");
      this.checkDetailLinks(path, subdomainTable, "根拠");
      for (const row of subdomainTable.rows) {
        this.checkAllowed(path, "種別", row["種別"], subdomainTypeValues);
        this.checkAllowed(path, "状態", row["状態"], domainMapStatusValues);
      }
    }

    const contextTable = this.checkTable(path, "Bounded Contexts", ["識別子", "名前", "サブドメイン", "役割", "状態", "根拠"]);
    if (!contextTable) return;

    this.collectIds(path, contextTable, "識別子", /^BC\d{3}$/);
    this.checkNotBlank(path, contextTable, "名前");
    this.checkNotBlank(path, contextTable, "役割");
    this.checkDetailLinks(path, contextTable, "根拠");
    for (const row of contextTable.rows) {
      const contextId = String(row["識別子"] ?? "").trim();
      for (const subdomainId of this.splitValues(row["サブドメイン"])) {
        if (subdomainIds.has(subdomainId)) this.pass(path, "`サブドメイン` が Domain Map の Subdomain に存在する", `${contextId}: ${subdomainId}`);
        else this.failRow(path, "`サブドメイン` が Domain Map の Subdomain に存在する", `${contextId}: ${subdomainId}`);
      }
      this.checkAllowed(path, "状態", row["状態"], domainMapStatusValues);
    }
  }

  private checkContextMap(path: string): void {
    this.checkFile(path, "Context Map が存在する");
    this.checkHeadings(path, ["Dependencies"]);
    const table = this.checkTable(path, "Dependencies", ["Downstream", "Upstream", "依存内容", "組織パターン", "統合パターン", "状態", "根拠"]);
    if (!table) return;

    const contextIds = this.idsFor(`${this.space}/knowledge/domain-map.md`);
    this.checkNotBlank(path, table, "依存内容");
    this.checkDetailLinks(path, table, "根拠");
    for (const row of table.rows) {
      const downstream = String(row["Downstream"] ?? "").trim();
      const upstream = String(row["Upstream"] ?? "").trim();
      if (contextIds.has(downstream)) this.pass(path, "`Downstream` が Domain Map の Bounded Context に存在する", downstream);
      else this.failRow(path, "`Downstream` が Domain Map の Bounded Context に存在する", downstream);
      if (contextIds.has(upstream)) this.pass(path, "`Upstream` が Domain Map の Bounded Context に存在する", upstream);
      else this.failRow(path, "`Upstream` が Domain Map の Bounded Context に存在する", upstream);
      this.checkAllowed(path, "組織パターン", row["組織パターン"], organizationPatternValues);
      this.checkAllowed(path, "統合パターン", row["統合パターン"], integrationPatternValues);
      this.checkAllowed(path, "状態", row["状態"], domainMapStatusValues);
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
    const heading = path.endsWith("/domain-map.md") ? "Bounded Contexts" : "一覧";
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
        const match = clean.match(/^([^/]+)\.md$/);
        if (!match) {
          this.failRow(path, "`詳細` が同じ intents/ 配下の <dirName>.md を指す", target);
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
      this.checkFile(`${this.space}/intents/${id}`, "Intent record ディレクトリが存在する", true);
      this.checkFile(`${this.space}/intents/${id}/aidlc-state.md`, "Intent 状態ファイル（aidlc-state.md）が存在する");
    }
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

  private splitTableLine(line: string): string[] {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((value) => value.trim());
  }

  private splitValues(value: unknown): string[] {
    const text = String(value ?? "").trim();
    if (text.length === 0) return [""];
    return text.split(",").map((item) => item.trim()).filter(Boolean);
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
    return cleanMarkdownLinkTarget(target);
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

  private failRow(target: string, condition: string, evidence: string): void {
    this.rows.push({ target, condition, result: "fail", evidence });
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
    return checkedFileCategoryRules.find((rule) => rule.matches(file))?.category ?? "その他";
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
    for (const rule of rowCategoryRules) {
      if (rule.matches(row)) return rule.category;
    }
    return "その他";
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
