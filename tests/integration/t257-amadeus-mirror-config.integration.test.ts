// t257 — real-filesystem mirror configuration resolution.
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  mirrorConfigPaths,
  resolve,
} from "../../packages/framework/core/tools/amadeus-mirror-config.ts";

const SPACE = "default";
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

function writeConfig(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
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
  test("all three absent resolves to the deterministic off default", () => {
    expect(resolve(project(), SPACE, INTENT)).toEqual({
      kind: "resolved",
      config: { autoMirror: false },
    });
  });

  test("intent wins over space and global", () => {
    const root = project();
    const paths = mirrorConfigPaths(root, SPACE, INTENT);
    writeConfig(paths.global, { "auto-mirror": false });
    writeConfig(paths.space, { "auto-mirror": false });
    writeConfig(paths.intent, { "auto-mirror": true });
    expect(resolve(root, SPACE, INTENT)).toEqual({
      kind: "resolved",
      config: { autoMirror: true },
    });
  });

  test("space wins over global when intent is absent", () => {
    const root = project();
    const paths = mirrorConfigPaths(root, SPACE, INTENT);
    writeConfig(paths.global, { "auto-mirror": false });
    writeConfig(paths.space, { "auto-mirror": true });
    expect(resolve(root, SPACE, INTENT)).toEqual({
      kind: "resolved",
      config: { autoMirror: true },
    });
  });

  test.each(["global", "space", "intent"] as const)(
    "an invalid %s layer fails the whole resolution",
    (invalidLayer) => {
      const root = project();
      const paths = mirrorConfigPaths(root, SPACE, INTENT);
      writeConfig(paths.global, { "auto-mirror": true });
      writeConfig(paths.space, { "auto-mirror": true });
      writeConfig(paths.intent, { "auto-mirror": true });
      writeConfig(paths[invalidLayer], { unknown: true, "auto-mirror": "yes" });
      const result = resolve(root, SPACE, INTENT);
      expect(result.kind).toBe("invalid");
      if (result.kind === "invalid") {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.layer).toBe(invalidLayer);
        expect(result.errors[0]?.errors).toHaveLength(2);
      }
    },
  );

  test("a dangling symlink is absent", () => {
    const root = project();
    const paths = mirrorConfigPaths(root, SPACE, INTENT);
    mkdirSync(dirname(paths.global), { recursive: true });
    symlinkSync(join(root, "does-not-exist.json"), paths.global);
    expect(resolve(root, SPACE, INTENT)).toEqual({
      kind: "resolved",
      config: { autoMirror: false },
    });
  });

  test("a directory at a config path is invalid rather than absent", () => {
    const root = project();
    const paths = mirrorConfigPaths(root, SPACE, INTENT);
    mkdirSync(paths.space, { recursive: true });
    const result = resolve(root, SPACE, INTENT);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.errors[0]?.layer).toBe("space");
  });

  test("a regular file in a parent path produces a loud ENOTDIR-style invalid", () => {
    const root = project();
    const spaces = join(root, "amadeus", "spaces");
    mkdirSync(dirname(spaces), { recursive: true });
    writeFileSync(spaces, "not a directory", "utf-8");
    const result = resolve(root, SPACE, INTENT);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.errors.map((error) => error.layer)).toEqual(["space", "intent"]);
    }
  });

  test("resolution is read-only", () => {
    const root = project();
    const paths = mirrorConfigPaths(root, SPACE, INTENT);
    writeConfig(paths.global, { "auto-mirror": false });
    writeConfig(paths.space, {});
    writeConfig(paths.intent, { "auto-mirror": true });
    const before = snapshot(root);
    expect(resolve(root, SPACE, INTENT).kind).toBe("resolved");
    expect(snapshot(root)).toEqual(before);
  });
});
