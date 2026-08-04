// covers: function:validateDirective, function:classifyApprovalAuthority, function:parseApprovalProcessResult

import { describe, expect, test } from "bun:test";
import {
  classifyApprovalAuthority,
  parseApprovalProcessResult,
} from "../../packages/framework/core/tools/amadeus-approval-authorization.ts";
import {
  directiveSelfCheckExamples,
  validateDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";

describe("retired standing-grant carriers", () => {
  test("rejects former standing-grant fields as unknown directive fields", () => {
    const runStage = directiveSelfCheckExamples.find(
      (candidate) => candidate.kind === "run-stage" && candidate.gate === true,
    );
    expect(runStage).toBeDefined();
    const result = validateDirective({
      ...runStage,
      standing_grant_id: "cafe0001",
      standing_grant_route_id: "12345678-1234-4abc-8def-1234567890ab",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes("unknown key"))).toBe(true);
    }
  });

  test("accepts only the Kimi human-approval await reason", () => {
    expect(validateDirective({
      kind: "await-approval",
      stage: "code-generation",
      reason: "kimi-human-approval-required",
      target_intent_id: "00000000-0000-7000-8000-000000000001",
      presence_reservation_id: "87654321-4321-4abc-8def-1234567890ab",
    }).valid).toBe(true);
    expect(validateDirective({
      kind: "await-approval",
      stage: "code-generation",
      reason: "standing-grant-no-longer-authorizes",
      target_intent_id: "00000000-0000-7000-8000-000000000001",
      presence_reservation_id: "87654321-4321-4abc-8def-1234567890ab",
    }).valid).toBe(false);
  });
});

describe("approval authority classifier", () => {
  test("keeps normal and targeted-human branches exclusive", () => {
    expect(classifyApprovalAuthority({ operatingMode: "team", userInput: "approve" }))
      .toEqual({ kind: "normal", userInput: "approve" });
    expect(classifyApprovalAuthority({
      operatingMode: "solo",
      userInput: "approve",
      targetIntentId: "00000000-0000-7000-8000-000000000001",
      presenceReservationId: "87654321-4321-4abc-8def-1234567890ab",
    })).toEqual({
      kind: "targeted-human",
      userInput: "approve",
      targetIntentId: "00000000-0000-7000-8000-000000000001",
      reservationId: "87654321-4321-4abc-8def-1234567890ab",
    });
  });

  test("rejects partial, malformed, and non-solo targeted carriers", () => {
    expect(classifyApprovalAuthority({
      operatingMode: "solo",
      targetIntentId: "00000000-0000-7000-8000-000000000001",
    }).kind).toBe("invalid");
    expect(classifyApprovalAuthority({
      operatingMode: "team",
      userInput: "approve",
      targetIntentId: "00000000-0000-7000-8000-000000000001",
      presenceReservationId: "87654321-4321-4abc-8def-1234567890ab",
    }).kind).toBe("invalid");
  });
});

describe("approval process wire", () => {
  test("accepts only a single approved JSON line", () => {
    expect(parseApprovalProcessResult({
      exitCode: 0,
      stdout: '{"kind":"approved"}\n',
      stderr: "",
    })).toEqual({ kind: "approved" });
    expect(parseApprovalProcessResult({
      exitCode: 0,
      stdout: '{"kind":"await-approval"}\n',
      stderr: "",
    }).kind).toBe("protocol-error");
  });

  test("distinguishes subprocess failure from protocol failure", () => {
    expect(parseApprovalProcessResult({ exitCode: 1, stdout: "", stderr: "boom" }))
      .toEqual({ kind: "fatal-error", detail: "boom" });
    expect(parseApprovalProcessResult({ exitCode: 0, stdout: "not-json\n", stderr: "" }).kind)
      .toBe("protocol-error");
  });
});
