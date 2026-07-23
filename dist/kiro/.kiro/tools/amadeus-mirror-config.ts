// amadeus-mirror-config.ts — read-only three-layer mirror configuration.
//
// Configuration is resolved from global -> space -> intent with later layers
// winning. The module owns no cursor lookup and exposes no write API: callers
// pass the already-resolved space and intent directory.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { workspaceRoot } from "./amadeus-lib.ts";
import { typeMismatchError, unknownKeyError } from "./amadeus-settings.ts";

export const MIRROR_CONFIG_KNOWN_KEYS = ["auto-mirror"] as const;
export const DEFAULT_MIRROR_CONFIG: Readonly<MirrorConfig> = Object.freeze({
  autoMirror: false,
});

export type ConfigLayer = "global" | "space" | "intent";

export type MirrorConfig = {
  readonly autoMirror: boolean;
};

export type ConfigParseResult =
  | { kind: "parsed"; partial: Partial<MirrorConfig>; source: ConfigLayer }
  | { kind: "absent"; source: ConfigLayer }
  | { kind: "invalid"; source: ConfigLayer; errors: string[] };

export type ResolveOutcome =
  | { kind: "resolved"; config: MirrorConfig }
  | { kind: "invalid"; errors: { layer: ConfigLayer; errors: string[] }[] };

export type ConfigReader = (path: string) => string;

export type MirrorConfigPaths = Readonly<Record<ConfigLayer, string>>;

function valueKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnoent(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && (error as { code?: unknown }).code === "ENOENT";
}

export function mirrorConfigPaths(
  projectDir: string,
  space: string,
  intentDir: string,
): MirrorConfigPaths {
  const root = workspaceRoot(projectDir);
  return Object.freeze({
    global: join(root, "config.json"),
    space: join(root, "spaces", space, "config.json"),
    intent: join(root, "spaces", space, "intents", intentDir, "config.json"),
  });
}

export function parse(text: string, source: ConfigLayer): ConfigParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "invalid", source, errors: [`invalid JSON: ${message}`] };
  }

  if (!isPlainObject(value)) {
    return {
      kind: "invalid",
      source,
      errors: [`mirror config root must be an object, got ${valueKind(value)}`],
    };
  }

  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(MIRROR_CONFIG_KNOWN_KEYS as readonly string[]).includes(key)) {
      errors.push(unknownKeyError(key, MIRROR_CONFIG_KNOWN_KEYS));
    }
  }
  const rawAutoMirror = value["auto-mirror"];
  if (rawAutoMirror !== undefined && typeof rawAutoMirror !== "boolean") {
    errors.push(
      typeMismatchError("auto-mirror", "boolean", valueKind(rawAutoMirror)),
    );
  }
  if (errors.length > 0) return { kind: "invalid", source, errors };

  return {
    kind: "parsed",
    source,
    partial:
      typeof rawAutoMirror === "boolean" ? { autoMirror: rawAutoMirror } : {},
  };
}

export function mergeLayers(
  layers: readonly ConfigParseResult[],
): ResolveOutcome {
  const invalid = layers
    .filter(
      (layer): layer is Extract<ConfigParseResult, { kind: "invalid" }> =>
        layer.kind === "invalid",
    )
    .map((layer) => ({ layer: layer.source, errors: layer.errors }));
  if (invalid.length > 0) return { kind: "invalid", errors: invalid };

  let autoMirror = DEFAULT_MIRROR_CONFIG.autoMirror;
  for (const layer of layers) {
    if (layer.kind === "parsed" && layer.partial.autoMirror !== undefined) {
      autoMirror = layer.partial.autoMirror;
    }
  }
  return { kind: "resolved", config: Object.freeze({ autoMirror }) };
}

export function readLayer(
  path: string,
  source: ConfigLayer,
  reader: ConfigReader = (target) => readFileSync(target, "utf-8"),
): ConfigParseResult {
  let text: string;
  try {
    text = reader(path);
  } catch (error) {
    if (isEnoent(error)) return { kind: "absent", source };
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "invalid",
      source,
      errors: [`failed to read ${source} mirror config at ${path}: ${message}`],
    };
  }
  return parse(text, source);
}

export function resolve(
  projectDir: string,
  space: string,
  intentDir: string,
  reader: ConfigReader = (target) => readFileSync(target, "utf-8"),
): ResolveOutcome {
  const paths = mirrorConfigPaths(projectDir, space, intentDir);
  return mergeLayers([
    readLayer(paths.global, "global", reader),
    readLayer(paths.space, "space", reader),
    readLayer(paths.intent, "intent", reader),
  ]);
}
