#!/usr/bin/env bun
// tla-authoring.ts — the TLA+ authoring CLI. U1 owns the `identity` and
// `bundle` subcommands, U3 owns `trace`; U2 and U4 add theirs alongside.
//
// Contract (component-methods.md § common rules): one JSON line on stdout,
// exit 0 on success, 1 on a typed failure, 2 on a usage error. Dispatch only —
// every judgement lives in tla-evidence.ts.

import { readFileSync } from "node:fs";
import {
  DEFAULT_STORE_ROOT,
  EvidenceBundle,
  EvidenceEnvelopeCodec,
  IdentityDigest,
  parseAggregateDigest,
  type AggregateDigest,
  type BundleDigest,
  type DocKind,
  type EvidenceBundleRef,
  type EvidenceParts,
  type PredecessorRef,
  type StableId,
} from "./tla-evidence.ts";
import {
  InvariantNameCodec,
  TraceCoverage,
  type InvariantName,
  type TraceRow,
} from "./tla-referees.ts";

export type ExitCode = 0 | 1 | 2;
export type Emit = (line: string) => void;

const USAGE = [
  "usage: tla-authoring.ts <command>",
  "  identity extract --doc <path> --doc-kind <requirements|decisions>",
  "  identity compare --recorded <digest> --current <digest>",
  "  bundle build --parts <path> --predecessor <root|digest> --identity <digest>",
  "               [--store <dir>] [--generated-at <iso>] [--generated-by <name>]",
  "  bundle verify --ref <digest> --identity <digest> [--store <dir>]",
  "  bundle read --ref <digest> [--store <dir>]",
  "  bundle list [--store <dir>]",
  "  bundle head [--store <dir>]",
  "  trace --subjects <path> --rows <path> --invariants <path>",
].join("\n");

interface Emitted {
  readonly exitCode: ExitCode;
  readonly body: Record<string, unknown>;
}

function usageError(error: string): Emitted {
  return { exitCode: 2, body: { ok: false, error, usage: USAGE } };
}

function failed(failure: unknown): Emitted {
  return { exitCode: 1, body: { ok: false, failure } };
}

function succeeded(body: Record<string, unknown>): Emitted {
  return { exitCode: 0, body: { ok: true, ...body } };
}

function parseFlags(argv: readonly string[]): Record<string, string> | null {
  // A null prototype keeps argv tokens like --__proto__ from touching the
  // prototype chain instead of landing as ordinary own keys.
  const flags: Record<string, string> = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index] as string;
    const value = argv[index + 1];
    if (!name.startsWith("--") || value === undefined) return null;
    flags[name.slice(2)] = value;
  }
  return flags;
}

function requiredFlag(flags: Record<string, string>, name: string): string | null {
  const value = flags[name];
  return value === undefined || value === "" ? null : value;
}

function readTextFile(path: string): { ok: true; text: string } | { ok: false; detail: string } {
  try {
    return { ok: true, text: readFileSync(path, "utf8") };
  } catch (cause) {
    return { ok: false, detail: cause instanceof Error ? cause.message : String(cause) };
  }
}

// Read-and-parse for JSON inputs, folding both failure modes into the typed
// { ok: false, failure } exit-1 shape the CLI emits everywhere.
function readJsonDocument(path: string): { ok: true; value: unknown } | { ok: false; emitted: Emitted } {
  const file = readTextFile(path);
  if (!file.ok) return { ok: false, emitted: failed({ kind: "io-failure", path, detail: file.detail }) };
  try {
    return { ok: true, value: JSON.parse(file.text) as unknown };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, emitted: failed({ kind: "io-failure", path, detail }) };
  }
}

function asAggregateDigest(raw: string): AggregateDigest | null {
  const parsed = parseAggregateDigest(raw);
  return parsed.ok ? parsed.value : null;
}

function asBundleDigest(raw: string): BundleDigest | null {
  const parsed = EvidenceEnvelopeCodec.parseBundleDigest(raw);
  return parsed.ok ? parsed.value : null;
}

function identityExtract(flags: Record<string, string>): Emitted {
  const doc = requiredFlag(flags, "doc");
  const docKind = requiredFlag(flags, "doc-kind");
  if (doc === null) return usageError("identity extract requires --doc");
  if (docKind !== "requirements" && docKind !== "decisions") {
    return usageError("identity extract requires --doc-kind <requirements|decisions>");
  }

  const file = readTextFile(doc);
  if (!file.ok) return failed({ kind: "io-failure", path: doc, detail: file.detail });

  const sections = IdentityDigest.extractStableSections(file.text, docKind as DocKind);
  if (!sections.ok) return failed(sections.error);

  const entries = sections.value.map(
    (section) => [section.id, IdentityDigest.contentDigest(section.id, section.canonicalBody)] as const,
  );
  return succeeded({
    sections: entries.map(([id, digest]) => ({ id, contentDigest: digest })),
    aggregateDigest: IdentityDigest.aggregateDigest(entries),
  });
}

function identityCompare(flags: Record<string, string>): Emitted {
  const recordedRaw = requiredFlag(flags, "recorded");
  const currentRaw = requiredFlag(flags, "current");
  if (recordedRaw === null || currentRaw === null) {
    return usageError("identity compare requires --recorded and --current");
  }
  const recorded = asAggregateDigest(recordedRaw);
  const current = asAggregateDigest(currentRaw);
  if (recorded === null || current === null) return usageError("digests must be sha256:<hex64>");
  return succeeded({ comparison: IdentityDigest.compareIdentity(recorded, current) });
}

// An empty --store would resolve bundle paths relative to the working
// directory, so it is rejected loudly instead of falling through.
function storeRootOf(flags: Record<string, string>): string | null {
  const raw = flags.store;
  if (raw === "") return null;
  return raw ?? DEFAULT_STORE_ROOT;
}

const EMPTY_STORE_USAGE = "--store must not be empty";

function parsePredecessorFlag(raw: string): PredecessorRef | null {
  if (raw === "root") return { kind: "root" };
  const digest = asBundleDigest(raw);
  return digest === null ? null : { kind: "bundle", digest };
}

function bundleBuild(flags: Record<string, string>): Emitted {
  const partsPath = requiredFlag(flags, "parts");
  const predecessorRaw = requiredFlag(flags, "predecessor");
  const identityRaw = requiredFlag(flags, "identity");
  if (partsPath === null || predecessorRaw === null || identityRaw === null) {
    return usageError("bundle build requires --parts, --predecessor and --identity");
  }
  const predecessor = parsePredecessorFlag(predecessorRaw);
  const identity = asAggregateDigest(identityRaw);
  if (predecessor === null) return usageError("--predecessor must be root or sha256:<hex64>");
  if (identity === null) return usageError("--identity must be sha256:<hex64>");

  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);

  const document = readJsonDocument(partsPath);
  if (!document.ok) return document.emitted;

  const parts = EvidenceEnvelopeCodec.parseParts(document.value);
  if (!parts.ok) return failed(parts.error);

  const built = EvidenceBundle.build(store, parts.value as EvidenceParts, predecessor, {
    subjectIdentity: identity,
    generatedAt: flags["generated-at"] ?? new Date().toISOString(),
    generatedBy: flags["generated-by"] ?? "tla-authoring",
  });
  return built.ok ? succeeded({ digest: built.value.digest }) : failed(built.error);
}

function refFlag(flags: Record<string, string>): EvidenceBundleRef | null {
  const raw = requiredFlag(flags, "ref");
  if (raw === null) return null;
  const digest = asBundleDigest(raw);
  return digest === null ? null : { digest };
}

function bundleVerify(flags: Record<string, string>): Emitted {
  const ref = refFlag(flags);
  const identityRaw = requiredFlag(flags, "identity");
  if (ref === null || identityRaw === null) return usageError("bundle verify requires --ref and --identity");
  const identity = asAggregateDigest(identityRaw);
  if (identity === null) return usageError("--identity must be sha256:<hex64>");
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);

  const verified = EvidenceBundle.verify(store, ref, identity);
  return verified.ok
    ? succeeded({
        verified: true,
        digest: verified.value.ref.digest,
        subjectIdentity: verified.value.envelope.subjectIdentity,
        kind: verified.value.envelope.evidence.kind,
        predecessor: verified.value.envelope.predecessor,
      })
    : failed(verified.error);
}

function bundleRead(flags: Record<string, string>): Emitted {
  const ref = refFlag(flags);
  if (ref === null) return usageError("bundle read requires --ref");
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);
  const parts = EvidenceBundle.read(store, ref);
  return parts.ok ? succeeded({ evidence: parts.value }) : failed(parts.error);
}

function bundleIndex(flags: Record<string, string>, mode: "list" | "head"): Emitted {
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);
  const index = mode === "list" ? EvidenceBundle.list(store) : EvidenceBundle.head(store);
  return index.ok
    ? succeeded({ refs: index.value.refs.map((ref) => ref.digest), corrupted: index.value.corrupted })
    : failed(index.error);
}

// --- U3: trace coverage ----------------------------------------------------

function asStringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : null;
}

function parseSubjects(value: unknown): { ok: true; value: StableId[] } | { ok: false; emitted: Emitted } {
  const raw = asStringArray(value);
  if (raw === null) return { ok: false, emitted: failed({ kind: "invalid-grammar", tokens: ["<subjects>"] }) };
  const parsed: StableId[] = [];
  for (const token of raw) {
    const id = IdentityDigest.normalizeStableId(token);
    if (!id.ok) return { ok: false, emitted: failed(id.error) };
    parsed.push(id.value);
  }
  return { ok: true, value: parsed };
}

function parseInvariants(
  value: unknown,
): { ok: true; value: InvariantName[] } | { ok: false; emitted: Emitted } {
  const raw = asStringArray(value);
  if (raw === null) {
    return { ok: false, emitted: failed({ kind: "invalid-invariant-name", tokens: ["<invariants>"] }) };
  }
  const parsed: InvariantName[] = [];
  for (const token of raw) {
    const name = InvariantNameCodec.parse(token);
    if (!name.ok) return { ok: false, emitted: failed(name.error) };
    parsed.push(name.value);
  }
  return { ok: true, value: parsed };
}

function parseTraceRows(value: unknown): { ok: true; value: TraceRow[] } | { ok: false; emitted: Emitted } {
  if (!Array.isArray(value)) {
    return { ok: false, emitted: failed({ kind: "invalid-trace-row", detail: "rows must be an array" }) };
  }
  const rows: TraceRow[] = [];
  for (const entry of value) {
    const record = entry as Record<string, unknown>;
    const subject = typeof record?.subject === "string" ? IdentityDigest.normalizeStableId(record.subject) : null;
    const invariant = typeof record?.invariant === "string" ? InvariantNameCodec.parse(record.invariant) : null;
    if (subject === null || invariant === null || typeof record.rationale !== "string") {
      return {
        ok: false,
        emitted: failed({ kind: "invalid-trace-row", detail: JSON.stringify(entry) }),
      };
    }
    if (!subject.ok) return { ok: false, emitted: failed(subject.error) };
    if (!invariant.ok) return { ok: false, emitted: failed(invariant.error) };
    rows.push({ subject: subject.value, invariant: invariant.value, rationale: record.rationale });
  }
  return { ok: true, value: rows };
}

function traceEvaluate(flags: Record<string, string>): Emitted {
  const subjectsPath = requiredFlag(flags, "subjects");
  const rowsPath = requiredFlag(flags, "rows");
  const invariantsPath = requiredFlag(flags, "invariants");
  if (subjectsPath === null || rowsPath === null || invariantsPath === null) {
    return usageError("trace requires --subjects, --rows and --invariants");
  }

  const subjectsDoc = readJsonDocument(subjectsPath);
  if (!subjectsDoc.ok) return subjectsDoc.emitted;
  const rowsDoc = readJsonDocument(rowsPath);
  if (!rowsDoc.ok) return rowsDoc.emitted;
  const invariantsDoc = readJsonDocument(invariantsPath);
  if (!invariantsDoc.ok) return invariantsDoc.emitted;

  const subjects = parseSubjects(subjectsDoc.value);
  if (!subjects.ok) return subjects.emitted;
  const invariants = parseInvariants(invariantsDoc.value);
  if (!invariants.ok) return invariants.emitted;
  const rows = parseTraceRows(rowsDoc.value);
  if (!rows.ok) return rows.emitted;

  const coverage = TraceCoverage.evaluate(subjects.value, rows.value, invariants.value);
  return coverage.ok ? succeeded({ coverage: coverage.value }) : failed(coverage.error);
}

type Handler = (flags: Record<string, string>) => Emitted;

const COMMANDS: Readonly<Record<string, Readonly<Record<string, Handler>>>> = {
  identity: { extract: identityExtract, compare: identityCompare },
  bundle: {
    build: bundleBuild,
    verify: bundleVerify,
    read: bundleRead,
    list: (flags) => bundleIndex(flags, "list"),
    head: (flags) => bundleIndex(flags, "head"),
  },
};

// Commands whose whole contract is one verb, so they take flags directly.
const FLAT_COMMANDS: Readonly<Record<string, Handler>> = {
  trace: traceEvaluate,
};

function dispatch(argv: readonly string[]): Emitted {
  const [group, verb, ...rest] = argv;
  if (group !== undefined && Object.hasOwn(FLAT_COMMANDS, group)) {
    const flatFlags = parseFlags(verb === undefined ? [] : [verb, ...rest]);
    if (flatFlags === null) return usageError("flags must be given as --name value pairs");
    return (FLAT_COMMANDS[group] as Handler)(flatFlags);
  }
  if (group === undefined || verb === undefined) return usageError("a command and a subcommand are required");
  // Own-property checks keep argv tokens like "constructor" from resolving
  // through the prototype chain of these object literals.
  const verbs = Object.hasOwn(COMMANDS, group) ? COMMANDS[group] : undefined;
  if (verbs === undefined) return usageError(`unknown command: ${group}`);
  const handler = Object.hasOwn(verbs, verb) ? verbs[verb] : undefined;
  if (handler === undefined) return usageError(`unknown ${group} subcommand: ${verb}`);
  const flags = parseFlags(rest);
  if (flags === null) return usageError("flags must be given as --name value pairs");
  return handler(flags);
}

/** In-process entry point: argv without the runtime prefix, one JSON line per run. */
export function runTlaAuthoring(argv: readonly string[], emit: Emit): ExitCode {
  const emitted = dispatch(argv);
  emit(JSON.stringify(emitted.body));
  return emitted.exitCode;
}

if (import.meta.main) {
  process.exitCode = runTlaAuthoring(process.argv.slice(2), (line) => process.stdout.write(`${line}\n`));
}
