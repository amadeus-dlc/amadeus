#!/usr/bin/env bun
// scripts/package.ts — THE build entry for the one-core-N-harnesses layout.
//
//   bun scripts/package.ts            regenerate dist/{claude,kiro,codex}
//   bun scripts/package.ts <name>      regenerate just one harness
//
// PIPELINE PER HARNESS (per the engine design, generalized from the proven S4 prototype and
// the package-codex.ts engine):
//   1. COPY core/<src> → dist/<name>/<harnessDir>/<dst>, substituting
//      {{HARNESS_DIR}} → harnessDir in .md prose (the ONE transform class) and
//      applying the manifest's rules-dir rename.
//   2. COPY harness/<name>/<src> → dist/<name>/<harnessDir>/<dst> (authored
//      surfaces: orchestrator skill, CLAUDE.md/AGENTS.md, settings/config), same
//      token substitution on .md.
//   3. COMPILE the stage graph into the assembled tree (emits harness-correct
//      stage-graph.json + scope-grid.json — compiled data lives only in dist).
//   4. GENERATE runners into the assembled tree by composing amadeus-runner-gen's
//      exported render fns under AMADEUS_HARNESS_DIR (the proven codex idiom, now
//      uniform for all three harnesses).
//   5. EMIT via harness/<name>/emit.ts if the manifest declares one (codex only
//      today: config.toml, hooks.json, trust-seed, agent TOMLs, .agents/skills).
//
// THE TRANSFORM CLASS (T5 — the only permitted text transform): the harness-dir
// token. core/ prose carries {{HARNESS_DIR}}; here it becomes `.claude`/`.kiro`/
// `.codex`. Truthful carve-outs in core (workspace-detection's 3-dir list, the
// `$CLAUDE_PROJECT_DIR on Claude Code` note) never carried the token, so they
// pass through untouched.
//
// Distribution trees are build output and are intentionally untracked. Build
// reproducibility is verified from two isolated trees in CI; this command only
// writes the requested generated output.

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import type {
  HarnessManifest,
  HarnessResourceDescriptor,
} from "./manifest-types.ts";
import { assertHarnessManifest } from "./harness-manifest.ts";
import {
  mirrorProjection,
  mirrorProjectionRegistryDigest,
} from "../packages/framework/harness/projections.ts";
import { DistributionTransactionCoordinator } from "./distribution-transaction.ts";
import { renderOnboarding } from "./onboarding.ts";
import { substituteToken, transform } from "./harness-transform.ts";
import {
  assertInstallOutDirsSafe,
  checkPluginProjections,
  discoverPluginSources,
  pluginBundleExpected,
  type PluginSource,
  validatePluginSources,
} from "./plugin-projection.ts";
import { AMADEUS_VERSION } from "../packages/framework/core/tools/amadeus-version.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRAMEWORK_ROOT = join(REPO_ROOT, "packages", "framework");
const CORE_ROOT = join(FRAMEWORK_ROOT, "core");
const HARNESS_ROOT = join(FRAMEWORK_ROOT, "harness");
// The shared onboarding-doc skeleton, rendered per harness (scripts/onboarding.ts).
const ONBOARDING_SKELETON = join(CORE_ROOT, "templates", "onboarding.md");
// Authoring root for plugin sources projected into every harness (FR-6 item 19).
// DISCOVERED, not hardcoded: absent/empty → zero added bytes (plugin 0-file
// baseline stays byte-identical to a pre-plugin packager). Read at CALL time
// (not module load) so an AMADEUS_PLUGINS_ROOT / AMADEUS_DIST_ROOT override lets
// a test drive plugin projection against a temp workspace WITHOUT mutating the
// real plugins/ or dist/ a concurrent packager spawn would observe.
function pluginsRoot(): string {
  return process.env.AMADEUS_PLUGINS_ROOT ?? join(REPO_ROOT, "plugins");
}
function distRoot(): string {
  return process.env.AMADEUS_DIST_ROOT ?? join(REPO_ROOT, "dist");
}

// Harnesses the packager builds = every harness/<name>/ that carries a
// manifest.ts. DISCOVERED, not hardcoded: adding harness #N is one harness/<n>/
// dir + manifest row (+ optional emit.ts), with zero edits here — the
// one-core-many-harnesses promise. Sorted so the default build order is
// stable (claude first by name).
export function discoverHarnessNames(): string[] {
  if (!existsSync(HARNESS_ROOT)) return [];
  return readdirSync(HARNESS_ROOT)
    .filter((n) => existsSync(join(HARNESS_ROOT, n, "manifest.ts")))
    .sort();
}

// Transform (token substitution on .md prose; .json + .ts copied verbatim) and
// its helpers live in scripts/harness-transform.ts — shared with the plugin
// projector so both surfaces apply the SAME prose rules from one owner.

// Append manifest-declared frontmatter lines to a projected .md, just before
// the closing `---` of its YAML block (manifest-types.ts frontmatterAdditions).
// Hard errors, never silent: the file must open with a frontmatter block, and
// no added line's key may already exist in it - if core later grows the same
// key, the build fails loudly instead of shipping a double.
function applyFrontmatterAdditions(
  content: string,
  lines: string[],
  file: string,
): string {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n(---\r?\n)/);
  if (!m) {
    throw new Error(
      `frontmatterAdditions: ${file} has no leading frontmatter block to extend.`,
    );
  }
  const fm = m[1];
  for (const line of lines) {
    const key = line.split(":")[0]?.trim();
    if (!key || !/^[A-Za-z_][\w-]*$/.test(key)) {
      throw new Error(
        `frontmatterAdditions: line "${line}" for ${file} does not start with a YAML key.`,
      );
    }
    if (new RegExp(`^${key}:`, "m").test(fm)) {
      throw new Error(
        `frontmatterAdditions: ${file} already declares "${key}:" in core - ` +
          `resolve the collision instead of shipping a duplicate key.`,
      );
    }
  }
  const insertAt = m[0].length - m[2].length;
  return `${content.slice(0, insertAt)}${lines.join("\n")}\n${content.slice(insertAt)}`;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

// Compiled graph outputs whose embedded rule paths may need a harness rename.
const COMPILED_DATA = ["tools/data/stage-graph.json", "tools/data/scope-grid.json"];

// The packager-emitted harness descriptor (vision T1 open-set seam): the
// runtime reads tools/data/harness.json to learn this harness's rules-subdir
// without a hardcoded map. Derived from the manifest, written into every tree.
const HARNESS_DATA = "tools/data/harness.json";

// The relocated method ("memory") — the single hand-editable source of truth
// for the layered practices (org/team/project + phases/). It is HARNESS-NEUTRAL
// (identical bytes on every harness — neutral filenames, no {{HARNESS_DIR}}
// token), so the source dir + the dist destination are constants here, not
// per-manifest. The authored source already carries the renamed/nested layout
// (core/rules/amadeus-org.md → core/memory/org.md; flat amadeus-phase-<p>.md →
// core/memory/phases/<p>.md) — the per-file rename map is realized by that move,
// so the packager copies the tree verbatim. The destination sits at the
// WORKSPACE ROOT (beside the harness dir), under the always-present `default`
// space, so a fresh `dist/<harness>/` copy ships a resolving method tree and the
// per-harness native include points at it (Claude @-stub, Kiro resources glob,
// Codex AGENTS.md/@-mention) — one copy, no drift.
const MEMORY_SRC = "memory";
const MEMORY_DST = join("amadeus", "spaces", "default", "memory");

// Engine-only-install self-heal: the SAME method content (core/memory/) ALSO emitted
// INSIDE the engine dir at <harnessDir>/tools/data/memory-seed/, mirroring how
// tools/data/templates ships (an engine-bundled, copy-out-at-runtime data dir
// resolved relative to the running tool — see frameworkTemplatesDir/DATA_DIR in
// amadeus-graph.ts). This lets an ENGINE-ONLY install (a user who copies only
// dist/<h>/.<engine>/ and NOT the sibling amadeus/ shell) self-heal: the first
// /amadeus seeds amadeus/spaces/default/memory/ from this bundled copy if (and only
// if) it is absent (see ensureWorkspaceDirs). The sibling MEMORY_DST shell STILL
// ships for normal installs — this is an additive fallback, not a replacement.
const MEMORY_SEED_DST = join("tools", "data", "memory-seed");

// The active-space CURSOR shipped as part of the workspace shell (SEED). It
// lives at amadeus/active-space (ABOVE spaces/, not inside memory/) and holds the
// name of the space the next /amadeus resolves against. Ships pointed at the
// always-present "default" space so a fresh copy resolves with zero ceremony.
// NOTE: it is GITIGNORED in the user's workspace (a per-user session cursor,
// vision 5.1 - teammates legitimately point at different spaces at once), yet
// dist must SHIP it as part of the shell. The two reconcile: the dist
// .gitignore ignores amadeus/active-space for the END USER (their first /amadeus
// cursor-write stays untracked), while OUR repo commits the shipped pointer
// once (git add -f on the seed commit) - after which it is tracked and the
// gitignore is moot for that path here, exactly like a shipped default .env.
const ACTIVE_SPACE_REL = join("amadeus", "active-space");
const ACTIVE_SPACE_VALUE = "default\n";

// The plain-text version marker shipped at the engine-dir root
// (<harnessDir>/VERSION). Sourced from core/tools/amadeus-version.ts — the one
// hand-edited version truth — so a copied install (`cp -r dist/<h>/<harnessDir>/`)
// carries a human-readable framework version (`cat .claude/VERSION`) without
// opening tools/amadeus-version.ts or running the CLI.
const VERSION_FILE = "VERSION";

function writeVersionFile(treeRoot: string): void {
  writeFileSync(join(treeRoot, VERSION_FILE), `${AMADEUS_VERSION}\n`);
}

function resourceDescriptors(
  m: HarnessManifest,
): readonly HarnessResourceDescriptor[] | undefined {
  if (m.resources === undefined) return undefined;
  const harnessSrcRoot = join(HARNESS_ROOT, m.name);
  return m.resources.map((resource) => {
    const bytes = readFileSync(join(harnessSrcRoot, ...resource.source.split("/")));
    return {
      ...resource,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
}

// Write tools/data/harness.json from manifest data. Today it carries just the
// rules-subdir (the one rename the runtime must know per-tree); the object shape
// leaves room for future per-harness runtime facts. Pretty-printed + trailing
// newline so generated bytes are deterministic across isolated builds.
function writeHarnessData(treeRoot: string, m: HarnessManifest): void {
  const resources = resourceDescriptors(m);
  const data = {
    name: m.name,
    harnessDir: m.harnessDir,
    rulesSubdir: m.rulesRename ?? "rules",
    stageEntry: m.stageEntry,
    ...(m.nativeRuntime ? { nativeRuntime: m.nativeRuntime } : {}),
    ...(resources ? { resources } : {}),
  };
  const dst = join(treeRoot, HARNESS_DATA);
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, `${JSON.stringify(data, null, 2)}\n`);
}

// Emit the method ("memory") tree at the WORKSPACE ROOT of the dist tree
// (dist/<name>/amadeus/spaces/default/memory/), copying core/memory/ verbatim with
// the standard .md token transform (a no-op on the neutral method files, which
// carry no {{HARNESS_DIR}} token). Returns the absolute paths it wrote so
// callers can inventory them (they live OUTSIDE <harnessDir>, like the
// projectRoot harness files). Same source + destination for every harness — the
// method is harness-neutral; the per-harness native include is what differs.
function emitMemory(outRoot: string, harnessDir: string, rulesRename: string | null): string[] {
  const srcDir = join(CORE_ROOT, MEMORY_SRC);
  const written: string[] = [];
  if (!existsSync(srcDir)) return written;
  for (const file of walk(srcDir)) {
    const rel = relative(srcDir, file);
    const outPath = join(outRoot, MEMORY_DST, rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, transform(file, readFileSync(file), harnessDir, rulesRename));
    written.push(outPath);
  }
  return written;
}

// Engine-only-install self-heal: emit the SAME core/memory/ tree a SECOND time,
// INSIDE the engine dir at <treeRoot>/tools/data/memory-seed/, so an engine-only
// install carries the method content with it (the first /amadeus copies it out via
// ensureWorkspaceDirs/frameworkMemorySeedDir). Mirrors emitMemory's transform
// (a no-op on the neutral method files) but writes into treeRoot (the harness
// engine dir), so the normal in-harness walk + byte-diff covers it — no
// outsideHarness bookkeeping needed. Same source as emitMemory, different dst.
function emitMemorySeed(treeRoot: string, harnessDir: string, rulesRename: string | null): void {
  const srcDir = join(CORE_ROOT, MEMORY_SRC);
  if (!existsSync(srcDir)) return;
  for (const file of walk(srcDir)) {
    const rel = relative(srcDir, file);
    const outPath = join(treeRoot, MEMORY_SEED_DST, rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, transform(file, readFileSync(file), harnessDir, rulesRename));
  }
}

// Emit the active-space CURSOR (amadeus/active-space -> "default") into the dist
// tree, as part of the workspace shell (SEED). Lives at the dist root beside
// the harness dir (dist/<name>/amadeus/active-space), OUTSIDE <harnessDir>, like
// the memory tree and projectRoot harness files. Returns the absolute path it
// wrote so callers can inventory it. Harness-neutral: same
// pointer value for every harness (the resolver follows it identically). The
// dist .gitignore ignores this path for the END USER's workspace; OUR repo
// commits the shipped pointer via git add -f on the seed commit (see the
// ACTIVE_SPACE_REL note).
function emitActiveSpace(outRoot: string): string {
  const outPath = join(outRoot, ACTIVE_SPACE_REL);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, ACTIVE_SPACE_VALUE);
  return outPath;
}

// The result of a buildTree run: the out-of-harness paths produced (for the
// byte-diff) and the set of harness SOURCE files the build actually read (for
// the unreferenced-source scan, #735).
type BuildResult = { outsideHarness: string[]; readSources: Set<string> };

// Discover + structurally validate the repo's plugin sources. Absent plugins/ →
// [] (the plugin 0-file baseline: every plugin-aware step below becomes a no-op,
// so a pre-plugin repo builds byte-identical output). A malformed/duplicate/
// unsafe source throws loudly here, before any write. Re-read per call (not
// cached) so it never goes stale within a long-lived process (tests, watch).
function repoPlugins(): readonly PluginSource[] {
  return validatePluginSources(discoverPluginSources(pluginsRoot()));
}

// Record every discovered plugin's source paths as referenced, WITHOUT writing
// them into the compile-visible <harnessDir>/plugins/ tree.
//
// Plugins ship ONLY as the harness-neutral bundle (dist/plugins/<name>/, see
// writeNeutralBundle). They are deliberately NOT projected into the in-harness
// <harnessDir>/plugins/ tree: a plugin STAGE file landed there would be
// discovered by compileStageGraph's plugin-stage walk (amadeus-graph.ts
// discoverPluginStageFiles), making the SHIPPED stage-graph.json non-0-plugin
// and breaking the recompile-idempotence invariant (t110/t88; FR-2.3 "dist all
// harnesses 0-plugin byte-identical"). A team opts a plugin in by composing it
// from the neutral bundle into its own host tree; the compile discovers the
// COMPOSED copy there, never a shipped one. (Intent 260722-tla-plugin U2, ruling
// E-TLAU2 option A. This touches the packager, which the U2 core-change boundary
// otherwise limits to amadeus-graph.ts — declared crossing.)
//
// The read-source accounting is preserved so the unreferenced-source scan (#735)
// still counts the plugin's authored files as referenced. No-op at zero plugins.
function projectPluginsIntoHarnessTree(
  _m: HarnessManifest,
  _treeRoot: string,
  readSources: Set<string>,
): void {
  for (const plugin of repoPlugins()) {
    for (const a of plugin.artifacts) readSources.add(a.sourcePath);
  }
}

function requiredResourceSource(harnessName: string, harnessSrcRoot: string, source: string): string {
  let cursor = harnessSrcRoot;
  for (const segment of source.split("/")) {
    cursor = join(cursor, segment);
    if (!existsSync(cursor)) throw new Error(`[${harnessName}] missing required resource: ${source}`);
    if (lstatSync(cursor).isSymbolicLink())
      throw new Error(`[${harnessName}] resource source contains a symlink: ${source}`);
  }
  if (!lstatSync(cursor).isFile())
    throw new Error(`[${harnessName}] resource source is not a regular file: ${source}`);
  return cursor;
}

function copyManifestResources(
  m: HarnessManifest,
  harnessSrcRoot: string,
  outRoot: string,
  readSources: Set<string>,
): void {
  for (const resource of m.resources ?? []) {
    const srcPath = requiredResourceSource(m.name, harnessSrcRoot, resource.source);
    readSources.add(srcPath);
    const outPath = join(outRoot, ...resource.destination.split("/"));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      transform(srcPath, readFileSync(srcPath), m.harnessDir, m.rulesRename),
    );
  }
}

// ---------------------------------------------------------------------------
// Build one harness tree into `outRoot` (the dist/<name> dir). Returns the set
// of paths the copy+generate steps produced (for the orphan scan) plus the set
// of harness SOURCE files the build actually read (for the unreferenced-source
// scan). Compiled data bootstraps from the source-owned stage identity seed.
// ---------------------------------------------------------------------------
function buildTree(m: HarnessManifest, outRoot: string): BuildResult {
  const harnessDir = m.harnessDir;
  const harnessSrcRoot = join(HARNESS_ROOT, m.name);
  const treeRoot = join(outRoot, harnessDir);
  // Out-of-harness paths the build produced (memory tree + any emit output),
  // returned for callers that inventory files OUTSIDE <harnessDir>.
  const outsideHarness: string[] = [];
  // Absolute paths of harness SOURCE files this build actually read: declared
  // harnessFiles copies (below), emit's readHarnessSource inputs, and the
  // require/import module graph (manifest.ts, onboarding.fills.ts, emit.ts)
  // harvested from require.cache before returning. The source inventory guard
  // source tree against this set to flag stale, unreferenced source (#735).
  const readSources = new Set<string>();

  // 1. Copy core dirs with token substitution + rules rename. Manifest-declared
  //    frontmatter additions (harness-native fields, e.g. the Kiro IDE's
  //    subagent `tools:` grant) are appended during this projection; every
  //    declared file must be hit exactly once (typo/rename guard).
  const fmAdditions = new Map(
    (m.frontmatterAdditions ?? []).map(({ file, lines }) => [file, lines]),
  );
  const fmApplied = new Set<string>();
  for (const { src, dst } of m.coreDirs) {
    const srcDir = join(CORE_ROOT, src);
    if (!existsSync(srcDir)) continue;
    const finalDst = m.rulesRename && dst === "rules" ? m.rulesRename : dst;
    for (const file of walk(srcDir)) {
      const rel = relative(srcDir, file);
      const outPath = join(treeRoot, finalDst, rel);
      mkdirSync(dirname(outPath), { recursive: true });
      let out = transform(file, readFileSync(file), harnessDir, m.rulesRename);
      // Manifest keys are POSIX; normalize the platform separator so the
      // lookup works on Windows too.
      const harnessRel = join(finalDst, rel).split(sep).join("/");
      const fmLines = fmAdditions.get(harnessRel);
      if (fmLines) {
        out = Buffer.from(
          applyFrontmatterAdditions(out.toString("utf-8"), fmLines, harnessRel),
          "utf-8",
        );
        fmApplied.add(harnessRel);
      }
      writeFileSync(outPath, out);
    }
  }
  const fmMissed = [...fmAdditions.keys()].filter((f) => !fmApplied.has(f));
  if (fmMissed.length > 0) {
    throw new Error(
      `[${m.name}] frontmatterAdditions name file(s) the core projection never produced: ` +
        `${fmMissed.join(", ")} - fix the path(s) in the manifest.`,
    );
  }

  // 2. Copy authored harness surfaces (token substitution on .md). projectRoot
  //    files land beside the harness dir (e.g. dist/kiro/AGENTS.md), the rest
  //    inside <harnessDir>/.
  for (const { src, dst, projectRoot } of m.harnessFiles) {
    const srcPath = join(harnessSrcRoot, src);
    if (!existsSync(srcPath)) continue;
    readSources.add(srcPath);
    const outPath = projectRoot ? join(outRoot, dst) : join(treeRoot, dst);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, transform(srcPath, readFileSync(srcPath), harnessDir, m.rulesRename));
  }

  // 2a. Copy manifest-catalogued native resources. Unlike legacy
  // harnessFiles, every catalog row is required and its source must be a plain
  // regular file: missing, symlinked, or non-regular resources fail before a
  // partial Pi tree can be mistaken for a supported harness.
  copyManifestResources(m, harnessSrcRoot, outRoot, readSources);

  // 2b. Render the onboarding doc from the shared skeleton (scripts/onboarding.ts),
  //     then run it through the SAME transform as any core .md — so {{HARNESS_DIR}}
  //     and the rules-rename are applied identically. The skeleton is the single
  //     source for every harness's onboarding doc; codex renders its own (with a
  //     Codex-specific header) inside emit(), so its manifest leaves onboarding null.
  if (m.onboarding) {
    const { dst, projectRoot, fills } = m.onboarding;
    const rendered = renderOnboarding(readFileSync(ONBOARDING_SKELETON, "utf-8"), fills);
    const outPath = projectRoot ? join(outRoot, dst) : join(treeRoot, dst);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, transform(dst, Buffer.from(rendered, "utf-8"), harnessDir, m.rulesRename));
    if (projectRoot) outsideHarness.push(outPath);
  }

  // 2c. Emit the relocated method ("memory") tree at the workspace root
  //     (dist/<name>/amadeus/spaces/default/memory/). MUST run before compile —
  //     the compile step's loadRules resolves rules_in_context from this tree
  //     (AMADEUS_RULES_DIR points there below), so it has to exist first.
  const memoryDir = join(outRoot, MEMORY_DST);
  outsideHarness.push(...emitMemory(outRoot, harnessDir, m.rulesRename));

  // 2d. Emit the active-space cursor (amadeus/active-space -> "default") — part of
  //     the shipped shell so a fresh copy resolves the default space with no
  //     ceremony (SEED). Outside <harnessDir>, like the memory tree.
  outsideHarness.push(emitActiveSpace(outRoot));

  // 2e. Engine-only-install self-heal: bundle the SAME method content INSIDE the
  //     engine dir at <harnessDir>/tools/data/memory-seed/, so an engine-only
  //     install (no sibling amadeus/ shell) can self-heal — the first /amadeus copies
  //     it out via ensureWorkspaceDirs. Inside <harnessDir>, so the in-harness
  //     the normal generated-tree walk includes it (no outsideHarness entry).
  emitMemorySeed(treeRoot, harnessDir, m.rulesRename);

  // 3. Compile the stage graph into the assembled tree (writes harness-correct
  //    stage-graph.json + scope-grid.json). Stable number/name mappings come
  //    from source-owned tools/data/stage-identities.json, so a generated seed
  //    or pre-existing dist tree is not required.
  // Point loadRules at the emitted method tree via AMADEUS_RULES_DIR so
  // rules_in_context is populated at compile time. The method now lives at the
  // workspace-root amadeus/spaces/default/memory/ (NOT inside <harnessDir>), so
  // every harness — claude included — needs the seam set; the resolver's own
  // default would resolve relative to the in-tree tools/ dir, which points at
  // the same place, but the assembled candidate tree makes the explicit
  // override the robust choice. The renameRulesInCompiledData backstop still
  // runs for renamed-rules harnesses to normalize any residual <dir>/rules/
  // prose-path that a future code path might emit (guarded no-op today).
  runTool(treeRoot, ["tools/amadeus-graph.ts", "compile"], harnessDir, memoryDir);
  if (m.rulesRename) renameRulesInCompiledData(treeRoot, harnessDir, m.rulesRename);

  // 3b. Emit tools/data/harness.json — the runtime's open-set source of truth
  //     for the rules-subdir rename. rulesSubdir() (amadeus-lib.ts) reads it so a
  //     real install of a rename-rules harness resolves its rule dir with ZERO
  //     core edits (the rename is manifest data, not a hardcoded map). Derived
  //     purely from the manifest, so unseeded; written into the same tools/data/
  //     the compile step just created, hence included in the generated tree
  //     like any other generated file.
  writeHarnessData(treeRoot, m);

  // 3c. Emit the <harnessDir>/VERSION marker (plain text, one line) so every
  //     shipped tree — and every install copied from it — states its framework
  //     version. Same emit-in-buildTree contract as harness.json: regenerated
  //     every build and included in the generated tree.
  writeVersionFile(treeRoot);

  // 4. Generate runners by composing amadeus-runner-gen's CLIs against the
  //    assembled tree (write + scopes). AMADEUS_HARNESS_DIR steers harnessDir()
  //    so generated prose names the correct dir; AMADEUS_SRC roots the tree.
  //    Codex skips this — it ships no <harnessDir>/skills/; emit() composes the
  //    whole skill set into .agents/skills/ instead.
  if (!m.skipRunnerGen) {
    runTool(treeRoot, ["tools/amadeus-runner-gen.ts", "write"], harnessDir);
    runTool(treeRoot, ["tools/amadeus-runner-gen.ts", "scopes"], harnessDir);
  }

  // 5. Per-shell emissions (codex only today). Returns the absolute paths it
  //    wrote, so the caller can byte-diff emit-owned files that live OUTSIDE
  //    <harnessDir> (e.g. .agents/skills/, the root AGENTS.md).
  if (m.emit) {
    outsideHarness.push(
      ...m.emit({
        repoRoot: REPO_ROOT,
        coreRoot: CORE_ROOT,
        harnessRoot: harnessSrcRoot,
        // Records every harness-source read into readSources as it happens, so
        // emit's authored inputs (codex's orchestrator SKILL.md etc.) count as
        // referenced in the unreferenced-source scan (#735).
        readHarnessSource: (relPath: string): string => {
          const abs = join(harnessSrcRoot, relPath);
          readSources.add(abs);
          return readFileSync(abs, "utf-8");
        },
        distRoot: outRoot,
        harnessDir,
        substituteToken: (s: string) => substituteToken(s, harnessDir),
        check: false,
      }).written,
    );
  }

  // 6. Project discovered plugin sources into this harness tree at
  //    <harnessDir>/plugins/<name>/ (FR-6 item 19). No-op at zero plugins, so
  //    the tree stays byte-identical to a pre-plugin build. Extracted so its two
  //    nested loops don't inflate buildTree's cyclomatic complexity.
  projectPluginsIntoHarnessTree(m, treeRoot, readSources);

  // Harvest the require/import module graph the build loaded from this harness's
  // source dir (manifest.ts + its static imports: onboarding.fills.ts, and for
  // codex emit.ts). loadManifest require()s manifest.ts before buildTree runs, so
  // require.cache holds these by the time we snapshot; filter to this harness's
  // source dir (the trailing separator keeps "kiro" from matching "kiro-ide").
  // This is how the build-mechanism .ts files count as referenced WITHOUT a
  // hardcoded list (FR-1.2): the module loader is the source of truth.
  const modulePrefix = harnessSrcRoot + sep;
  for (const key of Object.keys(require.cache ?? {})) {
    if (key.startsWith(modulePrefix)) readSources.add(key);
  }

  return { outsideHarness, readSources };
}

// Run an in-tree tool (bun <treeRoot>/<rel> ...) with the harness env seams set
// so the tool resolves the assembled tree and interpolates the right harness dir.
// `rulesDirAbs` (absolute) points loadRules at the emitted method tree
// (dist/<name>/amadeus/spaces/default/memory/) so rules_in_context is populated at
// compile time — every harness needs it now that the method lives at the
// workspace root, not inside <harnessDir>.
function runTool(
  treeRoot: string,
  args: string[],
  harnessDir: string,
  rulesDirAbs?: string | null,
): void {
  const toolPath = join(treeRoot, args[0]);
  const rest = args.slice(1);
  // The authored manifest owns this value. Passing it through avoids a second
  // harness catalog or a basename inference seam in the packager.
  const env: Record<string, string> = {
    ...process.env,
    AMADEUS_SRC: treeRoot,
    AMADEUS_HARNESS_DIR: harnessDir,
  };
  if (rulesDirAbs) env.AMADEUS_RULES_DIR = rulesDirAbs;
  const res = spawnSync("bun", [toolPath, ...rest], {
    cwd: treeRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
  });
  if (res.status !== 0) {
    console.error(`packager: \`bun ${args.join(" ")}\` failed in ${treeRoot}`);
    if (res.stdout) console.error(res.stdout);
    if (res.stderr) console.error(res.stderr);
    process.exit(1);
  }
}

// Defense-in-depth backstop: rewrite any residual "<harnessDir>/rules/" →
// "<harnessDir>/<rulesRename>/" in the compiled JSON path strings. Since the
// rulesSubdir() seam landed, compile (run under AMADEUS_HARNESS_DIR) emits the
// renamed segment directly, so this normally matches nothing (guarded by the
// `out !== s` check). It stays as a safety net in case a future code path emits
// a literal "rules" segment that bypasses the seam. Slash-anchored, so it can
// only touch the rules path family.
function renameRulesInCompiledData(treeRoot: string, harnessDir: string, rulesRename: string): void {
  for (const rel of COMPILED_DATA) {
    const p = join(treeRoot, rel);
    if (!existsSync(p)) continue;
    const s = readFileSync(p, "utf-8");
    const out = s.replaceAll(`${harnessDir}/rules/`, `${harnessDir}/${rulesRename}/`);
    if (out !== s) writeFileSync(p, out);
  }
}

function loadManifest(name: string): HarnessManifest {
  const mod = require(join(HARNESS_ROOT, name, "manifest.ts")) as { default: HarnessManifest };
  const manifest = mod.default;
  assertHarnessManifest(manifest);
  const projection = mirrorProjection(manifest.mirrorSurface);
  if (manifest.name !== name || projection.surface !== name)
    throw new Error(`manifest ${name}: Mirror registry surface mismatch`);
  if (projection.harnessDir !== manifest.harnessDir)
    throw new Error(`manifest ${name}: Mirror registry harnessDir mismatch`);
  return manifest;
}

// ---------------------------------------------------------------------------
// write mode: regenerate dist/<name> in place (clean-sweep).
// ---------------------------------------------------------------------------

// Write mode replaces every dist/<name>/ file from one complete candidate tree,
// so a stale/renamed projectRoot output sitting directly under dist/<name>/ (or
// in an undeclared subdir) cannot survive a regenerate.
function resourcePathProblem(root: string, relativePath: string): string | null {
  let cursor = root;
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    cursor = join(cursor, segments[index]);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(cursor);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    if (stat.isSymbolicLink()) return "contains a symlink";
    if (index < segments.length - 1 && !stat.isDirectory()) return "has a non-directory parent";
    if (index === segments.length - 1 && !stat.isFile()) return "is not a regular file";
  }
  return null;
}

function resourceDestinationProblems(
  m: HarnessManifest,
  root: string,
): Array<{ destination: string; problem: string }> {
  const problems: Array<{ destination: string; problem: string }> = [];
  for (const resource of m.resources ?? []) {
    const problem = resourcePathProblem(root, resource.destination);
    if (problem) problems.push({ destination: resource.destination, problem });
  }
  return problems;
}

function assertResourceDestinationsSafe(m: HarnessManifest, root: string): void {
  const first = resourceDestinationProblems(m, root)[0];
  if (first)
    throw new Error(`[${m.name}] refusing unsafe resource destination ${first.destination}: ${first.problem}`);
}

export function writeHarness(name: string): void {
  const m = loadManifest(name);
  const distDir = join(REPO_ROOT, "dist", name);
  assertResourceDestinationsSafe(m, distDir);
  const candidate = mkdtempSync(join(tmpdir(), `amadeus-candidate-${name}-`));
  try {
    buildHarnessCandidate(name, candidate);
    const candidateFiles = new Map<string, Buffer>();
    for (const file of walk(candidate))
      candidateFiles.set(relative(candidate, file), readFileSync(file));
    const updates: Array<{ path: string; bytes: Buffer | null }> = [];
    for (const [rel, bytes] of candidateFiles)
      updates.push({ path: relative(REPO_ROOT, join(distDir, rel)), bytes });
    if (existsSync(distDir)) {
      for (const file of walk(distDir)) {
        const rel = relative(distDir, file);
        if (!candidateFiles.has(rel))
          updates.push({ path: relative(REPO_ROOT, file), bytes: null });
      }
    }
    new DistributionTransactionCoordinator(REPO_ROOT).apply(
      updates,
      mirrorProjectionRegistryDigest(),
    );
    console.log(`[${name}] regenerated dist/${name}/${m.harnessDir}`);
  } finally {
    rmSync(candidate, { recursive: true, force: true });
  }
}

export function buildHarnessCandidate(name: string, candidate: string): void {
  const manifest = loadManifest(name);
  const { readSources } = buildTree(manifest, candidate);
  const harnessSrcDir = join(HARNESS_ROOT, name);
  const unreadSources = unreferencedSources([...walk(harnessSrcDir)], readSources);
  if (unreadSources.length === 0) return;
  const listed = unreadSources
    .map((path) => relative(harnessSrcDir, path).split(sep).join("/"))
    .join(", ");
  throw new Error(`UNREFERENCED in source: ${name}/${listed}`);
}

// Pure diff for the unreferenced-source scan (#735): given every source file
// discovered under a harness dir (`allSources`) and the set of paths the build
// actually read (`readSources`), return the sources the build never read,
// sorted. Both sides are absolute paths; membership is exact string equality.
// Exported so a unit test can drive it directly without spawning a build.
export function unreferencedSources(
  allSources: string[],
  readSources: ReadonlySet<string>,
): string[] {
  return allSources.filter((p) => !readSources.has(p)).sort();
}

// ---------------------------------------------------------------------------
// Generated plugin sources — modules under plugins/ that are MACHINE COPIES of a
// canonical module under packages/framework/core. A plugin tool tree must resolve
// its imports inside its own directory (it is projected into hosts that carry no
// packages/framework/), so a canonical module a plugin depends on is duplicated
// rather than reached across the tree boundary.
//
// The copy is generator-owned with exactly the dist/ contract: never hand-edited,
// byte-identical to its source, rewritten by `bun scripts/package.ts` and
// refreshed by every distribution build. The source-pair test keeps the
// duplication explicit and byte-identical.
// ---------------------------------------------------------------------------
type GeneratedPluginSource = { readonly from: string; readonly to: string };

// Repo-relative POSIX source → destination pairs. Data, not code: a further
// duplicate is one row here and nothing else.
const GENERATED_PLUGIN_SOURCES: readonly GeneratedPluginSource[] = [
  {
    from: "packages/framework/core/tools/amadeus-formal-verif-model-map.ts",
    to: "plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts",
  },
  {
    from: "packages/framework/core/tools/tla-module-deps.ts",
    to: "plugins/formal-model-check/tools/tla-module-deps.ts",
  },
];

// `root` is a seam (defaults to the repo) so a test can drive write and check
// against a temp tree in-process — bun --coverage does not instrument spawned
// subprocesses.
export function writeGeneratedPluginSources(root: string = REPO_ROOT): void {
  for (const { from, to } of GENERATED_PLUGIN_SOURCES) {
    const outPath = join(root, ...to.split("/"));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, readFileSync(join(root, ...from.split("/"))));
  }
}

// MISSING / DIFFERS, matching the packager's existing drift vocabulary.
export function checkGeneratedPluginSources(root: string = REPO_ROOT): string[] {
  const problems: string[] = [];
  for (const { from, to } of GENERATED_PLUGIN_SOURCES) {
    const outPath = join(root, ...to.split("/"));
    if (!existsSync(outPath)) {
      problems.push(`MISSING generated plugin source: ${to} (copy of ${from})`);
      continue;
    }
    if (!readFileSync(outPath).equals(readFileSync(join(root, ...from.split("/"))))) {
      problems.push(`DIFFERS: ${to} is not byte-identical to ${from}`);
    }
  }
  return problems.sort();
}

// ---------------------------------------------------------------------------
// Harness-neutral plugin bundle at dist/plugins/<name>/ — the source-of-record
// U10 composes from. Written ONCE (not per harness): verbatim source bytes, no
// {{HARNESS_DIR}} token. Fully generator-owned, so write clean-sweeps it and
// check flags any drift. With zero plugins the bundle dir is never created, so
// dist/ stays byte-identical to a pre-plugin build.
// ---------------------------------------------------------------------------
// Expected bundle as dist-root-relative POSIX path → bytes. Delegates to the
// projector's single-source builder (verbatim content + one install bundle per
// packaged face at plugins/<name>/<harness>/, U3).
function neutralBundleExpected(): Map<string, Buffer> {
  return pluginBundleExpected(pluginsRoot());
}

export function writeNeutralBundle(): void {
  const expected = neutralBundleExpected();
  const distPlugins = join(distRoot(), "plugins");
  // Plan-stage outDir safety (ADR-5 / t188 #27-32): refuse to project into a
  // per-harness install outDir that is a symlink/file/broken symlink BEFORE the
  // clean-sweep follows or clobbers it. Throws (write-0) on a tamper.
  assertInstallOutDirsSafe(pluginsRoot(), distRoot());
  // Clean-sweep: the bundle is entirely generator-owned. Removing it first drops
  // any stale plugin/artifact before rewriting the current set (and, at zero
  // plugins, sweeps a leftover dir without recreating it).
  if (existsSync(distPlugins)) rmSync(distPlugins, { recursive: true, force: true });
  for (const [rel, bytes] of expected) {
    const outPath = join(distRoot(), ...rel.split("/"));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, bytes);
  }
}

export function checkNeutralBundle(): string[] {
  // Drift comes from the projector's single-source check (write⇔check symmetry,
  // REL-U3-2). `orphan` maps to the packager's ORPHAN; `stale` is split back into
  // the packager's existing MISSING/DIFFERS surface by whether the file is on disk.
  const dist = distRoot();
  return checkPluginProjections(pluginsRoot(), dist)
    .map((d) => {
      if (d.kind === "orphan") return `ORPHAN in dist: ${d.path}`;
      const abs = join(dist, ...d.path.split("/"));
      return existsSync(abs) ? `DIFFERS: ${d.path}` : `MISSING in dist: ${d.path}`;
    })
    .sort();
}

// ---------------------------------------------------------------------------
// CLI. Extracted as a function returning the process exit code so a unit test can
// drive every dispatch branch IN-PROCESS — bun --coverage does not instrument
// spawned subprocesses, so the spawn-based integration test cannot cover these
// lines. The import.meta.main guard at the bottom maps the return to
// process.exit for a real `bun scripts/package.ts …` invocation and keeps the
// dispatch from firing when the module is merely imported.
// ---------------------------------------------------------------------------
export function runCli(argv: string[]): number {
  // `package.ts codex trust --project <abs-dir> [--hooks-json <abs-path>]` —
  // print the codex hook-trust entries with <PROJECT_DIR> substituted, for the
  // installer to paste into $CODEX_HOME/config.toml (the trust-seed.toml recipe).
  if (argv[0] === "codex" && argv[1] === "trust") {
    const pIdx = argv.indexOf("--project");
    if (pIdx === -1 || !argv[pIdx + 1]) {
      console.error("usage: package.ts codex trust --project <abs-dir> [--hooks-json <abs-path>]");
      return 1;
    }
    const hIdx = argv.indexOf("--hooks-json");
    const { trustEntries } = require(join(HARNESS_ROOT, "codex", "emit.ts")) as {
      trustEntries: (project: string, hooksJson?: string) => string;
    };
    console.log(trustEntries(argv[pIdx + 1], hIdx !== -1 ? argv[hIdx + 1] : undefined));
    return 0;
  }

  if (argv.includes("--check")) {
    console.error(
      "package.ts --check has been removed; use the isolated reproducible-build CI job",
    );
    return 2;
  }
  const named = argv.find((a) => !a.startsWith("--"));
  // Default targets are DISCOVERED from harness/ (one manifest = one harness); a
  // named target builds just that one.
  const targets = named ? [named] : discoverHarnessNames();

  // Only build harnesses that actually have a manifest. Discovery already
  // guarantees this, so the filter only matters for an explicit named target that
  // lacks a manifest — surface that as a skip rather than a crash.
  const present = targets.filter((n) => existsSync(join(HARNESS_ROOT, n, "manifest.ts")));
  const absent = targets.filter((n) => !present.includes(n));
  if (absent.length > 0) console.log(`(skipping harness(es) without a manifest: ${absent.join(", ")})`);

  // Refresh generated plugin sources FIRST: the harness trees and the neutral
  // bundle both project plugins/, so they must observe the current copy.
  writeGeneratedPluginSources();
  for (const n of present) writeHarness(n);
  writeNeutralBundle();
  return 0;
}

if (import.meta.main) process.exit(runCli(process.argv.slice(2)));
