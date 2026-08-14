// packages/framework/core/tools/amadeus-plugin-settings.ts — the plugin.settings
// vocabulary (#2997, ADR-3). One definition of the lexical rules and the value
// shapes, shared by the three surfaces that judge them:
//
//   declaration  amadeus-plugin-compose.ts  parses plugin.json `settings`
//   override     amadeus-config.ts          parses the `plugin.settings` key
//   resolution   amadeus-sensor.ts          folds declaration + overrides
//
// The split is deliberate: config parsing happens without a composed plugin set
// (a config read can precede compose), so it can only judge the LEXICON — key
// shape, secret-name rejection, scalar values. Matching a value against the
// declared type and closed vocabulary is possible only at resolution time, and
// a mismatch there aborts the sensor rather than falling back to the default:
// silently defaulting a mistyped override is exactly the false confidence the
// fail-closed rule exists to prevent.

// A settings key: lowercase, dash-separated, bounded. The same class the config
// side applies to override keys so a key that can be declared can be overridden
// and vice versa.
export const SETTINGS_KEY_RE = /^[a-z][a-z0-9-]{0,63}$/;

// Keys whose NAME says "credential". Settings ride through argv and the audit
// trail, so the lexicon closes that door rather than trusting each plugin to.
export const SECRET_KEY_RE = /token|password|secret|credential|apikey|api-key/;

export type SettingType = "string" | "number" | "boolean" | "enum";

export type SettingScalar = string | number | boolean;

export interface SettingDeclaration {
  readonly type: SettingType;
  readonly default: SettingScalar;
  readonly values?: readonly string[];
  readonly description: string;
}

export type PluginSettingsDeclaration = Readonly<Record<string, SettingDeclaration>>;

export type PluginSettingsOverrides = Readonly<
  Record<string, Readonly<Record<string, SettingScalar>>>
>;

const SETTING_TYPES: readonly SettingType[] = ["string", "number", "boolean", "enum"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Parse the optional `settings` field of a plugin manifest. Absent yields
// undefined — a manifest written before this field existed keeps composing
// byte-identically, and "no declaration" is what the resolver reads as "this
// plugin takes no settings". Every violation is pushed onto the caller's error
// list, which the manifest parser rejects whole.
export function parseSettingsDeclaration(
  value: unknown,
  errors: string[],
): PluginSettingsDeclaration | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push("settings must be an object mapping keys to declarations");
    return undefined;
  }
  const out: Record<string, SettingDeclaration> = {};
  for (const [key, raw] of Object.entries(value)) {
    const declaration = parseOneDeclaration(key, raw, errors);
    if (declaration !== null) out[key] = declaration;
  }
  return out;
}

function parseOneDeclaration(
  key: string,
  raw: unknown,
  errors: string[],
): SettingDeclaration | null {
  if (!isRecord(raw)) {
    errors.push(`settings["${key}"] must be an object declaration`);
    return null;
  }
  const type = raw.type;
  if (!SETTING_TYPES.includes(type as SettingType)) {
    errors.push(
      `settings["${key}"].type must be one of ${SETTING_TYPES.join(" | ")}`,
    );
    return null;
  }
  return {
    type: type as SettingType,
    default: raw.default as SettingScalar,
    ...(Array.isArray(raw.values) ? { values: raw.values as readonly string[] } : {}),
    description: raw.description as string,
  };
}
