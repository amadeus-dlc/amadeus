// metrics-instruments.ts — the five measurement call sites (#1868 §6).
//
// U9 stood the Metrics API subset up and deliberately stopped there: with no
// production measurement, a global registration would have been dead wiring.
// This module is the measurement side that registration was waiting for.
//
// THREE RULES HOLD EVERY CALL SITE.
//
//   1. No Meter, no measurement. A process that never stood the metrics arm up
//      records nothing — the call sites ask registeredMeterProjectDir() rather
//      than getAmadeusMeter(), which THROWS when unregistered. A CLI that only
//      writes audit rows must not crash because it passed a measurement point.
//   2. Measurement never changes the caller's control flow. The instruments
//      hang off existing emit paths, so anything the meter or the store does
//      wrong degrades to "no record" (FR-EVT-6, the exporter's own fail-open
//      posture extended to the producer).
//   3. Cardinality is closed BEFORE the try. An attribute outside the
//      instrument's declared set is a caller bug, not an infrastructure
//      failure, so it throws where the author can see it — the same split the
//      Logger Provider draws between BR-10 registry violations and write
//      failures.
//
// DURATIONS CROSS PROCESS BOUNDARIES. A stage starts in one CLI invocation and
// completes in another (`next` and `report` are separate processes), so an
// in-process start map would measure nothing in production. The start instant
// is parked as a one-line marker beside the Signal Stores and consumed by the
// completing process. The marker is NOT a store: the Relay selects store files
// by the `spans-`/`logs-`/`metrics-` prefix plus a `.jsonl` suffix, and these
// match neither.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadStageGraph } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";
import { getAmadeusMeter, registeredMeterProjectDir } from "./meter-provider.ts";
import { admitInstrumentAttributes, TOKEN_TYPES } from "./metrics-vocabulary.ts";
import type { InstrumentName } from "./metrics-vocabulary.ts";
import type { TokenUsage } from "./resource-suppliers.ts";

// --- measurement ------------------------------------------------------------

function measure(
  name: InstrumentName,
  kind: "counter" | "histogram",
  value: number,
  attributes: Readonly<Record<string, string | null | undefined>>
): void {
  if (registeredMeterProjectDir() === null) return;
  // Outside the try on purpose (rule 3).
  const admitted = admitInstrumentAttributes(name, attributes);
  try {
    const meter = getAmadeusMeter();
    if (kind === "counter") meter.createCounter(name).add(value, admitted);
    else meter.createHistogram(name).record(value, admitted);
  } catch {
    // degrade (rule 2)
  }
}

export function recordStageDuration(durationMs: number, attributes: { stage: string; phase?: string | null }): void {
  measure("amadeus.stage.duration", "histogram", durationMs, {
    "amadeus.stage": attributes.stage,
    "amadeus.phase": attributes.phase,
  });
}

export function recordGateIteration(attributes: { stage: string }): void {
  measure("amadeus.gate.iterations", "counter", 1, { "amadeus.stage": attributes.stage });
}

export function recordOperationFailure(attributes: { operation: string }): void {
  measure("amadeus.operation.failures", "counter", 1, { "amadeus.operation": attributes.operation });
}

export function recordSubagentDuration(durationMs: number, attributes: { agentType: string }): void {
  measure("amadeus.subagent.duration", "histogram", durationMs, { "amadeus.agent.type": attributes.agentType });
}

// One exchange's token counts (#1868 §6). Recorded as two observations of the
// SAME histogram rather than one two-dimensional record: `gen_ai.token.type` is
// the dimension the GenAI semantic conventions split input from output on, so a
// single record carrying both counts would have no honest value to report.
export function recordTokenUsage(usage: TokenUsage): void {
  const counts: Record<(typeof TOKEN_TYPES)[number], number> = {
    input: usage.inputTokens,
    output: usage.outputTokens,
  };
  for (const type of TOKEN_TYPES) {
    measure("gen_ai.client.token.usage", "histogram", counts[type], {
      "gen_ai.token.type": type,
      "gen_ai.request.model": usage.model,
    });
  }
}

// --- cross-process duration pairing -----------------------------------------

export type DurationKind = "stage" | "subagent";

// Marker filenames are derived from a key the emitter supplies (a stage slug,
// an agent type), so the derivation has to survive a key that is not a legal
// filename. Everything outside the safe class collapses to `_`, and the result
// is capped — a pathological key must not produce a path the filesystem
// refuses, because a throw here would reach a production emit path.
function markerPath(projectDir: string, kind: DurationKind, key: string): string | null {
  const dir = telemetryDir(projectDir);
  if (dir === null) return null;
  const safe = key.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  if (safe === "") return null;
  return join(dir, `pending-${kind}-${safe}.start`);
}

// Park the start instant for a later process to consume. Fail-open: a workspace
// with no resolvable record simply measures no duration.
export function markDurationStart(projectDir: string, kind: DurationKind, key: string, atMs = Date.now()): void {
  try {
    const path = markerPath(projectDir, kind, key);
    if (path === null) return;
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, String(atMs), "utf-8");
  } catch {
    // fail-open
  }
}

// Consume the parked start instant. Returns null when nothing was parked (the
// completing half ran without its starting half — a resumed workflow, a
// re-jump, a workspace that upgraded mid-stage), which is a measurement that
// does not happen rather than an error. The marker is removed on the way out so
// a second completion cannot re-measure the same interval.
export function takeDurationStart(projectDir: string, kind: DurationKind, key: string): number | null {
  try {
    const path = markerPath(projectDir, kind, key);
    if (path === null || !existsSync(path)) return null;
    const parsed = Number.parseInt(readFileSync(path, "utf-8").trim(), 10);
    rmSync(path, { force: true });
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// --- canonical event observer -----------------------------------------------

// The stage graph is the only place a stage's phase is written down; the
// STAGE_COMPLETED row carries the slug alone. Memoised by the loader itself, so
// this stays a map lookup after the first call, and fail-open: a workspace
// whose graph is unreadable records the duration without the phase dimension
// rather than losing the measurement.
let phaseBySlug: Map<string, string> | null = null;
function phaseForStage(slug: string): string | null {
  try {
    phaseBySlug ??= new Map(loadStageGraph().map((entry) => [entry.slug, entry.phase]));
    return phaseBySlug.get(slug) ?? null;
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

type Derivation = (projectDir: string, attributes: Readonly<Record<string, unknown>>) => void;

// Which canonical event derives which measurement. A table rather than a
// switch: the mapping IS the contract #1868 §6 states, and a lookup keeps each
// derivation readable on its own.
//
// Four of the five instruments live here; token usage has no canonical event —
// no Amadeus process sees an LLM call — and arrives through the harness supply
// seam instead.
const DERIVATIONS: Readonly<Record<string, Derivation>> = {
  "amadeus.stage.started": (projectDir, attributes) => {
    const stage = text(attributes.Stage);
    if (stage !== null) markDurationStart(projectDir, "stage", stage);
  },
  "amadeus.stage.completed": (projectDir, attributes) => {
    const stage = text(attributes.Stage);
    if (stage === null) return;
    const startedMs = takeDurationStart(projectDir, "stage", stage);
    if (startedMs === null) return;
    recordStageDuration(Date.now() - startedMs, { stage, phase: phaseForStage(stage) });
  },
  // The reviewer/gate iteration a stage actually spends. GATE_REJECTED and
  // STAGE_REVISING are emitted as a pair (amadeus-state.ts), so counting the
  // revision — the row that carries the iteration count — counts each
  // rejection once instead of twice.
  "amadeus.stage.revising": (_projectDir, attributes) => {
    const stage = text(attributes.Stage);
    if (stage !== null) recordGateIteration({ stage });
  },
  "amadeus.operation.failed": (_projectDir, attributes) => {
    // `Tool` is the low-cardinality half of this event; `Command` is
    // argv-derived and would make every invocation its own series.
    const operation = text(attributes.Tool);
    if (operation !== null) recordOperationFailure({ operation });
  },
  "amadeus.subagent.started": (projectDir, attributes) => {
    const agentType = text(attributes["Agent Type"]);
    if (agentType !== null) markDurationStart(projectDir, "subagent", agentType);
  },
  "amadeus.subagent.completed": (projectDir, attributes) => {
    const agentType = text(attributes["Agent Type"]);
    if (agentType === null) return;
    const startedMs = takeDurationStart(projectDir, "subagent", agentType);
    if (startedMs === null) return;
    recordSubagentDuration(Date.now() - startedMs, { agentType });
  },
};

// The single derivation point from canonical events to measurements, called
// from the Logger Provider once a row has actually landed.
//
// Wrapped whole in a try: this runs inside an emit that has already succeeded,
// and a measurement must not turn a written audit row into a thrown error.
export function observeCanonicalEventForMetrics(
  projectDir: string,
  name: string,
  attributes: Readonly<Record<string, unknown>>
): void {
  try {
    DERIVATIONS[name]?.(projectDir, attributes);
  } catch {
    // fail-open (rule 2)
  }
}

// Test seam: the phase memo is per-process, dropped between fixtures the same
// way the provider registrations are.
export function resetMetricsInstrumentsForTests(): void {
  phaseBySlug = null;
}
