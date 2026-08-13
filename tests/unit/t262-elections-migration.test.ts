import { describe, expect, test } from "bun:test";
import { sha256 } from "../../scripts/amadeus-election-migrate.ts";

describe("single-election migration primitives", () => {
  test("uses domain-compatible SHA-256 labels", () => {
    expect(sha256("plan")).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(sha256("plan")).toBe(sha256(new TextEncoder().encode("plan")));
    expect(sha256("plan")).not.toBe(sha256("changed"));
  });
});
