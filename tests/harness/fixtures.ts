// fixtures.ts — TS port of tests/lib/fixtures.sh's project-scaffolding.
//
// Ports the project-creation / teardown helpers so the SDK harness can build
// and tear down temp AIDLC projects from TypeScript, the same way the shell
// suite did from bash. The bytes of the scaffolding match fixtures.sh:
//   - create_test_project   -> createTestProject()  (now seeds the per-intent
//                                                     workspace shell, not flat
//                                                     amadeus-docs/)
//   - seed_state_file        -> seedStateFile()
//   - seed_audit_file        -> seedAuditFile()
//   - reset_amadeus_env        -> resetAidlcEnv()
//   - cleanup_test_project   -> cleanupTestProject()
//   - setup_integration_project -> setupIntegrationProject()
//   - sed_i                  -> sedReplaceInFile() (portable in-place edit)
//
// DELIBERATELY NOT PORTED: run_claude. The SDK driver (sdk-drive.ts
// driveAidlc) replaces it entirely — there is no `claude -p` subprocess, no
// exit-124 timeout heuristic, no CLAUDE_OUTPUT/CLAUDE_RC globals.
//
// Path layout (mirrors fixtures.sh:5-8, resolved from tests/harness/):
//   REPO_ROOT    = tests/harness/../..            (the worktree root)
//   AMADEUS_SRC    = <REPO_ROOT>/dist/claude/.claude
//   FIXTURES_DIR = <REPO_ROOT>/tests/fixtures

import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedCustomHarness } from "./custom-harness.ts";
import {
  createGoalReconciliationReceipt,
  createInitialGoalLineage,
  goalLineagePath,
  readGoalLineage,
  writeGoalReconciliationReceipt,
  writeInitialGoalLineage,
} from "../../packages/framework/core/tools/amadeus-goal-reconciliation.ts";
import { workflowCompletionContextDigest } from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";
import {
  type ApprovedPlanDeliveryBoltProjection,
  projectDeliveryBoltPlan,
} from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";
import {
  getField,
  setOrInsertField,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HARNESS_DIR, "..", "..");
export const AMADEUS_SRC = join(REPO_ROOT, "dist", "claude", ".claude");
// #3388: Claude's onboarding doc ships as a real project-root CLAUDE.md beside
// .claude/, exactly like every AGENTS.md harness — no .example, no manual copy.
export const CLAUDE_ONBOARDING_DOC = join(REPO_ROOT, "dist", "claude", "CLAUDE.md");

// The per-intent WORKSPACE layout the fixtures seed (P9 — the flat amadeus-docs/
// layout is retired). A fixture project gets a SEED-style shell (amadeus/active-space
// + spaces/default/) plus ONE default intent record so the path helpers resolve
// the record dir rather than the bare space root. The slug is fixed + SLUG_RE-valid
// and the id8 is all-hex so it matches the `<slug>-<id8>` record-dir shape. Tests
// resolve the seeded paths via seededRecordDir()/seededStateFile() below (or
// import recordDirFor from sdk-drive.ts) instead of hardcoding amadeus-docs/.
export const DEFAULT_SPACE = "default";
// The seeded default intent's uuid (canonical UUIDv7 shape). The record dir name
// is `<slug>-<id8>` where id8 = idSuffix(uuid) = the trailing 16 hex chars (dashes
// stripped) — the SAME derivation the runtime uses to join an intents.json row to
// its dir (amadeus-lib.ts idSuffix/listIntents). Deriving DEFAULT_RECORD_DIR from
// the uuid keeps the row and the dir consistent BY CONSTRUCTION, so the seeded
// fixture models a layout the runtime can actually produce (a hand-kept suffix had
// drifted: uuid …8000-000000000001 → idSuffix `8000000000000001`, not the literal
// `0000000000000001` the dir used, so listIntents()/status transitions never
// matched the row to its dir).
export const DEFAULT_INTENT_UUID = "00000000-0000-7000-8000-000000000001";
const DEFAULT_RECORD_ID8 = DEFAULT_INTENT_UUID.replace(/-/g, "").slice(-16);
export const DEFAULT_RECORD_DIR = `fixture-${DEFAULT_RECORD_ID8}`;
// A FIXED per-clone audit-shard token seeded into every fixture project's
// gitignored amadeus/.amadeus-clone-id. Pinning it makes the audit shard a spawned
// tool resolves (auditShardName = `<host>-<clone>.md`) DETERMINISTIC, so a test
// that pre-seeds a shard header or reads back a specific shard agrees with the
// subprocess. On a real project the token is minted + gitignored per clone; a
// fixture wants it stable across the test process and the tools it spawns.
export const FIXTURE_CLONE_ID = "fixturecloneid01";
// The relocated method ("memory") ships at the dist tree ROOT (beside .claude/),
// at amadeus/spaces/default/memory/. A fixture project must copy this alongside
// .claude/ so the resolver's default (join(<harness>/tools, "..", "..",
// amadeus/spaces/default/memory)) finds the rule layers. (NOTE: P5 copies the
// shipped method tree as-is; P9 owns the full per-intent fixture re-root.)
export const AMADEUS_MEMORY_SRC = join(REPO_ROOT, "dist", "claude", "amadeus");
export const FIXTURES_DIR = join(REPO_ROOT, "tests", "fixtures");

const RETRYABLE_RM_CODES = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);

/**
 * Unset AIDLC-related env vars that a developer's shell (or a prior test) may
 * have leaked, so fixture-defined defaults aren't shadowed. Mirrors
 * reset_amadeus_env (fixtures.sh:16-18).
 */
export function resetAidlcEnv(): void {
  delete process.env.AMADEUS_DEFAULT_SCOPE;
}

/**
 * Create a bare temp project dir seeded with the per-intent workspace shell
 * (amadeus/active-space + spaces/default/ + one default intent record). Mirrors
 * create_test_project (fixtures.sh:20-33). On Windows (Git Bash / MSYS) the
 * raw mktemp path is a POSIX path native Bun cannot resolve; cygpath -m
 * rewrites it to an absolute Windows path with forward slashes that both Git
 * Bash and native Bun understand and that round-trips through JSON. We
 * replicate that cygpath step here for parity.
 *
 * Canonicalise the path (realpathSync) before returning — on macOS mkdtemp
 * hands back /tmp/... or /var/folders/... but those are symlinks to
 * /private/tmp/... and /private/var/folders/..., and the app records the
 * resolved path (the realpath) in fields like state's Project Root. Returning
 * the canonical form here means a caller comparing app-written paths to this
 * value compares equal. Reading/writing/cleanup are unaffected (the symlink
 * resolves transparently either way). Mirrors setupWorktreeFixture's realpath
 * step below.
 */
export function createTestProject(): string {
  const base = process.env.TMPDIR || tmpdir();
  let proj = mkdtempSync(join(base, "amadeus-test-"));
  // Canonicalise so app-written paths (e.g. state Project Root) compare equal
  // (macOS /tmp -> /private/tmp, /var -> /private/var).
  try {
    proj = realpathSync(proj);
  } catch {
    /* keep the raw path */
  }
  seedWorkspaceShell(proj);
  proj = toPortablePath(proj);
  return proj;
}



/**
 * The absolute intents dir for a space: `<proj>/amadeus/spaces/<space>/intents`.
 */
export function intentsDirOf(proj: string, space = DEFAULT_SPACE): string {
  return join(proj, "amadeus", "spaces", space, "intents");
}

/**
 * The default intent's RECORD directory a fixture seeds:
 * `<proj>/amadeus/spaces/default/intents/<DEFAULT_RECORD_DIR>`. The data-path
 * helpers (seededStateFile/seededAuditDir) resolve under this; the chokepoint
 * seeders write here. Mirrors the per-intent layout the engine writes. (Named
 * seededRecordDir to avoid colliding with sdk-drive.ts recordDirFor and the many
 * test-local recordDirOf helpers that resolve from live cursors instead.)
 */
export function seededRecordDir(proj: string, space = DEFAULT_SPACE): string {
  return join(intentsDirOf(proj, space), DEFAULT_RECORD_DIR);
}

/** Write a canonical single-Bolt Delivery Plan and return its runtime projection. */
export function seedDeliveryBoltPlan(
  recordDir: string,
  units: readonly string[],
): ApprovedPlanDeliveryBoltProjection {
  const plan = `## Bolt delivery\n\n- **Units:** ${units.map((unit) => `\`${unit}\``).join(", ")}\n`;
  const planningDir = join(recordDir, "inception", "delivery-planning");
  mkdirSync(planningDir, { recursive: true });
  writeFileSync(join(planningDir, "bolt-plan.md"), plan);
  const projected = projectDeliveryBoltPlan(plan);
  if (!projected.ok || projected.projection.authority !== "approved-plan") {
    throw new Error(projected.ok ? "expected approved Delivery Bolt projection" : projected.message);
  }
  return projected.projection;
}

/** The seeded state file path: `<record>/amadeus-state.md`. */
export function seededStateFile(proj: string, space = DEFAULT_SPACE): string {
  return join(seededRecordDir(proj, space), "amadeus-state.md");
}

/** The seeded audit SHARD DIR path: `<record>/audit`. */
export function seededAuditDir(proj: string, space = DEFAULT_SPACE): string {
  return join(seededRecordDir(proj, space), "audit");
}

export function resetSeededAuditDir(proj: string, space = DEFAULT_SPACE): void {
  rmSync(seededAuditDir(proj, space), { recursive: true, force: true });
}

/**
 * The DETERMINISTIC audit shard path a spawned tool resolves in a fixture
 * project: `<record>/audit/<host-slug>-<FIXTURE_CLONE_ID>.jsonl`. Mirrors
 * auditShardName() in amadeus-lib.ts (hostname slugified + the pinned clone token).
 * A test that pre-seeds an audit header or reads a single shard should target
 * THIS path so it agrees with the tool's own resolution.
 */
export function seededAuditShard(proj: string, space = DEFAULT_SPACE): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return join(seededAuditDir(proj, space), `${host}-${FIXTURE_CLONE_ID}.jsonl`);
}

/**
 * Seed a SEED-style workspace shell plus ONE default intent record + cursors +
 * registry, so the path helpers resolve the per-intent record. This is the
 * per-intent analog of the old `mkdir amadeus-docs/`. The record dir holds no
 * amadeus-state.md until a seeder writes one (a bare createTestProject leaves an
 * empty record, matching the old empty amadeus-docs/).
 */
export function seedWorkspaceShell(proj: string, space = DEFAULT_SPACE): void {
  const intentsDir = intentsDirOf(proj, space);
  mkdirSync(join(proj, "amadeus", "spaces", space, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(proj, space), { recursive: true });
  // Pin the per-clone audit-shard token so a spawned tool's shard is
  // deterministic (see FIXTURE_CLONE_ID / seededAuditShard).
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), `${FIXTURE_CLONE_ID}\n`, "utf-8");
  // The cursors (per-user, gitignored on a real project) + the canonical registry.
  writeFileSync(join(proj, "amadeus", "active-space"), `${space}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [
        {
          uuid: DEFAULT_INTENT_UUID,
          slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""),
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

/**
 * Remove the seeded workspace record + cursor so the no-workspace (no active
 * intent) path is tested. Leaves the shell (active-space + spaces/default/) so a
 * resolver still finds the space; the record dir + cursor + registry go. Mirrors
 * the old `rm -rf amadeus-docs/` no-layout option.
 */
export function removeWorkspaceRecord(proj: string, space = DEFAULT_SPACE): void {
  const intentsDir = intentsDirOf(proj, space);
  rmSync(intentsDir, { recursive: true, force: true });
}

/**
 * On Windows, rewrite a POSIX-ish temp path to a mixed-mode Windows path via
 * `cygpath -m`. No-op on platforms without cygpath. Mirrors the
 * `command -v cygpath` guard in create_test_project.
 */
export function toPortablePath(p: string): string {
  if (process.platform !== "win32") return p;
  try {
    return execFileSync("cygpath", ["-m", p], { encoding: "utf8" }).trim() || p;
  } catch {
    return p;
  }
}

/**
 * Canonical Completed contract (#1875): completed `[x]` rows whose effective
 * plan action is EXECUTE. The single test-side mirror of the counter the
 * production writer (rebuildCompletedFieldFromState) maintains — assert
 * against these helpers instead of re-inlining the row regex per test.
 */
export function canonicalCompletedSlugs(stateText: string): string[] {
  return [...stateText.matchAll(/^- \[x\] (\S+) — EXECUTE(?: .*)?$/gm)].map((m) => m[1]);
}

/** Count of canonicalCompletedSlugs — the value the `Completed` field must hold. */
export function canonicalCompletedCount(stateText: string): number {
  return canonicalCompletedSlugs(stateText).length;
}

/**
 * Copy a state fixture into the default intent's record:
 * <proj>/amadeus/spaces/default/intents/<record>/amadeus-state.md. `fixturePath` may
 * be an absolute path or a bare fixture filename resolved against FIXTURES_DIR.
 */
export function seedStateFile(proj: string, fixturePath: string): void {
  const recDir = seededRecordDir(proj);
  mkdirSync(recDir, { recursive: true });
  const src = existsSync(fixturePath) ? fixturePath : join(FIXTURES_DIR, fixturePath);
  copyFileSync(src, join(recDir, "amadeus-state.md"));
}

/** Add the minimal current Goal and ACHIEVED receipt required by terminal tests. */
export function seedGoalReceiptForFinalStage(
  proj: string,
  finalStage: string,
  completionInstance = `terminal:${finalStage}`,
): void {
  const recDir = seededRecordDir(proj);
  const statePath = seededStateFile(proj);
  let state = readFileSync(statePath, "utf8");
  const scope = getField(state, "Scope")?.trim();
  if (!scope) throw new Error("Goal fixture requires a Scope field");
  const lineageFile = goalLineagePath(recDir);
  const lineage = existsSync(lineageFile)
    ? readGoalLineage(recDir)
    : createInitialGoalLineage({
      intentId: DEFAULT_INTENT_UUID,
      statement: "Exercise the seeded terminal transition",
      scope,
      createdAt: "2026-08-04T00:00:00.000Z",
    });
  const current = lineage.revisions[lineage.currentRevision];
  state = setOrInsertField(state, "## Runtime State", "Goal ID", lineage.goalId);
  state = setOrInsertField(
    state,
    "## Runtime State",
    "Current Goal Revision",
    String(lineage.currentRevision),
  );
  state = setOrInsertField(
    state,
    "## Runtime State",
    "Current Goal Digest",
    current.digest,
  );
  writeFileSync(statePath, state);
  if (!existsSync(lineageFile)) writeInitialGoalLineage(recDir, lineage);
  const receipt = createGoalReconciliationReceipt({
    lineage,
    scope,
    finalStage,
    completionInstance,
    completionContextDigest: workflowCompletionContextDigest(state, finalStage),
    items: [
      {
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [
          {
            kind: "deterministic-check",
            reference: "fixture:terminal-transition",
            digest: "0".repeat(64),
          },
        ],
      },
      ...current.successMetrics.map((_, index) => ({
        id: `success-metric-${index + 1}`,
        verdict: "ACHIEVED" as const,
        evidence: [
          {
            kind: "deterministic-check" as const,
            reference: `fixture:terminal-transition:metric-${index + 1}`,
            digest: "0".repeat(64),
          },
        ],
      })),
    ],
    humanRulingReference: null,
    createdAt: "2026-08-04T00:00:00.000Z",
  });
  writeGoalReconciliationReceipt(recDir, receipt);
}

/**
 * Seed the unit-of-work-dependency.md that a `- [x] units-generation` state
 * fixture implies. A compile refuses to write a graph when the checkbox says the
 * stage completed but its artefact is missing (computeBoltDagOutcome's `invalid`
 * arm), so any project seeded from a completed-units fixture needs this to model
 * a layout the engine can actually produce.
 *
 * The block is the smallest valid two-unit DAG; tests that care about the DAG's
 * shape write their own artefact instead of calling this. Takes the record dir
 * rather than the project root because most callers build their own record
 * layout instead of the seeded default one.
 */
export function seedUnitDependency(recordDir: string): void {
  const dir = join(recordDir, "inception", "units-generation");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "unit-of-work-dependency.md"),
    [
      "# Unit Dependency",
      "",
      "## Dependencies",
      "",
      "```yaml",
      "units:",
      "  - name: U1",
      "    depends_on: []",
      "  - name: U2",
      "    depends_on: [U1]",
      "```",
      "",
      "## Integration Points",
      "",
      "None.",
      "",
    ].join("\n"),
    "utf-8",
  );
}

/**
 * Copy the audit sample into the default intent's DETERMINISTIC per-clone shard
 * (<record>/audit/<host>-<FIXTURE_CLONE_ID>.jsonl) — the SAME shard a spawned tool
 * resolves (the fixture pins the clone-id). Seeding the tool's own shard means
 * the seeded trail and the tool's appends share one file: readers glob audit/*.jsonl
 * and merge by timestamp, and a test that sabotages the shard blocks the tool.
 */
export function seedAuditFile(proj: string): void {
  const shard = seededAuditShard(proj);
  mkdirSync(dirname(shard), { recursive: true });
  copyFileSync(join(FIXTURES_DIR, "audit-sample.jsonl"), shard);
}

/**
 * Recursively remove a temp project dir. Mirrors cleanup_test_project
 * (fixtures.sh:58-61) — guards against empty/non-existent paths.
 */
export function cleanupTestProject(proj: string | undefined): void {
  if (proj && existsSync(proj)) removeTreeWithRetry(proj);
}

/**
 * Portable in-place text replace. The shell version (sed_i, fixtures.sh:38-43)
 * shells out to sed via a tempfile to dodge BSD/GNU `-i` differences; in TS we
 * just read/replace/write. `pattern` may be a string (replaced once) or a
 * RegExp (use the `g` flag for replace-all). Provided for parity with the
 * `--strip-env-scope` path below.
 */
export function sedReplaceInFile(
  file: string,
  pattern: string | RegExp,
  replacement: string,
): void {
  const text = readFileSync(file, "utf8");
  writeFileSync(file, text.replace(pattern, replacement));
}

/**
 * Run `git <args>` in `cwd`, returning the raw spawnSync result on success.
 * On failure, emit a diagnostic block to stderr before throwing — instrumentation
 * for issue #2382: t206's `git commit` intermittently fails under full-suite
 * parallel load with `unable to create temporary file` (ENOENT) + `failed to
 * write commit object`, and a 2,404-trial repro harness could not pin the
 * mechanism (a bare directory-deletion theory was structurally ruled out). The
 * diagnostic block captures cwd/objects-dir existence, TMPDIR, and a fresh
 * `git rev-parse --git-dir` probe so the next spontaneous occurrence in CI
 * carries enough evidence to resolve the mechanism, rather than just the bare
 * git stderr.
 */
export function gitOrThrow(cwd: string, args: string[]): SpawnSyncReturns<string> {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) {
    const cwdExists = existsSync(cwd);
    const gitDirExists = existsSync(join(cwd, ".git"));
    const objectsDirExists = existsSync(join(cwd, ".git", "objects"));
    const tmpdirEnv = process.env.TMPDIR ?? "(unset)";
    const probe = spawnSync("git", ["rev-parse", "--git-dir"], { cwd, encoding: "utf-8" });
    process.stderr.write(
      [
        `[gitOrThrow diagnostics] git ${args.join(" ")} failed in ${cwd}`,
        `  cwd exists: ${cwdExists}`,
        `  .git exists: ${gitDirExists}`,
        `  .git/objects exists: ${objectsDirExists}`,
        `  TMPDIR: ${tmpdirEnv}`,
        `  rev-parse --git-dir: status=${probe.status} stdout=${JSON.stringify((probe.stdout ?? "").trim())} stderr=${JSON.stringify((probe.stderr ?? "").trim())}`,
        "",
      ].join("\n"),
    );
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`);
  }
  return r;
}

// ============================================================================
// Worktree fixtures — TS port of tests/lib/worktree-helpers.sh.
//
// amadeus-worktree.ts runs REAL `git worktree add/remove/list` and asserts it is
// invoked from the main checkout (resolveWorktreeAnchor, amadeus-worktree.ts).
// So a worktree-tier test needs an actual git repo on `main` with one
// commit, plus the per-intent workspace shell for the audit emit. These helpers
// build and tear that down, mirroring setup_worktree_fixture /
// cleanup_worktree_fixture.
// ============================================================================

/** Basename prefix every worktree fixture lives under; cleanup refuses any
 *  path whose basename doesn't start with it (defence-in-depth, mirrors
 *  WORKTREE_FIXTURE_PREFIX_NAME in worktree-helpers.sh:15). */
export const WORKTREE_FIXTURE_PREFIX = "amadeus-worktree-";

/**
 * Create a fresh git repo in a tempdir with one commit on `main`, plus the
 * per-intent workspace shell. Returns the canonical (realpath) project path — git
 * worktree list --porcelain emits canonical paths, so callers comparing to
 * this path need the canonical form too (macOS /var -> /private/var). Mirrors
 * setup_worktree_fixture (worktree-helpers.sh:21-52): init + symbolic-ref main
 * (not `git init -b`, which needs git >= 2.28) + seed commit. Throws on any
 * git failure rather than returning a bad path.
 */
export function setupWorktreeFixture(): string {
  const base = process.env.TMPDIR || tmpdir();
  let proj = mkdtempSync(join(base, WORKTREE_FIXTURE_PREFIX));
  // Canonicalise so `git worktree list --porcelain` paths compare equal.
  try {
    proj = realpathSync(proj);
  } catch {
    /* keep the raw path */
  }
  proj = toPortablePath(proj);
  const git = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: proj, encoding: "utf8" });
    if (r.status !== 0) {
      rmSync(proj, { recursive: true, force: true });
      throw new Error(
        `git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
      );
    }
  };
  git(["init", "-q"]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);
  // Local (not just -c-scoped) identity: CI runners have no global git
  // config, and callers (e.g. gitOrThrow in later commits, such as t493's
  // fixture-corruption tests) invoke `git commit` without a per-call `-c`,
  // so the repo needs its own committer identity to avoid
  // `fatal: empty ident name` (mirrors t206's initGitRepo() style).
  git(["config", "user.email", "t@x"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
  writeFileSync(join(proj, "README.md"), "seed\n");
  git(["add", "README.md"]);
  git(["commit", "-qm", "init"]);
  // Seed the per-intent workspace shell + default record so the data-path
  // helpers (and the worktree-mirror resolution that threads relativeRecordDir)
  // anchor under amadeus/spaces/default/intents/<record>/ instead of a flat
  // amadeus-docs/ tree.
  seedWorkspaceShell(proj);
  return proj;
}

/**
 * Remove a worktree fixture: detach + remove every child worktree (errors
 * swallowed so a partially-set-up fixture still cleans), then rm -rf the
 * parent. Refuses any path whose basename doesn't start with the fixture
 * prefix. Mirrors cleanup_worktree_fixture (worktree-helpers.sh:80-111).
 */
export function cleanupWorktreeFixture(proj: string | undefined): void {
  if (!proj?.trim()) return;
  if (!basename(proj).startsWith(WORKTREE_FIXTURE_PREFIX)) return;
  if (!existsSync(proj)) return;
  // Prune any registered child worktrees first so rm -rf doesn't orphan git
  // metadata. `git worktree list --porcelain` lists the main checkout first.
  const list = spawnSync("git", ["-C", proj, "worktree", "list", "--porcelain"], {
    encoding: "utf8",
  });
  if (list.status === 0) {
    let mainSeen = false;
    for (const line of (list.stdout || "").split("\n")) {
      if (!line.startsWith("worktree ")) continue;
      const wt = line.slice("worktree ".length);
      if (!mainSeen) {
        mainSeen = true;
        continue;
      }
      spawnSync("git", ["-C", proj, "worktree", "remove", "--force", wt], {
        encoding: "utf8",
      });
    }
  }
  removeTreeWithRetry(proj);
}

/**
 * Stderr fragment `git worktree add` emits when a concurrent prune/gc removes
 * the freshly-created (still-empty) `.git/worktrees/<name>` metadata dir in
 * the narrow window between mkdir and the `locked` marker write (#3056 first
 * retried this once, locally, for tests/integration/t-worktree-gc.test.ts;
 * #3088 catalogued 8 more `git worktree add` fixture-setup call sites with
 * the same exposure). A genuine failure (bad ref, path already exists, ...)
 * never produces this exact fragment, so matching on it cannot mask an
 * unrelated failure.
 */
export const WORKTREE_ADD_PRUNE_RACE_STDERR = "/locked' for writing: No such file or directory";

/** True when `stderr` is the narrow prune-race failure above. */
export function isWorktreeAddPruneRaceStderr(stderr: string): boolean {
  return stderr.includes(WORKTREE_ADD_PRUNE_RACE_STDERR);
}

/**
 * True when `args` is a `git worktree add` invocation (optionally prefixed
 * with global flags such as `-C <dir>`) that failed with the narrow
 * prune-race stderr above — the single condition every retry site in this
 * file shares, so a caller with its own git-running wrapper (runGit,
 * gitStdout, the local `git()` helpers) can fold the retry into its existing
 * loop instead of adopting spawnWorktreeAdd wholesale.
 */
export function shouldRetryWorktreeAdd(args: readonly string[], stderr: string): boolean {
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === "worktree" && args[i + 1] === "add") {
      return isWorktreeAddPruneRaceStderr(stderr);
    }
  }
  return false;
}

/**
 * Run `git worktree add <addArgs>` in `cwd`, retrying exactly once if the
 * first attempt fails with WORKTREE_ADD_PRUNE_RACE_STDERR. `spawn` defaults to
 * a real `git` subprocess and is injectable so the retry branch is
 * unit-testable without depending on the real (sub-millisecond, hard-to-hit —
 * see #3088) race window.
 */
export function spawnWorktreeAdd(
  cwd: string,
  addArgs: readonly string[],
  spawn: (args: readonly string[]) => SpawnSyncReturns<string> = (args) =>
    spawnSync("git", args, { cwd, encoding: "utf-8" }),
): SpawnSyncReturns<string> {
  return spawnGitCommand(cwd, ["worktree", "add", ...addArgs], spawn);
}

/**
 * Run one git command with the narrow #3088 retry: a generic runner for call
 * sites whose argv is not statically a `worktree add` — the retry predicate
 * itself decides, so every other command keeps single-shot semantics.
 */
export function spawnGitCommand(
  cwd: string,
  args: readonly string[],
  spawn: (args: readonly string[]) => SpawnSyncReturns<string> = (a) =>
    spawnSync("git", a, { cwd, encoding: "utf-8" }),
): SpawnSyncReturns<string> {
  let result = spawn(args);
  if (result.status !== 0 && shouldRetryWorktreeAdd(args, result.stderr ?? "")) {
    result = spawn(args);
  }
  return result;
}

// rmSync with force:true can return without error while leaving the tree in
// place (observed on macOS/bun 1.3.13 against large fixture trees — issue
// #1565), so success is verified by the post-condition (the path is gone),
// never by rmSync returning. Ops are injectable so both failure branches are
// unit-testable in-process.
export interface RemoveTreeOps {
  rm(path: string): void;
  exists(path: string): boolean;
  sleep(ms: number): void;
}
const realRemoveTreeOps: RemoveTreeOps = {
  rm: (path) => rmSync(path, { recursive: true, force: true }),
  exists: existsSync,
  sleep: sleepSync,
};
export function removeTreeWithRetry(path: string, ops: RemoveTreeOps = realRemoveTreeOps): void {
  const attempts = process.platform === "win32" ? 10 : 5;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      ops.rm(path);
      if (!ops.exists(path)) return;
      lastErr = new Error(`rmSync returned but the tree still exists: ${path}`);
    } catch (err) {
      lastErr = err;
      if (!isRetryableRmError(err) || i === attempts - 1) break;
    }
    if (i < attempts - 1) ops.sleep(50 * (i + 1));
  }
  throw lastErr;
}

function isRetryableRmError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && RETRYABLE_RM_CODES.has(code);
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const RETRYABLE_COPY_CODES = new Set(["ENOENT", "EAGAIN", "EMFILE", "ENOMEM"]);

// cpSync(AMADEUS_SRC, ..., { recursive: true }) has failed with a bare
// `ENOENT: no such file or directory, open` under full-suite parallel load
// (#2397, t99) — bun's recursive-copy internals throw without attaching a
// `path` to the error, so the raw stderr carries zero positional
// information and the next occurrence is exactly as undiagnosable as the
// first. copyTreeWithRetry is the symmetric counterpart to
// removeTreeWithRetry (#1565): ops are injectable so both the retry branch
// and the diagnostics branch are unit-testable in-process; a transient
// ENOENT/EAGAIN/EMFILE/ENOMEM is retried with linear backoff, but every
// attempt (including ones that will be retried) emits a diagnostic block to
// stderr FIRST — silently retrying into a green result would erase the one
// forensic trace bun's error withholds. Success is verified by a
// post-condition (dest's recursive file count == src's), never by cpSync
// returning without throwing: a partial copy that happens not to throw
// would otherwise pass silently.
//
// dest-fresh contract (#3003, t99): `dest` must not exist when
// copyTreeWithRetry is called — the helper owns it outright. Every attempt
// therefore removes `dest` before copying: cpSync merges into an existing
// destination, so anything left behind by a previous attempt (or landed
// under dest by a racing writer) accumulates instead of being replaced, and
// a dest that has grown past src can never satisfy the count post-condition
// no matter how many attempts remain. Clearing first makes each attempt a
// fresh copy rather than a merge, so a retry can actually converge.
export interface CopyTreeOps {
  copy(src: string, dest: string): void;
  sleep(ms: number): void;
  /** Recursive file count under `path` (directories excluded), or -1 if `path` does not exist. */
  count(path: string): number;
  /** Idempotent removal of `path` — a no-op when `path` does not exist. */
  remove(path: string): void;
}
const realCopyTreeOps: CopyTreeOps = {
  copy: (src, dest) => cpSync(src, dest, { recursive: true }),
  sleep: sleepSync,
  count: countFilesRecursive,
  remove: (path) => rmSync(path, { recursive: true, force: true }),
};
const COPY_TREE_RETRY_LIMIT = 3;
const COPY_TREE_RETRY_BACKOFF_MS = 50;

export function copyTreeWithRetry(
  src: string,
  dest: string,
  ops: CopyTreeOps = realCopyTreeOps,
): void {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= COPY_TREE_RETRY_LIMIT; attempt++) {
    try {
      // Start every attempt from an empty dest — see the dest-fresh contract
      // on CopyTreeOps above.
      ops.remove(dest);
      ops.copy(src, dest);
      const srcCount = ops.count(src);
      const destCount = ops.count(dest);
      if (srcCount === destCount) return;
      lastErr = new Error(
        [
          "copyTreeWithRetry: cpSync returned but the file count does not match",
          `  src:  ${src} (${srcCount} file(s))`,
          `  dest: ${dest} (${destCount} file(s))`,
        ].join("\n"),
      );
      reportCopyTreeFailure(src, dest, lastErr, attempt);
    } catch (err) {
      lastErr = err;
      reportCopyTreeFailure(src, dest, err, attempt);
      if (!isRetryableCopyError(err)) break;
    }
    if (attempt < COPY_TREE_RETRY_LIMIT) ops.sleep(COPY_TREE_RETRY_BACKOFF_MS * attempt);
  }
  throw lastErr;
}

function isRetryableCopyError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && RETRYABLE_COPY_CODES.has(code);
}

/**
 * cpSync's recursive-copy failures (bun 1.3.13, #2397 t99) have been observed
 * as a bare `ENOENT: no such file or directory, open` with NO path attached
 * — err.path/err.syscall are undefined even though the underlying open(2)
 * had one. A src re-scan taken immediately after the failure is therefore
 * the only positional evidence available: it can catch a sibling test
 * having deleted/replaced an entry mid-walk, without claiming that as the
 * mechanism.
 *
 * The two file counts alone say only THAT the trees differ. The set
 * difference below says WHICH relative paths differ (#3003), which is the
 * evidence needed to attribute the next occurrence to a vanished source
 * entry or to an accumulation under dest.
 */
function reportCopyTreeFailure(src: string, dest: string, err: unknown, attempt: number): void {
  const e = err as NodeJS.ErrnoException | undefined;
  const srcExists = existsSync(src);
  const srcTopEntries = srcExists ? safeReaddir(src).length : -1;
  const srcFileCount = countFilesRecursive(src);
  const destParent = dirname(dest);
  const destParentExists = existsSync(destParent);
  process.stderr.write(
    [
      `[copyTreeWithRetry diagnostics] attempt ${attempt}/${COPY_TREE_RETRY_LIMIT}: copy ${src} -> ${dest} failed`,
      `  error.code: ${e?.code ?? "(undefined)"}`,
      `  error.syscall: ${e?.syscall ?? "(undefined)"}`,
      `  error.path: ${e?.path ?? "(undefined)"}`,
      `  error.message: ${e instanceof Error ? e.message : String(err)}`,
      `  src exists: ${srcExists}`,
      `  src top-level entries: ${srcTopEntries}`,
      `  src recursive file count (post-failure re-scan): ${srcFileCount}`,
      `  dest parent exists: ${destParentExists} (${destParent})`,
      ...describeTreeDifference(src, dest),
      `  TMPDIR: ${process.env.TMPDIR ?? "(unset)"}`,
      "",
    ].join("\n"),
  );
}

const COPY_TREE_DIFF_SAMPLE_LIMIT = 20;

/**
 * The relative paths present on only one side of src/dest, as two
 * diagnostic lines. Each line carries the full difference size and at most
 * COPY_TREE_DIFF_SAMPLE_LIMIT sample paths, so a large divergence stays
 * readable without hiding its magnitude.
 */
function describeTreeDifference(src: string, dest: string): string[] {
  const srcEntries = new Set(safeReaddirRecursive(src));
  const destEntries = new Set(safeReaddirRecursive(dest));
  const onlyInSrc = [...srcEntries].filter((path) => !destEntries.has(path)).sort();
  const onlyInDest = [...destEntries].filter((path) => !srcEntries.has(path)).sort();
  return [
    `  entries only in src (${onlyInSrc.length}): ${formatDiffSample(onlyInSrc)}`,
    `  entries only in dest (${onlyInDest.length}): ${formatDiffSample(onlyInDest)}`,
  ];
}

function formatDiffSample(paths: string[]): string {
  if (paths.length === 0) return "(none)";
  const shown = paths.slice(0, COPY_TREE_DIFF_SAMPLE_LIMIT).join(", ");
  return paths.length > COPY_TREE_DIFF_SAMPLE_LIMIT
    ? `${shown}, ... (${paths.length - COPY_TREE_DIFF_SAMPLE_LIMIT} more)`
    : shown;
}

/**
 * Every relative path under `path` (directories included — a directory that
 * exists on only one side is itself evidence), or an empty list when `path`
 * is absent, unreadable, or not a directory. Unlike countFilesRecursive this
 * takes no per-entry stat: the diagnostics only need the names, and a stat
 * per entry would add a second racing walk to a path that is already failing.
 */
function safeReaddirRecursive(path: string): string[] {
  try {
    return readdirSync(path, { recursive: true }) as string[];
  } catch {
    return [];
  }
}

function safeReaddir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function countFilesRecursive(path: string): number {
  if (!existsSync(path)) return -1;
  let count = 0;
  for (const entry of readdirSync(path, { recursive: true }) as string[]) {
    try {
      if (statSync(join(path, entry)).isFile()) count++;
    } catch {
      // Entry vanished between listing and stat (parallel-load race) — do
      // not count it; countFilesRecursive is a post-condition check, and an
      // undercount here correctly fails that check rather than masking it.
    }
  }
  return count;
}

/** Options for setupIntegrationProject — the flags from setup_integration_project. */
export interface IntegrationProjectOptions {
  /** Seed amadeus-state.md from this fixture (path or FIXTURES_DIR-relative name). */
  withState?: string;
  /** Seed audit.md from audit-sample.md. */
  withAudit?: boolean;
  /** Remove the scaffolded intent record + cursor (test the no-workspace path). */
  noAidlcDocs?: boolean;
  /** Strip AMADEUS_DEFAULT_SCOPE from the copied settings.json so shell env wins. */
  stripEnvScope?: boolean;
  /** Drop in the greenfield-todo stub project. */
  withGreenfieldStub?: boolean;
  /** Drop in the brownfield-todo stub project. */
  withBrownfieldStub?: boolean;
  /** Copy reverse-engineering artifacts into inception/reverse-engineering/. */
  withReArtifacts?: boolean;
  /** Copy the requirements/design/units inception artifact set. */
  withInceptionArtifacts?: boolean;
  /** Copy the construction functional-design artifact. */
  withConstructionArtifacts?: boolean;
  /**
   * Seed the Harness-Engineer custom harness (custom scope + two chained stages
   * + sensor + project rule) into the copied .claude/ and recompile the stage
   * graph. The Phase-5 two-driver prerequisite — see
   * tests/harness/custom-harness.ts.
   */
  customHarness?: boolean;
}

/**
 * Scaffold a full integration project: a temp dir with the shipped
 * dist/claude/.claude/ copied into <proj>/.claude, plus any requested
 * fixtures. Mirrors setup_integration_project (fixtures.sh:133-181).
 *
 * Hooks/tools are .ts run via bun and need no executable bit (the shell
 * version's chmod +x on *.sh is a no-op now that hooks are TypeScript — see
 * the shipped CLAUDE.md "All 9 hooks are TypeScript ... No executable bits
 * required"), so this port skips the chmod.
 *
 * Returns the (portable) project path.
 */
export function setupIntegrationProject(
  opts: IntegrationProjectOptions = {},
): string {
  const proj = createTestProject();
  copyTreeWithRetry(AMADEUS_SRC, join(proj, ".claude"));
  // #3388: the onboarding doc ships as the real project-root CLAUDE.md.
  const claudeMd = join(proj, "CLAUDE.md");
  if (!existsSync(claudeMd) && existsSync(CLAUDE_ONBOARDING_DOC)) cpSync(CLAUDE_ONBOARDING_DOC, claudeMd);
  const settingsExample = join(proj, ".claude", "settings.json.example");
  const settings = join(proj, ".claude", "settings.json");
  if (!existsSync(settings) && existsSync(settingsExample)) {
    cpSync(settingsExample, settings);
  }
  // Copy the relocated method tree (amadeus/spaces/default/memory/) to the project
  // root beside .claude/ — the resolver reads the rule layers from there now
  // (P5 relocation). Absent in a tree built before P5, so guard it.
  //
  // This one stays a bare cpSync by attribution: unlike the tui fixture, this
  // project already carries a seeded <proj>/amadeus (seedWorkspaceShell runs in
  // createTestProject above), so copyTreeWithRetry's dest-fresh contract does
  // not hold — its per-attempt `remove(dest)` would delete the seeded record,
  // cursors and clone-id. cpSync's merge semantics are the intended behaviour
  // here, so the guard is deliberately not applied (#3014 follow-up: the merge
  // case needs its own verified helper before this site can be guarded).
  if (existsSync(AMADEUS_MEMORY_SRC)) {
    cpSync(AMADEUS_MEMORY_SRC, join(proj, "amadeus"), { recursive: true });
  }

  if (opts.withState) seedStateFile(proj, opts.withState);
  if (opts.withAudit) seedAuditFile(proj);

  if (opts.noAidlcDocs) {
    removeWorkspaceRecord(proj);
  }

  if (opts.stripEnvScope) {
    if (existsSync(settings)) {
      // Drop the line carrying "AMADEUS_DEFAULT_SCOPE": ... — mirrors the
      // sed_i '/"AMADEUS_DEFAULT_SCOPE":/d' delete in --strip-env-scope.
      const kept = readFileSync(settings, "utf8")
        .split("\n")
        .filter((l) => !l.includes('"AMADEUS_DEFAULT_SCOPE":'))
        .join("\n");
      writeFileSync(settings, kept);
    }
  }

  if (opts.withGreenfieldStub) {
    cpSync(join(FIXTURES_DIR, "greenfield-todo"), proj, { recursive: true });
  }
  if (opts.withBrownfieldStub) {
    cpSync(join(FIXTURES_DIR, "brownfield-todo"), proj, { recursive: true });
  }

  if (opts.withReArtifacts) {
    const dest = join(seededRecordDir(proj), "inception", "reverse-engineering");
    mkdirSync(dest, { recursive: true });
    cpSync(join(FIXTURES_DIR, "re-artifacts"), dest, { recursive: true });
  }

  if (opts.withInceptionArtifacts) {
    const ra = join(seededRecordDir(proj), "inception", "requirements-analysis");
    const ad = join(seededRecordDir(proj), "inception", "application-design");
    const ug = join(seededRecordDir(proj), "inception", "units-generation");
    mkdirSync(ra, { recursive: true });
    mkdirSync(ad, { recursive: true });
    mkdirSync(ug, { recursive: true });
    const ia = join(FIXTURES_DIR, "inception-artifacts");
    copyFileSync(join(ia, "requirements.md"), join(ra, "requirements.md"));
    for (const f of [
      "components.md",
      "component-methods.md",
      "services.md",
      "component-dependency.md",
    ]) {
      copyFileSync(join(ia, f), join(ad, f));
    }
    for (const f of ["unit-of-work.md", "unit-of-work-story-map.md"]) {
      copyFileSync(join(ia, f), join(ug, f));
    }
  }

  if (opts.withConstructionArtifacts) {
    const dest = join(
      seededRecordDir(proj),
      "construction",
      "todo-core",
      "functional-design",
    );
    mkdirSync(dest, { recursive: true });
    copyFileSync(
      join(FIXTURES_DIR, "construction-artifacts", "functional-design.md"),
      join(dest, "functional-design.md"),
    );
  }

  // customHarness is seeded LAST so it edits + recompiles against the final
  // .claude/ (after every other stub has landed). Mutates scope metadata,
  // stage-graph.json, the stages tree, sensors/, and rules/, then recompiles.
  if (opts.customHarness) seedCustomHarness(proj);

  return proj;
}

// ============================================================================
// Workspace-journey fixture (P10 / Stage E) — the net-new harness piece.
//
// The live multi-repo·intent·space journey needs a workspace whose shape the
// per-intent fixtures above never model: TWO sibling code repos under one
// workspace root, the shipped harness shell, and NO pre-born intent (the
// journey's step 1 auto-births it live). setupWorkspaceJourney() builds that.
//
// Why a fresh tmpdir root (not createTestProject's reuse): the journey's
// construction beat forks git worktrees INSIDE the sibling repos, and
// resolveWorktreeAnchor (amadeus-worktree.ts) is a STRUCTURAL git check
// (`git rev-parse --show-toplevel` vs `dirname(--git-common-dir)`) keyed on the
// target repo's cwd. Scaffolding under .claude/worktrees/ would leave the
// spawned tool inside this very worktree's git tree; an os.tmpdir() root with
// its own git-init'd sibling repos makes toplevel == dirname(common-dir) hold
// for each repo, so the guard passes (the same posture setupCodexProject takes).
//
// Harness-parameterized so all three logic drivers (Claude SDK · Kiro ACP ·
// Codex exec) reuse ONE fixture: each copies the shipped dist/<harness>/ shell
// (engine dir + the sibling amadeus/ memory shell) into the root, exactly as
// setupIntegrationProject / setupTuiProject / setupCodexProject do.
// ============================================================================

/** Per-harness dist source paths for the journey shell. Reuses the same dist
 *  trees the other fixtures copy (AMADEUS_SRC / KIRO_SRC / the codex shell). */
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const KIRO_DIST = join(REPO_ROOT, "dist", "kiro");
const CODEX_DIST = join(REPO_ROOT, "dist", "codex");

export type JourneyHarness = "claude" | "kiro" | "codex";

export interface WorkspaceJourney {
  /** The tmp workspace root (canonical realpath) — the project dir every driver
   *  points the engine at (--project-dir / spawn cwd). The amadeus/ roof + the
   *  harness engine dir live directly under here; the sibling repos are children. */
  root: string;
  /** Sibling repo dirs (immediate children of root), git-init'd with one commit
   *  so discoverSiblingRepos(root) returns ["repo-a","repo-b"]. */
  repoA: string;
  repoB: string;
  /** An isolated $HOME the codex harness needs for its CODEX_HOME/config.toml.
   *  Allocated for every harness so callers can rely on it; only codex uses it. */
  home: string;
  /** The harness this shell was seeded for. */
  harness: JourneyHarness;
}

function gitInit(dir: string, seedFile: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, seedFile), "seed\n", "utf-8");
  for (const args of [
    ["init", "-q"],
    ["symbolic-ref", "HEAD", "refs/heads/main"],
    ["add", "-A"],
    ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init"],
  ]) {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf-8" });
    if (r.status !== 0) {
      throw new Error(`git ${args.join(" ")} in ${dir} failed: ${r.stderr?.trim() || r.stdout?.trim()}`);
    }
  }
}

/**
 * Scaffold a multi-repo workspace journey root and return its paths. Copies the
 * shipped dist/<harness>/ shell (engine dir + the sibling amadeus/ memory shell)
 * into a fresh os.tmpdir() root, then git-init's two sibling repos (repo-a,
 * repo-b) as immediate children so discoverSiblingRepos finds them sorted. Does
 * NOT auto-birth an intent — the journey's step 1 does that live; the shell ships
 * the default space's memory only.
 *
 * Each repo gets a tiny brownfield-ish source file + an initial commit so a
 * reverse-engineering stage has something to scan and write per-repo codekb for
 * (the journey's step-2 cheaper variant), and so the construction-worktree guard
 * sees a real checkout.
 */
export function setupWorkspaceJourney(harness: JourneyHarness = "claude"): WorkspaceJourney {
  const root = realpathSync(mkdtempSync(join(process.env.TMPDIR || tmpdir(), "amadeus-journey-")));
  const home = join(root, ".home");
  mkdirSync(home, { recursive: true });

  // 1. Copy the shipped harness shell: the engine dir + the sibling amadeus/ memory
  //    shell (all three dist trees ship dist/<h>/amadeus/{active-space,spaces/default}).
  if (harness === "kiro") {
    cpSync(join(KIRO_DIST, ".kiro"), join(root, ".kiro"), { recursive: true });
    cpSync(join(KIRO_DIST, "AGENTS.md"), join(root, "AGENTS.md"));
    cpSync(join(KIRO_DIST, "amadeus"), join(root, "amadeus"), { recursive: true });
  } else if (harness === "codex") {
    cpSync(join(CODEX_DIST, ".codex"), join(root, ".codex"), { recursive: true });
    cpSync(join(root, ".codex", "config.toml.example"), join(root, ".codex", "config.toml"));
    cpSync(join(root, ".codex", "hooks.json.example"), join(root, ".codex", "hooks.json"));
    cpSync(join(CODEX_DIST, ".agents"), join(root, ".agents"), { recursive: true });
    cpSync(join(CODEX_DIST, "AGENTS.md"), join(root, "AGENTS.md"));
    cpSync(join(CODEX_DIST, "amadeus"), join(root, "amadeus"), { recursive: true });
  } else {
    cpSync(join(CLAUDE_DIST, ".claude"), join(root, ".claude"), { recursive: true });
    // #3388: the onboarding doc ships as the real project-root CLAUDE.md.
    const claudeMd = join(root, "CLAUDE.md");
    if (!existsSync(claudeMd) && existsSync(CLAUDE_ONBOARDING_DOC)) cpSync(CLAUDE_ONBOARDING_DOC, claudeMd);
    const settingsExample = join(root, ".claude", "settings.json.example");
    const settings = join(root, ".claude", "settings.json");
    if (!existsSync(settings) && existsSync(settingsExample)) cpSync(settingsExample, settings);
    cpSync(join(CLAUDE_DIST, "amadeus"), join(root, "amadeus"), { recursive: true });
  }

  // Pin the per-clone audit-shard token (gitignored on a real project) so any
  // shard a spawned tool writes is deterministic — same posture as the per-intent
  // fixtures (FIXTURE_CLONE_ID / seededAuditShard).
  writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), `${FIXTURE_CLONE_ID}\n`, "utf-8");

  // 2. Two git-init'd sibling repos as immediate children of the root, each with a
  //    tiny source file so a reverse-engineering scan has real content and the
  //    construction guard sees a checkout. discoverSiblingRepos sorts + dedups, so
  //    the names come back ["repo-a","repo-b"] regardless of creation order.
  const repoA = join(root, "repo-a");
  const repoB = join(root, "repo-b");
  gitInit(repoA, "main.py");
  gitInit(repoB, "main.py");

  return { root, repoA, repoB, home, harness };
}

/** Remove a workspace-journey root. Mirrors the codex test's rmSync(root) and
 *  cleanupTuiProject's AMADEUS_KEEP_TEMP escape hatch (a timed-out live journey
 *  otherwise leaves nothing under a random mkdtemp name to inspect). */
export function cleanupWorkspaceJourney(journey: WorkspaceJourney | undefined): void {
  if (!journey?.root) return;
  if (process.env.AMADEUS_KEEP_TEMP === "1") {
    process.stderr.write(`[fixtures] AMADEUS_KEEP_TEMP=1 — preserved ${journey.root}\n`);
    return;
  }
  if (existsSync(journey.root)) removeTreeWithRetry(journey.root);
}

/**
 * The shape a test assertion wants from an audit shard, regardless of which
 * journal schema the emitter used.
 */
export interface NormalizedAuditRecord {
  /** The v1 audit event type. Null for a record that carries none. */
  event: string | null;
  timestamp?: string;
  /** The payload under its historical field names. */
  fields: Record<string, string>;
}

/**
 * Parse concatenated JSONL shard bytes into records, normalizing BOTH journal
 * schemas onto the v1 field names.
 *
 * A migrated call site writes schema v2: the legacy audit event type rides as
 * the `Event` ATTRIBUTE and the payload lives under `attributes` rather than
 * `fields`. Production readers (auditBlockField) already serve both shapes
 * under the historical names, so a test that hand-parses `{ event, fields }`
 * silently stops seeing rows the moment its emitter migrates — it reads zero
 * events and asserts happily against an empty set.
 *
 * `Event` is dropped from the normalized payload: in v1 it was an envelope key,
 * not a field, so leaving it in would add one to every field count a test pins.
 */
export function parseAuditRecords(shardText: string): NormalizedAuditRecord[] {
  return shardText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .map((raw) => {
      if (raw.schemaVersion !== 2) {
        return {
          event: (raw.event as string | null) ?? null,
          timestamp: raw.timestamp as string | undefined,
          fields: (raw.fields ?? {}) as Record<string, string>,
        };
      }
      const { Event, ...fields } = (raw.attributes ?? {}) as Record<string, string>;
      return {
        event: Event ?? null,
        timestamp: raw.timestamp as string | undefined,
        fields,
      };
    });
}
