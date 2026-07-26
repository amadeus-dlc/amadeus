// t285 — closed Intent Mirror projection registry.
// covers: packages/framework/harness/projections.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  MIRROR_DOC_PROJECTIONS,
  MIRROR_PROJECTIONS,
  MIRROR_SURFACE_IDS,
  mirrorProjection,
  validateMirrorProjectionRegistry,
} from "../../packages/framework/harness/projections.ts";

describe("t285 projection registry", () => {
  test("owns exactly seven dist surfaces and five self-install surfaces", () => {
    expect(MIRROR_SURFACE_IDS).toEqual([
      "claude",
      "codex",
      "cursor",
      "kimi",
      "kiro",
      "kiro-ide",
      "opencode",
    ]);
    expect(MIRROR_PROJECTIONS).toHaveLength(7);
    expect(
      MIRROR_PROJECTIONS.filter(
        (projection) => projection.selfTool && projection.selfSkill,
      ).map((projection) => projection.surface),
    ).toEqual(["claude", "codex", "cursor", "kimi", "opencode"]);
  });

  test("paths are literal, confined, unique, and docs are a four-file pair set", () => {
    const paths = MIRROR_PROJECTIONS.flatMap((projection) => [
      projection.distTool,
      projection.distSkill,
      ...(projection.selfTool ? [projection.selfTool] : []),
      ...(projection.selfSkill ? [projection.selfSkill] : []),
    ]);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(false);
      expect(path.split("/")).not.toContain("..");
      expect(path.includes("\0")).toBe(false);
    }
    expect(MIRROR_DOC_PROJECTIONS).toHaveLength(4);
    expect(MIRROR_DOC_PROJECTIONS.filter((path) => path.endsWith(".ja.md"))).toHaveLength(2);
  });

  test("keeps Kiro and Kiro IDE distinct and Codex roots split", () => {
    expect(mirrorProjection("kiro").distTool).not.toBe(
      mirrorProjection("kiro-ide").distTool,
    );
    expect(mirrorProjection("codex").selfTool).toStartWith(".codex/");
    expect(mirrorProjection("codex").selfSkill).toStartWith(".agents/");
  });

  test("covers every wrapper and rejects path collisions and traversal", () => {
    expect(validateMirrorProjectionRegistry()).toEqual([]);
    for (const projection of MIRROR_PROJECTIONS) {
      expect(projection.artifacts.filter((item) => item.kind === "wrapper"))
        .toHaveLength(15);
      expect(projection.artifacts.some((item) => item.kind === "registration"))
        .toBe(true);
    }
    const base = MIRROR_PROJECTIONS[0];
    expect(validateMirrorProjectionRegistry([{
      ...base,
      artifacts: [
        ...base.artifacts,
        {
          ...base.artifacts[0],
          source: "../escape",
          distPath: base.artifacts[1].distPath,
        },
      ],
    }])).toEqual(expect.arrayContaining([
      expect.stringContaining("invalid path"),
      expect.stringContaining("collision"),
    ]));
    expect(validateMirrorProjectionRegistry([{
      ...base,
      artifacts: [{
        ...base.artifacts[0],
        kind: "unknown" as never,
        selfPath: null,
      }],
    }])).toEqual(expect.arrayContaining([
      expect.stringContaining("unknown artifact kind"),
      expect.stringContaining("included self-install path is missing"),
    ]));
  });

});
