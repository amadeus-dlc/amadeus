// covers: function:workspaceRoot
//
// t223-settings-skeleton.test.ts — pins the pure (size: small) surface of the
// canonical settings model: packages/framework/core/tools/amadeus-settings.ts.
// Mechanism: none (pure in-process calls; zero fs, zero spawns — the
// fs-touching load() surface lives in tests/integration/t223-settings-load.test.ts
// so this file stays within the unit scope's small size budget).
// Technique: known-answer + fault-injection (malformed roots, unknown keys,
// type mismatches, all-modes-off, multi-violation collection).
//
// WHAT THIS PINS.
//   1. parse backfills absent interactionModes keys from DEFAULT_SETTINGS and
//      keeps explicit values; an absent interactionModes field yields all-true.
//   2. parse fails closed (no crash, non-empty errors) on broken JSON, JSONC
//      comments, an array root, and a null root.
//   3. parse is fail-closed on unknown keys (root + nested, with valid-key
//      list), non-boolean mode values, a non-object interactionModes, and the
//      all-modes-off state; multiple violations are collected in full.
//   4. settingsPath resolves to spaces/<space>/settings.json (pure derivation).
//   5. defaults() equals DEFAULT_SETTINGS and reports every mode enabled.
// size: small

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  ALL_MODES_DISABLED_ERROR,
  AmadeusSettings,
  DEFAULT_SETTINGS,
  INTERACTION_MODE_KEYS,
  SETTINGS_KNOWN_KEYS,
  settingsPath,
  typeMismatchError,
  unknownKeyError,
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

describe("t223 settings — fail-closed error policy (U2)", () => {
  test("an unknown top-level key is invalid with the valid-key list", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ unknownTop: 1 }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([unknownKeyError("unknownTop", SETTINGS_KNOWN_KEYS)]);
    expect(result.errors[0]).toBe("unknown key: unknownTop (valid keys: interactionModes)");
  });

  test("an unknown nested key is invalid with the mode-key list", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { foo: true } }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([unknownKeyError("interactionModes.foo", INTERACTION_MODE_KEYS)]);
    expect(result.errors[0]).toBe("unknown key: interactionModes.foo (valid keys: guideMe, grillMe, editFile, chat)");
  });

  test("a string in a mode position is a type mismatch", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: "yes" } }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([typeMismatchError("interactionModes.guideMe", "boolean", "string")]);
  });

  test("a number in a mode position is a type mismatch", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: 1 } }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([typeMismatchError("interactionModes.guideMe", "boolean", "number")]);
  });

  test("a null in a mode position is a type mismatch", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: null } }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([typeMismatchError("interactionModes.guideMe", "boolean", "object")]);
  });

  test("an array in a mode position is a type mismatch", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: [] } }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([typeMismatchError("interactionModes.guideMe", "boolean", "object")]);
  });

  test("a non-object interactionModes container is a type mismatch", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: "all" }));
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([typeMismatchError("interactionModes", "object", "string")]);
  });

  test("all four modes explicitly false is invalid (operationally dead)", () => {
    const result = AmadeusSettings.parse(
      JSON.stringify({ interactionModes: { guideMe: false, grillMe: false, editFile: false, chat: false } }),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([ALL_MODES_DISABLED_ERROR]);
  });

  test("three false plus one absent is valid (effective-value boundary)", () => {
    const result = AmadeusSettings.parse(
      JSON.stringify({ interactionModes: { guideMe: false, grillMe: false, editFile: false } }),
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual({
      guideMe: false,
      grillMe: false,
      editFile: false,
      chat: true,
    });
  });

  test("multiple violations are collected in full, not fail-fast", () => {
    const result = AmadeusSettings.parse(
      JSON.stringify({ unknownTop: 1, interactionModes: { guideMe: "yes" } }),
    );
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors).toEqual([
      unknownKeyError("unknownTop", SETTINGS_KNOWN_KEYS),
      typeMismatchError("interactionModes.guideMe", "boolean", "string"),
    ]);
  });

  test("JSONC comments remain a syntax error (regression of U1 behaviour)", () => {
    const result = AmadeusSettings.parse('{\n  // a comment\n  "interactionModes": {}\n}');
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain("invalid JSON");
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
