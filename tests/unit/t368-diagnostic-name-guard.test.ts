// covers: otel:event-registry-drift
// size: small
//
// U10 (diagnostic-logs) BR-6: the classification boundary is a naming boundary
// too. A diagnostic that borrows a canonical Registry name makes the canonical
// and diagnostic paths indistinguishable to anyone reading the stores, so the
// misuse is rejected by a static guard — the runtime diagnostic path must stay
// fail-open and can never throw at its caller (BR-2).
//
// Falling-test evidence: the fixtures below include a call site naming a
// canonical OTel event and one naming its v1 audit event type; both must be
// reported, and a vocabulary-free source must report nothing (the guard is not
// vacuous, and it does not flag every emitDiagnostic call it sees).

import { describe, expect, test } from "bun:test";
import { findDiagnosticNameMisuse } from "../../dist/claude/.claude/otel/event-registry-drift.ts";

// Built at runtime so this file's own source carries no literal call site that
// a corpus sweep over the shipped tree would have to whitelist.
const call = (name: string, quote = '"') => `emitDiagnostic(${quote}${name}${quote}, { Note: "n" });`;

describe("findDiagnosticNameMisuse — canonical names are off limits for diagnostics", () => {
  test("a free-form diagnostic name is clean", () => {
    const findings = findDiagnosticNameMisuse([
      { path: "a.ts", source: call("subprocess retry") },
      { path: "b.ts", source: `${call("gate wait timed out", "'")}\n${call("cache miss", "`")}` },
    ]);
    expect(findings).toEqual([]);
  });

  test("a canonical OTel event name is reported with its call site", () => {
    const findings = findDiagnosticNameMisuse([{ path: "otel/x.ts", source: call("amadeus.workflow.started") }]);
    expect(findings.length).toBe(1);
    expect(findings[0]).toContain("otel/x.ts");
    expect(findings[0]).toContain("amadeus.workflow.started");
  });

  test("a canonical v1 audit event type is reported too", () => {
    const findings = findDiagnosticNameMisuse([{ path: "hooks/y.ts", source: call("WORKFLOW_STARTED", "'") }]);
    expect(findings.length).toBe(1);
    expect(findings[0]).toContain("WORKFLOW_STARTED");
  });

  test("every violating call site in one file is reported, not just the first", () => {
    const source = [call("amadeus.workflow.started"), call("free form"), call("amadeus.workflow.completed")].join("\n");
    expect(findDiagnosticNameMisuse([{ path: "z.ts", source }]).length).toBe(2);
  });

  test("a source with no diagnostic call sites at all is clean (no false positives)", () => {
    expect(findDiagnosticNameMisuse([{ path: "q.ts", source: 'emitEvent("amadeus.workflow.started", {});' }])).toEqual(
      []
    );
  });
});
