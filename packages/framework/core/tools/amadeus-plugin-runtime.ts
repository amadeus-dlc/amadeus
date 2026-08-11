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
