// covers: function:workspaceRoot
//
// t223-settings-load.test.ts — pins the fs-touching load() surface of the
// canonical settings skeleton (U1): packages/framework/core/tools/
// amadeus-settings.ts. Mechanism: repo-external mkdtemp trees (no spawns, no
// LLM). Lives in the integration scope because filesystem access is
// medium-sized on the pyramid axis; the pure parse/defaults surface stays in
// tests/unit/t223-settings-skeleton.test.ts.
// Technique: known-answer + fault-injection (malformed file, ENOTDIR) + a
// wrong-location negative proving only spaces/<space>/settings.json is read.
// size: medium

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AmadeusSettings,
  DEFAULT_SETTINGS,
} from "../../packages/framework/core/tools/amadeus-settings.ts";

function makeProjectDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeSettingsFile(projectDir: string, space: string, contents: string): void {
  const dir = join(projectDir, "amadeus", "spaces", space);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "settings.json"), contents, "utf-8");
}

describe("t223 settings skeleton — load (fs boundary)", () => {
  test("an absent file loads defaults with source=defaults", () => {
    const projectDir = makeProjectDir("settings-absent-");
    try {
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("defaults");
      expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("an on-disk file loads with source=file", () => {
    const projectDir = makeProjectDir("settings-file-");
    try {
      writeSettingsFile(projectDir, "default", JSON.stringify({ interactionModes: { chat: false } }));
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("file");
      expect(result.settings.isModeEnabled("chat")).toBe(false);
      expect(result.settings.isModeEnabled("guideMe")).toBe(true);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("a malformed on-disk file fails closed with the resolved path", () => {
    const projectDir = makeProjectDir("settings-malformed-");
    try {
      writeSettingsFile(projectDir, "default", "{ not json");
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.errors[0]).toContain("invalid JSON");
      expect(result.path).toContain(join("spaces", "default", "settings.json"));
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("a non-ENOENT read failure fails closed (ENOTDIR injection)", () => {
    const projectDir = makeProjectDir("settings-enotdir-");
    try {
      const spacesDir = join(projectDir, "amadeus", "spaces");
      mkdirSync(join(projectDir, "amadeus"), { recursive: true });
      writeFileSync(spacesDir, "a regular file where the spaces directory should be");
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.errors[0]).toContain("failed to read settings");
      expect(result.path).toContain("settings.json");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("a settings.json outside spaces/<space>/ is not read", () => {
    const projectDir = makeProjectDir("settings-wrongloc-");
    try {
      const decoyDir = join(projectDir, "amadeus");
      mkdirSync(decoyDir, { recursive: true });
      writeFileSync(join(decoyDir, "settings.json"), JSON.stringify({ interactionModes: { chat: false } }), "utf-8");
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("defaults");
      expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
