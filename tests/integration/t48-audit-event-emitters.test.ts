// covers: doc:12-state-machine.md(audit-event-taxonomy), doc:audit-format.md(event-registry), data:otel/event-registry.ts(canonical-audit-events), function:handleApprove, function:handleReject, function:handleGateStart, function:handleRevise, function:handleSkip, function:handleCompleteWorkflow, function:handleAdvance, function:handleReuseArtifact, function:handleIntentBirth
//
// t48 — Drift test for the audit event taxonomy: docs vs code.
// Migrated from tests/integration/t48-audit-event-emitters.sh (TAP plan 16). The
// .sh declared NO `# covers:` header — its subject is the cross-consistency of
// three SOURCE-TEXT surfaces (it is a static-analysis meta-test, not a runtime
// behaviour test): the emitter registry in docs/reference/12-state-machine.md,
// the canonical Event Registry in otel/event-registry.ts, the Event Registry
// in knowledge/amadeus-shared/audit-format.md, and the emission call sites across
// tools/ + hooks/.
//
// Mechanism: NONE. The .sh was "L1 — pure bash + grep + awk. No bun, no
// claude." There is no process boundary, no argv, no exit code, no stdout, no
// audit.md write to cross — the entire subject is the BYTES of shipped source
// and doc files read off disk. So this twin reads the same files and applies
// the same scanning logic in TypeScript, in-process. Zero spawns, zero LLM,
// zero tokens. (The point of a drift test is text-vs-text agreement; parsing
// the source text and canonical registry are the faithful surfaces for this
// drift check.
//
// Source / surfaces under test:
//   - docs/reference/12-state-machine.md   (## Audit event taxonomy tables)
//   - dist/claude/.claude/otel/event-registry.ts  canonical audit-event rows
//   - dist/claude/.claude/knowledge/amadeus-shared/audit-format.md  (## Event Registry)
//   - dist/claude/.claude/tools/*.ts + hooks/*.ts  (emission call sites)
//   - dist/claude/.claude/tools/amadeus-state.ts     (pairing handler bodies)
//   - dist/claude/.claude/tools/amadeus-utility.ts   (handleIntentBirth body)
//   - dist/claude/.claude/skills/amadeus/            (forbidden prose-append scan)
//
// The four named checks the .sh documents (forward / reverse / tertiary /
// pairing) plus the md-md catalog cross-check and the prose-append bonus are
// each reproduced below against the SAME emission-pattern definitions:
//   * emission helper call with the event literal on one line:
//       (emitAudit|appendAuditEntry|appendAuditEntryUnlocked|appendAuditEvent)(...,"EVENT"...)
//   * the audit-logger ternary:   eventType = ... "EVENT"
//   * a multi-line helper call where the event literal sits on its own line.
//   * a "decommented" view (strip //- and *-prefixed lines) so a commented-out
//     emission does not falsely count — the .sh's decommented() / has_emission().
//
// Old TAP -> new test parity (1:1, every .sh assertion -> a named test()):
//   .sh test 1  assert_file_exists DOC               -> "state-machine doc exists"
//   .sh test 2  assert_eq REGISTRY_COUNT TS_COUNT     -> "emitter registry row count matches canonical registry"
//   .sh test 3  forward: doc row -> call site         -> "forward: every doc (event, emitter) row has a matching call site"
//   .sh test 4  reverse: call site -> doc row         -> "reverse: every source emission site is in the doc"
//   .sh test 5  tertiary: deleted events not present  -> "tertiary: deleted events have no emission sites and are not in the canonical registry"
//   .sh test 6  check_pairing handleApprove           -> "pairing: handleApprove emits GATE_APPROVED + STAGE_COMPLETED"
//   .sh test 7  check_pairing handleReject            -> "pairing: handleReject emits GATE_REJECTED + STAGE_REVISING"
//   .sh test 8  check_pairing handleGateStart         -> "pairing: handleGateStart emits STAGE_AWAITING_APPROVAL"
//   .sh test 9  check_pairing handleRevise            -> "pairing: handleRevise emits STAGE_AWAITING_APPROVAL"
//   .sh test 10 check_pairing handleSkip              -> "pairing: handleSkip emits STAGE_SKIPPED"
//   .sh test 11 check_pairing handleCompleteWorkflow  -> "pairing: handleCompleteWorkflow emits PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED"
//   .sh test 12 check_pairing handleAdvance           -> "pairing: handleAdvance emits STAGE_STARTED"
//   .sh test 13 check_pairing handleReuseArtifact     -> "pairing: handleReuseArtifact emits ARTIFACT_REUSED"
//   .sh test 14 check_pairing handleIntentBirth              -> "pairing: handleIntentBirth emits WORKFLOW_STARTED + PHASE_STARTED + STAGE_STARTED"
//   .sh test 15 md-md catalog cross-check             -> "md-md: audit-format.md and 12-state-machine.md agree on the event set"
//   .sh test 16 forbidden prose append calls          -> "no prose amadeus-audit.ts append calls in skills/amadeus/"

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalAuditEvents } from "../../dist/claude/.claude/otel/event-registry.ts";

// Keep this static drift detector self-contained. t52 copies only dist/, docs/
// and tests/ into a sandbox; importing the general fixture module would pull in
// canonical runtime modules that intentionally are not part of that sandbox.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AMADEUS_SRC = join(REPO_ROOT, "dist", "claude", ".claude");

const DOC = join(REPO_ROOT, "docs", "reference", "12-state-machine.md");
const TOOLS_DIR = join(AMADEUS_SRC, "tools");
const HOOKS_DIR = join(AMADEUS_SRC, "hooks");
const CANONICAL_EVENTS = new Set(canonicalAuditEvents());
const STATE_TS = join(TOOLS_DIR, "amadeus-state.ts");
const UTIL_TS = join(TOOLS_DIR, "amadeus-utility.ts");
const AUDIT_FORMAT = join(AMADEUS_SRC, "knowledge", "amadeus-shared", "audit-format.md");
const SKILLS_DIR = join(AMADEUS_SRC, "skills", "amadeus");

// The emission vocabulary, LONGEST-FIRST so a prefix alternative cannot claim
// a longer name's call. `appendAuditEntryViaEvents` and `emitSwarmAudit` are
// the migration-era emitters: a call site that moved onto the canonical Event
// path is still a live emission, and the guard's question is whether the doc's
// (event, emitter) row still names a file that emits it. Omitting a migrated
// name would make this guard read a MIGRATED emitter as a MISSING one — the
// question is "is this event still emitted from this file", not "which writer
// does it use".
//
// Names beyond the writer family:
//
//   emitCanonical — the sensor dispatcher's lazily-resolved binding of
//   appendAuditEntryViaEvents. The dispatcher cannot import the emit path at
//   module scope (BR-5: the CLI must start on a tool tree with no otel/
//   directory), so its call sites read through the resolved local.
//
//   getEventDefByAuditEvent — how a TARGETED site names its event. Those sites
//   call emitEvent directly (the Adapter fails closed on per-call intent/space,
//   E-U7CG-Q3A), and emitEvent takes the registry's OTel name rather than the v1
//   type — so the legacy literal this check looks for lives in the registry
//   lookup that resolves it, one line above the emit.
//
//   emitAuditEvent / emitCanonicalAuditEvent / emitErrorAuditRow — the targeted
//   emit seam (otel/audit-emit.ts), amadeus-audit.ts's lazily-required wrapper
//   around it, and amadeus-lib.ts's ERROR_LOGGED row.
//
//   emitGoalAudit / emitSealedGoalAudit — the Goal lifecycle adapters for
//   ordinary and legacy-completed intents respectively.
//
// Prefix pairs that make the ordering load-bearing: appendAuditEntry precedes
// its ...ViaEvents/...Unlocked forms, emitCanonical its ...AuditEvent form, and
// emitAudit its ...Event form — each longer name is listed first.
const EMITTERS =
  "(appendAuditEntryViaEvents|appendAuditEntryUnlocked|emitCanonicalAuditEvent|emitSealedGoalAudit|getEventDefByAuditEvent|emitErrorAuditRow|appendAuditEntry|appendAuditEvent|emitAuditEvent|emitSwarmAudit|emitGoalAudit|emitCanonical|emitAudit)";

/** Strip line comments so a commented-out emission does not count.
 *  Mirrors the .sh decommented(): drop //-prefixed lines and JSDoc *-lines. */
function decommented(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join("\n");
}

/** Recursively false; just the .ts files directly under a dir (the .sh globbed
 *  "$DIR"/*.ts — non-recursive). */
function tsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

const ALL_SOURCE_FILES = [...tsFiles(TOOLS_DIR), ...tsFiles(HOOKS_DIR)];

/**
 * has_emission (.sh:40-60): is there a LIVE emission call site for `event` in
 * `text`? Four patterns, on the decommented view:
 *   1. helper(...,"EVENT"...) on one line
 *   2. eventType = ... "EVENT"   (audit-logger ternary)
 *   3. an indented `"EVENT" ,`   line (multi-line helper, literal on own line)
 *   4. `eventType: "EVENT"`       (typed repository event construction)
 */
function hasEmission(event: string, text: string): boolean {
  const live = decommented(text);
  const p1 = new RegExp(`${EMITTERS}\\([^)]*"${event}"`);
  const p2 = new RegExp(`eventType = [^;]*"${event}"`);
  const p3 = new RegExp(`^[ \\t]+"${event}"[ \\t]*(/\\*[^*]*\\*/)?[ \\t]*,`, "m");
  const p4 = new RegExp(`eventType:\\s*"${event}"`);
  return p1.test(live) || p2.test(live) || p3.test(live) || p4.test(live);
}

/** Read the emitter taxonomy registry rows from 12-state-machine.md.
 *  awk '/^## Audit event taxonomy/,/^## Audit-first atomicity/' then keep rows
 *  matching /^| `EVENT`/ (.sh:70-71). */
function registryRows(): string[] {
  const lines = readFileSync(DOC, "utf-8").split("\n");
  const start = lines.findIndex((l) => /^## Audit event taxonomy/.test(l));
  const end = lines.findIndex(
    (l, i) => i > start && /^## Audit-first atomicity/.test(l),
  );
  if (start < 0 || end < 0) {
    throw new Error(
      "12-state-machine.md: taxonomy section headers not found (renamed?)",
    );
  }
  return lines
    .slice(start, end + 1)
    .filter((l) => /^\| `[A-Z_]+`/.test(l));
}

/** The event name for a registry row: first backticked [A-Z_]+ token (.sh:97). */
function rowEvent(row: string): string {
  const m = row.match(/`([A-Z_]+)`/);
  return m ? m[1] : "";
}

describe("t48 audit event-emitter drift (migrated from t48-audit-event-emitters.sh, plan 16)", () => {
  // .sh test 1 ---------------------------------------------------------------
  test("state-machine doc exists [.sh test 1]", () => {
    expect(existsSync(DOC)).toBe(true);
  });

  // .sh test 2 ---------------------------------------------------------------
  test("emitter registry row count matches canonical Event Registry [.sh test 2]", () => {
    const rows = registryRows();
    expect(rows.length).toBeGreaterThan(0); // .sh's `[ -z "$REGISTRY" ]` guard
    // The source of truth is the canonical Event Registry; a stale hard-coded count would
    // silently hide drift, so we derive both and compare (.sh:81-85).
    expect(rows.length).toBe(CANONICAL_EVENTS.size);
  });

  // .sh CHECK 1 / test 3 -----------------------------------------------------
  test("forward: every doc (event, emitter) row has a matching call site [.sh test 3]", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const row of registryRows()) {
      const event = rowEvent(row);
      const col2 = row.split("|")[2] ?? "";
      // Reserved rows are declared-but-not-emitted by design (.sh:101-103).
      if (/reserved/i.test(col2)) continue;
      const emitters = (col2.match(/`[a-z/_.-]+\.ts`/g) ?? []).map((s) =>
        s.replace(/`/g, ""),
      );
      if (emitters.length === 0) {
        failures.push(`${event}: no emitter listed`);
        continue;
      }
      for (const rel of emitters) {
        const abs = join(AMADEUS_SRC, rel);
        // ARTIFACT_ATTESTED is documented against the audit CLI gateway. The
        // event name is intentionally absent from that tool's source now that
        // the copied vocabulary table is gone; registry membership is the
        // executable proof that the gateway accepts it.
        if (rel === "tools/amadeus-audit.ts" && CANONICAL_EVENTS.has(event)) {
          checked++;
          continue;
        }
        if (!existsSync(abs)) {
          failures.push(`${event} -> ${rel}: file not found`);
          continue;
        }
        if (hasEmission(event, readFileSync(abs, "utf-8"))) {
          checked++;
        } else {
          failures.push(`${event} in ${rel}: no live emission call site found`);
        }
      }
    }
    expect({ failures, checked }).toEqual({ failures: [], checked });
    expect(checked).toBeGreaterThan(0);
  });

  // .sh CHECK 2 / test 4 -----------------------------------------------------
  test("reverse: every source emission site is in the doc [.sh test 4]", () => {
    // Collect every event NAME emitted across tools/ + hooks/ (decommented).
    const emitted = new Set<string>();
    const p1 = new RegExp(`${EMITTERS}\\([^)]*"[A-Z_]+"`, "g");
    const p2 = /eventType = [^;]*"[A-Z_]+"/g;
    const litRe = /"([A-Z_]+)"/;
    const litReG = /"[A-Z_]+"/g;
    for (const f of ALL_SOURCE_FILES) {
      const live = decommented(readFileSync(f, "utf-8"));
      // Pattern 1: helper(...,"EVENT") on one line.
      for (const hit of live.match(p1) ?? []) {
        for (const lit of hit.match(litReG) ?? []) {
          emitted.add(lit.replace(/"/g, ""));
        }
      }
      // Pattern 2: eventType = "EVENT" / ternary.
      for (const hit of live.match(p2) ?? []) {
        for (const lit of hit.match(litReG) ?? []) {
          emitted.add(lit.replace(/"/g, ""));
        }
      }
      // Pattern 3: multi-line helper — helper-name line opens (no close paren),
      // then the first "EVENT" literal on a following line closes it (.sh:164-175).
      const lines = live.split("\n");
      let inside = false;
      for (const line of lines) {
        if (!inside) {
          if (new RegExp(`${EMITTERS}\\(`).test(line) && !line.includes(")")) {
            inside = true;
          }
          continue;
        }
        const m = line.match(litRe);
        if (m) {
          emitted.add(m[1]);
          inside = false;
        } else if (line.includes(")")) {
          inside = false;
        }
      }
    }
    // Only the FIRST backticked token per registry row is the event name; later
    // columns can mention deleted events in notes (.sh:180-183).
    const registered = new Set(registryRows().map(rowEvent).filter(Boolean));
    const reverseFailures = [...emitted].filter((e) => !registered.has(e));
    expect(reverseFailures).toEqual([]);
    expect(emitted.size).toBeGreaterThan(0);
  });

  // .sh CHECK 3 / test 5 -----------------------------------------------------
  test("tertiary: deleted events have no emission sites and are not in the canonical registry [.sh test 5]", () => {
    const deleted = [
      "JUMP_AUTO_STOPPED",
      "GATE_AUTO_APPROVED",
      "QUESTION_AUTO_ANSWERED",
      "OPTION_AUTO_SELECTED",
      "ACTION_AUTO_CONFIRMED",
      "JUMP_COMPLETED",
      "WORKFLOW_PAUSED",
      "WORKFLOW_RESUMED",
    ];
    const failures: string[] = [];
    for (const event of deleted) {
      // No live emission call site anywhere in source.
      const resurrected = ALL_SOURCE_FILES.some((f) => {
        const live = decommented(readFileSync(f, "utf-8"));
        return new RegExp(`${EMITTERS}\\([^)]*"${event}"`).test(live);
      });
      if (resurrected) {
        failures.push(`${event} has an emission call site (deleted event resurrected)`);
      }
      // Not reinstated into the canonical Event Registry.
      if (CANONICAL_EVENTS.has(event)) {
        failures.push(`${event} reinstated in the canonical Event Registry`);
      }
    }
    expect(failures).toEqual([]);
  });

  // .sh CHECK 4 / tests 6-14 (pairing) ---------------------------------------
  //
  // function_body (.sh:251-261): the body from the named function's signature
  // to the next top-level function / const-arrow declaration. check_pairing
  // (.sh:271-302): every listed event must appear inside a LIVE emission call
  // in that body (helper(...,"EVENT") | eventType="EVENT" | indented "EVENT",).
  function functionBody(name: string, file: string): string | null {
    const lines = readFileSync(file, "utf-8").split("\n");
    const sigFn = new RegExp(`^(export +)?(async +)?function ${name}\\(`);
    const sigConst = new RegExp(`^(export +)?const ${name} = (async +)?\\(`);
    const nextFn = /^(export +)?(async +)?function [A-Za-z]+\(/;
    const nextConst = /^(export +)?const [A-Za-z]+ = (async +)?\(/;
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (sigFn.test(lines[i]) || sigConst.test(lines[i])) {
        start = i + 1;
        break;
      }
    }
    if (start < 0) return null;
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
      if (nextFn.test(lines[i]) || nextConst.test(lines[i])) {
        end = i;
        break;
      }
    }
    return lines.slice(start, end).join("\n");
  }

  function pairingMissing(handler: string, file: string, events: string[]): string[] {
    const body = functionBody(handler, file);
    if (body === null) return [`handler ${handler} not found (renamed/deleted?)`];
    let live = decommented(body);
    // handleApprove keeps its transaction boundary small by delegating through
    // the lock-scoped transaction helper to the paired audit writer. Follow
    // only those two explicit calls, so deleting any link or event still makes
    // this detector fail closed.
    if (handler === "handleApprove" && /\bapproveUnderLock\(/.test(live)) {
      const transaction = functionBody("approveUnderLock", file);
      if (transaction !== null) live += `\n${decommented(transaction)}`;
    }
    if (handler === "handleApprove" && /\bemitApprovalAudit\(/.test(live)) {
      const auditWriter = functionBody("emitApprovalAudit", file);
      if (auditWriter !== null) live += `\n${decommented(auditWriter)}`;
    }
    const targetedGateHandlers: Readonly<Record<string, string | undefined>> = {
      handleGateStart: "gateStartForTarget",
      handleReject: "rejectForTarget",
      handleRevise: "reviseForTarget",
    };
    const targetedGateHandler = targetedGateHandlers[handler];
    if (
      targetedGateHandler !== undefined &&
      new RegExp(`\\b${targetedGateHandler}\\b`).test(live)
    ) {
      const transaction = functionBody(targetedGateHandler, file);
      if (transaction !== null) live += `\n${decommented(transaction)}`;
    }
    if (
      handler === "handleCompleteWorkflow" &&
      /\bcompleteWorkflowForTarget\b/.test(live)
    ) {
      const transaction = functionBody("completeWorkflowForTarget", file);
      if (transaction !== null) live += `\n${decommented(transaction)}`;
    }
    if (
      handler === "handleCompleteWorkflow" &&
      /\bemitWorkflowCompletionAuditRows\(/.test(live)
    ) {
      const auditWriter = functionBody("emitWorkflowCompletionAuditRows", file);
      if (auditWriter !== null) live += `\n${decommented(auditWriter)}`;
    }
    const missing: string[] = [];
    for (const event of events) {
      // .sh allows the event literal anywhere inside the emission call (multi-
      // line tolerant: `([^)]|$)*`), or the ternary, or an indented `"E",`.
      const inCall = new RegExp(`${EMITTERS}\\(([^)]|\\n)*"${event}"`).test(live);
      const inTernary = new RegExp(`eventType = [^;]*"${event}"`).test(live);
      const onOwnLine = new RegExp(`^[ \\t]+"${event}"[ \\t]*,`, "m").test(live);
      if (!(inCall || inTernary || onOwnLine)) missing.push(event);
    }
    return missing;
  }

  const PAIRINGS: Array<[string, string, string[]]> = [
    ["handleApprove", STATE_TS, ["GATE_APPROVED", "STAGE_COMPLETED"]], // test 6
    ["handleReject", STATE_TS, ["GATE_REJECTED", "STAGE_REVISING"]], // test 7
    ["handleGateStart", STATE_TS, ["STAGE_AWAITING_APPROVAL"]], // test 8
    ["handleRevise", STATE_TS, ["STAGE_AWAITING_APPROVAL"]], // test 9
    ["handleSkip", STATE_TS, ["STAGE_SKIPPED"]], // test 10
    ["handleCompleteWorkflow", STATE_TS, ["PHASE_COMPLETED", "PHASE_VERIFIED", "WORKFLOW_COMPLETED"]], // test 11
    ["handleAdvance", STATE_TS, ["STAGE_STARTED"]], // test 12
    ["handleReuseArtifact", STATE_TS, ["ARTIFACT_REUSED"]], // test 13
    // P4: the birth handler was renamed handleInit -> handleIntentBirth (the
    // user-facing --init is retired; the engine auto-births). The three birth
    // events still pair off it (WORKFLOW_STARTED + the init PHASE_STARTED + the
    // workspace-scaffold STAGE_STARTED), now into the born intent's record.
    ["handleIntentBirth", UTIL_TS, ["WORKFLOW_STARTED", "PHASE_STARTED", "STAGE_STARTED"]], // test 14
  ];

  for (const [handler, file, events] of PAIRINGS) {
    test(`pairing: ${handler} emits ${events.join(" + ")} [.sh pairing]`, () => {
      expect(pairingMissing(handler, file, events)).toEqual([]);
    });
  }

  // .sh CHECK 5 / test 15 ----------------------------------------------------
  test("md-md: audit-format.md and 12-state-machine.md agree on the event set [.sh test 15]", () => {
    // audit-format.md Event Registry: backticked [A-Z_]+ between
    // '## Event Registry' and '## Hook-Generated' (.sh:321-322).
    const af = readFileSync(AUDIT_FORMAT, "utf-8").split("\n");
    const afStart = af.findIndex((l) => /## Event Registry/.test(l));
    const afEnd = af.findIndex((l, i) => i > afStart && /## Hook-Generated/.test(l));
    const afEvents = new Set(
      af
        .slice(afStart, afEnd)
        .join("\n")
        .match(/`[A-Z_]+`/g)
        ?.map((s) => s.replace(/`/g, "")) ?? [],
    );
    const smEvents = new Set(registryRows().map(rowEvent).filter(Boolean));

    const onlyInAf = [...afEvents].filter((e) => !smEvents.has(e)).sort();
    const onlyInSm = [...smEvents].filter((e) => !afEvents.has(e)).sort();
    expect({ onlyInAf, onlyInSm }).toEqual({ onlyInAf: [], onlyInSm: [] });
    expect(afEvents.size).toBeGreaterThan(0);
  });

  // .sh bonus / test 16 ------------------------------------------------------
  test("no prose amadeus-audit.ts append calls in skills/amadeus/ [.sh test 16]", () => {
    // The doc forbids `bun .claude/tools/amadeus-audit.ts append <EVENT>` as a
    // prose instruction; confirm none remain (with the .sh's carve-outs for the
    // recovery-workflow note / never-hand-write warning / cross-reference).
    const appendRe = /bun .*amadeus-audit\.ts append [A-Z_]+/;
    const carveOut = /(reserved for the future recovery workflow|never hand-write|see §4|Canonical state transitions)/;
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(p);
        } else if (entry.isFile()) {
          const lines = readFileSync(p, "utf-8").split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (appendRe.test(lines[i]) && !carveOut.test(lines[i])) {
              offenders.push(`${p}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        }
      }
    };
    walk(SKILLS_DIR);
    expect(offenders).toEqual([]);
  });
});
