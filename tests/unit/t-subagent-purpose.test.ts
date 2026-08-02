// covers: function:subagentPurposeLine function:subagentStartFields
// size: small
//
// U4 (subagent-started) — the Purpose field's derivation from a dispatch prompt.
//
// A dispatch prompt is unbounded operator text: it can be thousands of lines,
// carry secrets further down, and arrive with its newlines still escaped when a
// harness hands it through an undecoded JSON string. `Purpose` is a LABEL, not
// a transcript, so the derivation is deliberately lossy — first line only,
// bounded length — and the escape normalization is what makes "first line"
// mean the same thing on every harness.

import { describe, expect, test } from "bun:test";
import { getEventDef } from "../../packages/framework/core/otel/event-registry.ts";
import { subagentPurposeLine, subagentStartFields } from "../../packages/framework/core/tools/amadeus-lib.ts";

describe("subagentPurposeLine (U4, FR-SUB)", () => {
  test("keeps only the first line of a multi-line prompt", () => {
    expect(subagentPurposeLine("Implement the thing\nDetails follow\nmore")).toBe("Implement the thing");
  });

  test("treats an ESCAPED newline as a line break, not as text", () => {
    // The whole point: without this, an undecoded JSON prompt is one "line"
    // and the 200-char window would carry the rest of the prompt into the row.
    expect(subagentPurposeLine("Implement the thing\\nSECRET=hunter2")).toBe("Implement the thing");
    expect(subagentPurposeLine("First\\r\\nSecond")).toBe("First");
  });

  test("truncates to 200 characters", () => {
    const line = subagentPurposeLine("x".repeat(500));
    expect(line.length).toBe(200);
  });

  test("truncation is applied after trimming, so padding cannot eat the window", () => {
    expect(subagentPurposeLine(`   ${"y".repeat(300)}   `).length).toBe(200);
  });

  test("trims surrounding whitespace and CR", () => {
    expect(subagentPurposeLine("  spaced  \r\nnext")).toBe("spaced");
  });

  test("strips control characters that would break the record frame", () => {
    expect(subagentPurposeLine("be\u0000fo\u0007re")).toBe("before");
    // Tab is not a frame hazard and stays: the record is line-oriented.
    expect(subagentPurposeLine("tab\tsep")).toBe("tab\tsep");
  });

  test("a non-string or absent prompt yields the empty string (caller omits the key)", () => {
    expect(subagentPurposeLine(undefined)).toBe("");
    expect(subagentPurposeLine(null)).toBe("");
    expect(subagentPurposeLine(42)).toBe("");
    expect(subagentPurposeLine({ text: "hi" })).toBe("");
    expect(subagentPurposeLine("")).toBe("");
    expect(subagentPurposeLine("   \n  ")).toBe("");
  });
});

// The field set the started hook hands to the registry. Kept out of the hook
// file itself: a hook is spawn-only, so logic that lives there is invisible to
// in-process coverage and cannot be tested without a subprocess.
describe("subagentStartFields (U4, FR-SUB)", () => {
  test("PreToolUse{Task}: agent type and purpose come out of tool_input", () => {
    expect(
      subagentStartFields({
        hook_event_name: "PreToolUse",
        tool_name: "Task",
        tool_input: { subagent_type: "developer", prompt: "Do the thing\nrest" },
      }),
    ).toEqual({ "Agent Type": "developer", Purpose: "Do the thing" });
  });

  test("a NON-dispatch tool yields null so the hook stays silent", () => {
    // PreToolUse fires for every tool. The shipped matcher is anchored
    // (^Task$) but the hook must not depend on that: an unanchored "Task"
    // matches TaskUpdate/TaskCreate too, and without this guard every
    // todo-list write would append a spurious SUBAGENT_STARTED.
    expect(subagentStartFields({ hook_event_name: "PreToolUse", tool_name: "TaskUpdate", tool_input: {} })).toBeNull();
    expect(subagentStartFields({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: {} })).toBeNull();
  });

  test("a start seam with no tool envelope (kimi SubagentStart) still resolves", () => {
    expect(subagentStartFields({ hook_event_name: "SubagentStart", agent_type: "explore", prompt: "Look around" })).toEqual({
      "Agent Type": "explore",
      Purpose: "Look around",
    });
  });

  test("a missing agent type falls back to the shared unknown label", () => {
    expect(subagentStartFields({ tool_name: "Task", tool_input: { prompt: "x" } })).toEqual({
      "Agent Type": "unknown",
      Purpose: "x",
    });
  });

  test("Agent ID is included only when present, and Purpose only when non-empty", () => {
    expect(subagentStartFields({ tool_name: "Task", tool_input: { subagent_type: "a" } })).toEqual({ "Agent Type": "a" });
    expect(subagentStartFields({ tool_name: "Task", agent_id: "id-9", tool_input: { subagent_type: "a" } })).toEqual({
      "Agent Type": "a",
      "Agent ID": "id-9",
    });
    expect(subagentStartFields({ tool_name: "Task", agent_id: "", tool_input: { subagent_type: "a", prompt: "   " } })).toEqual({
      "Agent Type": "a",
    });
  });

  test("the emitted keys are a subset of what the registry admits", () => {
    // Redaction is default-deny; an unlisted key would vanish silently. The
    // admitted set is READ OFF the registry rather than restated here: a
    // hand-copied literal passes just as happily after the registry drops a key
    // it names, which is the drift this assertion exists to catch.
    const def = getEventDef("amadeus.subagent.started");
    const admitted = new Set([...def.requiredAttributes, ...def.optionalAttributes]);
    const fields = subagentStartFields({ tool_name: "Task", agent_id: "i", tool_input: { subagent_type: "t", prompt: "p" } });
    expect(Object.keys(fields ?? {}).length).toBeGreaterThan(0);
    for (const key of Object.keys(fields ?? {})) expect(admitted.has(key)).toBe(true);
  });
});
