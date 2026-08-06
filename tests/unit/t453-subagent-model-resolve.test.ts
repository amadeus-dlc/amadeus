// covers: function:resolveEffectiveModel
//
// t453 — Issue #2279 (U2 model-attribution). The effective-model resolver
// (C-3) records WHICH model actually served a subagent dispatch, and WHERE
// that answer came from, so the audit row can be tallied by model afterwards
// (FR-3).
//
// The resolution order is load-bearing (ADR-3 — observation beats request
// beats declaration):
//   1. harness  — the payload's `model`, the harness's own report of what ran
//      (Codex supplies it; fixture 0.137.0 captured it verbatim);
//   2. request  — an explicit `tool_input.model`, a REQUEST, not an outcome;
//   3. pin      — the resolved persona's frontmatter `model:` declaration.
// First non-empty wins, and the winning stage is carried as `source` so the
// order can change later without making past rows uninterpretable.
//
// Absence is honest (ADR-5): three empty inputs yield { kind: "unresolved" }
// and the callers write NO attributes — no fabricated "unknown" placeholder.
//
// MECHANISM: in-process seam — resolveEffectiveModel is a pure function, so
// its branches are measured by bun --coverage. The FS-touching half of U2
// (resolvePersonaPin) lives in t454's integration layer
// (cid:code-generation:fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { resolveEffectiveModel } from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";

describe("t453 resolveEffectiveModel (#2279, AC-4)", () => {
  // ---- the four resolution cases (ADR-3) -----------------------------------

  test("harness supply alone resolves with source 'harness'", () => {
    expect(
      resolveEffectiveModel({ harnessModel: "openai.gpt-5.5", requestedModel: undefined, personaPin: undefined }),
    ).toEqual({ kind: "resolved", model: "openai.gpt-5.5", source: "harness" });
  });

  test("an explicit request alone resolves with source 'request'", () => {
    expect(
      resolveEffectiveModel({ harnessModel: undefined, requestedModel: "claude-opus-4-7", personaPin: undefined }),
    ).toEqual({ kind: "resolved", model: "claude-opus-4-7", source: "request" });
  });

  test("a persona pin alone resolves with source 'pin'", () => {
    expect(resolveEffectiveModel({ harnessModel: undefined, requestedModel: undefined, personaPin: "opus" })).toEqual(
      { kind: "resolved", model: "opus", source: "pin" },
    );
  });

  test("all three inputs absent is unresolved — no fabricated value (ADR-5)", () => {
    expect(
      resolveEffectiveModel({ harnessModel: undefined, requestedModel: undefined, personaPin: undefined }),
    ).toEqual({ kind: "unresolved" });
  });

  // ---- priority: observation > request > declaration ------------------------

  test("harness beats request when both are present", () => {
    // The harness reports what RAN; the request only reports what was ASKED.
    // Auditing the request here would fix the wrong model into the record
    // whenever a harness substitutes (ADR-3 rationale).
    expect(
      resolveEffectiveModel({ harnessModel: "openai.gpt-5.5", requestedModel: "gpt-5.2", personaPin: undefined }),
    ).toEqual({ kind: "resolved", model: "openai.gpt-5.5", source: "harness" });
  });

  test("request beats pin when both are present", () => {
    // The approved ordering (explicit > pin) survives unchanged where no
    // harness value exists — Claude Code's live shape (ADR-3 consequences).
    expect(
      resolveEffectiveModel({ harnessModel: undefined, requestedModel: "claude-opus-4-7", personaPin: "sonnet" }),
    ).toEqual({ kind: "resolved", model: "claude-opus-4-7", source: "request" });
  });

  test("harness beats the pin too — first non-empty of the three wins", () => {
    expect(
      resolveEffectiveModel({ harnessModel: "openai.gpt-5.5", requestedModel: "gpt-5.2", personaPin: "opus" }),
    ).toEqual({ kind: "resolved", model: "openai.gpt-5.5", source: "harness" });
  });

  // ---- trim rule (domain-entities: blank means absent) ---------------------

  test("a whitespace-only value is the same as absent", () => {
    // Same convention as normalizeAgentType: blank is not a value. A blank
    // harness value must fall THROUGH to the request, not win as "".
    expect(
      resolveEffectiveModel({ harnessModel: "   ", requestedModel: "claude-opus-4-7", personaPin: undefined }),
    ).toEqual({ kind: "resolved", model: "claude-opus-4-7", source: "request" });
  });

  test("three whitespace-only inputs are unresolved", () => {
    expect(resolveEffectiveModel({ harnessModel: " ", requestedModel: "\t", personaPin: "  " })).toEqual({
      kind: "unresolved",
    });
  });

  test("a present value is kept verbatim — padding is not trimmed away", () => {
    // normalizeAgentType's convention: trim decides PRESENCE, the recorded
    // value stays as supplied (the audit row is a record, not a cleanup).
    expect(
      resolveEffectiveModel({ harnessModel: undefined, requestedModel: " opus ", personaPin: undefined }),
    ).toEqual({ kind: "resolved", model: " opus ", source: "request" });
  });
});
