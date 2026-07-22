// scripts/plugin-composition.ts — C4 Plugin Composition (U10, FR-6 item 20).
//
// The host-side composition ENGINE (mechanism only): inspect a discovered plugin
// against a host snapshot, plan a no-clobber composition, apply it as a single
// three-surface atomic transaction (host bytes + composition record + audit),
// plan and apply a record-owned drop, and project a read-only doctor diagnostic.
//
// SCOPE (U10). The six public seams below plus the internal discoverPlugins
// helper. The reference plugin `test-pro` and its authoring guide are U11; the
// ledger/evidence closure is U12; the byte projection into dist/ is U09
// (scripts/plugin-projection.ts). `when` evaluation, agents/scopes/memory/
// knowledge composition, marketplace, lockfiles and managed settings are OUT OF
// SCOPE — this file never touches them.
//
// OWNERSHIP (E-USSU10FD1). A plugin never owns a shared file whole. It records
// its own canonical contribution (seam entries / fragment text), the
// deterministic apply order, and the expected post-state. A drop rebuilds each
// shared file from the base plus the REMAINING plugins' contributions; user
// edits, unknown drift, or a contribution-identity mismatch are rejected loudly
// with all three surfaces unchanged.
//
// ATOMICITY (E-USSU10FD2). Every mutation runs under a workspace lock through a
// durable write-ahead journal: PREPARED is made durable before the first
// canonical write, COMMITTED only after all three surfaces are written, record
// and audit exactly once. A handled failure restores every preimage before
// return; a process crash is recovered pre-state on the next operation's lock
// acquisition; journal/preimage drift or corruption stops loudly with zero
// additional mutation and blocks new compose/drop until resolved.
//
// TESTABILITY. All logic is pure over an injected WorkspaceTransaction (backend
// + verifier + lock + failure injector), so a unit test drives every branch —
// including each crash/failure boundary — in-process (bun --coverage does not
// instrument spawned children). A node-backed backend proves the same mechanism
// against a real temp filesystem in the integration layer.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { type ReadOnlyFs, nodeReadOnlyFs } from "./plugin-projection.ts";

// The four host-stage seams a plugin may merge into. The canonical vocabulary is
// StageFrontmatter's list fields (packages/framework/core/tools/
// amadeus-stage-schema.ts): produces, consumes, sensors, required_sections. Any
// other name is an unknown seam. Named here as the single membership source so
// no bare string literal decides the boundary.
export const SEAM_NAMES = ["produces", "consumes", "sensors", "required_sections"] as const;
export type SeamName = (typeof SEAM_NAMES)[number];

export function isSeamName(name: string): name is SeamName {
  return (SEAM_NAMES as readonly string[]).includes(name);
}

// Codepoint order returning -1/0/1. Local copy of the plugin-projection idiom:
// the complexity gate's naive TS parser tracks `<`/`>` as generics, so a bare
// comparison chain desyncs it — cmpStr carries exactly one balanced pair.
function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Plugin descriptor + manifest (the discovered contribution)
// ---------------------------------------------------------------------------

// A new stage file the plugin copies into the host (no-clobber). `path` is the
// host-tree-relative POSIX destination; `bytes` are the source bundle bytes.
export type StageCopy = { slug: string; path: string; bytes: Buffer };

// An additive contribution of `entries` into an existing host stage's named seam
// array. Entries are appended in declaration order, deduped against the base.
export type SeamContribution = { stage: string; seam: SeamName; entries: readonly string[] };

// A declared splice of `text` into host file `file` at the `anchor` marker.
// `id` names the contribution so a drop can reverse exactly this splice.
export type FragmentSplice = { file: string; anchor: string; id: string; text: string };

export type PluginManifest = {
  name: string;
  stages: readonly StageCopy[];
  seams: readonly SeamContribution[];
  fragments: readonly FragmentSplice[];
};

// A discovered plugin. `manifest` is null when the manifest is malformed;
// `parseErrors` then explains why. discoverPlugins is the only producer.
export type PluginDescriptor = {
  name: string;
  manifestBytes: Buffer;
  manifest: PluginManifest | null;
  parseErrors: readonly string[];
};

// A descriptor inspectPlugin has proven clean against a host. The brand keeps a
// raw descriptor out of planPluginComposition at the type level.
export type ValidPlugin = PluginDescriptor & {
  readonly __valid: unique symbol;
  manifest: PluginManifest;
};

// ---------------------------------------------------------------------------
// Host snapshot (read model)
// ---------------------------------------------------------------------------

// A host stage's four seam arrays — the merge target. Modelled as string-entry
// lists (a consumes entry is its artifact slug) so the merge mechanism —
// order-preserving union with dedup — is exercised without a YAML editor (the
// real frontmatter wiring is U11+).
export type StageSeams = { [K in SeamName]: readonly string[] };

export type HostStage = { slug: string; path: string; seams: StageSeams };

// One shared file's recorded provenance: its pre-plugin base plus the ordered
// per-plugin contributions. Rebuilding base + contributions yields the current
// bytes; a drop removes one plugin's entries and rebuilds from the remainder.
export type SeamLedgerEntry = { plugin: string; seam: SeamName; entries: readonly string[]; order: number };
export type FragmentLedgerEntry = { plugin: string; id: string; anchor: string; text: string; order: number };

export type LedgerEntry =
  | { kind: "stage-seams"; path: string; slug: string; base: StageSeams; seams: readonly SeamLedgerEntry[] }
  | { kind: "fragment-file"; path: string; base: Buffer; fragments: readonly FragmentLedgerEntry[] };

export type SharedFileLedger = ReadonlyMap<string, LedgerEntry>;

// The persisted composition record surface: the shared-file ledger plus each
// active plugin's ownership. Written and read as one unit so the three-surface
// commit treats it as a single surface.
export type PluginRecord = {
  plugin: string;
  ownedPaths: readonly string[];
  sharedFiles: readonly { path: string; expectedPostState: Buffer }[];
};

export type CompositionRecord = {
  ledger: SharedFileLedger;
  plugins: ReadonlyMap<string, PluginRecord>;
};

export function emptyComposition(): CompositionRecord {
  return { ledger: new Map(), plugins: new Map() };
}

// The read model inspect/plan/diagnose consume. `files` are current on-disk
// bytes (fragment bases + serialized stage-seam docs); `composition` is the
// persisted record surface.
export type HostSnapshot = {
  stages: ReadonlyMap<string, HostStage>;
  paths: ReadonlySet<string>;
  files: ReadonlyMap<string, Buffer>;
  composition: CompositionRecord;
};

// ---------------------------------------------------------------------------
// Errors + inspection result
// ---------------------------------------------------------------------------

export type PluginErrorKind = "same-name-stage" | "malformed-manifest" | "unknown-seam" | "clobber";
export type PluginError = { kind: PluginErrorKind; message: string; locus: string };

export type PluginPlanResult =
  | { kind: "ready"; plan: PluginCompositionPlan }
  | { kind: "rejected"; errors: readonly PluginError[] };

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

// The intended host mutation. `stageCopies` are new files; `sharedWrites` are
// the recomputed shared-file bytes (seam merges + fragment splices); `record` is
// the plugin's ownership to persist. Pure data — applyPluginPlan performs I/O.
export type PluginCompositionPlan = {
  plugin: string;
  stageCopies: readonly StageCopy[];
  sharedWrites: readonly { path: string; bytes: Buffer }[];
  ledger: SharedFileLedger;
  record: PluginRecord;
};

export type PluginDropPlan = {
  plugin: string;
  removals: readonly string[];
  sharedWrites: readonly { path: string; bytes: Buffer }[];
  ledger: SharedFileLedger;
  // Populated when a precondition (current !== expected post-state, or an
  // owned path drifted) makes the drop unsafe. A non-empty list means reject.
  rejections: readonly PluginError[];
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type ApplyResult =
  | { kind: "committed"; plugin: string }
  | { kind: "failed"; errors: readonly PluginError[] }
  | { kind: "stopped"; reason: string };

export type DropResult =
  | { kind: "committed"; plugin: string }
  | { kind: "failed"; errors: readonly PluginError[] }
  | { kind: "stopped"; reason: string };

export type PluginDiagnostic = {
  plugin: string;
  status: "composed" | "drift" | "recovery-pending";
  ownedPaths: readonly string[];
  observations: readonly string[];
};

// ---------------------------------------------------------------------------
// Discovery (internal C4 helper)
// ---------------------------------------------------------------------------

// The projected-bundle manifest filename (matches PLUGIN_MANIFEST in U09).
export const PLUGIN_MANIFEST = "plugin.json";

// Discover plugins under `sourceRoot` (a projected bundle root, e.g.
// dist/plugins/). Each <name>/ dir yields one descriptor: its plugin.json is
// parsed into a manifest (null + parseErrors on any malformed field), and every
// declared stage-copy path is resolved to its bundle bytes. Names and stages are
// canonically sorted so the enumeration never depends on filesystem order.
export function discoverPlugins(
  sourceRoot: string,
  io: ReadOnlyFs = nodeReadOnlyFs,
): readonly PluginDescriptor[] {
  if (!io.exists(sourceRoot)) return [];
  const names = [...io.list(sourceRoot)].filter((n) => io.isDir(join(sourceRoot, n))).sort();
  return names.map((name) => discoverOnePlugin(sourceRoot, name, io));
}

function discoverOnePlugin(sourceRoot: string, name: string, io: ReadOnlyFs): PluginDescriptor {
  const root = join(sourceRoot, name);
  const manifestPath = join(root, PLUGIN_MANIFEST);
  if (!io.exists(manifestPath)) {
    return { name, manifestBytes: Buffer.alloc(0), manifest: null, parseErrors: [`missing ${PLUGIN_MANIFEST}`] };
  }
  const manifestBytes = io.read(manifestPath);
  const parsed = parsePluginManifest(name, manifestBytes, (rel) => resolveStageBytes(root, rel, io));
  return { name, manifestBytes, manifest: parsed.manifest, parseErrors: parsed.errors };
}

function resolveStageBytes(root: string, rel: string, io: ReadOnlyFs): Buffer | null {
  const abs = join(root, rel);
  return io.exists(abs) ? io.read(abs) : null;
}

// ---------------------------------------------------------------------------
// Manifest parsing (strict, fail-closed)
// ---------------------------------------------------------------------------

type ParseResult = { manifest: PluginManifest | null; errors: readonly string[] };

export function parsePluginManifest(
  name: string,
  bytes: Buffer,
  readStage: (rel: string) => Buffer | null,
): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString("utf-8"));
  } catch (err) {
    return { manifest: null, errors: [`invalid JSON: ${String(err)}`] };
  }
  if (!isRecord(raw)) return { manifest: null, errors: ["manifest must be a JSON object"] };
  const errors: string[] = [];
  if (raw.name !== name) errors.push(`name "${describe(raw.name)}" must equal directory "${name}"`);
  const stages = parseStages(raw.stages, readStage, errors);
  const seams = parseSeams(raw.seams, errors);
  const fragments = parseFragments(raw.fragments, errors);
  if (errors.length > 0) return { manifest: null, errors: errors.sort() };
  return { manifest: { name, stages, seams, fragments }, errors: [] };
}

function parseStages(
  value: unknown,
  readStage: (rel: string) => Buffer | null,
  errors: string[],
): readonly StageCopy[] {
  const arr = expectArray(value, "stages", errors);
  const out: StageCopy[] = [];
  arr.forEach((entry, i) => {
    if (!isRecord(entry)) {
      errors.push(`stages[${i}] must be object`);
      return;
    }
    const slug = expectSlug(entry.slug, `stages[${i}].slug`, errors);
    const path = expectRelPath(entry.path, `stages[${i}].path`, errors);
    if (slug === null || path === null) return;
    const bytes = readStage(path);
    if (bytes === null) {
      errors.push(`stages[${i}].path "${path}" not found in bundle`);
      return;
    }
    out.push({ slug, path, bytes });
  });
  return out;
}

function parseSeams(value: unknown, errors: string[]): readonly SeamContribution[] {
  const arr = expectArray(value, "seams", errors);
  const out: SeamContribution[] = [];
  arr.forEach((entry, i) => {
    if (!isRecord(entry)) {
      errors.push(`seams[${i}] must be object`);
      return;
    }
    const stage = expectNonEmpty(entry.stage, `seams[${i}].stage`, errors);
    const seam = expectString(entry.seam, `seams[${i}].seam`, errors);
    const entries = expectStringArray(entry.entries, `seams[${i}].entries`, errors);
    if (stage === null || seam === null) return;
    // An unknown seam NAME is a semantic-layer error surfaced by inspectPlugin
    // against the host, not a manifest-shape error — carry it through.
    out.push({ stage, seam: seam as SeamName, entries });
  });
  return out;
}

function parseFragments(value: unknown, errors: string[]): readonly FragmentSplice[] {
  const arr = expectArray(value, "fragments", errors);
  const out: FragmentSplice[] = [];
  arr.forEach((entry, i) => {
    if (!isRecord(entry)) {
      errors.push(`fragments[${i}] must be object`);
      return;
    }
    const file = expectRelPath(entry.file, `fragments[${i}].file`, errors);
    const anchor = expectNonEmpty(entry.anchor, `fragments[${i}].anchor`, errors);
    const id = expectSlug(entry.id, `fragments[${i}].id`, errors);
    const text = expectString(entry.text, `fragments[${i}].text`, errors);
    if (file === null || anchor === null || id === null || text === null) return;
    out.push({ file, anchor, id, text });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Inspection (all errors collected, write-0 on any)
// ---------------------------------------------------------------------------

// Inspect a discovered plugin against a host. Collects EVERY same-name-stage,
// malformed-manifest, unknown-seam and clobber problem before returning; a
// single error yields `rejected` and no plan is built. On a clean plugin it
// delegates to planPluginComposition and returns `ready`.
export function inspectPlugin(plugin: PluginDescriptor, host: HostSnapshot): PluginPlanResult {
  const errors: PluginError[] = [];
  if (plugin.manifest === null) {
    for (const p of plugin.parseErrors) errors.push({ kind: "malformed-manifest", message: p, locus: plugin.name });
    return { kind: "rejected", errors };
  }
  const m = plugin.manifest;
  collectStageErrors(m, host, errors);
  collectSeamErrors(m, host, errors);
  collectFragmentErrors(m, host, errors);
  if (errors.length > 0) return { kind: "rejected", errors: sortErrors(errors) };
  const valid = plugin as ValidPlugin;
  return { kind: "ready", plan: planPluginComposition(valid, host) };
}

function collectStageErrors(m: PluginManifest, host: HostSnapshot, errors: PluginError[]): void {
  const seen = new Set<string>();
  for (const s of m.stages) {
    if (seen.has(s.slug)) errors.push({ kind: "malformed-manifest", message: `duplicate stage slug`, locus: s.slug });
    seen.add(s.slug);
    if (host.stages.has(s.slug)) errors.push({ kind: "same-name-stage", message: `stage slug already in host`, locus: s.slug });
    if (host.paths.has(s.path)) errors.push({ kind: "clobber", message: `stage path already in host`, locus: s.path });
  }
}

function collectSeamErrors(m: PluginManifest, host: HostSnapshot, errors: PluginError[]): void {
  for (const c of m.seams) {
    if (!isSeamName(c.seam)) {
      errors.push({ kind: "unknown-seam", message: `seam "${c.seam}" is not a known seam`, locus: `${c.stage}.${c.seam}` });
      continue;
    }
    if (!host.stages.has(c.stage)) {
      errors.push({ kind: "unknown-seam", message: `seam target stage "${c.stage}" not in host`, locus: c.stage });
    }
    if (c.entries.length === 0) {
      errors.push({ kind: "malformed-manifest", message: `seam contribution has no entries`, locus: `${c.stage}.${c.seam}` });
    }
  }
}

function collectFragmentErrors(m: PluginManifest, host: HostSnapshot, errors: PluginError[]): void {
  for (const f of m.fragments) {
    const base = host.files.get(f.file);
    if (base === undefined) {
      errors.push({ kind: "unknown-seam", message: `fragment target file "${f.file}" not in host`, locus: f.file });
      continue;
    }
    if (!base.toString("utf-8").includes(f.anchor)) {
      errors.push({ kind: "unknown-seam", message: `fragment anchor "${f.anchor}" absent from ${f.file}`, locus: f.id });
    }
    if (base.toString("utf-8").includes(fragmentMarker(f.id))) {
      errors.push({ kind: "clobber", message: `fragment id "${f.id}" already spliced into ${f.file}`, locus: f.id });
    }
  }
}

function sortErrors(errors: readonly PluginError[]): readonly PluginError[] {
  return [...errors].sort((a, b) => (a.kind !== b.kind ? cmpStr(a.kind, b.kind) : cmpStr(a.locus, b.locus)));
}

// ---------------------------------------------------------------------------
// Shared-file rebuild (seam merge + fragment splice)
// ---------------------------------------------------------------------------

// Order-preserving union: base entries first, then new entries not already
// present, in declaration order. Deterministic, no sort — insertion order is the
// contract so a plugin's declared order is observable.
export function mergeSeamEntries(base: readonly string[], add: readonly string[]): readonly string[] {
  const out = [...base];
  const seen = new Set(base);
  for (const e of add) {
    if (!seen.has(e)) {
      out.push(e);
      seen.add(e);
    }
  }
  return out;
}

// Canonical byte form of a stage's four seam arrays. Deterministic given the
// seams: one line per seam in SEAM_NAMES order. This is the mechanism's
// shared-file surface for stage seams (the real frontmatter serializer is U11+).
export function serializeStageSeams(slug: string, seams: StageSeams): Buffer {
  const lines = [`stage: ${slug}`];
  for (const name of SEAM_NAMES) lines.push(`${name}: [${seams[name].join(", ")}]`);
  return Buffer.from(`${lines.join("\n")}\n`, "utf-8");
}

// The end-of-splice marker written after a fragment's text so a re-splice is
// detectable (clobber) and a drop can excise exactly the managed region.
export function fragmentMarker(id: string): string {
  return `<!-- amadeus:plugin-fragment:${id} -->`;
}

// Rebuild a stage-seams file from its base plus the given ordered contributions.
function rebuildStageSeams(entry: Extract<LedgerEntry, { kind: "stage-seams" }>): Buffer {
  const merged: Record<SeamName, string[]> = {
    produces: [...entry.base.produces],
    consumes: [...entry.base.consumes],
    sensors: [...entry.base.sensors],
    required_sections: [...entry.base.required_sections],
  };
  for (const c of [...entry.seams].sort((a, b) => a.order - b.order)) {
    merged[c.seam] = [...mergeSeamEntries(merged[c.seam], c.entries)];
  }
  return serializeStageSeams(entry.slug, merged);
}

// Rebuild a fragment file from its base plus the ordered fragment contributions.
// Each contribution replaces its anchor with anchor + text + marker; a drop
// simply omits that contribution, restoring the bare anchor.
function rebuildFragmentFile(entry: Extract<LedgerEntry, { kind: "fragment-file" }>): Buffer {
  let text = entry.base.toString("utf-8");
  for (const f of [...entry.fragments].sort((a, b) => a.order - b.order)) {
    const block = `${f.anchor}\n${f.text}\n${fragmentMarker(f.id)}`;
    text = text.replace(f.anchor, block);
  }
  return Buffer.from(text, "utf-8");
}

function rebuildLedgerEntry(entry: LedgerEntry): Buffer {
  return entry.kind === "stage-seams" ? rebuildStageSeams(entry) : rebuildFragmentFile(entry);
}

// ---------------------------------------------------------------------------
// Composition planning
// ---------------------------------------------------------------------------

// Build the deterministic composition plan for a validated plugin. Appends the
// plugin's seam/fragment contributions to each affected shared file's ledger
// entry (seeding a base entry from the host when the file has no prior
// contribution), recomputes each file's post-state, and records the plugin's
// owned new paths plus per-file expected post-states.
export function planPluginComposition(plugin: ValidPlugin, host: HostSnapshot): PluginCompositionPlan {
  const m = plugin.manifest;
  const nextOrder = maxOrder(host.composition.ledger) + 1;
  const ledger = new Map<string, LedgerEntry>(host.composition.ledger);
  applySeamContributions(m, host, plugin.name, nextOrder, ledger);
  applyFragmentContributions(m, host, plugin.name, nextOrder, ledger);

  const sharedWrites: { path: string; bytes: Buffer }[] = [];
  const sharedFiles: { path: string; expectedPostState: Buffer }[] = [];
  for (const path of affectedPaths(m, host)) {
    const entry = ledger.get(path);
    if (entry === undefined) continue;
    const bytes = rebuildLedgerEntry(entry);
    sharedWrites.push({ path, bytes });
    sharedFiles.push({ path, expectedPostState: bytes });
  }
  const ownedPaths = m.stages.map((s) => s.path).sort();
  const record: PluginRecord = { plugin: plugin.name, ownedPaths, sharedFiles };
  return {
    plugin: plugin.name,
    stageCopies: [...m.stages].sort((a, b) => cmpStr(a.path, b.path)),
    sharedWrites: sharedWrites.sort((a, b) => cmpStr(a.path, b.path)),
    ledger,
    record,
  };
}

function applySeamContributions(
  m: PluginManifest,
  host: HostSnapshot,
  plugin: string,
  order: number,
  ledger: Map<string, LedgerEntry>,
): void {
  for (const c of m.seams) {
    const stage = host.stages.get(c.stage);
    if (stage === undefined) continue;
    const existing = ledger.get(stage.path);
    const base: LedgerEntry =
      existing && existing.kind === "stage-seams"
        ? existing
        : { kind: "stage-seams", path: stage.path, slug: stage.slug, base: stage.seams, seams: [] };
    if (base.kind !== "stage-seams") continue;
    ledger.set(stage.path, {
      ...base,
      seams: [...base.seams, { plugin, seam: c.seam, entries: c.entries, order }],
    });
  }
}

function applyFragmentContributions(
  m: PluginManifest,
  host: HostSnapshot,
  plugin: string,
  order: number,
  ledger: Map<string, LedgerEntry>,
): void {
  for (const f of m.fragments) {
    const current = host.files.get(f.file);
    if (current === undefined) continue;
    const existing = ledger.get(f.file);
    const base: LedgerEntry =
      existing && existing.kind === "fragment-file"
        ? existing
        : { kind: "fragment-file", path: f.file, base: current, fragments: [] };
    if (base.kind !== "fragment-file") continue;
    ledger.set(f.file, {
      ...base,
      fragments: [...base.fragments, { plugin, id: f.id, anchor: f.anchor, text: f.text, order }],
    });
  }
}

function affectedPaths(m: PluginManifest, host: HostSnapshot): readonly string[] {
  const paths = new Set<string>();
  for (const c of m.seams) {
    const stage = host.stages.get(c.stage);
    if (stage !== undefined) paths.add(stage.path);
  }
  for (const f of m.fragments) if (host.files.has(f.file)) paths.add(f.file);
  return [...paths].sort();
}

function maxOrder(ledger: SharedFileLedger): number {
  let max = 0;
  for (const entry of ledger.values()) {
    const orders = entry.kind === "stage-seams" ? entry.seams.map((s) => s.order) : entry.fragments.map((f) => f.order);
    for (const o of orders) if (o > max) max = o;
  }
  return max;
}

// ---------------------------------------------------------------------------
// Drop planning (record-owned only)
// ---------------------------------------------------------------------------

// Plan the removal of a plugin from the host. Owned new paths are scheduled for
// removal only when their current bytes match what was composed; each shared
// file is verified to currently equal the plugin's expected post-state, then
// rebuilt from the base plus the REMAINING plugins' contributions. Any drift,
// user edit, or identity mismatch populates `rejections` (three-surface-invariant
// reject); user-authored paths outside the record are never touched.
export function planPluginDrop(record: PluginRecord, host: HostSnapshot): PluginDropPlan {
  const rejections: PluginError[] = [];
  const removals: string[] = [];
  for (const path of record.ownedPaths) {
    if (!host.paths.has(path)) {
      rejections.push({ kind: "clobber", message: `owned path "${path}" already absent`, locus: path });
      continue;
    }
    removals.push(path);
  }
  const ledger = new Map<string, LedgerEntry>();
  const sharedWrites: { path: string; bytes: Buffer }[] = [];
  for (const shared of record.sharedFiles) {
    planOneSharedDrop(record.plugin, shared, host, ledger, sharedWrites, rejections);
  }
  return {
    plugin: record.plugin,
    removals: removals.sort(),
    sharedWrites: sharedWrites.sort((a, b) => cmpStr(a.path, b.path)),
    ledger,
    rejections: sortErrors(rejections),
  };
}

function planOneSharedDrop(
  plugin: string,
  shared: { path: string; expectedPostState: Buffer },
  host: HostSnapshot,
  ledger: Map<string, LedgerEntry>,
  sharedWrites: { path: string; bytes: Buffer }[],
  rejections: PluginError[],
): void {
  const entry = host.composition.ledger.get(shared.path);
  if (entry === undefined) {
    rejections.push({ kind: "malformed-manifest", message: `no ledger entry for "${shared.path}"`, locus: shared.path });
    return;
  }
  // Drift is measured against the CUMULATIVE ledger rebuild (base + every active
  // plugin's contribution), never a single plugin's point-in-time snapshot — a
  // later plugin composing onto the same file legitimately moved the post-state.
  const current = host.files.get(shared.path);
  if (current === undefined || !current.equals(rebuildLedgerEntry(entry))) {
    rejections.push({ kind: "clobber", message: `shared file "${shared.path}" drifted from the recorded composition`, locus: shared.path });
    return;
  }
  const remaining = withoutPlugin(entry, plugin);
  ledger.set(shared.path, remaining);
  sharedWrites.push({ path: shared.path, bytes: rebuildLedgerEntry(remaining) });
}

function withoutPlugin(entry: LedgerEntry, plugin: string): LedgerEntry {
  if (entry.kind === "stage-seams") {
    return { ...entry, seams: entry.seams.filter((s) => s.plugin !== plugin) };
  }
  return { ...entry, fragments: entry.fragments.filter((f) => f.plugin !== plugin) };
}

// ---------------------------------------------------------------------------
// Workspace transaction (backend + verifier + lock + failure injector)
// ---------------------------------------------------------------------------

export type AuditEntry = { event: string; plugin: string; detail: string };

export type Journal = {
  txnId: string;
  phase: "PREPARED" | "COMMITTED";
  kind: "compose" | "drop";
  writeSet: WriteSet;
  preimages: Preimages;
};

export type WriteSet = {
  hostWrites: ReadonlyMap<string, Buffer>;
  hostRemovals: readonly string[];
  composition: CompositionRecord;
  audit: AuditEntry;
};

export type Preimages = {
  host: ReadonlyMap<string, Buffer | null>;
  composition: CompositionRecord;
  auditCount: number;
};

export type WorkspaceBackend = {
  readHost(path: string): Buffer | undefined;
  writeHost(path: string, bytes: Buffer): void;
  removeHost(path: string): void;
  readComposition(): CompositionRecord;
  writeComposition(c: CompositionRecord): void;
  appendAudit(entry: AuditEntry): void;
  auditCount(): number;
  truncateAudit(toCount: number): void;
  readJournal(): Journal | undefined;
  writeJournal(j: Journal): void;
  clearJournal(): void;
};

export type WorkspaceLock = { acquire(): void; release(): void };

export type VerifyOutcome = { ok: true } | { ok: false; reason: string };

export type WorkspaceTransaction = {
  backend: WorkspaceBackend;
  verify: (temp: ReadonlyMap<string, Buffer | null>, kind: "compose" | "drop") => VerifyOutcome;
  lock: WorkspaceLock;
  newTxnId: () => string;
  inject?: FailureInjector;
};

export type InjectionPoint = "after-prepared" | "after-host" | "after-record" | "after-audit" | "after-committed";
export type FailureInjector = (point: InjectionPoint) => void;

// A crash signal PROPAGATES out of the committer (simulating process death):
// preimages are NOT restored now — the next operation's lock-time recovery
// restores pre-state. A plain Error is a HANDLED failure: restored before return.
export class CrashSignal extends Error {
  constructor(public readonly point: InjectionPoint) {
    super(`simulated crash at ${point}`);
    this.name = "CrashSignal";
  }
}

function fire(inject: FailureInjector | undefined, point: InjectionPoint): void {
  if (inject) inject(point);
}

// ---------------------------------------------------------------------------
// Commit + recovery (shared by compose and drop)
// ---------------------------------------------------------------------------

type RecoveryOutcome =
  | { kind: "none" }
  | { kind: "settled" }
  | { kind: "recovered" }
  | { kind: "stopped"; reason: string };

// Run pending-journal recovery under the caller's lock. A COMMITTED journal is a
// settled transaction (post-state kept, journal cleared); a PREPARED journal is
// restored to pre-state UNLESS drift/corruption is detected, in which case it
// stops loudly with zero additional mutation (blocking new operations).
export function runRecovery(backend: WorkspaceBackend): RecoveryOutcome {
  const j = backend.readJournal();
  if (j === undefined) return { kind: "none" };
  if (!validJournal(j)) return { kind: "stopped", reason: "journal corruption" };
  if (j.phase === "COMMITTED") {
    backend.clearJournal();
    return { kind: "settled" };
  }
  if (hostDrift(backend, j)) return { kind: "stopped", reason: "recovery drift" };
  restorePreimages(backend, j.preimages);
  backend.clearJournal();
  return { kind: "recovered" };
}

function validJournal(j: Journal): boolean {
  if (j.phase !== "PREPARED" && j.phase !== "COMMITTED") return false;
  if (j.kind !== "compose" && j.kind !== "drop") return false;
  if (typeof j.txnId !== "string" || j.txnId.length === 0) return false;
  return j.writeSet !== undefined && j.preimages !== undefined;
}

// Drift = a host path whose current bytes match NEITHER the recorded preimage nor
// the intended post-image. A partially-applied crash (current == post-image) is
// NOT drift; an external edit (current == neither) is.
function hostDrift(backend: WorkspaceBackend, j: Journal): boolean {
  for (const [path, pre] of j.preimages.host) {
    const current = backend.readHost(path);
    const post = j.writeSet.hostWrites.get(path);
    const removed = j.writeSet.hostRemovals.includes(path);
    if (bytesEq(current, pre)) continue;
    if (post !== undefined && bytesEq(current, post)) continue;
    if (removed && current === undefined) continue;
    return true;
  }
  return false;
}

function restorePreimages(backend: WorkspaceBackend, pre: Preimages): void {
  for (const [path, bytes] of pre.host) {
    if (bytes === null) backend.removeHost(path);
    else backend.writeHost(path, bytes);
  }
  backend.writeComposition(pre.composition);
  backend.truncateAudit(pre.auditCount);
}

function capturePreimages(backend: WorkspaceBackend, writeSet: WriteSet): Preimages {
  const host = new Map<string, Buffer | null>();
  for (const path of writeSet.hostWrites.keys()) host.set(path, backend.readHost(path) ?? null);
  for (const path of writeSet.hostRemovals) host.set(path, backend.readHost(path) ?? null);
  return { host, composition: backend.readComposition(), auditCount: backend.auditCount() };
}

function applyWriteSet(backend: WorkspaceBackend, writeSet: WriteSet, inject: FailureInjector | undefined): void {
  for (const [path, bytes] of writeSet.hostWrites) backend.writeHost(path, bytes);
  for (const path of writeSet.hostRemovals) backend.removeHost(path);
  fire(inject, "after-host");
  backend.writeComposition(writeSet.composition);
  fire(inject, "after-record");
  backend.appendAudit(writeSet.audit);
  fire(inject, "after-audit");
}

type CommitOutcome =
  | { kind: "committed" }
  | { kind: "failed"; error: string }
  | { kind: "stopped"; reason: string };

// The three-surface atomic committer. Recovers any pending journal first (a
// stopped recovery refuses the new operation), makes PREPARED durable before the
// first canonical write, applies host→record→audit, marks COMMITTED, then clears
// the journal. A handled failure restores every preimage before return; a crash
// propagates with the journal left for next-operation recovery.
function commitTransaction(tx: WorkspaceTransaction, writeSet: WriteSet, kind: "compose" | "drop"): CommitOutcome {
  tx.lock.acquire();
  try {
    const recovery = runRecovery(tx.backend);
    if (recovery.kind === "stopped") return { kind: "stopped", reason: recovery.reason };
    const preimages = capturePreimages(tx.backend, writeSet);
    const journal: Journal = { txnId: tx.newTxnId(), phase: "PREPARED", kind, writeSet, preimages };
    tx.backend.writeJournal(journal);
    fire(tx.inject, "after-prepared");
    applyWriteSet(tx.backend, writeSet, tx.inject);
    tx.backend.writeJournal({ ...journal, phase: "COMMITTED" });
    fire(tx.inject, "after-committed");
    tx.backend.clearJournal();
    return { kind: "committed" };
  } catch (err) {
    if (err instanceof CrashSignal) throw err;
    const pending = tx.backend.readJournal();
    if (pending !== undefined) restorePreimages(tx.backend, pending.preimages);
    tx.backend.clearJournal();
    return { kind: "failed", error: String(err) };
  } finally {
    tx.lock.release();
  }
}

// ---------------------------------------------------------------------------
// Apply (public seams)
// ---------------------------------------------------------------------------

// Stage the composition plan into a temp host image, run self-heal compile /
// sensors via the injected verifier, and — only on success — commit the three
// surfaces atomically. A verify failure or any commit failure leaves host bytes,
// composition record and audit unchanged.
export function applyPluginPlan(plan: PluginCompositionPlan, tx: WorkspaceTransaction): ApplyResult {
  const temp = buildTempImage([...plan.stageCopies.map((s) => ({ path: s.path, bytes: s.bytes })), ...plan.sharedWrites], []);
  const verdict = tx.verify(temp, "compose");
  if (!verdict.ok) {
    return { kind: "failed", errors: [{ kind: "clobber", message: `temp verify failed: ${verdict.reason}`, locus: plan.plugin }] };
  }
  const writeSet = composeWriteSet(tx.backend, plan);
  return liftCommit(commitTransaction(tx, writeSet, "compose"), plan.plugin);
}

// Stage the drop into a temp image and commit. Precondition rejections (drift /
// missing owned path) short-circuit before any transaction begins, keeping the
// three surfaces invariant.
export function applyPluginDrop(plan: PluginDropPlan, tx: WorkspaceTransaction): DropResult {
  if (plan.rejections.length > 0) return { kind: "failed", errors: plan.rejections };
  const temp = buildTempImage(plan.sharedWrites, plan.removals);
  const verdict = tx.verify(temp, "drop");
  if (!verdict.ok) {
    return { kind: "failed", errors: [{ kind: "clobber", message: `temp verify failed: ${verdict.reason}`, locus: plan.plugin }] };
  }
  const writeSet = dropWriteSet(tx.backend, plan);
  return liftCommit(commitTransaction(tx, writeSet, "drop"), plan.plugin);
}

function liftCommit(outcome: CommitOutcome, plugin: string): ApplyResult {
  if (outcome.kind === "committed") return { kind: "committed", plugin };
  if (outcome.kind === "stopped") return { kind: "stopped", reason: outcome.reason };
  return { kind: "failed", errors: [{ kind: "clobber", message: outcome.error, locus: plugin }] };
}

// A temp host image = current host bytes overlaid with the plan's writes and
// removals (removals become null). The verifier reads this without any canonical
// mutation.
function buildTempImage(
  writes: readonly { path: string; bytes: Buffer }[],
  removals: readonly string[],
): ReadonlyMap<string, Buffer | null> {
  const temp = new Map<string, Buffer | null>();
  for (const w of writes) temp.set(w.path, w.bytes);
  for (const path of removals) temp.set(path, null);
  return temp;
}

function composeWriteSet(backend: WorkspaceBackend, plan: PluginCompositionPlan): WriteSet {
  const hostWrites = new Map<string, Buffer>();
  for (const s of plan.stageCopies) hostWrites.set(s.path, s.bytes);
  for (const w of plan.sharedWrites) hostWrites.set(w.path, w.bytes);
  const prior = backend.readComposition();
  const plugins = new Map(prior.plugins);
  plugins.set(plan.plugin, plan.record);
  return {
    hostWrites,
    hostRemovals: [],
    composition: { ledger: plan.ledger, plugins },
    audit: { event: "plugin-composed", plugin: plan.plugin, detail: `${hostWrites.size} host writes` },
  };
}

function dropWriteSet(backend: WorkspaceBackend, plan: PluginDropPlan): WriteSet {
  const hostWrites = new Map<string, Buffer>();
  for (const w of plan.sharedWrites) hostWrites.set(w.path, w.bytes);
  const prior = backend.readComposition();
  const plugins = new Map(prior.plugins);
  plugins.delete(plan.plugin);
  const ledger = new Map(prior.ledger);
  for (const [path, entry] of plan.ledger) ledger.set(path, entry);
  return {
    hostWrites,
    hostRemovals: plan.removals,
    composition: { ledger, plugins },
    audit: { event: "plugin-dropped", plugin: plan.plugin, detail: `${plan.removals.length} removals` },
  };
}

// ---------------------------------------------------------------------------
// Doctor projection (read-only)
// ---------------------------------------------------------------------------

// Project each active plugin's status from the host snapshot: `composed` when its
// owned paths and shared post-states match the record, `drift` when a shared file
// diverged, `recovery-pending` for every plugin while an incomplete journal
// exists. Never mutates host, record, or audit.
export function diagnosePlugins(host: HostSnapshot, journalPending = false): readonly PluginDiagnostic[] {
  const out: PluginDiagnostic[] = [];
  for (const [name, record] of host.composition.plugins) {
    out.push(diagnoseOne(name, record, host, journalPending));
  }
  return out.sort((a, b) => cmpStr(a.plugin, b.plugin));
}

function diagnoseOne(
  name: string,
  record: PluginRecord,
  host: HostSnapshot,
  journalPending: boolean,
): PluginDiagnostic {
  const observations: string[] = [];
  for (const path of record.ownedPaths) {
    if (!host.paths.has(path)) observations.push(`owned path missing: ${path}`);
  }
  for (const shared of record.sharedFiles) {
    const current = host.files.get(shared.path);
    if (current === undefined || !current.equals(shared.expectedPostState)) {
      observations.push(`shared file drift: ${shared.path}`);
    }
  }
  const status = journalPending ? "recovery-pending" : observations.length > 0 ? "drift" : "composed";
  return { plugin: name, status, ownedPaths: record.ownedPaths, observations: observations.sort() };
}

// ---------------------------------------------------------------------------
// In-memory backend (test seam) + node backend (real fs)
// ---------------------------------------------------------------------------

// A pure in-memory backend over path→bytes maps. The default lock is a no-op and
// txn ids are a monotonic counter, so a unit test drives every commit/recovery
// branch deterministically with no filesystem.
export function createInMemoryBackend(seed?: {
  host?: Record<string, Buffer>;
  composition?: CompositionRecord;
}): WorkspaceBackend {
  const host = new Map<string, Buffer>(Object.entries(seed?.host ?? {}));
  let composition = cloneComposition(seed?.composition ?? emptyComposition());
  const audit: AuditEntry[] = [];
  let journal: Journal | undefined;
  return {
    readHost: (p) => host.get(p),
    writeHost: (p, b) => {
      host.set(p, Buffer.from(b));
    },
    removeHost: (p) => {
      host.delete(p);
    },
    readComposition: () => cloneComposition(composition),
    writeComposition: (c) => {
      composition = cloneComposition(c);
    },
    appendAudit: (e) => {
      audit.push({ ...e });
    },
    auditCount: () => audit.length,
    truncateAudit: (n) => {
      audit.length = Math.max(0, Math.min(n, audit.length));
    },
    readJournal: () => (journal === undefined ? undefined : cloneJournal(journal)),
    writeJournal: (j) => {
      journal = cloneJournal(j);
    },
    clearJournal: () => {
      journal = undefined;
    },
  };
}

// A real-filesystem backend rooted at `root`. Host paths are root-relative; the
// composition record, audit log and journal are dot-files at the root. Buffers
// serialize via base64 tags. Used by the integration test to prove the mechanism
// against real files.
export function createNodeBackend(root: string): WorkspaceBackend {
  const compPath = join(root, ".amadeus-plugin-composition.json");
  const auditPath = join(root, ".amadeus-plugin-audit.json");
  const journalPath = join(root, ".amadeus-plugin-journal.json");
  const abs = (p: string) => join(root, p);
  return {
    readHost: (p) => (existsSync(abs(p)) ? readFileSync(abs(p)) : undefined),
    writeHost: (p, b) => {
      mkdirSync(dirname(abs(p)), { recursive: true });
      writeFileSync(abs(p), b);
    },
    removeHost: (p) => {
      if (existsSync(abs(p))) rmSync(abs(p));
    },
    readComposition: () => (existsSync(compPath) ? compositionFromJson(readFileSync(compPath, "utf-8")) : emptyComposition()),
    writeComposition: (c) => writeFileSync(compPath, compositionToJson(c)),
    appendAudit: (e) => writeFileSync(auditPath, JSON.stringify([...readAudit(auditPath), e])),
    auditCount: () => readAudit(auditPath).length,
    truncateAudit: (n) => writeFileSync(auditPath, JSON.stringify(readAudit(auditPath).slice(0, n))),
    readJournal: () => (existsSync(journalPath) ? journalFromJson(readFileSync(journalPath, "utf-8")) : undefined),
    writeJournal: (j) => writeFileSync(journalPath, journalToJson(j)),
    clearJournal: () => {
      if (existsSync(journalPath)) rmSync(journalPath);
    },
  };
}

// A mkdir-based workspace lock for the node backend (portable, no deps).
export function createNodeLock(root: string): WorkspaceLock {
  const lockDir = join(root, ".amadeus-plugin-lock");
  return {
    acquire: () => mkdirSync(lockDir, { recursive: false }),
    release: () => {
      if (existsSync(lockDir)) rmSync(lockDir, { recursive: true });
    },
  };
}

export const noopLock: WorkspaceLock = { acquire: () => {}, release: () => {} };

function readAudit(path: string): AuditEntry[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as AuditEntry[];
}

// ---------------------------------------------------------------------------
// Clone + JSON codec (Buffers as {b64}, Maps as entry arrays)
// ---------------------------------------------------------------------------

function cloneComposition(c: CompositionRecord): CompositionRecord {
  return compositionFromJson(compositionToJson(c));
}

function cloneJournal(j: Journal): Journal {
  return journalFromJson(journalToJson(j));
}

type Json = unknown;

function bufToJson(b: Buffer): Json {
  return { __b64: b.toString("base64") };
}

function bufFromJson(v: Json): Buffer {
  if (isRecord(v) && typeof v.__b64 === "string") return Buffer.from(v.__b64, "base64");
  throw new Error("expected buffer tag");
}

function seamsToJson(s: StageSeams): Json {
  return { produces: s.produces, consumes: s.consumes, sensors: s.sensors, required_sections: s.required_sections };
}

function seamsFromJson(v: Json): StageSeams {
  const o = v as Record<SeamName, string[]>;
  return { produces: o.produces, consumes: o.consumes, sensors: o.sensors, required_sections: o.required_sections };
}

function ledgerEntryToJson(e: LedgerEntry): Json {
  if (e.kind === "stage-seams") {
    return { kind: e.kind, path: e.path, slug: e.slug, base: seamsToJson(e.base), seams: e.seams };
  }
  return { kind: e.kind, path: e.path, base: bufToJson(e.base), fragments: e.fragments };
}

function ledgerEntryFromJson(v: Json): LedgerEntry {
  const o = v as Record<string, unknown>;
  if (o.kind === "stage-seams") {
    return { kind: "stage-seams", path: o.path as string, slug: o.slug as string, base: seamsFromJson(o.base), seams: o.seams as SeamLedgerEntry[] };
  }
  return { kind: "fragment-file", path: o.path as string, base: bufFromJson(o.base), fragments: o.fragments as FragmentLedgerEntry[] };
}

function recordToJson(r: PluginRecord): Json {
  return {
    plugin: r.plugin,
    ownedPaths: r.ownedPaths,
    sharedFiles: r.sharedFiles.map((s) => ({ path: s.path, expectedPostState: bufToJson(s.expectedPostState) })),
  };
}

function recordFromJson(v: Json): PluginRecord {
  const o = v as Record<string, unknown>;
  const shared = (o.sharedFiles as Record<string, unknown>[]).map((s) => ({
    path: s.path as string,
    expectedPostState: bufFromJson(s.expectedPostState),
  }));
  return { plugin: o.plugin as string, ownedPaths: o.ownedPaths as string[], sharedFiles: shared };
}

export function compositionToJson(c: CompositionRecord): string {
  return JSON.stringify({
    ledger: [...c.ledger.entries()].map(([k, e]) => [k, ledgerEntryToJson(e)]),
    plugins: [...c.plugins.entries()].map(([k, r]) => [k, recordToJson(r)]),
  });
}

export function compositionFromJson(text: string): CompositionRecord {
  const o = JSON.parse(text) as { ledger: [string, Json][]; plugins: [string, Json][] };
  const ledger = new Map<string, LedgerEntry>();
  for (const [k, e] of o.ledger) ledger.set(k, ledgerEntryFromJson(e));
  const plugins = new Map<string, PluginRecord>();
  for (const [k, r] of o.plugins) plugins.set(k, recordFromJson(r));
  return { ledger, plugins };
}

function writeSetToJson(w: WriteSet): Json {
  return {
    hostWrites: [...w.hostWrites.entries()].map(([k, b]) => [k, bufToJson(b)]),
    hostRemovals: w.hostRemovals,
    composition: JSON.parse(compositionToJson(w.composition)),
    audit: w.audit,
  };
}

function writeSetFromJson(v: Json): WriteSet {
  const o = v as Record<string, unknown>;
  const hostWrites = new Map<string, Buffer>();
  for (const [k, b] of o.hostWrites as [string, Json][]) hostWrites.set(k, bufFromJson(b));
  return {
    hostWrites,
    hostRemovals: o.hostRemovals as string[],
    composition: compositionFromJson(JSON.stringify(o.composition)),
    audit: o.audit as AuditEntry,
  };
}

function preimagesToJson(p: Preimages): Json {
  return {
    host: [...p.host.entries()].map(([k, b]) => [k, b === null ? null : bufToJson(b)]),
    composition: JSON.parse(compositionToJson(p.composition)),
    auditCount: p.auditCount,
  };
}

function preimagesFromJson(v: Json): Preimages {
  const o = v as Record<string, unknown>;
  const host = new Map<string, Buffer | null>();
  for (const [k, b] of o.host as [string, Json][]) host.set(k, b === null ? null : bufFromJson(b));
  return { host, composition: compositionFromJson(JSON.stringify(o.composition)), auditCount: o.auditCount as number };
}

export function journalToJson(j: Journal): string {
  return JSON.stringify({
    txnId: j.txnId,
    phase: j.phase,
    kind: j.kind,
    writeSet: writeSetToJson(j.writeSet),
    preimages: preimagesToJson(j.preimages),
  });
}

export function journalFromJson(text: string): Journal {
  const o = JSON.parse(text) as Record<string, unknown>;
  return {
    txnId: o.txnId as string,
    phase: o.phase as Journal["phase"],
    kind: o.kind as Journal["kind"],
    writeSet: writeSetFromJson(o.writeSet),
    preimages: preimagesFromJson(o.preimages),
  };
}

// ---------------------------------------------------------------------------
// Small typed helpers (parse-don't-validate at the manifest boundary)
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function bytesEq(a: Buffer | undefined, b: Buffer | undefined | null): boolean {
  if (a === undefined) return b === undefined || b === null;
  if (b === undefined || b === null) return false;
  return a.equals(b);
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v === "string" ? v : typeof v;
}

function expectArray(value: unknown, field: string, errors: string[]): readonly unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return [];
  }
  return value;
}

function expectString(value: unknown, field: string, errors: string[]): string | null {
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return null;
  }
  return value;
}

function expectNonEmpty(value: unknown, field: string, errors: string[]): string | null {
  const s = expectString(value, field, errors);
  if (s === null) return null;
  if (s.length === 0) {
    errors.push(`${field} must be non-empty`);
    return null;
  }
  return s;
}

function expectSlug(value: unknown, field: string, errors: string[]): string | null {
  const s = expectString(value, field, errors);
  if (s === null) return null;
  if (!SLUG_RE.test(s)) {
    errors.push(`${field} must be kebab-case, got "${s}"`);
    return null;
  }
  return s;
}

function expectRelPath(value: unknown, field: string, errors: string[]): string | null {
  const s = expectNonEmpty(value, field, errors);
  if (s === null) return null;
  if (s.startsWith("/") || s.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) {
    errors.push(`${field} must be a safe relative path, got "${s}"`);
    return null;
  }
  return posix.normalize(s);
}

function expectStringArray(value: unknown, field: string, errors: string[]): readonly string[] {
  const arr = expectArray(value, field, errors);
  const out: string[] = [];
  arr.forEach((v, i) => {
    const s = expectString(v, `${field}[${i}]`, errors);
    if (s !== null) out.push(s);
  });
  return out;
}
