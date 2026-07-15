// amadeus-settings.ts — canonical Amadeus settings model (skeleton).
//
// WHAT THIS IS. The source-of-truth type + parse/load/defaults for the
// workspace settings file (`amadeus/spaces/<space>/settings.json`). Written in
// the functional-domain-modeling-ts style: class-free, a `type` carrying its
// instance behaviour, a companion `namespace` for the static surface (parse /
// load / defaults), a branded frozen literal built by an internal factory, and
// a discriminated-union Result for parse/load outcomes.
//
// U1 SCOPE (this Bolt). Only the happy-path shape is modelled: parse a JSON
// object, fill absent interactionModes keys from DEFAULT_SETTINGS, and load a
// file with a fail-closed read boundary. The richer validation surface —
// unknown-key rejection, per-key type-mismatch errors, and the all-modes-off
// guard — is deferred to U2 and NOT implemented here.
//
// PROVISIONAL U1 BEHAVIOUR (replaced in U2). parse adopts an interactionModes
// value only when it is a boolean; any non-boolean value is silently backfilled
// from DEFAULT_SETTINGS rather than rejected. U2 replaces this backfill with an
// `invalid` result so malformed values become loud parse errors.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeSpace, workspaceRoot } from "./amadeus-lib.ts";

// The interaction modes a user can toggle. Canonical order; the derivation
// source for docs, tests, and the doctor summary.
export const INTERACTION_MODE_KEYS = ["guideMe", "grillMe", "editFile", "chat"] as const;
export type InteractionModeKey = (typeof INTERACTION_MODE_KEYS)[number];

// Top-level settings keys U2 will validate against. Declared canonically here
// so the unknown-key check has one list to read; U1 does not yet enforce it.
export const SETTINGS_KNOWN_KEYS = ["interactionModes"] as const;

// Every interaction mode enabled — the default when no settings file exists and
// the backfill value for absent/non-boolean keys. Named constant so docs, tests,
// and doctor derive the default posture from one place.
export const DEFAULT_SETTINGS: Readonly<Record<InteractionModeKey, boolean>> = Object.freeze(
  Object.fromEntries(INTERACTION_MODE_KEYS.map((key) => [key, true])) as Record<InteractionModeKey, boolean>,
);

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

// U1 backfill: adopt a per-mode value only when it is a boolean, otherwise take
// DEFAULT_SETTINGS. A non-object interactionModes field yields all defaults.
// U2 replaces the non-boolean branch with an invalid parse result.
function buildInteractionModes(raw: unknown): Readonly<Record<InteractionModeKey, boolean>> {
  const source = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result = {} as Record<InteractionModeKey, boolean>;
  for (const key of INTERACTION_MODE_KEYS) {
    const value = source[key];
    result[key] = typeof value === "boolean" ? value : DEFAULT_SETTINGS[key];
  }
  return Object.freeze(result);
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
  // Pure, throw-free JSON → settings parser. Fails on JSON syntax errors and on
  // a non-object root (arrays and null included); otherwise backfills absent
  // interactionModes keys from DEFAULT_SETTINGS (U1 scope).
  export function parse(text: string): SettingsParseResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, errors: [`invalid JSON: ${message}`] };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { valid: false, errors: [`settings root must be an object, got ${typeof parsed}`] };
    }
    const root = parsed as Record<string, unknown>;
    return { valid: true, settings: createSettings(buildInteractionModes(root.interactionModes)) };
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
