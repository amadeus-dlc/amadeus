import { posix } from "node:path";
import type { Result } from "./contract.ts";

export const TLA_MODEL_PATH = "specs/tla/FormalElection.tla";
export const TLA_CFG_PATH = "specs/tla/FormalElection.cfg";
export const TLA_MODEL_MAP_PATH = "specs/tla/model-map.json";

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

export interface ModelMap {
  readonly schemaVersion: 1;
  readonly model: ModelMapAssetIdentity;
  readonly cfg: ModelMapAssetIdentity;
  readonly entries: readonly ModelMapEntry[];
}

export interface ModelMapDrift {
  readonly implPath: string;
  readonly recorded: string;
  readonly current: string | null;
}

const SHA256 = /^[0-9a-f]{64}$/;
const IMPLEMENTATION_PREFIX = "packages/framework/core/tools/";
const IMPLEMENTATION_FILE = /^amadeus-election(?:-[a-z0-9-]+)?\.ts$/;

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
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function parseAssetIdentity(
  value: unknown,
  expectedPath: string,
  label: string,
): Result<ModelMapAssetIdentity, ModelLoadError> {
  if (!exactObject(value, ["identity", "path"])) return invalid(`${label} must have exactly identity and path`);
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
  if (!Array.isArray(value) || value.length === 0) return invalid("entries must be a non-empty array");
  const entries: ModelMapEntry[] = [];
  let previousPath = "";
  for (const [index, candidate] of value.entries()) {
    if (!exactObject(candidate, ["implPath", "sha256"])) {
      return invalid(`entries[${index}] must have exactly implPath and sha256`);
    }
    if (!isCanonicalImplementationPath(candidate.implPath)) {
      return invalid(`entries[${index}].implPath is outside the canonical implementation boundary`);
    }
    if (typeof candidate.sha256 !== "string" || !SHA256.test(candidate.sha256)) {
      return invalid(`entries[${index}].sha256 must be a lowercase SHA-256 value`);
    }
    if (candidate.implPath <= previousPath) return invalid("entries must be unique and sorted by implPath");
    entries.push({ implPath: candidate.implPath, sha256: candidate.sha256 });
    previousPath = candidate.implPath;
  }
  return { ok: true, value: entries };
}

export function parseTlaModelMap(bytes: Uint8Array): Result<ModelMap, ModelLoadError> {
  let value: unknown;
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(source);
  } catch {
    return invalid("model map must be valid UTF-8 JSON");
  }
  if (!exactObject(value, ["cfg", "entries", "model", "schemaVersion"])) {
    return invalid("model map must have exactly schemaVersion, model, cfg, and entries");
  }
  if (value.schemaVersion !== 1) return invalid("schemaVersion must be 1");

  const model = parseAssetIdentity(value.model, TLA_MODEL_PATH, "model");
  if (!model.ok) return model;
  const cfg = parseAssetIdentity(value.cfg, TLA_CFG_PATH, "cfg");
  if (!cfg.ok) return cfg;
  const entries = parseEntries(value.entries);
  if (!entries.ok) return entries;
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      model: model.value,
      cfg: cfg.value,
      entries: entries.value,
    },
  };
}

export function diffModelMap(
  modelMap: ModelMap,
  currentEntries: readonly ModelMapEntry[],
): readonly ModelMapDrift[] {
  const current = new Map(currentEntries.map((entry) => [entry.implPath, entry.sha256]));
  return modelMap.entries.flatMap((entry) => {
    const currentSha = current.get(entry.implPath) ?? null;
    return currentSha === entry.sha256
      ? []
      : [{ implPath: entry.implPath, recorded: entry.sha256, current: currentSha }];
  });
}
