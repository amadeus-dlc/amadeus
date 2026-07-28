// covers: function:convertShardText, function:handleConvert, function:cloneIdFromShardName, function:intentIdFromShardPath
// size: medium
//
// Converter tests for the Markdown -> JSONL journal migration bridge
// (Issue #1628, Phase 1 PR-2). MEDIUM tier: the CLI cases and the committed-
// corpus sweep touch the real filesystem. Imports come from the shipped dist
// tree (t219 precedent).
//
// The corpus sweep is the load-bearing case (corpus-sweep-for-new-guards):
// it proves the PR-3 one-shot conversion will succeed on every committed
// audit shard in this repository, not just on fixtures.

import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { formatAuditRecord } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  JournalConvertError,
  cloneIdFromShardName,
  convertShardText,
  handleConvert,
  intentIdFromShardPath,
} from "../../dist/claude/.claude/tools/amadeus-journal-convert.ts";
import { parseJournalShard } from "../../dist/claude/.claude/tools/amadeus-journal.ts";

const HEADER = "# AI-DLC Audit Log\n";
const IDENTITY = { cloneId: "abc123def456", intentId: "260728-demo-1234abcd" };

const record = (event: string, ts: string, fields: Record<string, string> = {}) =>
  formatAuditRecord({ heading: event, timestamp: ts, event, fields });

describe("convertShardText — lossless conversion", () => {
  test("canonical + raw + no-field records convert; seq is 1-based dense", () => {
    const raw = formatAuditRecord({
      heading: "Custom Note",
      timestamp: "2026-07-28T10:02:00Z",
      rawBody: "free-form line 1\nfree-form line 2",
    });
    const shard =
      HEADER +
      record("WORKFLOW_STARTED", "2026-07-28T10:00:00Z", { Scope: "amadeus-feature" }) +
      record("HUMAN_TURN", "2026-07-28T10:01:00Z") +
      raw;
    const { entries, jsonl } = convertShardText(shard, IDENTITY);
    expect(entries.length).toBe(3);
    expect(entries.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(entries[0]!.event).toBe("WORKFLOW_STARTED");
    expect(entries[0]!.fields).toEqual({ Scope: "amadeus-feature" });
    expect(entries[1]!.fields).toEqual({});
    expect(entries[2]!.event).toBeNull();
    expect(entries[2]!.rawBody).toBe("free-form line 1\nfree-form line 2");
    // The jsonl parses back through the codec, one line per record.
    expect(parseJournalShard(jsonl).length).toBe(3);
  });

  test("a frame-irregular segment survives as an opaque entry (observed corpus class)", () => {
    // The committed corpus contains a record missing its leading blank line.
    const irregular = "## Change Request: x\n**Timestamp**: 2026-07-27T04:19:55Z\n**Request**: y\n\n---\n";
    const shard = HEADER + record("WORKFLOW_STARTED", "2026-07-28T10:00:00Z") + irregular;
    const { entries } = convertShardText(shard, IDENTITY);
    expect(entries.length).toBe(2);
    expect(entries[1]!.opaque).toBe(true);
    expect(entries[1]!.event).toBeNull();
    expect(entries[1]!.timestamp).toBe("2026-07-27T04:19:55Z");
    expect(entries[1]!.rawBody).toContain("## Change Request: x");
  });

  test("refuses a missing header and trailing garbage", () => {
    expect(() => convertShardText("no header\n", IDENTITY)).toThrow(JournalConvertError);
    const partial = `${HEADER + record("HUMAN_TURN", "2026-07-28T10:00:00Z")}\n## Truncated`;
    expect(() => convertShardText(partial, IDENTITY)).toThrow(/after the final record separator/);
  });

  test("refuses an unmerged AUDIT_FORKED by default; --allow flag admits it", () => {
    const shard =
      HEADER +
      record("AUDIT_FORKED", "2026-07-28T10:00:00Z", {
        "Bolt slug": "u1-live",
        "Source Audit Hash": "0".repeat(64),
        "Fork Boundary": "19",
      });
    expect(() => convertShardText(shard, IDENTITY)).toThrow(/unmerged AUDIT_FORKED/);
    const { entries } = convertShardText(shard, IDENTITY, { allowUnmergedForks: true });
    expect(entries.length).toBe(1);
  });

  test("a forked-then-merged slug converts without the flag", () => {
    const shard =
      HEADER +
      record("AUDIT_FORKED", "2026-07-28T10:00:00Z", { "Bolt slug": "u1-done", "Source Audit Hash": "0".repeat(64), "Fork Boundary": "19" }) +
      record("AUDIT_MERGED", "2026-07-28T10:05:00Z", { "Bolt slug": "u1-done", "Entries Merged": "2" });
    expect(convertShardText(shard, IDENTITY).entries.length).toBe(2);
  });
});

describe("shard identity derivation", () => {
  test("cloneIdFromShardName extracts the 12-hex clone token", () => {
    expect(cloneIdFromShardName("my-host-name-abc123def456.md")).toBe("abc123def456");
    expect(cloneIdFromShardName("not-a-shard.md")).toBeNull();
    expect(cloneIdFromShardName("host-abc123def456.jsonl")).toBeNull();
  });

  test("intentIdFromShardPath requires the record layout", () => {
    expect(
      intentIdFromShardPath("/w/amadeus/spaces/default/intents/260728-demo-1234abcd/audit/h-abc123def456.md"),
    ).toBe("260728-demo-1234abcd");
    expect(intentIdFromShardPath("/tmp/h-abc123def456.md")).toBeNull();
  });
});

describe("handleConvert CLI (in-process)", () => {
  const tmpRoot = join(process.env.TMPDIR ?? "/tmp", `t356-journal-convert-${process.pid}`);
  const auditDir = join(tmpRoot, "spaces", "default", "intents", "260728-demo-1234abcd", "audit");
  const shardPath = join(auditDir, "host-abc123def456.md");

  function seed(): void {
    rmSync(tmpRoot, { recursive: true, force: true });
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(shardPath, HEADER + record("HUMAN_TURN", "2026-07-28T10:00:00Z"), "utf-8");
  }

  function captureStdout(fn: () => void): string {
    let out = "";
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown) => {
      out += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      fn();
    } finally {
      process.stdout.write = orig;
    }
    return out;
  }

  test("--check-only verifies without writing; write mode emits the sibling .jsonl", () => {
    seed();
    const checked = captureStdout(() => handleConvert(["--check-only", shardPath]));
    expect(JSON.parse(checked).converted[0].checked).toBe(true);
    expect(existsSync(shardPath.replace(/\.md$/, ".jsonl"))).toBe(false);

    const written = captureStdout(() => handleConvert([shardPath]));
    expect(JSON.parse(written).converted[0].written).toBe(shardPath.replace(/\.md$/, ".jsonl"));
    const jsonl = readFileSync(shardPath.replace(/\.md$/, ".jsonl"), "utf-8");
    const entries = parseJournalShard(jsonl);
    expect(entries.length).toBe(1);
    // Identity derived from the path/filename, not from flags.
    expect(entries[0]!.cloneId).toBe("abc123def456");
    expect(entries[0]!.intentId).toBe("260728-demo-1234abcd");
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("underivable identity is a loud refusal unless flags supply it", () => {
    seed();
    const bare = join(tmpRoot, "loose.md");
    writeFileSync(bare, HEADER + record("HUMAN_TURN", "2026-07-28T10:00:00Z"), "utf-8");
    expect(() => captureStdout(() => handleConvert(["--check-only", bare]))).toThrow(/clone id/);
    const out = captureStdout(() =>
      handleConvert(["--check-only", "--clone-id", "abc123def456", "--intent-id", "x-1", bare]),
    );
    expect(JSON.parse(out).converted[0].checked).toBe(true);
    rmSync(tmpRoot, { recursive: true, force: true });
  });
});

describe("committed corpus sweep — the PR-3 one-shot conversion rehearsal", () => {
  test("every committed audit shard converts losslessly (with dead forks admitted)", async () => {
    const root = join(import.meta.dir, "..", "..");
    const fails: string[] = [];
    let count = 0;
    for await (const p of new Glob("amadeus/spaces/*/intents/*/audit/*.md").scan(root)) {
      const full = join(root, p);
      const cloneId = cloneIdFromShardName(basename(full)) ?? "unknown000000";
      const intentId = intentIdFromShardPath(full) ?? "unknown";
      count += 1;
      try {
        convertShardText(readFileSync(full, "utf-8"), { cloneId, intentId }, { allowUnmergedForks: true });
      } catch (e) {
        fails.push(`${p}: ${(e as Error).message}`);
      }
    }
    expect(count).toBeGreaterThan(0);
    expect(fails).toEqual([]);
  });
});
