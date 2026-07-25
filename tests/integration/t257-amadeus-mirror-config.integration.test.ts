// t257 — real-filesystem three-mode mirror configuration resolution.
// covers: packages/framework/core/tools/amadeus-mirror-config.ts (readMirrorConfigLayers, resolveMirrorConfig)
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
import { resolveMirrorConfig } from "../../packages/framework/core/tools/amadeus-mirror-config.ts";

const INTENT = "260719-mirror-productization";
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-config-t257-"));
  roots.push(root);
  return root;
}

function paths(root: string, space: string, intent: string) {
  const base = join(root, "amadeus");
  return {
    global: join(base, "config.json"),
    space: join(base, "spaces", space, "config.json"),
    intent: join(base, "spaces", space, "intents", intent, "config.json"),
  };
}

function writeConfig(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
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
    expect(resolveMirrorConfig(project(), INTENT)).toEqual({
      kind: "resolved",
      config: { autoMirror: "prompt" },
      sources: [],
    });
  });

  test("intent wins over space and global", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.global, { "auto-mirror": "off" });
    writeConfig(p.space, { "auto-mirror": "off" });
    writeConfig(p.intent, { "auto-mirror": "auto" });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") expect(outcome.config.autoMirror).toBe("auto");
  });

  test("space wins over global when intent is absent", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.global, { "auto-mirror": "off" });
    writeConfig(p.space, { "auto-mirror": "auto" });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") expect(outcome.config.autoMirror).toBe("auto");
  });

  test("an explicit intent directory is read", () => {
    const root = project();
    writeConfig(paths(root, "default", INTENT).intent, { "auto-mirror": "auto" });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.autoMirror).toBe("auto");
      expect(outcome.sources).toEqual([
        join("amadeus", "spaces", "default", "intents", INTENT, "config.json"),
      ]);
    }
  });

  test("resolves within a non-default active space", () => {
    const root = project();
    setActiveSpace(root, "team");
    writeConfig(paths(root, "team", INTENT).intent, { "auto-mirror": "auto" });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") expect(outcome.config.autoMirror).toBe("auto");
  });

  test("a single invalid layer fails the whole resolution", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.global, { "auto-mirror": "auto" });
    writeConfig(p.space, { "auto-mirror": "auto" });
    writeConfig(p.intent, { "auto-mirror": true });
    const outcome = resolveMirrorConfig(root, INTENT);
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
    mkdirSync(dirname(p.global), { recursive: true });
    symlinkSync(join(root, "amadeus", "does-not-exist.json"), p.global);
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("a directory at a config path is a loud read failure, not absent", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    mkdirSync(p.space, { recursive: true });
    const outcome = resolveMirrorConfig(root, INTENT);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.layer).toBe("space");
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("rejects a config path swapped to an outside symlink before open", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.global, { "auto-mirror": "auto" });
    const outside = join(project(), "outside.json");
    writeConfig(outside, { "auto-mirror": "off" });
    const resolveWithHook = resolveMirrorConfig as unknown as (
      projectDir: string,
      explicitIntentDir: string,
      explicitSpace: string | undefined,
      hooks: { beforeOpen(path: string): void },
    ) => ReturnType<typeof resolveMirrorConfig>;
    let swapped = false;

    const outcome = resolveWithHook(root, INTENT, undefined, {
      beforeOpen(path) {
        if (path !== p.global || swapped) return;
        swapped = true;
        renameSync(p.global, `${p.global}.original`);
        symlinkSync(outside, p.global);
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
    writeConfig(target, { "auto-mirror": "auto" });
    symlinkSync(target, p.global);

    const outcome = resolveMirrorConfig(root, INTENT);

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues[0]?.kind).toBe("read-failure");
    }
  });

  test("rejects a regular file whose device/inode changes before open", () => {
    const root = project();
    const p = paths(root, "default", INTENT);
    writeConfig(p.global, { "auto-mirror": "auto" });
    const replacement = join(root, "amadeus", "replacement.json");
    writeConfig(replacement, { "auto-mirror": "off" });

    const outcome = resolveMirrorConfig(root, INTENT, undefined, {
      beforeOpen(path) {
        if (path !== p.global) return;
        renameSync(p.global, `${p.global}.original`);
        renameSync(replacement, p.global);
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
    writeConfig(p.global, { "auto-mirror": "off" });
    writeConfig(p.space, {});
    writeConfig(p.intent, { "auto-mirror": "auto" });
    const before = snapshot(root);
    expect(resolveMirrorConfig(root, INTENT).kind).toBe("resolved");
    expect(snapshot(root)).toEqual(before);
  });
});
