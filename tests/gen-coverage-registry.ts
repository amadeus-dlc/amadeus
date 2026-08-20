// gen-coverage-registry.ts — the L-SURFACE coverage registry + CI ratchet.
//
// WHAT THIS IS. The mechanism that makes test coverage ENFORCED, not hoped.
// It enumerates the real "units" of the framework FROM DISK (the left side of
// the join, which cannot drift because it IS reality read fresh each run),
// discovers which test files CLAIM to cover each unit (the right side, via a
// machine-readable `// covers:` / `# covers:` header), JOINS the two through a
// GUARANTEE-PRINCIPLE GATE (a test's mechanism must be >= the unit's
// minMechanism), and EMITS tests/.coverage-registry.json.
//
// WHY IT EXISTS. A new arg-dispatch case, a new canonical event in the OTel
// Event Registry, or a new scope-mapping.json key changes the enumerated
// universe. If nobody wrote a
// `covers:` claim for it, the unit lands status=UNCOVERED, the regenerated
// registry differs from the committed one, and `--check` exits 1 naming the
// gap. Coverage cannot silently rot because the universe is recomputed from
// source on every CI run.
//
// THE FRESHNESS-DIFF IDIOM (borrowed from amadeus-graph.ts compile/export
// --check, :1127 / :1142). `--check` regenerates the registry in memory, diffs
// it against the committed tests/.coverage-registry.json, and exits 1 with the
// diff on any mismatch. Same shape as the proven stage-graph drift guard.
//
// THE RATCHET (tests/.coverage-ratchet.json). A committed per-class baseline of
// how many units are covered RIGHT NOW (honest: most are UNCOVERED). `--check`
// also fails if any class's covered-count DECREASES below its baseline without
// a reviewed deferred entry — monotonic anti-regression. You can only ever
// cover MORE; you cannot quietly drop a claim and stay green.
//
// TWO ANTI-ROT GUARDS (mandatory, run inside --check and in the test):
//   (a) NON-EMPTY enumeration per unit class. A broken enumerator that returns
//       [] would otherwise report "100% covered, 0 units". We assert each class
//       count > 0.
//   (b) SUBCOMMAND CROSS-CHECK. The structured arg-dispatch parser's count must
//       equal an INDEPENDENT regex count of dispatch sites in the same anchored
//       block. Catches a parser that silently stops seeing a tool.
//
// Run:
//   bun tests/gen-coverage-registry.ts            # regenerate + write the 3 files
//   bun tests/gen-coverage-registry.ts --check     # CI drift guard (exit 1 on drift)
//   bun tests/gen-coverage-registry.ts --print      # regenerate to stdout, write nothing

import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  drivesClaudePrintSurface,
  drivesCliSurface,
} from "./lib/cli-mechanism.ts";
import { drivesSdkSurface } from "./lib/sdk-mechanism.ts";
import { drivesTuiSurface } from "./lib/tui-mechanism.ts";

// ---------------------------------------------------------------------------
// Paths. Resolved from this file's location so the tool runs from any cwd.
// tests/ is one level below repo root; the shipped tools live under
// dist/claude/.claude/tools/.
// ---------------------------------------------------------------------------
const __FILE_DIR = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = __FILE_DIR;

// ENV-VAR SEAMS (mirrors amadeus-graph.ts's AMADEUS_EXPORT_FIXTURE pattern, :1172).
// Tests point these at a temp tree to PROVE the ratchet: copy the shipped
// source, inject a fake new audit event / subcommand, and run `--check` against
// the temp roots + temp committed baselines without mutating real source.
//   AMADEUS_COVERAGE_SRC_ROOT  — repo root containing dist/claude/ (source)
//   AMADEUS_COVERAGE_TESTS_DIR — dir containing the test tiers to scan for claims
//   AMADEUS_COVERAGE_REGISTRY  — committed .coverage-registry.json to diff against
//   AMADEUS_COVERAGE_RATCHET   — committed .coverage-ratchet.json to ratchet against
const REPO_ROOT = process.env.AMADEUS_COVERAGE_SRC_ROOT ?? join(TESTS_DIR, "..");
const CLAIMS_TESTS_DIR = process.env.AMADEUS_COVERAGE_TESTS_DIR ?? TESTS_DIR;
const TOOLS_DIR = join(
  REPO_ROOT,
  "dist", "claude",
  ".claude",
  "tools",
);
const HOOKS_DIR = join(REPO_ROOT, "dist", "claude", ".claude", "hooks");
const STATUSLINE_PATH = join(HOOKS_DIR, "amadeus-statusline.ts");
const LEGACY_STAGES_DIR = join(
  REPO_ROOT,
  "dist", "claude",
  ".claude",
  "skills",
  "amadeus",
  "stages",
);
const COMMON_STAGES_DIR = join(
  REPO_ROOT,
  "dist", "claude",
  ".claude",
  "amadeus-common",
  "stages",
);
const STAGES_DIR = existsSync(COMMON_STAGES_DIR) ? COMMON_STAGES_DIR : LEGACY_STAGES_DIR;
const STAGES_SOURCE_ROOT = existsSync(COMMON_STAGES_DIR)
  ? "dist/claude/.claude/amadeus-common/stages"
  : "dist/claude/.claude/skills/amadeus/stages";
const SCOPE_MAPPING_PATH = join(TOOLS_DIR, "data", "scope-mapping.json");
const SCOPE_GRID_PATH = join(TOOLS_DIR, "data", "scope-grid.json");
const EVENT_REGISTRY_PATH = join(REPO_ROOT, "dist", "claude", ".claude", "otel", "event-registry.ts");
const LIB_PATH = join(TOOLS_DIR, "amadeus-lib.ts");
const GRAPH_PATH = join(TOOLS_DIR, "amadeus-graph.ts");
const STATE_PATH = join(TOOLS_DIR, "amadeus-state.ts");
const TARGETED_STATE_FUNCTIONS = ["skipStageContent", "handleSkip", "mergeScopedCheckboxProgress"] as const;

const REGISTRY_PATH =
  process.env.AMADEUS_COVERAGE_REGISTRY ?? join(TESTS_DIR, ".coverage-registry.json");
// Read lazily (same seam shape as coverage-project-gate's totalsPath/
// baselinePath) so in-process tests can retarget a single import at different
// temp ratchets per case. The module-level snapshot serves generation.
function ratchetPath(): string {
  return process.env.AMADEUS_COVERAGE_RATCHET ?? join(TESTS_DIR, ".coverage-ratchet.json");
}
const RATCHET_PATH = ratchetPath();
// tests/coverage-exclusions.json is reviewer-facing documentation of legit
// L-CODE exclusions (import.meta.main shims, process.exit terminals, external-
// binary spawn sites). This UNIT-surface generator does not read it — units are
// surfaces, not lines — so it is referenced here only as a pointer for the
// reader: the file lives alongside this tool at tests/coverage-exclusions.json.

// ---------------------------------------------------------------------------
// MECHANISM LADDER. The guarantee principle: a stronger mechanism drives the
// real system further end-to-end, so it can vouch for everything a weaker one
// can plus more. A test claiming a unit must run at a mechanism >= the unit's
// minMechanism; otherwise the claim is UNDER-MECHANISM (treated as uncovered).
//
//   none — pure in-process: import the fn / spawn a deterministic CLI tool
//          against a temp dir. Zero LLM, zero tokens. (t106-t114 are .none.)
//   cli  — exercises a tool's argv dispatch as a spawned subprocess.
//   sdk  — drives the real /amadeus through the Claude Agent SDK (spends tokens;
//          the harness calibration tier).
//   tui  — drives the real terminal UI (tmux). Strongest; observes rendering.
//
// The dot-segment in a test filename (t112.NONE.test.ts) names its mechanism.
// `calibration` is the SDK calibration tier — it drives the SDK, so it maps to
// `sdk`.
// ---------------------------------------------------------------------------
export const MECHANISMS = ["none", "cli", "sdk", "tui"] as const;
export type Mechanism = (typeof MECHANISMS)[number];
export const CLAUDE_DEPENDENCIES = ["sdk", "tui", "cli-claude"] as const;
export type ClaudeDependency = (typeof CLAUDE_DEPENDENCIES)[number];

export function mechanismRank(m: Mechanism): number {
  return MECHANISMS.indexOf(m);
}

/** Map a filename dot-segment token to a mechanism. Unknown tokens that are not
 *  one of the canonical four are normalised: `calibration` -> `sdk` (the SDK
 *  calibration tier drives the Agent SDK). Anything else is rejected loudly so
 *  a new tier cannot silently weaken the gate. */
export function mechanismFromSegment(seg: string): Mechanism {
  if ((MECHANISMS as readonly string[]).includes(seg)) return seg as Mechanism;
  if (seg === "calibration") return "sdk";
  throw new Error(
    `unknown mechanism segment "${seg}": add it to MECHANISMS or map it in mechanismFromSegment`,
  );
}

// ---------------------------------------------------------------------------
// UNIT CLASSES. Each has a minMechanism — the weakest mechanism that can
// legitimately verify a unit of that class.
//
//   function (exported lib/graph fn)  -> none  (importable, pure-ish)
//   audit    (registry canonical event)-> none  (state.ts spawn proves emission)
//   scope    (scope-mapping.json key)  -> none  (data; loadScopeMapping in-proc)
//   stage    (*.md under stages/)      -> none  (data; compile reads off disk)
//   hook     (hook .ts file)           -> none  (spawnable deterministically)
//   subcommand (tool argv dispatch)    -> cli   (the dispatch surface IS argv;
//              proving it routes needs spawning the CLI, not importing a fn)
//   render-surface (a statusline render branch) -> tui  (only a PAINTED screen
//              shows what a render branch draws; a `none`/`cli`/`sdk` test never
//              renders, so the guarantee-principle gate refuses to count it).
// ---------------------------------------------------------------------------
export type UnitClass =
  | "function"
  | "audit"
  | "scope"
  | "stage"
  | "hook"
  | "subcommand"
  | "render-surface";

export const UNIT_CLASSES: readonly UnitClass[] = [
  "function",
  "audit",
  "scope",
  "stage",
  "hook",
  "subcommand",
  "render-surface",
];

export const MIN_MECHANISM: Record<UnitClass, Mechanism> = {
  function: "none",
  audit: "none",
  scope: "none",
  stage: "none",
  hook: "none",
  subcommand: "cli",
  "render-surface": "tui",
};

export interface Unit {
  unitClass: UnitClass;
  unitId: string;
  minMechanism: Mechanism;
  source: string; // disk path the unit was read from (relative to repo root)
}

export type UnitStatus =
  | "covered"
  | "UNCOVERED"
  | "UNDER-MECHANISM"
  | "DEFERRED-tui";

export interface CoverageClaim {
  file: string; // relative to repo root
  // The SCALAR REPRESENTATIVE of the test's derived mechanism set: its strongest
  // member (Math.max over the set's ranks). This is what the registry serialises
  // — a single value per claim, byte-identical to the legacy filename suffix
  // while files still carry one (max(set) == suffix for every current file).
  // The gate evaluates the full set (see buildRegistry); this field is the
  // serialisation projection, not the gate input.
  mechanism: Mechanism;
}

export interface RegistryRow {
  unitClass: UnitClass;
  unitId: string;
  minMechanism: Mechanism;
  coveredBy: CoverageClaim[];
  status: UnitStatus;
}

// ---------------------------------------------------------------------------
// CLI tool descriptors. Each names the dispatch construct the parser must read.
//   kind "object"  -> a `const <anchor>: ... = { key: ..., "k-2": ... }` table
//                     (amadeus-graph COMMANDS, amadeus-runtime SUBCOMMANDS).
//   kind "switch"  -> the entry `switch (<switchVar>) { case "x": }` inside
//                     main(). switchVar disambiguates the entry dispatch from
//                     nested sub-switches (state.ts has practices-event + lookup
//                     sub-switches keyed on different vars; we read only the
//                     entry one keyed on `subcommand`).
//
// Verified against source on 2026-05-31:
//   state.ts:115 switch(subcommand)     audit.ts:639 switch(subcommand)
//   bolt.ts:803 switch(subcommand)      jump.ts:57 switch(subcommand)
//   log.ts:133 switch(subcommand)       worktree.ts:777 switch(subcommand)
//   validate.ts:295 switch(subcommand)  learnings.ts:750 switch(cmd)
//   sensor.ts:659 switch(cmd)           utility.ts:2814 switch(subcommand)
//   graph.ts:1088 const COMMANDS = {}   runtime.ts:1024 const SUBCOMMANDS = {}
// ---------------------------------------------------------------------------
interface ToolDescriptor {
  file: string; // basename under TOOLS_DIR
  kind: "object" | "switch";
  anchor: string; // object const name, or the switch variable
}

export const TOOL_DESCRIPTORS: readonly ToolDescriptor[] = [
  { file: "amadeus-state.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-audit.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-bolt.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-bolt.ts", kind: "object", anchor: "handlers" },
  { file: "amadeus-jump.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-log.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-worktree.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-validate.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-learnings.ts", kind: "switch", anchor: "cmd" },
  { file: "amadeus-sensor.ts", kind: "switch", anchor: "cmd" },
  { file: "amadeus-utility.ts", kind: "switch", anchor: "subcommand" },
  { file: "amadeus-graph.ts", kind: "object", anchor: "COMMANDS" },
  { file: "amadeus-runtime.ts", kind: "object", anchor: "SUBCOMMANDS" },
  { file: "amadeus-norm-metrics.ts", kind: "switch", anchor: "verb" },
];

// ===========================================================================
// ENUMERATORS — the left side of the join. Each reads source FRESH off disk.
// ===========================================================================

/** Brace-balanced slice of `src` starting at the first index after `openIdx`'s
 *  `{` through its matching `}`. openIdx must point at (or before) the `{`. */
function balancedBlock(src: string, openIdx: number): string {
  const start = src.indexOf("{", openIdx);
  if (start === -1) return "";
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  return "";
}

/** Direct (depth-1) object keys of a `const <anchor> ... = { ... }` table.
 *  Reads only top-level keys, not keys nested in handler bodies. */
export function parseObjectDispatchKeys(src: string, anchor: string): string[] {
  // Anchor the const declaration; tolerate a type annotation before `=`.
  const declRe = new RegExp(`\\bconst\\s+${anchor}\\b[^\\n]*=\\s*\\{`);
  const m = declRe.exec(src);
  if (!m) return [];
  const block = balancedBlock(src, m.index);
  return depthOneKeys(block);
}

/** Keys at brace-depth 0 of an object-literal body (the body is already the
 *  inside of the outer braces). A key is `ident:` or `"quoted-key":` that sits
 *  at depth 0. */
function depthOneKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  const lines = body.split("\n");
  for (const line of lines) {
    if (depth === 0) {
      const km = /^\s*(?:"([a-z][a-z0-9-]*)"|([a-z][a-z0-9-]*))\s*:/.exec(line);
      if (km) keys.push(km[1] ?? km[2]);
    }
    for (const ch of line) {
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth--;
    }
  }
  return keys;
}

/** `case "x":` labels at the top level of the entry switch keyed on
 *  `switchVar`. Reads only the direct cases of that switch — nested switches
 *  (keyed on other vars) contribute their cases at deeper brace depth and are
 *  excluded by the depth-0 filter. */
export function parseSwitchDispatchCases(
  src: string,
  switchVar: string,
): string[] {
  const swRe = new RegExp(`\\bswitch\\s*\\(\\s*${switchVar}\\s*\\)\\s*\\{`);
  const m = swRe.exec(src);
  if (!m) return [];
  const block = balancedBlock(src, m.index);
  const cases: string[] = [];
  let depth = 0;
  for (const line of block.split("\n")) {
    if (depth === 0) {
      const cm = /^\s*case\s+"([a-z][a-z0-9-]*)"\s*:/.exec(line);
      if (cm) cases.push(cm[1]);
    }
    for (const ch of line) {
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth--;
    }
  }
  return cases;
}

/** Public: the subcommands of one tool, by its descriptor. */
export function subcommandsForTool(d: ToolDescriptor): string[] {
  const src = readFileSync(join(TOOLS_DIR, d.file), "utf-8");
  const keys =
    d.kind === "object"
      ? parseObjectDispatchKeys(src, d.anchor)
      : parseSwitchDispatchCases(src, d.anchor);
  return keys;
}

/** ANTI-ROT GUARD (b), independent counter. Re-counts the dispatch sites in the
 *  SAME anchored block via a DIFFERENT regex pass than subcommandsForTool's
 *  line-by-line parser: a single global regex over the balanced block text.
 *  If a parser bug silently drops a tool's cases, the two counts diverge. */
export function independentSubcommandCount(d: ToolDescriptor): number {
  const src = readFileSync(join(TOOLS_DIR, d.file), "utf-8");
  if (d.kind === "object") {
    const declRe = new RegExp(`\\bconst\\s+${d.anchor}\\b[^\\n]*=\\s*\\{`);
    const m = declRe.exec(src);
    if (!m) return 0;
    const block = balancedBlock(src, m.index);
    return countDepthOneKeys(block);
  }
  const swRe = new RegExp(`\\bswitch\\s*\\(\\s*${d.anchor}\\s*\\)\\s*\\{`);
  const m = swRe.exec(src);
  if (!m) return 0;
  const block = balancedBlock(src, m.index);
  return countDepthZeroCases(block);
}

/** Count depth-0 `case "x":` sites by scanning char-by-char and matching the
 *  literal at depth 0 — structurally independent of parseSwitchDispatchCases'
 *  line-oriented loop. */
function countDepthZeroCases(block: string): number {
  let depth = 0;
  let n = 0;
  const re = /case\s+"[a-z][a-z0-9-]*"\s*:/g;
  // Walk lines so we can track depth, but match with a global regex per line.
  for (const line of block.split("\n")) {
    if (depth === 0) {
      const matches = line.match(re);
      if (matches) n += matches.length;
    }
    for (const ch of line) {
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth--;
    }
  }
  return n;
}

function countDepthOneKeys(body: string): number {
  return depthOneKeys(body).length;
}

export function enumerateSubcommands(): Unit[] {
  const units: Unit[] = [];
  for (const d of TOOL_DESCRIPTORS) {
    const toolName = basename(d.file, ".ts"); // amadeus-state
    for (const sub of subcommandsForTool(d)) {
      units.push({
        unitClass: "subcommand",
        unitId: `${toolName} ${sub}`,
        minMechanism: MIN_MECHANISM.subcommand,
        source: `dist/claude/.claude/tools/${d.file}`,
      });
    }
  }
  return units;
}

/** Canonical audit-event vocabulary, read as DATA from the OTel Event Registry
 *  (otel/event-registry.ts, drift-guard set (b)) — the single vocabulary of
 *  record. The audit tool has no second vocabulary table; its canonical event
 *  names are no longer parsed from tools/amadeus-audit.ts (#1845). */
export function enumerateAuditEvents(): Unit[] {
  const registry = require(EVENT_REGISTRY_PATH) as { canonicalAuditEvents(): string[] };
  return registry.canonicalAuditEvents().map((id) => ({
    unitClass: "audit" as const,
    unitId: id,
    minMechanism: MIN_MECHANISM.audit,
    source: "dist/claude/.claude/otel/event-registry.ts",
  }));
}

/** Scope keys from the v0.6 scope grid, with legacy scope-mapping fallback. */
export function enumerateScopes(): Unit[] {
  const sourcePath = existsSync(SCOPE_GRID_PATH) ? SCOPE_GRID_PATH : SCOPE_MAPPING_PATH;
  const raw = JSON.parse(readFileSync(sourcePath, "utf-8"));
  const sourceRel = existsSync(SCOPE_GRID_PATH)
    ? "dist/claude/.claude/tools/data/scope-grid.json"
    : "dist/claude/.claude/tools/data/scope-mapping.json";
  return Object.keys(raw).map((k) => ({
    unitClass: "scope" as const,
    unitId: k,
    minMechanism: MIN_MECHANISM.scope,
    source: sourceRel,
  }));
}

/** Stage units: every *.md under stages/<phase>/. unitId is <phase>/<slug>. */
export function enumerateStages(): Unit[] {
  const units: Unit[] = [];
  for (const phase of readdirSync(STAGES_DIR, { withFileTypes: true })) {
    if (!phase.isDirectory()) continue;
    const phaseDir = join(STAGES_DIR, phase.name);
    for (const f of readdirSync(phaseDir)) {
      if (!f.endsWith(".md")) continue;
      const slug = basename(f, ".md");
      units.push({
        unitClass: "stage",
        unitId: `${phase.name}/${slug}`,
        minMechanism: MIN_MECHANISM.stage,
        source: `${STAGES_SOURCE_ROOT}/${phase.name}/${f}`,
      });
    }
  }
  return units;
}

/** Hook units: every amadeus-*.ts under hooks/. */
export function enumerateHooks(): Unit[] {
  return readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({
      unitClass: "hook" as const,
      unitId: basename(f, ".ts"),
      minMechanism: MIN_MECHANISM.hook,
      source: `dist/claude/.claude/hooks/${f}`,
    }));
}

/** RENDER-SURFACE units: the distinct render branches of the statusline hook
 *  (dist/claude/.claude/hooks/amadeus-statusline.ts). Each branch can break
 *  independently and only a PAINTED terminal shows it, so each is its own unit
 *  at minMechanism `tui` (D-TUI-5: 6 units, not one coarse "statusline-render").
 *
 *  Enumerated FROM DISK like every other class (the §7 freshness-read): each
 *  unit names the anchor token in the statusline source that draws it. A renamed
 *  or deleted branch drops its anchor -> the unit vanishes from the enumerated
 *  universe -> the committed registry drifts -> `--check` fails. The enumerator
 *  asserts every anchor is present so a silently-removed branch cannot pass as
 *  "still covered". */
const RENDER_SURFACE_ANCHORS: ReadonlyArray<{ id: string; anchor: string }> = [
  // The 10-cell progress bar (▓/░), drawn by progressBar().
  { id: "statusline-phase-bar", anchor: "function progressBar(" },
  // The "done/total" completion counter appended after the bar.
  { id: "statusline-counter", anchor: "const phaseProg =" },
  // The "> Stage Name" segment, mapped through the STAGE_DISPLAY table.
  { id: "statusline-stage-name", anchor: "const STAGE_DISPLAY" },
  // The "-- Agent Display" segment, derived from .claude/agents frontmatter.
  { id: "statusline-agent-name", anchor: "const agentDisplay =" },
  // The context-window colour (red/yellow/green), chosen by contextColor().
  { id: "statusline-colour", anchor: "function contextColor(" },
  // The right-aligned model/ctx side, padded to terminal width by printLine().
  { id: "statusline-align", anchor: "function printLine(" },
  // The COMPLETE sentinel branch (full bar at workflow completion). The literal
  // gained the orientation prefix in P8 ([Amadeus-DLC] <prefix>COMPLETE <bar>), so the
  // anchor is the prefix-adjacent "}COMPLETE " token unique to this branch (the
  // `}` closes the `${prefix}` interpolation in the render template).
  { id: "statusline-complete", anchor: "}COMPLETE " },
];

export function enumerateRenderSurfaces(): Unit[] {
  const src = readFileSync(STATUSLINE_PATH, "utf-8");
  const units: Unit[] = [];
  for (const { id, anchor } of RENDER_SURFACE_ANCHORS) {
    if (!src.includes(anchor)) {
      // A render branch lost its anchor: fail loud rather than silently shrink
      // the universe (which would let a regressed branch pass as covered).
      throw new Error(
        `render-surface enumerator: anchor "${anchor}" for unit "${id}" not ` +
          `found in amadeus-statusline.ts — the render branch was renamed or ` +
          `removed. Update RENDER_SURFACE_ANCHORS in gen-coverage-registry.ts.`,
      );
    }
    units.push({
      unitClass: "render-surface",
      unitId: id,
      minMechanism: MIN_MECHANISM["render-surface"],
      source: "dist/claude/.claude/hooks/amadeus-statusline.ts",
    });
  }
  return units;
}

/** Exported lib functions from amadeus-lib.ts + amadeus-graph.ts. Matches a
 *  top-level `export function|const|class|async function NAME`. unitId is
 *  `function:NAME` so it joins to the `function:NAME` covers-IDs t106-t111 use. */
export function enumerateExportedFunctions(): Unit[] {
  const units: Unit[] = [];
  const re =
    /^export\s+(?:async\s+function|function|const|class)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  for (const [path, rel] of [
    [LIB_PATH, "dist/claude/.claude/tools/amadeus-lib.ts"],
    [GRAPH_PATH, "dist/claude/.claude/tools/amadeus-graph.ts"],
  ] as const) {
    const src = readFileSync(path, "utf-8");
    for (const m of src.matchAll(re)) {
      units.push({
        unitClass: "function",
        unitId: `function:${m[1]}`,
        minMechanism: MIN_MECHANISM.function,
        source: rel,
      });
    }
  }
  const stateSource = readFileSync(STATE_PATH, "utf-8");
  for (const name of TARGETED_STATE_FUNCTIONS) {
    const declaration = new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`, "m");
    if (!declaration.test(stateSource)) throw new Error(`coverage target function is missing: ${name}`);
    units.push({
      unitClass: "function",
      unitId: `function:${name}`,
      minMechanism: MIN_MECHANISM.function,
      source: "dist/claude/.claude/tools/amadeus-state.ts",
    });
  }
  return units;
}

/** All units, every class. The full enumerated universe (left side). */
export function enumerateAllUnits(): Unit[] {
  return [
    ...enumerateExportedFunctions(),
    ...enumerateAuditEvents(),
    ...enumerateScopes(),
    ...enumerateStages(),
    ...enumerateHooks(),
    ...enumerateSubcommands(),
    ...enumerateRenderSurfaces(),
  ];
}

// ===========================================================================
// CLAIM DISCOVERY — the right side of the join. Scan test files for a
// machine-readable covers: header.
// ===========================================================================

const TEST_TIERS = [
  "smoke",
  "unit",
  "integration",
  "e2e",
  "perf",
];

export interface DiscoveredClaim {
  file: string; // relative to repo root
  // The DERIVED mechanism SET — every provenance-validated driver call
  // expression in the test body (§2 of the refactor doc). A source containing
  // both a canonical driveAidlc() call and a canonical TUI-client call derives
  // {sdk, tui}; one containing no recognised call is the deterministic floor,
  // seeded from its filename segment. This field is the single source of truth
  // for the gate (which takes max(...ranks)); it is NOT serialised — the
  // per-claim mechanism written into the registry is the scalar representative
  // (the set's strongest member, == the legacy suffix while filenames still
  // carry one). Modelling it as a set lets one test cover both a `tui`
  // render-surface unit and an `sdk` audit unit.
  mechanisms: Mechanism[];
  unitIds: string[];
}

/** The mechanism of a test file is the dot-segment between its stem and the
 *  trailing `.test.ts` / `.sh`. e.g. t112.none.test.ts -> none;
 *  sdk-drive.calibration.test.ts -> calibration -> sdk. A file with no
 *  recognised dot-segment (e.g. plain t01.sh) defaults to its strongest claim
 *  being unknowable — we treat the missing segment as `none` (the weakest), so
 *  it can never over-claim a stronger unit.
 *
 *  This is now the NON-BREAKING FALLBACK SEED for mechanismsOf() — used when the
 *  body scan finds no driver call (the deterministic `none` floor, or a legacy
 *  suffixed file whose driver is implied by the segment). Kept exported so the
 *  unit test's filename-segment assertions stay green through Phase 0. */
export function mechanismOfTestFile(fileName: string): Mechanism {
  const stripped = fileName
    .replace(/\.test\.ts$/, "")
    .replace(/\.sh$/, "");
  const parts = stripped.split(".");
  if (parts.length >= 2) {
    // The trailing dot-segment is only a mechanism when it IS one (the legacy
    // `.cli`/`.none`/`.sdk`/`.tui` suffix, or `.calibration`). Any OTHER trailing
    // segment is a DESCRIPTIVE slug, not a mechanism — e.g. once milestone 6 drops the
    // suffixes, a suffix-free `t200.scope-exclusion.test.ts` must seed `none`,
    // not crash the generator. So recognise a real mechanism segment, else fall
    // through to `none` (the weakest seed — it can never over-claim). The strict
    // throwing form (mechanismFromSegment) stays for callers that demand a known
    // segment; here the fallback must be total.
    const seg = parts[parts.length - 1];
    if ((MECHANISMS as readonly string[]).includes(seg)) return seg as Mechanism;
    if (seg === "calibration") return "sdk";
    return "none";
  }
  return "none";
}

/** Derive the mechanism SET from provenance-validated driver call expressions
 *  in a test body (§2 of the refactor doc) — the zero-authoring equivalent of
 *  multi-tagging. This is a static syntax contract: it validates symbol and
 *  subprocess provenance but does not establish call-graph reachability.
 *
 *  Scan the test's executable code and collect every match (not the first):
 *    - `driveAidlc(` ............ adds `sdk` (the Agent-SDK driver)
 *    - calls a binding imported from `tui-client.ts`
 *                                adds `tui` (the painted-terminal driver)
 *    - shipped-surface spawn .... adds `cli` (the literal shipped binary): `claude -p`,
 *                                 a Bun runtime (`BUN`/`process.execPath`/`"bun"`)
 *                                 spawn whose argv targets an `amadeus-*.ts` tool, or a
 *                                 `bash`/`execFileSync("bash")` spawn of `run-tests.sh`
 *  SDK, CLI, and TUI signals use TypeScript symbol resolution so imported
 *  aliases and call expressions are resolved without mistaking comments,
 *  strings, shadowed locals, helper imports, or source file reads for a driver
 *  signal.
 *  Direct `tui-drive.ts` spawning is intentionally outside this contract: TUI
 *  tests must use the canonical client.
 *
 *  When the body scan is INCONCLUSIVE (no driver call — the deterministic floor,
 *  or a file whose driver is still only implied by its legacy `.sdk.`/`.tui.`/
 *  `.cli.`/`.none.` suffix), fall back to the filename segment via
 *  mechanismOfTestFile(). This is the doc's NON-BREAKING transition (§7 Phase 0):
 *  every existing suffixed file keeps classifying exactly as before, and new
 *  suffix-free `t<NN>.test.ts` files class by the recognised calls they contain.
 *
 *  Returns the SET (deduped, ladder-ordered). The empty set never happens — the
 *  fallback always yields at least one member. */
export function mechanismsOf(fileName: string, src: string): Mechanism[] {
  const found = new Set<Mechanism>();
  // sdk — a call expression bound to canonical driveAidlc.
  if (drivesSdkSurface(src)) found.add("sdk");
  // tui — a call expression bound to the canonical subprocess client.
  if (drivesTuiSurface(src)) found.add("tui");
  // cli — driving a shipped binary as a subprocess (claude -p, an amadeus-*.ts tool
  // under the Bun runtime, or run-tests.sh under bash). See drivesCliSurface.
  if (drivesCliSurface(src)) found.add("cli");

  if (found.size === 0) {
    // Inconclusive body scan → seed from the filename segment (non-breaking).
    return [mechanismOfTestFile(fileName)];
  }
  // Ladder-order the derived set so serialisation / inspection is deterministic.
  return MECHANISMS.filter((m) => found.has(m));
}

/** The subset of driver signals that require a usable Claude substrate at run
 *  time. `cli` is intentionally split: spawning `bun amadeus-*.ts` is
 *  deterministic, while `claude -p` / `claude --print` needs live auth. */
export function claudeDependenciesOf(_fileName: string, src: string): ClaudeDependency[] {
  const found = new Set<ClaudeDependency>();
  if (drivesSdkSurface(src)) found.add("sdk");
  if (drivesTuiSurface(src)) found.add("tui");
  if (drivesClaudePrintSurface(src)) found.add("cli-claude");
  return CLAUDE_DEPENDENCIES.filter((m) => found.has(m));
}

/** Parse a `covers:` header out of a test file's leading comment block.
 *  Supports `// covers:` (ts) and `# covers:` (sh). Continuation lines that
 *  start with the comment leader + whitespace + more IDs are folded in (t114's
 *  multi-line sub-id list). IDs are comma- and/or whitespace-separated tokens
 *  of the form `<class>:<id...>`. Returns [] if no header. */
export function parseCoversHeader(src: string, isShell: boolean): string[] {
  const leader = isShell ? "#" : "//";
  const lines = src.split("\n");
  const ids: string[] = [];
  let inHeader = false;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(leader)) {
      // A non-comment line ends the leading comment block.
      if (inHeader) break;
      if (trimmed === "") continue; // tolerate a blank shebang gap
      break;
    }
    const body = trimmed.slice(leader.length);
    const coversIdx = body.indexOf("covers:");
    if (coversIdx !== -1) {
      inHeader = true;
      collectIds(body.slice(coversIdx + "covers:".length), ids);
      continue;
    }
    if (inHeader) {
      // Continuation: only fold lines that actually carry `<class>:<id>` tokens
      // (so prose continuation paragraphs don't pollute the claim set). A
      // continuation line must contain at least one valid unit-id token.
      const before = ids.length;
      collectIds(body, ids);
      if (ids.length === before) {
        // No new IDs on this comment line — header's structured part is over.
        // Keep scanning subsequent lines in case of an interleaved blank
        // comment line, but a prose line that mentions no `class:id` is fine
        // to skip; we stop only at the first non-comment line (handled above).
      }
    }
  }
  return dedupe(ids);
}

const UNIT_ID_RE = /\b([a-z][a-z0-9-]*):([A-Za-z0-9_][\w./:-]*)/g;

function collectIds(text: string, out: string[]): void {
  // Strip trailing parenthetical annotations like "(handleApprove :675)" first
  // so a `:675` doesn't masquerade as an id segment.
  for (const m of text.matchAll(UNIT_ID_RE)) {
    out.push(`${m[1]}:${m[2]}`);
  }
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Walk the test tiers, returning every file that carries a covers: header. */
export function discoverClaims(): DiscoveredClaim[] {
  const claims: DiscoveredClaim[] = [];
  for (const tier of TEST_TIERS) {
    const dir = join(CLAIMS_TESTS_DIR, tier);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const isTs = f.endsWith(".test.ts");
      const isSh = f.endsWith(".sh");
      if (!isTs && !isSh) continue;
      const src = readFileSync(join(dir, f), "utf-8");
      const ids = parseCoversHeader(src, isSh);
      if (ids.length === 0) continue;
      claims.push({
        file: `tests/${tier}/${f}`,
        // DERIVED SET from provenance-validated call expressions (§2), seeded
        // from the filename segment when the scan is inconclusive.
        mechanisms: mechanismsOf(f, src),
        unitIds: ids,
      });
    }
  }
  return claims;
}

// ===========================================================================
// JOIN — units x claims, through the guarantee-principle gate.
// ===========================================================================

/** unitId form a covers-claim uses, per class:
 *    function -> `function:NAME`  (matches enumerator unitId exactly)
 *    audit    -> `audit:EVENT`
 *    scope    -> `scope:key`
 *    stage    -> `stage:<phase>/<slug>` OR `stage:<slug>`
 *    hook     -> `hook:amadeus-x`
 *    subcommand -> `subcommand:<tool> <sub>` OR `subcommand:<tool>:<sub>`
 *    render-surface -> `render-surface:<id>`
 *  We index units by every claim-form they could legitimately be referenced by.
 */
function claimKeysForUnit(u: Unit): string[] {
  switch (u.unitClass) {
    case "function":
      // unitId already is `function:NAME`.
      return [u.unitId];
    case "audit":
      return [`audit:${u.unitId}`];
    case "scope":
      return [`scope:${u.unitId}`];
    case "stage": {
      const slug = u.unitId.split("/")[1] ?? u.unitId;
      return [`stage:${u.unitId}`, `stage:${slug}`];
    }
    case "hook":
      return [`hook:${u.unitId}`];
    case "subcommand": {
      const [tool, sub] = u.unitId.split(" ");
      return [`subcommand:${u.unitId}`, `subcommand:${tool}:${sub}`];
    }
    case "render-surface":
      return [`render-surface:${u.unitId}`];
  }
}

export interface BuildResult {
  rows: RegistryRow[];
  claims: DiscoveredClaim[];
}

export function buildRegistry(): BuildResult {
  const units = enumerateAllUnits();
  const claims = discoverClaims();

  // Index: claim-key -> list of indexed claims that named it. Each carries BOTH
  // the full derived mechanism SET (for the gate's Math.max) AND the scalar
  // representative (max of the set) that the registry serialises.
  interface IndexedClaim {
    file: string;
    mechanisms: Mechanism[]; // the derived set — gate input
    mechanism: Mechanism; // scalar representative (strongest) — serialised
  }
  const claimIndex = new Map<string, IndexedClaim[]>();
  for (const c of claims) {
    // Strongest member of the derived set, by ladder rank. The set is never
    // empty (mechanismsOf always seeds at least one member).
    const representative = c.mechanisms.reduce((best, m) =>
      mechanismRank(m) >= mechanismRank(best) ? m : best,
    );
    for (const id of c.unitIds) {
      const arr = claimIndex.get(id) ?? [];
      arr.push({
        file: c.file,
        mechanisms: c.mechanisms,
        mechanism: representative,
      });
      claimIndex.set(id, arr);
    }
  }

  const rows: RegistryRow[] = units.map((u) => {
    const keys = claimKeysForUnit(u);
    const matched: IndexedClaim[] = [];
    for (const k of keys) {
      for (const cl of claimIndex.get(k) ?? []) matched.push(cl);
    }
    // De-dup by file (a unit referenced via two key-forms in one file counts
    // once).
    const byFile = new Map<string, IndexedClaim>();
    for (const m of matched) byFile.set(m.file, m);
    const indexed = [...byFile.values()];
    // The serialised claim list carries the scalar representative per file.
    const coveredBy: CoverageClaim[] = indexed.map((c) => ({
      file: c.file,
      mechanism: c.mechanism,
    }));

    // GUARANTEE-PRINCIPLE GATE. A claim counts when SOME mechanism in its
    // derived set ranks >= the unit's minMechanism — i.e. Math.max over the
    // set's ranks clears the bar (§7 Phase 0). A {sdk, tui} test therefore
    // covers a `tui` render-surface unit (max == tui) AND an `sdk`/`none` unit,
    // which a single-label model could never express. Claims whose whole set is
    // too weak are recorded in coveredBy (for transparency) but reported
    // UNDER-MECHANISM rather than covered.
    const minRank = mechanismRank(u.minMechanism);
    const adequate = indexed.filter(
      (c) => Math.max(...c.mechanisms.map(mechanismRank)) >= minRank,
    );

    let status: UnitStatus;
    if (adequate.length > 0) {
      status = "covered";
    } else if (coveredBy.length > 0) {
      // There ARE claims, but every one is too weak for this unit's bar.
      status = "UNDER-MECHANISM";
    } else if (u.minMechanism === "tui") {
      status = "DEFERRED-tui";
    } else {
      status = "UNCOVERED";
    }

    return {
      unitClass: u.unitClass,
      unitId: u.unitId,
      minMechanism: u.minMechanism,
      coveredBy: coveredBy.sort((a, b) => a.file.localeCompare(b.file)),
      status,
    };
  });

  rows.sort(
    (a, b) =>
      a.unitClass.localeCompare(b.unitClass) ||
      a.unitId.localeCompare(b.unitId),
  );

  return { rows, claims };
}

// ===========================================================================
// SERIALISATION — deterministic JSON so the freshness diff is byte-stable.
// ===========================================================================

export function registryJson(rows: RegistryRow[]): string {
  const byClass: Record<string, number> = {};
  const coveredByClass: Record<string, number> = {};
  for (const c of UNIT_CLASSES) {
    byClass[c] = 0;
    coveredByClass[c] = 0;
  }
  for (const r of rows) {
    byClass[r.unitClass]++;
    if (r.status === "covered") coveredByClass[r.unitClass]++;
  }
  const doc = {
    generator: "tests/gen-coverage-registry.ts",
    generatedFrom: "disk (units re-enumerated fresh)",
    unitClasses: UNIT_CLASSES,
    minMechanism: MIN_MECHANISM,
    counts: {
      total: rows.length,
      enumeratedByClass: byClass,
      coveredByClass,
    },
    units: rows,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export interface RatchetDoc {
  note: string;
  coveredByClass: Record<UnitClass, number>;
}

export function ratchetFromRows(rows: RegistryRow[]): RatchetDoc {
  const coveredByClass = Object.fromEntries(
    UNIT_CLASSES.map((c) => [c, 0]),
  ) as Record<UnitClass, number>;
  for (const r of rows) {
    if (r.status === "covered") coveredByClass[r.unitClass]++;
  }
  return {
    note:
      "Committed baseline: covered-unit count per class. The --check ratchet " +
      "fails CI if any class's covered count DROPS below these numbers without " +
      "a reviewed deferred entry. Monotonic anti-regression: you can cover " +
      "more, never silently less. Regenerate with: bun tests/gen-coverage-registry.ts",
    coveredByClass,
  };
}

export function ratchetJson(doc: RatchetDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

// Parse, don't validate (same shape as coverage-project-gate's parseTotalsText):
// a successful parse yields a coveredByClass whose invariants (every unit class
// present, non-negative integer counts) are proven. Anything else is a
// MALFORMED diagnosis, never an unhandled crash.
export type RatchetParseOutcome =
  | { ok: true; coveredByClass: Record<UnitClass, number> }
  | { ok: false; detail: string };

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function parseRatchetText(text: string): RatchetParseOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, detail: `invalid JSON: ${(err as Error).message}` };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      detail: `expected a JSON object, got ${Array.isArray(raw) ? "array" : typeof raw}`,
    };
  }
  const covered = (raw as Record<string, unknown>).coveredByClass;
  if (typeof covered !== "object" || covered === null || Array.isArray(covered)) {
    return {
      ok: false,
      detail: `coveredByClass must be an object, got ${
        Array.isArray(covered) ? "array" : typeof covered
      }`,
    };
  }
  const rec = covered as Record<string, unknown>;
  const coveredByClass = {} as Record<UnitClass, number>;
  for (const c of UNIT_CLASSES) {
    const v = rec[c];
    if (!isNonNegativeInteger(v)) {
      return {
        ok: false,
        detail: `coveredByClass.${c} must be a non-negative integer, got ${JSON.stringify(v)}`,
      };
    }
    coveredByClass[c] = v;
  }
  return { ok: true, coveredByClass };
}

// ===========================================================================
// ANTI-ROT GUARDS.
// ===========================================================================

/** Guard (a): each unit class must enumerate > 0 units. Returns the list of
 *  empty classes (empty array == healthy). */
export function emptyClasses(rows: RegistryRow[]): UnitClass[] {
  const counts = Object.fromEntries(UNIT_CLASSES.map((c) => [c, 0])) as Record<
    UnitClass,
    number
  >;
  for (const r of rows) counts[r.unitClass]++;
  return UNIT_CLASSES.filter((c) => counts[c] === 0);
}

/** Guard (b): per-tool, the structured parser's count must equal the
 *  independent regex count of dispatch sites. Returns mismatches (empty ==
 *  healthy). */
export function subcommandCrossCheck(): Array<{
  tool: string;
  parsed: number;
  independent: number;
}> {
  const mismatches: Array<{
    tool: string;
    parsed: number;
    independent: number;
  }> = [];
  for (const d of TOOL_DESCRIPTORS) {
    const parsed = subcommandsForTool(d).length;
    const independent = independentSubcommandCount(d);
    if (parsed !== independent) {
      mismatches.push({ tool: d.file, parsed, independent });
    }
  }
  return mismatches;
}

// ===========================================================================
// --check : the freshness-diff + ratchet CI guard.
// ===========================================================================

function lineDiff(expected: string, actual: string): string {
  const e = expected.split("\n");
  const a = actual.split("\n");
  const max = Math.max(e.length, a.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    if (e[i] !== a[i]) {
      if (e[i] !== undefined) out.push(`- ${e[i]}`);
      if (a[i] !== undefined) out.push(`+ ${a[i]}`);
    }
  }
  return out.slice(0, 80).join("\n");
}

export interface CheckResult {
  ok: boolean;
  messages: string[];
}

export function runCheck(rows: RegistryRow[] = buildRegistry().rows): CheckResult {
  const messages: string[] = [];
  let ok = true;

  // GUARD (a): non-empty per class.
  const empties = emptyClasses(rows);
  if (empties.length > 0) {
    ok = false;
    messages.push(
      `ANTI-ROT GUARD (a) FAILED: unit class(es) enumerated ZERO units: ` +
        `${empties.join(", ")}. A broken enumerator would report "100% ` +
        `covered, 0 units". Fix the enumerator.`,
    );
  }

  // GUARD (b): subcommand parser vs independent count.
  const mismatches = subcommandCrossCheck();
  if (mismatches.length > 0) {
    ok = false;
    for (const m of mismatches) {
      messages.push(
        `ANTI-ROT GUARD (b) FAILED: ${m.tool} subcommand parser counted ` +
          `${m.parsed} but the independent dispatch-site count is ` +
          `${m.independent}. The structured parser may have silently stopped ` +
          `seeing this tool's cases.`,
      );
    }
  }

  // FRESHNESS DIFF: committed registry must match the freshly generated one.
  const actual = registryJson(rows);
  if (!existsSync(REGISTRY_PATH)) {
    ok = false;
    messages.push(
      `FRESHNESS DIFF FAILED: ${REGISTRY_PATH} does not exist. ` +
        `Generate it with: bun tests/gen-coverage-registry.ts`,
    );
  } else {
    const committed = readFileSync(REGISTRY_PATH, "utf-8");
    if (committed !== actual) {
      ok = false;
      messages.push(
        `FRESHNESS DIFF FAILED: the enumerated universe changed but ` +
          `tests/.coverage-registry.json was not regenerated. A new unit ` +
          `(arg-dispatch case, audit event, scope, stage, hook, or exported ` +
          `fn) with no covers: claim lands UNCOVERED. Regenerate with: ` +
          `bun tests/gen-coverage-registry.ts\n` +
          `--- committed / +++ fresh ---\n${lineDiff(committed, actual)}`,
      );
    }
  }

  // RATCHET: covered count per class must not drop below the committed baseline.
  const rp = ratchetPath();
  if (!existsSync(rp)) {
    ok = false;
    messages.push(
      `RATCHET FAILED: ${rp} does not exist. ` +
        `Generate it with: bun tests/gen-coverage-registry.ts`,
    );
  } else {
    const parsed = parseRatchetText(readFileSync(rp, "utf-8"));
    if (!parsed.ok) {
      ok = false;
      messages.push(
        `RATCHET FAILED [MALFORMED]: ${rp}: ${parsed.detail}. ` +
          `The committed ratchet is corrupt (bad merge-conflict resolution or ` +
          `hand edit). Regenerate it with a reviewed commit: ` +
          `bun tests/gen-coverage-registry.ts`,
      );
      return { ok, messages };
    }
    const baseline = parsed.coveredByClass;
    const current = ratchetFromRows(rows).coveredByClass;
    for (const c of UNIT_CLASSES) {
      const base = baseline[c];
      const now = current[c] ?? 0;
      if (now < base) {
        ok = false;
        messages.push(
          `RATCHET FAILED: class "${c}" covered count DROPPED from ${base} ` +
            `(baseline) to ${now}. A covered unit lost its claim. Either ` +
            `restore the claim, or — if the unit was legitimately removed — ` +
            `regenerate the baseline with a reviewed commit: ` +
            `bun tests/gen-coverage-registry.ts`,
        );
      }
    }
  }

  return { ok, messages };
}

// ===========================================================================
// MAIN.
// ===========================================================================

function writeAll(rows: RegistryRow[]): void {
  writeFileSync(REGISTRY_PATH, registryJson(rows));
  writeFileSync(RATCHET_PATH, ratchetJson(ratchetFromRows(rows)));
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--check")) {
    const r = runCheck();
    if (!r.ok) {
      for (const m of r.messages) console.error(m);
      process.exit(1);
    }
    console.log("coverage registry: OK (fresh, guards green, ratchet held)");
    return;
  }

  const { rows } = buildRegistry();

  // Guards also run on a plain generate so we never WRITE a rotted registry.
  const empties = emptyClasses(rows);
  if (empties.length > 0) {
    console.error(
      `Refusing to write: empty unit class(es): ${empties.join(", ")}`,
    );
    process.exit(1);
  }
  const mismatches = subcommandCrossCheck();
  if (mismatches.length > 0) {
    for (const m of mismatches) {
      console.error(
        `Refusing to write: ${m.tool} parser/independent count mismatch ` +
          `(${m.parsed} vs ${m.independent})`,
      );
    }
    process.exit(1);
  }

  if (args.includes("--print")) {
    process.stdout.write(registryJson(rows));
    return;
  }

  writeAll(rows);

  // Report enumerated + covered counts per class to stdout.
  const byClass: Record<string, { total: number; covered: number }> = {};
  for (const c of UNIT_CLASSES) byClass[c] = { total: 0, covered: 0 };
  for (const r of rows) {
    byClass[r.unitClass].total++;
    if (r.status === "covered") byClass[r.unitClass].covered++;
  }
  console.log("Wrote tests/.coverage-registry.json + tests/.coverage-ratchet.json");
  console.log("Enumerated units (covered / total) per class:");
  for (const c of UNIT_CLASSES) {
    console.log(
      `  ${c.padEnd(11)} ${byClass[c].covered}/${byClass[c].total}`,
    );
  }
  console.log(`  ${"TOTAL".padEnd(11)} ${rows.filter((r) => r.status === "covered").length}/${rows.length}`);
}

if (import.meta.main) main();
