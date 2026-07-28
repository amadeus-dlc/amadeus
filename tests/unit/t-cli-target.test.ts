import { describe, expect, test } from "bun:test";
import {
  amadeusToolTarget,
  isAmadeusToolPath,
} from "../harness/cli-target.ts";

describe("amadeusToolTarget", () => {
  test("returns a validated Amadeus tool path unchanged", () => {
    const path = "/tmp/tools/amadeus-state.ts";
    expect(amadeusToolTarget(path)).toBe(path);
  });

  test("rejects an indirect non-Amadeus target", () => {
    expect(() => amadeusToolTarget("/tmp/tools/helper.ts")).toThrow(
      "not an Amadeus CLI tool target",
    );
  });

  test("requires an exact Amadeus tool basename", () => {
    expect(isAmadeusToolPath("/tmp/tools/amadeus-state.ts")).toBe(true);
    expect(isAmadeusToolPath("/tmp/tools/not-amadeus-state.ts")).toBe(false);
    expect(isAmadeusToolPath("/tmp/tools/amadeus-state.ts.bak")).toBe(false);
  });
});
