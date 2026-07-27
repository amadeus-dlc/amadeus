// covers: file:packages/framework/core/tools/amadeus-plugin-activation.ts
// size: small
//
// U6 activation-policy — judgeActivation is the pure 3-value map (current hash ×
// recorded hash → changed | current | never-run) and activationAdvisoryLine is
// its pure rendering. Neither touches the filesystem, so the full branch
// enumeration lives in the unit tier (fs-tests-integration-first). BR-U6-1
// (determinism) and BR-U6-2 (never-run maps unreadable/absent to the advisory
// side, fail-closed) are pinned here at the pure layer; the FS-backed behaviour
// is in t320 (integration).

import { describe, expect, test } from "bun:test";
import {
  ACTIVATION_PLUGIN,
  activationAdvisoryLine,
  judgeActivation,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";

describe("t319 judgeActivation (pure 3-value map)", () => {
  test("equal current/last hash -> current (silent)", () => {
    const j = judgeActivation("sha256:aaa", "sha256:aaa");
    expect(j).toEqual({ kind: "current", hash: "sha256:aaa" });
  });

  test("differing current/last hash -> changed (carries both hashes)", () => {
    const j = judgeActivation("sha256:bbb", "sha256:aaa");
    expect(j).toEqual({ kind: "changed", currentHash: "sha256:bbb", lastHash: "sha256:aaa" });
  });

  test("absent/corrupt state (null last) -> never-run with the current hash", () => {
    const j = judgeActivation("sha256:ccc", null);
    expect(j).toEqual({ kind: "never-run", currentHash: "sha256:ccc" });
  });

  test("unreadable spec (null current) -> never-run, fail-closed to the advisory side", () => {
    // A null current hash (fail-closed spec read) must NOT silence the nudge:
    // it maps to never-run even when a recorded state exists.
    expect(judgeActivation(null, "sha256:aaa")).toEqual({ kind: "never-run", currentHash: "" });
    expect(judgeActivation(null, null)).toEqual({ kind: "never-run", currentHash: "" });
  });

  test("determinism (BR-U6-1): identical inputs -> identical judgment", () => {
    expect(judgeActivation("sha256:x", "sha256:y")).toEqual(judgeActivation("sha256:x", "sha256:y"));
  });
});

describe("t319 activationAdvisoryLine (pure rendering)", () => {
  test("current -> null (no advisory)", () => {
    expect(activationAdvisoryLine({ kind: "current", hash: "sha256:aaa" })).toBeNull();
  });

  test("changed -> one CHANGED line naming the explicit reach command", () => {
    const line = activationAdvisoryLine({ kind: "changed", currentHash: "sha256:b", lastHash: "sha256:a" });
    expect(line).not.toBeNull();
    expect(line).toContain(`${ACTIVATION_PLUGIN} spec hash CHANGED`);
    expect(line).toContain(`/amadeus --stage ${ACTIVATION_PLUGIN}`);
    expect(line!.includes("\n")).toBe(false); // single line
  });

  test("never-run -> one no-recorded-verdict line naming the explicit reach command", () => {
    const line = activationAdvisoryLine({ kind: "never-run", currentHash: "sha256:c" });
    expect(line).not.toBeNull();
    expect(line).toContain("no recorded verdict");
    expect(line).toContain(`/amadeus --stage ${ACTIVATION_PLUGIN}`);
    expect(line!.includes("\n")).toBe(false);
  });
});
