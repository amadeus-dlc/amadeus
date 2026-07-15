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
  SETTINGS_KNOWN_KEYS,
  settingsDoctorCheck,
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

// settingsDoctorCheck (U3): the in-process seam handleDoctor wires spawn-only.
// The three load outcomes map to three doctor rows; driving them here (fs, no
// spawn) covers the judgment the spawn-only wiring line does not.
describe("t223 settings skeleton — settingsDoctorCheck (doctor row seam)", () => {
  test("an absent file → pass with the defaults-in-effect label", () => {
    const projectDir = makeProjectDir("doctor-absent-");
    try {
      const row = settingsDoctorCheck(projectDir);
      expect(row.pass).toBe(true);
      expect(row.label).toContain("absent — defaults in effect");
      expect(row.fix).toBeUndefined();
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("a valid on-disk file → pass with the resolved path and 'valid'", () => {
    const projectDir = makeProjectDir("doctor-valid-");
    try {
      writeSettingsFile(projectDir, "default", JSON.stringify({ interactionModes: { chat: false } }));
      const row = settingsDoctorCheck(projectDir);
      expect(row.pass).toBe(true);
      expect(row.label).toContain(join("spaces", "default", "settings.json"));
      expect(row.label).toContain("valid");
      expect(row.fix).toBeUndefined();
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("an invalid file → fail, fix lists the valid keys (falling-down proof)", () => {
    const projectDir = makeProjectDir("doctor-invalid-");
    try {
      writeSettingsFile(projectDir, "default", JSON.stringify({ bogusKey: 1, interactionModes: { chat: true } }));
      const row = settingsDoctorCheck(projectDir);
      expect(row.pass).toBe(false);
      expect(row.label).toContain("invalid");
      expect(row.label).toContain(join("spaces", "default", "settings.json"));
      expect(row.fix).toBeDefined();
      expect(row.fix).toContain(`valid keys: ${SETTINGS_KNOWN_KEYS.join(", ")}`);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
