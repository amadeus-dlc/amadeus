import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export type AdvisoryCode = string;

export type Advisory = {
  plugin: string;
  code: AdvisoryCode;
  message: string;
  stage: string;
  target?: string;
  specIdentity?: string;
  reason?: string;
};

export type PluginRuntimeFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string) => Buffer;
};

export const defaultPluginRuntimeFs: PluginRuntimeFs = {
  existsSync,
  readFileSync,
};

export function projectRootForHost(hostRoot: string): string {
  return dirname(hostRoot);
}

function readCompositionPlugins(
  hostRoot: string,
  fs: PluginRuntimeFs,
): [string, unknown][] {
  const path = join(hostRoot, ".amadeus-plugin-composition.json");
  if (!fs.existsSync(path)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(path).toString("utf-8"));
    if (typeof parsed !== "object" || parsed === null || !("plugins" in parsed)) return [];
    const plugins = parsed.plugins;
    if (!Array.isArray(plugins)) return [];
    const validated: [string, unknown][] = [];
    for (const entry of plugins) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string") continue;
      validated.push([entry[0], entry[1]]);
    }
    return validated;
  } catch {
    return [];
  }
}

export function composedPluginNames(
  hostRoot: string,
  fs: PluginRuntimeFs = defaultPluginRuntimeFs,
): string[] {
  return readCompositionPlugins(hostRoot, fs).map(([name]) => name);
}

export function isComposedPluginStage(
  hostRoot: string,
  slug: string,
  fs: PluginRuntimeFs = defaultPluginRuntimeFs,
): boolean {
  for (const [, record] of readCompositionPlugins(hostRoot, fs)) {
    if (typeof record !== "object" || record === null || !("stageIndex" in record)) continue;
    const stageIndex = record.stageIndex;
    if (!Array.isArray(stageIndex)) continue;
    if (stageIndex.some((entry) =>
      typeof entry === "object" && entry !== null && "slug" in entry && entry.slug === slug
    )) return true;
  }
  return false;
}

// The staging root a composed plugin's source bundle stays in — the same
// directory amadeus-plugin.ts installs into. It is the only place the manifest
// (and therefore the settings DECLARATION) survives after compose: the
// composition record carries ownership and digests, not manifest fields.
// Defined in this leaf module so the CLI, the compose engine and the sensor
// dispatcher all read one spelling rather than three copies of a path literal.
export const PLUGIN_SOURCE_DIR_NAME = ".amadeus-plugin-src";
export const PLUGIN_MANIFEST = "plugin.json";

// Which composed plugin owns a sensor manifest. Sensor ids anchor to the
// `amadeus-<id>.md` filename (amadeus-graph.ts SENSOR_FILE_REGEX) and a plugin
// records its sensor contributions as bundle-relative owned paths, so the
// lookup is an ownedPaths membership test.
export function pluginOwningSensor(
  hostRoot: string,
  sensorId: string,
  fs: PluginRuntimeFs = defaultPluginRuntimeFs,
): string | null {
  const owned = `sensors/amadeus-${sensorId}.md`;
  for (const [name, record] of readCompositionPlugins(hostRoot, fs)) {
    if (typeof record !== "object" || record === null || !("ownedPaths" in record)) continue;
    const paths = record.ownedPaths;
    if (Array.isArray(paths) && paths.includes(owned)) return name;
  }
  return null;
}

export type PluginManifestRead =
  | { kind: "absent" }
  | { kind: "unreadable"; detail: string }
  | { kind: "read"; raw: Record<string, unknown> };

// Read a composed plugin's staged manifest. Absence is not an error here — a
// plugin composed from a bundle that was later removed simply has no
// declaration — but bytes that are present and unparsable are, because guessing
// past them would resolve settings from a manifest nobody can see.
export function readStagedPluginManifest(
  hostRoot: string,
  plugin: string,
  fs: PluginRuntimeFs = defaultPluginRuntimeFs,
): PluginManifestRead {
  const path = join(hostRoot, PLUGIN_SOURCE_DIR_NAME, plugin, PLUGIN_MANIFEST);
  if (!fs.existsSync(path)) return { kind: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(path).toString("utf-8"));
  } catch (err) {
    return { kind: "unreadable", detail: `${path}: ${String(err)}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { kind: "unreadable", detail: `${path}: manifest must be a JSON object` };
  }
  return { kind: "read", raw: parsed as Record<string, unknown> };
}

export type AdvisoryLatchFs = {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string) => void;
  writeFileSync: (path: string, data: string) => void;
};

export const defaultAdvisoryLatchFs: AdvisoryLatchFs = {
  existsSync,
  mkdirSync: (path) => mkdirSync(path, { recursive: true }),
  writeFileSync,
};

export function advisoryLatchPath(
  latchDir: string,
  plugin: string,
  code: AdvisoryCode,
): string {
  const key = `${plugin}.${code}`.replace(/[^A-Za-z0-9._-]+/g, "-");
  return join(latchDir, key);
}

function latchExists(path: string, fs: AdvisoryLatchFs): boolean {
  try {
    return fs.existsSync(path);
  } catch {
    // A read failure must not suppress an advisory.
    return false;
  }
}

function writeLatch(latchDir: string, path: string, now: string, fs: AdvisoryLatchFs): void {
  try {
    fs.mkdirSync(latchDir);
    fs.writeFileSync(path, `${now}\n`);
  } catch {
    // The advisory is already in the returned set, so latch failure is fail-open.
    return;
  }
}

export function unlatchedAdvisories(
  latchDir: string,
  advisories: readonly Advisory[],
  now: string = new Date().toISOString(),
  fs: AdvisoryLatchFs = defaultAdvisoryLatchFs,
): Advisory[] {
  const fresh: Advisory[] = [];
  for (const advisory of advisories) {
    const path = advisoryLatchPath(latchDir, advisory.plugin, advisory.code);
    if (latchExists(path, fs)) continue;
    fresh.push(advisory);
    writeLatch(latchDir, path, now, fs);
  }
  return fresh;
}
