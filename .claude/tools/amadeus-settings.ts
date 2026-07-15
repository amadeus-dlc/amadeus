// amadeus-settings.ts — canonical Amadeus settings model.
//
// WHAT THIS IS. The source-of-truth type + parse/load/defaults for the
// workspace settings file (`amadeus/spaces/<space>/settings.json`). Written in
// the functional-domain-modeling-ts style: class-free, a `type` carrying its
// instance behaviour, a companion `namespace` for the static surface (parse /
// load / defaults), a frozen literal built by an internal factory, and a
// discriminated-union Result for parse/load outcomes.
//
// VALIDATION SURFACE. parse is fail-closed: a JSON syntax error, a non-object
// root, an unknown key (root or nested), a non-boolean mode value, and the
// all-modes-off state each yield an `invalid` result. Violations are collected
// in full (not fail-fast) so one parse reports every problem. Only absent keys
// are backfilled from DEFAULT_SETTINGS; a present-but-malformed value is loud.
// Error strings come from the named generators below (unknownKeyError /
// typeMismatchError / ALL_MODES_DISABLED_ERROR) so the doctor check reuses one
// definition rather than re-authoring the wording.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeSpace, workspaceRoot } from "./amadeus-lib.ts";

// The interaction modes a user can toggle. Canonical order; the derivation
// source for docs, tests, and the doctor summary.
export const INTERACTION_MODE_KEYS = ["guideMe", "grillMe", "editFile", "chat"] as const;
export type InteractionModeKey = (typeof INTERACTION_MODE_KEYS)[number];

// Top-level settings keys. Declared canonically here so the unknown-key check
// reads one list; any root key outside this set is rejected.
export const SETTINGS_KNOWN_KEYS = ["interactionModes"] as const;

// Every interaction mode enabled — the default when no settings file exists and
// the backfill value for absent keys. Named constant so docs, tests, and doctor
// derive the default posture from one place.
export const DEFAULT_SETTINGS: Readonly<Record<InteractionModeKey, boolean>> = Object.freeze(
  Object.fromEntries(INTERACTION_MODE_KEYS.map((key) => [key, true])) as Record<InteractionModeKey, boolean>,
);

// Error-message generators — the single source for parse wording, reused by the
// doctor check (U3) so the fix text and parse errors never drift apart.
// `path` is dotted (`interactionModes.foo`); `validKeys` is the key set for the
// offending level, so the valid-keys list derives from the canonical constants.
export function unknownKeyError(path: string, validKeys: readonly string[]): string {
  return `unknown key: ${path} (valid keys: ${validKeys.join(", ")})`;
}

export function typeMismatchError(path: string, expected: string, got: string): string {
  return `type mismatch: ${path} expects ${expected}, got ${got}`;
}

export const ALL_MODES_DISABLED_ERROR = `all interaction modes disabled (at least one of ${INTERACTION_MODE_KEYS.join(", ")} must be true)`;

export type AmadeusSettings = {
  readonly interactionModes: Readonly<Record<InteractionModeKey, boolean>>;
  isModeEnabled(mode: InteractionModeKey): boolean;
};

export type SettingsParseResult =
  | { valid: true; settings: AmadeusSettings }
  | { valid: false; errors: string[] };

export type SettingsLoadResult =
  | { valid: true; settings: AmadeusSettings; source: "file" | "defaults" }
  | { valid: false; errors: string[]; path: string };

// Internal factory: the only constructor of an AmadeusSettings value. Freezes
// the interactionModes record and the wrapper so no invalid/mutated instance
// can escape (domain-entities.md: instance behaviour via closure).
function createSettings(interactionModes: Readonly<Record<InteractionModeKey, boolean>>): AmadeusSettings {
  const frozenModes = Object.freeze({ ...interactionModes });
  return Object.freeze({
    interactionModes: frozenModes,
    isModeEnabled(mode: InteractionModeKey): boolean {
      return frozenModes[mode];
    },
  });
}

// Backfill absent mode keys from DEFAULT_SETTINGS. Callers pass an
// already-validated modes object (every present value is a boolean) or
// undefined when the field is absent; only the fill-from-default path runs here.
function buildInteractionModes(source: Record<string, unknown> | undefined): Readonly<Record<InteractionModeKey, boolean>> {
  const result = {} as Record<InteractionModeKey, boolean>;
  for (const key of INTERACTION_MODE_KEYS) {
    const value = source?.[key];
    result[key] = typeof value === "boolean" ? value : DEFAULT_SETTINGS[key];
  }
  return Object.freeze(result);
}

// A plain object (not null, not an array). Used to gate both the root and the
// interactionModes container before their keys are scanned.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Collect unknown-key and type-mismatch violations under interactionModes into
// `errors`, and return the validated modes object for backfill (undefined when
// the field is absent). A present-but-non-object container is a type mismatch.
function collectModeErrors(raw: unknown, errors: string[]): Record<string, unknown> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    errors.push(typeMismatchError("interactionModes", "object", typeof raw));
    return undefined;
  }
  for (const key of Object.keys(raw)) {
    if (!(INTERACTION_MODE_KEYS as readonly string[]).includes(key)) {
      errors.push(unknownKeyError(`interactionModes.${key}`, INTERACTION_MODE_KEYS));
    }
  }
  for (const key of INTERACTION_MODE_KEYS) {
    const value = raw[key];
    if (value !== undefined && typeof value !== "boolean") {
      errors.push(typeMismatchError(`interactionModes.${key}`, "boolean", typeof value));
    }
  }
  return raw;
}

function isEnoent(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ENOENT";
}

// `amadeus/spaces/<space>/settings.json` — the sole settings location. No
// fallback search: only this path is read (mirrors intentsDir's derivation).
export function settingsPath(projectDir: string, space?: string): string {
  const sp = space ?? activeSpace(projectDir);
  return join(workspaceRoot(projectDir), "spaces", sp, "settings.json");
}

export namespace AmadeusSettings {
  // Pure, throw-free JSON → settings parser, fail-closed. Order: JSON syntax →
  // non-object root → unknown keys (root then nested) and mode type mismatches
  // (all collected) → absent-key backfill → all-modes-off guard on the
  // effective values. Any collected violation, or an all-off effective state,
  // yields an invalid result listing every problem.
  export function parse(text: string): SettingsParseResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, errors: [`invalid JSON: ${message}`] };
    }
    if (!isPlainObject(parsed)) {
      return { valid: false, errors: [`settings root must be an object, got ${typeof parsed}`] };
    }
    const errors: string[] = [];
    for (const key of Object.keys(parsed)) {
      if (!(SETTINGS_KNOWN_KEYS as readonly string[]).includes(key)) {
        errors.push(unknownKeyError(key, SETTINGS_KNOWN_KEYS));
      }
    }
    const modes = collectModeErrors(parsed.interactionModes, errors);
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    const interactionModes = buildInteractionModes(modes);
    if (INTERACTION_MODE_KEYS.every((key) => interactionModes[key] === false)) {
      return { valid: false, errors: [ALL_MODES_DISABLED_ERROR] };
    }
    return { valid: true, settings: createSettings(interactionModes) };
  }

  // Read `settings.json` from disk. ENOENT (absent file) → defaults; every other
  // read failure and any parse error is fail-closed as an invalid result with
  // the resolved path attached.
  export function load(projectDir: string, space?: string): SettingsLoadResult {
    const path = settingsPath(projectDir, space);
    let text: string;
    try {
      text = readFileSync(path, "utf-8");
    } catch (err) {
      if (isEnoent(err)) {
        return { valid: true, settings: defaults(), source: "defaults" };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, errors: [`failed to read settings: ${message}`], path };
    }
    const result = parse(text);
    if (!result.valid) {
      return { valid: false, errors: result.errors, path };
    }
    return { valid: true, settings: result.settings, source: "file" };
  }

  export function defaults(): AmadeusSettings {
    return createSettings(DEFAULT_SETTINGS);
  }
}

Object.freeze(AmadeusSettings);
