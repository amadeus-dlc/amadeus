// covers: function:workspaceRoot
//
// t223-settings-skeleton.test.ts — pins the pure (size: small) surface of the
// canonical settings skeleton (U1): packages/framework/core/tools/
// amadeus-settings.ts. Mechanism: none (pure in-process calls; zero fs, zero
// spawns — the fs-touching load() surface lives in
// tests/integration/t223-settings-load.test.ts so this file stays within the
// unit scope's small size budget).
// Technique: known-answer + fault-injection (malformed roots).
//
// WHAT THIS PINS.
//   1. parse backfills absent interactionModes keys from DEFAULT_SETTINGS and
//      keeps explicit values; an absent interactionModes field yields all-true.
//   2. parse fails closed (no crash, non-empty errors) on broken JSON, JSONC
//      comments, an array root, and a null root.
//   3. settingsPath resolves to spaces/<space>/settings.json (pure derivation).
//   4. defaults() equals DEFAULT_SETTINGS and reports every mode enabled.
// size: small

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  AmadeusSettings,
  DEFAULT_SETTINGS,
  INTERACTION_MODE_KEYS,
  SETTINGS_KNOWN_KEYS,
  settingsPath,
} from "../../packages/framework/core/tools/amadeus-settings.ts";

describe("t223 settings skeleton — parse", () => {
  test("all keys specified are read verbatim", () => {
    const result = AmadeusSettings.parse(
      JSON.stringify({ interactionModes: { guideMe: false, grillMe: true, editFile: false, chat: true } }),
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual({
      guideMe: false,
      grillMe: true,
      editFile: false,
      chat: true,
    });
  });

  test("absent keys are backfilled from DEFAULT_SETTINGS", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: false } }));
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual({
      guideMe: false,
      grillMe: true,
      editFile: true,
      chat: true,
    });
  });

  test("an absent interactionModes field yields all-true", () => {
    const result = AmadeusSettings.parse(JSON.stringify({}));
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
  });

  test("broken JSON fails closed with a non-empty error", () => {
    const result = AmadeusSettings.parse("{ not json");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("invalid JSON");
  });

  test("JSONC comments are not valid JSON and fail closed", () => {
    const result = AmadeusSettings.parse('{\n  // a comment\n  "interactionModes": {}\n}');
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("an array root fails closed", () => {
    const result = AmadeusSettings.parse("[]");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain("settings root must be an object");
  });

  test("a null root fails closed", () => {
    const result = AmadeusSettings.parse("null");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain("settings root must be an object");
  });
});

describe("t223 settings skeleton — settingsPath (pure derivation)", () => {
  test("settingsPath resolves to spaces/<space>/settings.json", () => {
    expect(settingsPath("/some/project", "default")).toBe(
      join("/some/project", "amadeus", "spaces", "default", "settings.json"),
    );
  });
});

describe("t223 settings skeleton — defaults + canonical constants", () => {
  test("defaults() equals DEFAULT_SETTINGS and enables every mode", () => {
    const settings = AmadeusSettings.defaults();
    expect(settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    for (const key of INTERACTION_MODE_KEYS) {
      expect(settings.isModeEnabled(key)).toBe(true);
    }
  });

  test("canonical key lists are the documented shape", () => {
    expect(INTERACTION_MODE_KEYS).toEqual(["guideMe", "grillMe", "editFile", "chat"]);
    expect(SETTINGS_KNOWN_KEYS).toContain("interactionModes");
  });
});
