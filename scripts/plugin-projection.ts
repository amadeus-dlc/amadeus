// scripts/plugin-projection.ts — C5 Distribution Projection (U09, FR-6 item 19).
//
// Discovers authoring plugin sources under repo-root plugins/<name>/, projects
// each into the seven packaged harness trees (dist/<harness>/<harnessDir>/plugins/
// <name>/) and a harness-neutral bundle (dist/plugins/<name>/), and derives
// byte/orphan/unreferenced/collision drift. Self-install stays the existing
// closed five faces (claude/codex/cursor/opencode/kimi) — kiro/kiro-ide are packaged
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

import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

// The seven faces the packager discovers from harness/<name>/manifest.ts. Named
// here for the closed-matrix verification; the packager's own default target
// list stays manifest-DISCOVERED, not this constant.
export const PACKAGE_HARNESSES = [
  "claude",
  "codex",
  "cursor",
  "kiro",
  "kiro-ide",
  "opencode",
  "kimi",
] as const;
export type PackageHarness = (typeof PACKAGE_HARNESSES)[number];

// The self-install closed union: the five faces promote-self.ts reflects into
// the project root. Intentionally NOT the seven package faces — a type + runtime
// boundary that keeps kiro/kiro-ide out of the project-local install.
export const SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"] as const;
export type SelfInstallHarness = (typeof SELF_INSTALL_HARNESSES)[number];

// Read-only filesystem seam. Single definition lives in the core engine
// (amadeus-plugin-compose.ts) so the dist-shipped engine carries no scripts/
// import; imported for local use and re-exported for existing consumers of this
// module (C2 relocation, single definition — no double-def).
import { type ReadOnlyFs, nodeReadOnlyFs } from "../packages/framework/core/tools/amadeus-plugin-compose.ts";
export { type ReadOnlyFs, nodeReadOnlyFs };

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

// ---------------------------------------------------------------------------
// Claude install bundle (C3 claude face, U2). The installable artifact a user
// drops into a Claude Code host: a `.claude-plugin/plugin.json` marketplace
// manifest, a `hooks/hooks.json` SessionStart snippet (auto-compose), and the
// claude-transformed `plugins/<name>/` content. Placed in the neutral bundle at
// dist/plugins/<name>/claude/ (kept out of the compile-visible harness tree so
// the shipped 0-plugin stage graph stays byte-identical). Other harness faces
// are U3 — only claude is implemented here.
// ---------------------------------------------------------------------------

// The Claude Code marketplace manifest. Deterministic and minimal — derived from
// the plugin identity only (the amadeus authoring manifest carries no version or
// description). Two-space-indented JSON with a trailing newline.
export function claudeMarketplaceManifest(name: string): string {
  // Description built by concatenation, not a nested template literal: an inner
  // backtick pair inside the outer `${…}` desyncs lizard's function-boundary
  // scanner and merges every following function into this one (byte-identical).
  const manifest = { name, version: "0.0.0", description: `Amadeus plugin: ${name}` };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// The SessionStart hook snippet a user merges into their Claude Code settings to
// auto-compose (C4). `|| true` keeps a hook failure a non-blocking stderr warning
// (BR-U2-4 fail-loud/continue). Harness-dir substituted for claude (.claude).
export function claudeHooksSnippet(): string {
  // biome-ignore lint/suspicious/noTemplateCurlyInString: shell variable in the hook command string, not a JS template.
  const command =
    'bun "${CLAUDE_PROJECT_DIR:-.}/.claude/tools/amadeus-plugin.ts" compose --if-stale || true';
  const snippet = {
    hooks: {
      SessionStart: [{ matcher: "", hooks: [{ type: "command", command }] }],
    },
  };
  return `${JSON.stringify(snippet, null, 2)}\n`;
}

// Pure builder: the claude install bundle artifacts, relative to the install
// root. Sorted by path; deterministic given the source. Zero plugins → this is
// simply never called (the caller iterates repoPlugins()).
export function claudeInstallArtifacts(plugin: PluginSource): readonly ProjectedArtifact[] {
  const manifestSource = join(plugin.sourceRoot, PLUGIN_MANIFEST);
  const generated = (relativePath: string, text: string): ProjectedArtifact => ({
    owner: plugin.directoryName,
    harness: "claude",
    relativePath,
    bytes: Buffer.from(text, "utf-8"),
    sourcePath: manifestSource,
  });
  const content = buildPluginProjection(plugin, "claude").artifacts; // plugins/<name>/<rel>, claude-transformed
  return [
    generated(".claude-plugin/plugin.json", claudeMarketplaceManifest(plugin.directoryName)),
    generated("hooks/hooks.json", claudeHooksSnippet()),
    ...content,
  ].sort((x, y) => cmpStr(x.relativePath, y.relativePath));
}

// ---------------------------------------------------------------------------
// U3 host-projection-all — install-bundle generalization to every packaged face.
//
// The three host-integration classes (ADR-4 canonical literals). TRANSCRIBED
// from the U1 capability matrix's machine-readable class_assignment (BR-U1-7),
// never inferred here: the matrix is the single source and downstream code reads
// this map. Only claude is native-manifest today; the folder-drop-auto and
// manual-only faces are what U3 adds on top of the U2 claude projector (which is
// left byte-for-byte unchanged).
// ---------------------------------------------------------------------------
export type PluginHostClass = "native-manifest" | "folder-drop-auto" | "manual-only";

export const PLUGIN_HOST_CLASS: Record<PackageHarness, PluginHostClass> = {
  claude: "native-manifest",
  codex: "folder-drop-auto",
  cursor: "folder-drop-auto",
  kimi: "folder-drop-auto",
  kiro: "folder-drop-auto",
  "kiro-ide": "folder-drop-auto",
  opencode: "manual-only",
};

// One face's projection spec, derived from the U1 matrix. `clazz` drives the
// install-bundle layout via a single 3-arm switch, so the face count and the
// branch count are decoupled (SCALE-U3-1: 7 faces, 3 branches).
export type HarnessProjectionSpec = {
  harness: PackageHarness;
  clazz: PluginHostClass;
  harnessDir: string;
};

// Build the spec for one face by reading the U1 class map + the harness manifest
// (BR-U3-2: the spec constructor takes the matrix enumeration as input).
export function harnessProjectionSpec(harness: PackageHarness): HarnessProjectionSpec {
  return { harness, clazz: PLUGIN_HOST_CLASS[harness], harnessDir: loadHarnessManifest(harness).harnessDir };
}

// The plan-stage outDir rejection set (ADR-5, upstream t188 #27-32, 1:1).
export type OutDirRefusal =
  | "non-projection-nonempty-dir" // #27 pre-existing non-empty dir that is not our prior projection
  | "foreign-projection" // #28 a prior projection of a DIFFERENT plugin/harness
  | "file-outdir" // #29 a regular file (no raw ENOTDIR stack)
  | "symlink-outdir" // #30 a symlink (plain or dangling target)
  | "broken-symlink-outdir"; // #31 a broken symlink (no raw EEXIST stack)

export type OutDirVerdict = { kind: "ok" } | { kind: "refused"; reason: OutDirRefusal };

// Everything classifyOutDir needs, as data — so the decision is a pure function
// of an injected probe (parse-don't-validate; the lstat happens at the fs edge).
export type OutDirProbe = {
  lstatKind: "missing" | "dir" | "file" | "symlink" | "broken-symlink";
  isPriorProjection: boolean; // our own prior projection (marker matches this plugin+harness)
  isForeign: boolean; // a projection marker for a DIFFERENT plugin/harness
  dirNonEmpty: boolean;
};

// Pure decision (SEC-U3-1 layer 1): fs-untouching classification of an outDir
// from its probe. `missing`, an empty dir, and our own prior projection are ok;
// everything else is refused with a 1:1 reason from the t188 set.
export function classifyOutDir(probe: OutDirProbe): OutDirVerdict {
  switch (probe.lstatKind) {
    case "missing":
      return { kind: "ok" };
    case "file":
      return { kind: "refused", reason: "file-outdir" };
    case "symlink":
      return { kind: "refused", reason: "symlink-outdir" };
    case "broken-symlink":
      return { kind: "refused", reason: "broken-symlink-outdir" };
    case "dir": {
      if (probe.isForeign) return { kind: "refused", reason: "foreign-projection" };
      if (probe.isPriorProjection) return { kind: "ok" };
      if (probe.dirNonEmpty) return { kind: "refused", reason: "non-projection-nonempty-dir" };
      return { kind: "ok" };
    }
  }
}

// 1-line usage message per refusal — no raw ENOTDIR/EEXIST stack leaks
// (business-logic-model エラー処理). Substrings kept stable so existing callers
// and tests can match on them.
function refusalMessage(reason: OutDirRefusal): string {
  switch (reason) {
    case "non-projection-nonempty-dir":
      return "output directory is non-empty and is not a prior projection";
    case "foreign-projection":
      return "output directory is a projection of a different plugin/harness";
    case "file-outdir":
      return "output path is a file, not a directory";
    case "symlink-outdir":
      return "output path is a symlink";
    case "broken-symlink-outdir":
      return "output path is a broken symlink";
  }
}

// The prior-projection marker: written into a real install outDir (NOT into the
// dist bundle — dist stays marker-free so the claude bundle is byte-identical to
// U2 and every dist bundle is generator-clean). Its presence is `isPriorProjection`;
// a marker naming a different plugin/harness is `isForeign`.
const PROJECTION_MARKER = ".amadeus-plugin-projection.json";
type ProjectionMarker = { plugin: string; harness: PackageHarness };

function readProjectionMarker(outDir: string): ProjectionMarker | null {
  const p = join(outDir, PROJECTION_MARKER);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as ProjectionMarker;
  } catch {
    return null;
  }
}

// Probe a real outDir into the pure OutDirProbe classifyOutDir consumes. Handles
// the plain/dangling symlink split: existsSync follows links, so a broken symlink
// is existsSync-false but has an lstat entry.
function probeOutDir(outDir: string, plugin: string, harness: PackageHarness): OutDirProbe {
  const inert = (lstatKind: OutDirProbe["lstatKind"]): OutDirProbe => ({
    lstatKind,
    isPriorProjection: false,
    isForeign: false,
    dirNonEmpty: false,
  });
  if (!existsSync(outDir)) {
    let dangling = false;
    try {
      dangling = lstatSync(outDir).isSymbolicLink();
    } catch {
      return inert("missing");
    }
    return inert(dangling ? "broken-symlink" : "missing");
  }
  const st = lstatSync(outDir);
  if (st.isSymbolicLink()) return inert("symlink");
  if (!st.isDirectory()) return inert("file");
  const marker = readProjectionMarker(outDir);
  const isPrior = marker !== null && marker.plugin === plugin && marker.harness === harness;
  return {
    lstatKind: "dir",
    isPriorProjection: isPrior,
    isForeign: marker !== null && !isPrior,
    // `!== 0` (not `> 0`) keeps the complexity gate's naive TS parser balanced —
    // a bare `>` reads as an unmatched generic close and desyncs its boundaries.
    dirNonEmpty: readdirSync(outDir).length !== 0,
  };
}

// The auto-compose command a session hook (folder-drop-auto) or a manual step
// (manual-only) runs. `<harnessDir>/tools/amadeus-plugin.ts` is the installed CLI
// (C1). U3 distributes this recipe; U4 wires it into each harness's native seam.
function autoComposeCommand(harnessDir: string): string {
  return `bun ${harnessDir}/tools/amadeus-plugin.ts compose --if-stale`;
}
function manualComposeCommand(harnessDir: string): string {
  return `bun ${harnessDir}/tools/amadeus-plugin.ts compose`;
}

// The harness-neutral auto-compose snippet a folder-drop-auto face ships. Kept
// format-neutral on purpose: the harness-native embedding (codex config.toml,
// kiro agents.json, kimi .toml) is U4 hook-wiring, not U3 projection.
export function autoComposeSnippet(harnessDir: string): string {
  return `${autoComposeCommand(harnessDir)}\n`;
}

// A markdown inline-code span. The backtick is produced via fromCharCode so NO
// literal backtick appears in source — a lone/escaped backtick desyncs lizard's
// string scanner and merges this whole region into the prior function.
function code(s: string): string {
  const bt = String.fromCharCode(96);
  return bt + s + bt;
}

// The INSTALL doc every non-claude face ships (folder-drop-auto and manual-only).
// manual-only says "run compose yourself"; folder-drop-auto points at the snippet.
export function installDoc(name: string, harnessDir: string, clazz: PluginHostClass): string {
  const lines = [
    `# Install: ${name}`,
    "",
    `Copy this bundle's ${code(`plugins/${name}/`)} into ${code(`${harnessDir}/plugins/${name}/`)}.`,
    "",
  ];
  if (clazz === "manual-only") {
    lines.push(
      "This harness has no auto-compose session hook. Run compose after install and after every plugin change:",
      "",
      `    ${manualComposeCommand(harnessDir)}`,
      "",
    );
  } else {
    lines.push(
      `Auto-compose is wired from ${code("hooks/auto-compose.snippet")} on session start. To compose manually:`,
      "",
      `    ${manualComposeCommand(harnessDir)}`,
      "",
    );
  }
  return lines.join("\n");
}

// The install bundle for one face, dispatched on the ADR-4 class (3 arms, C3):
//   native-manifest (claude)  → the U2 claude bundle, UNCHANGED (marketplace
//                               manifest + hooks.json + content).
//   folder-drop-auto          → content + INSTALL.md + hooks/auto-compose.snippet.
//   manual-only               → content + INSTALL.md (no snippet).
// Relative to the install root; sorted by path; deterministic given the source.
export function installArtifacts(plugin: PluginSource, harness: PackageHarness): readonly ProjectedArtifact[] {
  const clazz = PLUGIN_HOST_CLASS[harness];
  if (clazz === "native-manifest") return claudeInstallArtifacts(plugin);
  const spec = harnessProjectionSpec(harness);
  const manifestSource = join(plugin.sourceRoot, PLUGIN_MANIFEST);
  const generated = (relativePath: string, text: string): ProjectedArtifact => ({
    owner: plugin.directoryName,
    harness,
    relativePath,
    bytes: Buffer.from(text, "utf-8"),
    sourcePath: manifestSource,
  });
  const out: ProjectedArtifact[] = [
    generated("INSTALL.md", installDoc(plugin.directoryName, spec.harnessDir, clazz)),
    ...buildPluginProjection(plugin, harness).artifacts, // plugins/<name>/<rel>, harness-transformed
  ];
  if (clazz === "folder-drop-auto")
    out.push(generated("hooks/auto-compose.snippet", autoComposeSnippet(spec.harnessDir)));
  return out.sort((x, y) => cmpStr(x.relativePath, y.relativePath));
}

// Public seam (C3): project one plugin for `harness` into `outDir`, writing the
// install bundle after the plan-stage output-safety classification. Every face is
// implemented (U3); the class-driven layout comes from installArtifacts. A prior-
// projection marker is written last so a re-projection of the same plugin/harness
// is accepted (#32) while a foreign or non-projection dir is refused (#27/#28).
export function projectPluginForHarness(
  plugin: PluginSource,
  harness: PackageHarness,
  outDir: string,
): ProjectionResult {
  const verdict = classifyOutDir(probeOutDir(outDir, plugin.directoryName, harness));
  if (verdict.kind === "refused")
    throw new Error(`refusing to project into ${outDir}: ${refusalMessage(verdict.reason)}`);
  const artifacts = installArtifacts(plugin, harness);
  for (const a of artifacts) {
    const dest = join(outDir, ...a.relativePath.split("/"));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, a.bytes);
  }
  const marker: ProjectionMarker = { plugin: plugin.directoryName, harness };
  writeFileSync(join(outDir, PROJECTION_MARKER), `${JSON.stringify(marker, null, 2)}\n`);
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
// U3 neutral-bundle write⇔check (REL-U3-2: one hash function, shared by both
// sides). The dist neutral bundle at dist/plugins/<name>/ carries the verbatim
// source content AND one install bundle per packaged face at
// dist/plugins/<name>/<harness>/. Write and check both derive from the single
// `pluginBundleExpected` map, so the symmetry is structural, and the byte
// comparison is `computeProjectionHash` — check re-projects and re-hashes.
// ---------------------------------------------------------------------------

// The one hash both sides use. sha256-hex over the file bytes; byte equality iff
// hex equality. A single definition means check can never drift from write.
export function computeProjectionHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// A drift in the neutral bundle: `stale` (expected but missing or byte-different
// on disk — needs re-projection) or `orphan` (on disk with no source). The two
// directions REL-U3-2 forces the type to enumerate.
export type DriftEntry = { kind: "stale" | "orphan"; path: string };

// The full expected neutral bundle as dist-root-relative POSIX path → bytes: the
// verbatim source content once, plus every face's install bundle under
// plugins/<name>/<harness>/. Zero plugins → empty map (the 0-plugin byte-identical
// baseline: dist/plugins is never created — REL-U3-1). Single source for write
// AND check.
export function pluginBundleExpected(
  root: string = join(REPO_ROOT, "plugins"),
  io: ReadOnlyFs = nodeReadOnlyFs,
): Map<string, Buffer> {
  const expected = new Map<string, Buffer>();
  for (const plugin of validatePluginSources(discoverPluginSources(root, io))) {
    for (const a of buildPluginBundle(plugin)) expected.set(a.relativePath, a.bytes);
    for (const harness of PACKAGE_HARNESSES) {
      const prefix = posix.join("plugins", plugin.directoryName, harness);
      for (const a of installArtifacts(plugin, harness)) expected.set(posix.join(prefix, a.relativePath), a.bytes);
    }
  }
  return expected;
}

// Public seam (C3 --check): drift of the committed dist neutral bundle vs the
// re-projected expected bundle. `stale` covers MISSING and DIFFERS (both need a
// re-project); `orphan` is a committed file with no expected source. Sorted by
// (kind, path). Empty when there are no plugins and no committed bundle.
export function checkPluginProjections(
  root: string = join(REPO_ROOT, "plugins"),
  distRoot: string = join(REPO_ROOT, "dist"),
  io: ReadOnlyFs = nodeReadOnlyFs,
): DriftEntry[] {
  const expected = pluginBundleExpected(root, io);
  const out: DriftEntry[] = [];
  for (const [rel, want] of expected) {
    const abs = join(distRoot, ...rel.split("/"));
    if (!io.exists(abs) || computeProjectionHash(io.read(abs)) !== computeProjectionHash(want))
      out.push({ kind: "stale", path: rel });
  }
  const distPlugins = join(distRoot, "plugins");
  if (io.exists(distPlugins)) {
    for (const { rel } of walkFs(io, distPlugins, "")) {
      const key = posix.join("plugins", rel);
      if (!expected.has(key)) out.push({ kind: "orphan", path: key });
    }
  }
  return out.sort((a, b) => (a.kind !== b.kind ? cmpStr(a.kind, b.kind) : cmpStr(a.path, b.path)));
}

// ---------------------------------------------------------------------------
// Self-install closed union (C5 internal helper — NOT a public seam)
// ---------------------------------------------------------------------------

export function isSelfInstallHarness(name: string): name is SelfInstallHarness {
  return (SELF_INSTALL_HARNESSES as readonly string[]).includes(name);
}

// Assert a harness belongs to the self-install closed five. kiro/kiro-ide are
// packaged but must never promote to the project root; a runtime reject backs
// the compile-time SelfInstallHarness union.
export function assertSelfInstallHarness(name: string): SelfInstallHarness {
  if (!isSelfInstallHarness(name))
    throw new PluginValidationError([`SELF_INSTALL rejected: ${name} is not in the closed five`]);
  return name;
}

// C5 internal helper: the self-install projection is the closed five faces only.
// Returns the (empty) BuildResult contract; the actual byte reflection stays in
// promote-self.ts's existing five-face closed list — U09 does not widen it.
export function buildSelfInstallProjection(name: SelfInstallHarness): BuildResult {
  assertSelfInstallHarness(name);
  return { expectedPaths: new Set(), readSources: new Set(), outsideHarness: [] };
}
