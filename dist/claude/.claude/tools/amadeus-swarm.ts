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
// THREE STATELESS SUBCOMMANDS (no iteration counter, no persisted state):
//   prepare  --batch <n> --units <a,b,c> [--base <branch>] [--concurrency <n>]
//            [--degraded-from <subagent|claude-ultra|codex-ultra>] [--repo <name>]
//       Fork an isolated git worktree per unit (amadeus-worktree create +
//       amadeus-bolt start --worktree) and emit SWARM_STARTED once for the batch.
//       --repo (P7) selects the sibling repo the batch's worktrees fork inside (a
//       multi-repo intent requires it; single-repo infers the lone repo); the
//       resolved name is forwarded to every amadeus-worktree create + bolt start.
//       The anti-tamper baseline is each worktree's OWN git fork (HEAD) — nothing
//       is stored; check/finalize re-derive the pristine bytes with `git diff
//       --quiet HEAD`. Runs before any worker, so it cannot fold into check.
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
//   finalize --batch <n> --units <a,b,c> --claimed <a,b> --check-cmd <cmd>
//            [--test-file <path>] [--reasons <unit>=<reason>,...]
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
// WHY STATELESS / NO CAP CONSTANT. "The cap" is three jobs on three concerns — the
// verdict (determinism -> check), the retry decision (knowledge -> the conductor,
// which judges "one more try vs unsatisfiable"), and the runaway backstop
// (determinism -> the harness 8-block Stop-hook ceiling). A per-unit counter here
// would make determinism do the knowledge job and is redundant on the other
// drivers (an ultra driver's cap is its own bound; /goal's is its
// turn-clause). So this tool holds none of it: check is advisory, finalize is
// authoritative (re-verifies at the merge gate), so a red unit cannot merge even
// if the conductor lies or misremembers.
//
// COMPOSES existing tools, does NOT reimplement them:
//   - amadeus-worktree create        -> the isolated git worktree per unit
//   - amadeus-bolt start --worktree  -> state/audit/runtime-graph fork into it
//   - amadeus-bolt complete --merge  -> the AIDLC-data merge back to the base
//   - amadeus-bolt release-merge     -> release the existing per-Bolt HOLD-MERGE
//     lock before a serialised merge (idempotent — safe if never held). The merge
//     phase is serial (a one-at-a-time loop), so only one merge is ever in flight.
//   - amadeus-bolt fail              -> close a failed unit's Bolt lifecycle
//     (BOLT_FAILED paired with the BOLT_STARTED that `start --worktree` emitted).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { appendAuditEntry } from "./amadeus-audit.ts";
import { parseArgs, resolveConstructionRepo, resolveProjectDir, worktreePath } from "./amadeus-lib.ts";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

// The typed reason enum the conductor branches on. budget-exhausted stays valid
// for an ultra driver's token ceiling; cap-exhausted is the loop-ended-
// without-convergence sense; error covers a tamper / lying-claim / plumbing fault.
type FailureReason = "unsatisfiable" | "budget-exhausted" | "cap-exhausted" | "error";

// The driver vocabulary: the subagent floor plus the two per-harness ultra
// drivers. subagent is always available; claude-ultra is native to the Claude
// harness and codex-ultra to the Codex harness. `--degraded-from` records which
// ultra driver a loud downgrade fell away from.
export type DriverName = "subagent" | "claude-ultra" | "codex-ultra";
export const DRIVER_VALUES: readonly DriverName[] = ["subagent", "claude-ultra", "codex-ultra"];

// The harnesses whose driver selection resolve arbitrates. Kept as a runtime
// array (not a bare type union) so the `--harness` CLI check is a real array
// membership test — a type-only union would erase at runtime and let an unknown
// harness through.
export type HarnessName = "claude" | "codex" | "kiro" | "kiro-ide";
export const HARNESS_VALUES: readonly HarnessName[] = ["claude", "codex", "kiro", "kiro-ide"];

// The static outcome of resolving AMADEUS_USE_SWARM against the running harness.
// A discriminated union so the invalid state is unrepresentable: `rejected` keeps
// only the raw string and carries NO driver field, so a caller cannot mistake a
// rejected value for a dispatchable driver (parse-don't-validate, fail-closed).
export type DriverResolution =
  | { kind: "selected"; driver: DriverName }
  | { kind: "degraded"; driver: "subagent"; requested: DriverName }
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
    // unset: the subagent floor is the only default. Every other value must be
    // an explicit, recognised opt-in.
    return { kind: "selected", driver: "subagent" };
  }
  if (raw === "claude-ultra" || raw === "codex-ultra") {
    const nativeHarness: HarnessName = raw === "claude-ultra" ? "claude" : "codex";
    if (harness === nativeHarness) {
      return { kind: "selected", driver: raw };
    }
    // A recognised ultra driver that is not native to this harness degrades to
    // the subagent floor, preserving the requested value for the audit trail.
    return { kind: "degraded", driver: "subagent", requested: raw };
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
  const result = spawnSync(
    "bun",
    [join(TOOLS_DIR, toolFile), "--project-dir", projectDir, ...args],
    { encoding: "utf-8", cwd: projectDir, timeout: 60_000 }
  );
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
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
function checkConverged(cwd: string, checkCmd: string): boolean {
  const shell =
    process.platform !== "win32" && existsSync("/bin/bash")
      ? "/bin/bash"
      : true;
  const result = spawnSync(checkCmd, {
    cwd,
    encoding: "utf-8",
    timeout: 60_000,
    shell,
  });
  return result.status === 0;
}

export type FileTamperResult =
  | { status: "clean" }
  | { status: "tampered" }
  | { status: "error"; detail: string };

export function fileTamperResultForStatuses(
  headStatus: number | null,
  diffStatus: number | null,
  relPath: string,
): FileTamperResult {
  if (headStatus !== 0) {
    return { status: "error", detail: `protected test file is not tracked at HEAD: ${relPath}` };
  }
  if (diffStatus === 0) return { status: "clean" };
  if (diffStatus === 1) return { status: "tampered" };
  return {
    status: "error",
    detail: `could not compare protected test file against HEAD (git diff exit ${diffStatus}): ${relPath}`,
  };
}

// Anti-tamper, re-derived from the worktree's own git fork (stateless). Git diff
// exits 0 for both an unchanged tracked file and a path absent from HEAD, so the
// HEAD object must be confirmed before interpreting diff status 0 as clean.
function fileTampered(cwd: string, relPath: string): FileTamperResult {
  const headPath = relPath.split(sep).join("/");
  const head = spawnSync("git", ["cat-file", "-e", `HEAD:${headPath}`], {
    cwd,
    encoding: "utf-8",
    timeout: 60_000,
  });
  if (head.status !== 0) {
    return fileTamperResultForStatuses(head.status, null, relPath);
  }
  const diff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", relPath], {
    cwd,
    encoding: "utf-8",
    timeout: 60_000,
  });
  return fileTamperResultForStatuses(head.status, diff.status, relPath);
}

export interface Verdict {
  exists: boolean;
  converged: boolean;
  tampered: boolean;
  confineError?: string;
}

// Compute a unit's stateless verdict from on-disk state alone. Re-derives the
// worktree path from (projectDir, unit) — no stored handle — so check and
// finalize agree without sharing state.
export function verdictFor(
  unit: string,
  projectDir: string,
  checkCmd: string,
  testFile?: string
): Verdict {
  const wt = worktreePath(projectDir, unit);
  if (!existsSync(wt)) {
    return { exists: false, converged: false, tampered: false };
  }
  const converged = checkConverged(wt, checkCmd);
  let tampered = false;
  let confineError: string | undefined;
  if (testFile) {
    // Confine the path inside the unit's worktree — a `../` escape would point
    // the guard at a file the worker never touched and silently DISABLE it, so
    // reject it as a configuration error rather than ship a false "untampered".
    const candidate = resolve(wt, testFile);
    const root = resolve(wt) + sep;
    if (!candidate.startsWith(root)) {
      confineError = `--test-file resolves outside the unit worktree: ${testFile}`;
    } else {
      const tamperResult = fileTampered(wt, relative(wt, candidate));
      if (tamperResult.status === "error") confineError = tamperResult.detail;
      else tampered = tamperResult.status === "tampered";
    }
  }
  return { exists: true, converged, tampered, confineError };
}

// --- Audit emission (this tool owns the whole swarm taxonomy) ---------------
//
// The engine is read-only and the conductor (prose) never emits audit events, so
// the deterministic tool is the sole emitter. SWARM_STARTED fires once per batch
// in `prepare`; SWARM_DEGRADED fires there too when the conductor reports a loud
// downgrade. The per-unit pair, the per-failed-unit baton row, and the batch
// tally all fire from `finalize`, the authoritative gate.

function emitSwarmStarted(
  pd: string,
  batch: string,
  units: string[],
  concurrency: string
): void {
  appendAuditEntry(
    "SWARM_STARTED",
    {
      "Batch number": batch,
      "Unit names": units.join(","),
      "Concurrency cap": concurrency,
    },
    pd
  );
}

// Loud-degrade: an ultra native to another harness was requested (or the Workflow
// tool was unavailable for claude-ultra), so the conductor ran the subagent floor. The referee makes the
// substrate difference invisible to convergence, but the downgrade is recorded.
function emitSwarmDegraded(pd: string, batch: string, requested: DriverName): void {
  appendAuditEntry(
    "SWARM_DEGRADED",
    {
      "Batch number": batch,
      "Requested driver": requested,
      "Fallback driver": "subagent",
    },
    pd
  );
}

function emitUnitConverged(pd: string, batch: string, unit: string): void {
  appendAuditEntry(
    "SWARM_UNIT_CONVERGED",
    { "Batch number": batch, "Unit name": unit },
    pd
  );
}

function emitUnitFailed(
  pd: string,
  batch: string,
  unit: string,
  reason: FailureReason
): void {
  appendAuditEntry(
    "SWARM_UNIT_FAILED",
    { "Batch number": batch, "Unit name": unit, Reason: reason },
    pd
  );
}

function emitBatonReturned(
  pd: string,
  batch: string,
  unit: string,
  reason: FailureReason
): void {
  appendAuditEntry(
    "SWARM_BATON_RETURNED",
    { "Batch number": batch, "Unit name": unit, Reason: reason },
    pd
  );
}

function emitSwarmCompleted(
  pd: string,
  batch: string,
  convergedCount: number,
  failedCount: number
): void {
  appendAuditEntry(
    "SWARM_COMPLETED",
    {
      "Batch number": batch,
      "Converged count": String(convergedCount),
      "Failed count": String(failedCount),
    },
    pd
  );
}

// Close a failed unit's per-Bolt lifecycle by composing `amadeus-bolt fail` (emits
// BOLT_FAILED paired with the BOLT_STARTED that `start --worktree` emitted).
// Preserves the worktree per the halt-and-ask contract. Best-effort: the swarm's
// own SWARM_UNIT_FAILED is the authoritative swarm signal, so a failure to emit
// BOLT_FAILED must not mask it.
function emitBoltFailed(pd: string, unit: string, errorSummary: string): void {
  runTool(
    "amadeus-bolt.ts",
    ["fail", "--name", unit, "--slug", unit, "--error", errorSummary],
    pd
  );
}

// --- prepare ----------------------------------------------------------------

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
  const concurrency =
    flags.concurrency && /^[1-9][0-9]*$/.test(flags.concurrency)
      ? flags.concurrency
      : String(units.length);

  // Record a loud downgrade BEFORE the batch-start row, if the conductor reports
  // one. The driver-selection read (AMADEUS_USE_SWARM) is conductor-side; the tool
  // only learns a degrade happened via this flag.
  if (flags["degraded-from"]) {
    const requested = flags["degraded-from"] as DriverName;
    if (!DRIVER_VALUES.includes(requested)) {
      fail(`--degraded-from must be one of: ${DRIVER_VALUES.join(", ")}`);
    }
    emitSwarmDegraded(projectDir, flags.batch, requested);
  }

  emitSwarmStarted(projectDir, flags.batch, units, concurrency);

  const prepared: {
    unit: string;
    ok: boolean;
    worktree_path?: string;
    error?: string;
  }[] = [];
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
      ["start", "--worktree", "--slug", unit, "--batch", flags.batch, "--name", unit, ...repoArgs],
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

  console.log(
    JSON.stringify(
      { batch: flags.batch, base, concurrency: Number(concurrency), units: prepared },
      null,
      2
    )
  );
  // Exit 2 if any worktree failed to fork — the conductor must take the baton.
  process.exit(prepared.some((p) => !p.ok) ? 2 : 0);
}

// --- check ------------------------------------------------------------------

// Exit 0 ONLY for a genuine convergence (green AND untampered) — the seam an
// ultra driver and the conductor gate on (a worker's self-claim is never read).
function handleCheck(rest: string[]): void {
  const { positional, flags } = parseArgs(rest);
  const projectDir = resolveProjectDir(flags["project-dir"]);

  const unit = positional[0] ?? flags.unit;
  if (!unit) {
    fail("check requires a unit name (positional `check <unit>` or --unit <unit>)");
  }
  if (!flags["check-cmd"]) {
    fail("check requires --check-cmd <shell command; exit 0 = converged>");
  }

  const verdict = verdictFor(unit, projectDir, flags["check-cmd"], flags["test-file"]);
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
    process.exit(1);
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
  process.exit(genuine ? 0 : 1);
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

export function handleFinalize(
  rest: string[],
  exit: (code: number) => void = process.exit,
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
  const claimedFailure = claimedUnitsFailureEnvelope(batch, allUnits, claimed);
  if (claimedFailure) { finishFinalizeInputFailure(claimedFailure, exit); return; }
  const claimedSet = new Set(claimed);
  const testFile = flags["test-file"];
  const checkCmd = flags["check-cmd"];

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
  for (const unit of allUnits) {
    if (claimedSet.has(unit)) {
      const verdict = verdictFor(unit, projectDir, checkCmd, testFile);
      if (!verdict.exists) {
        results.push({
          unit,
          status: "failed",
          reason: "error",
          detail: "no worktree on re-verify (prepare not run?)",
        });
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

  // Serialised HOLD-MERGE merge-back of the genuine passes only (sorted for a
  // deterministic merge order). release-merge is idempotent — safe whether or not
  // the lock was ever held; complete --merge reaches the add/add-conflict abort
  // pinned at the composed surface by the worktree-merge tests.
  const mergeFailures: { unit: string; detail: string }[] = [];
  for (const unit of [...genuine].sort()) {
    runTool("amadeus-bolt.ts", ["release-merge", "--slug", unit], projectDir);
    const merged = runTool(
      "amadeus-bolt.ts",
      ["complete", "--merge", "--slug", unit, "--batch", batch, "--name", unit],
      projectDir
    );
    if (!merged.ok) {
      mergeFailures.push({ unit, detail: merged.stderr.trim() || merged.stdout.trim() });
    }
  }

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
  for (const r of results) {
    if (r.status === "converged") {
      emitUnitConverged(projectDir, batch, r.unit);
    } else {
      emitUnitFailed(projectDir, batch, r.unit, r.reason ?? "error");
      emitBoltFailed(projectDir, r.unit, r.detail ?? `unit "${r.unit}" failed: ${r.reason}`);
    }
  }
  const failedResults = results.filter((r) => r.status === "failed");
  for (const r of failedResults) {
    emitBatonReturned(projectDir, batch, r.unit, r.reason ?? "error");
  }

  // Merge-result basis (issue #674): a unit only counts as converged once its
  // merge-back actually succeeded, not merely on the verify-only verdict.
  const convergedCount = genuine.filter((u) => !mergeFailureDetail.has(u)).length;
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
  process.exit(failedCount > 0 || mergeFailures.length > 0 ? 2 : 0);
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
        error: `AMADEUS_USE_SWARM must be unset or one of: ${DRIVER_VALUES.join(", ")} — got ${JSON.stringify(resolution.raw)}`,
      }),
    );
    exit(1);
    return;
  }
  console.log(JSON.stringify(resolution));
  exit(0);
}

// --- shared helpers ---------------------------------------------------------

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u !== "");
}

function currentBranch(projectDir: string): string {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: projectDir,
    encoding: "utf-8",
  });
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
  switch (subcommand) {
    case "prepare":
      handlePrepare(rest);
      break;
    case "check":
      handleCheck(rest);
      break;
    case "finalize":
      handleFinalize(rest);
      break;
    case "resolve":
      handleResolve(rest);
      break;
    default:
      console.error(
        JSON.stringify({
          error: `Unknown subcommand: ${subcommand ?? "(none)"}. Valid: prepare, check, finalize, resolve`,
        })
      );
      process.exit(1);
  }
}

if (import.meta.main) main();
