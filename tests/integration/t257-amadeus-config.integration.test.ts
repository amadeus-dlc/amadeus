// t257 — real-filesystem three-mode mirror configuration resolution.
// covers: packages/framework/core/tools/amadeus-config.ts (readAmadeusConfigLayers, resolveAmadeusConfig)
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveAmadeusConfig } from "../../packages/framework/core/tools/amadeus-config.ts";

const INTENT = "260719-mirror-productization";
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-config-t257-"));
  roots.push(root);
  return root;
}

function paths(root: string, space: string, intent: string) {
  const base = join(root, "amadeus");
  return {
    project: join(base, "config.json"),
    space: join(base, "spaces", space, "config.json"),
    intent: join(base, "spaces", space, "intents", intent, "config.json"),
  };
}

function writeConfig(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
}

function mirror(mode: unknown): unknown {
  return { "intent-mirror": { github: { issue: { mode } } } };
}

function setActiveSpace(root: string, space: string): void {
  const base = join(root, "amadeus");
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, "active-space"), space, "utf-8");
}

function snapshot(root: string): string[] {
  const walk = (dir: string): string[] => {
    try {
      return readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) => {
          const path = join(dir, entry.name);
          return entry.isDirectory() ? walk(path) : [path];
        })
        .sort();
    } catch {
      return [];
    }
  };
  return walk(root).map((path) => `${path.slice(root.length)}\0${readFileSync(path, "utf-8")}`);
}

describe("t257 resolve against real files", () => {
  test("all three absent resolves to the default prompt mode", () => {
    const outcome = resolveAmadeusConfig(project(), INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.issue.mode).toBe("prompt");
      expect(outcome.sources).toEqual([]);
    }
  });

  test("intent wins over space and project", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("off"));
    writeConfig(p.space, mirror("off"));
    writeConfig(p.intent, mirror("auto"));
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.issue.mode).toBe("auto");
    }
  });

  test("project plugins resolve sorted and space/intent declarations fail project-only", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, {
      plugin: { activation: { names: ["zeta", "alpha"] } },
    });
    const resolved = resolveAmadeusConfig(root, INTENT);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind === "resolved") {
      expect(resolved.config.plugin.activation.names).toEqual(["alpha", "zeta"]);
    }

    writeConfig(p.space, {
      plugin: { activation: { names: ["alpha"] } },
    });
    const invalid = resolveAmadeusConfig(root, INTENT);
    expect(invalid.kind).toBe("invalid");
    if (invalid.kind === "invalid") {
      expect(invalid.issues[0]).toMatchObject({
        layer: "space",
        key: "plugin.activation.names",
        expected:
          "plugin.activation.names may be configured only in amadeus/config.json",
      });
    }
  });

  test("space wins over project when intent is absent", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("off"));
    writeConfig(p.space, mirror("auto"));
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.issue.mode).toBe("auto");
    }
  });

  test("an explicit intent directory is read", () => {
    const root = project();
    writeConfig(paths(root, "default", INTENT).intent, mirror("auto"));
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.issue.mode).toBe("auto");
      expect(outcome.sources).toEqual([
        join("amadeus", "spaces", "default", "intents", INTENT, "config.json"),
      ]);
    }
  });

  test("resolves within a non-default active space", () => {
    const root = project();
    setActiveSpace(root, "team");
    writeConfig(paths(root, "team", INTENT).intent, mirror("auto"));
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.issue.mode).toBe("auto");
    }
  });

  test("a single invalid layer fails the whole resolution", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("auto"));
    writeConfig(p.space, mirror("auto"));
    writeConfig(p.intent, mirror(true));
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues).toHaveLength(1);
      const issue = outcome.issues[0];
      expect(issue?.layer).toBe("intent");
      expect(issue?.kind).toBe("invalid-value");
      if (issue?.kind === "invalid-value") expect(issue.actualType).toBe("boolean");
    }
  });

  test("a dangling final-component symlink is rejected", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    mkdirSync(dirname(p.project), { recursive: true });
    symlinkSync(join(root, "amadeus", "does-not-exist.json"), p.project);
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("a directory at a config path is a loud read failure, not absent", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    mkdirSync(p.space, { recursive: true });
    const outcome = resolveAmadeusConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.layer).toBe("space");
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("rejects a config path swapped to an outside symlink before open", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("auto"));
    const outside = join(project(), "outside.json");
    writeConfig(outside, mirror("off"));
    const resolveWithHook = resolveAmadeusConfig as unknown as (
      projectDir: string,
      explicitIntentDir: string,
      explicitSpace: string | undefined,
      hooks: { beforeOpen(path: string): void },
    ) => ReturnType<typeof resolveAmadeusConfig>;
    let swapped = false;

    const outcome = resolveWithHook(root, INTENT, undefined, {
      beforeOpen(path) {
        if (path !== p.project || swapped) return;
        swapped = true;
        renameSync(p.project, `${p.project}.original`);
        symlinkSync(outside, p.project);
      },
    });

    expect(swapped).toBe(true);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("rejects a final-component symlink even when its target is contained", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    const target = join(root, "amadeus", "inside.json");
    writeConfig(target, mirror("auto"));
    symlinkSync(target, p.project);

    const outcome = resolveAmadeusConfig(root, INTENT);

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("rejects a regular file whose device/inode changes before open", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("auto"));
    const replacement = join(root, "amadeus", "replacement.json");
    writeConfig(replacement, mirror("off"));

    const outcome = resolveAmadeusConfig(root, INTENT, undefined, {
      beforeOpen(path) {
        if (path !== p.project) return;
        renameSync(p.project, `${p.project}.original`);
        renameSync(replacement, p.project);
      },
    });

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      const issue = outcome.issues[0];
      expect(issue?.kind).toBe("read-failure");
      if (issue?.kind === "read-failure") {
        expect(issue.summary).toContain("changed before open");
      }
    }
  });

  test("resolution never writes to the workspace", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.project, mirror("off"));
    writeConfig(p.space, {});
    writeConfig(p.intent, mirror("auto"));
    const before = snapshot(root);
    expect(resolveAmadeusConfig(root, INTENT).kind).toBe("resolved");
    expect(snapshot(root)).toEqual(before);
  });
});
