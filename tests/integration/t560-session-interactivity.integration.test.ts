// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: medium
//
// t560 — presence-detection (U2 / C3 / FR-2, intent 260815-rfc-autonomy-modes).
// resolveSessionInteractivity(projectDir) is the single read-only effective-
// interactivity function: "this clone's own audit shard has >=1 HUMAN_TURN".
// It reuses the existing ledger-scan pattern from amadeus-state.ts
// handleDelegateApproval/handleDelegateRejection (auditShardDir + auditShardName
// + findAllEvents) rather than minting presence itself.
//
// R-1 (single public read port) has no dedicated test here: before this unit's
// implementation, EVERY test below fails to compile (the function does not
// exist) — that IS the R-1 falling proof. After implementation, every test
// below imports and calls the same one function; a private re-implementation
// elsewhere is out of this unit's scope (U3/U4/U7 own their own call sites).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveSessionInteractivity } from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  activeIntent,
  activeSpace,
  auditCloneId,
  auditShardDir,
  auditShardName,
  isoTimestamp,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { JOURNAL_SCHEMA_VERSION, serializeJournalEntry } from "../../packages/framework/core/tools/amadeus-journal.ts";

const tmpRoots: string[] = [];
afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

// A workspace with exactly one resolvable intent record — mirrors the on-disk
// layout resolveSessionInteractivity's callers (Stop hook, --status) run under.
function scaffold(): { root: string; record: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t560-"));
  tmpRoots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = "presence-detect-fixture-abcd1234";
  mkdirSync(join(intents, record), { recursive: true });
  writeFileSync(join(intents, record, "amadeus-state.md"), "# AI-DLC State\n", "utf-8");
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(intents, "active-intent"), `${record}\n`, "utf-8");
  return { root, record };
}

// Plant an event directly into THIS clone's own shard — the exact file
// resolveSessionInteractivity resolves via auditShardDir(root)+auditShardName(root).
function plantOwnShardEvent(root: string, event: string, seq: number): string {
  const shardDir = auditShardDir(root);
  if (shardDir === null) throw new Error("test fixture: no intent resolved");
  mkdirSync(shardDir, { recursive: true });
  const shardPath = join(shardDir, auditShardName(root));
  const ts = isoTimestamp();
  const line = serializeJournalEntry({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq,
    cloneId: auditCloneId(root),
    intentId: activeIntent(root, activeSpace(root)) ?? "workspace",
    timestamp: ts,
    heading: event === "HUMAN_TURN" ? "Human Turn" : event,
    event,
    fields: {},
  });
  writeFileSync(shardPath, `${readSafe(shardPath)}${line}`, "utf-8");
  return ts;
}

function readSafe(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

describe("resolveSessionInteractivity — shape (domain-entities.md)", () => {
  test("returns the SessionInteractivity contract shape", () => {
    const { root } = scaffold();
    const result = resolveSessionInteractivity(root);
    expect(typeof resolveSessionInteractivity).toBe("function");
    expect(result.source).toBe("human-turn-pipeline");
    expect(typeof result.interactive).toBe("boolean");
    // ISO 8601 wall-clock, re-derived per call (not the HUMAN_TURN timestamp).
    expect(() => new Date(result.measuredAt).toISOString()).not.toThrow();
  });
});

describe("R-2 — session scoped to THIS clone's own audit shard", () => {
  test("this clone's shard holds a real HUMAN_TURN -> interactive true", () => {
    const { root } = scaffold();
    plantOwnShardEvent(root, "HUMAN_TURN", 1);
    expect(resolveSessionInteractivity(root).interactive).toBe(true);
  });

  test("this clone's shard is empty; HUMAN_TURN exists only in ANOTHER clone's shard -> interactive false", () => {
    const { root } = scaffold();
    const shardDir = auditShardDir(root);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    mkdirSync(shardDir, { recursive: true });
    // A different clone's shard file (never this clone's own auditShardName),
    // planted directly so resolveSessionInteractivity never reads it.
    const otherShardPath = join(shardDir, "some-other-host-deadbeef00000000.jsonl");
    const line = serializeJournalEntry({
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 1,
      cloneId: "deadbeef00000000",
      intentId: activeIntent(root, activeSpace(root)) ?? "workspace",
      timestamp: isoTimestamp(),
      heading: "Human Turn",
      event: "HUMAN_TURN",
      fields: {},
    });
    writeFileSync(otherShardPath, line, "utf-8");
    // No own-clone shard file exists at all — must not borrow the other clone's presence.
    expect(resolveSessionInteractivity(root).interactive).toBe(false);
  });
});

describe("R-3 — judgment-impossible fails closed, never throws", () => {
  test("no intent resolved (record unresolved) -> interactive false, no throw", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t560-unresolved-"));
    tmpRoots.push(root);
    // No amadeus/ tree at all under root.
    let result: { interactive: boolean } | undefined;
    expect(() => {
      result = resolveSessionInteractivity(root);
    }).not.toThrow();
    expect(result?.interactive).toBe(false);
  });

  test("shard file does not exist (ENOENT) -> interactive false, no throw", () => {
    const { root } = scaffold();
    let result: { interactive: boolean } | undefined;
    expect(() => {
      result = resolveSessionInteractivity(root);
    }).not.toThrow();
    expect(result?.interactive).toBe(false);
  });

  test("shard file holds only corrupted/non-JSON lines -> interactive false, no throw", () => {
    const { root } = scaffold();
    const shardDir = auditShardDir(root);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    mkdirSync(shardDir, { recursive: true });
    const shardPath = join(shardDir, auditShardName(root));
    writeFileSync(shardPath, "not-json-at-all\n{truncated-garbage\n\x00binary\x00\n", "utf-8");
    let result: { interactive: boolean } | undefined;
    expect(() => {
      result = resolveSessionInteractivity(root);
    }).not.toThrow();
    expect(result?.interactive).toBe(false);
  });
});

describe("R-4 — cannot over-report (no false positive)", () => {
  test("a corrupted line adjacent to a real HUMAN_TURN does not flip the value", () => {
    const { root } = scaffold();
    plantOwnShardEvent(root, "HUMAN_TURN", 1);
    const shardDir = auditShardDir(root);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    const shardPath = join(shardDir, auditShardName(root));
    // Append a corrupted line right after the legitimate HUMAN_TURN row —
    // splitAuditRecords/findAllEvents silently drop non-JSON lines (existing
    // contract), so this must not erase the true positive.
    writeFileSync(shardPath, `${readFileSync(shardPath, "utf-8")}not-a-json-line{{{\n`, "utf-8");
    expect(resolveSessionInteractivity(root).interactive).toBe(true);
  });

  test("corruption alone (no real HUMAN_TURN anywhere) never produces a false positive", () => {
    const { root } = scaffold();
    const shardDir = auditShardDir(root);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    mkdirSync(shardDir, { recursive: true });
    const shardPath = join(shardDir, auditShardName(root));
    writeFileSync(shardPath, '{"garbage": "no event field, not even close to HUMAN_TURN"}\n', "utf-8");
    expect(resolveSessionInteractivity(root).interactive).toBe(false);
  });
});

describe("R-6 — re-evaluated per call, never cached", () => {
  test("a HUMAN_TURN appended between two calls flips the second call's result", () => {
    const { root } = scaffold();
    const first = resolveSessionInteractivity(root);
    expect(first.interactive).toBe(false);
    plantOwnShardEvent(root, "HUMAN_TURN", 1);
    const second = resolveSessionInteractivity(root);
    expect(second.interactive).toBe(true);
  });
});

describe("R-7 — read-only, never mutates audit state", () => {
  test("the audit shard's bytes are unchanged across a call", () => {
    const { root } = scaffold();
    plantOwnShardEvent(root, "HUMAN_TURN", 1);
    const shardDir = auditShardDir(root);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    const shardPath = join(shardDir, auditShardName(root));
    const before = readFileSync(shardPath, "utf-8");
    resolveSessionInteractivity(root);
    const after = readFileSync(shardPath, "utf-8");
    expect(after).toBe(before);
  });
});

describe("R-5 — rejected alternatives (freshness window / TTY / explicit flag) not implemented", () => {
  // Document-check: these are absent-by-design (RFC Q3 rejected alternatives),
  // which behavioural tests cannot express directly — pinned as a structural
  // scan of the implementation instead (project.md absence-verification norm:
  // machine-checkable, not prose-only).
  test("signature carries only projectDir; implementation reads no TTY/env/config-flag/time-window signal", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "..", "packages/framework/core/tools/amadeus-intent-autonomy.ts"),
      "utf-8",
    );
    const sigMatch = source.match(/export function resolveSessionInteractivity\(([^)]*)\)/);
    expect(sigMatch).not.toBeNull();
    const params = (sigMatch as RegExpMatchArray)[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    expect(params).toEqual(["projectDir: string"]);

    // Capture through the NEXT top-level export so the whole body is inspected
    // even if the function later gains additional column-0 braces or trailing
    // statements after the try/catch.
    const bodyMatch = source.match(/export function resolveSessionInteractivity\([\s\S]*?\n}\n(?=\s*(?:\/\/[^\n]*\n\s*)*export\b)/);
    expect(bodyMatch).not.toBeNull();
    const body = (bodyMatch as RegExpMatchArray)[0];
    // TTY / harness-kind detection.
    expect(body).not.toMatch(/isTTY|process\.stdout|process\.stdin/);
    // Explicit config-flag reads.
    expect(body).not.toMatch(/process\.env|getFlagValue|loadConfig|readConfig/);
    // Freshness-window arithmetic against HUMAN_TURN timestamps.
    expect(body).not.toMatch(/Date\.now\(\)\s*-|getTime\(\)\s*-|\bwindowMs\b|\bfreshness\b|\bmaxAgeMs\b/);
  });
});
