// Pi harness foundation: authored manifest, closed resource catalog, and paths.
// covers: scripts/harness-manifest.ts
// covers: packages/framework/harness/pi/manifest.ts
// size: small

import { describe, expect, test } from "bun:test";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";
import {
  isNormalizedRelativePath,
  validateHarnessManifest,
} from "../../scripts/harness-manifest.ts";

describe("Pi harness manifest", () => {
  test("declares the native runtime, canonical stage entry, and closed resource catalog", () => {
    expect(validateHarnessManifest(piManifest)).toEqual([]);
    expect(piManifest.stageEntry).toEqual({ kind: "runner", root: ".pi/skills" });
    expect(piManifest.nativeRuntime).toEqual({
      package: "@earendil-works/pi-coding-agent",
      minimumVersion: "0.83.0",
      projectTrust: "native",
      trustIsSandbox: false,
      autoApproveProjectTrust: false,
      mutateTrustStore: false,
    });
    expect(piManifest.resources).toEqual([
      {
        kind: "skill",
        source: "skills/amadeus/SKILL.md",
        destination: ".pi/skills/amadeus/SKILL.md",
        load: "native",
      },
      {
        kind: "question-annex",
        source: "skills/amadeus/question-rendering.md",
        destination: ".pi/skills/amadeus/question-rendering.md",
        load: "annex",
      },
      {
        kind: "extension",
        source: "extensions/amadeus-pi-extension.ts",
        destination: ".pi/extensions/amadeus.ts",
        load: "native",
      },
      {
        kind: "driver",
        source: "drivers/amadeus-pi-driver.ts",
        destination: ".pi/drivers/amadeus-pi-driver.ts",
        load: "internal",
      },
    ]);
  });

  test("rejects traversal, absolute, NUL, backslash, and non-normalized paths", () => {
    for (const path of ["", "../x", "/x", "C:/x", "a\0b", "a\\b", "a//b", "a/./b"]) {
      expect(isNormalizedRelativePath(path)).toBe(false);
    }
    expect(isNormalizedRelativePath(".pi/extensions/amadeus.ts")).toBe(true);
  });

  test("rejects unknown fields and case-folding resource collisions", () => {
    const malformed = {
      ...piManifest,
      unexpected: true,
      resources: [
        piManifest.resources?.[0],
        {
          ...piManifest.resources?.[0],
          source: "SKILLS/AMADEUS/SKILL.md",
          destination: ".PI/SKILLS/AMADEUS/SKILL.MD",
        },
      ],
    };
    expect(validateHarnessManifest(malformed)).toEqual(expect.arrayContaining([
      expect.stringContaining("unknown field"),
      expect.stringContaining("case-folding"),
    ]));
  });

  test("rejects resources outside the declared harness directory and wrong loader roles", () => {
    const malformed = {
      ...piManifest,
      resources: [{
        kind: "driver",
        source: "drivers/amadeus-pi-driver.ts",
        destination: ".other/amadeus-pi-driver.ts",
        load: "native",
      }],
    };
    expect(validateHarnessManifest(malformed)).toEqual(expect.arrayContaining([
      expect.stringContaining("must be beneath .pi"),
      expect.stringContaining("load must be internal"),
    ]));
  });
});
