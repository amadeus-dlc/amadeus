// tla-evidence.ts — U1 tla-evidence-foundation: identity digests (C2) and the
// evidence store (C4).
//
// Layering (nfr-design/logical-components.md): the pure layer below owns every
// judgement (parse / normalize / digest / compare / envelope validation / head
// resolution) and touches neither the filesystem, the clock, nor the process.
// The handler layer at the bottom of the file owns the store I/O and hands the
// pure layer bytes. The CLI (tla-authoring.ts) only dispatches.

import { createHash } from "node:crypto";
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
