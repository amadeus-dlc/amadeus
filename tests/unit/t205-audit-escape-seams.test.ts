// covers: function:handleAppendRaw
// size: medium
//
// Seam-in-place integration for the audit line-escaping seams extracted in
// #697 Phase B, Bolt B4. The pure functions themselves (escapeAuditValue /
// unescapeAuditBody) are property-tested in the SMALL sibling
// t204-audit-escape.pbt.test.ts. This file verifies the extraction is WIRED —
// each seam is driven through its real call site and the effect is observed on
// disk:
//   - write path: appendLifecycleAuditEntryUnlocked applies escapeAuditValue
//     per field value (the forged-audit-entry defence). It is the v1 write path
//     that survives the legacy writer's deletion (FR-MIG-5 / U8) and it shares
//     the same escapeFieldValues helper the deleted pair used, so the seam this
//     file exists to pin is driven through the call site that still has it;
//   - read path: handleAppendRaw applies unescapeAuditBody to the raw body
//     (literal `\n` tokens expand to real newlines).
// It writes to an isolated per-file temp projectDir (torn down in afterAll), so
// it touches the filesystem and classifies as MEDIUM — hence a dedicated file,
// keeping the PBT file in the small band (the point of the pbt-small-band
// intent). Import surface mirrors t111.test.ts (dist/claude copy, not core).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendLifecycleAuditEntryUnlocked,
  handleAppendRaw,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const tmpRoots: string[] = [];
// A project holding ONE intent record: ensureAuditFile lazily creates that
// record's shard on first write (mirrors t111's freshProject). The record must
// exist — an audit shard only resolves inside one (#1377) — and a dir counts as
// a record once it holds amadeus-state.md, the same header-only stub production
// birthIntent() writes at mint time.
function freshProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t205-"));
  tmpRoots.push(root);
  const record = join(root, "amadeus", "spaces", "default", "intents", "t205-fixture-deadbeef");
  mkdirSync(record, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n", "utf-8");
  return root;
}

// handleAppendRaw prints its success JSON via jsonSuccess (process.stdout.write).
// Capture it so we can assert the payload without leaking to the test runner,
// mirroring t111's handleAppend capture.
function captureStdout<T>(fn: () => T): { result: T; lines: string[] } {
  const lines: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: typeof process.stdout.write }).write = ((
    chunk: string | Uint8Array,
  ) => {
    lines.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;
  try {
    return { result: fn(), lines };
  } finally {
    (process.stdout as unknown as { write: typeof process.stdout.write }).write = orig;
  }
}

afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup; a leaked temp dir is harmless to the suite
    }
  }
});

describe("audit escape seams wired at their call sites", () => {
  test("write path: the v1 lifecycle writer collapses a field value's CR/LF via escapeAuditValue", () => {
    const proj = freshProject();
    // Embedded newline + a forged **Event** marker must NOT create a second
    // physical line — the escape seam collapses it to the two-char "\\n".
    appendLifecycleAuditEntryUnlocked(
      "INTENT_ARCHIVED",
      { Path: "/tmp/x\n**Event**: FAKE\nmore" },
      proj,
      "t205-fixture-deadbeef",
      "default",
      "t205.jsonl",
    );
    const content = readAllAuditShards(proj);
    // One physical JSONL line — the forged marker never became a record of its own.
    const rows = content.split("\n").filter((l) => l.trim() !== "");
    expect(rows).toHaveLength(1);
    const rec = JSON.parse(rows[0]) as {
      event: string | null;
      fields?: Record<string, string>;
    };
    // The field value keeps the two-char "\n" escape, not a real newline.
    expect(rec.fields?.Path).toBe(String.raw`/tmp/x\n**Event**: FAKE\nmore`);
    // Exactly one real event survives (the legitimate one).
    expect(rec.event).toBe("INTENT_ARCHIVED");
  });

  test("read path: handleAppendRaw expands literal backslash-n in the body via unescapeAuditBody", () => {
    const proj = freshProject();
    // The raw body carries literal backslash-n (two chars). The read seam turns
    // each into a real LF, so the written block spans multiple physical lines.
    const { lines } = captureStdout(() =>
      handleAppendRaw("Custom Heading", "line1\\nline2\\nline3", proj),
    );
    const content = readAllAuditShards(proj);
    const rows = content.split("\n").filter((l) => l.trim() !== "");
    expect(rows).toHaveLength(1);
    const rec = JSON.parse(rows[0]) as { event: string | null; rawBody?: string };
    // The literal "\\n" tokens became real newlines in the preserved body...
    expect(rec.event).toBeNull();
    expect(rec.rawBody).toBe("line1\nline2\nline3");
    // ...so a literal backslash-n must NOT survive verbatim in it.
    expect(rec.rawBody?.includes(String.raw`line1\nline2`)).toBe(false);
    // jsonSuccess emitted exactly one trailing-newline JSON payload.
    expect(lines.length).toBe(1);
    const printed = JSON.parse(lines[0]);
    expect(printed.appended).toBe(true);
    expect(printed.heading).toBe("Custom Heading");
  });
});
