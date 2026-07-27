// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: small
//
// U2 walking-skeleton-claude — the pure seams of the plugin CLI. parseHostStageSeams
// is a pure byte→HostStage parser (no filesystem) and defaultPluginCliDeps builds
// the real dependency bag as plain closures (no filesystem at construction), so
// both belong in the unit tier (fs-tests-integration-first). buildHostSnapshot in
// t299 only ever feeds parseHostStageSeams full-markdown stage files (which fail
// the `stage:` first-line match), so the seam-parsing body is exercised here
// against the engine's own serializeStageSeams byte form.

import { afterEach, describe, expect, test } from "bun:test";
import { serializeStageSeams } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  defaultPluginCliDeps,
  defaultPluginHostRoot,
  parseHostStageSeams,
  pluginHostRootFromHook,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

describe("t301 parseHostStageSeams (pure)", () => {
  test("parses the serializeStageSeams byte form, empty and non-empty seams", () => {
    const bytes = serializeStageSeams("my-stage", {
      produces: ["a.md", "b.md"],
      consumes: [],
      sensors: ["amadeus-linter"],
      required_sections: ["Intro", "Body"],
    });
    const stage = parseHostStageSeams("plugins/p/stages/my-stage.md", bytes);
    expect(stage).not.toBeNull();
    expect(stage).toEqual({
      slug: "my-stage",
      path: "plugins/p/stages/my-stage.md",
      seams: {
        produces: ["a.md", "b.md"],
        consumes: [],
        sensors: ["amadeus-linter"],
        required_sections: ["Intro", "Body"],
      },
    });
  });

  test("returns null when the first line is not a stage line", () => {
    expect(parseHostStageSeams("SKILL.md", Buffer.from("# A markdown stage\nproduces: [x]\n"))).toBeNull();
  });

  test("returns null when a required seam line is missing", () => {
    // A `stage:` first line but no `sensors: [` line — a partial/foreign form.
    const bytes = Buffer.from("stage: s\nproduces: [a]\nconsumes: []\nrequired_sections: []\n");
    expect(parseHostStageSeams("plugins/p/stages/s.md", bytes)).toBeNull();
  });
});

describe("t301 defaultPluginCliDeps (real dependency bag)", () => {
  test("wires every dependency the CLI dispatch needs", () => {
    const deps = defaultPluginCliDeps();
    for (const key of [
      "discoverPlugins",
      "inspectPlugin",
      "applyPluginPlan",
      "planPluginDrop",
      "applyPluginDrop",
      "diagnosePlugins",
      "buildHostSnapshot",
      "makeBackend",
      "makeTx",
      "recompile",
      "recordDrops",
      "clearDrops",
      "out",
      "err",
    ] as const) {
      expect(typeof deps[key]).toBe("function");
    }
  });
});

// #1591 (ruling B): the plugin host root is the HARNESS dir, so compose writes
// where the engine reads (pluginActivationHostRoot / pluginsHostRoot). Both
// resolvers are pure over their injected script path, hence unit tier.
describe("t301 default plugin host root (#1591 ruling B)", () => {
  test("an installed CLI at <project>/<harness>/tools resolves the harness dir, ignoring cwd", () => {
    expect(defaultPluginHostRoot("/ws/.claude/tools", "/ws")).toBe("/ws/.claude");
    expect(defaultPluginHostRoot("/ws/.codex/tools", "/somewhere/else")).toBe("/ws/.codex");
  });

  test("the canonical source layout has no harness leaf, so the cwd stands in", () => {
    expect(defaultPluginHostRoot("/repo/packages/framework/core/tools", "/repo")).toBe("/repo");
  });

  test("a script that is not in a tools dir falls back to the cwd", () => {
    expect(defaultPluginHostRoot("/ws/.claude/hooks", "/ws")).toBe("/ws");
  });
});

describe("t301 hook plugin host root (#1591 ruling B)", () => {
  // CLAUDE_PROJECT_DIR is rung 2 of the shared hook ladder; driving it (and
  // passing no payload cwd) keeps this resolver test off the filesystem.
  const previous = process.env.CLAUDE_PROJECT_DIR;
  afterEach(() => {
    if (previous === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = previous;
  });
  const at = (path: string) => `file://${path}`;

  test("a hook installed at <project>/<harness>/hooks composes into that harness dir", () => {
    process.env.CLAUDE_PROJECT_DIR = "/ws";
    expect(pluginHostRootFromHook(at("/ws/.claude/hooks/h.ts"), null)).toBe("/ws/.claude");
    expect(pluginHostRootFromHook(at("/ws/.kimi-code/hooks/h.ts"), null)).toBe("/ws/.kimi-code");
  });

  test("the canonical source layout has no harness leaf, so the project dir is the host root", () => {
    process.env.CLAUDE_PROJECT_DIR = "/ws";
    expect(pluginHostRootFromHook(at("/repo/packages/framework/core/hooks/h.ts"), null)).toBe("/ws");
  });
});
