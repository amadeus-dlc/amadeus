// scripts/plugin-projection.ts — C5 Distribution Projection (U09, FR-6 item 19).
//
// Discovers authoring plugin sources under repo-root plugins/<name>/, projects
// each into the six packaged harness trees (dist/<harness>/<harnessDir>/plugins/
// <name>/) and a harness-neutral bundle (dist/plugins/<name>/), and derives
// byte/orphan/unreferenced/collision drift. Self-install stays the existing
// closed four faces (claude/codex/cursor/opencode) — kiro/kiro-ide are packaged
// but never promoted to the project root.
//
// OWNERSHIP: plugins/<name>/ is hand-authored source (read-only here). Every
// dist artifact is generated — only the projector writes it, only a clean-sweep
// removes it, and a hand-edited dist file is DIFFERS/ORPHAN, never source.
//
// SCOPE (U09): source discovery + structural validation (identity, path safety,
// collision) + deterministic projection + drift. Host composition (merge into
// core stages/seams), the plugin manifest's semantic schema, `when` evaluation,
// marketplace, lockfiles, and agents/scopes/memory/knowledge composition are
// U10/U11 and are NOT implemented here.
//
// TESTABILITY: the logic is pure functions over an injected ReadOnlyFs and
// in-memory maps, so a unit test drives every branch in-process (bun --coverage
// does not instrument spawned children).

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join, posix, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessManifest } from "./manifest-types.ts";
import { transform } from "./harness-transform.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HARNESS_ROOT = join(REPO_ROOT, "packages", "framework", "harness");

// The authoring-source manifest filename every plugin dir must carry. Its mere
// presence is U09's structural gate; its schema (seam vocabulary, stage
// contract) is validated by C1/U10, not re-parsed here.
export const PLUGIN_MANIFEST = "plugin.json";

// The six faces the packager discovers from harness/<name>/manifest.ts. Named
// here for the closed-matrix verification; the packager's own default target
// list stays manifest-DISCOVERED, not this constant.
export const PACKAGE_HARNESSES = [
  "claude",
  "codex",
  "cursor",
  "kiro",
  "kiro-ide",
  "opencode",
] as const;
export type PackageHarness = (typeof PACKAGE_HARNESSES)[number];

// The self-install closed union: the four faces promote-self.ts reflects into
// the project root. Intentionally NOT the six package faces — a type + runtime
// boundary that keeps kiro/kiro-ide out of the project-local install.
export const SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode"] as const;
export type SelfInstallHarness = (typeof SELF_INSTALL_HARNESSES)[number];

// Read-only filesystem seam so discovery is drivable by a fake in tests. Method
// names deliberately avoid the node:fs API names (existsSync/readFileSync/…) so
// a pure consumer or fake stays free of filesystem *signals* — the node backend
// below is the only place those names appear.
export type ReadOnlyFs = {
  exists(p: string): boolean;
  list(p: string): readonly string[];
  isDir(p: string): boolean;
  read(p: string): Buffer;
};

export const nodeReadOnlyFs: ReadOnlyFs = {
  exists: (p) => existsSync(p),
  list: (p) => readdirSync(p),
  isDir: (p) => statSync(p).isDirectory(),
  read: (p) => readFileSync(p),
};

export type SourceArtifact = {
  // Repo-neutral POSIX path relative to the plugin's source root.
  relativePath: string;
  bytes: Buffer;
  // Absolute source path, recorded so the unreferenced-source scan can tell a
  // discovered file from one the projection actually read.
  sourcePath: string;
};

export type PluginSource = {
  // Absolute plugins/<name> dir.
  sourceRoot: string;
  // <name> — the plugin identity (must be unique).
  directoryName: string;
  // plugin.json bytes, or an empty buffer when the manifest is absent (which
  // validatePluginSources rejects as malformed).
  manifestBytes: Buffer;
  artifacts: readonly SourceArtifact[];
};

export type ProjectedArtifact = {
  owner: string; // plugin directoryName
  harness?: PackageHarness; // undefined for the harness-neutral bundle
  // Path relative to the surface root: for a host projection, relative to the
  // dist harness tree root (dist/<harness>/<harnessDir>/); for the neutral
  // bundle, relative to dist/. Both are POSIX.
  relativePath: string;
  bytes: Buffer;
  sourcePath: string;
};

export type ProjectionResult = {
  harness: PackageHarness;
  plugin: string;
  artifacts: readonly ProjectedArtifact[];
};

export type DriftKind = "MISSING" | "DIFFERS" | "ORPHAN" | "UNREFERENCED";

// The three byte-comparison kinds (UNREFERENCED is a source-side scan, not a
// byte diff). A named type — not an inline literal in the deriveByteDrift
// signature — so the complexity gate's parser reads each function separately.
export type ByteDriftKind = "MISSING" | "DIFFERS" | "ORPHAN";
export type ByteDrift = { kind: ByteDriftKind; path: string };

export type Drift = {
  kind: DriftKind;
  harness?: PackageHarness;
  path: string;
  plugin?: string;
};

export type BuildResult = {
  expectedPaths: ReadonlySet<string>;
  readSources: ReadonlySet<string>;
  outsideHarness: readonly string[];
};

// The POSIX prefix a plugin owns inside a dist harness tree. Namespacing every
// plugin under plugins/<name>/ makes host paths disjoint from core output and
// from each other, so cross-plugin collisions are structurally impossible.
export function pluginHostPrefix(name: string): string {
  return posix.join("plugins", name);
}

// Canonical string order (codepoint), returning -1/0/1. Used by every comparator
// so no bare `<`/`>` chain appears inline — the complexity gate's naive TS parser
// tracks `<`/`>` as generics, and an unbalanced count desyncs its function
// boundaries. cmpStr carries exactly one balanced pair.
function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

// Recursively yield {rel, abs} for every file under `dir`, names sorted at each
// level so the enumeration order is canonical (never filesystem order).
function* walkFs(io: ReadOnlyFs, dir: string, base: string): Generator<{ rel: string; abs: string }> {
  for (const entry of [...io.list(dir)].sort()) {
    const abs = join(dir, entry);
    const rel = base === "" ? entry : `${base}/${entry}`;
    if (io.isDir(abs)) yield* walkFs(io, abs, rel);
    else yield { rel: rel.split(sep).join("/"), abs };
  }
}

// Discover plugin sources under `root` (repo-root plugins/). Returns [] when the
// dir is absent — the plugin 0-file baseline. Directory names and artifact paths
// are canonically sorted; nothing observable depends on filesystem order.
export function discoverPluginSources(root: string, io: ReadOnlyFs = nodeReadOnlyFs): readonly PluginSource[] {
  if (!io.exists(root)) return [];
  const names = [...io.list(root)]
    .filter((n) => io.isDir(join(root, n)))
    .sort();
  const sources: PluginSource[] = [];
  for (const name of names) {
    const sourceRoot = join(root, name);
    const artifacts: SourceArtifact[] = [];
    let manifestBytes: Buffer = Buffer.alloc(0);
    for (const { rel, abs } of walkFs(io, sourceRoot, "")) {
      const bytes = io.read(abs);
      artifacts.push({ relativePath: rel, bytes, sourcePath: abs });
      if (rel === PLUGIN_MANIFEST) manifestBytes = bytes;
    }
    sources.push({ sourceRoot, directoryName: name, manifestBytes, artifacts });
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Structural validation (loud, write-0 on failure)
// ---------------------------------------------------------------------------

export class PluginValidationError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(`plugin projection rejected ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    this.name = "PluginValidationError";
  }
}

// True for an artifact path that would escape the plugin's own subtree: absolute
// paths, a leading slash, any `..` segment, or a `.`/empty segment. Such a path
// must never be projected — it could clobber a sibling or a host file.
export function isUnsafeRelativePath(rel: string): boolean {
  if (rel === "" || rel.startsWith("/") || /^[A-Za-z]:/.test(rel)) return true;
  const segments = rel.split("/");
  return segments.some((s) => s === "" || s === "." || s === "..");
}

// Validate discovered sources structurally: every plugin carries a manifest,
// identities are unique, and no artifact path is unsafe. Throws
// PluginValidationError (loud, no partial write) on any problem. Returns the
// same sources on success so callers can pipeline discovery → validation.
export function validatePluginSources(sources: readonly PluginSource[]): readonly PluginSource[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    if (seen.has(src.directoryName)) problems.push(`DUPLICATE identity: ${src.directoryName}`);
    seen.add(src.directoryName);
    if (src.manifestBytes.length === 0)
      problems.push(`MALFORMED: ${src.directoryName} has no ${PLUGIN_MANIFEST}`);
    for (const a of src.artifacts) {
      if (isUnsafeRelativePath(a.relativePath))
        problems.push(`UNSAFE path: ${src.directoryName}/${a.relativePath}`);
    }
  }
  if (problems.length > 0) throw new PluginValidationError(problems.sort());
  return sources;
}

// Reject two artifacts that claim the same output path. Namespacing makes this
// impossible for well-formed input, so it is a defensive guard against a future
// projector change; throws PluginValidationError on collision.
export function assertNoPathCollisions(artifacts: readonly ProjectedArtifact[]): void {
  const owners = new Map<string, string>();
  const problems: string[] = [];
  for (const a of artifacts) {
    const prior = owners.get(a.relativePath);
    if (prior !== undefined && prior !== a.owner)
      problems.push(`COLLISION: ${a.relativePath} owned by both ${prior} and ${a.owner}`);
    owners.set(a.relativePath, a.owner);
  }
  if (problems.length > 0) throw new PluginValidationError(problems.sort());
}

// ---------------------------------------------------------------------------
// Projection (pure — computes artifacts, writes nothing)
// ---------------------------------------------------------------------------

// Project one plugin's artifacts into one harness tree. Prose is transformed
// with the SAME {{HARNESS_DIR}}/rules-rename rules the core packager uses
// (harness-transform.ts); .json/.ts are verbatim. relativePath is
// harness-tree-relative (plugins/<name>/<rel>). Sorted by path.
export function projectPluginArtifacts(
  plugin: PluginSource,
  harness: PackageHarness,
  harnessDir: string,
  rulesRename: string | null,
): readonly ProjectedArtifact[] {
  const prefix = pluginHostPrefix(plugin.directoryName);
  return [...plugin.artifacts]
    .map((a) => ({
      owner: plugin.directoryName,
      harness,
      relativePath: posix.join(prefix, a.relativePath),
      bytes: transform(a.relativePath, a.bytes, harnessDir, rulesRename),
      sourcePath: a.sourcePath,
    }))
    .sort((x, y) => cmpStr(x.relativePath, y.relativePath));
}

// The harness-neutral bundle for dist/plugins/<name>/: verbatim source bytes (no
// {{HARNESS_DIR}} token — the bundle is harness-neutral). relativePath is
// dist-root-relative (plugins/<name>/<rel>). Sorted by path.
export function buildPluginBundle(plugin: PluginSource): readonly ProjectedArtifact[] {
  const prefix = pluginHostPrefix(plugin.directoryName);
  return [...plugin.artifacts]
    .map((a) => ({
      owner: plugin.directoryName,
      relativePath: posix.join(prefix, a.relativePath),
      bytes: a.bytes,
      sourcePath: a.sourcePath,
    }))
    .sort((x, y) => cmpStr(x.relativePath, y.relativePath));
}

// Load a harness manifest (harnessDir + rulesRename) by discovery. Kept internal
// so the public seams take (plugin, harness) exactly per the component contract.
function loadHarnessManifest(harness: PackageHarness): HarnessManifest {
  const mod = require(join(HARNESS_ROOT, harness, "manifest.ts")) as { default: HarnessManifest };
  return mod.default;
}

// Public seam: buildPluginProjection(plugin, harness) — resolves the harness's
// transform rules from its manifest and projects the plugin's host artifacts.
export function buildPluginProjection(plugin: PluginSource, harness: PackageHarness): ProjectionResult {
  const m = loadHarnessManifest(harness);
  const artifacts = projectPluginArtifacts(plugin, harness, m.harnessDir, m.rulesRename);
  return { harness, plugin: plugin.directoryName, artifacts };
}

// Public seam: the plugin CONTRIBUTION to one harness tree — the expected host
// paths and the source read-set. Empty when plugins is empty, so with zero
// plugins the harness tree is unchanged (byte-identical baseline).
export function buildHarnessTree(
  manifest: HarnessManifest,
  plugins: readonly PluginSource[],
): BuildResult {
  const expectedPaths = new Set<string>();
  const readSources = new Set<string>();
  const harness = manifest.name as PackageHarness;
  for (const plugin of plugins) {
    for (const a of projectPluginArtifacts(plugin, harness, manifest.harnessDir, manifest.rulesRename)) {
      expectedPaths.add(posix.join(manifest.harnessDir, a.relativePath));
      readSources.add(a.sourcePath);
    }
  }
  return { expectedPaths, readSources, outsideHarness: [] };
}

// ---------------------------------------------------------------------------
// Drift derivation (pure)
// ---------------------------------------------------------------------------

// Byte drift between an expected surface and a committed one:
//   MISSING  — expected, not on disk
//   DIFFERS  — both present, bytes differ
//   ORPHAN   — on disk, not expected (stale generated file)
// Both maps are path → bytes. Result is caller-labeled (harness/plugin) and
// sorted by path.
export function deriveByteDrift(
  expected: ReadonlyMap<string, Buffer>,
  committed: ReadonlyMap<string, Buffer>,
): ByteDrift[] {
  const out: ByteDrift[] = [];
  for (const [path, want] of expected) {
    const got = committed.get(path);
    if (got === undefined) out.push({ kind: "MISSING", path });
    else if (!got.equals(want)) out.push({ kind: "DIFFERS", path });
  }
  for (const path of committed.keys()) {
    if (!expected.has(path)) out.push({ kind: "ORPHAN", path });
  }
  return out.sort((a, b) => cmpStr(a.path, b.path));
}

// Source discovered but never read by the projection → UNREFERENCED. Both sides
// are absolute source paths; membership is exact equality. Sorted.
export function deriveUnreferenced(
  discovered: readonly string[],
  read: ReadonlySet<string>,
): string[] {
  return [...discovered].filter((p) => !read.has(p)).sort();
}

// Read the committed host plugin surface for a harness into a path→bytes map.
// Paths are harness-tree-relative (plugins/<name>/<rel>), matching
// projectPluginArtifacts output.
function readCommittedHostSurface(harness: PackageHarness, harnessDir: string, io: ReadOnlyFs): Map<string, Buffer> {
  const surfaceRoot = join(REPO_ROOT, "dist", harness, harnessDir, "plugins");
  const map = new Map<string, Buffer>();
  if (!io.exists(surfaceRoot)) return map;
  for (const { rel, abs } of walkFs(io, surfaceRoot, "")) {
    map.set(posix.join("plugins", rel), io.read(abs));
  }
  return map;
}

// Public seam: drift for one harness's plugin surface. Re-projects the
// discovered sources and diffs against the committed dist surface, returning
// MISSING/DIFFERS/ORPHAN/UNREFERENCED sorted by (harness, kind, path). Empty
// when there are no plugins and no committed surface.
export function checkHarnessTree(
  name: PackageHarness,
  root: string = join(REPO_ROOT, "plugins"),
  io: ReadOnlyFs = nodeReadOnlyFs,
): readonly Drift[] {
  const m = loadHarnessManifest(name);
  const plugins = validatePluginSources(discoverPluginSources(root, io));
  const expected = new Map<string, Buffer>();
  const read = new Set<string>();
  const discovered: string[] = [];
  const pluginOf = new Map<string, string>();
  for (const plugin of plugins) {
    for (const a of plugin.artifacts) discovered.push(a.sourcePath);
    for (const a of projectPluginArtifacts(plugin, name, m.harnessDir, m.rulesRename)) {
      expected.set(a.relativePath, a.bytes);
      read.add(a.sourcePath);
      pluginOf.set(a.relativePath, a.owner);
    }
  }
  const committed = readCommittedHostSurface(name, m.harnessDir, io);
  const drift: Drift[] = [];
  for (const d of deriveByteDrift(expected, committed))
    drift.push({ kind: d.kind, harness: name, path: d.path, plugin: pluginOf.get(d.path) });
  for (const p of deriveUnreferenced(discovered, read))
    drift.push({ kind: "UNREFERENCED", harness: name, path: p });
  return drift.sort((a, b) => (a.kind !== b.kind ? cmpStr(a.kind, b.kind) : cmpStr(a.path, b.path)));
}

// ---------------------------------------------------------------------------
// Self-install closed union (C5 internal helper — NOT a public seam)
// ---------------------------------------------------------------------------

export function isSelfInstallHarness(name: string): name is SelfInstallHarness {
  return (SELF_INSTALL_HARNESSES as readonly string[]).includes(name);
}

// Assert a harness belongs to the self-install closed four. kiro/kiro-ide are
// packaged but must never promote to the project root; a runtime reject backs
// the compile-time SelfInstallHarness union.
export function assertSelfInstallHarness(name: string): SelfInstallHarness {
  if (!isSelfInstallHarness(name))
    throw new PluginValidationError([`SELF_INSTALL rejected: ${name} is not in the closed four`]);
  return name;
}

// C5 internal helper: the self-install projection is the closed four faces only.
// Returns the (empty) BuildResult contract; the actual byte reflection stays in
// promote-self.ts's existing four-face closed list — U09 does not widen it.
export function buildSelfInstallProjection(name: SelfInstallHarness): BuildResult {
  assertSelfInstallHarness(name);
  return { expectedPaths: new Set(), readSources: new Set(), outsideHarness: [] };
}
