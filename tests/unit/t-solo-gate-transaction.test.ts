// covers: function:validateDirective, function:classifyApprovalAuthority, function:parseGrantApprovalProcessResult
//
// Pure (Small) half of the U2 solo-gate-transaction suite: directive schema and
// the two pure classifiers. Everything that touches a real filesystem — the
// route transaction, the ritual counters and the presence reservation state
// machine — lives in tests/integration/t-solo-gate-transaction-seam.test.ts so
// the unit layer stays Small (test-size purity ratchet).

import { describe, expect, test } from "bun:test";
import {
  directiveSelfCheckExamples,
  type RunStageDirective,
  validateDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import { parseGrantApprovalProcessResult } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { classifyApprovalAuthority } from "../../packages/framework/core/tools/amadeus-state.ts";

const GRANT_ID = "abcdef12";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
const TARGET_INTENT_ID = "00000000-0000-7000-8000-000000000001";
const RESERVATION_ID = "87654321-4321-4abc-8def-1234567890ab";

function runStage(): RunStageDirective {
  const example = directiveSelfCheckExamples.find(
    (directive) => directive.kind === "run-stage" && directive.gate === true,
  );
  if (example === undefined || example.kind !== "run-stage") {
    throw new Error("missing run-stage fixture");
  }
  return { ...example };
}

describe("solo gate directive carrier", () => {
  test("accepts the Grant Id and Route Id pair without changing gate", () => {
    const directive = {
      ...runStage(),
      standing_grant_id: GRANT_ID,
      standing_grant_route_id: ROUTE_ID,
    } satisfies RunStageDirective;

    expect(validateDirective(directive)).toEqual({
      valid: true,
      data: directive,
    });
    expect(directive.gate).toBe(true);
  });

  test.each([
    { standing_grant_id: GRANT_ID },
    { standing_grant_route_id: ROUTE_ID },
    { standing_grant_id: "NOT-HEX", standing_grant_route_id: ROUTE_ID },
    { standing_grant_id: GRANT_ID, standing_grant_route_id: "not-a-uuid" },
  ])("rejects partial or malformed carrier %#", (carrier) => {
    expect(validateDirective({ ...runStage(), ...carrier }).valid).toBe(false);
  });

  test("rejects carrier fields on non-run-stage directives", () => {
    expect(
      validateDirective({
        kind: "present-gate",
        stage: "code-generation",
        phase: "construction",
        memory_path: "memory.md",
        standing_grant_id: GRANT_ID,
        standing_grant_route_id: ROUTE_ID,
      }).valid,
    ).toBe(false);
  });
});

describe("typed await-approval directive", () => {
  test("accepts the exact target and reservation carrier", () => {
    const directive = {
      kind: "await-approval",
      stage: "code-generation",
      reason: "standing-grant-no-longer-authorizes",
      target_intent_id: TARGET_INTENT_ID,
      presence_reservation_id: RESERVATION_ID,
    } as const;

    expect(validateDirective(directive)).toEqual({
      valid: true,
      data: directive,
    });
  });

  test.each([
    { target_intent_id: "solo-intent-abcd1234" },
    { target_intent_id: TARGET_INTENT_ID, presence_reservation_id: "not-a-uuid" },
    { target_intent_id: TARGET_INTENT_ID, presence_reservation_id: RESERVATION_ID, extra: true },
    { target_intent_id: TARGET_INTENT_ID, presence_reservation_id: RESERVATION_ID, reason: "other" },
  ])("rejects malformed or non-exact await shape %#", (fields) => {
    expect(
      validateDirective({
        kind: "await-approval",
        stage: "code-generation",
        reason: "standing-grant-no-longer-authorizes",
        presence_reservation_id: RESERVATION_ID,
        ...fields,
      }).valid,
    ).toBe(false);
  });
});

describe("approval authority classifier", () => {
  test("keeps normal, grant-backed, and targeted human branches exclusive", () => {
    expect(classifyApprovalAuthority({ operatingMode: "team", userInput: "approve" }))
      .toEqual({ kind: "normal", userInput: "approve" });
    expect(
      classifyApprovalAuthority({
        operatingMode: "solo",
        standingGrantId: GRANT_ID,
        standingGrantRouteId: ROUTE_ID,
      }),
    ).toEqual({
      kind: "grant-backed",
      grantId: GRANT_ID,
      routeId: ROUTE_ID,
    });
    expect(
      classifyApprovalAuthority({
        operatingMode: "solo",
        userInput: "approve",
        targetIntentId: TARGET_INTENT_ID,
        presenceReservationId: RESERVATION_ID,
      }),
    ).toEqual({
      kind: "targeted-human",
      userInput: "approve",
      targetIntentId: TARGET_INTENT_ID,
      reservationId: RESERVATION_ID,
    });
  });

  test.each([
    { operatingMode: "solo", userInput: "approve", standingGrantId: GRANT_ID, standingGrantRouteId: ROUTE_ID },
    { operatingMode: "solo", standingGrantId: GRANT_ID },
    { operatingMode: "team", standingGrantId: GRANT_ID, standingGrantRouteId: ROUTE_ID },
    { operatingMode: "invalid", standingGrantId: GRANT_ID, standingGrantRouteId: ROUTE_ID },
    { operatingMode: "solo", targetIntentId: TARGET_INTENT_ID },
    { operatingMode: "solo", userInput: "approve", targetIntentId: TARGET_INTENT_ID },
    { operatingMode: "solo", userInput: "approve", targetIntentId: TARGET_INTENT_ID, presenceReservationId: RESERVATION_ID, standingGrantId: GRANT_ID, standingGrantRouteId: ROUTE_ID },
  ] as const)("rejects mixed, partial, or non-solo authority %#", (input) => {
    expect(classifyApprovalAuthority(input).kind).toBe("invalid");
  });
});

describe("strict grant approval process wire", () => {
  test("decodes only approved and typed await single-line JSON", () => {
    expect(
      parseGrantApprovalProcessResult({
        exitCode: 0,
        stdout: '{"kind":"approved"}\n',
        stderr: "",
      }),
    ).toEqual({ kind: "approved" });
    expect(
      parseGrantApprovalProcessResult({
        exitCode: 0,
        stdout:
          `{"kind":"await-approval","stage":"application-design",` +
          `"reason":"standing-grant-no-longer-authorizes",` +
          `"target_intent_id":"${TARGET_INTENT_ID}"}\n`,
        stderr: "",
      }),
    ).toEqual({
      kind: "await-approval",
      stage: "application-design",
      targetIntentId: TARGET_INTENT_ID,
    });
  });

  test.each([
    { exitCode: 0, stdout: "", stderr: "" },
    { exitCode: 0, stdout: '{"kind":"approved"}\n{"kind":"approved"}\n', stderr: "" },
    { exitCode: 0, stdout: "not-json\n", stderr: "" },
    { exitCode: 0, stdout: "[]\n", stderr: "" },
    { exitCode: 0, stdout: '"approved"\n', stderr: "" },
    { exitCode: 0, stdout: '{"kind":1}\n', stderr: "" },
    { exitCode: 0, stdout: '{"kind":"approved","extra":true}\n', stderr: "" },
    { exitCode: 0, stdout: '{"kind":"approved"}\n', stderr: "warning" },
    { exitCode: 0, stdout: '{"kind":"await-approval","stage":"application-design","reason":"other","target_intent_id":"00000000-0000-7000-8000-000000000001"}\n', stderr: "" },
  ])("classifies malformed exit-zero wire as protocol error %#", (result) => {
    expect(parseGrantApprovalProcessResult(result).kind).toBe("protocol-error");
  });

  test("keeps nonzero process failure fatal", () => {
    expect(
      parseGrantApprovalProcessResult({
        exitCode: 1,
        stdout: '{"kind":"await-approval"}\n',
        stderr: "failed",
      }),
    ).toEqual({ kind: "fatal-error", detail: "failed" });
  });
});

// The carrier pair is the only way an unattended process can claim authority, so
// a syntactically wrong carrier must be rejected before any state is read.
describe("approval authority carrier syntax", () => {
  const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
  const TARGET_ID = "00000000-0000-7000-8000-000000000001";
  const RESERVATION_ID = "87654321-4321-4abc-8def-1234567890ab";

  test.each([
    ["a non-hex Grant Id", { standingGrantId: "ZZZZZZZZ", standingGrantRouteId: ROUTE_ID }],
    ["a short Grant Id", { standingGrantId: "abcdef1", standingGrantRouteId: ROUTE_ID }],
    ["a non-v4 Route Id", { standingGrantId: "abcdef12", standingGrantRouteId: TARGET_ID }],
  ] as const)("rejects %s", (_label, carrier) => {
    expect(classifyApprovalAuthority({ operatingMode: "solo", ...carrier })).toEqual({
      kind: "invalid",
      reason: "malformed grant authority",
    });
  });

  test.each([
    [
      "a non-v7 target intent id",
      { targetIntentId: ROUTE_ID, presenceReservationId: RESERVATION_ID, userInput: "go" },
    ],
    [
      "a non-v4 Reservation Id",
      { targetIntentId: TARGET_ID, presenceReservationId: TARGET_ID, userInput: "go" },
    ],
    [
      "a missing user input",
      { targetIntentId: TARGET_ID, presenceReservationId: RESERVATION_ID },
    ],
  ] as const)("rejects targeted human authority with %s", (_label, carrier) => {
    expect(classifyApprovalAuthority({ operatingMode: "solo", ...carrier })).toEqual({
      kind: "invalid",
      reason: "malformed targeted human authority",
    });
  });
});
