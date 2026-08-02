import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { parseAmadeusConfigLayers, readAmadeusConfigLayers } from "./amadeus-config.ts";

export type PluginSelectionCode =
  | "not-selected"
  | "source-missing"
  | "not-installed"
  | "stale"
  | "current"
  | "failed";

export type PluginSelection = Readonly<{
  plugin: string;
  code: PluginSelectionCode;
  source: string;
  staging: string;
}>;

export type PluginSelectionOutcome =
  | { kind: "resolved"; projectDir: string; plugins: readonly string[]; explicit: boolean }
  | { kind: "invalid"; message: string };

export type PluginInstallSnapshot = Readonly<{
  rollback: () => void;
  dispose: () => void;
}>;

export function projectDirForHost(hostRoot: string): string {
  return basename(hostRoot).startsWith(".") ? dirname(hostRoot) : hostRoot;
}

export function resolvePluginSelection(hostRoot: string): PluginSelectionOutcome {
  const projectDir = projectDirForHost(hostRoot);
  if (projectDir === hostRoot) return { kind: "resolved", projectDir, plugins: [], explicit: false };
  const read = readAmadeusConfigLayers(projectDir);
  if (read.kind === "failure") {
    return { kind: "invalid", message: read.issues.map((issue) => `${issue.path}: ${issue.summary}`).join("; ") };
  }
  const outcome = parseAmadeusConfigLayers(read.layers);
  if (outcome.kind === "invalid") {
    return {
      kind: "invalid",
      message: outcome.issues.map((issue) => `${issue.path}: ${issue.key} ${issue.expected}`).join("; "),
    };
  }
  const global = read.layers.find((layer) => layer.layer === "global" && layer.present)?.rawValue;
  const explicit = typeof global === "object"
    && global !== null
    && !Array.isArray(global)
    && Object.hasOwn(global, "plugins");
  return { kind: "resolved", projectDir, plugins: outcome.config.plugins ?? [], explicit };
}

export function observePluginSelection(
  projectDir: string,
  hostRoot: string,
  selected: readonly string[],
  staged: ReadonlySet<string>,
  composed: ReadonlySet<string>,
  stale: ReadonlySet<string> = new Set(),
  failed: ReadonlySet<string> = new Set(),
): readonly PluginSelection[] {
  const all = new Set([...selected, ...staged, ...composed]);
  return [...all].sort().map((plugin) => {
    const source = join(projectDir, "plugins", plugin);
    const staging = join(hostRoot, ".amadeus-plugin-src", plugin);
    let code: PluginSelectionCode;
    if (failed.has(plugin)) code = "failed";
    else if (!selected.includes(plugin)) code = "not-selected";
    else if (!existsSync(source)) code = "source-missing";
    else if (!staged.has(plugin) || !composed.has(plugin)) code = "not-installed";
    else if (stale.has(plugin)) code = "stale";
    else code = "current";
    return { plugin, code, source, staging };
  });
}

export function writeProjectPlugins(projectDir: string, plugins: readonly string[]): void {
  const path = join(projectDir, "amadeus", "config.json");
  const current = existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown> : {};
  current.plugins = [...new Set(plugins)].sort();
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, `${JSON.stringify(current, null, 2)}\n`);
  renameSync(temp, path);
}

// An explicit install/drop spans project configuration, project supply, and one
// harness tree. The composition engine already provides an atomic transaction
// inside the harness; this snapshot is the compensating boundary around those
// three surfaces when a later recompile or config write fails.
export function createPluginInstallSnapshot(
  projectDir: string,
  hostRoot: string,
  plugin: string,
): PluginInstallSnapshot | null {
  if (projectDir === hostRoot || dirname(hostRoot) !== projectDir || !basename(hostRoot).startsWith(".")) return null;
  const root = mkdtempSync(join(tmpdir(), "amadeus-plugin-transaction-"));
  const hostBackup = join(root, "host");
  const source = join(projectDir, "plugins", plugin);
  const sourceRoot = dirname(source);
  const sourceBackup = join(root, "source");
  const config = join(projectDir, "amadeus", "config.json");
  const configBackup = join(root, "config.json");
  const hadHost = existsSync(hostRoot);
  const hadSource = existsSync(source);
  const hadSourceRoot = existsSync(sourceRoot);
  const hadConfig = existsSync(config);
  if (hadHost) cpSync(hostRoot, hostBackup, { recursive: true });
  if (hadSource) cpSync(source, sourceBackup, { recursive: true });
  if (hadConfig) cpSync(config, configBackup);
  let disposed = false;
  return {
    rollback: () => {
      if (disposed) return;
      rmSync(hostRoot, { recursive: true, force: true });
      if (hadHost) cpSync(hostBackup, hostRoot, { recursive: true });
      rmSync(source, { recursive: true, force: true });
      if (hadSource) cpSync(sourceBackup, source, { recursive: true });
      if (!hadSourceRoot && existsSync(sourceRoot) && readdirSync(sourceRoot).length === 0) {
        rmSync(sourceRoot, { recursive: true, force: true });
      }
      rmSync(config, { force: true });
      if (hadConfig) {
        mkdirSync(dirname(config), { recursive: true });
        cpSync(configBackup, config);
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      rmSync(root, { recursive: true, force: true });
    },
  };
}
