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

// The manifest's known top-level keys. `advisories` belongs to a separate
// parser and is listed here so an existing manifest carrying it is not read as
// a misspelling — the check below is deliberately narrow (ADR-3): it exists to
// stop `settings` from being typo'd into silence, not to close the manifest.
const KNOWN_MANIFEST_KEYS: ReadonlySet<string> = new Set([
  "name",
  "stages",
  "seams",
  "fragments",
  "tools",
  "sensors",
  "advisories",
  "settings",
]);

const SETTINGS_NEAR_MISS_DISTANCE = 2;

// A misspelled `settings` would otherwise compose cleanly with the whole
// declaration dropped — the plugin then runs on defaults and the author has no
// signal. Any unknown top-level key within edit distance 2 of "settings" is an
// error instead.
export function collectSettingsMisspellings(
  raw: Readonly<Record<string, unknown>>,
  errors: string[],
): void {
  for (const key of Object.keys(raw)) {
    if (KNOWN_MANIFEST_KEYS.has(key)) continue;
    if (editDistance(key.toLowerCase(), "settings") > SETTINGS_NEAR_MISS_DISTANCE) continue;
    errors.push(`unknown manifest key "${key}" — did you mean "settings"?`);
  }
}

// Levenshtein distance, iterative single-row. Inputs are manifest key names, so
// the quadratic cost is bounded by a handful of short strings.
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...new Array<number>(b.length).fill(0)];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

// Judge a key NAME against the shared lexicon. Returns the violation text so
// the declaration and override sides word the same rejection the same way.
export function settingsKeyViolation(key: string): string | null {
  if (!SETTINGS_KEY_RE.test(key)) {
    return `key name "${key}" must match ${SETTINGS_KEY_RE.source}`;
  }
  if (SECRET_KEY_RE.test(key)) {
    return `key "${key}" must not name a credential (${SECRET_KEY_RE.source})`;
  }
  return null;
}

function parseOneDeclaration(
  key: string,
  raw: unknown,
  errors: string[],
): SettingDeclaration | null {
  const keyViolation = settingsKeyViolation(key);
  if (keyViolation !== null) {
    errors.push(`settings ${keyViolation}`);
    return null;
  }
  if (!isRecord(raw)) {
    errors.push(`settings["${key}"] must be an object declaration`);
    return null;
  }
  const type = raw.type;
  if (!SETTING_TYPES.includes(type as SettingType)) {
    errors.push(`settings["${key}"].type must be one of ${SETTING_TYPES.join(" | ")}`);
    return null;
  }
  if (typeof raw.description !== "string" || raw.description.trim() === "") {
    errors.push(`settings["${key}"].description must be a non-empty string`);
    return null;
  }
  const values = parseEnumValues(key, type as SettingType, raw.values, errors);
  if (values === null) return null;
  if (!defaultMatches(type as SettingType, raw.default, values)) {
    errors.push(defaultViolation(key, type as SettingType, values));
    return null;
  }
  return {
    type: type as SettingType,
    default: raw.default as SettingScalar,
    ...(values === undefined ? {} : { values }),
    description: raw.description,
  };
}

// `values` is required by exactly one type and meaningless for the rest, so a
// stray list on a non-enum is a declaration error rather than dead data.
function parseEnumValues(
  key: string,
  type: SettingType,
  raw: unknown,
  errors: string[],
): readonly string[] | undefined | null {
  if (type !== "enum") {
    if (raw === undefined) return undefined;
    errors.push(`settings["${key}"].values is only meaningful for type enum`);
    return null;
  }
  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    raw.some((v) => typeof v !== "string" || v === "")
  ) {
    errors.push(`settings["${key}"].values must be a non-empty array of non-empty strings`);
    return null;
  }
  return raw as readonly string[];
}

// The one place declaration defaults and config overrides are judged against a
// declared type, so the two surfaces can never drift into disagreeing.
export function valueMatchesType(
  type: SettingType,
  value: unknown,
  values: readonly string[] | undefined,
): value is SettingScalar {
  if (type === "enum") return typeof value === "string" && (values ?? []).includes(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function defaultMatches(
  type: SettingType,
  value: unknown,
  values: readonly string[] | undefined,
): boolean {
  return valueMatchesType(type, value, values);
}

function defaultViolation(
  key: string,
  type: SettingType,
  values: readonly string[] | undefined,
): string {
  return type === "enum"
    ? `settings["${key}"].default must be one of ${(values ?? []).join(" | ")}`
    : `settings["${key}"].default must be a ${type}`;
}
