// Pi harness foundation: authored manifest, closed resource catalog, and paths.
// covers: scripts/harness-manifest.ts
// covers: packages/framework/harness/pi/manifest.ts
// size: small

import { describe, expect, test } from "bun:test";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";
// @ts-expect-error Bun's text loader supports Markdown; tsc has no *.md declaration.
import skill from "../../packages/framework/harness/pi/skills/amadeus/SKILL.md" with {
  type: "text",
};
import {
  isNormalizedRelativePath,
  validateHarnessManifest,
} from "../../scripts/harness-manifest.ts";

describe("Pi harness manifest", () => {
  test("routes fresh-workflow answers back through next instead of a verdict-only report", () => {
    expect(skill).toContain("For a fresh-workflow routing question");
    expect(skill).toMatch(/re-run\s+`next --scope <resolved scope> <original description>`/u);
    expect(skill).toMatch(/re-run\s+`next compose <original description>`/u);
    expect(skill).not.toContain(
      '`report --user-input "<resolved answer>"` without stage or result flags',
    );
  });

  test("requires phase verification before reporting a boundary approval", () => {
    expect(skill).toContain("directive.phase_boundary");
    expect(skill).toContain("phase-check-<phase>.md");
    expect(skill).toMatch(/before reporting approval/u);
  });

  test("keeps utility flags on the first engine call even with an active intent", () => {
    expect(skill).toContain("A bare `next` is a protocol violation");
    expect(skill).toContain("`--status` → `bun .pi/tools/amadeus-orchestrate.ts next --status`");
    expect(skill).toContain("An active intent does not override a utility flag");
  });

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
        kind: "extension",
        source: "extensions/subagent.ts",
        destination: ".pi/extensions/subagent.ts",
        load: "native",
      },
      {
        kind: "driver",
        source: "drivers/amadeus-pi-driver.ts",
        destination: ".pi/drivers/amadeus-pi-driver.ts",
        load: "internal",
      },
      {
        kind: "driver",
        source: "drivers/amadeus-pi-driver-contract.ts",
        destination: ".pi/drivers/amadeus-pi-driver-contract.ts",
        load: "internal",
      },
      {
        kind: "driver",
        source: "drivers/amadeus-pi-guardian.ts",
        destination: ".pi/drivers/amadeus-pi-guardian.ts",
        load: "internal",
      },
      {
        kind: "driver",
        source: "drivers/amadeus-pi-replay-store.ts",
        destination: ".pi/drivers/amadeus-pi-replay-store.ts",
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

  test("detects resource collisions after Unicode NFC normalization", () => {
    const composed = "skills/caf\u00e9.md";
    const decomposed = "skills/cafe\u0301.md";
    const malformed = {
      ...piManifest,
      resources: [
        { kind: "skill", source: composed, destination: `.pi/${composed}`, load: "native" },
        { kind: "skill", source: decomposed, destination: `.pi/${decomposed}`, load: "native" },
      ],
    };
    expect(validateHarnessManifest(malformed)).toEqual(expect.arrayContaining([
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

  test("rejects every untyped stage-entry and native-runtime shape", () => {
    expect(validateHarnessManifest({ ...piManifest, stageEntry: null })).toContain("stageEntry must be an object");
    expect(validateHarnessManifest({ ...piManifest, stageEntry: { kind: "unknown" } })).toContain(
      "stageEntry.kind must be runner or command",
    );
    expect(validateHarnessManifest({ ...piManifest, stageEntry: { kind: "runner", root: "../skills", extra: true } })).toEqual(
      expect.arrayContaining([
        expect.stringContaining("stageEntry has unknown field"),
        "stageEntry.root must be a normalized project-relative path",
      ]),
    );
    expect(validateHarnessManifest({ ...piManifest, stageEntry: { kind: "command", path: ".pi/command.ts" } })).toEqual([]);
    expect(validateHarnessManifest({ ...piManifest, stageEntry: { kind: "command", path: "/command.ts", extra: true } })).toEqual(
      expect.arrayContaining([
        expect.stringContaining("stageEntry has unknown field"),
        "stageEntry.path must be a normalized project-relative path",
      ]),
    );

    expect(validateHarnessManifest({ ...piManifest, nativeRuntime: null })).toContain("nativeRuntime must be an object");
    expect(validateHarnessManifest({
      ...piManifest,
      nativeRuntime: {
        package: "",
        minimumVersion: "",
        projectTrust: "managed",
        trustIsSandbox: true,
        autoApproveProjectTrust: true,
        mutateTrustStore: true,
        extra: true,
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("nativeRuntime has unknown field"),
      "nativeRuntime.package must be a non-empty string",
      "nativeRuntime.minimumVersion must be a non-empty string",
      "nativeRuntime.projectTrust must be native",
      "nativeRuntime.trustIsSandbox must be false",
      "nativeRuntime.autoApproveProjectTrust must be false",
      "nativeRuntime.mutateTrustStore must be false",
    ]));
  });

  test("rejects every untyped resource catalog shape", () => {
    expect(validateHarnessManifest({ ...piManifest, resources: null })).toContain("resources must be an array");
    expect(validateHarnessManifest({ ...piManifest, resources: [null] })).toContain("resources[0] must be an object");
    expect(validateHarnessManifest({
      ...piManifest,
      resources: [{ kind: "bogus", source: "../driver.ts", destination: "/driver.ts", load: "native", extra: true }],
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("resources[0] has unknown field"),
      "resources[0].source is unsafe",
      "resources[0].destination is unsafe",
      "resources[0].kind is invalid",
    ]));
    expect(validateHarnessManifest({
      ...piManifest,
      resources: [{ kind: "driver", source: "drivers/driver.ts", destination: 42, load: "internal" }],
    })).toContain("resources[0].destination is unsafe");
  });
  test("rejects every model-pin shape that could ship an unresolvable charter", () => {
    // The map is what turns a charter's tier alias into a model id, so a
    // malformed map would silently strand a persona on the harness default.
    expect(validateHarnessManifest({ ...piManifest, modelPins: [] }))
      .toContain("modelPins must be an object");
    expect(validateHarnessManifest({ ...piManifest, modelPins: {} }))
      .toContain("modelPins must declare at least one tier");
    expect(validateHarnessManifest({ ...piManifest, modelPins: { Opus: "claude-opus-5" } }))
      .toContain('modelPins alias "Opus" must be a lowercase tier token');
    expect(validateHarnessManifest({ ...piManifest, modelPins: { opus: "" } }))
      .toContain('modelPins["opus"] must be a harness-native model id');
    expect(validateHarnessManifest({ ...piManifest, modelPins: { opus: 5 } }))
      .toContain('modelPins["opus"] must be a harness-native model id');
    // The shipped map is well formed.
    expect(validateHarnessManifest(piManifest)).toEqual([]);
  });
});
