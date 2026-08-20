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
//     per field value (the forged-audit-entry defence) before the canonical v2
//     append path receives the fields;
//   - read path: handleAppendRaw applies unescapeAuditBody to the raw body
//     (literal `\n` tokens expand to real newlines).
// It writes to an isolated per-file temp projectDir (torn down in afterAll), so
// it touches the filesystem and classifies as MEDIUM — hence a dedicated file,
// keeping the PBT file in the small band (the point of the pbt-small-band
// intent). Import surface mirrors t111.test.ts (dist/claude copy, not core).

import { afterAll, describe, expect, test } from "bun:test";
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendLifecycleAuditEntryUnlocked,
  handleAppendRaw,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { auditLockDir, readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

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
  test("append-raw reports a live lock holder through its JSON error seam", () => {
    const proj = freshProject();
    const previousLockBase = process.env.AMADEUS_LOCK_BASE_DIR;
    process.env.AMADEUS_LOCK_BASE_DIR = join(proj, "locks");
    const lockDir = auditLockDir(proj);
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify({
      pid: process.pid,
      startedAtMs: Date.now(),
    }));

    class ProcessExit extends Error {}
    const originalExit = process.exit.bind(process);
    const originalStderr = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.exit = ((code?: number) => {
      throw new ProcessExit(String(code ?? 0));
    }) as typeof process.exit;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += typeof chunk === "string" ? chunk : chunk.toString();
      return true;
    }) as typeof process.stderr.write;
    try {
      expect(() => handleAppendRaw("Custom Heading", "body", proj)).toThrow(ProcessExit);
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalStderr;
      if (previousLockBase === undefined) delete process.env.AMADEUS_LOCK_BASE_DIR;
      else process.env.AMADEUS_LOCK_BASE_DIR = previousLockBase;
    }
    expect(stderr).toContain("Failed to acquire audit lock after retries");
  }, scaleTestTime(10000));

  test("write path: the lifecycle writer collapses a field value's CR/LF via escapeAuditValue", () => {
    const proj = freshProject();
    // Embedded newline + a forged **Event** marker must NOT create a second
    // physical line — the escape seam collapses it to the two-char "\\n".
    appendLifecycleAuditEntryUnlocked(
      "INTENT_ARCHIVED",
      {
        Intent: "t205-fixture-deadbeef",
        "From Status": "in-flight",
        "To Status": "archived",
        "Operation Id": "op-t205",
        "User Input": "/tmp/x\n**Event**: FAKE\nmore",
        "Human Turn Timestamp": "2026-08-20T00:00:00Z",
      },
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
      schemaVersion: number;
      eventName: string;
      attributes?: Record<string, string>;
    };
    // The field value keeps the two-char "\n" escape, not a real newline.
    expect(rec.attributes?.["User Input"]).toBe(String.raw`/tmp/x\n**Event**: FAKE\nmore`);
    // Exactly one real event survives (the legitimate one).
    expect(rec.schemaVersion).toBe(2);
    expect(rec.eventName).toBe("amadeus.intent.archived");
  });

  test("read path: handleAppendRaw expands literal backslash-n in the body via unescapeAuditBody", () => {
    const proj = freshProject();
    // The raw body carries literal backslash-n (two chars). The read seam turns
    // each into a real LF before the v2 JSON codec escapes it on the wire.
    const { lines } = captureStdout(() =>
      handleAppendRaw("Custom Heading", "line1\\nline2\\nline3", proj),
    );
    const content = readAllAuditShards(proj);
    const rows = content.split("\n").filter((l) => l.trim() !== "");
    expect(rows).toHaveLength(1);
    const rec = JSON.parse(rows[0]) as {
      schemaVersion: number;
      eventName: string;
      attributes?: { "Raw Body"?: string };
    };
    // The literal "\\n" tokens became real newlines in the preserved body...
    expect(rec.schemaVersion).toBe(2);
    expect(rec.eventName).toBe("amadeus.audit.raw");
    expect(rec.attributes?.["Raw Body"]).toBe("line1\nline2\nline3");
    // ...so a literal backslash-n must NOT survive verbatim in it.
    expect(rec.attributes?.["Raw Body"]?.includes(String.raw`line1\nline2`)).toBe(false);
    // jsonSuccess emitted exactly one trailing-newline JSON payload.
    expect(lines.length).toBe(1);
    const printed = JSON.parse(lines[0]);
    expect(printed.appended).toBe(true);
    expect(printed.heading).toBe("Custom Heading");
  });
});
