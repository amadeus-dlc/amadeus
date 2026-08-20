// covers: function:emitAuditEvent, function:handleAppend, cli:amadeus-audit(append-error,append-json,append-raw)
//
// t18 — amadeus-audit.ts audit-append behaviour. Migrated from
// tests/unit/t18-tool-audit.sh (13 TAP assertions, 16 bun spawns).
// Mechanism: cli (most assertions call exported functions in process; zero
// LLM, zero tokens). Three CLI-shell contracts that exercise
// the process.exit / stdout / stderr seam — or a non-exported handler —
// are kept as Bun.spawnSync env-seam cases (flagged inline) so no guarantee
// is lost.
//
// Source under test: the canonical emit (otel/audit-emit.ts emitAuditEvent) and
// the audit CLI's append entry (amadeus-audit.ts handleAppend). The cases below
// were written against the legacy writer pair, which has since been deleted
// (FR-MIG-5 / U8); they now drive the path that writes today. What they assert
// is unchanged, because it was never about the writer's identity:
//   - a shard is created on first write
//   - the shard is JSONL with no header, one record per line, dense 1-based seq
//   - the audit event type and every field survive the round trip
//   - a second append keeps the first record
// The records are read through the shared normaliser, which serves both schemas
// under their historical field names, so the assertions read the same whichever
// schema stamped the row.
//
// Test-design note (house style): assert the OBSERVABLE behavioural contract
// the .sh asserted — return values, thrown errors, and the literal bytes
// written to audit.md — never re-implementation of the formatter. Each
// assertion hard-codes the expected literal independently of the source.
//
// Old TAP -> new test parity (1:1, no guarantee dropped):
//   .sh test 1  (creates audit.md if missing)        -> "creates audit.md when missing"
//   .sh test 2  (writes header)                       -> "first write prepends the AI-DLC Audit Log header"
//   .sh test 3  (writes event type)                   -> "writes the **Event**: <type> line"
//   .sh test 4a (writes Stage field)                  -> "writes each field as **key**: value"
//   .sh test 4b (writes Details field)                -> "writes each field as **key**: value"
//   .sh test 5  (ISO timestamp)                       -> "writes an ISO **Timestamp** line (...Z, no millis)"
//   .sh test 6  (rejects invalid event type)          -> in-proc "appendAuditEntry throws ..." + CLI "append CLI emits error JSON on stderr"
//   .sh test 7  (returns JSON success)                -> in-proc "handleAppend writes appended:true JSON to stdout" + CLI "append CLI prints appended:true to stdout"
//   .sh test 8  (multiple appends accumulate)         -> "two appends produce exactly two --- separators"
//   .sh test 9  (append-raw custom heading)           -> CLI "append-raw CLI uses the custom ## heading" (handleAppendRaw not exported)
//   .sh test 10 (writes separator line)               -> "writes a standalone --- separator line"
//   .sh test 11 (heading for WORKSPACE_SCANNED)       -> "maps WORKSPACE_SCANNED to the '## Workspace Scanned' heading"
//   .sh test 12 (WORKSPACE_SCANNED accepted)          -> "accepts the WORKSPACE_SCANNED initialization event"

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { handleAppend } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { emitAuditEvent } from "../../dist/claude/.claude/otel/audit-emit.ts";
import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { auditFilePath, readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const TOOL = amadeusToolTarget(
  fileURLToPath(
    new URL("../../dist/claude/.claude/tools/amadeus-audit.ts", import.meta.url),
  ),
);

// P9: the flat amadeus-docs/audit.md is retired. appendAuditEntry resolves the
// RECORD's per-clone shard (auditFilePath, which ensureAuditFile mkdir -p's on
// first write) — and refuses when no intent resolves (#1377), so the project
// carries one record. A dir counts as a record once it holds amadeus-state.md,
// the header-only stub production birthIntent() writes; the audit/ dir itself is
// still created lazily by the first append. Each test gets a fresh project and
// tears it down.
function makeProject(): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-t18-"));
  const record = join(proj, "amadeus", "spaces", "default", "intents", "t18-fixture-deadbeef");
  mkdirSync(record, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n", "utf-8");
  return proj;
}

// The in-process clone-id is memoized in THIS process, so the shard
// appendAuditEntry writes is exactly auditFilePath(proj). The CLI-spawn case
// (test 9) reads via the shard glob, since the subprocess mints its own clone-id.
function auditPath(proj: string): string {
  return auditFilePath(proj);
}

interface AuditRecord {
  seq: number;
  timestamp: string;
  heading: string;
  event: string | null;
  fields?: Record<string, string>;
  rawBody?: string;
}

/** The JSONL records on the in-process shard, in write order. */
function records(proj: string): AuditRecord[] {
  return readFileSync(auditPath(proj), "utf-8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => normalizeAuditRecord(JSON.parse(l) as Record<string, unknown>) as unknown as AuditRecord);
}

function withProject(fn: (proj: string) => void): void {
  const proj = makeProject();
  // The canonical emit path bootstraps per workspace and refuses a second
  // bootstrap for a different project dir; each case gets a fresh project.
  resetOtelPerProject();
  try {
    fn(proj);
  } finally {
    rmSync(proj, { recursive: true, force: true });
  }
}

describe("canonical emit — file creation + bytes (in-process)", () => {
  test("creates audit.md when missing [.sh test 1]", () => {
    withProject((proj) => {
      // audit.md does not exist yet (makeProject only creates the dir). The
      // .sh did `rm -f audit.md` first; here it never existed, same precondition.
      expect(existsSync(auditPath(proj))).toBe(false);
      emitAuditEvent("STAGE_COMPLETED", { Stage: "workspace-scaffold", Details: "done" }, proj);
      expect(existsSync(auditPath(proj))).toBe(true);
    });
  });

  test("first write starts the shard at the first JSONL record (no header) [.sh test 2]", () => {
    withProject((proj) => {
      emitAuditEvent("STAGE_COMPLETED", { Stage: "workspace-scaffold", Details: "done" }, proj);
      const body = readFileSync(auditPath(proj), "utf-8");
      // JSONL shards carry NO header — the first byte opens the first record,
      // whose seq starts the shard's 1-based dense sequence.
      expect(body.startsWith("{")).toBe(true);
      expect(records(proj)).toHaveLength(1);
      expect(records(proj)[0].seq).toBe(1);
    });
  });

  test("writes the event type into the record's `event` key [.sh test 3]", () => {
    withProject((proj) => {
      emitAuditEvent(
        "STAGE_COMPLETED",
        { Stage: "workspace-scaffold", Details: "Done" },
        proj,
      );
      expect(records(proj)[0].event).toBe("STAGE_COMPLETED");
    });
  });

  test("writes each field into the record's fields map [.sh test 4a + 4b]", () => {
    withProject((proj) => {
      emitAuditEvent(
        "STAGE_COMPLETED",
        { Stage: "intent-capture", Details: "Q&A done" },
        proj,
      );
      const fields = records(proj)[0].fields ?? {};
      // .sh test 4a: Stage field value present.
      expect(fields.Stage).toBe("intent-capture");
      // .sh test 4b: Details field value present.
      expect(fields.Details).toBe("Q&A done");
    });
  });

  test("writes an ISO timestamp (...Z, no millis) [.sh test 5]", () => {
    withProject((proj) => {
      const result = emitAuditEvent("HEALTH_CHECKED", { Request: "doctor", Details: "All pass" }, proj);
      // Same regex the .sh grepped for: YYYY-MM-DDTHH:MM:SSZ (isoTimestamp
      // strips millis). Assert on the record on disk AND the returned timestamp.
      const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      expect(records(proj)[0].timestamp).toBe(result.timestamp);
      expect(isoRe.test(result.timestamp)).toBe(true);
    });
  });

  test("two appends produce exactly two records [.sh test 8]", () => {
    withProject((proj) => {
      emitAuditEvent("STAGE_STARTED", { Stage: "workspace-scaffold", Agent: "developer" }, proj);
      emitAuditEvent("STAGE_COMPLETED", { Stage: "workspace-scaffold", Details: "done" }, proj);
      // The .sh counted the `---` block separators; the JSONL equivalent is the
      // record count — one line per append, with a dense 1-based seq.
      const rows = records(proj);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.seq)).toEqual([1, 2]);
      expect(rows.map((r) => r.event)).toEqual(["STAGE_STARTED", "STAGE_COMPLETED"]);
    });
  });

  test("terminates each record with a newline (one record per line) [.sh test 10]", () => {
    withProject((proj) => {
      emitAuditEvent("STAGE_COMPLETED", { Stage: "workspace-scaffold", Details: "done" }, proj);
      const body = readFileSync(auditPath(proj), "utf-8");
      // The .sh's `---` separator became the JSONL line boundary: exactly one
      // trailing newline, and no embedded newline inside the record.
      expect(body.endsWith("\n")).toBe(true);
      expect(body.split("\n").filter((l) => l !== "")).toHaveLength(1);
    });
  });
});

describe("emitAuditEvent() — event-type heading + validation (in-process)", () => {
  test("maps WORKSPACE_SCANNED to the 'Workspace Scanned' heading [.sh test 11]", () => {
    withProject((proj) => {
      emitAuditEvent("WORKSPACE_SCANNED", { "Project Type": "greenfield", Details: "Greenfield" }, proj);
      // EVENT_HEADINGS["WORKSPACE_SCANNED"] === "Workspace Scanned" — now the
      // record's `heading` key rather than a `## ` Markdown line.
      expect(records(proj)[0].heading).toBe("Workspace Scanned");
    });
  });

  test("accepts the WORKSPACE_SCANNED initialization event [.sh test 12]", () => {
    withProject((proj) => {
      const result = emitAuditEvent("WORKSPACE_SCANNED", { "Project Type": "brownfield", Details: "test" }, proj);
      // The event is in the registry, so it lands without throwing and the
      // record's `event` key carries it.
      expect(result.appended).toBe(true);
      expect(result.event).toBe("WORKSPACE_SCANNED");
      expect(records(proj)[0].event).toBe("WORKSPACE_SCANNED");
    });
  });

  test("the append entry throws on an invalid event type [.sh test 6 — logic half]", () => {
    withProject((proj) => {
      // The .sh asserted the CLI prints "error"; the underlying contract is
      // that an unknown event is REJECTED before anything is written. The
      // rejection used to live in the legacy writer's accept set; it now lives
      // at the CLI entry, against the registry (t389), so the throw is asserted
      // there — still validate-before-emit, still nothing on disk.
      expect(() =>
        handleAppend("INVALID_EVENT", {}, proj),
      ).toThrow(/Invalid event type: INVALID_EVENT/);
      expect(existsSync(auditPath(proj))).toBe(false);
    });
  });

  test("handleAppend writes appended:true JSON to stdout [.sh test 7 — logic half]", () => {
    withProject((proj) => {
      // handleAppend is the exported wrapper that the CLI 'append' subcommand
      // calls. It writes JSON.stringify(result)+"\n" to stdout. Capture the
      // write to assert the exact JSON contract the .sh grepped for.
      const original = process.stdout.write.bind(process.stdout);
      let captured = "";
      process.stdout.write = (chunk: string | Uint8Array) => {
        captured += chunk.toString();
        return true;
      };
      try {
        // Production always supplies both (amadeus-utility.ts's birth emit), and
        // the registry marks both required — so the fixture carries both.
        handleAppend(
          "WORKFLOW_STARTED",
          { Scope: "feature", Request: "/amadeus feature" },
          proj,
        );
      } finally {
        process.stdout.write = original;
      }
      expect(captured.includes('"appended":true')).toBe(true);
      // The same JSON must be valid and carry the event back.
      const parsed = JSON.parse(captured.trim());
      expect(parsed.appended).toBe(true);
      expect(parsed.event).toBe("WORKFLOW_STARTED");
    });
  });
});

// --- CLI env-seam cases (Bun.spawnSync) -------------------------------------
//
// These three assert the CLI process shell, not the core logic the in-process
// tests above already cover:
//   - test 6 (CLI half): jsonError() writes {"error":...} to STDERR and
//     process.exit(1). The in-process function throws; only the CLI
//     translates that throw into the "error" string the .sh grepped for.
//   - test 7 (CLI half): the 'append' subcommand prints the success JSON to
//     STDOUT through process.stdout — a process-boundary contract.
//   - test 9: append-raw routes through handleAppendRaw, which is NOT exported
//     (CLI-only). The custom-heading contract can only be exercised through
//     the spawned binary.
//
// They are kept as spawns deliberately (env-seam), preserving the exact
// guarantees the .sh had for these three rows.
describe("amadeus-audit CLI shell (Bun.spawnSync env seam)", () => {
  test("append CLI emits error JSON on stderr for an invalid event [.sh test 6 — CLI half]", () => {
    withProject((proj) => {
      const r = Bun.spawnSync({
        cmd: ["bun", TOOL, "append", "INVALID_EVENT", "--project-dir", proj],
        stdout: "pipe",
        stderr: "pipe",
      });
      const merged =
        new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
      // .sh: assert_contains "$OUT" "error" (OUT = stdout+stderr).
      expect(merged.includes("error")).toBe(true);
      expect(r.exitCode).not.toBe(0);
    });
  });

  test("append CLI prints appended:true to stdout [.sh test 7 — CLI half]", () => {
    withProject((proj) => {
      const r = Bun.spawnSync({
        cmd: [
          "bun", TOOL, "append", "WORKFLOW_STARTED",
          // Both required attributes, as production's birth emit supplies them.
          "--field", "Scope=feature", "--field", "Request=/amadeus feature",
          "--project-dir", proj,
        ],
        stdout: "pipe",
        stderr: "pipe",
      });
      const merged =
        new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
      expect(merged.includes('"appended":true')).toBe(true);
      expect(r.exitCode).toBe(0);
    });
  });

  test("append-raw CLI uses the custom ## heading [.sh test 9]", () => {
    withProject((proj) => {
      const r = Bun.spawnSync({
        cmd: [
          "bun", TOOL, "append-raw", "Custom Event",
          "**Event**: CUSTOM\\n**Details**: Something happened",
          "--project-dir", proj,
        ],
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(r.exitCode).toBe(0);
      // The subprocess mints its own clone-id, so read every shard (glob) rather
      // than the in-process shard name.
      const raw = readAllAuditShards(proj)
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => JSON.parse(l) as { eventName: string; attributes?: { Heading?: string; "Raw Body"?: string } });
      // handleAppendRaw lands a v2 compatibility record with the custom
      // heading and body preserved as typed attributes.
      expect(raw).toHaveLength(1);
      expect(raw[0].eventName).toBe("amadeus.audit.raw");
      expect(raw[0].attributes?.Heading).toBe("Custom Event");
      expect(raw[0].attributes?.["Raw Body"]).toBe("**Event**: CUSTOM\n**Details**: Something happened");
    });
  });
});
