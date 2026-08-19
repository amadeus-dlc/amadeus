// size: small
//
// t450 — C13 `--autonomy` application handler (#2253, Unit launch-autonomy-flag).
//
// The launch flag adds a NEW ENTRANCE to the autonomy authorization boundary, so
// every judgment below exists to keep that boundary exactly as strong as it was
// before the entrance existed:
//
//   1  value-less flag             → loud (FR-CLI-2(3))
//   2  value outside the 3 modes    → loud (FR-CLI-2(3))
//   0  no active intent            → depends on where THIS invocation is headed
//                                     (#2378 FR-1a/FR-1c, BR-U2-1): a call that
//                                     reaches intent birth CARRIES the mode onto
//                                     the birth command; one that falls into the
//                                     scope-confirm ask is refused with guidance
//                                     rather than silently dropped; anything else
//                                     keeps the original "declare after birth"
//                                     refusal
//   3  projection unreadable        → loud, FAIL-CLOSED (ADR-12): neither the
//                                     declaration state nor the grant state is
//                                     known, so nothing may be written
//   4  not yet declared             → fall through to the grant judgments
//   5  already declared             → same value no-ops (no extra audit event),
//                                     different value is loud (a launch flag
//                                     never silently overwrites a human's mode)
//   6  `none` over an active grant  → loud (grant revocation is never a side
//                                     effect of a launch flag)
//   7  `full` without a grant       → loud + issuance preview (FR-CLI-4)
//   8  otherwise                    → delegate to the ONE existing write path,
//                                     relaying its PROVENANCE_REQUIRED (FR-CLI-5)
//
// The handler is driven in-process through its port parameter, so this file
// touches no filesystem and stays a small test (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import {
  applyLaunchAutonomyDeclaration,
  type LaunchAutonomyContext,
  type LaunchAutonomyPorts,
  type LaunchAutonomyReach,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { READ_ONLY_FLAGS } from "../../packages/framework/core/tools/amadeus-lib.ts";

const PD = "/tmp/t450-project";
const STATE = "# State\n\n## Current Status\n- **Intent Autonomy Mode**: none\n";

function context(overrides: Partial<Extract<LaunchAutonomyContext, { kind: "readable" }>> = {}): LaunchAutonomyContext {
  return { kind: "readable", mode: "none", declared: false, grant: "absent", ...overrides };
}

type ApplyResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// A recorder for the three ports plus the stderr the handler writes directly.
// `reads` proves that judgments 1-2 short-circuit BEFORE any projection read.
function recorder(ctx: LaunchAutonomyContext, applyResult: ApplyResult = { ok: true }) {
  const applied: { mode: string; stateContent: string }[] = [];
  const counts = { reads: 0, previews: 0 };
  let stderr = "";
  const ports: LaunchAutonomyPorts = {
    readContext: () => {
      counts.reads++;
      return ctx;
    },
    applyMode: (input) => {
      applied.push({ mode: input.mode, stateContent: input.stateContent });
      return applyResult;
    },
    describeGrantPreview: () => {
      counts.previews++;
      return "grant-preview-payload";
    },
  };
  // Run the handler with console.error captured, so the judgment-7 preview is
  // observable without reaching for a real stream.
  const drive = (
    autonomy: string | undefined,
    options: {
      readonly stateContent?: string | null;
      readonly missingValue?: boolean;
      readonly reach?: LaunchAutonomyReach;
    } = {},
  ) => {
    const flags = {
      ...(autonomy === undefined ? {} : { autonomy }),
      ...(options.missingValue ? { autonomyMissingValue: true } : {}),
    };
    const original = console.error;
    console.error = (...args: unknown[]) => {
      stderr += `${args.map((a) => String(a)).join(" ")}\n`;
    };
    try {
      return applyLaunchAutonomyDeclaration(
        PD,
        options.stateContent === undefined ? STATE : options.stateContent,
        flags,
        options.reach ?? "none",
        ports,
      );
    } finally {
      console.error = original;
    }
  };
  return { applied, counts, ports, drive, stderrText: () => stderr };
}

describe("t450 --autonomy application handler", () => {
  // ── Judgment 0 (revised for #2378 FR-1c) ────────────────────────────────
  //
  // The pre-#2378 case asserted a single answer for "no active intent". It is
  // split here because the answer now depends on where the SAME invocation is
  // headed: the flag is only undeclarable when nothing in this call will create
  // the intent it would declare against.
  test("H0a: no active intent and no birth ahead is loud", () => {
    const rec = recorder(context());
    const out = rec.drive("semi", { stateContent: null, reach: "none" });
    expect(out.kind).toBe("error");
    expect(out.kind === "error" && out.message).toContain("--autonomy needs an active intent");
    expect(rec.applied).toHaveLength(0);
  });

  test("H0b: an invocation that reaches birth CARRIES the mode instead of refusing", () => {
    const rec = recorder(context());
    const out = rec.drive("semi", { stateContent: null, reach: "birth" });
    expect(out).toEqual({ kind: "carry", mode: "semi" });
    // Carrying is not applying: the write happens inside intent-birth, against
    // the intent this call is about to create (BR-U2-6).
    expect(rec.applied).toHaveLength(0);
    expect(rec.counts.reads).toBe(0);
  });

  test("H0b2: `full` is carried too — intent-birth owns the ceremony (BR-U2-3)", () => {
    const rec = recorder(context());
    expect(rec.drive("full", { stateContent: null, reach: "birth" })).toEqual({
      kind: "carry",
      mode: "full",
    });
    expect(rec.counts.previews).toBe(0);
  });

  test("H0b3: birth outranks a live state file — --new-intent declares for the NEW intent", () => {
    // `--new-intent` carries a state file for the intent already in flight. The
    // declaration belongs to the one about to be born, so the ladder must not
    // read the active projection and apply against it.
    const rec = recorder(context({ mode: "semi", declared: true }));
    expect(rec.drive("none", { reach: "birth" })).toEqual({ kind: "carry", mode: "none" });
    expect(rec.applied).toHaveLength(0);
    expect(rec.counts.reads).toBe(0);
  });

  test("H0c: an invocation that falls into the scope-confirm ask is refused, never dropped", () => {
    const rec = recorder(context());
    const out = rec.drive("semi", { stateContent: null, reach: "ask" });
    expect(out.kind).toBe("error");
    // BR-U2-1: the refusal names the two ways to declare, so the mode is not
    // silently lost behind the ask.
    expect(out.kind === "error" && out.message).toContain("--scope");
    expect(rec.applied).toHaveLength(0);
  });

  // ── Judgment 1 ──────────────────────────────────────────────────────────
  test("H6a: a value-less --autonomy is loud", () => {
    const rec = recorder(context());
    const out = rec.drive(undefined, { missingValue: true });
    expect(out).toEqual({
      kind: "error",
      message: "--autonomy requires a value: none, semi, or full.",
    });
    expect(rec.applied).toHaveLength(0);
  });

  // ── Judgment 2 ──────────────────────────────────────────────────────────
  test("H6b: a value outside the three modes is loud", () => {
    const rec = recorder(context());
    const out = rec.drive("bogus");
    expect(out).toEqual({
      kind: "error",
      message: 'Invalid --autonomy "bogus". Valid values: none, semi, full.',
    });
    expect(rec.applied).toHaveLength(0);
  });

  test("H6c: a differently-cased mode name is NOT accepted", () => {
    const rec = recorder(context());
    const out = rec.drive("Semi");
    expect(out.kind).toBe("error");
    expect(rec.applied).toHaveLength(0);
  });

  test("the malformed-input and no-intent judgments precede the projection read (no I/O on bad input)", () => {
    const rec = recorder(context());
    rec.drive("bogus");
    rec.drive(undefined, { missingValue: true });
    rec.drive("semi", { stateContent: null });
    expect(rec.counts.reads).toBe(0);
  });

  // ── Judgment 3 (fail-closed) ────────────────────────────────────────────
  test("J3: an unreadable projection is refused, not defaulted", () => {
    const rec = recorder({ kind: "unreadable" });
    const out = rec.drive("none");
    expect(out.kind).toBe("error");
    expect(rec.applied).toHaveLength(0);
  });

  // ── Judgment 4 + 8 ──────────────────────────────────────────────────────
  test("H1: a system-default intent accepts the first declaration", () => {
    const rec = recorder(context({ mode: "none", declared: false }));
    const out = rec.drive("semi");
    expect(out).toEqual({ kind: "continue" });
    expect(rec.applied).toEqual([{ mode: "semi", stateContent: STATE }]);
  });

  test("H4: `none` without a grant is applied", () => {
    const rec = recorder(context({ declared: false, grant: "absent" }));
    const out = rec.drive("none");
    expect(out).toEqual({ kind: "continue" });
    expect(rec.applied).toEqual([{ mode: "none", stateContent: STATE }]);
  });

  // ── Judgment 5 ──────────────────────────────────────────────────────────
  test("H2: re-declaring the SAME mode is a no-op that writes nothing", () => {
    const rec = recorder(context({ mode: "semi", declared: true }));
    const out = rec.drive("semi");
    expect(out).toEqual({ kind: "continue" });
    expect(rec.applied).toHaveLength(0);
  });

  test("H3: declaring a DIFFERENT mode over a human decision is loud", () => {
    const rec = recorder(context({ mode: "semi", declared: true, grant: "absent" }));
    const out = rec.drive("full");
    expect(out).toEqual({
      kind: "error",
      message: "Intent autonomy is already semi. Use `amadeus-bolt set-autonomy --mode full` to change it.",
    });
    expect(rec.applied).toHaveLength(0);
  });

  test("H3b: `--autonomy none` over a declared full+granted intent never reaches the write path", () => {
    const rec = recorder(context({ mode: "full", declared: true, grant: "present" }));
    const out = rec.drive("none");
    expect(out.kind).toBe("error");
    // The revoke-full path in prepareNonFullCommand is unreachable from the flag.
    expect(rec.applied).toHaveLength(0);
  });

  // ── Judgment 6 ──────────────────────────────────────────────────────────
  test("H5: `none` over an ACTIVE GRANT is loud and revokes nothing", () => {
    const rec = recorder(context({ mode: "full", declared: false, grant: "present" }));
    const out = rec.drive("none");
    expect(out).toEqual({
      kind: "error",
      message: "Intent has an active grant. Use `amadeus-bolt set-autonomy --mode none` to revoke it explicitly.",
    });
    expect(rec.applied).toHaveLength(0);
  });

  // ── Judgment 7 ──────────────────────────────────────────────────────────
  test("H7: `full` without a grant fails closed and prints the issuance preview", () => {
    const rec = recorder(context({ declared: false, grant: "absent" }));
    const out = rec.drive("full");
    expect(out.kind).toBe("error");
    expect(rec.applied).toHaveLength(0);
    expect(rec.counts.previews).toBe(1);
    expect(rec.stderrText()).toContain("grant-preview-payload");
  });

  test("H7b: `full` WITH a grant reaches the existing write path", () => {
    const rec = recorder(context({ mode: "none", declared: false, grant: "present" }));
    const out = rec.drive("full");
    expect(out).toEqual({ kind: "continue" });
    expect(rec.applied).toEqual([{ mode: "full", stateContent: STATE }]);
  });

  // ── Judgment 8 ──────────────────────────────────────────────────────────
  test("H8: the existing provenance requirement is relayed, not bypassed", () => {
    const rec = recorder(context(), { ok: false, error: "PROVENANCE_REQUIRED" });
    const out = rec.drive("semi");
    expect(out.kind).toBe("error");
    expect(out.kind === "error" && out.message).toContain("PROVENANCE_REQUIRED");
    expect(out.kind === "error" && out.message).toContain("turn boundary");
  });

  // ── H9 (FR-CLI-5 second half / R12) ─────────────────────────────────────
  test("H9: --autonomy is NOT a read-only flag", () => {
    expect(READ_ONLY_FLAGS.has("--autonomy")).toBe(false);
  });
});
