// Swarm convergence referee — the deterministic verdict surface the conductor consults.
//
// The swarm fires only under human-granted Construction autonomy, inside a live
// Claude Code session. That session — the conductor — owns the fan-out (N parallel
// Task calls, or an inline Dynamic Workflow when AMADEUS_USE_SWARM=claude-ultra) and the retry
// loop. A bun subprocess cannot issue Task calls, so the worker-dispatch layer is
// NOT here. What lives here is everything that must be deterministic: the
// convergence verdict, the anti-tamper guard, the serialised merge-back, the audit
// taxonomy, and the typed failure envelope.
//
// THE SPLIT (three concerns): the conductor owns fan-out + loop drive (knowledge);
// this tool owns the convergence verdict + merge + audit (determinism); the human
// grants autonomy and takes the baton on the envelope (judgement).
//
// The verdict commands remain stateless. Fixed-pool commands delegate every
// queue/slot mutation to the audit-folded C2 single writer; harnesses report
// native facts and never own scheduling counters.
//   prepare  --batch <n> --units <a,b,c> [--base <branch>] [--concurrency <n>]
//            [--degraded-from <subagent|claude-ultra|codex-ultra>] [--repo <name>]
//       Fork an isolated git worktree per unit (amadeus-worktree create +
//       amadeus-bolt start --worktree) and emit SWARM_STARTED once for the batch.
//       --repo (P7) selects the sibling repo the batch's worktrees fork inside (a
//       multi-repo intent requires it; single-repo infers the lone repo); the
//       resolved name is forwarded to every amadeus-worktree create + bolt start.
//       The anti-tamper baseline is the prepared fork: `create` records the base
//       branch AND the fork SHA on WORKTREE_CREATED, and check/finalize parse that
//       binding back (parsePreparedForkBinding) instead of trusting a caller flag —
//       a worker commit cannot move the baseline by moving HEAD.
//       Runs before any worker, so it cannot fold into check.
//       --degraded-from records a loud downgrade (an ultra native to another
//       harness was requested, or a runtime degrade such as claude-ultra with
//       the Workflow tool unavailable — the conductor ran the subagent floor):
//       emits SWARM_DEGRADED. The driver-SELECTION read (AMADEUS_USE_SWARM) is
//       conductor-side — this tool only learns a degrade happened via the flag.
//   check <unit> --check-cmd <cmd> [--test-file <path>]
//       Stateless single-unit verdict: the project's check command (exit 0 = green,
//       the AUTHORITATIVE signal — a worker's own success claim is never trusted)
//       plus an anti-tamper compare of the protected file against its forked-git
//       baseline. Prints {unit, converged, tampered, reason}; exits 0 iff the unit
//       is GENUINELY converged (green AND untampered), non-zero otherwise. Emits
//       no audit — it informs the conductor's retry decision (knowledge), it does
//       not commit anything. Same input → same verdict, however many times called.
//   retry <unit> --retry-class <class> --effect-status <status>
//          --cause-code <code> --source-surface <surface> --delivery-id <id>
//       Exact-allowlist recovery gate. Atomically reserves one extra retry from
//       the canonical recoverable-retry budget (default 2, hard cap 3). A failed
//       check alone is never authority to re-spawn a worker.
//   finalize --batch <n> --units <a,b,c> --claimed <a,b> --check-cmd <cmd>
//            [--test-file <path>] [--reasons <unit>=<reason>,...]
//            [--target <branch>] [--strategy <squash|merge|rebase>] [--repo <name>]
//       The AUTHORITATIVE gate. The conductor's claimed-converged set is an
//       explicit input and the only thing finalize trusts from it. For each
//       claimed unit, RE-RUN the check (green + untampered) before any merge: a
//       unit named in --claimed but red on disk is refused the merge and lands in
//       the failure envelope (the lying-conductor guard). Serialised HOLD-MERGE
//       merge-back of the genuine passes only, then emit the full SWARM_* audit
//       trail + the typed envelope + exit 0/2. --reasons carries the conductor's
//       typed attribution for a DECLINED (unclaimed) unit — unsatisfiable /
//       budget-exhausted / cap-exhausted — recorded faithfully (the conductor
//       judges WHY a unit gave up; the tool only records it, never for a claimed
//       unit, whose reason is always the tool's own re-verify verdict).
//
// Retry judgement and retry authority remain distinct: the conductor supplies
// observed native facts, while the exact allowlist and durable C2 budget decide
// whether another dispatch is permitted. `check` remains advisory and `finalize`
// remains authoritative, so a red unit cannot merge even if the conductor lies.
//
// COMPOSES existing tools, does NOT reimplement them:
//   - amadeus-worktree create        -> the isolated git worktree per unit
//   - amadeus-bolt start --worktree  -> state/audit/runtime-graph fork into it
//   - amadeus-bolt complete --merge  -> the AIDLC-data merge back to the base
//   - amadeus-bolt release-merge     -> release the existing per-Bolt HOLD-MERGE
//     lock before a serialised merge (idempotent — safe if never held). The merge
//     phase is serial (a one-at-a-time loop), so only one merge is ever in flight.
//   - amadeus-worktree merge         -> squash the converged Unit's committed source
//     into the prepared base (--target overrides) after its metadata merge
//     succeeds, then remove its worktree/branch
//   - amadeus-bolt fail              -> close a failed unit's Bolt lifecycle
//     (BOLT_FAILED paired with the BOLT_STARTED that `start --worktree` emitted).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { appendAuditEntryViaEvents } from "../otel/migration-adapter.ts";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import {
  auditBlockField,
  findAllEvents,
  getField,
  parseArgs,
  readAllAuditShards,
  readBoltDagGeneration,
  recordDir,
  resolveConstructionRepo,
  resolveProjectDir,
  splitAuditRecords,
  stateFilePath,
  worktreePath,
} from "./amadeus-lib.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import {
  classifyRetry,
  createBudgetPolicy,
  defaultBudgetPolicy,
  retryBackoffMs,
  type RetryFacts,
} from "./amadeus-convergence-policy.ts";
import { reserveStageBudget } from "./amadeus-convergence-runtime.ts";
import { resolveAmadeusConfig, type AmadeusConfigIssue } from "./amadeus-config.ts";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
  type UnitPoolMutationResult,
} from "./amadeus-unit-pool-runtime.ts";
import { UNIT_POOL_OUTCOMES, type UnitPoolOutcome } from "./amadeus-unit-pool.ts";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

// The typed reason enum the conductor branches on. budget-exhausted stays valid
// for an ultra driver's token ceiling; cap-exhausted is the loop-ended-
// without-convergence sense; error covers a tamper / lying-claim / plumbing fault.
type FailureReason = "unsatisfiable" | "budget-exhausted" | "cap-exhausted" | "error";

// The driver vocabulary: the native subagent floor, two ultra drivers, and the
// Pi RPC child driver. Pi has no native subagent tool, so its own driver is the
// default floor on that harness.
export type DriverName = "subagent" | "claude-ultra" | "codex-ultra" | "pi";
export const DRIVER_VALUES: readonly DriverName[] = ["subagent", "claude-ultra", "codex-ultra", "pi"];

// The raw AMADEUS_USE_SWARM values resolveDriver actually accepts as input.
// "subagent" is excluded: it is only ever a *resolved* outcome (the native
// floor), never a raw value a caller may set — resolveDriver rejects it like
// any other unrecognised token. Kept separate from DRIVER_VALUES (the full
// driver vocabulary, also used for --degraded-from) so the two lists don't
// silently drift back into each other.
export const RAW_DRIVER_VALUES: readonly DriverName[] = DRIVER_VALUES.filter((value) => value !== "subagent");

// The harnesses whose driver selection resolve arbitrates. Kept as a runtime
// array (not a bare type union) so the `--harness` CLI check is a real array
// membership test — a type-only union would erase at runtime and let an unknown
// harness through.
export type HarnessName = "claude" | "codex" | "kiro" | "kiro-ide" | "kimi" | "pi";
export const HARNESS_VALUES: readonly HarnessName[] = ["claude", "codex", "kiro", "kiro-ide", "kimi", "pi"];

// The static outcome of resolving AMADEUS_USE_SWARM against the running harness.
// A discriminated union so the invalid state is unrepresentable: `rejected` keeps
// only the raw string and carries NO driver field, so a caller cannot mistake a
// rejected value for a dispatchable driver (parse-don't-validate, fail-closed).
export type DriverResolution =
  | { kind: "selected"; driver: DriverName }
  | { kind: "degraded"; driver: "subagent" | "pi"; requested: DriverName }
  | { kind: "rejected"; raw: string; reason: "unknown-value" };

// Resolve the requested driver from the raw AMADEUS_USE_SWARM value against the
// running harness — the static env×harness decision (decision table in
// construction/driver-contract-core/functional-design/business-logic-model.md).
// raw is NOT trimmed: a whitespace-padded value is an unknown value (rejected),
// not a normalised match. Runtime tool availability is NOT an input here — the
// loud-degrade of a selected ultra driver when its harness tool is missing is the
// conductor's concern (it then calls prepare with --degraded-from).
export function resolveDriver(raw: string | undefined, harness: HarnessName): DriverResolution {
  if (raw === undefined) {
    return { kind: "selected", driver: harness === "pi" ? "pi" : "subagent" };
  }
  if (raw === "claude-ultra" || raw === "codex-ultra" || raw === "pi") {
    const nativeHarness: HarnessName = raw === "claude-ultra" ? "claude" : raw === "codex-ultra" ? "codex" : "pi";
    if (harness === nativeHarness) {
      return { kind: "selected", driver: raw };
    }
    // A recognised driver that is not native to this harness degrades to that
    // harness's safe floor, preserving the request for the audit trail.
    return { kind: "degraded", driver: harness === "pi" ? "pi" : "subagent", requested: raw };
  }
  // Everything else — the empty string, the old "1", any unknown token — is
  // rejected. Fail-closed: an unrecognised value never falls through to a floor.
  return { kind: "rejected", raw, reason: "unknown-value" };
}

// The typed reasons the conductor may attribute to a DECLINED unit (one it did
// not claim converged). Judging WHICH applies is the conductor's knowledge call
// (D-I) — the tool only records it, exactly as it records --claimed and
// --degraded-from. `error` is excluded: it is the tool's OWN verdict for a
// claimed-but-red / tampered unit, never a conductor-supplied attribution.
const DECLINED_REASONS: FailureReason[] = ["unsatisfiable", "budget-exhausted", "cap-exhausted"];

interface UnitResult {
  unit: string;
  status: "converged" | "failed";
  reason?: FailureReason;
  detail?: string;
  tampered?: boolean;
}

interface FinalizeEnvelope {
  batch: string;
  units: UnitResult[];
  converged: number;
  failed: number;
  merge_failures: { unit: string; detail: string }[];
}

// --- Sibling-tool composition (synchronous; these calls are quick) ----------

interface ToolRun {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runTool(toolFile: string, args: string[], projectDir: string): ToolRun {
  const result = observeSubprocessSpan(projectDir, `${toolFile.replace(/\.ts$/, "")}:${args[0] ?? "?"}`, () =>
    spawnSync(
      "bun",
      [join(TOOLS_DIR, toolFile), "--project-dir", projectDir, ...args],
      { encoding: "utf-8", cwd: projectDir, timeout: 60_000 }
    ),
  );
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

type ToolRunner = typeof runTool;

function toolFailureDetail(result: ToolRun): string {
  return result.stderr.trim() || result.stdout.trim() || "unknown failure";
}

function mergeGenuineUnits(
  projectDir: string,
  batch: string,
  genuine: readonly string[],
  repoArgs: readonly string[],
  toolRunner: ToolRunner,
  targetFor: (unit: string) => string,
  strategy: string,
): { unit: string; detail: string }[] {
  const failures: { unit: string; detail: string }[] = [];
  let sourceBlocker: string | undefined;
  for (const unit of [...genuine].sort()) {
    if (sourceBlocker !== undefined) {
      failures.push({
        unit,
        detail: `source merge skipped after source merge failure for unit "${sourceBlocker}"`,
      });
      continue;
    }

    const released = toolRunner(
      "amadeus-bolt.ts",
      ["release-merge", "--slug", unit, ...repoArgs],
      projectDir,
    );
    if (!released.ok) {
      failures.push({ unit, detail: `release-merge failed: ${toolFailureDetail(released)}` });
      continue;
    }

    const metadata = toolRunner(
      "amadeus-bolt.ts",
      [
        "complete",
        "--merge",
        "--slug",
        unit,
        "--batch",
        batch,
        "--name",
        unit,
        ...repoArgs,
      ],
      projectDir,
    );
    if (!metadata.ok) {
      failures.push({ unit, detail: `metadata merge failed: ${toolFailureDetail(metadata)}` });
      continue;
    }

    const source = toolRunner(
      "amadeus-worktree.ts",
      [
        "merge",
        "--slug",
        unit,
        "--target",
        targetFor(unit),
        "--strategy",
        strategy,
        ...repoArgs,
      ],
      projectDir,
    );
    if (!source.ok) {
      failures.push({ unit, detail: `source merge failed: ${toolFailureDetail(source)}` });
      sourceBlocker = unit;
    }
  }
  return failures;
}

// --- The deterministic verdict primitives -----------------------------------

// Tool-owned convergence signal. Running the project's check command in the
// worktree (exit 0 = green) is the AUTHORITATIVE green check — a worker's own
// claim of success is never trusted (it could fake a pass).
//
// Run via a shell rather than a hardcoded `bash` argv, because `bash` is ENOENT
// on native Windows PowerShell — the old form launched bash with a -c argument
// and made every convergence check spuriously fail there. We pick the shell so the
// command runs on every platform AND keeps its original interpreter on POSIX:
//   - win32: shell:true → cmd.exe (bash is unavailable; there is no other
//     choice, and a Construction check command on Windows is written for it).
//   - POSIX with /bin/bash present: shell:"/bin/bash" → preserves the exact
//     bash interpreter the old code used, so a bash-only check command
//     (`[[ ]]`, process substitution, arrays) keeps working. Bare shell:true
//     would route through /bin/sh, which on dash-default distros (Debian/Ubuntu)
//     would regress those bashisms — so we keep bash where it exists.
//   - POSIX without /bin/bash: shell:true → /bin/sh (best available).
// Exit-code semantics (0 = converged) and the 60s timeout are unchanged across
// all three.
//
// checkCmd is shell-interpreted, so shell metacharacters in it are honoured —
// that is acceptable here: the swarm only fires under human-granted
// Construction autonomy inside a live session, and checkCmd is the user's own
// project check command (a trusted input), not attacker-controlled. (It was
// already shell-interpreted under the old `bash -c` form — no new surface.)
function checkConverged(projectDir: string, cwd: string, checkCmd: string): boolean {
  const shell =
    process.platform !== "win32" && existsSync("/bin/bash")
      ? "/bin/bash"
      : true;
  const result = observeSubprocessSpan(projectDir, "unit-check-cmd", () =>
    spawnSync(checkCmd, {
      cwd,
      encoding: "utf-8",
      timeout: 60_000,
      shell,
    }),
  );
  return result.status === 0;
}

export type FileTamperResult =
  | { status: "clean" }
  | { status: "tampered" }
  | { status: "error"; detail: string };

export function fileTamperResultForStatuses(
  baselineStatus: number | null,
  diffStatus: number | null,
  relPath: string,
): FileTamperResult {
  if (baselineStatus !== 0) {
    return {
      status: "error",
      detail: `protected test file is not tracked at the prepared fork: ${relPath}`,
    };
  }
  if (diffStatus === 0) return { status: "clean" };
  if (diffStatus === 1) return { status: "tampered" };
  return {
    status: "error",
    detail: `could not compare protected test file against the prepared fork (git diff exit ${diffStatus}): ${relPath}`,
  };
}

function fileTampered(
  projectDir: string,
  cwd: string,
  relPath: string,
  forkSha: string,
): FileTamperResult {
  const headPath = relPath.split(sep).join("/");
  const baseline = observeSubprocessSpan(projectDir, "git", () =>
    spawnSync("git", ["cat-file", "-e", `${forkSha}:${headPath}`], {
      cwd,
      encoding: "utf-8",
      timeout: 60_000,
    }),
  );
  if (baseline.status !== 0) {
    return fileTamperResultForStatuses(baseline.status, null, relPath);
  }
  const diff = observeSubprocessSpan(projectDir, "git", () =>
    spawnSync("git", ["diff", "--quiet", forkSha, "--", relPath], {
      cwd,
      encoding: "utf-8",
      timeout: 60_000,
    }),
  );
  return fileTamperResultForStatuses(baseline.status, diff.status, relPath);
}

export interface Verdict {
  exists: boolean;
  converged: boolean;
  tampered: boolean;
  confineError?: string;
}

export type VerdictBinding =
  | {
      readonly testFile?: undefined;
      readonly forkSha?: undefined;
      readonly expectedHead?: string;
    }
  | {
      readonly testFile: string;
      readonly forkSha: string;
      readonly expectedHead?: string;
    };

function worktreeHead(projectDir: string, cwd: string): string | null {
  const result = observeSubprocessSpan(projectDir, "git", () =>
    spawnSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf-8",
      timeout: 60_000,
    }),
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

// The fork contract `prepare` captured for one unit: the base branch the
// worktree forked from and the SHA it forked at. Both come from the unit's
// WORKTREE_CREATED audit block (Base branch / Base SHA), never from conductor
// flags — a tamper baseline the caller supplies is no baseline at all.
export interface PreparedForkBinding {
  readonly base: string;
  // null for a legacy WORKTREE_CREATED row that predates Base SHA capture:
  // the recorded base still names the delivery target, but no anti-tamper
  // baseline exists, so --test-file callers fail closed on it.
  readonly forkSha: string | null;
}

// Parse the newest WORKTREE_CREATED block for `unit` out of the intent's audit
// shards. Returns null when the unit was never prepared (no block, or a block
// with no Base branch) — the caller fails closed. A row that predates Base SHA
// capture keeps its base and carries forkSha: null.
export function parsePreparedForkBinding(
  pd: string,
  unit: string,
  intent?: string,
  space?: string,
): PreparedForkBinding | null {
  const audit = readAllAuditShards(pd, intent, space);
  if (audit.length === 0) return null;
  const matches = findAllEvents(audit, "WORKTREE_CREATED", unit);
  const newest = matches[matches.length - 1];
  if (!newest) return null;
  const base = auditBlockField(newest.block, "Base branch");
  if (!base) return null;
  const forkSha = auditBlockField(newest.block, "Base SHA");
  return { base, forkSha: forkSha || null };
}

// Compute a unit's verdict from its prepared fork and the worker commit that the
// conductor verified. The check command must not move HEAD: a check that changes
// the source under inspection cannot authorize that source for delivery.
export function verdictFor(
  unit: string,
  projectDir: string,
  checkCmd: string,
  binding: VerdictBinding = {},
): Verdict {
  const wt = worktreePath(projectDir, unit);
  if (!existsSync(wt)) {
    return { exists: false, converged: false, tampered: false };
  }
  const requiresHeadBinding = binding.expectedHead !== undefined || binding.testFile !== undefined;
  const beforeHead = requiresHeadBinding ? worktreeHead(projectDir, wt) : null;
  const converged = checkConverged(projectDir, wt, checkCmd);
  const afterHead = requiresHeadBinding ? worktreeHead(projectDir, wt) : null;
  let tampered = false;
  let confineError: string | undefined;
  if (requiresHeadBinding && (beforeHead === null || afterHead === null)) {
    confineError = "could not resolve the worker HEAD before and after the convergence check";
  } else if (requiresHeadBinding && beforeHead !== afterHead) {
    confineError = `worker HEAD changed during the convergence check: ${beforeHead} -> ${afterHead}`;
  } else if (binding.expectedHead !== undefined && beforeHead !== binding.expectedHead) {
    confineError = `worker HEAD does not match the verified source binding: expected ${binding.expectedHead}, got ${beforeHead}`;
  }
  if (binding.testFile) {
    // Confine the path inside the unit's worktree — a `../` escape would point
    // the guard at a file the worker never touched and silently DISABLE it, so
    // reject it as a configuration error rather than ship a false "untampered".
    const candidate = resolve(wt, binding.testFile);
    const root = resolve(wt) + sep;
    if (!candidate.startsWith(root)) {
      confineError = `--test-file resolves outside the unit worktree: ${binding.testFile}`;
    } else {
      const tamperResult = fileTampered(
        projectDir,
        wt,
        relative(wt, candidate),
        binding.forkSha,
      );
      if (tamperResult.status === "error") confineError = tamperResult.detail;
      else tampered = tamperResult.status === "tampered";
    }
  }
  return { exists: true, converged, tampered, ...(confineError ? { confineError } : {}) };
}

// --- Audit emission (this tool owns the whole swarm taxonomy) ---------------
//
// Every row travels the canonical Event path through ONE seam: the bootstrap
// is idempotent but it still has to run before the first emit (emitEvent
// throws with no Logger Provider registered), and pinning that ordering in a
// single place is what keeps the six emitters below unable to get it wrong.
// Exported so the migration is drivable in-process — bun's coverage does not
// instrument a spawned CLI.
//
// The engine is read-only and the conductor (prose) never emits audit events, so
// the deterministic tool is the sole emitter. SWARM_STARTED fires once per batch
// in `prepare`; SWARM_DEGRADED fires there too when the conductor reports a loud
// downgrade. The per-unit pair, the per-failed-unit baton row, and the batch
// tally all fire from `finalize`, the authoritative gate.

export function emitSwarmAudit(
  eventType: string,
  fields: Record<string, string>,
  pd: string
): void {
  ensureOtelBootstrap(pd);
  appendAuditEntryViaEvents(eventType, fields, pd);
}

// Stamp the plan generation the fan-out is running under (#1953 / FR-5a). The
// audit trail is append-only, so a batch number alone cannot tell approve-time
// reconciliation whether a row belongs to the CURRENT plan or to a plan that was
// replaced by a replan. A workflow with no compiled DAG has no generation to
// bind to; the row then carries none and the verifier fails closed on it.
function withPlanGeneration(
  pd: string,
  fields: Record<string, string>,
): Record<string, string> {
  const generation = readBoltDagGeneration(pd);
  return generation === null ? fields : { ...fields, "Plan generation": generation };
}

export function emitSwarmStarted(
  pd: string,
  batch: string,
  units: string[],
  concurrency: string
): void {
  emitSwarmAudit(
    "SWARM_STARTED",
    withPlanGeneration(pd, {
      "Batch number": batch,
      "Unit names": units.join(","),
      "Concurrency cap": concurrency,
    }),
    pd
  );
}

// Loud-degrade: an ultra native to another harness was requested (or the Workflow
// tool was unavailable for claude-ultra), so the conductor ran the subagent floor. The referee makes the
// substrate difference invisible to convergence, but the downgrade is recorded.
export function emitSwarmDegraded(pd: string, batch: string, requested: DriverName): void {
  emitSwarmAudit(
    "SWARM_DEGRADED",
    withPlanGeneration(pd, {
      "Batch number": batch,
      "Requested driver": requested,
      "Fallback driver": "subagent",
    }),
    pd
  );
}

export function emitUnitConverged(pd: string, batch: string, unit: string): void {
  emitSwarmAudit(
    "SWARM_UNIT_CONVERGED",
    withPlanGeneration(pd, { "Batch number": batch, "Unit name": unit }),
    pd
  );
}

export function emitUnitFailed(
  pd: string,
  batch: string,
  unit: string,
  reason: FailureReason
): void {
  emitSwarmAudit(
    "SWARM_UNIT_FAILED",
    { "Batch number": batch, "Unit name": unit, Reason: reason },
    pd
  );
}

function emitBatonReturned(
  pd: string,
  batch: string,
  unit: string,
  attempt: string,
  stage: string,
  reason: FailureReason
): void {
  emitSwarmAudit(
    "SWARM_BATON_RETURNED",
    { "Batch number": batch, "Unit name": unit, "Attempt Id": attempt, Stage: stage, Reason: reason },
    pd
  );
}

function emitSwarmCompleted(
  pd: string,
  batch: string,
  convergedCount: number,
  failedCount: number
): void {
  emitSwarmAudit(
    "SWARM_COMPLETED",
    withPlanGeneration(pd, {
      "Batch number": batch,
      "Converged count": String(convergedCount),
      "Failed count": String(failedCount),
    }),
    pd
  );
}

// Close a failed unit's per-Bolt lifecycle by composing `amadeus-bolt fail` (emits
// BOLT_FAILED paired with the BOLT_STARTED that `start --worktree` emitted).
// Preserves the worktree per the halt-and-ask contract. The caller verifies the
// result so BOLT_FAILED cannot be skipped before the baton and batch close; an
// emission failure stops the remaining failure-transition audit sequence.
function emitBoltFailed(pd: string, batch: string, unit: string, attempt: string, stage: string, errorSummary: string): ToolRun {
  return runTool(
    "amadeus-bolt.ts",
    ["fail", "--name", unit, "--slug", unit, "--batch-id", batch, "--attempt", attempt, "--stage", stage, "--error", errorSummary],
    pd
  );
}

export function currentStageOrFail(pd: string): string {
  let content: string;
  try {
    content = readFileSync(stateFilePath(pd), "utf8");
  } catch {
    fail("finalize requires an active workflow state with Current Stage for failure correlation");
  }
  const stage = getField(content, "Current Stage")?.trim();
  if (!stage) fail("finalize requires an active workflow state with Current Stage for failure correlation");
  return stage;
}

// --- prepare ----------------------------------------------------------------

interface PreparedUnit {
  unit: string;
  ok: boolean;
  worktree_path?: string;
  error?: string;
}

function stopOnIncompletePrepare(
  batch: string,
  base: string,
  concurrency: number,
  prepared: readonly PreparedUnit[],
): void {
  if (prepared.every((entry) => entry.ok)) return;
  console.log(JSON.stringify({ batch, base, concurrency, units: prepared }, null, 2));
  process.exit(2);
}

function formatConfigIssues(issues: readonly AmadeusConfigIssue[]): string {
  return issues.map((issue) =>
    issue.kind === "read-failure"
      ? `${issue.layer} (${issue.path}): ${issue.summary}`
      : `${issue.layer} (${issue.path}): expected ${issue.expected}, got ${issue.actualType}`
  ).join(" | ");
}

function readDegradedFrom(flags: Record<string, string>): DriverName | undefined {
  const value = flags["degraded-from"] as DriverName | undefined;
  if (value !== undefined && !DRIVER_VALUES.includes(value)) {
    fail(`--degraded-from must be one of: ${DRIVER_VALUES.join(", ")}`);
  }
  return value;
}

function emitDegradeIfRequested(projectDir: string, batch: string, requested: DriverName | undefined): void {
  if (requested !== undefined) emitSwarmDegraded(projectDir, batch, requested);
}

function resolvePrepareConcurrency(
  projectDir: string,
  flags: Record<string, string>,
  unitCount: number,
): number {
  const resolvedConfig = resolveAmadeusConfig(projectDir, flags.intent, flags.space);
  if (resolvedConfig.kind === "invalid") {
    fail(`invalid swarm configuration: ${formatConfigIssues(resolvedConfig.issues)}`);
  }
  if (flags.concurrency !== undefined && !/^[1-9][0-9]*$/.test(flags.concurrency)) {
    fail("--concurrency must be a positive integer");
  }
  const configuredLimit = resolvedConfig.config.swarm.unit.concurrency.limit;
  const override =
    flags.concurrency === undefined
      ? configuredLimit
      : Number(flags.concurrency);
  if (override > configuredLimit) {
    fail(
      `--concurrency may only narrow swarm.unit.concurrency.limit (${configuredLimit})`,
    );
  }
  return Math.min(unitCount, configuredLimit, override);
}

function handlePrepare(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);

  if (!flags.batch || !/^[1-9][0-9]*$/.test(flags.batch)) {
    fail("prepare requires --batch <positive integer>");
  }
  if (!flags.units) {
    fail("prepare requires --units <comma-separated unit names>");
  }
  const units = splitCsv(flags.units);
  if (units.length === 0) {
    fail("--units resolved to an empty list");
  }
  const degradedFrom = readDegradedFrom(flags);

  // P7: the construction repo this batch targets. resolveConstructionRepo errors
  // on a multi-repo intent with no --repo (forwarded as the batch failure), infers
  // the lone repo for a single-repo intent, and yields cwd=projectDir for a legacy
  // intent (today's behaviour). The repoCwd is where `--base` is derived from and
  // is forwarded to every `amadeus-worktree create` so the worktree forks in-repo.
  let repoCwd: string;
  let repoName: string | null;
  try {
    const resolved = resolveConstructionRepo(projectDir, flags.repo, flags.intent, flags.space);
    repoCwd = resolved.cwd;
    repoName = resolved.repo;
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  const base = flags.base ?? currentBranch(repoCwd);
  const concurrency = resolvePrepareConcurrency(projectDir, flags, units.length);

  const prepared: PreparedUnit[] = [];
  // Forward the RESOLVED repo name (not the raw flag) so every sibling primitive
  // anchors to the same repo — an inferred lone repo is passed explicitly too, so
  // create/merge/discard never re-resolve to a different repo than prepare chose.
  const repoArgs = repoName ? ["--repo", repoName] : [];
  for (const unit of units) {
    const created = runTool(
      "amadeus-worktree.ts",
      ["create", "--slug", unit, "--base", base, ...repoArgs],
      projectDir
    );
    if (!created.ok) {
      prepared.push({
        unit,
        ok: false,
        error: `worktree create failed: ${created.stderr.trim() || created.stdout.trim()}`,
      });
      continue;
    }
    let worktreeDir: string;
    try {
      worktreeDir = JSON.parse(created.stdout).worktree_path;
    } catch {
      prepared.push({
        unit,
        ok: false,
        error: "could not parse worktree_path from amadeus-worktree create",
      });
      continue;
    }
    const started = runTool(
      "amadeus-bolt.ts",
      ["start", "--worktree", "--unit", "--slug", unit, "--batch", flags.batch, "--name", unit, ...repoArgs],
      projectDir
    );
    if (!started.ok) {
      prepared.push({
        unit,
        ok: false,
        worktree_path: worktreeDir,
        error: `bolt start failed: ${started.stderr.trim() || started.stdout.trim()}`,
      });
      continue;
    }
    prepared.push({ unit, ok: true, worktree_path: worktreeDir });
  }

  // A partially prepared batch has no dispatch authority. Persisting the pool
  // before every worktree exists would leave a non-terminal queue that finalize
  // cannot drain because the conductor never received a complete worker set.
  stopOnIncompletePrepare(flags.batch, base, concurrency, prepared);

  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  const initialized = pool.initialEnqueue({
    idempotencyKey: `unit-pool:${flags.batch}:initial-enqueue`,
    batchId: flags.batch,
    cap: concurrency,
    units: units.map((unitId) => ({ unitId, dependsOn: [] })),
  });
  if (!initialized.ok) fail(`unit pool initialization failed: ${initialized.reason}`);

  // Record a loud downgrade BEFORE the batch-start row, if the conductor reports
  // one. The driver-selection read (AMADEUS_USE_SWARM) is conductor-side; the tool
  // only learns a degrade happened via this flag.
  emitDegradeIfRequested(projectDir, flags.batch, degradedFrom);

  emitSwarmStarted(projectDir, flags.batch, units, String(concurrency));

  console.log(
    JSON.stringify(
      { batch: flags.batch, base, concurrency, units: prepared, pool: initialized.projection },
      null,
      2
    )
  );
}

// --- check ------------------------------------------------------------------

// Exit 0 ONLY for a genuine convergence (green AND untampered) — the seam an
// ultra driver and the conductor gate on (a worker's self-claim is never read).
// exit is injectable so the CLI wiring is drivable in-process by the tests
// (Bun coverage does not instrument spawned CLI processes).
export function handleCheck(
  rest: string[],
  exit: (code: number) => void = process.exit,
): void {
  const { positional, flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);

  const unit = positional[0] ?? flags.unit;
  if (!unit) {
    fail("check requires a unit name (positional `check <unit>` or --unit <unit>)");
  }
  if (!flags["check-cmd"]) {
    fail("check requires --check-cmd <shell command; exit 0 = converged>");
  }

  let binding: VerdictBinding = {};
  if (flags["test-file"]) {
    const preparedFork = parsePreparedForkBinding(
      projectDir,
      unit,
      flags.intent,
      flags.space,
    );
    if (!preparedFork || preparedFork.forkSha === null) {
      console.log(
        JSON.stringify({
          unit,
          converged: false,
          tampered: false,
          reason: "error",
          detail: `no prepared fork binding for unit "${unit}" (WORKTREE_CREATED with Base SHA absent) — run \`prepare\` first`,
        })
      );
      exit(1);
      return;
    }
    binding = { testFile: flags["test-file"], forkSha: preparedFork.forkSha };
  }

  const verdict = verdictFor(unit, projectDir, flags["check-cmd"], binding);
  if (!verdict.exists) {
    fail(`no worktree for unit "${unit}" — run \`prepare\` first`);
  }
  if (verdict.confineError) {
    console.log(
      JSON.stringify({
        unit,
        converged: false,
        tampered: false,
        reason: "error",
        detail: verdict.confineError,
      })
    );
    exit(1);
    return;
  }

  const genuine = verdict.converged && !verdict.tampered;
  const out: Record<string, unknown> = {
    unit,
    converged: verdict.converged,
    tampered: verdict.tampered,
    reason: verdict.tampered ? "error" : null,
  };
  if (verdict.tampered) out.detail = "protected test file was modified";
  console.log(JSON.stringify(out));
  exit(genuine ? 0 : 1);
}

// --- retry ------------------------------------------------------------------

const RETRY_CLASSES: readonly RetryFacts["retryClass"][] = [
  "recoverable-transient",
  "non-retryable",
  "unknown",
];
const RETRY_EFFECTS: readonly RetryFacts["effectStatus"][] = [
  "no-effect-confirmed",
  "effect-possible",
  "unknown",
];
const SWARM_RETRY_SURFACES: readonly RetryFacts["sourceSurface"][] = [
  "swarm-dispatch",
  "swarm-worker-start",
  "swarm-result-collection",
];

function includesValue<T extends string>(values: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (values as readonly string[]).includes(value);
}

/**
 * Authorize one extra native retry before a conductor re-dispatches work.
 * A red convergence check is not itself retry authority: callers must provide
 * one exact recoverable/no-effect fact tuple and a stable native delivery id.
 */
export function handleRetry(
  rest: string[],
  exit: (code: number) => void = process.exit,
): void {
  const { positional, flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const unit = positional[0] ?? flags.unit;
  if (!unit) fail("retry requires a unit name (positional `retry <unit>` or --unit <unit>)");
  if (!includesValue(RETRY_CLASSES, flags["retry-class"])) {
    fail(`--retry-class must be one of: ${RETRY_CLASSES.join(", ")}`);
  }
  if (!includesValue(RETRY_EFFECTS, flags["effect-status"])) {
    fail(`--effect-status must be one of: ${RETRY_EFFECTS.join(", ")}`);
  }
  if (!flags["cause-code"]) fail("retry requires --cause-code <code>");
  if (!includesValue(SWARM_RETRY_SURFACES, flags["source-surface"])) {
    fail(`--source-surface must be one of: ${SWARM_RETRY_SURFACES.join(", ")}`);
  }
  if (!flags["delivery-id"]) fail("retry requires --delivery-id <stable native failure id>");
  const allowlistVersion = Number.parseInt(flags["allowlist-version"] ?? "1", 10);
  const facts: RetryFacts = {
    retryClass: flags["retry-class"],
    effectStatus: flags["effect-status"],
    causeCode: flags["cause-code"],
    sourceSurface: flags["source-surface"],
  };
  const classification = classifyRetry(facts, allowlistVersion);
  if (classification.kind !== "retryable") {
    console.log(
      JSON.stringify({
        kind: "retry-refused",
        reasonCode: classification.reasonCode,
        recommendedNextAction: "halt-and-ask",
      }),
    );
    exit(2);
    return;
  }

  const configuredCap = process.env.AMADEUS_SWARM_RETRY_CAP;
  const policyResult = configuredCap
    ? createBudgetPolicy({
        kind: "recoverable-retry",
        effectiveCap: Number(configuredCap),
        hardCap: 3,
        configVersion: "convergence-v1",
      })
    : defaultBudgetPolicy("recoverable-retry");
  if (!policyResult.ok) {
    console.log(
      JSON.stringify({
        kind: "retry-refused",
        reasonCode: "budget-policy-mismatch",
        recommendedNextAction: "halt-and-ask",
      }),
    );
    exit(2);
    return;
  }

  const activeRecord = recordDir(projectDir);
  const statePath = stateFilePath(projectDir);
  if (activeRecord === null || !existsSync(statePath)) {
    console.log(
      JSON.stringify({
        kind: "retry-refused",
        reasonCode: "state-inconsistent",
        recommendedNextAction: "halt-and-ask",
      }),
    );
    exit(2);
    return;
  }
  const state = readFileSync(statePath, "utf-8");
  const stage = getField(state, "Current Stage")?.trim() ?? "";
  const rawRevision = Number.parseInt(getField(state, "Revision Count") ?? "0", 10);
  const revision = Number.isInteger(rawRevision) && rawRevision >= 0 ? rawRevision : 0;
  if (stage.length === 0) {
    console.log(
      JSON.stringify({
        kind: "retry-refused",
        reasonCode: "state-inconsistent",
        recommendedNextAction: "halt-and-ask",
      }),
    );
    exit(2);
    return;
  }
  const reserved = reserveStageBudget({
    projectDir,
    intentUuid: basename(activeRecord),
    stageSlug: stage,
    stageInstanceId: `${stage}@${revision}`,
    revision,
    agent: getField(state, "Active Agent") ?? "amadeus-conductor",
    budgetKind: "recoverable-retry",
    subjectId: unit,
    policy: policyResult.value,
    lastDurableProgress: `${stage}:${getField(state, "Status") ?? "running"}`,
    deliveryIdentity: flags["delivery-id"],
    deduplicateDelivery: true,
  });
  if (reserved.kind === "reserved") {
    console.log(
      JSON.stringify({
        kind: "retry-authorized",
        unit,
        retryOrdinal: reserved.consumed,
        remaining: reserved.remaining,
        backoffMs: retryBackoffMs(reserved.consumed),
        ruleId: classification.ruleId,
      }),
    );
    exit(0);
    return;
  }
  console.log(
    JSON.stringify(
      reserved.kind === "exhausted"
        ? { kind: "retry-refused", termination: reserved.termination }
        : {
            kind: "retry-refused",
            reasonCode: reserved.reason,
            recommendedNextAction: "halt-and-ask",
          },
    ),
  );
  exit(2);
}

// --- finalize ---------------------------------------------------------------

export function claimedUnitsOutsideBatch(
  allUnits: readonly string[],
  claimed: readonly string[],
): string[] {
  const allUnitSet = new Set(allUnits);
  return [...new Set(claimed)].filter((unit) => !allUnitSet.has(unit));
}

export function claimedUnitsFailureEnvelope(
  batch: string,
  allUnits: readonly string[],
  claimed: readonly string[],
): FinalizeEnvelope | null {
  const invalidClaimedUnits = claimedUnitsOutsideBatch(allUnits, claimed);
  if (invalidClaimedUnits.length === 0) return null;
  const units: UnitResult[] = invalidClaimedUnits.map((unit) => ({
    unit,
    status: "failed",
    reason: "error",
    detail: "claimed unit is not listed in --units",
  }));
  return { batch, units, converged: 0, failed: units.length, merge_failures: [] };
}

function finishFinalizeInputFailure(
  envelope: FinalizeEnvelope,
  exit: (code: number) => void,
): void {
  console.log(JSON.stringify(envelope, null, 2));
  exit(2);
}

function resolveFinalizeRepoArgs(
  projectDir: string,
  flags: Record<string, string>,
): string[] {
  try {
    const resolved = resolveConstructionRepo(
      projectDir,
      flags.repo,
      flags.intent,
      flags.space,
    );
    return resolved.repo === null ? [] : ["--repo", resolved.repo];
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

// True when an earlier finalize already integrated the unit's source — the
// tool-emitted WORKTREE_MERGED row is the delivery receipt. Lets a retried
// finalize (after a sibling's source-merge failure stopped the batch) count
// the delivered unit as converged instead of failing it for a missing worktree.
// The receipt must belong to the CURRENT fork: a receipt older than the unit's
// newest WORKTREE_CREATED is a previous delivery of the same slug, not this
// batch's — counting it would report converged without integrating this
// batch's source (#3197). Ordering is (timestamp, buffer position), the same
// contract findAllEvents applies; audit timestamps are second-precision, so
// the position tie-break decides same-second re-forks by append order.
function sourceAlreadyIntegrated(
  pd: string,
  unit: string,
  intent?: string,
  space?: string,
): boolean {
  const audit = readAllAuditShards(pd, intent, space);
  if (audit.length === 0) return false;
  const rows: { merged: boolean; timestamp: string; pos: number }[] = [];
  const blocks = splitAuditRecords(audit);
  for (let pos = 0; pos < blocks.length; pos++) {
    const event = auditBlockField(blocks[pos], "Event");
    if (event !== "WORKTREE_MERGED" && event !== "WORKTREE_CREATED") continue;
    if (auditBlockField(blocks[pos], "Bolt slug") !== unit) continue;
    const timestamp = auditBlockField(blocks[pos], "Timestamp");
    if (timestamp === null || timestamp === "") continue;
    rows.push({ merged: event === "WORKTREE_MERGED", timestamp, pos });
  }
  rows.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
    return a.pos - b.pos;
  });
  const hasCreated = rows.some((row) => !row.merged);
  const newest = rows[rows.length - 1];
  return hasCreated && newest !== undefined && newest.merged;
}

export function handleFinalize(
  rest: string[],
  exit: (code: number) => void = process.exit,
  boltFailureEmitter: typeof emitBoltFailed = emitBoltFailed,
  toolRunner: ToolRunner = runTool,
): void {
  const { positional, flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);

  const batch = flags.batch ?? positional[0];
  if (!batch || !/^[1-9][0-9]*$/.test(batch)) {
    fail("finalize requires --batch <positive integer>");
  }
  if (!flags["check-cmd"]) {
    fail("finalize requires --check-cmd <shell command; exit 0 = converged>");
  }
  const claimed = flags.claimed ? splitCsv(flags.claimed) : [];
  // The universe of units in the batch; defaults to the claimed set when the
  // conductor passes only --claimed (then declined-unit accounting is a no-op).
  const allUnits = flags.units ? splitCsv(flags.units) : claimed.slice();
  // Resolve the construction repo before pool reads, checks, metadata merges, or
  // source integration. A multi-repo invocation without a selector therefore
  // fails at the same boundary as prepare, and the resolved selector is reused
  // verbatim by every step of the per-Unit transaction.
  const repoArgs = resolveFinalizeRepoArgs(projectDir, flags);
  const claimedFailure = claimedUnitsFailureEnvelope(batch, allUnits, claimed);
  if (claimedFailure) { finishFinalizeInputFailure(claimedFailure, exit); return; }
  const poolProjection = createUnitPoolCoordinator(
    createAuditUnitPoolRepository(projectDir),
  ).readProjection(batch);
  if (
    poolProjection.batchId === null ||
    poolProjection.phase !== "terminal" || poolProjection.queue.length > 0 || poolProjection.active.length > 0
  ) {
    finishFinalizeInputFailure(
      {
        batch,
        units: allUnits.map((unit) => ({
          unit,
          status: "failed",
          reason: "error",
          detail: "fixed Unit pool is not terminal; dispatch must pass through acquire/confirm/settle",
        })),
        converged: 0,
        failed: allUnits.length,
        merge_failures: [],
      },
      exit,
    );
    return;
  }
  const poolOutcomes = new Map(poolProjection.terminal.map((unit) => [unit.unitId, unit.outcome] as const));
  const claimedSet = new Set(claimed);
  const testFile = flags["test-file"];
  const checkCmd = flags["check-cmd"];
  const strategy = flags.strategy ?? "squash";
  if (!["squash", "merge", "rebase"].includes(strategy)) {
    fail(`--strategy must be one of: squash, merge, rebase`);
  }

  // The delivery target and anti-tamper baseline come from the fork contract
  // `prepare` captured (WORKTREE_CREATED Base branch / Base SHA), never from
  // conductor memory. --target overrides the captured base; absent both, main
  // keeps the pre-binding behaviour for worktrees with no creation record.
  const preparedForks = new Map<string, PreparedForkBinding>();
  for (const unit of claimed) {
    const binding = parsePreparedForkBinding(projectDir, unit, flags.intent, flags.space);
    if (binding) preparedForks.set(unit, binding);
  }
  const targetFor = (unit: string): string =>
    flags.target ?? preparedForks.get(unit)?.base ?? "main";

  // Optional per-declined-unit typed reasons: `--reasons a=unsatisfiable,b=budget-exhausted`.
  // The conductor judged WHY each unclaimed unit gave up (knowledge → conductor,
  // D-I); the tool records that attribution faithfully (determinism → tool),
  // mirroring how --claimed / --degraded-from carry conductor decisions. Applies
  // ONLY to declined units — a claimed unit's reason is always the tool's own
  // re-verify verdict, so the lying-conductor guard cannot be talked out of an
  // `error`. Unparseable / out-of-enum entries are rejected loudly rather than
  // silently downgraded; an unlisted declined unit defaults to `cap-exhausted`.
  const declinedReasons: Record<string, FailureReason> = {};
  if (flags.reasons) {
    for (const pair of splitCsv(flags.reasons)) {
      const eq = pair.indexOf("=");
      if (eq <= 0) {
        fail(`--reasons entry must be <unit>=<reason>: "${pair}"`);
      }
      const unit = pair.slice(0, eq).trim();
      const reason = pair.slice(eq + 1).trim() as FailureReason;
      if (!DECLINED_REASONS.includes(reason)) {
        fail(`--reasons reason for "${unit}" must be one of: ${DECLINED_REASONS.join(", ")}`);
      }
      declinedReasons[unit] = reason;
    }
  }

  // Re-verify every claimed unit (the lying-conductor guard) and account for any
  // declined unit the conductor did not claim.
  const results: UnitResult[] = [];
  const genuine: string[] = [];
  // Claimed units an earlier finalize already delivered (their worktrees are
  // gone by design) — counted as converged without a redundant second merge.
  const alreadyDelivered = new Set<string>();
  for (const unit of allUnits) {
    if (claimedSet.has(unit)) {
      const poolOutcome = poolOutcomes.get(unit);
      if (poolOutcome !== "succeeded") {
        results.push({
          unit,
          status: "failed",
          reason: "error",
          detail: `fixed Unit pool outcome is ${poolOutcome ?? "missing"}, not succeeded`,
        });
        continue;
      }
      const preparedForkSha = preparedForks.get(unit)?.forkSha ?? null;
      if (testFile && preparedForkSha === null) {
        results.push({
          unit,
          status: "failed",
          reason: "error",
          detail: `no prepared fork binding for unit "${unit}" (WORKTREE_CREATED with Base SHA absent) — run \`prepare\` first`,
        });
        continue;
      }
      const verdict = verdictFor(
        unit,
        projectDir,
        checkCmd,
        testFile && preparedForkSha !== null ? { testFile, forkSha: preparedForkSha } : {},
      );
      if (!verdict.exists) {
        if (sourceAlreadyIntegrated(projectDir, unit, flags.intent, flags.space)) {
          alreadyDelivered.add(unit);
          results.push({ unit, status: "converged" });
        } else {
          results.push({
            unit,
            status: "failed",
            reason: "error",
            detail: "no worktree on re-verify (prepare not run?)",
          });
        }
      } else if (verdict.confineError) {
        results.push({ unit, status: "failed", reason: "error", detail: verdict.confineError });
      } else if (verdict.tampered) {
        results.push({
          unit,
          status: "failed",
          reason: "error",
          detail: "convergence rejected: protected test file was modified",
          tampered: true,
        });
      } else if (verdict.converged) {
        genuine.push(unit);
        results.push({ unit, status: "converged" });
      } else {
        // Claimed converged, but the check command does not pass on re-verify —
        // the lying / misremembering conductor. Refuse the merge.
        results.push({
          unit,
          status: "failed",
          reason: "error",
          detail: "claimed converged but the check command did not pass on re-verify",
        });
      }
    } else {
      // The conductor did not claim this unit: its driver loop ended without
      // convergence. The conductor may attribute a typed reason via --reasons
      // (e.g. `unsatisfiable` when it judged the unit fundamentally unbuildable,
      // `budget-exhausted` when an ultra driver's token ceiling stopped it); absent
      // an attribution, `cap-exhausted` is the catch-all (the loop ended without
      // convergence and the conductor offered no finer classification).
      const reason = declinedReasons[unit] ?? "cap-exhausted";
      results.push({
        unit,
        status: "failed",
        reason,
        detail:
          reason === "cap-exhausted"
            ? "unit not claimed converged by the conductor"
            : `unit not claimed converged; conductor attributed: ${reason}`,
      });
    }
  }

  // Merge each genuine Unit in deterministic slug order. Metadata remains first:
  // release the hold, converge state/audit/runtime metadata, then squash the
  // Unit's committed source through the existing worktree module. A failed
  // release or metadata merge skips source for that Unit. A source failure stops
  // the remaining transactions because the target checkout may now hold an
  // unresolved conflict; every skipped Unit is returned in the same failure
  // envelope instead of being counted as converged.
  const mergeFailures = mergeGenuineUnits(
    projectDir,
    batch,
    genuine,
    repoArgs,
    toolRunner,
    targetFor,
    strategy,
  );

  // A unit that passed re-verify but whose merge-back failed is NOT genuinely
  // converged: the batch's authoritative result is the merged state, not the
  // verify-only verdict. Downgrade its `results` entry before audit/tally so
  // SWARM_UNIT_CONVERGED is never emitted for a unit that never landed on the
  // trunk — it instead gets SWARM_UNIT_FAILED + the baton back, same as any
  // other failed unit (issue #674).
  const mergeFailureDetail = new Map(mergeFailures.map((m) => [m.unit, m.detail] as const));
  for (const r of results) {
    if (r.status === "converged" && mergeFailureDetail.has(r.unit)) {
      r.status = "failed";
      r.reason = "error";
      r.detail = `merge-back failed: ${mergeFailureDetail.get(r.unit)}`;
    }
  }

  // Authoritative audit trail: one row per unit, the baton per failed unit, the
  // batch tally to close.
  const failedResults = results.filter((result) => result.status === "failed");
  const terminalAttempts = new Map(
    poolProjection.terminal.map((entry) => [entry.unitId, entry.attemptId?.trim() ?? ""] as const),
  );
  const missingAttempts = failedResults.filter((result) => !terminalAttempts.get(result.unit));
  if (missingAttempts.length > 0) {
    finishFinalizeInputFailure({
      batch,
      units: missingAttempts.map((result) => ({
        unit: result.unit,
        status: "failed",
        reason: "error",
        detail: "fixed Unit pool terminal attempt is missing",
      })),
      converged: 0,
      failed: missingAttempts.length,
      merge_failures: [],
    }, exit);
    return;
  }
  let failureStage: string | undefined;
  if (failedResults.length > 0) {
    failureStage = currentStageOrFail(projectDir);
  }
  for (const r of results) {
    if (r.status === "converged") {
      emitUnitConverged(projectDir, batch, r.unit);
    } else {
      emitUnitFailed(projectDir, batch, r.unit, r.reason ?? "error");
      const attempt = terminalAttempts.get(r.unit)!;
      const emitted = boltFailureEmitter(projectDir, batch, r.unit, attempt, failureStage!, r.detail ?? `unit "${r.unit}" failed: ${r.reason}`);
      if (!emitted.ok) {
        fail(`amadeus-bolt fail could not emit BOLT_FAILED for unit "${r.unit}": ${emitted.stderr.trim() || emitted.stdout.trim() || "unknown failure"}`);
      }
    }
  }
  for (const r of failedResults) {
    const attempt = terminalAttempts.get(r.unit)!;
    emitBatonReturned(projectDir, batch, r.unit, attempt, failureStage!, r.reason ?? "error");
  }

  // Merge-result basis (issue #674): a unit only counts as converged once its
  // merge-back actually succeeded, not merely on the verify-only verdict. Units
  // an earlier finalize already delivered count on their WORKTREE_MERGED receipt.
  const convergedCount =
    genuine.filter((u) => !mergeFailureDetail.has(u)).length + alreadyDelivered.size;
  const failedCount = failedResults.length;
  emitSwarmCompleted(projectDir, batch, convergedCount, failedCount);

  const envelope = {
    batch,
    units: results,
    converged: convergedCount,
    failed: failedCount,
    merge_failures: mergeFailures,
  };
  console.log(JSON.stringify(envelope, null, 2));
  // Exit 2 signals "the conductor must take the baton" (a unit failed or a merge
  // failed); exit 0 means every claimed unit was genuinely converged and merged.
  exit(failedCount > 0 || mergeFailures.length > 0 ? 2 : 0);
}

// --- resolve ----------------------------------------------------------------

function isHarnessName(value: string | undefined): value is HarnessName {
  return value !== undefined && (HARNESS_VALUES as readonly string[]).includes(value);
}

// `resolve --harness <name>`: read AMADEUS_USE_SWARM and print the static driver
// resolution for the running harness. Read-only — no audit emit, no worktree, no
// spawn (the SWARM_DEGRADED emit stays single-sourced in prepare's --degraded-from
// path). selected/degraded → stdout JSON one-liner, exit 0; rejected or an invalid
// --harness → the same fail idiom as the rest of this tool (stderr {error}, exit 1,
// stdout empty). exit is injectable so the CLI wiring is driven in-process by the
// tests (Bun coverage does not instrument spawned CLI processes).
export function handleResolve(
  rest: string[],
  exit: (code: number) => void = process.exit,
): void {
  const { flags } = parseArgs(rest);
  if (!isHarnessName(flags.harness)) {
    console.error(JSON.stringify({ error: `--harness must be one of: ${HARNESS_VALUES.join(", ")}` }));
    exit(1);
    return;
  }
  const resolution = resolveDriver(process.env.AMADEUS_USE_SWARM, flags.harness);
  if (resolution.kind === "rejected") {
    console.error(
      JSON.stringify({
        error: `AMADEUS_USE_SWARM must be unset or one of: ${RAW_DRIVER_VALUES.join(", ")} — got ${JSON.stringify(resolution.raw)}`,
      }),
    );
    exit(1);
    return;
  }
  console.log(JSON.stringify(resolution));
  exit(0);
}

// --- fixed Unit pool -------------------------------------------------------

function requiredBatch(flags: Record<string, string>): string {
  if (!flags.batch || !/^[1-9][0-9]*$/.test(flags.batch)) fail("pool command requires --batch <positive integer>");
  return flags.batch;
}

function poolKey(flags: Record<string, string>, fallback: string): string {
  return flags["idempotency-key"] ?? fallback;
}

function printPoolMutation(result: UnitPoolMutationResult): void {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}

export function handleInitialEnqueue(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  if (!flags.units) fail("initial-enqueue requires --units <comma-separated unit names>");
  const units = splitCsv(flags.units);
  if (units.length === 0) fail("--units resolved to an empty list");
  const config = resolveAmadeusConfig(projectDir, flags.intent, flags.space);
  if (config.kind === "invalid") fail(`invalid swarm configuration: ${formatConfigIssues(config.issues)}`);
  const configuredLimit = config.config.swarm.unit.concurrency.limit;
  const requested =
    flags.cap === undefined ? configuredLimit : Number(flags.cap);
  if (
    !Number.isInteger(requested) ||
    requested < 1 ||
    requested > configuredLimit
  ) {
    fail(`--cap must be an integer from 1 through ${configuredLimit}`);
  }
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.initialEnqueue({
    idempotencyKey: poolKey(flags, `unit-pool:${batchId}:initial-enqueue`),
    batchId,
    cap: Math.min(units.length, requested),
    units: units.map((unitId) => ({ unitId, dependsOn: [] })),
  }));
}

export function handleAcquire(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  if (!flags["idempotency-key"]) fail("acquire requires --idempotency-key <stable-delivery-id>");
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.acquire({
    idempotencyKey: `unit-pool:${batchId}:acquire:${flags["idempotency-key"]}`,
    batchId,
  }));
}

function requiredAttempt(flags: Record<string, string>, command: string): string {
  if (!flags.attempt) fail(`${command} requires --attempt <attempt-id>`);
  return flags.attempt;
}

export function handleConfirmDispatch(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  const attemptId = requiredAttempt(flags, "confirm-dispatch");
  if (!flags["native-handle"]) fail("confirm-dispatch requires --native-handle <handle>");
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.confirmDispatch({
    idempotencyKey: poolKey(flags, `unit-pool:${batchId}:confirm:${attemptId}`),
    batchId,
    attemptId,
    nativeHandle: flags["native-handle"],
  }));
}

export function handleRecordReconciliation(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  const attemptId = requiredAttempt(flags, "record-reconciliation");
  const effect = flags.effect;
  if (effect !== "no-effect-confirmed" && effect !== "effect-possible" && effect !== "unknown") {
    fail("--effect must be no-effect-confirmed, effect-possible, or unknown");
  }
  if (!flags["reconciliation-kind"]) fail("record-reconciliation requires --reconciliation-kind <kind>");
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.recordReconciliation({
    idempotencyKey: flags["idempotency-key"] ?? `unit-pool:${batchId}:reconcile:${attemptId}:${flags["reconciliation-kind"]}:${effect}`,
    batchId,
    attemptId,
    reconciliationKind: flags["reconciliation-kind"],
    effect,
  }));
}

function poolOutcome(flags: Record<string, string>, command: string): UnitPoolOutcome {
  if (!UNIT_POOL_OUTCOMES.includes(flags.outcome as UnitPoolOutcome)) {
    fail(`${command} requires --outcome <${UNIT_POOL_OUTCOMES.join("|")}>`);
  }
  return flags.outcome as UnitPoolOutcome;
}

export function handleSettle(rest: string[], command: "settle-release" | "settle-release-requeue" | "settle-release-cancel-dependents"): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  const attemptId = requiredAttempt(flags, command);
  const outcome = poolOutcome(flags, command);
  const request = { idempotencyKey: poolKey(flags, `unit-pool:${batchId}:${command}:${attemptId}`), batchId, attemptId };
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  if (command === "settle-release-requeue") {
    if (outcome !== "dispatch-not-started") fail("settle-release-requeue requires --outcome dispatch-not-started");
    printPoolMutation(coordinator.settleReleaseRequeue({ ...request, outcome }));
  } else if (command === "settle-release-cancel-dependents") {
    printPoolMutation(coordinator.settleReleaseCancelDependents({ ...request, outcome }));
  } else {
    printPoolMutation(coordinator.settleRelease({ ...request, outcome }));
  }
}

export function handleTerminateBatch(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  const results = ["completed", "partial-failure", "cancelled", "terminated"] as const;
  if (!results.includes(flags.result as (typeof results)[number])) fail(`--result must be one of: ${results.join(", ")}`);
  const queuedOutcome = flags["queued-outcome"];
  if (queuedOutcome !== "batch-unsafe" && queuedOutcome !== "cancelled") fail("--queued-outcome must be batch-unsafe or cancelled");
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.terminateBatch({
    idempotencyKey: poolKey(flags, `unit-pool:${batchId}:terminate`),
    batchId,
    result: flags.result as (typeof results)[number],
    queuedOutcome,
  }));
}

export function handleLateResult(rest: string[]): void {
  const { flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);
  const batchId = requiredBatch(flags);
  const attemptId = requiredAttempt(flags, "late-result-observed");
  const outcome = poolOutcome(flags, "late-result-observed");
  const coordinator = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  printPoolMutation(coordinator.lateResultObserved({
    idempotencyKey: poolKey(flags, `unit-pool:${batchId}:late:${attemptId}:${outcome}`),
    batchId,
    attemptId,
    outcome,
  }));
}

// --- shared helpers ---------------------------------------------------------

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u !== "");
}

function currentBranch(projectDir: string): string {
  const r = observeSubprocessSpan(projectDir, "git", () =>
    spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: projectDir,
      encoding: "utf-8",
    }),
  );
  return (r.stdout ?? "main").trim() || "main";
}

function fail(msg: string): never {
  console.error(JSON.stringify({ error: msg }));
  process.exit(1);
}

function main(): void {
  // The subcommand is the first bare token that is NOT a flag NOR a flag's value.
  // Walk argv skipping `--flag value` / `--flag=value` pairs so
  // `--project-dir <path> check ...` and `check --project-dir <path> ...` both
  // resolve to `check`. The handlers re-read every flag from `rest`, and a
  // positional unit (e.g. `check <unit>`) survives in rest.
  const argv = process.argv.slice(2);
  let subcommand: string | undefined;
  let subIndex = -1;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (!a.includes("=") && i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        i++;
      }
      continue;
    }
    subcommand = a;
    subIndex = i;
    break;
  }
  const rest = subIndex >= 0 ? [...argv.slice(0, subIndex), ...argv.slice(subIndex + 1)] : argv;

  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
  try {
    initProcessObservability(`tool:amadeus-swarm:${subcommand ?? "?"}`, resolveProjectDir(parseArgs(rest).flags["project-dir"]));
  } catch {
    // no resolvable workflow -> nothing to observe
  }

  switch (subcommand) {
    case "prepare":
      handlePrepare(rest);
      break;
    case "check":
      handleCheck(rest);
      break;
    case "retry":
      handleRetry(rest);
      break;
    case "finalize":
      handleFinalize(rest);
      break;
    case "resolve":
      handleResolve(rest);
      break;
    case "initial-enqueue":
      handleInitialEnqueue(rest);
      break;
    case "acquire":
      handleAcquire(rest);
      break;
    case "confirm-dispatch":
      handleConfirmDispatch(rest);
      break;
    case "record-reconciliation":
      handleRecordReconciliation(rest);
      break;
    case "settle-release":
    case "settle-release-requeue":
    case "settle-release-cancel-dependents":
      handleSettle(rest, subcommand);
      break;
    case "terminate-batch":
      handleTerminateBatch(rest);
      break;
    case "late-result-observed":
      handleLateResult(rest);
      break;
    default:
      console.error(
        JSON.stringify({
          error: `Unknown subcommand: ${subcommand ?? "(none)"}. Valid: prepare, check, retry, finalize, resolve, initial-enqueue, acquire, confirm-dispatch, record-reconciliation, settle-release, settle-release-requeue, settle-release-cancel-dependents, terminate-batch, late-result-observed`,
        })
      );
      process.exit(1);
  }
}

if (import.meta.main) main();
