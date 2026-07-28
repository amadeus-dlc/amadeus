// amadeus-otel-projector.ts — journal/buffer -> OTLP projection
// (Issue #1628, Phase 3).
//
// The ONLY place in the framework that speaks OpenTelemetry — and it does so
// with ZERO dependencies: OTLP/HTTP is a stable JSON wire format, so the
// projector builds ResourceSpans/ResourceMetrics itself and POSTs them with
// fetch (PoC-verified against Jaeger and the otel-collector, #1628
// Phase 0). Core never imports this module; it runs on demand (session-end
// piggyback or the CLI) and reads two machine-owned inputs:
//
//   - the intent's journal shards  (domain events; the canonical ledger)
//   - the telemetry buffer         (fine-grained timings; machine-local)
//
// Identity is DETERMINISTIC (設計裁定 Q3/Q10): trace_id derives from the
// (space, intent) pair and every span_id from a stable path inside that
// trace, so any process on any clone reconstructs the same trace and a
// re-export overwrites the same spans instead of duplicating them.
// Telemetry stays fail-open end to end (Q12): an unreachable OTLP endpoint
// drops the POST with one stderr line + a diagnostics note; the local file
// export and the exit code stay green.

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type JournalEntry, parseJournalShard } from "./amadeus-journal.ts";
import {
  activeIntent,
  activeSpace,
  auditShards,
  resolveProjectDir,
} from "./amadeus-lib.ts";
import {
  type ObservabilityConfig,
  resolveObservabilityConfig,
  telemetryDir,
} from "./amadeus-observability.ts";

// --- deterministic identity (Q3: hash of space + intent; Q10: path-scoped) --

function detHex(domain: string, key: string, hexLen: number): string {
  return createHash("sha256").update(domain).update("\0").update(key).digest("hex").slice(0, hexLen);
}

export function traceIdFor(space: string, intentDir: string): string {
  return detHex("amadeus.trace", `${space}/${intentDir}`, 32);
}

export function spanIdFor(traceId: string, path: string): string {
  return detHex("amadeus.span", `${traceId}/${path}`, 16);
}

// --- inputs -----------------------------------------------------------------

type BufferEvent = {
  v: number;
  kind: "process" | "operation" | "subprocess";
  name: string;
  startMs: number;
  endMs: number;
  ok: boolean;
  pid: number;
  intentId: string;
  cloneId: string;
  harness: string;
  meta?: Record<string, string>;
};

function readBufferEvents(projectDir: string): BufferEvent[] {
  const dir = telemetryDir(projectDir);
  if (dir === null || !existsSync(dir)) return [];
  const events: BufferEvent[] = [];
  for (const file of readdirSync(dir).filter((f) => f.startsWith("buffer-") && f.endsWith(".jsonl"))) {
    let raw: string;
    try {
      raw = readFileSync(join(dir, file), "utf-8");
    } catch {
      continue; // an unreadable buffer file never blocks the export (fail-open)
    }
    for (const line of raw.split("\n")) {
      if (!line.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(line) as BufferEvent;
        if (parsed.v === 1 && typeof parsed.startMs === "number" && typeof parsed.endMs === "number") {
          events.push(parsed);
        }
      } catch {
        // a torn line is dropped; the projector never fails on buffer noise
      }
    }
  }
  return events.sort((a, b) => a.startMs - b.startMs);
}

function readJournalEntries(projectDir: string, intent: string, space: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (const shard of auditShards(projectDir, intent, space)) {
    try {
      entries.push(...parseJournalShard(readFileSync(shard, "utf-8")));
    } catch {
      // A malformed shard is the doctor's business; the projector projects
      // what parses and never blocks the workflow (fail-open).
    }
  }
  return entries.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
}

// --- span model -------------------------------------------------------------

type Span = {
  readonly path: string;
  readonly parentPath: string | null;
  readonly name: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly ok: boolean;
  readonly attrs: Record<string, string>;
};

const tsMs = (iso: string): number => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
};

function field(entry: JournalEntry, name: string): string | null {
  return entry.fields?.[name] ?? null;
}

type Interval = { name: string; startMs: number; endMs: number };

function containing(intervals: Interval[], startMs: number): Interval | null {
  let best: Interval | null = null;
  for (const candidate of intervals) {
    if (candidate.startMs <= startMs && startMs < candidate.endMs) best = candidate;
  }
  return best;
}

// Build the 5-level hierarchy (Q10): intent -> phase -> stage -> process ->
// operation/subprocess. Domain levels come from the journal; the two runtime
// levels come from the buffer. Parenting is time-containment: a stage attaches
// to the phase whose interval contains its start, a process to the stage, an
// operation to the process of the same pid (or the containing stage).

function rootSpan(entries: JournalEntry[], nowMs: number): Span {
  const started = entries.filter((e) => e.event === "WORKFLOW_STARTED");
  const completed = entries.filter((e) => e.event === "WORKFLOW_COMPLETED");
  const rootStart = started.length > 0 ? tsMs(started[0]!.timestamp) : (entries[0] ? tsMs(entries[0].timestamp) : nowMs);
  const rootEnd = completed.length > 0 ? tsMs(completed[completed.length - 1]!.timestamp) : nowMs;
  return {
    path: "intent",
    parentPath: null,
    name: `intent ${entries[0]?.intentId ?? "unknown"}`,
    startMs: rootStart,
    endMs: Math.max(rootEnd, rootStart),
    ok: true,
    attrs: {},
  };
}

function phaseEndMatches(entry: JournalEntry, phase: string, startMs: number): boolean {
  if (entry.event !== "PHASE_COMPLETED" && entry.event !== "PHASE_VERIFIED") return false;
  if (tsMs(entry.timestamp) < startMs) return false;
  return field(entry, "From phase") === phase || (field(entry, "Phase boundary")?.includes(phase) ?? false) || field(entry, "Phase") === phase;
}

function pushPhaseSpans(entries: JournalEntry[], root: Span, spans: Span[], phaseIntervals: Interval[]): void {
  for (const e of entries) {
    if (e.event !== "PHASE_STARTED") continue;
    const phase = field(e, "Phase") ?? "unknown";
    const startMs = tsMs(e.timestamp);
    const end = entries.find((x) => phaseEndMatches(x, phase, startMs));
    const endMs = end ? tsMs(end.timestamp) : root.endMs;
    const path = `phase:${phase}:${e.timestamp}`;
    phaseIntervals.push({ name: path, startMs, endMs });
    spans.push({ path, parentPath: "intent", name: `phase ${phase}`, startMs, endMs: Math.max(endMs, startMs), ok: true, attrs: { "amadeus.phase": phase } });
  }
}

function pushStageSpans(entries: JournalEntry[], root: Span, spans: Span[], phaseIntervals: Interval[], stageIntervals: Interval[]): void {
  for (const e of entries) {
    if (e.event !== "STAGE_STARTED") continue;
    const stage = field(e, "Stage") ?? "unknown";
    const startMs = tsMs(e.timestamp);
    const end = entries.find((x) => x.event === "STAGE_COMPLETED" && field(x, "Stage") === stage && tsMs(x.timestamp) >= startMs);
    const endMs = end ? tsMs(end.timestamp) : root.endMs;
    const parent = containing(phaseIntervals, startMs);
    const path = `stage:${stage}:${e.timestamp}`;
    stageIntervals.push({ name: path, startMs, endMs });
    spans.push({
      path,
      parentPath: parent?.name ?? "intent",
      name: `stage ${stage}`,
      startMs,
      endMs: Math.max(endMs, startMs),
      ok: true,
      attrs: {
        "amadeus.stage": stage,
        ...(parent ? { "amadeus.phase": spans.find((s) => s.path === parent.name)?.attrs["amadeus.phase"] ?? "" } : {}),
      },
    });
  }
}

function pushBufferSpans(buffer: BufferEvent[], spans: Span[], stageIntervals: Interval[]): void {
  const processIntervals: Array<Interval & { pid: number }> = [];
  for (const b of buffer) {
    if (b.kind !== "process") continue;
    const parent = containing(stageIntervals, b.startMs);
    const path = `proc:${b.cloneId}:${b.pid}:${b.startMs}`;
    processIntervals.push({ name: path, startMs: b.startMs, endMs: b.endMs, pid: b.pid });
    spans.push({
      path,
      parentPath: parent?.name ?? "intent",
      name: b.name,
      startMs: b.startMs,
      endMs: b.endMs,
      ok: b.ok,
      attrs: { "amadeus.harness": b.harness, "amadeus.clone_id": b.cloneId, ...(b.meta ?? {}) },
    });
  }
  for (const b of buffer) {
    if (b.kind === "process") continue;
    const proc = processIntervals.find((p) => p.pid === b.pid && p.startMs <= b.startMs && b.startMs <= p.endMs);
    const stage = containing(stageIntervals, b.startMs);
    const path = `${b.kind}:${b.cloneId}:${b.pid}:${b.startMs}:${b.name}`;
    spans.push({
      path,
      parentPath: proc?.name ?? stage?.name ?? "intent",
      name: b.name,
      startMs: b.startMs,
      endMs: b.endMs,
      ok: b.ok,
      attrs: { "amadeus.harness": b.harness, "amadeus.clone_id": b.cloneId, ...(b.meta ?? {}) },
    });
  }
}

export function buildSpans(
  entries: JournalEntry[],
  buffer: BufferEvent[],
  nowMs: number,
): { root: Span; spans: Span[] } {
  const spans: Span[] = [];
  const root = rootSpan(entries, nowMs);
  const phaseIntervals: Interval[] = [];
  const stageIntervals: Interval[] = [];
  pushPhaseSpans(entries, root, spans, phaseIntervals);
  pushStageSpans(entries, root, spans, phaseIntervals, stageIntervals);
  pushBufferSpans(buffer, spans, stageIntervals);
  return { root, spans };
}

// --- OTLP JSON --------------------------------------------------------------

const attr = (key: string, value: string) => ({ key, value: { stringValue: value } });
const nano = (ms: number): string => `${BigInt(Math.max(0, Math.round(ms)))}000000`;

type RuntimeAttrs = { model?: string; harness?: string };

function readRuntimeAttrs(projectDir: string): RuntimeAttrs {
  try {
    const dir = telemetryDir(projectDir);
    if (dir === null) return {};
    return JSON.parse(readFileSync(join(dir, "runtime-attrs.json"), "utf-8")) as RuntimeAttrs;
  } catch {
    return {};
  }
}

export function buildOtlpTraces(
  traceId: string,
  root: Span,
  spans: Span[],
  resource: { cloneId: string; model?: string },
): unknown {
  const toOtlp = (span: Span) => ({
    traceId,
    spanId: spanIdFor(traceId, span.path),
    ...(span.parentPath !== null ? { parentSpanId: spanIdFor(traceId, span.parentPath) } : {}),
    name: span.name,
    kind: 1,
    startTimeUnixNano: nano(span.startMs),
    endTimeUnixNano: nano(span.endMs),
    attributes: Object.entries(span.attrs)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => attr(k, v)),
    status: { code: span.ok ? 1 : 2 },
  });
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            attr("service.name", "amadeus"),
            attr("service.instance.id", resource.cloneId),
            ...(resource.model ? [attr("gen_ai.request.model", resource.model)] : []),
          ],
        },
        scopeSpans: [
          {
            scope: { name: "amadeus-otel-projector" },
            spans: [toOtlp(root), ...spans.map(toOtlp)],
          },
        ],
      },
    ],
  };
}

// Metrics derive from the SAME inputs as the spans (Q14) with low-cardinality
// attributes only; intentId deliberately stays out (unbounded cardinality —
// per-intent analysis is the trace's job).
export function buildOtlpMetrics(
  entries: JournalEntry[],
  buffer: BufferEvent[],
  resource: { cloneId: string },
  nowMs: number,
): unknown {
  type Key = string;
  const counts = new Map<Key, { attrs: Record<string, string>; count: number; sumMs: number }>();
  const bump = (kindName: string, attrs: Record<string, string>, durMs: number) => {
    const key = `${kindName}|${JSON.stringify(attrs)}`;
    const row = counts.get(key) ?? { attrs, count: 0, sumMs: 0 };
    row.count += 1;
    row.sumMs += durMs;
    counts.set(key, row);
  };

  for (const e of entries) {
    if (e.event !== "STAGE_COMPLETED") continue;
    const stage = field(e, "Stage") ?? "unknown";
    const start = entries.find((x) => x.event === "STAGE_STARTED" && field(x, "Stage") === stage && tsMs(x.timestamp) <= tsMs(e.timestamp));
    bump("stage", { "amadeus.stage": stage }, start ? tsMs(e.timestamp) - tsMs(start.timestamp) : 0);
  }
  for (const b of buffer) {
    bump(b.kind, { name: b.name, "amadeus.harness": b.harness, outcome: b.ok ? "success" : "failure" }, b.endMs - b.startMs);
  }

  const dataPoints = (prefix: string) =>
    [...counts.entries()]
      .filter(([k]) => k.startsWith(`${prefix}|`))
      .map(([, row]) => ({
        count: row.count,
        sum: row.sumMs,
        attrs: row.attrs,
      }));

  const metricOf = (name: string, unit: string, prefix: string) => ({
    name,
    unit,
    sum: {
      aggregationTemporality: 2,
      isMonotonic: true,
      dataPoints: dataPoints(prefix).map((p) => ({
        timeUnixNano: nano(nowMs),
        asInt: String(p.count),
        attributes: Object.entries(p.attrs).map(([k, v]) => attr(k, v)),
      })),
    },
  });
  const durationMetricOf = (name: string, prefix: string) => ({
    name,
    unit: "ms",
    sum: {
      aggregationTemporality: 2,
      isMonotonic: true,
      dataPoints: dataPoints(prefix).map((p) => ({
        timeUnixNano: nano(nowMs),
        asDouble: p.sum,
        attributes: Object.entries(p.attrs).map(([k, v]) => attr(k, v)),
      })),
    },
  });

  return {
    resourceMetrics: [
      {
        resource: {
          attributes: [attr("service.name", "amadeus"), attr("service.instance.id", resource.cloneId)],
        },
        scopeMetrics: [
          {
            scope: { name: "amadeus-otel-projector" },
            metrics: [
              metricOf("amadeus.stage.executions", "1", "stage"),
              durationMetricOf("amadeus.stage.duration", "stage"),
              metricOf("amadeus.process.executions", "1", "process"),
              durationMetricOf("amadeus.process.duration", "process"),
              metricOf("amadeus.subprocess.executions", "1", "subprocess"),
              durationMetricOf("amadeus.subprocess.duration", "subprocess"),
              metricOf("amadeus.operation.executions", "1", "operation"),
              durationMetricOf("amadeus.operation.duration", "operation"),
            ],
          },
        ],
      },
    ],
  };
}

// --- cursor + lock (Q19: on-demand, no daemon, idempotent) ------------------

type Cursor = { journalLines: Record<string, number>; bufferLines: Record<string, number> };

function inputFingerprint(projectDir: string, intent: string, space: string): Cursor {
  const journalLines: Record<string, number> = {};
  for (const shard of auditShards(projectDir, intent, space)) {
    try {
      journalLines[shard] = readFileSync(shard, "utf-8").split("\n").filter((l) => l !== "").length;
    } catch {
      journalLines[shard] = -1;
    }
  }
  const bufferLines: Record<string, number> = {};
  const dir = telemetryDir(projectDir);
  if (dir !== null && existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f.startsWith("buffer-"))) {
      try {
        bufferLines[file] = readFileSync(join(dir, file), "utf-8").split("\n").filter((l) => l !== "").length;
      } catch {
        bufferLines[file] = -1;
      }
    }
  }
  return { journalLines, bufferLines };
}

const LOCK_STALE_MS = 10 * 60 * 1000;

function acquireProjectorLock(dir: string): boolean {
  const lock = join(dir, ".projector-lock");
  try {
    mkdirSync(lock);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, startedAtMs: Date.now() }), "utf-8");
    return true;
  } catch {
    try {
      const owner = JSON.parse(readFileSync(join(lock, "owner.json"), "utf-8")) as { startedAtMs?: number };
      if (typeof owner.startedAtMs === "number" && Date.now() - owner.startedAtMs > LOCK_STALE_MS) {
        rmSync(lock, { recursive: true, force: true });
        return acquireProjectorLock(dir);
      }
    } catch {
      // unreadable stamp -> treat as held (fail-safe: skip this run)
    }
    return false;
  }
}

function releaseProjectorLock(dir: string): void {
  try {
    rmSync(join(dir, ".projector-lock"), { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

function noteDiagnostics(dir: string, message: string): void {
  try {
    appendFileSync(join(dir, "diagnostics.log"), `${new Date().toISOString()} ${message}\n`, "utf-8");
  } catch {
    // fail-open all the way down
  }
}

// --- export -----------------------------------------------------------------

export type OtlpSignalResult = "posted" | "failed" | "skipped";

export type ExportSummary = {
  status: "exported" | "unchanged" | "disabled" | "locked" | "no-intent";
  spans?: number;
  metrics?: number;
  local?: string[];
  // Per-signal so a metrics-less backend (e.g. Jaeger) does not mask a
  // successful trace export — observed live in the Phase 3 E2E.
  otlp?: { traces: OtlpSignalResult; metrics: OtlpSignalResult };
};

async function postOtlp(endpoint: string, path: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function cursorUnchanged(cursorPath: string, fingerprint: Cursor): boolean {
  if (!existsSync(cursorPath)) return false;
  try {
    const previous = JSON.parse(readFileSync(cursorPath, "utf-8")) as Cursor;
    return JSON.stringify(previous) === JSON.stringify(fingerprint);
  } catch {
    return false; // unreadable cursor -> full rebuild
  }
}

function writeLocalExport(dir: string, traces: unknown, metrics: unknown): string[] {
  const exportDir = join(dir, "export");
  mkdirSync(exportDir, { recursive: true });
  const tracesPath = join(exportDir, "traces.json");
  const metricsPath = join(exportDir, "metrics.json");
  writeFileSync(tracesPath, `${JSON.stringify(traces, null, 2)}\n`, "utf-8");
  writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf-8");
  return [tracesPath, metricsPath];
}

async function postSignals(
  endpoint: string,
  dir: string,
  traces: unknown,
  metrics: unknown,
): Promise<NonNullable<ExportSummary["otlp"]>> {
  const otlp = {
    traces: (await postOtlp(endpoint, "/v1/traces", traces)) ? ("posted" as const) : ("failed" as const),
    metrics: (await postOtlp(endpoint, "/v1/metrics", metrics)) ? ("posted" as const) : ("failed" as const),
  };
  for (const signal of ["traces", "metrics"] as const) {
    if (otlp[signal] === "failed") {
      process.stderr.write(`amadeus-otel-projector: OTLP ${signal} export to ${endpoint} failed (telemetry dropped; workflow unaffected)\n`);
      noteDiagnostics(dir, `otlp ${signal} export failed: ${endpoint}`);
    }
  }
  return otlp;
}

async function exportProjection(
  projectDir: string,
  intent: string,
  space: string,
  dir: string,
  config: ObservabilityConfig,
  options: { force?: boolean; now?: number },
): Promise<ExportSummary> {
  const cursorPath = join(dir, "cursor.json");
  const fingerprint = inputFingerprint(projectDir, intent, space);
  if (!options.force && cursorUnchanged(cursorPath, fingerprint)) return { status: "unchanged" };

  const nowMs = options.now ?? Date.now();
  const entries = readJournalEntries(projectDir, intent, space);
  const buffer = readBufferEvents(projectDir);
  const traceId = traceIdFor(space, intent);
  const { root, spans } = buildSpans(entries, buffer, nowMs);
  const runtime = readRuntimeAttrs(projectDir);
  const cloneId = buffer[0]?.cloneId ?? entries[0]?.cloneId ?? "unknown";
  const traces = buildOtlpTraces(traceId, root, spans, { cloneId, model: runtime.model });
  const metrics = buildOtlpMetrics(entries, buffer, { cloneId }, nowMs);

  const local = config.localExport ? writeLocalExport(dir, traces, metrics) : [];

  // OTEL_* env wins over the config value (設計裁定 Q11).
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? config.otlpEndpoint;
  const otlp: ExportSummary["otlp"] = endpoint
    ? await postSignals(endpoint, dir, traces, metrics)
    : { traces: "skipped", metrics: "skipped" };

  writeFileSync(cursorPath, `${JSON.stringify(fingerprint)}\n`, "utf-8");
  return { status: "exported", spans: spans.length + 1, metrics: 8, local, otlp };
}

export async function runExport(
  projectDir: string,
  options: { force?: boolean; now?: number } = {},
): Promise<ExportSummary> {
  const config: ObservabilityConfig = resolveObservabilityConfig(projectDir);
  if (!config.enabled) return { status: "disabled" };
  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space);
  if (intent === null) return { status: "no-intent" };
  const dir = telemetryDir(projectDir);
  if (dir === null) return { status: "no-intent" };
  mkdirSync(dir, { recursive: true });

  if (!acquireProjectorLock(dir)) return { status: "locked" };
  try {
    return await exportProjection(projectDir, intent, space, dir, config, options);
  } finally {
    releaseProjectorLock(dir);
  }
}

// --- CLI --------------------------------------------------------------------

export function parseCliArgs(argv: string[]): { projectDir?: string; force: boolean } {
  let projectDir: string | undefined;
  let force = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--project-dir") projectDir = argv[++i];
    else if (argv[i] === "--force") force = true;
  }
  return { projectDir, force };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const verb = args[0];
  if (verb !== "export") {
    process.stderr.write("Usage: amadeus-otel-projector.ts export [--project-dir <path>] [--force]\n");
    process.exit(1);
  }
  const { projectDir, force } = parseCliArgs(args.slice(1));
  const summary = await runExport(resolveProjectDir(projectDir), { force });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}
