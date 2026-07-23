import { describe, expect, test } from "bun:test";
import { decideMirrorBoundary } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  parseMirrorBoundaryReceipts,
  serializeMirrorBoundaryReceipts,
  transitionMirrorBoundaryReceipt,
} from "../../packages/framework/core/tools/amadeus-state.ts";

const STATE = `# State

## Runtime State

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
`;

describe("t265 mirror boundary decision", () => {
  test.each([
    [false, false, { kind: "ask", includeCreate: true }],
    [false, true, { kind: "ask", includeCreate: false }],
    [true, false, { kind: "ask", includeCreate: true }],
    [true, true, { kind: "auto-sync" }],
  ] as const)("maps auto=%s mirror=%s", (auto, mirror, expected) => {
    expect(decideMirrorBoundary(auto, mirror)).toEqual(expected);
  });
});

describe("t265 mirror boundary receipts", () => {
  test("parses an absent field as empty", () => {
    expect(parseMirrorBoundaryReceipts(null)).toEqual({});
  });

  test("serializes in canonical phase order", () => {
    expect(
      serializeMirrorBoundaryReceipts({
        construction: "pending",
        ideation: "completed",
        inception: "completed",
      }),
    ).toBe(
      '{"ideation":"completed","inception":"completed","construction":"pending"}',
    );
  });

  test("rejects invalid JSON", () => {
    expect(() => parseMirrorBoundaryReceipts("{")).toThrow("invalid JSON");
  });

  test("rejects unknown phases", () => {
    expect(() =>
      parseMirrorBoundaryReceipts('{"operation":"pending"}'),
    ).toThrow('unknown phase "operation"');
  });

  test("rejects unknown statuses", () => {
    expect(() =>
      parseMirrorBoundaryReceipts('{"ideation":"running"}'),
    ).toThrow('invalid status for "ideation"');
  });

  test("rejects duplicate phases instead of accepting JSON last-write-wins", () => {
    expect(() =>
      parseMirrorBoundaryReceipts(
        '{"ideation":"pending","ideation":"completed"}',
      ),
    ).toThrow('duplicate phase "ideation"');
  });

  test("transitions absent to pending and pending to completed", () => {
    const pending = transitionMirrorBoundaryReceipt(
      STATE,
      "inception",
      "absent",
      "pending",
    );
    expect(pending).toContain(
      '- **Mirror Boundary Receipts**: {"inception":"pending"}',
    );
    expect(
      transitionMirrorBoundaryReceipt(
        pending,
        "inception",
        "pending",
        "completed",
      ),
    ).toContain(
      '- **Mirror Boundary Receipts**: {"inception":"completed"}',
    );
  });

  test("completed replay is idempotent", () => {
    const completed = `${STATE}- **Mirror Boundary Receipts**: {"ideation":"completed"}\n`;
    expect(
      transitionMirrorBoundaryReceipt(
        completed,
        "ideation",
        "pending",
        "completed",
      ),
    ).toBe(completed);
  });

  test("rejects an unexpected source state", () => {
    const pending = `${STATE}- **Mirror Boundary Receipts**: {"ideation":"pending"}\n`;
    expect(() =>
      transitionMirrorBoundaryReceipt(
        pending,
        "ideation",
        "absent",
        "completed",
      ),
    ).toThrow("expected absent, found pending");
  });
});
