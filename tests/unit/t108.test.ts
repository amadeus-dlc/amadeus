// covers: function:setCheckbox, function:validateStageState, function:requireChanged
//   function:parseScopedCheckboxes, function:stageLineKey, function:StageStateValidationError
//   function:StateMutationTargetError, function:StateMutationInvariantError
// size: small
//
// t108 — validated state-line mutations in amadeus-lib.ts.
// Mechanism: none (pure string transform, zero I/O, zero LLM, zero tokens).
// Technique: metamorphic no-clobber-neighbours checks plus typed failure cases.
//
// The public mutation boundary accepts only an opaque ValidatedStageState.
// A unique canonical row yields `changed`, including idempotent same-value
// writes. An absent row yields `not-found`; malformed or duplicate rows fail
// validation before the setter can run. requireChanged is the caller boundary
// that promotes `not-found` to a typed loud failure.
//
// Test-design note (house style, per tests/unit/t69-worktree-path.sh and
// t106.none.test.ts): assert the OBSERVABLE CONTRACT, never re-implement the
// regex. The load-bearing assertion is metamorphic: build a multi-checkbox
// block, flip exactly one slug, and prove every OTHER line is byte-identical
// to the input. A test that merely re-runs replace() would only catch
// deletion; the line-by-line neighbour diff catches a regex that over-matches
// (drops the slug anchor, becomes global, or swallows adjacent lines).

import { describe, expect, test } from "bun:test";
import {
  CHECKBOX_MAP,
  type CheckboxState,
  parseScopedCheckboxes,
  requireChanged,
  setCheckbox,
  setStageSuffix,
  stageLineKey,
  StageStateValidationError,
  StateMutationInvariantError,
  StateMutationTargetError,
  type ValidatedStageState,
  validateStageState,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// U+2014 EM DASH — the divider setCheckbox's regex requires between slug and
// suffix. Spelled out as an escape so the literal can't be silently mangled
// by an editor that "helpfully" normalises dashes.
const EM = "—";

// A realistic multi-checkbox block. Mixed starting states across the six
// markers, distinct slugs, and varied suffixes (including one with a colon
// and one with regex-metachar-laden text) so a flip has plenty of neighbours
// that MUST stay byte-identical.
function buildBlock(): string {
  const rows = [
    `- [ ] ideation ${EM} EXECUTE`,
    `- [-] inception ${EM} EXECUTE`,
    `- [x] construction ${EM} SKIP: already shipped`,
    `- [S] operation ${EM} SKIP: out of scope (v2.0+)`,
    `- [?] review ${EM} EXECUTE`,
    `- [R] rework ${EM} EXECUTE`,
  ].join("\n");
  return [
    "# AI-DLC State Tracking",
    "",
    "## Stage Progress",
    "<!-- Checkbox states: canonical -->",
    "",
    "### IDEATION PHASE",
    rows,
    "",
    "## Current Status",
    "- **Status**: Running",
    "",
  ].join("\n");
}

function mutateCheckbox(
  content: string,
  slug: string,
  state: CheckboxState,
): string {
  return requireChanged(
    setCheckbox(validateStageState(content), slug, state),
    `test:${slug}`,
  );
}

const ALL_SLUGS = [
  "ideation",
  "inception",
  "construction",
  "operation",
  "review",
  "rework",
] as const;

// Split into lines and return only the lines whose slug is NOT `target`.
// Used to assert neighbours are untouched.
function neighbourLines(content: string, target: string): string[] {
  return content.split("\n").filter((line) => {
    // A checkbox line for slug S looks like: "- [m] S — ...". Extract the slug
    // token (3rd whitespace-delimited field) to decide membership without
    // re-implementing setCheckbox's regex.
    const m = /^- \[.\] (\S+) /.exec(line);
    return m ? m[1] !== target : true;
  });
}

// The line for a given slug, or undefined if absent.
function lineForSlug(content: string, slug: string): string | undefined {
  return content
    .split("\n")
    .find((line) => new RegExp(`^- \\[.\\] ${slug} `).test(line));
}

describe("setCheckbox() — target line flips to the new state", () => {
  test("yields the exact bracketed marker for the target slug", () => {
    // Pin the observable literal. CHECKBOX_MAP.completed is "[x]"; after the
    // flip the target line must START with "- [x] inception ". This catches a
    // marker map drift OR a replacement that dropped/duplicated the brackets.
    const out = mutateCheckbox(buildBlock(), "inception", "completed");
    expect(lineForSlug(out, "inception")).toBe(`- [x] inception ${EM} EXECUTE`);
  });

  test("flips through every state correctly, preserving the suffix", () => {
    // For each target state, the marker must equal CHECKBOX_MAP[state] and the
    // " inception — EXECUTE" tail must survive verbatim. Drives all six
    // markers so a single corrupted CHECKBOX_MAP entry is caught.
    const states: CheckboxState[] = [
      "pending",
      "in-progress",
      "awaiting-approval",
      "revising",
      "completed",
      "skipped",
    ];
    for (const state of states) {
      const out = mutateCheckbox(buildBlock(), "inception", state);
      const marker = CHECKBOX_MAP[state]; // bracketed, e.g. "[?]"
      expect(lineForSlug(out, "inception")).toBe(
        `- ${marker} inception ${EM} EXECUTE`
      );
    }
  });

  test("flipping a slug that already holds the target state is a clean no-op on that line", () => {
    // "construction" starts at "[x]" (completed). Re-setting it to completed
    // must leave the line identical — group-1/group-2 are preserved and the
    // marker is rewritten to the same value.
    const block = buildBlock();
    const result = setCheckbox(validateStageState(block), "construction", "completed");
    expect(result).toEqual({ kind: "changed", content: block });
    const out = requireChanged(result, "test:idempotent");
    expect(lineForSlug(out, "construction")).toBe(
      `- [x] construction ${EM} SKIP: already shipped`
    );
  });
});

describe("setCheckbox() — metamorphic no-clobber-neighbours invariant", () => {
  test("every non-target line is byte-identical after a single flip", () => {
    // THE load-bearing assertion. For each slug, flip it and assert that the
    // multiset of all OTHER lines is unchanged byte-for-byte. A regex that
    // over-matches (lost the per-slug anchor, went global, or consumed an
    // adjacent line) would mutate a neighbour and fail here.
    const block = buildBlock();
    for (const target of ALL_SLUGS) {
      const out = mutateCheckbox(block, target, "skipped");
      const before = neighbourLines(block, target);
      const after = neighbourLines(out, target);
      expect(after).toEqual(before);
    }
  });

  test("only the target line changes; the diff against the input is exactly one line", () => {
    // Complementary framing of the invariant at the whole-string level.
    // Flipping "review" ("[?]" -> "[x]") must change EXACTLY one line. Counts
    // the per-line differences; any count other than 1 means the transform
    // either touched a neighbour (>1) or failed to match its target (0).
    const block = buildBlock();
    const out = mutateCheckbox(block, "review", "completed");

    const beforeLines = block.split("\n");
    const afterLines = out.split("\n");
    expect(afterLines.length).toBe(beforeLines.length); // no inserted/removed lines

    let changed = 0;
    let changedIndex = -1;
    for (let i = 0; i < beforeLines.length; i++) {
      if (beforeLines[i] !== afterLines[i]) {
        changed++;
        changedIndex = i;
      }
    }
    expect(changed).toBe(1);
    // And the one changed line is precisely the "review" line, now completed.
    expect(afterLines[changedIndex]).toBe(`- [x] review ${EM} EXECUTE`);
  });

  test("does not touch a slug that is a substring-prefix of the target", () => {
    // The slug is anchored by the trailing " <slug> —". Two slugs where one is
    // a prefix of the other must not cross-contaminate: flipping "build" must
    // leave "build-extra" alone, because "build" is not followed by " —" on
    // the "build-extra" line.
    const block = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      [
      `- [ ] build ${EM} EXECUTE`,
      `- [ ] build-extra ${EM} EXECUTE`,
      ].join("\n"),
    );
    const out = mutateCheckbox(block, "build", "completed");
    expect(lineForSlug(out, "build")).toBe(`- [x] build ${EM} EXECUTE`);
    // The neighbour, whose slug merely shares the "build" prefix, is untouched.
    expect(lineForSlug(out, "build-extra")).toBe(`- [ ] build-extra ${EM} EXECUTE`);
  });

  test("matches a regex-metachar slug by exact map key", () => {
    // A slug containing "." is looked up as a literal map key. The same-shape
    // neighbour that differs only by punctuation must remain untouched.
    const block = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      [
      `- [ ] v0.4.0 ${EM} EXECUTE`,
      `- [ ] v0X4X0 ${EM} EXECUTE`,
      ].join("\n"),
    );
    const out = mutateCheckbox(block, "v0.4.0", "completed");
    expect(lineForSlug(out, "v0.4.0")).toBe(`- [x] v0.4.0 ${EM} EXECUTE`);
    // The wildcard-collision candidate must remain pending and byte-identical.
    expect(lineForSlug(out, "v0X4X0")).toBe(`- [ ] v0X4X0 ${EM} EXECUTE`);
  });
});

describe("setCheckbox() — validation and loud failure", () => {
  test("returns a typed not-found result with byte-identical input", () => {
    const block = buildBlock();
    const result = setCheckbox(validateStageState(block), "nonexistent-stage", "completed");
    expect(result).toEqual({ kind: "not-found", target: "nonexistent-stage" });
    expect(() => requireChanged(result, "test:missing")).toThrow(StateMutationTargetError);
  });

  test("rejects a malformed canonical line before entering the setter", () => {
    const malformed = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      "- [ ] ideation - EXECUTE",
    );
    expect(() => validateStageState(malformed)).toThrow(StageStateValidationError);
  });

  test("rejects duplicate canonical targets before mutation", () => {
    const duplicate = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      `- [ ] ideation ${EM} EXECUTE\n- [x] ideation ${EM} SKIP`,
    );
    expect(() => validateStageState(duplicate)).toThrow(/duplicate-target/);
  });

  test("keeps per-unit targets distinct and mutates only the selected unit", () => {
    const perUnit = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      [
        "Per unit: cart",
        `- [ ] ideation ${EM} EXECUTE`,
        "Per unit: checkout",
        `- [-] ideation ${EM} EXECUTE`,
      ].join("\n"),
    );
    expect(() => setCheckbox(validateStageState(perUnit), "ideation", "completed"))
      .toThrow(/duplicate-target/);

    const out = requireChanged(
      setCheckbox(validateStageState(perUnit, { unit: "checkout" }), "ideation", "completed"),
      "test:per-unit",
    );
    expect(out).toContain(`Per unit: cart\n- [ ] ideation ${EM} EXECUTE`);
    expect(out).toContain(`Per unit: checkout\n- [x] ideation ${EM} EXECUTE`);

    expect(parseScopedCheckboxes(perUnit).filter((line) => line.slug === "ideation"))
      .toEqual([
        { slug: "ideation", state: "pending", suffix: "EXECUTE", unit: "cart" },
        { slug: "ideation", state: "in-progress", suffix: "EXECUTE", unit: "checkout" },
      ]);
  });

  test("builds distinct canonical keys for global and per-unit stage rows", () => {
    expect(stageLineKey("ideation")).toBe("\0ideation");
    expect(stageLineKey("ideation", "cart")).toBe("cart\0ideation");
  });

  test("rejects a forged validated state as a typed invariant failure", () => {
    const forged = {} as ValidatedStageState;
    expect(() => setCheckbox(forged, "ideation", "completed"))
      .toThrow(StateMutationInvariantError);
  });

  test("malformed-line diagnostics do not echo state content", () => {
    const secret = "secret-suffix";
    const malformed = buildBlock().replace(
      `- [ ] ideation ${EM} EXECUTE`,
      `- [ ] ideation - ${secret}`,
    );
    try {
      validateStageState(malformed);
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(StageStateValidationError);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  test("rejects a missing Stage Progress section", () => {
    expect(() => validateStageState("")).toThrow(/section-unrecognized/);
  });
});

describe("setStageSuffix()", () => {
  test("removes a stale SKIP reason when a stage is restored to EXECUTE", () => {
    const result = setStageSuffix(validateStageState(buildBlock()), "construction", "EXECUTE");
    const out = requireChanged(result, "test:stage-suffix");

    expect(lineForSlug(out, "construction")).toBe(`- [x] construction ${EM} EXECUTE`);
  });
});
