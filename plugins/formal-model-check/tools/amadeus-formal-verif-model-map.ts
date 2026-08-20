import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

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

// --- Canonical spec paths (E-2) and the spec root resolver (E-1) ---
//
// The canonical spec layer lives at `amadeus/spaces/<space>/specs/tla/`. Every
// consumer (activation watch, completeness sensor, TLA loader, evidence store)
// resolves its spec roots through resolveSpecRoots below instead of assembling
// paths on its own (BR-1). The path vocabulary here is the repo-relative form
// that appears in model-map.json path values.

// The active-space grammar, replicated from isSafeWorkspaceEntryName
// (amadeus-lib.ts): this module is byte-mirrored into the formal-model-check
// plugin, whose tools must not import outside the plugin, so the cursor is
// read directly with node:fs instead of importing ./amadeus-lib.ts (E-1 seam).
const SAFE_SPACE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DEFAULT_SPACE = "default";

// Reads the `amadeus/active-space` cursor; an absent, unreadable, or unsafe
// value falls back to "default" without throwing (precedent: activeSpaceLocal
// in amadeus-subagent-stats.ts, the same cursor contract activeSpace() reads).
function activeSpaceFromCursor(workspaceRoot: string): string {
  try {
    const raw = readFileSync(join(workspaceRoot, "amadeus", "active-space"), "utf-8").trim();
    if (SAFE_SPACE_NAME.test(raw)) return raw;
  } catch {
    // No cursor is the normal state outside an Amadeus workspace: return the
    // default from the catch so the fall-through is an explicit terminal, not
    // a silent continue.
    return DEFAULT_SPACE;
  }
  return DEFAULT_SPACE;
}

// Fail-closed stop for the pre-relocation layout (E-4 / BR-4): a legacy
// `<workspaceRoot>/specs/tla/` that still holds specs is never read silently,
// whether or not the new location also holds specs (no dual-read, BR-5).
export class LegacySpecError extends Error {
  // The space the resolver selected when it stopped, so fail-soft consumers
  // (the activation advisory label, the sensor fallback, the loader's error
  // label) name the active space's canonical path instead of the default's.
  constructor(readonly space: string) {
    // One logical line: patch-coverage counts every added physical line, and
    // string-concat continuation lines carry no DA records (false UNCOVERED).
    super(`legacy TLA spec layout detected at specs/tla/: the canonical spec root is now amadeus/spaces/${space}/specs/tla/. Migrate with \`git mv specs/tla amadeus/spaces/${space}/specs/tla\` and update every reference (model-map.json path values, sensor/watch configuration, tooling) to the new location. Silent dual-read and backward-compatibility shims are not supported (fail-closed).`);
    this.name = "LegacySpecError";
  }
}

// A directory "holds specs" when it contains a TLA module or the model map.
// An absent or unreadable directory is not a legacy layout.
function holdsSpecFiles(dir: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  return entries.some((entry) => entry.endsWith(".tla") || entry === "model-map.json");
}

export interface SpecRoots {
  readonly space: string;
  readonly specsRoot: string;
  readonly tlaDir: string;
  readonly modelMapPath: string;
  readonly evidenceRoot: string;
}

// The single spec-root resolution path (L-1). Legacy detection is fail-closed:
// a legacy-only layout AND a both-present layout both raise LegacySpecError, so
// an ambiguous workspace can never be read through the old path. When neither
// location holds specs the new paths are returned and the caller keeps its
// current not-found handling.
export function resolveSpecRoots(workspaceRoot: string): SpecRoots {
  const space = activeSpaceFromCursor(workspaceRoot);
  if (holdsSpecFiles(join(workspaceRoot, "specs", "tla"))) {
    throw new LegacySpecError(space);
  }
  const specsRoot = join(workspaceRoot, "amadeus", "spaces", space, "specs");
  return {
    space,
    specsRoot,
    tlaDir: join(specsRoot, "tla"),
    modelMapPath: join(specsRoot, "tla", "model-map.json"),
    evidenceRoot: join(specsRoot, "tla-evidence"),
  };
}

export function tlaSpecDirPath(space: string = DEFAULT_SPACE): string {
  return `amadeus/spaces/${space}/specs/tla`;
}

export function tlaModelPath(name: string, space: string = DEFAULT_SPACE): string {
  return `${tlaSpecDirPath(space)}/${name}.tla`;
}

export function tlaCfgPath(name: string, space: string = DEFAULT_SPACE): string {
  return `${tlaSpecDirPath(space)}/${name}.cfg`;
}

export function tlaModelMapPath(space: string = DEFAULT_SPACE): string {
  return `${tlaSpecDirPath(space)}/model-map.json`;
}

export const TLA_MODEL_PATH = tlaModelPath(TLA_EXECUTION_MODEL_NAME);
export const TLA_CFG_PATH = tlaCfgPath(TLA_EXECUTION_MODEL_NAME);
export const TLA_MODEL_MAP_PATH = tlaModelMapPath();
export const TLA_MODEL_MAP_SCHEMA_VERSION = 2 as const;

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

// The evidence bundle an authoring run registered with the entry (ADR-3). It is
// optional so the entries that predate the authoring workflow stay valid byte
// for byte; the committer refuses to mint a new entry without one.
export interface ModelMapEvidenceBundle {
  readonly digest: string;
}

/** The intent record and audit execution that authored a newly registered model. */
export interface ModelMapAuthoringProvenance {
  readonly intentRecord: string;
  readonly execution: {
    readonly auditShard: string;
    readonly timestamp: string;
    readonly eventIdentity: string;
  };
}

export interface ModelMapModel {
  readonly name: string;
  readonly model: ModelMapAssetIdentity;
  readonly cfg: ModelMapAssetIdentity;
  readonly auxiliaries?: readonly ModelMapAssetIdentity[];
  readonly entries: readonly ModelMapEntry[];
  readonly vocabulary?: ModelVocabulary;
  readonly evidenceBundle?: ModelMapEvidenceBundle;
  readonly authoringProvenance?: ModelMapAuthoringProvenance;
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

export type TlaModelReadiness = Result<ModelMap, ModelLoadError>;

const SHA256 = /^[0-9a-f]{64}$/;
// The canonical implementation boundary, as whole repository-relative paths
// (#2929 FR-BND-1). A model may pin engine tools under the framework core and
// plugin tools under any plugin's `tools/` directory — the general plugin shape
// `plugins/<kebab>/tools/<kebab>.ts` subsumes the former formal-model-check
// tuple, so that one is gone rather than kept beside it (OQ-3: a second
// definition of a subsumed set is drift waiting to happen).
//
// Exported because the loader verifies the same boundary at read time
// (FR-BND-2): one definition, two consumers, no second hardcoded root.
export const IMPLEMENTATION_PATHS: readonly RegExp[] = [
  /^packages\/framework\/core\/tools\/amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/,
  /^plugins\/[a-z0-9]+(?:-[a-z0-9]+)*\/tools\/[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/,
];
// TLA module identifiers, which also fix the file names a model owns inside
// the canonical spec directory.
const MODEL_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

// The canonical spec asset directory: amadeus/spaces/<space>/specs/tla, with
// <space> a safe workspace entry name. The pre-relocation specs/tla layout
// fails this check, so a map carrying old path values is rejected fail-closed
// (BR-13c).
function isCanonicalSpecDir(dir: string): boolean {
  const segments = dir.split("/");
  return segments.length === 5
    && segments[0] === "amadeus"
    && segments[1] === "spaces"
    && SAFE_SPACE_NAME.test(segments[2] ?? "")
    && segments[3] === "specs"
    && segments[4] === "tla";
}

function isCanonicalSpecAssetPath(value: unknown, expectedFileName: string): value is string {
  if (typeof value !== "string" || value.includes("\\") || posix.isAbsolute(value)) return false;
  if (posix.normalize(value) !== value || value.split("/").includes("..")) return false;
  return isCanonicalSpecDir(posix.dirname(value)) && posix.basename(value) === expectedFileName;
}

// The space a map's own location belongs to, from the path the map was read
// from. Consumers resolve that path through resolveSpecRoots, so its tail is
// the canonical spec dir; absolute and repo-relative forms both reduce to the
// trailing amadeus/spaces/<space>/specs/tla segments (the file name is the
// caller's business, so only the directory tail is checked).
function spaceOfMapLocation(mapLocation: string): string | undefined {
  const dirSegments = mapLocation.replaceAll("\\", "/").split("/").slice(0, -1).slice(-5);
  return isCanonicalSpecDir(dirSegments.join("/")) ? dirSegments[2] : undefined;
}

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
  expectedFileName: string,
  label: string,
): Result<ModelMapAssetIdentity, ModelLoadError> {
  if (!exactObject(value, ["identity", "path"])) {
    return invalid(`${label} must have exactly identity and path`);
  }
  if (!isCanonicalSpecAssetPath(value.path, expectedFileName)) {
    return invalid(
      `${label}.path must be the canonical amadeus/spaces/<space>/specs/tla/${expectedFileName}`,
    );
  }
  if (typeof value.identity !== "string" || !SHA256.test(value.identity)) {
    return invalid(`${label}.identity must be a lowercase SHA-256 value`);
  }
  return { ok: true, value: { path: value.path, identity: value.identity } };
}

export function isCanonicalImplementationPath(value: unknown): value is string {
  if (typeof value !== "string" || value.includes("\\") || posix.isAbsolute(value)) return false;
  if (posix.normalize(value) !== value || value.split("/").includes("..")) return false;
  return IMPLEMENTATION_PATHS.some((pattern) => pattern.test(value));
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

// The optional auxiliaries / vocabulary / evidenceBundle / authoringProvenance keys widen the model
// shape to the key sets below; every other combination is rejected as before.
const REQUIRED_MODEL_KEYS = ["cfg", "entries", "model", "name"] as const;
const OPTIONAL_MODEL_KEYS = ["auxiliaries", "vocabulary", "evidenceBundle", "authoringProvenance"] as const;

// Every subset of the optional keys, added to the required ones. Deriving the
// sets keeps a new optional key from needing a hand-written combination table.
const MODEL_KEY_SETS: readonly (readonly string[])[] = Array.from(
  { length: 1 << OPTIONAL_MODEL_KEYS.length },
  (_unused, mask) => [
    ...REQUIRED_MODEL_KEYS,
    ...OPTIONAL_MODEL_KEYS.filter((_key, index) => (mask & (1 << index)) !== 0),
  ],
);

const BUNDLE_DIGEST = /^sha256:[0-9a-f]{64}$/;

function parseEvidenceBundle(value: unknown, index: number): Result<ModelMapEvidenceBundle, ModelLoadError> {
  if (!exactObject(value, ["digest"])) {
    return invalid(`models[${index}].evidenceBundle must have exactly digest`);
  }
  if (typeof value.digest !== "string" || !BUNDLE_DIGEST.test(value.digest)) {
    return invalid(`models[${index}].evidenceBundle.digest must be sha256:<hex64>`);
  }
  return { ok: true, value: { digest: value.digest } };
}

const INTENT_RECORD_PATH = /^amadeus\/spaces\/[A-Za-z0-9][A-Za-z0-9._-]*\/intents\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function parseAuthoringProvenance(
  value: unknown,
  index = 0,
): Result<ModelMapAuthoringProvenance, ModelLoadError> {
  if (!exactObject(value, ["execution", "intentRecord"])) {
    return invalid(`models[${index}].authoringProvenance must have exactly intentRecord and execution`);
  }
  if (typeof value.intentRecord !== "string" || !INTENT_RECORD_PATH.test(value.intentRecord)) {
    return invalid(`models[${index}].authoringProvenance.intentRecord must be a canonical intent record path`);
  }
  if (!exactObject(value.execution, ["auditShard", "eventIdentity", "timestamp"])) {
    return invalid(`models[${index}].authoringProvenance.execution must have exactly auditShard, timestamp and eventIdentity`);
  }
  const execution = value.execution;
  const expectedPrefix = `${value.intentRecord}/audit/`;
  const shardName = typeof execution.auditShard === "string"
    ? execution.auditShard.slice(expectedPrefix.length)
    : "";
  if (
    typeof execution.auditShard !== "string"
    || !execution.auditShard.startsWith(expectedPrefix)
    || shardName.includes("/")
    || !/^[A-Za-z0-9._-]+\.jsonl$/.test(shardName)
  ) {
    return invalid(`models[${index}].authoringProvenance.execution.auditShard must belong to intentRecord/audit`);
  }
  if (typeof execution.timestamp !== "string" || !ISO_TIMESTAMP.test(execution.timestamp)) {
    return invalid(`models[${index}].authoringProvenance.execution.timestamp must be an ISO-8601 UTC timestamp`);
  }
  if (typeof execution.eventIdentity !== "string" || !SHA256.test(execution.eventIdentity)) {
    return invalid(`models[${index}].authoringProvenance.execution.eventIdentity must be a lowercase SHA-256 value`);
  }
  return {
    ok: true,
    value: {
      intentRecord: value.intentRecord,
      execution: {
        auditShard: execution.auditShard,
        timestamp: execution.timestamp,
        eventIdentity: execution.eventIdentity,
      },
    },
  };
}

function isCanonicalAuxiliaryPath(value: unknown, selfPath: string): value is string {
  if (typeof value !== "string" || value.includes("\\") || posix.isAbsolute(value)) return false;
  if (posix.normalize(value) !== value || value.split("/").includes("..")) return false;
  if (!isCanonicalSpecDir(posix.dirname(value))) return false;
  const base = posix.basename(value);
  if (!base.endsWith(".tla") || !MODEL_NAME.test(base.slice(0, -".tla".length))) return false;
  return value !== selfPath;
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
        `auxiliaries[${index}].path must be a canonical amadeus/spaces/<space>/specs/tla/<Name>.tla path other than the model's own`,
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
      `models[${index}] must have exactly name, model, cfg, and entries, optionally with auxiliaries, vocabulary, evidenceBundle and authoringProvenance`,
    );
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !MODEL_NAME.test(record.name)) {
    return invalid(`models[${index}].name must be a TLA module identifier`);
  }
  const name = record.name;
  const model = parseAssetIdentity(record.model, `${name}.tla`, `models[${index}].model`);
  if (!model.ok) return model;
  const cfg = parseAssetIdentity(record.cfg, `${name}.cfg`, `models[${index}].cfg`);
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
  let evidenceBundle: ModelMapEvidenceBundle | undefined;
  if ("evidenceBundle" in record) {
    const parsed = parseEvidenceBundle(record.evidenceBundle, index);
    if (!parsed.ok) return parsed;
    evidenceBundle = parsed.value;
  }
  let authoringProvenance: ModelMapAuthoringProvenance | undefined;
  if ("authoringProvenance" in record) {
    const parsed = parseAuthoringProvenance(record.authoringProvenance, index);
    if (!parsed.ok) return parsed;
    authoringProvenance = parsed.value;
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
      ...(evidenceBundle === undefined ? {} : { evidenceBundle }),
      ...(authoringProvenance === undefined ? {} : { authoringProvenance }),
    },
  };
}

// Same-space containment: readiness and the spec-hash watch observe only the
// active space's tla/**, so a map whose model/cfg/auxiliary paths span spaces
// would verify assets the watch never sees. Every asset in one map shares a
// single <space> (any safe space name remains valid on its own), and when the
// caller supplies the path the map was read from (mapLocation), that one
// space must be the map's own — otherwise the watch on the map's space would
// never observe the declared assets.
function checkAssetSpaceContainment(
  models: readonly ModelMapModel[],
  mapLocation: string | undefined,
): Result<void, ModelLoadError> {
  const assetPaths = models.flatMap((model) => [model.model.path, model.cfg.path, ...(model.auxiliaries ?? []).map((aux) => aux.path)]);
  const spaces = new Set(assetPaths.map((path) => path.split("/")[2]));
  if (spaces.size > 1) return invalid("every model, cfg, and auxiliary path in a model map must share the same amadeus/spaces/<space>/specs/tla directory");
  if (mapLocation === undefined) return { ok: true, value: undefined };
  const locationSpace = spaceOfMapLocation(mapLocation);
  if (locationSpace === undefined) return invalid("model map location must end in a canonical amadeus/spaces/<space>/specs/tla directory");
  if (!spaces.has(locationSpace)) return invalid(`model map declares its assets in a different space than its own location amadeus/spaces/${locationSpace}/specs/tla`);
  return { ok: true, value: undefined };
}

export function parseTlaModelMap(bytes: Uint8Array, mapLocation?: string): Result<ModelMap, ModelLoadError> {
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
  const containment = checkAssetSpaceContainment(models, mapLocation);
  if (!containment.ok) return containment;
  return { ok: true, value: { schemaVersion: TLA_MODEL_MAP_SCHEMA_VERSION, models } };
}

function missingAsset(
  code: "MODEL_MISSING" | "CFG_MISSING",
  relativePath: string,
  model: string,
): TlaModelReadiness {
  return {
    ok: false,
    error: {
      kind: "MODEL_LOAD",
      code,
      relativePath,
      detail: `declared target ${model} is missing ${code === "MODEL_MISSING" ? "its model" : "its cfg"}`,
    },
  };
}

/**
 * Canonical readiness seam shared by activation advisories and explicit TLC
 * execution. A target is ready only when the strict model-map parser accepts
 * the declaration and every declared model/cfg path is present. Identity and
 * source-drift verification remain the explicit loader's next step.
 */
export function evaluateTlaModelReadiness(
  modelMapBytes: Uint8Array,
  assetExists: (relativePath: string) => boolean,
  mapLocation?: string,
): TlaModelReadiness {
  const parsed = parseTlaModelMap(modelMapBytes, mapLocation);
  if (!parsed.ok) return parsed;
  for (const model of parsed.value.models) {
    if (!assetExists(model.model.path)) {
      return missingAsset("MODEL_MISSING", model.model.path, model.name);
    }
    if (!assetExists(model.cfg.path)) {
      return missingAsset("CFG_MISSING", model.cfg.path, model.name);
    }
  }
  return parsed;
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
