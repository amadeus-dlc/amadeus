// Subagent spawn statistics — the read-only aggregation CLI (#2279, C-7).
//
//   Usage: bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]
//
// One command derives the per-type / per-verdict / per-model spawn breakdown
// from the audit shards (amadeus/spaces/<space>/intents/* /audit/*.jsonl).
// SUBAGENT_COMPLETED is the primary input (ADR-6 — SUBAGENT_STARTED is tallied
// aside, never paired). Rows written before the `Type Verdict` attribute
// existed are classified at aggregation time with U1's classifyAgentType; rows
// that carry the attribute keep their recorded verdict, and disagreements with
// the CURRENT allowed set are counted, never edited (append-only reading
// side). A missing `Model` attribute is the unresolved bucket (ADR-5).
//
// Every run re-reads every shard — the audit corpus is a moving value, so the
// output opens with a measurement ref (time, scan scope, shard count, totals)
// that pins what the numbers describe (FR-4b). The tool writes nothing.
//
// The classification and rendering halves are exported pure functions
// (composeStatsReport / renderStatsText) so tests drive them in-process; only
// the scan phase and argv handling touch the process boundary (BR-U3-8).
// This module deliberately does NOT import amadeus-lib.ts (the FD fixes the
// dependency direction stats -> observability only); the two small path
// idioms it needs are mirrored locally.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { harnessDir } from "./amadeus-harness.ts";
import {
  type AllowedSetResolution,
  classifyAgentType,
  resolveAllowedAgentTypes,
  sanitizeAdvisoryValue,
  type TypeVerdict,
} from "./amadeus-subagent-observability.ts";

/** A parsed audit line about a subagent, from either journal schema. */
export interface SubagentAuditRecord {
  readonly event: "SUBAGENT_COMPLETED" | "SUBAGENT_STARTED";
  readonly agentType: string | undefined;
  readonly typeVerdict: string | undefined;
  readonly model: string | undefined;
  readonly modelSource: string | undefined;
}

/** The scan phase's output: what was read, and what could not be. */
export interface ScannedAudit {
  readonly shardCount: number;
  readonly unreadableShardCount: number;
  readonly parseSkippedCount: number;
  readonly records: readonly SubagentAuditRecord[];
}

/** One row of the per-type ranking. */
export interface TypeTallyRow {
  readonly agentType: string;
  readonly verdict: TypeVerdict;
  readonly count: number;
}

/** The aggregation result — every number comes from rows actually read. */
export interface SubagentStatsReport {
  readonly measuredAt: string;
  readonly scanScope: string;
  readonly shardCount: number;
  readonly unreadableShardCount: number;
  readonly parseSkippedCount: number;
  readonly verdictMismatchCount: number;
  readonly allowedSetWarnings: readonly string[];
  readonly completedTotal: number;
  readonly startedTotal: number;
  readonly byVerdict: ReadonlyMap<TypeVerdict, number>;
  readonly byType: readonly TypeTallyRow[];
  readonly byModel: ReadonlyMap<string, number>;
  readonly byModelSource: ReadonlyMap<string, number>;
  readonly unresolvedModelCount: number;
}

const TYPE_VERDICTS: readonly TypeVerdict[] = ["persona", "builtin", "unknown-type", "outside-allowed-set"];

/** The recorded verdict is adopted only when it is one of the four union values. */
function isTypeVerdict(value: string): value is TypeVerdict {
  return (TYPE_VERDICTS as readonly string[]).includes(value);
}

// normalizeAgentType's exact semantics (raw?.trim() ? raw : "unknown"),
// mirrored because amadeus-lib.ts is off-limits to this module. Old rows with
// a missing, empty, or blank Agent Type must land in the "unknown" bucket so
// every completed row gets exactly one verdict (domain-entities invariant 3).
function normalizeType(raw: string | undefined): string {
  return raw?.trim() ? raw : "unknown";
}

/** The verdict for one completed row, plus whether the recorded attribute and
 *  the current reclassification disagree (BR-U3-3). */
function decideVerdict(record: SubagentAuditRecord, resolution: AllowedSetResolution): { verdict: TypeVerdict; mismatch: boolean } {
  const reclassified = classifyAgentType(normalizeType(record.agentType), resolution);
  if (record.typeVerdict === undefined) return { verdict: reclassified, mismatch: false };
  if (!isTypeVerdict(record.typeVerdict)) return { verdict: reclassified, mismatch: true };
  return { verdict: record.typeVerdict, mismatch: record.typeVerdict !== reclassified };
}

/** Fold a scanned corpus into the stats report. Pure: the caller injects the
 *  measurement time and scope, so the same input always yields the same report. */
export function composeStatsReport(
  scanned: ScannedAudit,
  resolution: AllowedSetResolution,
  measuredAt: string,
  scanScope: string,
): SubagentStatsReport {
  const byVerdict = new Map<TypeVerdict, number>(TYPE_VERDICTS.map((v) => [v, 0]));
  const typeTallies = new Map<string, TypeTallyRow>();
  const byModel = new Map<string, number>();
  const byModelSource = new Map<string, number>();
  let completedTotal = 0;
  let startedTotal = 0;
  let verdictMismatchCount = 0;
  let unresolvedModelCount = 0;

  for (const record of scanned.records) {
    if (record.event === "SUBAGENT_STARTED") {
      startedTotal += 1;
      continue;
    }
    completedTotal += 1;

    const { verdict, mismatch } = decideVerdict(record, resolution);
    if (mismatch) verdictMismatchCount += 1;
    byVerdict.set(verdict, (byVerdict.get(verdict) ?? 0) + 1);

    const agentType = normalizeType(record.agentType);
    const key = `${agentType}${verdict}`;
    const row = typeTallies.get(key);
    typeTallies.set(key, { agentType, verdict, count: (row?.count ?? 0) + 1 });

    // ADR-5's reading side: a present non-empty Model counts; anything else is
    // the unresolved bucket. A Model without Model Source counts on the model
    // axis only (degeneracy — the asymmetry surfaces as a note, not a failure).
    if (record.model !== undefined && record.model.trim() !== "") {
      byModel.set(record.model, (byModel.get(record.model) ?? 0) + 1);
      if (record.modelSource !== undefined && record.modelSource.trim() !== "") {
        byModelSource.set(record.modelSource, (byModelSource.get(record.modelSource) ?? 0) + 1);
      }
    } else {
      unresolvedModelCount += 1;
    }
  }

  const byType = [...typeTallies.values()].sort(
    (a, b) => b.count - a.count || a.agentType.localeCompare(b.agentType) || a.verdict.localeCompare(b.verdict),
  );

  return {
    measuredAt,
    scanScope,
    shardCount: scanned.shardCount,
    unreadableShardCount: scanned.unreadableShardCount,
    parseSkippedCount: scanned.parseSkippedCount,
    verdictMismatchCount,
    allowedSetWarnings: resolution.warnings,
    completedTotal,
    startedTotal,
    byVerdict,
    byType,
    byModel,
    byModelSource,
    unresolvedModelCount,
  };
}

/** Count-descending, key-ascending entries of a tally map, for stable output. */
function sortedEntries(tally: ReadonlyMap<string, number>): [string, number][] {
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// security-design.md "属性値の出力サニタイズ": agentType / model / modelSource come
// straight out of the audit corpus, which is outside the trust boundary. The
// text sink is a terminal, so a raw value could forge a row or drive the
// terminal - it is reduced to its first line and stripped of control bytes at
// the RENDER point only. compose keeps the value verbatim (an aggregation key
// must not change for a display concern) and --json keeps it too (JSON encoding
// escapes the control bytes, and a machine consumer needs the raw value). The
// helper is U1's export, so this stays on the one-way stats -> observability
// dependency and never reaches for amadeus-lib.ts.
const safe = sanitizeAdvisoryValue;

/** Render the five output sections (BR-U3-5) from the report's fields alone —
 *  a value the report does not carry must not appear in the output. */
export function renderStatsText(report: SubagentStatsReport): string {
  const lines: string[] = [
    "subagent-stats — measurement ref",
    `  measured at: ${report.measuredAt}`,
    `  scan scope:  ${report.scanScope}`,
    `  shards:      ${report.shardCount}`,
    `  events:      ${report.completedTotal} completed / ${report.startedTotal} started`,
    "",
    "verdicts",
    ...TYPE_VERDICTS.map((v) => `  ${v.padEnd(22)}${report.byVerdict.get(v) ?? 0}`),
    "",
    // Count TYPES, not rows: a row is keyed by type AND verdict (BR-U3-3 keeps
    // the adopted and reclassified views apart), so one type can occupy several
    // rows and byType.length would over-report what this header promises.
    `agent types (distinct: ${new Set(report.byType.map((r) => r.agentType)).size})`,
    ...(report.byType.length === 0
      ? ["  (none)"]
      : report.byType.map((r) => `  ${r.count.toString().padStart(6)}  ${safe(r.agentType)}  [${r.verdict}]`)),
    "",
    "models",
    `  ${report.unresolvedModelCount.toString().padStart(6)}  (unresolved)`,
    ...sortedEntries(report.byModel).map(([model, n]) => `  ${n.toString().padStart(6)}  ${safe(model)}`),
    "",
    "model sources",
    ...(report.byModelSource.size === 0
      ? ["  (none)"]
      : sortedEntries(report.byModelSource).map(([source, n]) => `  ${n.toString().padStart(6)}  ${safe(source)}`)),
    "",
    "notes",
    `  parse-skip:           ${report.parseSkippedCount}`,
    `  verdict-mismatch:     ${report.verdictMismatchCount}`,
    `  allowed-set warnings: ${report.allowedSetWarnings.length}`,
    `  unreadable shards:    ${report.unreadableShardCount}`,
  ];

  // Model rows lacking Model Source: derivable from the report's own fields,
  // surfaced as a note (upstream contract drift), never a dedicated field.
  const modelSum = [...report.byModel.values()].reduce((a, b) => a + b, 0);
  const sourceSum = [...report.byModelSource.values()].reduce((a, b) => a + b, 0);
  if (modelSum > sourceSum) {
    lines.push(`  model/source asymmetry: ${modelSum - sourceSum} rows carry Model without Model Source`);
  }
  return lines.join("\n");
}

/** The JSON wire shape: Maps become plain objects, tally order is preserved. */
export function serializeStatsReport(report: SubagentStatsReport): Record<string, unknown> {
  return {
    measuredAt: report.measuredAt,
    scanScope: report.scanScope,
    shardCount: report.shardCount,
    unreadableShardCount: report.unreadableShardCount,
    parseSkippedCount: report.parseSkippedCount,
    verdictMismatchCount: report.verdictMismatchCount,
    allowedSetWarnings: report.allowedSetWarnings,
    completedTotal: report.completedTotal,
    startedTotal: report.startedTotal,
    byVerdict: Object.fromEntries(TYPE_VERDICTS.map((v) => [v, report.byVerdict.get(v) ?? 0])),
    byType: report.byType,
    byModel: Object.fromEntries(sortedEntries(report.byModel)),
    byModelSource: Object.fromEntries(sortedEntries(report.byModelSource)),
    unresolvedModelCount: report.unresolvedModelCount,
  };
}

// ---------------------------------------------------------------------------
// Scan phase + argv handling (the only process-boundary code in this module).
// ---------------------------------------------------------------------------

function stringAttr(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === "string" ? value : undefined;
}

/** Normalize one parsed JSON line onto a SubagentAuditRecord, or null when the
 *  line is not a subagent event. Event matching is EQUALITY on the envelope
 *  field — a substring match would false-positive on WORKFLOW_STARTED Request
 *  bodies that mention the event name (RE method note). */
/** A JSON object, narrowed from the parser's `unknown` before any field is read. */
function objectOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// An audit line is bytes off disk: it enters as `unknown` and earns its shape
// here, so no domain type is asserted onto unproven input (#1980 FR-3a).
function recordFromLine(parsed: unknown): SubagentAuditRecord | null {
  const raw = objectOrNull(parsed);
  if (raw === null) return null;
  const v2 = raw.schemaVersion === 2;
  const fields = objectOrNull(v2 ? raw.attributes : raw.fields) ?? undefined;
  const event = v2 ? fields?.Event : raw.event;
  if (event !== "SUBAGENT_COMPLETED" && event !== "SUBAGENT_STARTED") return null;
  const attrs = fields ?? {};
  return {
    event,
    agentType: stringAttr(attrs, "Agent Type"),
    typeVerdict: stringAttr(attrs, "Type Verdict"),
    model: stringAttr(attrs, "Model"),
    modelSource: stringAttr(attrs, "Model Source"),
  };
}

/** Read every audit shard under the space's intents tree. Missing dirs are a
 *  normal empty corpus; a shard that EXISTS but cannot be read is counted
 *  (fail-loud at the exit code) while the rest of the corpus still scans. */
export function scanAuditCorpus(projectDir: string, space: string): ScannedAudit {
  const records: SubagentAuditRecord[] = [];
  let shardCount = 0;
  let unreadableShardCount = 0;
  let parseSkippedCount = 0;

  const intentsRoot = join(projectDir, "amadeus", "spaces", space, "intents");
  if (!existsSync(intentsRoot)) return { shardCount, unreadableShardCount, parseSkippedCount, records };

  for (const intent of readdirSync(intentsRoot).sort()) {
    const auditDir = join(intentsRoot, intent, "audit");
    if (!existsSync(auditDir)) continue;
    for (const shard of readdirSync(auditDir).sort()) {
      if (!shard.endsWith(".jsonl")) continue;
      const path = join(auditDir, shard);
      let body: string;
      try {
        body = readFileSync(path, "utf-8");
      } catch (e) {
        unreadableShardCount += 1;
        process.stderr.write(`subagent-stats: shard unreadable (${path}): ${e instanceof Error ? e.message : String(e)}\n`);
        continue;
      }
      shardCount += 1;
      for (const line of body.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;
        try {
          const record = recordFromLine(JSON.parse(trimmed));
          if (record !== null) records.push(record);
        } catch {
          // fail-open on a broken line, but the skip is counted, never hidden.
          // `continue` is the explicit terminal the no-silent-drop rule requires.
          parseSkippedCount += 1;
          continue;
        }
      }
    }
  }
  return { shardCount, unreadableShardCount, parseSkippedCount, records };
}

// The two path idioms below mirror amadeus-lib.ts (resolveProjectDir /
// activeSpace), reimplemented small because this module must not import it.

function resolveProjectDirLocal(explicitDir: string | undefined): string {
  if (explicitDir) return explicitDir;
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  if (basename(scriptDir) === "tools") {
    const leaf = basename(dirname(scriptDir));
    if (/^\.[a-z0-9][a-z0-9._-]*$/i.test(leaf)) return dirname(dirname(scriptDir));
  }
  return process.cwd();
}

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function activeSpaceLocal(projectDir: string): string {
  try {
    const raw = readFileSync(join(projectDir, "amadeus", "active-space"), "utf-8").trim();
    if (SAFE_NAME.test(raw)) return raw;
  } catch {
    // No cursor is the normal state, not a failure: return the default from the
    // catch so the fall-through is an explicit terminal, not a silent continue.
    return "default";
  }
  return "default";
}

interface ParsedArgs {
  readonly projectDir: string | undefined;
  readonly space: string | undefined;
  readonly json: boolean;
}

const USAGE = "Usage: bun amadeus-subagent-stats.ts [--project-dir <path>] [--space <name>] [--json]";

/** Parse-don't-validate: an unknown flag or a value-less option is the
 *  caller's error, so it fails closed with a loud message (BR-U3-1). */
function parseArgs(argv: readonly string[]): ParsedArgs | { error: string } {
  let projectDir: string | undefined;
  let space: string | undefined;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--json") {
      json = true;
    } else if (arg === "--project-dir" || arg === "--space") {
      const value = argv[i + 1];
      if (value === undefined) return { error: `${arg} requires a value\n${USAGE}` };
      if (arg === "--project-dir") projectDir = value;
      else space = value;
      i += 1;
    } else {
      return { error: `Unknown argument: ${arg}\n${USAGE}` };
    }
  }
  return { projectDir, space, json };
}

export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    return 2;
  }
  if (parsed.space !== undefined && !SAFE_NAME.test(parsed.space)) {
    process.stderr.write(`Invalid --space value: ${parsed.space}\n${USAGE}\n`);
    return 2;
  }

  const projectDir = resolveProjectDirLocal(parsed.projectDir);
  const space = parsed.space ?? activeSpaceLocal(projectDir);

  // The allowed set resolves against the harness agents dir; read failures
  // degrade to the builtin ledger (U1's fail-open contract), with the reasons
  // surfaced on stderr and carried into the report's notes.
  const resolution = resolveAllowedAgentTypes(join(projectDir, harnessDir(), "agents"));
  for (const warning of resolution.warnings) process.stderr.write(`advisory: ${warning}\n`);

  const scanned = scanAuditCorpus(projectDir, space);
  const report = composeStatsReport(
    scanned,
    resolution,
    new Date().toISOString(),
    `space "${space}" — amadeus/spaces/${space}/intents/*/audit/*.jsonl`,
  );
  process.stdout.write(`${parsed.json ? JSON.stringify(serializeStatsReport(report), null, 2) : renderStatsText(report)}\n`);

  // A shard that existed but could not be read means the tally covers less
  // than the observable universe — fail loud so the numbers are not mistaken
  // for a complete sweep (error-model table).
  return scanned.unreadableShardCount > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
