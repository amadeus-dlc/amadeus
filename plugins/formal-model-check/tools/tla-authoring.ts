#!/usr/bin/env bun
// tla-authoring.ts — the TLA+ authoring CLI. U1 owns the `identity` and
// `bundle` subcommands, U3 owns `trace` and `proof`; U2 and U4 add theirs
// alongside.
//
// Contract (component-methods.md § common rules): one JSON line on stdout,
// exit 0 on success, 1 on a typed failure, 2 on a usage error. Dispatch only —
// every judgement lives in tla-evidence.ts.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ApplicabilityJudge,
  AuthoringHoldEvaluator,
  defaultModelMapPath,
  readModelMapSnapshot,
  traceSubjectIdentityOf,
  traceSubjectsOf,
  verifyHumanApproval,
  type ChangeDeclaration,
  type HumanApprovalRef,
  type ModelMapSnapshot,
  type SubjectSeriesKey,
} from "./tla-applicability.ts";
import {
  defaultStoreRoot,
  EvidenceBundle,
  EvidenceEnvelopeCodec,
  IdentityDigest,
  parseAggregateDigest,
  type AggregateDigest,
  type BundleDigest,
  type ContentDigest,
  type DocKind,
  type EvidenceBundleRef,
  type EvidenceParts,
  type PredecessorRef,
  type StableId,
} from "./tla-evidence.ts";
import {
  InvariantNameCodec,
  ProofObligations,
  TraceCoverage,
  type InvariantName,
  type ModelArtifacts,
  type TlcToolchain,
  type TraceRow,
} from "./tla-referees.ts";
import { createRefereeToolchain } from "./tla-referee-toolchain.ts";
import {
  RegistrationCommitter,
  approvalVerifier,
  checkPreconditions,
  createRegistrationPorts,
} from "./tla-registration.ts";
import type { PreconditionFailure, RegistrationPorts } from "./tla-registration.ts";

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
  "  applicability judge --declaration <path> --identity <digest> [--model-map <path>] [--store <dir>]",
  "  applicability receipt --declaration <path> --identity <digest> --approval <path|none>",
  "                        [--model-map <path>] [--store <dir>] [--audit-dir <dir>]",
  "                        [--predecessor <root|digest>] [--generated-at <iso>] [--generated-by <name>]",
  "                        [--persist true]",
  "  applicability series --subjects <id,id,...>",
  "  hold --identity <digest> --series <digest> [--model-map <path>] [--store <dir>]",
  "  trace --subjects <path> --rows <path> --invariants <path>",
  "  proof --model <tla> --cfg <cfg> --reduction <manifest> --invariants <path> --identity <digest>",
  "  commit --draft <path> --bundle <digest> --preconditions <path>",
  "         [--model-map <path>] [--store <dir>]",
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
  return raw ?? defaultStoreRoot();
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

// --- U2: applicability judgement and the authoring hold ---

const DEFAULT_AUDIT_DIR = ".";

function modelMapPathOf(flags: Record<string, string>): string | null {
  const raw = flags["model-map"];
  if (raw === "") return null;
  return raw ?? defaultModelMapPath();
}

// Resolve the map through the store: a registered model's trace subjects live
// in the bundle its entry names (business-logic-model.md §1).
function readModelMap(flags: Record<string, string>, store: string): ModelMapSnapshot | null {
  const path = modelMapPathOf(flags);
  if (path === null) return null;
  const file = readTextFile(path);
  if (!file.ok) return null;
  return readModelMapSnapshot(file.text, (digest) => {
    const parsed = EvidenceEnvelopeCodec.parseBundleDigest(digest);
    if (!parsed.ok) return null;
    const parts = EvidenceBundle.read(store, { digest: parsed.value });
    if (!parts.ok) return null;
    const subjectIdentity = traceSubjectIdentityOf(parts.value);
    const subjects = traceSubjectsOf(parts.value);
    return subjectIdentity !== null && subjects !== null ? { subjectIdentity, subjects } : null;
  });
}

function parseDeclaration(value: unknown): ChangeDeclaration | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { subjects, kind, rationale } = value as Record<string, unknown>;
  if (!Array.isArray(subjects) || subjects.some((subject) => typeof subject !== "string")) return null;
  if (typeof kind !== "string" || !CHANGE_KINDS.has(kind)) return null;
  if (typeof rationale !== "string") return null;
  return { subjects: subjects as unknown as ChangeDeclaration["subjects"], kind: kind as never, rationale };
}

const CHANGE_KINDS: ReadonlySet<string> = new Set([
  "new-subject",
  "semantic-change",
  "impl-only",
  "non-target",
]);

type JudgeContext = {
  readonly input: Parameters<typeof ApplicabilityJudge.judge>[0];
  readonly declaration: ChangeDeclaration;
  readonly store: string;
};

// The inputs both applicability verbs need, or the Emitted they both fail with.
function judgeContext(flags: Record<string, string>): JudgeContext | Emitted {
  const declarationPath = requiredFlag(flags, "declaration");
  const identityRaw = requiredFlag(flags, "identity");
  if (declarationPath === null || identityRaw === null) {
    return usageError("applicability requires --declaration and --identity");
  }
  const identity = asAggregateDigest(identityRaw);
  if (identity === null) return usageError("--identity must be sha256:<hex64>");
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);

  const document = readJsonDocument(declarationPath);
  if (!document.ok) return document.emitted;
  const declaration = parseDeclaration(document.value);
  if (declaration === null) return usageError("--declaration must hold { subjects, kind, rationale }");

  return {
    declaration,
    store,
    input: { subjectIdentity: identity, declaration, registeredModels: readModelMap(flags, store) },
  };
}

function isEmitted<T extends object>(value: T | Emitted): value is Emitted {
  return "exitCode" in value;
}

function applicabilityJudge(flags: Record<string, string>): Emitted {
  const context = judgeContext(flags);
  if (isEmitted(context)) return context;
  const judged = ApplicabilityJudge.judge(context.input);
  return judged.ok ? succeeded({ route: judged.value }) : failed(judged.error);
}

function readApproval(flags: Record<string, string>): HumanApprovalRef | null | Emitted {
  const raw = requiredFlag(flags, "approval");
  if (raw === null) return usageError("applicability receipt requires --approval <path|none>");
  if (raw === "none") return null;
  const document = readJsonDocument(raw);
  if (!document.ok) return document.emitted;
  const value = document.value;
  if (typeof value !== "object" || value === null) return usageError("--approval must hold an approval object");
  const { shard, timestamp, eventIdentity } = value as Record<string, unknown>;
  if (typeof shard !== "string" || typeof timestamp !== "string" || typeof eventIdentity !== "string") {
    return usageError("--approval must hold shard, timestamp and eventIdentity");
  }
  return { shard, timestamp, eventIdentity };
}

// The two routes that end the workflow carry no authoring work, so the stage
// refuses them (stages/tla-authoring.md) and the receipt has to be issued here
// instead. Persisting it is what gives FR-005 an owner: a stored
// terminal-route-receipt is the only thing the hold table accepts as the
// release for a terminal route.
const TERMINAL_ROUTES: ReadonlySet<string> = new Set(["impl-only", "non-target"]);

// The receipt and its approval are the two parts a terminal-route bundle
// carries (tla-evidence.ts TERMINAL_RECEIPTS). Terminal routes must request
// persistence in this command; allowing a successful print-only result would
// let the stage appear complete without the hold-releasing evidence (#3188).
function persistTerminalReceipt(
  context: JudgeContext,
  receipt: Record<string, unknown>,
  approval: HumanApprovalRef,
  settings: ReceiptSettings,
): Emitted {
  const parts: EvidenceParts = {
    kind: "terminal-route-receipt",
    parts: { applicability: receipt, approval: approval as unknown as Record<string, unknown> },
  };
  const stored = EvidenceBundle.build(context.store, parts, settings.predecessor, {
    subjectIdentity: context.input.subjectIdentity,
    generatedAt: settings.generatedAt,
    generatedBy: settings.generatedBy,
  });
  return stored.ok ? succeeded({ receipt, digest: stored.value.digest }) : failed(stored.error);
}

interface ReceiptSettings {
  readonly persist: boolean;
  readonly predecessor: PredecessorRef;
  readonly auditDir: string;
  readonly generatedAt: string;
  readonly generatedBy: string;
}

// `--persist` is spelled with its value because the shared flag parser reads
// `--name value` pairs only; a bare switch would break the argv into an odd
// length and be refused as a usage error before it reached this verb. It is a
// required gate for `impl-only` and `non-target`, not an optional output mode.
function receiptSettings(flags: Record<string, string>): ReceiptSettings | Emitted {
  const persist = flags.persist === "true";
  if (flags.persist !== undefined && !persist) return usageError("--persist takes the literal value true");
  const predecessor = parsePredecessorFlag(flags.predecessor ?? "root");
  if (predecessor === null) return usageError("--predecessor must be root or sha256:<hex64>");
  return {
    persist,
    predecessor,
    auditDir: flags["audit-dir"] ?? DEFAULT_AUDIT_DIR,
    generatedAt: flags["generated-at"] ?? new Date().toISOString(),
    generatedBy: flags["generated-by"] ?? "tla-authoring",
  };
}

function applicabilityReceipt(flags: Record<string, string>): Emitted {
  const context = judgeContext(flags);
  if (isEmitted(context)) return context;
  const approval = readApproval(flags);
  if (approval !== null && isEmitted(approval)) return approval;
  const settings = receiptSettings(flags);
  if (isEmitted(settings)) return settings;

  const judged = ApplicabilityJudge.judge(context.input);
  if (!judged.ok) return failed(judged.error);
  if ((judged.value === "impl-only" || judged.value === "non-target") && !settings.persist) {
    return failed({ kind: "terminal-route-receipt-required", route: judged.value });
  }
  if (settings.persist && !TERMINAL_ROUTES.has(judged.value)) {
    return failed({ kind: "not-a-terminal-route", route: judged.value });
  }

  const built = ApplicabilityJudge.buildReceipt(judged.value, context.input, approval, {
    judgedBy: settings.generatedBy,
    generatedAt: settings.generatedAt,
    predecessor: settings.predecessor,
    verifyApproval: (ref) => {
      const shard = readTextFile(join(settings.auditDir, ref.shard));
      return shard.ok && verifyHumanApproval(shard.text, ref);
    },
  });
  if (!built.ok) return failed(built.error);
  // buildReceipt already refused a terminal route without a verified approval,
  // so reaching the store write means the approval is present and checked.
  return settings.persist && approval !== null
    ? persistTerminalReceipt(context, built.value as unknown as Record<string, unknown>, approval, settings)
    : succeeded({ receipt: built.value });
}

function applicabilitySeries(flags: Record<string, string>): Emitted {
  const raw = requiredFlag(flags, "subjects");
  if (raw === null) return usageError("applicability series requires --subjects <id,id,...>");
  const subjects = raw.split(",").map((subject) => subject.trim()).filter((subject) => subject !== "");
  if (subjects.length === 0) return usageError("--subjects must name at least one stable id");
  return succeeded({ series: ApplicabilityJudge.subjectSeriesKey(subjects) });
}

function holdEvaluate(flags: Record<string, string>): Emitted {
  const identityRaw = requiredFlag(flags, "identity");
  const seriesRaw = requiredFlag(flags, "series");
  if (identityRaw === null || seriesRaw === null) return usageError("hold requires --identity and --series");
  const identity = asAggregateDigest(identityRaw);
  if (identity === null) return usageError("--identity must be sha256:<hex64>");
  if (!/^sha256:[0-9a-f]{64}$/.test(seriesRaw)) return usageError("--series must be sha256:<hex64>");
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);

  const index = EvidenceBundle.list(store);
  if (!index.ok) return failed(index.error);
  // Step 0 of the hold evaluation: a store holding corrupted entries is not a
  // basis for releasing, so it never reaches the table (business-logic-model.md §3).
  if (index.value.corrupted.length > 0) {
    return failed({ kind: "corrupted-evidence", entries: index.value.corrupted });
  }

  const verdict = AuthoringHoldEvaluator.evaluate(
    {
      currentSeries: seriesRaw as SubjectSeriesKey,
      currentIdentity: identity,
      modelMap: readModelMap(flags, store),
      evidenceIndex: index.value.refs,
    },
    (ref) => EvidenceBundle.read(store, ref),
  );
  if (!verdict.ok) return failed(verdict.error);
  // The typed verdict on stdout is the authority; the exit code only mirrors it
  // (BR-U2-20 — no caller may read hold/no-hold from the code alone).
  return verdict.value.kind === "no-hold"
    ? succeeded({ verdict: verdict.value })
    : { exitCode: 1, body: { ok: false, verdict: verdict.value } };
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

// --- U3: proof obligations -------------------------------------------------

/** The referee toolchain is injected so tests can drive the decision table. */
export interface AuthoringDependencies {
  readonly toolchain: TlcToolchain;
}

async function proofEvaluate(
  flags: Record<string, string>,
  dependencies?: AuthoringDependencies,
): Promise<Emitted> {
  const modelPath = requiredFlag(flags, "model");
  const cfgPath = requiredFlag(flags, "cfg");
  const reductionPath = requiredFlag(flags, "reduction");
  const invariantsPath = requiredFlag(flags, "invariants");
  const identityRaw = requiredFlag(flags, "identity");
  if (
    modelPath === null ||
    cfgPath === null ||
    reductionPath === null ||
    invariantsPath === null ||
    identityRaw === null
  ) {
    return usageError("proof requires --model, --cfg, --reduction, --invariants and --identity");
  }
  const identity = asAggregateDigest(identityRaw);
  if (identity === null) return usageError("--identity must be sha256:<hex64>");

  const invariantsDoc = readJsonDocument(invariantsPath);
  if (!invariantsDoc.ok) return invariantsDoc.emitted;
  const invariants = parseInvariants(invariantsDoc.value);
  if (!invariants.ok) return invariants.emitted;

  const model: ModelArtifacts = {
    modulePath: modelPath,
    configPath: cfgPath,
    reductionManifestPath: reductionPath,
  };
  const toolchain = dependencies?.toolchain ?? createRefereeToolchain();
  const proof = await ProofObligations.evaluate(model, invariants.value, identity, toolchain);
  return proof.ok ? succeeded({ proof: proof.value }) : failed(proof.error);
}

// --- U4: registration ------------------------------------------------------

/**
 * Register a draft entry. The bundle is verified here rather than trusted from
 * argv, so the CLI has no path that reaches `commit` with an unchecked bundle
 * (business-logic-model.md §3). The identity to verify against is the one the
 * applicability receipt already binds, so no second identity flag is invented.
 */
function registrationCommit(flags: Record<string, string>): Emitted {
  const draftPath = requiredFlag(flags, "draft");
  const bundleRaw = requiredFlag(flags, "bundle");
  const preconditionsPath = requiredFlag(flags, "preconditions");
  if (draftPath === null || bundleRaw === null || preconditionsPath === null) {
    return usageError("commit requires --draft, --bundle and --preconditions");
  }
  const digest = asBundleDigest(bundleRaw);
  if (digest === null) return usageError("--bundle must be sha256:<hex64>");
  const store = storeRootOf(flags);
  if (store === null) return usageError(EMPTY_STORE_USAGE);
  const mapPath = modelMapPathOf(flags);
  if (mapPath === null) return usageError("--model-map must not be empty");

  const draftDocument = readJsonDocument(draftPath);
  if (!draftDocument.ok) return draftDocument.emitted;
  const preconditionsDocument = readJsonDocument(preconditionsPath);
  if (!preconditionsDocument.ok) return preconditionsDocument.emitted;
  const candidate = preconditionsDocument.value;
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return usageError("--preconditions must name a JSON object");
  }

  const ports = createRegistrationPorts({ mapPath });
  const identity = subjectIdentityOf(candidate as Record<string, unknown>);
  if (identity === null) {
    return failed(routelessRefusal(candidate as Record<string, unknown>, ports));
  }
  const verified = EvidenceBundle.verify(store, { digest }, identity);
  if (!verified.ok) return failed(verified.error);

  const committed = RegistrationCommitter.commit(
    draftDocument.value,
    verified.value,
    candidate as Record<string, unknown>,
    ports,
  );
  return committed.ok ? succeeded({ receipt: committed.value }) : failed(committed.error);
}

/**
 * Without a bound identity the bundle cannot be verified, so the run stops
 * here — but it stops with the whole gate's verdict, not just the one check
 * that noticed. The route failure is added because the gate only inspects the
 * route, so an applicability receipt missing its identity passes that check.
 */
function routelessRefusal(
  candidate: Record<string, unknown>,
  ports: RegistrationPorts,
): { kind: "preconditions-failed"; failures: readonly PreconditionFailure[] } {
  const checked = checkPreconditions(candidate, approvalVerifier(ports));
  const collected: PreconditionFailure[] = checked.ok ? [] : [...checked.error];
  const routeAlreadyFailed = collected.some(
    (failure) => failure.kind === "precondition-missing" && failure.precondition === "applicability-route",
  );
  const failures = routeAlreadyFailed
    ? collected
    : [{ kind: "precondition-missing", precondition: "applicability-route" } as const, ...collected];
  return { kind: "preconditions-failed", failures };
}

/** The subject identity the applicability receipt binds, if it carries one. */
function subjectIdentityOf(candidate: Record<string, unknown>): AggregateDigest | null {
  const applicability = candidate.applicability;
  if (typeof applicability !== "object" || applicability === null) return null;
  const raw = (applicability as Record<string, unknown>).subjectIdentity;
  return typeof raw === "string" ? asAggregateDigest(raw) : null;
}

// The raw argv is handed alongside the parsed flags so a verb whose contract
// takes repeated flags can read them; every other handler ignores it.
type Handler = (flags: Record<string, string>, argv: readonly string[]) => Emitted;
// A flat handler may be sync or async; dispatch already returns a Promise, so
// a sync return is folded in for free.
type FlatHandler = (
  flags: Record<string, string>,
  dependencies?: AuthoringDependencies,
) => Emitted | Promise<Emitted>;

const COMMANDS: Readonly<Record<string, Readonly<Record<string, Handler>>>> = {
  identity: { extract: identityExtract, compare: identityCompare },
  bundle: {
    build: bundleBuild,
    verify: bundleVerify,
    read: bundleRead,
    list: (flags) => bundleIndex(flags, "list"),
    head: (flags) => bundleIndex(flags, "head"),
  },
  applicability: {
    judge: applicabilityJudge,
    receipt: applicabilityReceipt,
    series: applicabilitySeries,
  },
};

// Commands whose whole contract is one verb, so they take flags directly.
// The proof referee drives TLC through a child process, so its handler is async.
const FLAT_COMMANDS: Readonly<Record<string, FlatHandler>> = {
  hold: holdEvaluate,
  trace: traceEvaluate,
  proof: proofEvaluate,
  commit: registrationCommit,
};

async function dispatch(
  argv: readonly string[],
  dependencies?: AuthoringDependencies,
): Promise<Emitted> {
  const [group, verb, ...rest] = argv;
  if (group !== undefined && Object.hasOwn(FLAT_COMMANDS, group)) {
    const flatFlags = parseFlags(verb === undefined ? [] : [verb, ...rest]);
    if (flatFlags === null) return usageError("flags must be given as --name value pairs");
    return (FLAT_COMMANDS[group] as FlatHandler)(flatFlags, dependencies);
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
  return handler(flags, rest);
}

/** In-process entry point: argv without the runtime prefix, one JSON line per run. */
export async function runTlaAuthoring(
  argv: readonly string[],
  emit: Emit,
  dependencies?: AuthoringDependencies,
): Promise<ExitCode> {
  const emitted = await dispatch(argv, dependencies);
  emit(JSON.stringify(emitted.body));
  return emitted.exitCode;
}

if (import.meta.main) {
  process.exitCode = await runTlaAuthoring(process.argv.slice(2), (line) => process.stdout.write(`${line}\n`));
}
