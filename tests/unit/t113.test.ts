// covers: function:validateDirective
// size: small
//
// t113 — Directive schema + validator. Migrated from the bash TAP test
// tests/unit/t113-directive-schema.sh (plan 30). The original spawned `bun -e`
// once per case, importing validateDirective from amadeus-directive.ts and
// stringifying the ValidationResult as "VALID" / "INVALID:<errors joined by |>"
// so bash could grep it. The module is a PURE contract — "no emit, no consume,
// reads/writes NO state, no I/O" (amadeus-directive.ts:9) — so every one of the
// 30 behavioural assertions can be exercised in-process by importing and
// CALLING validateDirective directly. The .ts file does have an
// `if (import.meta.main)` CLI self-check (amadeus-directive.ts:396), but the .sh
// never drives the CLI seam — it always imports validateDirective via `bun -e`.
// So this is a `.none.test.ts` (mechanism = none): pure function calls, zero
// subprocess, zero LLM, zero tokens.
//
// PARITY NOTE on the .sh "VALID" / "INVALID:..." string protocol: the original
// reduced the ValidationResult discriminated union to a single line via the
// run_validator helper (t113-directive-schema.sh:60-67) so bash could grep it.
// In-process we assert the union directly — `result.valid` (boolean) and either
// `result.data` (on success) or `result.errors` (string[]) on failure.
//   - assert_eq "$OUT" "VALID"            -> expect(result.valid).toBe(true)
//   - assert_contains "$OUT" "<substr>"   -> expect(errs(...)).toContain("<substr>")
// where errs() reproduces run_validator's reduction. Same observable behaviour
// (the substring is present in the surfaced error set), asserted against the
// real return value rather than its stringification.
//
// The .sh used `delete d.field` and object-spread mutation against inline JS
// fixture expressions. In-process each fixture is a function returning a fresh
// deep object, so no case can leak mutation into another — the equivalent of
// the .sh re-evaluating the inline expression per run_validator call.

import { describe, expect, test } from "bun:test";
import {
  type Directive,
  renderAdvisoryChoiceQuestion,
  validateDirective,
} from "../../dist/claude/.claude/tools/amadeus-directive.ts";

// --- Well-formed fixtures, one per kind (mirror t113-directive-schema.sh:18-56) ---
// Fresh object per call so a `delete`/spread in one case can't bleed into another.

function runStage(): Record<string, unknown> {
  return {
    kind: "run-stage",
    stage: "application-design",
    phase: "inception",
    lead_agent: "amadeus-architect-agent",
    support_agents: ["amadeus-aws-platform-agent", "amadeus-design-agent"],
    mode: "inline",
    gate: true,
    memory_path: "amadeus-docs/inception/application-design/memory.md",
    consumes: ["amadeus-docs/inception/requirements/requirements.md"],
    produces: ["amadeus-docs/inception/application-design/decisions.md"],
    rules_in_context: ["amadeus-org.md", "amadeus-team.md"],
    sensors_applicable: ["required-sections"],
    stage_file: ".claude/skills/amadeus/stages/inception/application-design.md",
  };
}

function dispatchSubagent(): Record<string, unknown> {
  return {
    kind: "dispatch-subagent",
    stage: "code-generation",
    phase: "construction",
    lead_agent: "amadeus-developer-agent",
    support_agents: ["amadeus-quality-agent"],
    mode: "subagent",
    gate: false,
    memory_path: "amadeus-docs/construction/auth/code-generation/memory.md",
    consumes: [
      "amadeus-docs/construction/auth/functional-design/functional-design.md",
    ],
    produces: ["amadeus-docs/construction/auth/code-generation/code-manifest.md"],
    rules_in_context: ["amadeus-org.md"],
    sensors_applicable: ["linter"],
    stage_file: ".claude/skills/amadeus/stages/construction/code-generation.md",
    worker: "code-generation",
  };
}

function invokeSwarm(): Record<string, unknown> {
  return { kind: "invoke-swarm", units: ["auth", "billing"], cap: 2, batch: "1" };
}

function presentGate(): Record<string, unknown> {
  return {
    kind: "present-gate",
    stage: "application-design",
    phase: "inception",
    memory_path: "amadeus-docs/inception/application-design/memory.md",
  };
}

function awaitAdvisoryChoice(): Record<string, unknown> {
  return {
    kind: "await-advisory-choice",
    stage: "functional-design",
    question: "形式検査advisoryについて選択してください。",
    options: ["今すぐ実行する", "リスクを承知して延期する"],
    advisories: [{
      plugin: "conformance-fixture",
      code: "changed",
      message: "advisory: conformance-fixture FIXTURE CHANGED",
      checkpoint: "functional-design",
      target: "conformance-fixture:fixture-change",
      spec_identity: "sha256:abc",
      intent_run: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
      advisory_instance: "019fc698-ba1f-7000-8000-000000000001",
    }],
  };
}

function executeAdvisoryHandoff(): Record<string, unknown> {
  return {
    kind: "execute-advisory-handoff",
    stage: "functional-design",
    handoff_stages: ["demo-stage"],
    advisories: [{
      plugin: "conformance-fixture",
      code: "declared-hold",
      message: "advisory: conformance-fixture declared hold",
      checkpoint: "functional-design",
      target: "conformance-fixture:fixture-change",
      spec_identity: "sha256:abc",
      intent_run: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
      advisory_instance: "019fc698-ba1f-7000-8000-000000000002",
      result: "declared advisory: release requires the plugin's own evaluator to return no-hold",
      handoff_stage: "demo-stage",
    }],
  };
}

function executeFailureElection(): Record<string, unknown> {
  return {
    kind: "execute-failure-election",
    stage: "code-generation",
    unit: "alpha",
    attempt: "solo-attempt-alpha",
    batch: "solo:1:alpha",
    siblings: "none",
    choices: ["Retry", "Skip", "Abort"],
  };
}

function selectIntent(): Record<string, unknown> {
  const options = ["first-intent", "second-intent"];
  return {
    kind: "select-intent",
    selection_token: "0".repeat(64),
    question: "Choose an intent",
    options,
  };
}

function ask(): Record<string, unknown> {
  return { kind: "ask", question: "Resume from the last checkpoint, or start fresh?" };
}

function print(): Record<string, unknown> {
  return { kind: "print", message: "AIDLC framework version 0.0.0" };
}

function error(): Record<string, unknown> {
  return { kind: "error", message: "Unknown scope" };
}

function done(): Record<string, unknown> {
  return { kind: "done", reason: "Workflow complete." };
}

function parked(): Record<string, unknown> {
  return { kind: "parked", reason: "Parked at feasibility.", stage: "feasibility" };
}

// Mirror of the .sh run_validator helper (t113-directive-schema.sh:60-67):
// call the validator and reduce the failure case to the pipe-joined error
// string the original asserted against. On success return "VALID".
function errs(obj: unknown): string {
  const r = validateDirective(obj);
  return r.valid ? "VALID" : r.errors.join("|");
}

describe("t113 directive-schema — validateDirective (migrated from t113-directive-schema.sh, plan 26)", () => {
  // ============================================================
  // Positive baseline — a well-formed directive of each kind (8 assertions)
  // .sh lines 75-82
  // ============================================================

  test("run-stage well-formed -> VALID", () => {
    expect(validateDirective(runStage()).valid).toBe(true);
  });

  test("await-advisory-choice well-formed -> VALID", () => {
    expect(validateDirective(awaitAdvisoryChoice()).valid).toBe(true);
  });

  test("advisory choice renderer preserves every message verbatim and in order", () => {
    expect(renderAdvisoryChoiceQuestion([
      { message: "first advisory\nwith detail" },
      { message: "second advisory: do not summarize" },
    ])).toBe(
      "first advisory\nwith detail\nsecond advisory: do not summarize\n\n" +
      "各advisoryについて次のいずれかを選択してください。",
    );
  });

  test("await-advisory-choice rejects missing identity and non-canonical options", () => {
    const missingIdentity = awaitAdvisoryChoice();
    missingIdentity.advisories = [{ plugin: "p", code: "changed", message: "m" }];
    expect(errs(missingIdentity)).toContain("advisories[0].advisory_instance");
    expect(errs({ ...awaitAdvisoryChoice(), options: ["continue"] })).toContain("options");
  });

  test("await-advisory-choice rejects malformed advisory items", () => {
    const base = awaitAdvisoryChoice();
    expect(errs({ ...base, advisories: [] })).toContain("advisories must be a non-empty array");
    expect(errs({ ...base, advisories: [null] })).toContain("advisories[0] must be object");
    expect(errs({ ...base, advisories: [{ ...(base.advisories as object[])[0], code: "Not A Slug" }] })).toContain(
      "advisories[0].code must be a slug",
    );
    expect(errs({ ...base, advisories: [{ ...(base.advisories as object[])[0], result: "" }] })).toContain(
      "advisories[0].result must be non-empty string",
    );
    expect(errs({ ...base, advisories: [{ ...(base.advisories as object[])[0], handoff_stage: "" }] })).toContain(
      "advisories[0].handoff_stage must be non-empty string",
    );
  });

  // #2967. `handoff_stages` is a projection of the advisories, so the validator
  // checks the RELATIONSHIP, not just the array's type. A stage nothing declared
  // sends the conductor somewhere nobody asked for; a declared stage left out
  // silently drops the work the directive exists to carry.
  test("execute-advisory-handoff well-formed -> VALID", () => {
    expect(errs(executeAdvisoryHandoff())).toBe("VALID");
  });

  test("execute-failure-election well-formed -> VALID", () => {
    expect(errs(executeFailureElection())).toBe("VALID");
  });

  test("execute-failure-election rejects an empty choices array", () => {
    expect(errs({ ...executeFailureElection(), choices: [] }))
      .toContain("choices must be a non-empty string array");
  });

  test("execute-failure-election rejects non-canonical choices", () => {
    expect(errs({ ...executeFailureElection(), choices: ["Skip", "Retry", "Abort"] }))
      .toContain("choices must be exactly Retry, Skip, Abort");
  });

  test("execute-advisory-handoff accepts an empty handoff_stages when no advisory declares one", () => {
    const base = executeAdvisoryHandoff();
    const advisory = { ...(base.advisories as Record<string, unknown>[])[0] };
    delete advisory.handoff_stage;
    expect(errs({ ...base, handoff_stages: [], advisories: [advisory] })).toBe("VALID");
  });

  test("execute-advisory-handoff rejects a handoff stage no advisory declares", () => {
    expect(errs({ ...executeAdvisoryHandoff(), handoff_stages: ["demo-stage", "build-and-test"] }))
      .toContain("handoff_stages names build-and-test, which no advisory declares");
  });

  test("execute-advisory-handoff rejects a declared stage the array omits", () => {
    expect(errs({ ...executeAdvisoryHandoff(), handoff_stages: [] }))
      .toContain("handoff_stages omits declared stage demo-stage");
  });

  test("execute-advisory-handoff rejects a repeated handoff stage", () => {
    expect(errs({ ...executeAdvisoryHandoff(), handoff_stages: ["demo-stage", "demo-stage"] }))
      .toContain("handoff_stages repeats demo-stage");
  });

  test("execute-advisory-handoff rejects malformed advisories and a non-array handoff_stages", () => {
    const base = executeAdvisoryHandoff();
    expect(errs({ ...base, advisories: [] })).toContain("advisories must be a non-empty array");
    expect(errs({ ...base, handoff_stages: "demo-stage" })).toContain("handoff_stages");
    // It carries no question and no options — those belong to the human route.
    expect(errs({ ...base, question: "why?" })).toContain("question");
  });

  test("dispatch-subagent well-formed -> VALID", () => {
    expect(validateDirective(dispatchSubagent()).valid).toBe(true);
  });

  test("invoke-swarm well-formed -> VALID", () => {
    expect(validateDirective(invokeSwarm()).valid).toBe(true);
  });

  // M1: the optional `repo` field (single-recorded-repo case) — the engine
  // threads the lone sibling repo to the conductor as `prepare --repo`. repo is
  // optional, so a directive carrying it (well-formed string) must still validate.
  test("invoke-swarm with optional repo -> VALID", () => {
    const d = invokeSwarm();
    d.repo = "repo-a";
    expect(errs(d)).toBe("VALID");
  });

  test("invoke-swarm accepts a prepared retry correlation as one typed pair", () => {
    const d = invokeSwarm();
    d.units = ["auth"];
    d.cap = 1;
    delete d.batch;
    d.prepared_batch = "1";
    d.retry_unit = "auth";
    expect(errs(d)).toBe("VALID");
  });

  // #2837: the fresh fan-out arm carries the engine's batch identity, in the
  // exact token `amadeus-swarm.ts prepare --batch` accepts — the engine may
  // never emit a value the referee would reject. The two identity arms are
  // exclusive: `batch` opens a NEW Unit Pool, the prepared pair names one that
  // already owns its worktrees and pool.
  test("invoke-swarm requires a prepare-shaped batch identity on the fresh arm", () => {
    const { batch: _batch, ...withoutBatch } = invokeSwarm();
    expect(errs(withoutBatch)).toContain("invoke-swarm: missing required field: batch");
    expect(errs({ ...invokeSwarm(), batch: "0" })).toContain(
      "invoke-swarm: batch must be a positive integer string",
    );
    expect(errs({ ...invokeSwarm(), batch: "1.2" })).toContain(
      "invoke-swarm: batch must be a positive integer string",
    );
    expect(errs({ ...invokeSwarm(), batch: 1 })).toContain(
      "invoke-swarm: batch must be a positive integer string",
    );
  });

  test("invoke-swarm rejects a batch identity beside a prepared retry", () => {
    expect(errs({ ...invokeSwarm(), units: ["auth"], cap: 1, prepared_batch: "1", retry_unit: "auth" }))
      .toContain("invoke-swarm: batch and the prepared retry pair are mutually exclusive");
  });

  test("invoke-swarm rejects partial or mismatched prepared retry correlation", () => {
    expect(errs({ ...invokeSwarm(), prepared_batch: "1" })).toContain(
      "invoke-swarm: prepared_batch and retry_unit must be provided together",
    );
    expect(errs({ ...invokeSwarm(), retry_unit: "auth" })).toContain(
      "invoke-swarm: prepared_batch and retry_unit must be provided together",
    );
    expect(errs({ ...invokeSwarm(), prepared_batch: "1", retry_unit: "missing" })).toContain(
      "invoke-swarm: retry_unit must name exactly one member of units",
    );
    expect(errs({ ...invokeSwarm(), prepared_batch: "", retry_unit: "" })).toContain(
      "invoke-swarm: prepared_batch and retry_unit must be provided together",
    );
    expect(errs({ ...invokeSwarm(), prepared_batch: "   ", retry_unit: "auth" })).toContain(
      "invoke-swarm: prepared_batch and retry_unit must be provided together",
    );
  });

  test("present-gate well-formed -> VALID", () => {
    expect(validateDirective(presentGate()).valid).toBe(true);
  });

  test("ask well-formed -> VALID", () => {
    expect(validateDirective(ask()).valid).toBe(true);
  });

  test("print well-formed -> VALID", () => {
    expect(validateDirective(print()).valid).toBe(true);
  });

  test("error well-formed -> VALID", () => {
    expect(validateDirective(error()).valid).toBe(true);
  });

  test("done well-formed -> VALID", () => {
    expect(validateDirective(done()).valid).toBe(true);
  });

  test("parked well-formed -> VALID", () => {
    expect(validateDirective(parked()).valid).toBe(true);
  });

  // ============================================================
  // Positive returns the parsed directive as data (1 assertion)
  // .sh lines 88-93: `kind=` + r.data.kind
  // ============================================================

  test("valid run-stage -> data.kind returned", () => {
    const r = validateDirective(runStage());
    expect(r.valid).toBe(true);
    // narrowed by valid===true; data aliases the input per the validator's
    // documented trust boundary (amadeus-directive.ts:281-288).
    const data = (r as { valid: true; data: Directive }).data;
    expect(data.kind).toBe("run-stage");
  });

  // ============================================================
  // Per-kind missing required field — names the field + kind (8 assertions)
  // .sh lines 99-121
  // ============================================================

  test("run-stage missing lead_agent -> error", () => {
    const d = runStage();
    delete d.lead_agent;
    expect(errs(d)).toContain("run-stage: missing required field: lead_agent");
  });

  test("dispatch-subagent missing worker -> error", () => {
    const d = dispatchSubagent();
    delete d.worker;
    expect(errs(d)).toContain(
      "dispatch-subagent: missing required field: worker",
    );
  });

  test("invoke-swarm missing units -> error", () => {
    const d = invokeSwarm();
    delete d.units;
    expect(errs(d)).toContain("invoke-swarm: missing required field: units");
  });

  test("invoke-swarm requires a positive integer cap no greater than its batch", () => {
    const missing = invokeSwarm();
    delete missing.cap;
    expect(errs(missing)).toContain("invoke-swarm: missing required field: cap");

    const tooWide = invokeSwarm();
    tooWide.cap = 3;
    expect(errs(tooWide)).toContain("invoke-swarm: cap must not exceed units.length");

    const zero = invokeSwarm();
    zero.cap = 0;
    expect(errs(zero)).toContain("invoke-swarm: cap must be a positive integer");

    const fractional = invokeSwarm();
    fractional.cap = 1.5;
    expect(errs(fractional)).toContain("invoke-swarm: cap must be a positive integer");
  });

  test("present-gate missing memory_path -> error", () => {
    const d = presentGate();
    delete d.memory_path;
    expect(errs(d)).toContain(
      "present-gate: missing required field: memory_path",
    );
  });

  test("ask missing question -> error", () => {
    const d = ask();
    delete d.question;
    expect(errs(d)).toContain("ask: missing required field: question");
  });

  test("print missing message -> error", () => {
    const d = print();
    delete d.message;
    expect(errs(d)).toContain("print: missing required field: message");
  });

  test("error missing message -> error", () => {
    const d = error();
    delete d.message;
    expect(errs(d)).toContain("error: missing required field: message");
  });

  test("done missing reason -> error", () => {
    const d = done();
    delete d.reason;
    expect(errs(d)).toContain("done: missing required field: reason");
  });

  test("parked missing stage -> error", () => {
    const d = parked();
    delete d.stage;
    expect(errs(d)).toContain("parked: missing required field: stage");
  });

  // ============================================================
  // Unknown kind (1 assertion)
  // .sh lines 127-128
  // ============================================================

  test("unknown kind -> specific error", () => {
    expect(errs({ kind: "frobnicate", message: "x" })).toContain(
      'unknown kind: "frobnicate"',
    );
  });

  // ============================================================
  // Unknown key on a valid run-stage (1 assertion)
  // .sh lines 134-135
  // ============================================================

  test("unknown key on run-stage -> error", () => {
    expect(errs({ ...runStage(), bogus: "x" })).toContain(
      "run-stage: unknown key: bogus",
    );
  });

  // ============================================================
  // Type mismatches (3 assertions)
  // .sh lines 141-148
  // ============================================================

  test("run-stage gate 'yes' -> boolean type error", () => {
    expect(errs({ ...runStage(), gate: "yes" })).toContain(
      'run-stage: gate must be boolean or "unresolved", got string',
    );
  });

  test("run-stage support_agents 'x' -> array type error", () => {
    expect(errs({ ...runStage(), support_agents: "x" })).toContain(
      "run-stage: support_agents must be array, got string",
    );
  });

  test("ask question 42 -> string type error", () => {
    expect(errs({ ...ask(), question: 42 })).toContain(
      "ask: question must be string, got number",
    );
  });

  test("select-intent requires a non-empty options array", () => {
    expect(errs(selectIntent())).toBe("VALID");
    expect(errs({ ...selectIntent(), options: [] })).toContain(
      "select-intent: options must be a non-empty string array",
    );
    expect(errs({ ...selectIntent(), options: [""] })).toContain(
      "select-intent: options entries must be non-empty strings",
    );
    expect(errs({ ...selectIntent(), options: ["   "] })).toContain(
      "select-intent: options entries must be non-empty strings",
    );
    expect(errs({ ...selectIntent(), options: ["same", "same"] })).toContain(
      "select-intent: options entries must be unique",
    );
    expect(errs({ ...selectIntent(), selection_token: "modified" })).toContain(
      "select-intent: selection_token must be a SHA-256 fingerprint",
    );
  });

  // ============================================================
  // The classify-round-trip gate sentinel + conductor_persona (4 assertions)
  // .sh lines 162-173
  // ============================================================
  // The engine emits gate:"unresolved" for the one Construction skeleton stage
  // it cannot pre-classify; the conductor resolves it on the round trip
  // (amadeus-directive.ts:31, :65, GATE_UNRESOLVED at :37). checkGate (:373-389)
  // accepts boolean OR the exact sentinel string and rejects every other string
  // so a typo'd sentinel surfaces loudly rather than being acted on as a
  // deferred gate. conductor_persona is the optional D-E delivery field
  // (amadeus-directive.ts:75-80, :100-101), validated by checkOptionalString
  // (:393-403) — absent is fine, present-and-string is VALID, present-and-non-
  // string is rejected.

  test('run-stage gate:"unresolved" sentinel -> VALID (classify round-trip)', () => {
    // .sh line 162-163: the sentinel is the ONLY accepted gate string.
    expect(errs({ ...runStage(), gate: "unresolved" })).toBe("VALID");
    expect(validateDirective({ ...runStage(), gate: "unresolved" }).valid).toBe(
      true,
    );
  });

  test('run-stage gate:"maybe" (non-sentinel string) -> rejected', () => {
    // .sh line 164-166: any OTHER gate-string is rejected with the same
    // boolean-or-sentinel type error a non-string would produce — a typo'd
    // sentinel must NOT be silently accepted as a deferred gate.
    const r = validateDirective({ ...runStage(), gate: "maybe" });
    expect(r.valid).toBe(false);
    expect(errs({ ...runStage(), gate: "maybe" })).toContain(
      'run-stage: gate must be boolean or "unresolved", got string',
    );
  });

  test("run-stage conductor_persona string -> VALID (D-E first-next delivery)", () => {
    // .sh line 169-170: conductor_persona present as a string is accepted.
    expect(errs({ ...runStage(), conductor_persona: "# Persona" })).toBe(
      "VALID",
    );
    expect(
      validateDirective({ ...runStage(), conductor_persona: "# Persona" })
        .valid,
    ).toBe(true);
  });

  test("run-stage conductor_persona non-string -> rejected", () => {
    // .sh line 171-173: present-and-non-string is rejected, naming kind+field.
    const r = validateDirective({ ...runStage(), conductor_persona: 42 });
    expect(r.valid).toBe(false);
    expect(errs({ ...runStage(), conductor_persona: 42 })).toContain(
      "run-stage: conductor_persona must be string, got number",
    );
  });

  // ============================================================
  // next_stage on a run-stage directive (FR-2 item 10, upstream-sync-230 U03)
  // ============================================================
  // next_stage is an optional run-stage field, present only on a gate-carrying
  // main-workflow directive. It is `string | null`: a stage slug for a real next
  // in-scope stage, or null at the terminal. Absent is fine; a string validates;
  // null validates (the explicit terminal signal); a non-string non-null value is
  // rejected naming kind+field.

  test("run-stage next_stage string slug -> VALID", () => {
    expect(errs({ ...runStage(), next_stage: "units-generation" })).toBe("VALID");
  });

  test("run-stage next_stage null (terminal) -> VALID", () => {
    expect(errs({ ...runStage(), next_stage: null })).toBe("VALID");
  });

  test("run-stage next_stage non-string non-null -> rejected", () => {
    const r = validateDirective({ ...runStage(), next_stage: 7 });
    expect(r.valid).toBe(false);
    expect(errs({ ...runStage(), next_stage: 7 })).toContain(
      "run-stage: next_stage must be string or null, got number",
    );
  });

  // ============================================================
  // mode enum miss on run-stage (1 assertion)
  // .sh lines 179-180
  // ============================================================

  test("run-stage mode enum miss -> error", () => {
    expect(errs({ ...runStage(), mode: "hologram" })).toContain(
      "run-stage: mode must be one of",
    );
  });

  // ============================================================
  // Reviewer fields on a run-stage directive (V4a)
  // ============================================================
  // reviewer / reviewer_max_iterations are optional run-stage fields, present
  // only when the stage declares a reviewer. The directive validator mirrors
  // the stage-schema validator: reviewer optional-string,
  // reviewer_max_iterations optional positive-integer. Absent is fine; a valid
  // pair validates; a non-string reviewer or non-integer cap is rejected.

  test("run-stage reviewer + cap present and valid -> VALID", () => {
    expect(
      errs({
        ...runStage(),
        reviewer: "amadeus-architecture-reviewer-agent",
        reviewer_max_iterations: 3,
      }),
    ).toBe("VALID");
  });

  test("run-stage non-string reviewer -> type error", () => {
    expect(errs({ ...runStage(), reviewer: 42 })).toContain(
      "run-stage: reviewer must be string, got number",
    );
  });

  test("run-stage non-integer reviewer_max_iterations -> positive-integer error", () => {
    expect(
      errs({
        ...runStage(),
        reviewer: "amadeus-architecture-reviewer-agent",
        reviewer_max_iterations: "two",
      }),
    ).toContain(
      "run-stage: reviewer_max_iterations must be a positive integer, got string",
    );
  });

  // ============================================================
  // consumes_absent is an optional run-stage/dispatch-subagent field, present
  // only when a declared consume's file is missing at emit time. Each entry
  // must be {path: string, expected: boolean}. Absent is fine; a valid array
  // validates; a non-array, non-object element, or badly typed member is
  // rejected with a field-precise error.

  test("run-stage consumes_absent valid array -> VALID", () => {
    expect(
      errs({
        ...runStage(),
        consumes_absent: [
          { path: "amadeus-docs/inception/units-generation/unit-of-work.md", expected: true },
          { path: "amadeus-docs/inception/requirements/requirements.md", expected: false },
        ],
      }),
    ).toBe("VALID");
  });

  test("dispatch-subagent consumes_absent valid -> VALID (shared field set)", () => {
    expect(
      errs({
        ...dispatchSubagent(),
        consumes_absent: [{ path: "a/b.md", expected: true }],
      }),
    ).toBe("VALID");
  });

  test("run-stage consumes_absent non-array -> type error", () => {
    expect(errs({ ...runStage(), consumes_absent: "nope" })).toContain(
      "run-stage: consumes_absent must be array, got string",
    );
  });

  test("run-stage consumes_absent non-object element -> element error", () => {
    expect(errs({ ...runStage(), consumes_absent: ["a/b.md"] })).toContain(
      "run-stage: consumes_absent[0] must be object, got string",
    );
  });

  test("run-stage consumes_absent bad member types -> per-field errors", () => {
    const e = errs({
      ...runStage(),
      consumes_absent: [{ path: 42, expected: "yes" }],
    });
    expect(e).toContain("run-stage: consumes_absent[0].path must be string, got number");
    expect(e).toContain("run-stage: consumes_absent[0].expected must be boolean, got string");
  });

  // ============================================================
  // Shape failures — non-object inputs (3 assertions)
  // .sh lines 186-188
  // ============================================================

  test("null -> shape error", () => {
    expect(errs(null)).toContain("expected object, got null");
  });

  test("array -> shape error", () => {
    expect(errs([])).toContain("expected object, got array");
  });

  test("string -> shape error", () => {
    expect(errs("x")).toContain("expected object, got string");
  });
});
