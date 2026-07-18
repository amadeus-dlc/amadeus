import { constants as fsConstants, copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type CodexHooksActivation = "created" | "preserved";

export type CodexHooksReason =
  | "OK"
  | "CANONICAL_MISSING"
  | "CANONICAL_JSON_INVALID"
  | "CANONICAL_STRUCTURE_INVALID"
  | "CANONICAL_TUPLES_MISSING"
  | "ACTIVE_MISSING"
  | "ACTIVE_JSON_INVALID"
  | "ACTIVE_STRUCTURE_INVALID"
  | "TUPLE_MISMATCH";

export interface CodexHooksCheck {
  schemaVersion: 1;
  command: "doctor";
  pass: boolean;
  reason: CodexHooksReason;
  label: string;
  fix?: string;
}

export interface CodexHookTuple {
  event: string;
  matcher: string | null;
  type: string;
  command: string;
}

export type CodexHookInspection =
  | { kind: "ok"; tuples: CodexHookTuple[] }
  | { kind: "json-invalid" }
  | { kind: "structure-invalid" };

export const ADAPTER_PATH = ".codex/hooks/amadeus-codex-adapter.ts";
export const ACTIVE_HOOKS_PATH = ".codex/hooks.json";
export const CANONICAL_HOOKS_PATH = ".codex/hooks.json.example";

class CodexHookContractError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function adapterTuplesForGroup(event: string, group: unknown): CodexHookTuple[] {
  if (!isRecord(group) || !Array.isArray(group.hooks)) {
    throw new CodexHookContractError("hook group must contain a hooks array");
  }
  const adapterHooks = group.hooks.filter(
    (hook): hook is Record<string, unknown> & { command: string } =>
      isRecord(hook) &&
      typeof hook.command === "string" &&
      hook.command.includes(ADAPTER_PATH),
  );
  if (adapterHooks.length === 0) return [];
  if (group.matcher !== undefined && typeof group.matcher !== "string") {
    throw new CodexHookContractError("adapter matcher must be a string");
  }
  const matcher = typeof group.matcher === "string" ? group.matcher : null;
  return adapterHooks.map((hook) => {
    if (typeof hook.type !== "string") {
      throw new CodexHookContractError("adapter hook type must be a string");
    }
    return { event, matcher, type: hook.type, command: hook.command };
  });
}

function parseCodexHookTuples(parsed: unknown): CodexHookTuple[] {
  if (!isRecord(parsed) || !isRecord(parsed.hooks)) {
    throw new CodexHookContractError("hooks must be an object");
  }
  return Object.entries(parsed.hooks).flatMap(([event, groups]) => {
    if (!Array.isArray(groups)) {
      throw new CodexHookContractError("hook event must contain a group array");
    }
    return groups.flatMap((group) => adapterTuplesForGroup(event, group));
  });
}

export function inspectCodexHooks(raw: string): CodexHookInspection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { kind: "json-invalid" };
  }
  try {
    return { kind: "ok", tuples: parseCodexHookTuples(parsed) };
  } catch {
    return { kind: "structure-invalid" };
  }
}

function tupleCounts(tuples: CodexHookTuple[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tuple of tuples) {
    const key = JSON.stringify(tuple);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function tupleDifference(
  left: CodexHookTuple[],
  right: CodexHookTuple[],
): CodexHookTuple[] {
  const leftCounts = tupleCounts(left);
  const rightCounts = tupleCounts(right);
  const difference: CodexHookTuple[] = [];
  for (const [key, count] of leftCounts) {
    const remaining = count - (rightCounts.get(key) ?? 0);
    for (let i = 0; i < remaining; i++) {
      difference.push(JSON.parse(key) as CodexHookTuple);
    }
  }
  return difference;
}

export function hookTuplesMatch(
  expected: CodexHookTuple[],
  actual: CodexHookTuple[],
): boolean {
  return (
    expected.length > 0 &&
    tupleDifference(expected, actual).length === 0 &&
    tupleDifference(actual, expected).length === 0
  );
}

interface SafeVocabulary {
  events: Set<string>;
  matchers: Set<string>;
  types: Set<string>;
}

function safeVocabulary(expected: CodexHookTuple[]): SafeVocabulary {
  return {
    events: new Set(expected.map((tuple) => tuple.event)),
    matchers: new Set(
      expected.flatMap((tuple) => (tuple.matcher === null ? [] : [tuple.matcher])),
    ),
    types: new Set(expected.map((tuple) => tuple.type)),
  };
}

function safeTupleToken(value: string | null, known: Set<string>): string {
  if (value === null) return "null";
  return known.has(value) ? value : "<redacted>";
}

function renderTuple(tuple: CodexHookTuple, vocabulary: SafeVocabulary): string {
  return (
    `{event=${safeTupleToken(tuple.event, vocabulary.events)}, ` +
    `matcher=${safeTupleToken(tuple.matcher, vocabulary.matchers)}, ` +
    `type=${safeTupleToken(tuple.type, vocabulary.types)}, command=${ADAPTER_PATH}}`
  );
}

function check(
  pass: boolean,
  reason: CodexHooksReason,
  label: string,
  fix?: string,
): CodexHooksCheck {
  return { schemaVersion: 1, command: "doctor", pass, reason, label, ...(fix ? { fix } : {}) };
}

export function codexHooksDoctorCheck(projectDir: string): CodexHooksCheck {
  const canonicalPath = join(projectDir, CANONICAL_HOOKS_PATH);
  const activePath = join(projectDir, ACTIVE_HOOKS_PATH);
  if (!existsSync(canonicalPath)) {
    return check(
      false,
      "CANONICAL_MISSING",
      "Codex hooks contract: canonical example is missing",
      "restore `.codex/hooks.json.example` from the installed distribution",
    );
  }

  const canonical = inspectCodexHooks(readFileSync(canonicalPath, "utf8"));
  if (canonical.kind === "json-invalid") {
    return check(
      false,
      "CANONICAL_JSON_INVALID",
      "Codex hooks contract: canonical example contains invalid JSON",
      "restore `.codex/hooks.json.example` from the installed distribution",
    );
  }
  if (canonical.kind === "structure-invalid") {
    return check(
      false,
      "CANONICAL_STRUCTURE_INVALID",
      "Codex hooks contract: canonical example has invalid hook structure",
      "restore `.codex/hooks.json.example` from the installed distribution",
    );
  }
  if (canonical.tuples.length === 0) {
    return check(
      false,
      "CANONICAL_TUPLES_MISSING",
      "Codex hooks contract: canonical example wires no Amadeus adapter commands",
      "restore `.codex/hooks.json.example` from the installed distribution",
    );
  }
  if (!existsSync(activePath)) {
    return check(
      false,
      "ACTIVE_MISSING",
      "Codex hooks contract: local active file is missing",
      "run `bun .codex/tools/amadeus-codex-hooks.ts activate`",
    );
  }

  const active = inspectCodexHooks(readFileSync(activePath, "utf8"));
  if (active.kind === "json-invalid") {
    return check(
      false,
      "ACTIVE_JSON_INVALID",
      "Codex hooks contract: local active file contains invalid JSON",
      "move the active file outside the repository, repair it without overwriting local entries, then rerun doctor",
    );
  }
  if (active.kind === "structure-invalid") {
    return check(
      false,
      "ACTIVE_STRUCTURE_INVALID",
      "Codex hooks contract: local active file has invalid hook structure",
      "move the active file outside the repository, repair it without overwriting local entries, then rerun doctor",
    );
  }

  const missing = tupleDifference(canonical.tuples, active.tuples);
  const extra = tupleDifference(active.tuples, canonical.tuples);
  if (missing.length > 0 || extra.length > 0) {
    const vocabulary = safeVocabulary(canonical.tuples);
    return check(
      false,
      "TUPLE_MISMATCH",
      "Codex hooks contract: Amadeus adapter tuples differ from canonical; " +
        `missing=[${missing.map((tuple) => renderTuple(tuple, vocabulary)).join(", ")}]; ` +
        `extra=[${extra.map((tuple) => renderTuple(tuple, vocabulary)).join(", ")}]`,
      "move the active file outside the repository, manually merge the missing Amadeus tuples, restore it, then rerun doctor",
    );
  }
  return check(
    true,
    "OK",
    "Codex hooks contract: local active matches canonical Amadeus adapter tuples",
  );
}

export function activateCodexHooks(projectDir: string): CodexHooksActivation {
  const canonicalPath = join(projectDir, CANONICAL_HOOKS_PATH);
  const activePath = join(projectDir, ACTIVE_HOOKS_PATH);
  if (!existsSync(canonicalPath)) {
    throw new Error("Codex hooks activation failed: canonical example is missing");
  }
  const canonical = inspectCodexHooks(readFileSync(canonicalPath, "utf8"));
  if (canonical.kind === "json-invalid") {
    throw new Error("Codex hooks activation failed: canonical example contains invalid JSON");
  }
  if (canonical.kind !== "ok" || canonical.tuples.length === 0) {
    throw new Error("Codex hooks activation failed: canonical example has an invalid hook contract");
  }

  let result: CodexHooksActivation = "preserved";
  if (!existsSync(activePath)) {
    try {
      copyFileSync(canonicalPath, activePath, fsConstants.COPYFILE_EXCL);
      result = "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error("Codex hooks activation failed: unable to create the local active file");
      }
    }
  }
  const doctor = codexHooksDoctorCheck(projectDir);
  if (!doctor.pass) throw new Error(`Codex hooks activation failed: ${doctor.label}`);
  return result;
}
