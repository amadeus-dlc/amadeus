// covers: domain:setup-engine-layout
// size: small
//
// engine-layout's harness → engine-directory mapping (FR-5a: kimi joins the
// enumeration as .kimi-code) and the allEngineDirNames scan list that
// installation detection iterates.

import { describe, expect, test } from "bun:test";
import { allEngineDirNames, engineDirNameFor } from "../../packages/setup/src/domain/engine-layout.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";

describe("engineDirNameFor", () => {
  test("resolves every known harness, kimi included (FR-5a)", () => {
    for (const harness of HarnessName.all) {
      expect(typeof engineDirNameFor(harness)).toBe("string");
    }
    const kimi = HarnessName.all.find((h) => (h as string) === "kimi");
    if (!kimi) throw new Error("fixture setup: 'kimi' must be a known harness");
    expect(engineDirNameFor(kimi)).toBe(".kimi-code");
  });

  test("edge case: kiro and kiro-ide share one directory name", () => {
    const kiro = HarnessName.all.find((h) => (h as string) === "kiro");
    const kiroIde = HarnessName.all.find((h) => (h as string) === "kiro-ide");
    if (!kiro || !kiroIde) throw new Error("fixture setup: kiro harnesses must be known");
    expect(engineDirNameFor(kiro)).toBe(engineDirNameFor(kiroIde));
  });
});

describe("allEngineDirNames", () => {
  test("includes .kimi-code so detection scans a kimi install (FR-5a)", () => {
    expect(allEngineDirNames()).toContain(".kimi-code");
  });

  test("edge case: has no duplicate entries (kiro/kiro-ide collapse to one)", () => {
    expect(new Set(allEngineDirNames()).size).toBe(allEngineDirNames().length);
  });
});
