// amadeus-journal-convert.ts — Markdown audit shard -> JSONL journal shard
// (Issue #1628, Phase 1 PR-2).
//
// One-shot migration bridge: this is the ONLY module allowed to parse the
// legacy Markdown block format after the switchover (it is a converter, not
// a dual-read path). Conversion is fail-closed and self-verifying: a shard
// converts only when rendering the parsed entries back through the canonical
// Markdown formatter reproduces the original file byte-for-byte. Byte-exact
// round-trip subsumes the finer equivalence clauses (record count, order,
// event/timestamp/field preservation, findAllEvents extraction parity) — if
// any of those diverged, the bytes would too.
//
// Refusals (loud, no partial output):
//   - header line absent / trailing garbage after the last record separator
//   - a block that neither parses canonically nor renders back as a raw body
//   - an AUDIT_FORKED row whose Bolt slug has no later AUDIT_MERGED row —
//     the recorded Fork Boundary is a byte offset into the Markdown shard
//     and would go stale across the format change; merge or discard the
//     Bolt worktree first, then convert.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { formatAuditRecord } from "./amadeus-audit.ts";
import {
  JOURNAL_SCHEMA_VERSION,
  type JournalEntry,
  serializeJournalEntry,
} from "./amadeus-journal.ts";

const AUDIT_HEADER = "# AI-DLC Audit Log\n";
const RECORD_SEPARATOR = "\n---\n";

export class JournalConvertError extends Error {}

// --- block parsing (legacy Markdown, quarantined to this module) ---

type ParsedBlock = {
  readonly heading: string;
  readonly timestamp: string;
  readonly event: string | null;
  readonly fields?: Record<string, string>;
  readonly rawBody?: string;
  readonly opaque?: true;
};

const FIELD_LINE_RE = /^\*\*(.+?)\*\*: (.*)$/;

// Parse one legacy block ("\n## <heading>\n**Timestamp**: <ts>\n<body>\n").
// Canonical shape (Event line + field lines) is preferred; anything else is
// preserved verbatim as a raw body. Returns null when even the heading /
// Timestamp frame is absent — the caller refuses the shard.
export function parseLegacyBlock(block: string): ParsedBlock | null {
  const lines = block.split("\n");
  // Frame: "", "## <heading>", "**Timestamp**: <ts>", ..., ""
  if (lines.length < 4 || lines[0] !== "" || lines[lines.length - 1] !== "") return null;
  if (!lines[1]!.startsWith("## ")) return null;
  if (!lines[2]!.startsWith("**Timestamp**: ")) return null;
  const heading = lines[1]!.slice(3);
  const timestamp = lines[2]!.slice("**Timestamp**: ".length);
  const bodyLines = lines.slice(3, -1);

  if (bodyLines[0]?.startsWith("**Event**: ")) {
    const event = bodyLines[0].slice("**Event**: ".length);
    // Map, not a plain object: field keys are untrusted text, and keys like
    // "__proto__" would silently vanish from a plain-object accumulator.
    const fields = new Map<string, string>();
    let canonical = true;
    for (const line of bodyLines.slice(1)) {
      const match = line.match(FIELD_LINE_RE);
      // A duplicate key or a non-field line breaks the canonical shape.
      if (!match || fields.has(match[1]!)) {
        canonical = false;
        break;
      }
      fields.set(match[1]!, match[2]!);
    }
    if (canonical) return { heading, timestamp, event, fields: Object.fromEntries(fields) };
  }
  // Raw fallback: keep the body verbatim (append-raw records, or canonical-
  // looking blocks with irregular bodies). Byte-exact round-trip still holds.
  return { heading, timestamp, event: null, rawBody: bodyLines.join("\n") };
}

// Frame-irregular historical segment (e.g. a record missing its leading
// blank line — observed once in the committed corpus): preserved as an
// opaque entry whose rawBody is the ENTIRE segment verbatim. Timestamp is
// extracted best-effort for ordering only.
function opaqueBlock(segment: string): ParsedBlock {
  const timestamp = segment.match(/^\*\*Timestamp\*\*: (.*)$/m)?.[1] ?? "";
  return { heading: "", timestamp, event: null, rawBody: segment, opaque: true };
}

function renderParsedBlock(block: ParsedBlock): string {
  if (block.opaque === true) {
    return `${block.rawBody ?? ""}${RECORD_SEPARATOR}`;
  }
  if (block.event === null) {
    return formatAuditRecord({
      heading: block.heading,
      timestamp: block.timestamp,
      rawBody: block.rawBody ?? "",
    });
  }
  return formatAuditRecord({
    heading: block.heading,
    timestamp: block.timestamp,
    event: block.event,
    fields: block.fields ?? {},
  });
}

// --- unmerged-fork refusal ---

function assertNoUnmergedForks(blocks: readonly ParsedBlock[]): void {
  const lastForked = new Map<string, number>();
  const lastMerged = new Map<string, number>();
  blocks.forEach((block, index) => {
    const slug = block.fields?.["Bolt slug"];
    if (slug === undefined) return;
    if (block.event === "AUDIT_FORKED") lastForked.set(slug, index);
    if (block.event === "AUDIT_MERGED") lastMerged.set(slug, index);
  });
  for (const [slug, forkedAt] of lastForked) {
    const mergedAt = lastMerged.get(slug);
    if (mergedAt === undefined || mergedAt < forkedAt) {
      throw new JournalConvertError(
        `shard has an unmerged AUDIT_FORKED for Bolt slug ${slug}; merge or discard the Bolt worktree before converting`,
      );
    }
  }
}

// --- conversion ---

export type ConvertResult = {
  readonly entries: JournalEntry[];
  readonly jsonl: string;
};

// Convert a full legacy shard text. Throws JournalConvertError on any
// refusal; on success the returned entries render back byte-identically
// (verified internally — a conversion that cannot prove losslessness never
// returns).
export type ConvertOptions = {
  // Historical shards can carry AUDIT_FORKED rows whose Bolt worktree is long
  // gone (completed / discarded intents). Pass true ONLY after verifying no
  // live worktree exists for the reported slugs — a live fork's later
  // audit-merge cannot apply across the format change.
  readonly allowUnmergedForks?: boolean;
};

export function convertShardText(
  text: string,
  identity: { cloneId: string; intentId: string },
  options: ConvertOptions = {},
): ConvertResult {
  if (!text.startsWith(AUDIT_HEADER)) {
    throw new JournalConvertError(`shard does not start with ${JSON.stringify(AUDIT_HEADER)}`);
  }
  const body = text.slice(AUDIT_HEADER.length);
  const segments = body.split(RECORD_SEPARATOR);
  const trailer = segments.pop();
  if (body !== "" && trailer !== "") {
    throw new JournalConvertError(
      "shard has content after the final record separator (partial write?); refusing to convert",
    );
  }
  const blocks: ParsedBlock[] = segments.map(
    (segment) => parseLegacyBlock(segment) ?? opaqueBlock(segment),
  );

  if (options.allowUnmergedForks !== true) assertNoUnmergedForks(blocks);

  // Loss-proof: header + re-rendered records must reproduce the input bytes.
  assertLosslessRender(text, AUDIT_HEADER + blocks.map(renderParsedBlock).join(""));

  const entries: JournalEntry[] = blocks.map((block, index) => ({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq: index + 1,
    cloneId: identity.cloneId,
    intentId: identity.intentId,
    timestamp: block.timestamp,
    heading: block.heading,
    event: block.event,
    ...(block.event === null ? { rawBody: block.rawBody ?? "" } : { fields: block.fields ?? {} }),
    ...(block.opaque === true ? { opaque: true as const } : {}),
  }));
  // Intentional v1 output: this command is the backward conversion bridge and
  // must produce lossless legacy JSONL for consumers that have not migrated.
  // The deletion gate registers this compatibility call site explicitly.
  return { entries, jsonl: entries.map((entry) => serializeJournalEntry(entry)).join("") };
}


// The lossless-conversion invariant, split out so the refusal is directly
// testable: a conversion whose re-render diverges from the original bytes
// must never return.
export function assertLosslessRender(text: string, rendered: string): void {
  if (rendered !== text) {
    throw new JournalConvertError(
      "round-trip mismatch: re-rendered shard differs from the original bytes; refusing to convert",
    );
  }
}

// --- shard identity derivation ---

const SHARD_NAME_RE = /^(.*)-([0-9a-f]{12})\.md$/;

export function cloneIdFromShardName(name: string): string | null {
  return name.match(SHARD_NAME_RE)?.[2] ?? null;
}

// <...>/intents/<intentId>/audit/<shard>.md -> intentId. Null when the path
// does not follow the record layout (the CLI then requires --intent-id).
export function intentIdFromShardPath(path: string): string | null {
  const auditDir = dirname(path);
  if (basename(auditDir) !== "audit") return null;
  const intentDir = dirname(auditDir);
  if (basename(dirname(intentDir)) !== "intents") return null;
  return basename(intentDir);
}

// --- CLI ---

function usage(): never {
  process.stderr.write(
    "Usage: amadeus-journal-convert.ts [--check-only] [--allow-unmerged-forks] [--intent-id <id>] [--clone-id <12hex>] <shard.md>...\n",
  );
  process.exit(1);
}

type ConvertFlags = {
  checkOnly: boolean;
  allowUnmergedForks: boolean;
  intentIdFlag?: string;
  cloneIdFlag?: string;
  paths: string[];
};

function parseConvertArgs(args: string[]): ConvertFlags {
  const flags: ConvertFlags = { checkOnly: false, allowUnmergedForks: false, paths: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--check-only") flags.checkOnly = true;
    else if (arg === "--allow-unmerged-forks") flags.allowUnmergedForks = true;
    else if (arg === "--intent-id") flags.intentIdFlag = args[++i];
    else if (arg === "--clone-id") flags.cloneIdFlag = args[++i];
    else if (arg.startsWith("--")) usage();
    else flags.paths.push(arg);
  }
  if (flags.paths.length === 0) usage();
  return flags;
}

function shardIdentity(path: string, flags: ConvertFlags): { cloneId: string; intentId: string } {
  const cloneId = flags.cloneIdFlag ?? cloneIdFromShardName(basename(path));
  if (cloneId === null) {
    throw new JournalConvertError(
      `cannot derive clone id from shard name ${basename(path)}; pass --clone-id`,
    );
  }
  const intentId = flags.intentIdFlag ?? intentIdFromShardPath(path);
  if (intentId === null) {
    throw new JournalConvertError(
      `cannot derive intent id from shard path ${path}; pass --intent-id`,
    );
  }
  return { cloneId, intentId };
}

export function handleConvert(args: string[]): void {
  const flags = parseConvertArgs(args);
  const results: Record<string, unknown>[] = [];
  for (const path of flags.paths) {
    const identity = shardIdentity(path, flags);
    const text = readFileSync(path, "utf-8");
    const { entries, jsonl } = convertShardText(text, identity, {
      allowUnmergedForks: flags.allowUnmergedForks,
    });
    const target = path.replace(/\.md$/, ".jsonl");
    if (!flags.checkOnly) writeFileSync(target, jsonl, "utf-8");
    results.push({
      shard: path,
      entries: entries.length,
      ...(flags.checkOnly ? { checked: true } : { written: target }),
    });
  }
  process.stdout.write(`${JSON.stringify({ converted: results })}\n`);
}

if (import.meta.main) {
  try {
    handleConvert(process.argv.slice(2));
  } catch (cause) {
    process.stderr.write(
      `${JSON.stringify({ error: cause instanceof Error ? cause.message : String(cause) })}\n`,
    );
    process.exit(1);
  }
}
