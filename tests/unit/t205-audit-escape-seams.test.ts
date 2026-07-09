// covers: function:handleAppendRaw
// size: medium
//
// Seam-in-place integration for the audit line-escaping seams extracted in
// #697 Phase B, Bolt B4. The pure functions themselves (escapeAuditValue /
// unescapeAuditBody) are property-tested in the SMALL sibling
// t204-audit-escape.pbt.test.ts. This file verifies the extraction is WIRED —
// each seam is driven through its real call site and the effect is observed on
// disk:
//   - write path: appendAuditEntryUnlocked applies escapeAuditValue per field
//     value (the forged-audit-entry defence);
//   - read path: handleAppendRaw applies unescapeAuditBody to the raw body
//     (literal `\n` tokens expand to real newlines).
// It writes to an isolated per-file temp projectDir (torn down in afterAll), so
// it touches the filesystem and classifies as MEDIUM — hence a dedicated file,
// keeping the PBT file in the small band (the point of the pbt-small-band
// intent). Import surface mirrors t111.test.ts (dist/claude copy, not core).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAuditEntryUnlocked,
  handleAppendRaw,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const tmpRoots: string[] = [];
// A bare dir is a valid project: ensureAuditFile lazily creates the per-intent
// shard on first write (mirrors t111's freshProject).
function freshProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t205-"));
  tmpRoots.push(root);
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
  test("write path: appendAuditEntryUnlocked collapses a field value's CR/LF via escapeAuditValue", () => {
    const proj = freshProject();
    // Embedded newline + a forged **Event** marker must NOT create a second
    // physical line — the escape seam collapses it to the two-char "\\n".
    appendAuditEntryUnlocked("ERROR_LOGGED", { Path: "/tmp/x\n**Event**: FAKE\nmore" }, proj);
    const content = readAllAuditShards(proj);
    expect(content).toContain(`**Path**: /tmp/x\\n**Event**: FAKE\\nmore\n`);
    // Exactly one real **Event** line survives (the legitimate one).
    const eventLines = content.split("\n").filter((l) => l.startsWith("**Event**:"));
    expect(eventLines).toEqual([`**Event**: ERROR_LOGGED`]);
  });

  test("read path: handleAppendRaw expands literal backslash-n in the body via unescapeAuditBody", () => {
    const proj = freshProject();
    // The raw body carries literal backslash-n (two chars). The read seam turns
    // each into a real LF, so the written block spans multiple physical lines.
    const { lines } = captureStdout(() =>
      handleAppendRaw("Custom Heading", "line1\\nline2\\nline3", proj),
    );
    const content = readAllAuditShards(proj);
    // The literal "\\n" tokens became real newlines on disk.
    expect(content).toContain("line1\nline2\nline3\n");
    // A literal backslash-n must NOT survive verbatim in the body.
    expect(content.includes("line1\\nline2")).toBe(false);
    // jsonSuccess emitted exactly one trailing-newline JSON payload.
    expect(lines.length).toBe(1);
    const printed = JSON.parse(lines[0]);
    expect(printed.appended).toBe(true);
    expect(printed.heading).toBe("Custom Heading");
  });
});
