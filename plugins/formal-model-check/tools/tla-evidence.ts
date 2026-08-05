// tla-evidence.ts — U1 tla-evidence-foundation: identity digests (C2) and the
// evidence store (C4).
//
// Layering (nfr-design/logical-components.md): the pure layer below owns every
// judgement (parse / normalize / digest / compare / envelope validation / head
// resolution) and touches neither the filesystem, the clock, nor the process.
// The handler layer at the bottom of the file owns the store I/O and hands the
// pure layer bytes. The CLI (tla-authoring.ts) only dispatches.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "./contract.ts";

// ---------------------------------------------------------------------------
// C2: stable identity vocabulary
// ---------------------------------------------------------------------------

export type StableId = string & { readonly __brand: "StableId" };
export type ContentDigest = string & { readonly __brand: "ContentDigest" };
export type AggregateDigest = string & { readonly __brand: "AggregateDigest" };

export type DocKind = "requirements" | "decisions";

export interface StableSection {
  readonly id: StableId;
  readonly canonicalBody: string;
}

export type IdentityFailure =
  | { readonly kind: "duplicate-id"; readonly ids: readonly string[] }
  | { readonly kind: "unresolvable-id"; readonly ids: readonly string[] }
  | { readonly kind: "invalid-grammar"; readonly tokens: readonly string[] };

export type IdentityComparison =
  | { readonly kind: "current" }
  | { readonly kind: "stale"; readonly recorded: AggregateDigest; readonly current: AggregateDigest };

// The closed grammar of Q2 ruling A. Tokens outside it (cid: … and friends) are
// never collected automatically.
const STABLE_ID_RE = /^(?:(?:FR|NFR|AC)-\d{3}|ADR-\d+)$/;
const REQUIREMENTS_HEADING_RE = /^###\s+((?:FR|NFR|AC)-\d{3})(?=\s|$)/;
const DECISIONS_HEADING_RE = /^##\s+(ADR-\d+)(?=\s|$)/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function sha256Hex(input: Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Canonical body: LF newlines, no trailing blank on any line, no leading or trailing blank lines. */
export function normalizeCanonicalBody(raw: string): string {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+$/, ""));
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function headingPattern(docKind: DocKind): RegExp {
  return docKind === "requirements" ? REQUIREMENTS_HEADING_RE : DECISIONS_HEADING_RE;
}

function headingLevel(line: string): number {
  const match = /^(#{1,6})\s/.exec(line);
  return match === null ? Number.POSITIVE_INFINITY : (match[1] as string).length;
}

function duplicates(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      if (!repeated.includes(id)) repeated.push(id);
    } else seen.add(id);
  }
  return repeated;
}

function normalizeStableId(raw: string): Result<StableId, IdentityFailure> {
  return STABLE_ID_RE.test(raw)
    ? ok(raw as StableId)
    : err<IdentityFailure>({ kind: "invalid-grammar", tokens: [raw] });
}

function contentDigest(id: StableId, canonicalBody: string): ContentDigest {
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(id);
  const bodyBytes = encoder.encode(canonicalBody);
  const joined = new Uint8Array(idBytes.length + 1 + bodyBytes.length);
  joined.set(idBytes, 0);
  joined[idBytes.length] = 0x00;
  joined.set(bodyBytes, idBytes.length + 1);
  return `sha256:${sha256Hex(joined)}` as ContentDigest;
}

function aggregateDigest(entries: ReadonlyArray<readonly [StableId, ContentDigest]>): AggregateDigest {
  const serialized = [...entries]
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
    .map(([id, digest]) => `${id}=${digest}`)
    .join("\n");
  return `sha256:${sha256Hex(new TextEncoder().encode(serialized))}` as AggregateDigest;
}

function compareIdentity(recorded: AggregateDigest, current: AggregateDigest): IdentityComparison {
  return recorded === current ? { kind: "current" } : { kind: "stale", recorded, current };
}

function extractStableSections(
  markdown: string,
  docKind: DocKind,
): Result<ReadonlyArray<StableSection>, IdentityFailure> {
  const pattern = headingPattern(docKind);
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const starts: Array<{ readonly id: string; readonly index: number; readonly level: number }> = [];
  for (const [index, line] of lines.entries()) {
    const match = pattern.exec(line as string);
    if (match !== null) starts.push({ id: match[1] as string, index, level: headingLevel(line as string) });
  }

  const repeated = duplicates(starts.map((start) => start.id));
  if (repeated.length > 0) return err<IdentityFailure>({ kind: "duplicate-id", ids: repeated });

  const sections: StableSection[] = [];
  const hollow: string[] = [];
  for (const [position, start] of starts.entries()) {
    let end = lines.length;
    for (let cursor = start.index + 1; cursor < lines.length; cursor++) {
      if (headingLevel(lines[cursor] as string) <= start.level) {
        end = cursor;
        break;
      }
    }
    const next = starts[position + 1];
    if (next !== undefined && next.index < end) end = next.index;
    const canonicalBody = normalizeCanonicalBody(lines.slice(start.index + 1, end).join("\n"));
    if (canonicalBody === "") hollow.push(start.id);
    else sections.push({ id: start.id as StableId, canonicalBody });
  }
  if (hollow.length > 0) return err<IdentityFailure>({ kind: "invalid-grammar", tokens: hollow });
  return ok(sections);
}

function resolveDeclaredIds(
  sections: ReadonlyArray<StableSection>,
  declared: readonly string[],
): Result<ReadonlyArray<StableSection>, IdentityFailure> {
  const byId = new Map(sections.map((section) => [section.id as string, section]));
  const missing = declared.filter((id) => !byId.has(id));
  if (missing.length > 0) return err<IdentityFailure>({ kind: "unresolvable-id", ids: missing });
  return ok(declared.map((id) => byId.get(id) as StableSection));
}

export const IdentityDigest = {
  normalizeStableId,
  contentDigest,
  aggregateDigest,
  compareIdentity,
  extractStableSections,
  resolveDeclaredIds,
} as const;

export function parseAggregateDigest(raw: string): Result<AggregateDigest, IdentityFailure> {
  return DIGEST_RE.test(raw)
    ? ok(raw as AggregateDigest)
    : err<IdentityFailure>({ kind: "invalid-grammar", tokens: [raw] });
}

// ---------------------------------------------------------------------------
// C4: evidence envelope vocabulary
// ---------------------------------------------------------------------------

export type BundleDigest = string & { readonly __brand: "BundleDigest" };

/** A receipt body. Its schema belongs to U2/U3; U1 only serializes and digests it. */
export type ReceiptJson = Readonly<Record<string, unknown>>;

export interface AuthoringBundleParts {
  readonly applicability: ReceiptJson;
  readonly trace: ReceiptJson;
  readonly proof: ReceiptJson;
  readonly review: ReceiptJson;
  readonly approval: ReceiptJson;
}

export interface TerminalReceiptParts {
  readonly applicability: ReceiptJson;
  readonly approval: ReceiptJson;
}

export type EvidenceParts =
  | { readonly kind: "authoring-bundle"; readonly parts: AuthoringBundleParts }
  | { readonly kind: "terminal-route-receipt"; readonly parts: TerminalReceiptParts };

export type PredecessorRef =
  | { readonly kind: "root" }
  | { readonly kind: "bundle"; readonly digest: BundleDigest };

export interface EvidenceBundleRef {
  readonly digest: BundleDigest;
}

export interface EvidenceEnvelope {
  readonly schema: 1;
  readonly subjectIdentity: AggregateDigest;
  readonly evidence: EvidenceParts;
  readonly predecessor: PredecessorRef;
  readonly generatedAt: string;
  readonly generatedBy: string;
}

/** Only `verify` mints this, so holding one is proof the bundle was checked. */
export interface VerifiedBundle {
  readonly __brand: "VerifiedBundle";
  readonly ref: EvidenceBundleRef;
  readonly envelope: EvidenceEnvelope;
}

export type BundleFailure =
  | { readonly kind: "missing-part"; readonly parts: readonly string[] }
  | { readonly kind: "digest-mismatch"; readonly expected: BundleDigest; readonly actual: BundleDigest }
  | { readonly kind: "identity-mismatch"; readonly expected: AggregateDigest; readonly actual: AggregateDigest }
  | { readonly kind: "predecessor-broken"; readonly digest: BundleDigest }
  | { readonly kind: "io-failure"; readonly path: string; readonly detail: string };

export interface CorruptedEntry {
  readonly path: string;
  readonly reason: "digest-filename-mismatch" | "unparseable" | "schema-invalid";
}

export interface EvidenceIndex {
  readonly refs: readonly EvidenceBundleRef[];
  readonly corrupted: readonly CorruptedEntry[];
}

const AUTHORING_RECEIPTS = ["applicability", "trace", "proof", "review", "approval"] as const;
const TERMINAL_RECEIPTS = ["applicability", "approval"] as const;
const ENVELOPE_FIELDS = ["subjectIdentity", "evidence", "predecessor", "generatedAt", "generatedBy"] as const;

function parseBundleDigest(raw: string): Result<BundleDigest, BundleFailure> {
  return DIGEST_RE.test(raw)
    ? ok(raw as BundleDigest)
    : err<BundleFailure>({ kind: "missing-part", parts: [`digest(${raw})`] });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (!isPlainRecord(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = sortedJsonValue(value[key]);
  return sorted;
}

/** Deterministic serialization: keys sorted at every depth, UTF-8, no trailing newline. */
function canonicalBytes(envelope: EvidenceEnvelope): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sortedJsonValue(envelope)));
}

function bundleDigest(bytes: Uint8Array): BundleDigest {
  return `sha256:${sha256Hex(bytes)}` as BundleDigest;
}

function fileNameFor(ref: EvidenceBundleRef): string {
  return `${ref.digest.slice("sha256:".length)}.json`;
}

function parseEvidenceParts(value: unknown): Result<EvidenceParts, readonly string[]> {
  if (!isPlainRecord(value)) return err(["evidence"]);
  const kind = value.kind;
  if (kind !== "authoring-bundle" && kind !== "terminal-route-receipt") return err(["evidence.kind"]);
  const parts = value.parts;
  if (!isPlainRecord(parts)) return err(["evidence.parts"]);
  const required = kind === "authoring-bundle" ? AUTHORING_RECEIPTS : TERMINAL_RECEIPTS;
  const missing = required.filter((name) => !isPlainRecord(parts[name])).map((name) => `evidence.parts.${name}`);
  if (missing.length > 0) return err(missing);
  const picked = Object.fromEntries(required.map((name) => [name, parts[name] as ReceiptJson]));
  return ok(
    kind === "authoring-bundle"
      ? { kind, parts: picked as unknown as AuthoringBundleParts }
      : { kind, parts: picked as unknown as TerminalReceiptParts },
  );
}

function parsePredecessor(value: unknown): Result<PredecessorRef, readonly string[]> {
  if (!isPlainRecord(value)) return err(["predecessor"]);
  if (value.kind === "root") return ok({ kind: "root" });
  if (value.kind !== "bundle") return err(["predecessor.kind"]);
  const digest = typeof value.digest === "string" ? parseBundleDigest(value.digest) : null;
  if (digest === null || !digest.ok) return err(["predecessor.digest"]);
  return ok({ kind: "bundle", digest: digest.value });
}

/** Parse an envelope out of raw bytes, enumerating every defect at once (BR-U1-20). */
function parseEnvelope(bytes: Uint8Array): Result<EvidenceEnvelope, BundleFailure> {
  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return err<BundleFailure>({ kind: "missing-part", parts: ["<envelope>"] });
  }
  if (!isPlainRecord(document)) return err<BundleFailure>({ kind: "missing-part", parts: ["<envelope>"] });

  const missing: string[] = [];
  if (document.schema !== 1) missing.push("schema");
  if (typeof document.subjectIdentity !== "string" || !DIGEST_RE.test(document.subjectIdentity)) {
    missing.push("subjectIdentity");
  }
  const evidence = parseEvidenceParts(document.evidence);
  if (!evidence.ok) missing.push(...evidence.error);
  const predecessor = parsePredecessor(document.predecessor);
  if (!predecessor.ok) missing.push(...predecessor.error);
  if (typeof document.generatedAt !== "string" || document.generatedAt === "") missing.push("generatedAt");
  if (typeof document.generatedBy !== "string" || document.generatedBy === "") missing.push("generatedBy");
  if (missing.length > 0) return err<BundleFailure>({ kind: "missing-part", parts: missing });

  return ok({
    schema: 1,
    subjectIdentity: document.subjectIdentity as AggregateDigest,
    evidence: (evidence as { ok: true; value: EvidenceParts }).value,
    predecessor: (predecessor as { ok: true; value: PredecessorRef }).value,
    generatedAt: document.generatedAt as string,
    generatedBy: document.generatedBy as string,
  });
}

/** Digest, schema and identity checks over bytes already read from the store. */
function verifyBytes(
  bytes: Uint8Array,
  ref: EvidenceBundleRef,
  expectedIdentity: AggregateDigest,
): Result<VerifiedBundle, BundleFailure> {
  const actual = bundleDigest(bytes);
  if (actual !== ref.digest) {
    return err<BundleFailure>({ kind: "digest-mismatch", expected: ref.digest, actual });
  }
  const envelope = parseEnvelope(bytes);
  if (!envelope.ok) return envelope;
  if (envelope.value.subjectIdentity !== expectedIdentity) {
    return err<BundleFailure>({
      kind: "identity-mismatch",
      expected: expectedIdentity,
      actual: envelope.value.subjectIdentity,
    });
  }
  return ok({ __brand: "VerifiedBundle", ref, envelope: envelope.value } as VerifiedBundle);
}

/** Heads are the refs nothing else names as its predecessor (chain tips). */
function resolveHeads(
  entries: ReadonlyArray<{ readonly ref: EvidenceBundleRef; readonly predecessor: PredecessorRef }>,
): readonly EvidenceBundleRef[] {
  const referenced = new Set(
    entries
      .map((entry) => entry.predecessor)
      .filter((predecessor): predecessor is { kind: "bundle"; digest: BundleDigest } => predecessor.kind === "bundle")
      .map((predecessor) => predecessor.digest as string),
  );
  return entries.filter((entry) => !referenced.has(entry.ref.digest)).map((entry) => entry.ref);
}

export const EvidenceEnvelopeCodec = {
  canonicalBytes,
  bundleDigest,
  fileNameFor,
  parse: parseEnvelope,
  parseBundleDigest,
  verifyBytes,
  resolveHeads,
} as const;

// ---------------------------------------------------------------------------
// C4 handler layer: the evidence store (the only writer — BR-U1-01)
// ---------------------------------------------------------------------------

export const DEFAULT_STORE_ROOT = "specs/tla-evidence";
const STAGING_DIR = ".tmp";

export interface EvidenceMeta {
  readonly subjectIdentity: AggregateDigest;
  readonly generatedAt: string;
  readonly generatedBy: string;
}

function ioFailure(path: string, cause: unknown): Result<never, BundleFailure> {
  return err<BundleFailure>({
    kind: "io-failure",
    path,
    detail: cause instanceof Error ? cause.message : String(cause),
  });
}

function readBytes(storeRoot: string, ref: EvidenceBundleRef): Result<Uint8Array, BundleFailure> {
  const name = fileNameFor(ref);
  try {
    return ok(new Uint8Array(readFileSync(join(storeRoot, name))));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      return err<BundleFailure>({ kind: "missing-part", parts: [name] });
    }
    return ioFailure(join(storeRoot, name), cause);
  }
}

function predecessorPresent(storeRoot: string, predecessor: PredecessorRef): boolean {
  return predecessor.kind === "root" || existsSync(join(storeRoot, fileNameFor({ digest: predecessor.digest })));
}

/** Stage the whole envelope in `.tmp/`, then rename — the final path never shows a partial file. */
function build(
  storeRoot: string,
  evidence: EvidenceParts,
  predecessor: PredecessorRef,
  meta: EvidenceMeta,
): Result<EvidenceBundleRef, BundleFailure> {
  if (!predecessorPresent(storeRoot, predecessor)) {
    return err<BundleFailure>({
      kind: "predecessor-broken",
      digest: (predecessor as { kind: "bundle"; digest: BundleDigest }).digest,
    });
  }

  const envelope: EvidenceEnvelope = {
    schema: 1,
    subjectIdentity: meta.subjectIdentity,
    evidence,
    predecessor,
    generatedAt: meta.generatedAt,
    generatedBy: meta.generatedBy,
  };
  const bytes = canonicalBytes(envelope);
  const ref: EvidenceBundleRef = { digest: bundleDigest(bytes) };
  const finalPath = join(storeRoot, fileNameFor(ref));

  if (existsSync(finalPath)) {
    const existing = readBytes(storeRoot, ref);
    if (!existing.ok) return existing;
    // Content addressing makes a rebuild of identical input a no-op; differing
    // bytes under the same digest mean the store itself is damaged.
    return bundleDigest(existing.value) === ref.digest
      ? ok(ref)
      : err<BundleFailure>({ kind: "io-failure", path: finalPath, detail: "stored bytes do not match their digest" });
  }

  const stagingDir = join(storeRoot, STAGING_DIR);
  const stagingPath = join(stagingDir, `${randomUUID()}.json`);
  try {
    mkdirSync(stagingDir, { recursive: true });
    writeFileSync(stagingPath, bytes);
    renameSync(stagingPath, finalPath);
  } catch (cause) {
    rmSync(stagingPath, { force: true });
    return ioFailure(finalPath, cause);
  }
  return ok(ref);
}

function verify(
  storeRoot: string,
  ref: EvidenceBundleRef,
  expectedIdentity: AggregateDigest,
): Result<VerifiedBundle, BundleFailure> {
  const bytes = readBytes(storeRoot, ref);
  if (!bytes.ok) return bytes;
  const verified = verifyBytes(bytes.value, ref, expectedIdentity);
  if (!verified.ok) return verified;
  // One generation deep: every generation checked its own predecessor at build
  // time, so the chain stays sound by induction (business-logic-model.md §5).
  const predecessor = verified.value.envelope.predecessor;
  if (!predecessorPresent(storeRoot, predecessor)) {
    return err<BundleFailure>({
      kind: "predecessor-broken",
      digest: (predecessor as { kind: "bundle"; digest: BundleDigest }).digest,
    });
  }
  return verified;
}

function read(storeRoot: string, ref: EvidenceBundleRef): Result<EvidenceParts, BundleFailure> {
  const bytes = readBytes(storeRoot, ref);
  if (!bytes.ok) return bytes;
  const envelope = parseEnvelope(bytes.value);
  return envelope.ok ? ok(envelope.value.evidence) : envelope;
}

interface StoreEntry {
  readonly ref: EvidenceBundleRef;
  readonly predecessor: PredecessorRef;
}

function scan(storeRoot: string): Result<{ entries: readonly StoreEntry[]; corrupted: readonly CorruptedEntry[] }, BundleFailure> {
  if (!existsSync(storeRoot)) return ok({ entries: [], corrupted: [] });
  let names: readonly string[];
  try {
    names = readdirSync(storeRoot).filter((name) => name.endsWith(".json")).sort();
  } catch (cause) {
    return ioFailure(storeRoot, cause);
  }

  const entries: StoreEntry[] = [];
  const corrupted: CorruptedEntry[] = [];
  for (const name of names) {
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(readFileSync(join(storeRoot, name)));
    } catch (cause) {
      return ioFailure(join(storeRoot, name), cause);
    }
    const digest = bundleDigest(bytes);
    if (fileNameFor({ digest }) !== name) {
      corrupted.push({ path: name, reason: "digest-filename-mismatch" });
      continue;
    }
    const envelope = parseEnvelope(bytes);
    if (!envelope.ok) {
      const unparseable = envelope.error.kind === "missing-part" && envelope.error.parts[0] === "<envelope>";
      corrupted.push({ path: name, reason: unparseable ? "unparseable" : "schema-invalid" });
      continue;
    }
    entries.push({ ref: { digest }, predecessor: envelope.value.predecessor });
  }
  return ok({ entries, corrupted });
}

function list(storeRoot: string): Result<EvidenceIndex, BundleFailure> {
  const scanned = scan(storeRoot);
  if (!scanned.ok) return scanned;
  return ok({ refs: scanned.value.entries.map((entry) => entry.ref), corrupted: scanned.value.corrupted });
}

function head(storeRoot: string): Result<EvidenceIndex, BundleFailure> {
  const scanned = scan(storeRoot);
  if (!scanned.ok) return scanned;
  return ok({ refs: resolveHeads(scanned.value.entries), corrupted: scanned.value.corrupted });
}

export const EvidenceBundle = {
  build,
  verify,
  read,
  list,
  head,
} as const;
