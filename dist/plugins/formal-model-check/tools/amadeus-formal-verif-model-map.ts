import { createHash } from "node:crypto";
import { posix } from "node:path";

export interface CanonicalIdentity {
  bytes: Uint8Array;
  sha256: string;
}

export interface CanonicalCounters {
  serializations: number;
  hashes: number;
  encodedBytes: number;
}

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number is not canonical JSON");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      out[key] = normalize(source[key]);
    }
    return out;
  }
  throw new TypeError(`unsupported canonical JSON value: ${typeof value}`);
}

export function canonicalIdentity(
  value: unknown,
  domain = "amadeus.formal-verif.value.v1",
  counters?: CanonicalCounters,
): CanonicalIdentity {
  const json = JSON.stringify(normalize(value));
  const bytes = new TextEncoder().encode(json);
  const sha256 = createHash("sha256").update(domain).update("\0").update(bytes).digest("hex");
  if (counters) {
    counters.serializations++;
    counters.hashes++;
    counters.encodedBytes += bytes.byteLength;
  }
  return { bytes, sha256 };
}

// The model the TLC execution pipeline runs. The map registers every model that
// is watched for source drift; only this one is executed, so the run/verify
// toolchain keeps a single module binding.
export const TLA_EXECUTION_MODEL_NAME = "FormalElection";
export const TLA_MODEL_PATH = `specs/tla/${TLA_EXECUTION_MODEL_NAME}.tla`;
export const TLA_CFG_PATH = `specs/tla/${TLA_EXECUTION_MODEL_NAME}.cfg`;
export const TLA_MODEL_MAP_PATH = "specs/tla/model-map.json";
export const TLA_MODEL_MAP_SCHEMA_VERSION = 2 as const;

export function tlaModelPath(name: string): string {
  return `specs/tla/${name}.tla`;
}

export function tlaCfgPath(name: string): string {
  return `specs/tla/${name}.cfg`;
}

// Quoted by both the completeness sensor and the source loader so the recovery
// step a reader is given cannot fork between them.
export const IMPL_ONLY_UPDATE_HINT =
  "when the model and configuration are unchanged, refresh implementation hashes with `updateModelMap --impl-only`";

export type ModelLoadErrorCode =
  | "MODEL_MISSING"
  | "CFG_MISSING"
  | "MODEL_EMPTY"
  | "CFG_EMPTY"
  | "MODEL_UNREADABLE"
  | "CFG_UNREADABLE"
  | "MODEL_MAP_MISSING"
  | "MODEL_MAP_EMPTY"
  | "MODEL_MAP_UNREADABLE"
  | "MODEL_MAP_INVALID";

export interface ModelLoadError {
  readonly kind: "MODEL_LOAD";
  readonly code: ModelLoadErrorCode;
  readonly relativePath: string;
  readonly detail: string;
  readonly cause?: unknown;
}

export interface ModelMapAssetIdentity {
  readonly path: string;
  readonly identity: string;
}

export interface ModelMapEntry {
  readonly implPath: string;
  readonly sha256: string;
}

export interface ModelVocabulary {
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}

export interface ModelMapModel {
  readonly name: string;
  readonly model: ModelMapAssetIdentity;
  readonly cfg: ModelMapAssetIdentity;
  readonly auxiliaries?: readonly ModelMapAssetIdentity[];
  readonly entries: readonly ModelMapEntry[];
  readonly vocabulary?: ModelVocabulary;
}

export interface ModelMap {
  readonly schemaVersion: 2;
  readonly models: readonly ModelMapModel[];
}

export interface ModelMapDrift {
  readonly implPath: string;
  readonly recorded: string;
  readonly current: string | null;
}

type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const SHA256 = /^[0-9a-f]{64}$/;
const IMPLEMENTATION_PREFIX = "packages/framework/core/tools/";
const IMPLEMENTATION_FILE = /^amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;
// TLA module identifiers, which also fix the specs/tla file names a model owns.
const MODEL_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

function invalid(detail: string): Result<never, ModelLoadError> {
  return {
    ok: false,
    error: {
      kind: "MODEL_LOAD",
      code: "MODEL_MAP_INVALID",
      relativePath: TLA_MODEL_MAP_PATH,
      detail,
    },
  };
}

function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function parseAssetIdentity(
  value: unknown,
  expectedPath: string,
  label: string,
): Result<ModelMapAssetIdentity, ModelLoadError> {
  if (!exactObject(value, ["identity", "path"])) {
    return invalid(`${label} must have exactly identity and path`);
  }
  if (value.path !== expectedPath) return invalid(`${label}.path must be ${expectedPath}`);
  if (typeof value.identity !== "string" || !SHA256.test(value.identity)) {
    return invalid(`${label}.identity must be a lowercase SHA-256 value`);
  }
  return { ok: true, value: { path: value.path, identity: value.identity } };
}

function isCanonicalImplementationPath(value: unknown): value is string {
  if (typeof value !== "string" || value.includes("\\") || posix.isAbsolute(value)) return false;
  if (posix.normalize(value) !== value || value.split("/").includes("..")) return false;
  if (!value.startsWith(IMPLEMENTATION_PREFIX)) return false;
  return IMPLEMENTATION_FILE.test(posix.basename(value));
}

function parseEntries(value: unknown): Result<readonly ModelMapEntry[], ModelLoadError> {
  if (!Array.isArray(value) || value.length === 0) {
    return invalid("entries must be a non-empty array");
  }
  const entries: ModelMapEntry[] = [];
  let previousPath = "";
  for (const [index, candidate] of value.entries()) {
    if (!exactObject(candidate, ["implPath", "sha256"])) {
      return invalid(`entries[${index}] must have exactly implPath and sha256`);
    }
    if (!isCanonicalImplementationPath(candidate.implPath)) {
      return invalid(
        `entries[${index}].implPath is outside the canonical implementation boundary`,
      );
    }
    if (typeof candidate.sha256 !== "string" || !SHA256.test(candidate.sha256)) {
      return invalid(`entries[${index}].sha256 must be a lowercase SHA-256 value`);
    }
    if (candidate.implPath <= previousPath) {
      return invalid("entries must be unique and sorted by implPath");
    }
    entries.push({ implPath: candidate.implPath, sha256: candidate.sha256 });
    previousPath = candidate.implPath;
  }
  return { ok: true, value: entries };
}

// The optional auxiliaries / vocabulary keys widen the model shape to exactly
// these four key sets; every other combination is rejected as before.
const MODEL_KEY_SETS: readonly (readonly string[])[] = [
  ["cfg", "entries", "model", "name"],
  ["auxiliaries", "cfg", "entries", "model", "name"],
  ["cfg", "entries", "model", "name", "vocabulary"],
  ["auxiliaries", "cfg", "entries", "model", "name", "vocabulary"],
];

function isCanonicalAuxiliaryPath(value: unknown, selfPath: string): value is string {
  if (typeof value !== "string" || value.includes("\\") || posix.isAbsolute(value)) return false;
  if (posix.normalize(value) !== value || value.split("/").includes("..")) return false;
  if (posix.dirname(value) !== "specs/tla") return false;
  const base = posix.basename(value);
  if (!base.endsWith(".tla") || !MODEL_NAME.test(base.slice(0, -".tla".length))) return false;
  const moduleName = base.slice(0, -".tla".length);
  return value === tlaModelPath(moduleName) && value !== selfPath;
}

function parseAuxiliaryIdentities(
  value: unknown,
  selfPath: string,
): Result<readonly ModelMapAssetIdentity[], ModelLoadError> {
  if (!Array.isArray(value) || value.length === 0) {
    return invalid("auxiliaries must be a non-empty array when present");
  }
  const auxiliaries: ModelMapAssetIdentity[] = [];
  let previousPath = "";
  for (const [index, candidate] of value.entries()) {
    if (!exactObject(candidate, ["identity", "path"])) {
      return invalid(`auxiliaries[${index}] must have exactly identity and path`);
    }
    if (!isCanonicalAuxiliaryPath(candidate.path, selfPath)) {
      return invalid(
        `auxiliaries[${index}].path must be a canonical specs/tla/<Name>.tla path other than the model's own`,
      );
    }
    if (typeof candidate.identity !== "string" || !SHA256.test(candidate.identity)) {
      return invalid(`auxiliaries[${index}].identity must be a lowercase SHA-256 value`);
    }
    if (candidate.path <= previousPath) {
      return invalid("auxiliaries must be unique and sorted by path");
    }
    auxiliaries.push({ path: candidate.path, identity: candidate.identity });
    previousPath = candidate.path;
  }
  return { ok: true, value: auxiliaries };
}

function parseVocabularyNames(value: unknown, label: string): Result<readonly string[], ModelLoadError> {
  if (!Array.isArray(value) || value.length === 0) {
    return invalid(`${label} must be a non-empty array`);
  }
  const names: string[] = [];
  for (const [index, candidate] of value.entries()) {
    if (typeof candidate !== "string" || !MODEL_NAME.test(candidate)) {
      return invalid(`${label}[${index}] must be a TLA identifier`);
    }
    if (names.includes(candidate)) {
      return invalid(`${label} must not contain duplicates`);
    }
    names.push(candidate);
  }
  return { ok: true, value: names };
}

function parseModelVocabulary(value: unknown): Result<ModelVocabulary, ModelLoadError> {
  if (!exactObject(value, ["namedInvariants", "traceStateVariables"])) {
    return invalid("vocabulary must have exactly namedInvariants and traceStateVariables");
  }
  const namedInvariants = parseVocabularyNames(value.namedInvariants, "vocabulary.namedInvariants");
  if (!namedInvariants.ok) return namedInvariants;
  const traceStateVariables = parseVocabularyNames(
    value.traceStateVariables,
    "vocabulary.traceStateVariables",
  );
  if (!traceStateVariables.ok) return traceStateVariables;
  return {
    ok: true,
    value: {
      namedInvariants: namedInvariants.value,
      traceStateVariables: traceStateVariables.value,
    },
  };
}

function parseModel(value: unknown, index: number): Result<ModelMapModel, ModelLoadError> {
  if (!MODEL_KEY_SETS.some((keys) => exactObject(value, keys))) {
    return invalid(
      `models[${index}] must have exactly name, model, cfg, and entries, optionally with auxiliaries and vocabulary`,
    );
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !MODEL_NAME.test(record.name)) {
    return invalid(`models[${index}].name must be a TLA module identifier`);
  }
  const name = record.name;
  const model = parseAssetIdentity(record.model, tlaModelPath(name), `models[${index}].model`);
  if (!model.ok) return model;
  const cfg = parseAssetIdentity(record.cfg, tlaCfgPath(name), `models[${index}].cfg`);
  if (!cfg.ok) return cfg;
  const entries = parseEntries(record.entries);
  if (!entries.ok) return entries;
  let auxiliaries: readonly ModelMapAssetIdentity[] | undefined;
  if ("auxiliaries" in record) {
    const parsed = parseAuxiliaryIdentities(record.auxiliaries, model.value.path);
    if (!parsed.ok) return parsed;
    auxiliaries = parsed.value;
  }
  let vocabulary: ModelVocabulary | undefined;
  if ("vocabulary" in record) {
    const parsed = parseModelVocabulary(record.vocabulary);
    if (!parsed.ok) return parsed;
    vocabulary = parsed.value;
  }
  return {
    ok: true,
    value: {
      name,
      model: model.value,
      cfg: cfg.value,
      entries: entries.value,
      ...(auxiliaries === undefined ? {} : { auxiliaries }),
      ...(vocabulary === undefined ? {} : { vocabulary }),
    },
  };
}

export function parseTlaModelMap(bytes: Uint8Array): Result<ModelMap, ModelLoadError> {
  let value: unknown;
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(source);
  } catch {
    return invalid("model map must be valid UTF-8 JSON");
  }
  if (!exactObject(value, ["models", "schemaVersion"])) {
    return invalid("model map must have exactly schemaVersion and models");
  }
  if (value.schemaVersion !== TLA_MODEL_MAP_SCHEMA_VERSION) {
    return invalid(`schemaVersion must be ${TLA_MODEL_MAP_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(value.models) || value.models.length === 0) {
    return invalid("models must be a non-empty array");
  }
  const models: ModelMapModel[] = [];
  let previousName = "";
  for (const [index, candidate] of value.models.entries()) {
    const model = parseModel(candidate, index);
    if (!model.ok) return model;
    if (model.value.name <= previousName) return invalid("models must be unique and sorted by name");
    previousName = model.value.name;
    models.push(model.value);
  }
  return { ok: true, value: { schemaVersion: TLA_MODEL_MAP_SCHEMA_VERSION, models } };
}

export function findModelMapModel(modelMap: ModelMap, name: string): ModelMapModel | undefined {
  return modelMap.models.find((model) => model.name === name);
}

export function diffModelMap(
  model: ModelMapModel,
  currentEntries: readonly ModelMapEntry[],
): readonly ModelMapDrift[] {
  const current = new Map(currentEntries.map((entry) => [entry.implPath, entry.sha256]));
  return model.entries.flatMap((entry) => {
    const currentSha = current.get(entry.implPath) ?? null;
    return currentSha === entry.sha256
      ? []
      : [{ implPath: entry.implPath, recorded: entry.sha256, current: currentSha }];
  });
}
