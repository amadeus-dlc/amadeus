// amadeus-bolt.ts — Construction-phase bolt lifecycle
//
// A bolt is one execution of stages 3.1-3.5 for a Unit (or small group of
// dependency-linked Units). This tool owns BOLT_STARTED, BOLT_COMPLETED,
// BOLT_FAILED emissions and the Intent-scoped autonomy command surface —
// separated from amadeus-state to keep Construction-phase specifics out of the
// general state tool. AUTONOMY_MODE_SET remains replay/doctor-only legacy data.
// `abort` reuses BOLT_FAILED with a `Reason: aborted` field rather than
// adding a new event type — keeps the audit count stable and uses field
// taxonomy for sub-classification per the project pattern.
//
// Intent autonomy commits update the canonical Intent Mode/Grant projection and
// the compatibility Construction Autonomy Mode field in one transaction.
//
// Per-Bolt worktree lifecycle integration. The CLI surface mirrors the
// lifecycle's three terminal states:
//   start --worktree  — fork state + audit + runtime-graph fragment on
//                       Bolt start (delegates to state-fork + audit-fork +
//                       fragment-fork; no duplicate writes)
//   complete --merge  — merge state + audit + runtime-graph fragment
//                       back to main on success
//   abort  --discard  — explicit user-driven abort; optional discard tear-down
// The fail subcommand is unchanged in behaviour: code-gen returned an error,
// halt-and-ask preserves the worktree by default. abort is the user's
// explicit "I want this gone" verb.
//
// Runtime-graph fragment-fork / fragment-merge complete the fork/merge
// triad alongside state and audit. The fragment file lives at
// <wt>/amadeus-docs/runtime-graph.json (gitignored, mirrors main). No new
// audit events for the fragment lifecycle — it rides on the existing
// STATE_FORKED + AUDIT_FORKED (fork) and STATE_MERGED + AUDIT_MERGED
// (merge) boundaries.
//
// Atomicity per the practices-promote / handleSetAutonomy precedent:
// validate inputs FIRST, emit primary audit event AFTER validation passes,
// THEN delegate to state-fork / audit-fork subprocess CLIs (which emit
// their own events inside withAuditLock). Never duplicate state mutations
// the sibling primitives already own (Bolt Refs, Worktree Path) — this is
// the t48 emitter-pairing rule.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  emitError,
  errorMessage,
  getField,
  loadStageGraph,
  parseApprovedSwarmBatches,
  relativeRecordDir,
  readStateFile,
  resolveProjectDir,
  setFieldStrict,
  setOrInsertField,
  withAuditLock,
  SWARM_BATCH_APPROVALS_FIELD,
  worktreePath,
  worktreeStateFilePath,
  writeStateFile,
} from "./amadeus-lib.js";
import {
  applyProductionAutonomyMode,
  commitProductionQualityObservation,
  commitProductionQuestionDecision,
  previewProductionAutonomyGrant,
  resumeProductionQuality,
  type ProductionQuestionDecisionInput,
} from "./amadeus-intent-autonomy-production.ts";
import {
  commitProductionDecisionReview,
  getProductionAutoDecision,
  listProductionAutoDecisions,
} from "./amadeus-autonomy-review-production.ts";
import { normalizeReviewFlagMetadata, reviewCommandContentDigest } from "./amadeus-autonomy-review.ts";
import { autonomyDigest, type DecisionPolicyInput } from "./amadeus-intent-autonomy.ts";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import {
  assessBoltCompletionRecovery,
  assessStateMergeRecovery,
  type MergeRecoveryAssessment,
} from "./amadeus-merge-recovery.ts";
import { verifyAuditMergeRecovery } from "./amadeus-audit.ts";

function emitAudit(
  pd: string,
  eventType: string,
  fields: Record<string, string>,
  intent?: string,
  space?: string
): void {
  // Targeted: intent/space name the ledger this Bolt operation belongs to, and
  // the target drives both the shard the row lands in and the row's own
  // identity fields. Guarded (#1959): the fatal-latch drop is non-throwing, so
  // the plain emit would let every handler's try/catch proceed to its state
  // write with no ledger row behind it — the guard throws instead.
  emitAuditEventGuarded(eventType, fields, pd, intent, space);
}

// The intent/space/repo SELECTOR re-serialised for a delegated sibling spawn. A
// Bolt pair (start --worktree / complete --merge) must propagate the SAME selector
// to every fork/merge primitive so they all target ONE intent end-to-end (vision
// §5). The --repo dimension (P7) likewise rides along so a delegated git op
// (amadeus-worktree discard on abort --discard) anchors to the same sibling repo the
// fork used. Returns [] when no flag is present -> the primitives default-resolve
// (the active cursor / inferred lone repo), today's behaviour.
function selectorArgs(flags: Record<string, string>): string[] {
  const out: string[] = [];
  if (flags.intent) out.push("--intent", flags.intent);
  if (flags.space) out.push("--space", flags.space);
  if (flags.repo) out.push("--repo", flags.repo);
  return out;
}

// --- Flag parsing ---

// Boolean flags carry no value. Filter them out before parseFlags so the
// strict value-required scan doesn't reject them. The --worktree / --merge
// / --discard flags drive the per-Bolt lifecycle integration.
const BOOLEAN_FLAGS = new Set(["--worktree", "--merge", "--discard", "--unit"]);

// The `--unit` pass-through for the state fork. A named helper rather than an
// inline conditional so the branch is not counted against handleStart, which
// sits at the complexity baseline's ceiling.
function unitFlagArgs(booleans: Set<string>): string[] {
  return booleans.has("unit") ? ["--unit"] : [];
}

function splitBooleanFlags(args: string[]): { booleans: Set<string>; rest: string[] } {
  const booleans = new Set<string>();
  const rest: string[] = [];
  for (const a of args) {
    if (BOOLEAN_FLAGS.has(a)) {
      booleans.add(a.slice(2));
    } else {
      rest.push(a);
    }
  }
  return { booleans, rest };
}

// Spawn a sibling tool (same project-dir) and return {ok, stdout, stderr}.
// Used by --worktree / --merge / --discard branches to delegate to
// state-fork / audit-fork / worktree-discard subcommands. 30s timeout
// matches the merge-dispatch budget; on timeout, signal === "SIGTERM"
// distinguishes the timeout case from an exit-code failure.
function spawnSibling(
  pd: string,
  toolName:
    | "amadeus-state.ts"
    | "amadeus-audit.ts"
    | "amadeus-worktree.ts"
    | "amadeus-runtime.ts",
  subargs: string[]
): { ok: boolean; stdout: string; stderr: string; signal: string | null; status: number | null } {
  const result = observeSubprocessSpan(pd, `${toolName.replace(/\.ts$/, "")}:${subargs[0] ?? "?"}`, () =>
    spawnSync(
      "bun",
      [
        "run",
        fileURLToPath(new URL(`./${toolName}`, import.meta.url)),
        "--project-dir",
        pd,
        ...subargs,
      ],
      { encoding: "utf-8", cwd: pd, timeout: 30_000 }
    ),
  );
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    signal: result.signal,
    status: result.status,
  };
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    if (i + 1 >= args.length) {
      error(`${a} expects a value, got end of arguments.`);
    }
    const val = args[i + 1];
    if (val.startsWith("--")) {
      error(`${a} expects a value, got another flag: "${val}". Did you forget the value?`);
    }
    flags[a.slice(2)] = val;
    i++;
  }
  return flags;
}

// --- Subcommand: start ---
// Usage: amadeus-bolt start --name <bolt-names> --batch <n>
//                         [--walking-skeleton true|false]
//                         [--worktree --slug <kebab-slug>] [--repo <name>]
//
// --name accepts a single bolt name or comma-separated list for a parallel batch.
//
// --repo (P7): the sibling repo the Bolt operates in. start does no git itself
// (the worktree was created by amadeus-worktree create), but --repo rides the
// selector to every delegated primitive so the whole Bolt pair targets one repo.
//
// --worktree: after BOLT_STARTED, delegates to `amadeus-state.ts fork` and
// `amadeus-audit.ts audit-fork` to fork state and audit into the Bolt's
// worktree. Requires --slug for the kebab-case Bolt slug (per SKILL.md
// slug-derivation rule). Single-bolt only — csv batch with --worktree is
// rejected. Per-Bolt parallel batches issue N start --worktree calls, one
// per slug.
function handleStart(args: string[], explicitProjectDir?: string): void {
  const { booleans, rest } = splitBooleanFlags(args);
  const flags = parseFlags(rest);
  if (!flags.name) error("Missing --name <bolt-name or csv>");
  if (!flags.batch) error("Missing --batch <batch-number>");
  if (!/^[1-9][0-9]*$/.test(flags.batch)) {
    error(`Invalid --batch: "${flags.batch}". Must be a positive integer.`);
  }

  const pd = resolveBoltProjectDir(explicitProjectDir);
  const walkingSkeleton = flags["walking-skeleton"] === "true";
  const useWorktree = booleans.has("worktree");

  if (useWorktree) {
    if (!flags.slug) {
      error("--worktree requires --slug <kebab-slug>");
    }
    if (flags.name.includes(",")) {
      error(
        `--worktree requires a single bolt name; got csv: "${flags.name}". Issue one start --worktree per bolt.`
      );
    }
  }

  // Validate state-file shape FIRST. setFieldStrict-equivalent: read state
  // and confirm we can find it; if not, fail before any audit emit so a
  // missing/unresolvable active workflow state doesn't leave an orphan
  // BOLT_STARTED (and, when no intent resolves, an orphan bare-space-root
  // audit shard under intents/audit/ — see #676). Both the --worktree and
  // non-worktree paths emit the same BOLT_STARTED, so both require the same
  // pre-audit state-read guard; --worktree keeps its failJson exit contract,
  // non-worktree uses the plain error() exit.
  if (useWorktree) {
    try {
      readStateFile(pd);
    } catch (e) {
      failJson("start-worktree", flags.slug, "state-read-failed", errorMessage(e));
    }
  } else {
    try {
      readStateFile(pd, flags.intent, flags.space);
    } catch (e) {
      error(`Active workflow state not found: ${errorMessage(e)}`);
    }
  }

  // Audit-first within validated context: emit BOLT_STARTED only after
  // shape checks pass. The state-fork / audit-fork primitives below emit
  // their own STATE_FORKED / AUDIT_FORKED rows inside withAuditLock — we
  // must not duplicate that here (per t48 emitter-pairing check).
  try {
    const fields: Record<string, string> = {
      "Bolt names": flags.name,
      "Batch number": flags.batch,
      "Walking skeleton": String(walkingSkeleton),
    };
    if (useWorktree) {
      fields["Bolt slug"] = flags.slug;
    }
    emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space);
  } catch (e) {
    if (useWorktree) {
      failJson("start-worktree", flags.slug, "audit-emit-failed", errorMessage(e));
    }
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  if (!useWorktree) {
    console.log(
      JSON.stringify({
        emitted: "BOLT_STARTED",
        bolt_names: flags.name,
        batch: flags.batch,
        walking_skeleton: walkingSkeleton,
      })
    );
    return;
  }

  // --worktree path: delegate to state-fork (emits STATE_FORKED inside
  // withAuditLock; manages Bolt Refs append on main; writes worktree state
  // file). On failure, BOLT_STARTED is already in audit — emit BOLT_FAILED
  // recovery row so audit reflects the real outcome and doctor can
  // reconcile.
  const stateForkResult = spawnSibling(pd, "amadeus-state.ts", [
    "fork",
    "--slug",
    flags.slug,
    // Forwarded so the fork's telemetry marker names a unit when the swarm
    // drove this start, and a Bolt otherwise. The caller is the only side that
    // knows which — the slug alone reads the same either way.
    ...unitFlagArgs(booleans),
    ...selectorArgs(flags),
  ]);
  if (!stateForkResult.ok) {
    const reason =
      stateForkResult.signal === "SIGTERM" ? "state-fork-timeout" : "state-fork-failed";
    failBolt(pd, flags.name, flags.slug, reason, stateForkResult.stderr || stateForkResult.stdout);
    failJson(
      "start-worktree",
      flags.slug,
      reason,
      `amadeus-state fork --slug ${flags.slug} exited ${stateForkResult.status}: ${stateForkResult.stderr || stateForkResult.stdout || "(no output)"}`
    );
  }

  // Audit-fork primitive. Emits AUDIT_FORKED audit-of-intent.
  const auditForkResult = spawnSibling(pd, "amadeus-audit.ts", [
    "audit-fork",
    "--slug",
    flags.slug,
    ...selectorArgs(flags),
  ]);
  if (!auditForkResult.ok) {
    const reason =
      auditForkResult.signal === "SIGTERM" ? "audit-fork-timeout" : "audit-fork-failed";
    failBolt(pd, flags.name, flags.slug, reason, auditForkResult.stderr || auditForkResult.stdout);
    failJson(
      "start-worktree",
      flags.slug,
      reason,
      `amadeus-audit audit-fork --slug ${flags.slug} exited ${auditForkResult.status}: ${auditForkResult.stderr || auditForkResult.stdout || "(no output)"}`
    );
  }

  // Fragment-fork primitive. Byte-copies main runtime-graph.json into
  // the worktree's fragment path; one-shot guard. No audit emit — the
  // fragment lifecycle rides on the existing STATE_FORKED + AUDIT_FORKED
  // boundary.
  const fragmentForkResult = spawnSibling(pd, "amadeus-runtime.ts", [
    "fragment-fork",
    "--slug",
    flags.slug,
    ...selectorArgs(flags),
  ]);
  if (!fragmentForkResult.ok) {
    const reason =
      fragmentForkResult.signal === "SIGTERM"
        ? "fragment-fork-timeout"
        : "fragment-fork-failed";
    failBolt(
      pd,
      flags.name,
      flags.slug,
      reason,
      fragmentForkResult.stderr || fragmentForkResult.stdout
    );
    failJson(
      "start-worktree",
      flags.slug,
      reason,
      `amadeus-runtime fragment-fork --slug ${flags.slug} exited ${fragmentForkResult.status}: ${fragmentForkResult.stderr || fragmentForkResult.stdout || "(no output)"}`
    );
  }

  console.log(
    JSON.stringify({
      emitted: "BOLT_STARTED",
      bolt_names: flags.name,
      batch: flags.batch,
      walking_skeleton: walkingSkeleton,
      slug: flags.slug,
      forked: ["STATE_FORKED", "AUDIT_FORKED", "RUNTIME_GRAPH_FORKED"],
    })
  );
}

// --- Subcommand: complete ---
// Usage: amadeus-bolt complete --name <bolt-names> --batch <n>
//                            [--merge --slug <kebab-slug>]
//
// --merge: after BOLT_COMPLETED, delegates to `amadeus-state.ts merge` and
// `amadeus-audit.ts audit-merge` to
// consolidate state + audit back to main. Runs BEFORE SKILL.md Step 6.5's
// git-merge dispatch so AIDLC metadata consolidates first. Single-bolt
// only — csv batch with --merge is rejected.
function preflightCompletionMerge(
  pd: string,
  flags: Record<string, string>,
  useMerge: boolean,
): MergeRecoveryAssessment {
  if (!useMerge) return { status: "pending" };
  if (!flags.slug) error("--merge requires --slug <kebab-slug>", pd);
  if (flags.name.includes(",")) {
    error(
      `--merge requires a single bolt name; got csv: "${flags.name}". Issue one complete --merge per bolt.`,
      pd,
    );
  }
  // A held sibling must be released before any completion evidence is minted.
  if (isMergeHeld(pd, flags.slug, flags.intent, flags.space)) {
    failJson(
      "complete-merge",
      flags.slug,
      "merge-held",
      `Merge held by HOLD-MERGE invariant; resolve the failed-sibling halt-and-ask sequence and run \`amadeus-bolt release-merge --slug ${flags.slug}\` before retrying.`,
    );
  }
  const recovery = assessStateMergeRecovery(pd, flags.slug, flags.intent, flags.space);
  if (recovery.status === "invalid") {
    failJson("complete-merge", flags.slug, "state-merge-evidence-invalid", recovery.detail);
  }
  return recovery;
}

function mergeStateOrRecover(
  pd: string,
  flags: Record<string, string>,
  recovery: MergeRecoveryAssessment,
): void {
  if (recovery.status !== "pending") return;
  const result = spawnSibling(pd, "amadeus-state.ts", [
    "merge",
    "--slug",
    flags.slug,
    ...selectorArgs(flags),
  ]);
  if (result.ok) return;
  const afterFailure = assessStateMergeRecovery(pd, flags.slug, flags.intent, flags.space);
  if (afterFailure.status === "verified") return;
  const reason = result.signal === "SIGTERM" ? "state-merge-timeout" : "state-merge-failed";
  failBolt(pd, flags.name, flags.slug, reason, result.stderr || result.stdout);
  failJson(
    "complete-merge",
    flags.slug,
    reason,
    `amadeus-state merge --slug ${flags.slug} exited ${result.status}: ${result.stderr || result.stdout || "(no output)"}`,
  );
}

function mergeAuditOrRecover(pd: string, flags: Record<string, string>): void {
  const result = spawnSibling(pd, "amadeus-audit.ts", [
    "audit-merge",
    "--slug",
    flags.slug,
    ...selectorArgs(flags),
  ]);
  if (result.ok) return;
  const recovery = verifyAuditMergeRecovery(pd, flags.slug, flags.intent, flags.space);
  if (recovery.status === "verified") return;
  const reason = result.signal === "SIGTERM" ? "audit-merge-timeout" : "audit-merge-failed";
  failBolt(pd, flags.name, flags.slug, reason, result.stderr || result.stdout);
  failJson(
    "complete-merge",
    flags.slug,
    reason,
    `amadeus-audit audit-merge --slug ${flags.slug} exited ${result.status}: ${result.stderr || result.stdout || "(no output)"}`,
  );
}

function completionRecoveryFor(
  pd: string,
  flags: Record<string, string>,
  useMerge: boolean,
): MergeRecoveryAssessment {
  if (!useMerge) return { status: "pending" };
  const recovery = assessBoltCompletionRecovery(
    pd,
    flags.slug,
    flags.name,
    flags.batch,
    flags.intent,
    flags.space,
  );
  if (recovery.status === "invalid") {
    failJson("complete-merge", flags.slug, "bolt-completion-evidence-invalid", recovery.detail);
  }
  return recovery;
}

export function handleComplete(args: string[], explicitProjectDir?: string): void {
  const { booleans, rest } = splitBooleanFlags(args);
  const flags = parseFlags(rest);
  const pd = resolveBoltProjectDir(explicitProjectDir);
  if (!flags.name) error("Missing --name <bolt-name or csv>", pd);
  if (!flags.batch) error("Missing --batch <batch-number>", pd);
  if (!/^[1-9][0-9]*$/.test(flags.batch)) {
    error(`Invalid --batch: "${flags.batch}". Must be a positive integer.`, pd);
  }

  const useMerge = booleans.has("merge");
  const stateRecovery = preflightCompletionMerge(pd, flags, useMerge);

  const completionRecovery = completionRecoveryFor(pd, flags, useMerge);

  try {
    const fields: Record<string, string> = {
      "Bolt names": flags.name,
      "Batch number": flags.batch,
    };
    if (useMerge) {
      fields["Bolt slug"] = flags.slug;
    }
    if (completionRecovery.status === "pending") {
      emitAudit(pd, "BOLT_COMPLETED", fields, flags.intent, flags.space);
    }
  } catch (e) {
    if (useMerge) {
      failJson("complete-merge", flags.slug, "audit-emit-failed", errorMessage(e));
    }
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  if (!useMerge) {
    console.log(
      JSON.stringify({ emitted: "BOLT_COMPLETED", bolt_names: flags.name, batch: flags.batch })
    );
    return;
  }

  // Delegate to state-merge (emits STATE_MERGED inside withAuditLock;
  // removes slug from main's Bolt Refs; merges per-field rules from worktree).
  mergeStateOrRecover(pd, flags, stateRecovery);

  // Audit-merge primitive. Emits AUDIT_MERGED after appending the
  // worktree's post-fork delta to main audit.
  mergeAuditOrRecover(pd, flags);

  // Fragment-merge primitive. Removes the worktree's runtime-graph.json
  // fragment. Idempotent — fragment-absent is a clean no-op. The post-Bash
  // hook fires after this Bash invocation returns, sees AUDIT_MERGED in
  // the last 3 audit blocks (per amadeus-runtime-compile.ts:87), and rebuilds
  // main runtime-graph with instances[] populated for this slug.
  const fragmentMergeResult = spawnSibling(pd, "amadeus-runtime.ts", [
    "fragment-merge",
    "--slug",
    flags.slug,
    ...selectorArgs(flags),
  ]);
  if (!fragmentMergeResult.ok) {
    const reason =
      fragmentMergeResult.signal === "SIGTERM"
        ? "fragment-merge-timeout"
        : "fragment-merge-failed";
    failBolt(
      pd,
      flags.name,
      flags.slug,
      reason,
      fragmentMergeResult.stderr || fragmentMergeResult.stdout
    );
    failJson(
      "complete-merge",
      flags.slug,
      reason,
      `amadeus-runtime fragment-merge --slug ${flags.slug} exited ${fragmentMergeResult.status}: ${fragmentMergeResult.stderr || fragmentMergeResult.stdout || "(no output)"}`
    );
  }

  console.log(
    JSON.stringify({
      emitted: "BOLT_COMPLETED",
      bolt_names: flags.name,
      batch: flags.batch,
      slug: flags.slug,
      merged: ["STATE_MERGED", "AUDIT_MERGED", "RUNTIME_GRAPH_MERGED"],
    })
  );
}

// --- Subcommand: fail ---
// Usage: amadeus-bolt fail --name <failed-bolt> --error <summary>
//                        [--slug <kebab-slug>] [--succeeded-siblings <csv>]
//
// `--slug` is optional but should be passed by halt-and-ask flows so
// downstream `amadeus-worktree info --slug` can correlate the failed Bolt
// with its WORKTREE_CREATED audit entry. `--name` is the human-prose Bolt
// name; `--slug` is the kebab-case derivative threaded through worktree
// commands.
function handleFail(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.name) error("Missing --name <failed-bolt>");
  if (!flags.error) error("Missing --error <summary>");

  const pd = resolveBoltProjectDir(explicitProjectDir);
  const fields: Record<string, string> = {
    "Failed Bolt": flags.name,
    "Error summary": flags.error,
  };
  if (flags.slug) {
    fields["Bolt slug"] = flags.slug;
  }
  if (flags["succeeded-siblings"]) {
    fields["Succeeded siblings"] = flags["succeeded-siblings"];
  }

  try {
    emitAudit(pd, "BOLT_FAILED", fields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  console.log(
    JSON.stringify({ emitted: "BOLT_FAILED", failed_bolt: flags.name, error: flags.error })
  );
}

// --- Subcommand: abort ---
// Usage: amadeus-bolt abort --name <bolt-name> --slug <kebab-slug> --reason <text>
//                         [--discard]
//
// Explicit user-driven abort (Issue 75 US-1 line 51). Emits BOLT_FAILED with
// `Reason: aborted` for sub-classification — keeps the audit count stable
// vs adding a new BOLT_ABORTED event type. Distinct from `fail` (which is
// emitted by the orchestrator when code-gen returns failure).
//
// Default behaviour preserves the worktree directory for inspection. With
// --discard, calls amadeus-worktree discard --slug <slug> to tear it down
// (audit-of-intent: WORKTREE_DISCARDED emits before tear-down inside the
// discard subprocess; on discard failure, halt without state damage).
function handleAbort(args: string[], explicitProjectDir?: string): void {
  const { booleans, rest } = splitBooleanFlags(args);
  const flags = parseFlags(rest);
  if (!flags.name) error("Missing --name <bolt-name>");
  if (!flags.slug) error("Missing --slug <kebab-slug>");
  if (!flags.reason) error("Missing --reason <text>");

  const pd = resolveBoltProjectDir(explicitProjectDir);
  const useDiscard = booleans.has("discard");

  // Discard-FIRST when --discard set, audit-AFTER. If we emitted BOLT_FAILED
  // (Reason: aborted) before discard and discard then timed out / errored,
  // the audit would claim the Bolt was aborted-and-cleaned-up while the
  // worktree directory still existed on disk and the slug remained in main's
  // Bolt Refs (cleared by amadeus-worktree discard's WORKTREE_DISCARDED path).
  // Caught by post-ship 4-agent review (adversarial agent BLOCKER finding).
  // Default path (no --discard) preserves the worktree per US-1 AC line 51,
  // so emit-before-noop is safe and the ordering only matters for --discard.
  if (useDiscard) {
    const result = spawnSibling(pd, "amadeus-worktree.ts", [
      "discard",
      "--slug",
      flags.slug,
      ...selectorArgs(flags),
    ]);
    if (!result.ok) {
      const reason = result.signal === "SIGTERM" ? "discard-timeout" : "discard-failed";
      failJson(
        "abort-discard",
        flags.slug,
        reason,
        `amadeus-worktree discard --slug ${flags.slug} exited ${result.status}: ${result.stderr || result.stdout || "(no output)"}`
      );
    }
  }

  // Audit emission AFTER discard side-effect lands successfully (or no
  // side-effect requested). On audit emit failure here, the worktree is
  // already gone (if --discard) but the audit row is missing — this is
  // recoverable drift that doctor reconciles via the worktree's local
  // audit if it survived, or by orphan-worktree detection if not.
  try {
    emitAudit(pd, "BOLT_FAILED", {
      "Failed Bolt": flags.name,
      "Bolt slug": flags.slug,
      "Error summary": `aborted: ${flags.reason}`,
      Reason: "aborted",
    }, flags.intent, flags.space);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  console.log(
    JSON.stringify({
      emitted: "BOLT_FAILED",
      reason: "aborted",
      failed_bolt: flags.name,
      slug: flags.slug,
      discarded: useDiscard,
    })
  );
}

// --- Subcommand: hold-merge / release-merge ---
// Usage: amadeus-bolt hold-merge --slug <slug>
//        amadeus-bolt release-merge --slug <slug>
//
// HOLD-MERGE invariant tooling. Sets / clears the `Merge-Held` field in
// the per-Bolt forked state file at
// `<projectDir>/.amadeus/worktrees/bolt-<slug>/amadeus-docs/amadeus-state.md`.
// Idempotent — re-running hold-merge on an already-held Bolt or
// release-merge on an unheld Bolt succeeds without error. The field is
// inserted under `## Project Information` on first hold-merge so the
// current state template does not need a bump for this optional marker.
// Reads are via `isMergeHeld` below; checked in `complete --merge` to
// refuse mid-AUQ merges and exposed via `amadeus-worktree info` for
// resume-path checks.
//
// No audit emission — Merge-Held is internal coordination state, not a
// user-visible event. The audit row that matters for doctor is the
// BOLT_FAILED that opens the multi-failure sequence and the BOLT_COMPLETED
// that closes each survivor's merge once the hold lifts.
//
// Future doctor extension: orphan Merge-Held detection. Walk per-Bolt
// forked state for `Merge-Held: true`, cross-check parent batch's
// BOLT_FAILED resolution status, flag if all siblings resolved (succeeded
// retry / skipped / aborted) but `release-merge` never ran. Needs a
// workshop-resume false-positive guard — `merge_held: true` is legitimate
// mid-resume. Reads forked-state files and builds a parent-batch
// resolution graph.
function handleHoldMerge(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.slug) error("Missing --slug <kebab-slug>");
  const pd = resolveBoltProjectDir(explicitProjectDir);
  setMergeHeld(pd, flags.slug, true, flags.intent, flags.space);
  console.log(JSON.stringify({ slug: flags.slug, merge_held: true }));
}

function handleReleaseMerge(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.slug) error("Missing --slug <kebab-slug>");
  const pd = resolveBoltProjectDir(explicitProjectDir);
  setMergeHeld(pd, flags.slug, false, flags.intent, flags.space);
  console.log(JSON.stringify({ slug: flags.slug, merge_held: false }));
}

// Resolve the per-Bolt forked state file path for `slug`. Returns null when
// the worktree directory or state file is absent (a missing forked state
// file is treated as "not held" — the caller proceeds without refusal).
function forkedStateFilePath(
  pd: string,
  slug: string,
  intent?: string,
  space?: string,
): string | null {
  const wtPath = worktreePath(pd, slug);
  // Pin the worktree mirror to the SAME record the state fork wrote (null ->
  // flat legacy mirror, today's behaviour).
  const recordPrefix = relativeRecordDir(pd, intent, space);
  const wtStatePath = worktreeStateFilePath(wtPath, recordPrefix);
  if (!existsSync(wtStatePath)) return null;
  return wtStatePath;
}

function isMergeHeld(pd: string, slug: string, intent?: string, space?: string): boolean {
  const path = forkedStateFilePath(pd, slug, intent, space);
  if (!path) return false;
  const content = readFileSync(path, "utf-8");
  const value = getField(content, "Merge-Held");
  return value === "true";
}

function setMergeHeld(pd: string, slug: string, held: boolean, intent?: string, space?: string): void {
  const path = forkedStateFilePath(pd, slug, intent, space);
  if (!path) {
    error(
      `No per-Bolt forked state file for slug "${slug}" — was \`amadeus-bolt start --worktree --slug ${slug}\` run?`
    );
  }
  const content = readFileSync(path, "utf-8");
  const updated = setOrInsertField(
    content,
    "## Project Information",
    "Merge-Held",
    held ? "true" : "false",
  );
  writeFileSync(path, updated, "utf-8");
}

// --- Subcommand: dispatch-event ---
// Usage: amadeus-bolt dispatch-event --event MERGE_DISPATCH_INVOKED --slug <slug>
//                                  --practices-excerpt <text>
//        amadeus-bolt dispatch-event --event MERGE_DISPATCH_RETURNED --slug <slug>
//                                  --strategy <squash|merge|rebase>
//                                  --target <branch> --confidence <0-1>
//                                  --notes <text>
//        amadeus-bolt dispatch-event --event MERGE_DISPATCH_FALLBACK --slug <slug>
//                                  --reason <enum> --defaults <text>
//
// Wires the three MERGE_DISPATCH_* events by emitting via
// `emitAudit` per event variant. Orchestrator (SKILL.md per-Bolt
// loop) brackets each amadeus-pipeline-deploy-agent dispatch: pre-call INVOKED,
// post-call RETURNED on successful parse, FALLBACK on timeout/malformed-YAML.
//
// Emit-only contract: no state mutation, no spawn. Pure audit emission so
// doctor can reconcile orphan INVOKED rows (slug + timestamp window).
//
// t48 emitter-pairing requires a LITERAL `emitAudit(pd, "EVENT_NAME")` per
// case branch — Map indirection on the --event flag breaks the grep at
// tests/feature/t48-audit-event-emitters.sh:46-57. Three cases, three literal
// emit calls.
function handleDispatchEvent(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.event) error("Missing --event <MERGE_DISPATCH_INVOKED|MERGE_DISPATCH_RETURNED|MERGE_DISPATCH_FALLBACK>");
  if (!flags.slug) error("Missing --slug <kebab-slug>");

  const pd = resolveBoltProjectDir(explicitProjectDir);

  // Per-variant flag validation + literal emit. Fields populate per the
  // schema at audit-format.md:147-149.
  switch (flags.event) {
    case "MERGE_DISPATCH_INVOKED": {
      if (!flags["practices-excerpt"]) {
        error("MERGE_DISPATCH_INVOKED requires --practices-excerpt <text>");
      }
      const fields: Record<string, string> = {
        "Bolt slug": flags.slug,
        "Practices section excerpt": flags["practices-excerpt"],
      };
      try {
        emitAudit(pd, "MERGE_DISPATCH_INVOKED", fields);
      } catch (e) {
        error(`Audit emission failed: ${errorMessage(e)}`);
      }
      console.log(JSON.stringify({ emitted: "MERGE_DISPATCH_INVOKED", slug: flags.slug }));
      return;
    }
    case "MERGE_DISPATCH_RETURNED": {
      if (!flags.strategy) error("MERGE_DISPATCH_RETURNED requires --strategy <squash|merge|rebase>");
      if (!["squash", "merge", "rebase"].includes(flags.strategy)) {
        error(`Invalid --strategy: ${flags.strategy}. Must be squash, merge, or rebase.`);
      }
      if (!flags.target) error("MERGE_DISPATCH_RETURNED requires --target <branch>");
      if (!flags.confidence) error("MERGE_DISPATCH_RETURNED requires --confidence <0-1>");
      const conf = parseFloat(flags.confidence);
      if (Number.isNaN(conf) || conf < 0 || conf > 1) {
        error(`Invalid --confidence: ${flags.confidence}. Must be a number in [0, 1].`);
      }
      if (!flags.notes) error("MERGE_DISPATCH_RETURNED requires --notes <text>");
      const fields: Record<string, string> = {
        "Bolt slug": flags.slug,
        Strategy: flags.strategy,
        "Target branch": flags.target,
        Confidence: flags.confidence,
        Notes: flags.notes,
      };
      try {
        emitAudit(pd, "MERGE_DISPATCH_RETURNED", fields);
      } catch (e) {
        error(`Audit emission failed: ${errorMessage(e)}`);
      }
      console.log(JSON.stringify({ emitted: "MERGE_DISPATCH_RETURNED", slug: flags.slug }));
      return;
    }
    case "MERGE_DISPATCH_FALLBACK": {
      if (!flags.reason) error("MERGE_DISPATCH_FALLBACK requires --reason <enum>");
      if (!flags.defaults) error("MERGE_DISPATCH_FALLBACK requires --defaults <text>");
      const fields: Record<string, string> = {
        "Bolt slug": flags.slug,
        "Fallback reason": flags.reason,
        "Defaults applied": flags.defaults,
      };
      try {
        emitAudit(pd, "MERGE_DISPATCH_FALLBACK", fields);
      } catch (e) {
        error(`Audit emission failed: ${errorMessage(e)}`);
      }
      console.log(JSON.stringify({ emitted: "MERGE_DISPATCH_FALLBACK", slug: flags.slug }));
      return;
    }
    default:
      error(
        `Invalid --event: ${flags.event}. Must be MERGE_DISPATCH_INVOKED, MERGE_DISPATCH_RETURNED, or MERGE_DISPATCH_FALLBACK.`
      );
  }
}

// --- Subcommand: set-autonomy ---
// Usage: amadeus-bolt preview-autonomy [--policies-file <json>]
//        amadeus-bolt set-autonomy --mode none|semi|full
//          [--policies-file <json>] [--confirmed-display-digest <digest>]
//
// Commits the Intent-scoped autonomy transaction and updates both its canonical
// state projection and the compatibility Construction scheduling projection.
function readDecisionPolicyInputs(path: string | undefined): readonly DecisionPolicyInput[] {
  if (path === undefined) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    error(`Invalid --policies-file: ${errorMessage(cause)}`);
  }
  if (!Array.isArray(parsed) || !parsed.every((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
    const value = entry as Record<string, unknown>;
    return typeof value.sourceText === "string" && typeof value.selector === "string" &&
      typeof value.optionId === "string";
  })) {
    error("Invalid --policies-file: expected an array of {sourceText, selector, optionId}");
  }
  return parsed as DecisionPolicyInput[];
}

function handlePreviewAutonomy(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  const pd = resolveBoltProjectDir(explicitProjectDir);
  const result = previewProductionAutonomyGrant({
    projectDir: pd,
    stateContent: readStateFile(pd),
    policies: readDecisionPolicyInputs(flags["policies-file"]),
  });
  if (!result.ok) error(`Intent autonomy preview failed: ${result.error}`);
  console.log(JSON.stringify(result.preview));
}

function handleDecideQuestion(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.input) error("Missing --input <question-decision.json>");
  let parsed: Omit<ProductionQuestionDecisionInput, "projectDir" | "graphRevision"> & { readonly graphRevision?: string };
  try {
    parsed = JSON.parse(readFileSync(flags.input, "utf8"));
  } catch (cause) {
    error(`Invalid --input: ${errorMessage(cause)}`);
  }
  const pd = resolveBoltProjectDir(explicitProjectDir);
  const result = commitProductionQuestionDecision({
    ...parsed,
    projectDir: pd,
    graphRevision: parsed.graphRevision ?? autonomyDigest(loadStageGraph()),
  });
  console.log(JSON.stringify(result));
}

function handleObserveQuality(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.input) error("Missing --input <quality-observation.json>");
  let parsed: Omit<Parameters<typeof commitProductionQualityObservation>[0], "projectDir">;
  try {
    parsed = JSON.parse(readFileSync(flags.input, "utf8"));
  } catch (cause) {
    error(`Invalid --input: ${errorMessage(cause)}`);
  }
  const result = commitProductionQualityObservation({
    ...parsed,
    projectDir: resolveBoltProjectDir(explicitProjectDir),
  });
  if (result.kind === "error") error(`Quality observation failed: ${result.reason}`);
  console.log(JSON.stringify(result));
}

function handleResumeQuality(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.input) error("Missing --input <quality-resume.json>");
  let parsed: Omit<Parameters<typeof resumeProductionQuality>[0], "projectDir">;
  try {
    parsed = JSON.parse(readFileSync(flags.input, "utf8"));
  } catch (cause) {
    error(`Invalid --input: ${errorMessage(cause)}`);
  }
  const result = resumeProductionQuality({
    ...parsed,
    projectDir: resolveBoltProjectDir(explicitProjectDir),
  });
  if (result.kind === "error") error(`Quality resume failed: ${result.reason}`);
  console.log(JSON.stringify(result));
}

function handleListAutoDecisions(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  const state = flags.state;
  if (state !== undefined && !["not-applicable", "unreviewed", "accepted", "flagged"].includes(state)) {
    error(`Invalid --state: ${state}`);
  }
  const result = listProductionAutoDecisions({
    projectDir: resolveBoltProjectDir(explicitProjectDir),
    intent: flags.intent,
    reviewState: state as "not-applicable" | "unreviewed" | "accepted" | "flagged" | undefined,
  });
  if (!result.ok) error(`Auto-decision list failed: ${result.error}`);
  console.log(JSON.stringify(result.page));
}

// Preview-side confirmation digest. The flag-metadata normalization lives in
// ONE exported helper (normalizeReviewFlagMetadata) that the commit path's
// expected-value recomputation also calls, so the displayed digest and the
// verified digest cannot drift.
function reviewConfirmationDigest(
  targetIntentUuid: string,
  decisionId: string,
  choice: "accept" | "flag",
  classification: "contract-defect" | "specification-change" | "unspecified" | undefined,
  note: string | undefined,
): string {
  const metadata = normalizeReviewFlagMetadata({
    choice,
    flagClassification: classification ?? undefined,
    noteDigest: note !== undefined ? autonomyDigest(note) : null,
  });
  return reviewCommandContentDigest({
    targetIntentUuid,
    decisionId,
    choice,
    flagClassification: metadata.flagClassification,
    safeNoteDigest: metadata.safeNoteDigest,
  });
}

function handleGetAutoDecision(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.decision) error("Missing --decision <decision-id>");
  const result = getProductionAutoDecision({
    projectDir: resolveBoltProjectDir(explicitProjectDir),
    intent: flags.intent,
    decisionId: flags.decision,
  });
  if (!result.ok) error(`Auto-decision detail failed: ${result.error}`);
  if (flags.choice !== undefined && flags.choice !== "accept" && flags.choice !== "flag") {
    error(`Invalid --choice: ${flags.choice}. Must be 'accept' or 'flag'.`);
  }
  if (flags.choice === "accept" || flags.choice === "flag") {
    const digest = reviewConfirmationDigest(
      result.detail.intentUuid,
      flags.decision,
      flags.choice,
      flags.classification as "contract-defect" | "specification-change" | "unspecified" | undefined,
      flags.note,
    );
    console.log(JSON.stringify({ ...result.detail, confirmedReviewDigest: digest }));
    return;
  }
  console.log(JSON.stringify(result.detail));
}

function handleReviewAutoDecision(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.decision) error("Missing --decision <decision-id>");
  if (flags.choice !== "accept" && flags.choice !== "flag") error("Missing --choice <accept|flag>");
  const classification = flags.classification;
  if (classification !== undefined && !["contract-defect", "specification-change", "unspecified"].includes(classification)) {
    error(`Invalid --classification: ${classification}`);
  }
  if (!flags["confirmed-review-digest"]) {
    error("Missing --confirmed-review-digest <sha256:...> (preview it with get-auto-decision --choice)");
  }
  const result = commitProductionDecisionReview({
    projectDir: resolveBoltProjectDir(explicitProjectDir),
    intent: flags.intent,
    decisionId: flags.decision,
    choice: flags.choice,
    flagClassification: classification as "contract-defect" | "specification-change" | "unspecified" | undefined,
    note: flags.note,
    confirmedContentDigest: flags["confirmed-review-digest"],
  });
  if (!result.ok) error(`Auto-decision review failed: ${result.error}`);
  console.log(JSON.stringify(result.receipt));
}

function handleSetAutonomy(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.mode) error("Missing --mode <none|semi|full>");
  if (!["none", "semi", "full"].includes(flags.mode)) {
    error(`Invalid --mode: ${flags.mode}. Must be 'none', 'semi', or 'full'.`);
  }
  // Reported before the file is read: a mode with no carrier for policies is a
  // mismatch worth naming ahead of anything wrong inside the file itself.
  if (flags.mode === "none" && flags["policies-file"] !== undefined) error("--policies-file is not accepted with --mode none (policies have no carrier in mode none).");

  const pd = resolveBoltProjectDir(explicitProjectDir);

  if (["none", "semi", "full"].includes(flags.mode)) {
    withAuditLock(pd, () => {
      const content = readStateFile(pd);
      const applied = applyProductionAutonomyMode({
        projectDir: pd,
        stateContent: content,
        mode: flags.mode as "none" | "semi" | "full",
        policies: readDecisionPolicyInputs(flags["policies-file"]),
        confirmedDisplayDigest: flags["confirmed-display-digest"],
      });
      if (!applied.ok) error(`Intent autonomy update failed: ${applied.error}`);
      console.log(JSON.stringify({
        emitted: "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
        mode: flags.mode,
        grant_id: applied.projection.currentGrant?.grantId ?? null,
        state_updated: true,
      }));
    });
    return;
  }

  error(`Invalid --mode: ${flags.mode}. Must be 'none', 'semi', or 'full'.`);
}

// --- Subcommand: approve-batch ---
// Usage: amadeus-bolt approve-batch --batch <n>
//
// Records the human's approval at a gated swarm's BATCH-END gate (issue #1612).
// Under Intent Mode `semi` (projected as `Construction Autonomy Mode: gated`)
// the engine fans a parallel batch out and then refuses the NEXT batch until the
// finished one is approved here — one gate per batch, not one per Bolt.
// The approval is appended to the `Swarm Gated Batch Approvals` state field (a
// comma-separated list of 1-origin batch numbers, inserted under
// `## Current Status` on first use so the state template needs no bump — the
// Merge-Held precedent) and audited with the EXISTING GATE_APPROVED event; no
// new taxonomy is minted. The field name and its parser live in amadeus-lib so
// this writer and the engine's reader cannot drift.
//
// Idempotent: re-approving a batch already on the ledger is a no-op that emits
// NO second GATE_APPROVED, so a replayed command cannot inflate the audit trail.
// Validation is numeric (parse, don't validate) and runs BEFORE any emission, so
// a rejected batch number leaves neither an orphan audit row nor a state edit.
//
// The whole read->decide->emit->write section runs under withAuditLock, the same
// wrap handleSetAutonomy and every amadeus-state.ts RMW handler use: the audit
// lock emitAudit takes internally is released before writeStateFile, so only an
// outer lock serialises the state transaction (issue #2589). The inner emit does
// not self-deadlock — emitAudit branches on holdsAuditLock to the unlocked
// append when a lock is already held.
function handleApproveBatch(args: string[], explicitProjectDir?: string): void {
  const flags = parseFlags(args);
  if (!flags.batch) error("Missing --batch <n> (the 1-origin swarm batch number)");
  const batch = Number(flags.batch.trim());
  if (!Number.isInteger(batch) || batch < 1) {
    error(`Invalid --batch: ${flags.batch}. Must be a positive integer (batch numbers are 1-origin).`);
  }

  const pd = resolveBoltProjectDir(explicitProjectDir);
  withAuditLock(pd, () => {
    const content = readStateFile(pd);
    const approved = parseApprovedSwarmBatches(content);
    if (approved.includes(batch)) {
      console.log(JSON.stringify({ batch, already_approved: true, state_updated: false }));
      return;
    }

    const next = [...approved, batch].sort((a, b) => a - b);
    const updated = setOrInsertField(
      content,
      "## Current Status",
      SWARM_BATCH_APPROVALS_FIELD,
      next.join(", "),
    );

    // Audit-first (the handleSetAutonomy precedent): the state edit is already
    // computed, so an audit failure aborts before the ledger diverges from it.
    try {
      emitAudit(pd, "GATE_APPROVED", {
        Stage: getField(content, "Current Stage") ?? "code-generation",
        "Swarm batch": String(batch),
        "User Input": `approve-batch --batch ${batch}`,
      });
    } catch (e) {
      error(`Audit emission failed: ${errorMessage(e)}`);
    }

    writeStateFile(pd, updated);

    console.log(
      JSON.stringify({
        emitted: "GATE_APPROVED",
        batch,
        approved_batches: next,
        state_updated: true,
      })
    );
  });
}

// --- CLI entry point ---

let projectDir: string | undefined;

function resolveBoltProjectDir(explicitProjectDir?: string): string {
  return resolveProjectDir(explicitProjectDir ?? projectDir);
}

export function handleBoltCommand(
  subcommand: string | undefined,
  args: string[],
  explicitProjectDir?: string,
): void {
  if (handleAutonomySupportCommand(subcommand, args, explicitProjectDir)) return;
  switch (subcommand) {
    case "start":
      handleStart(args, explicitProjectDir);
      return;
    case "complete":
      handleComplete(args, explicitProjectDir);
      return;
    case "fail":
      handleFail(args, explicitProjectDir);
      return;
    case "abort":
      handleAbort(args, explicitProjectDir);
      return;
    case "approve-batch":
      handleApproveBatch(args, explicitProjectDir);
      return;
    case "dispatch-event":
      handleDispatchEvent(args, explicitProjectDir);
      return;
    case "hold-merge":
      handleHoldMerge(args, explicitProjectDir);
      return;
    case "release-merge":
      handleReleaseMerge(args, explicitProjectDir);
      return;
    default:
      error(
        `Unknown subcommand: ${subcommand}. Valid: start, complete, fail, abort, preview-autonomy, set-autonomy, decide-question, observe-quality, resume-quality, list-auto-decisions, get-auto-decision, review-auto-decision, approve-batch, dispatch-event, hold-merge, release-merge`,
        explicitProjectDir,
      );
  }
}

function handleAutonomySupportCommand(
  subcommand: string | undefined,
  args: string[],
  explicitProjectDir?: string,
): boolean {
  const handlers: Readonly<Record<string, (values: string[], project?: string) => void>> = {
    "set-autonomy": handleSetAutonomy,
    "preview-autonomy": handlePreviewAutonomy,
    "decide-question": handleDecideQuestion,
    "observe-quality": handleObserveQuality,
    "resume-quality": handleResumeQuality,
    "list-auto-decisions": handleListAutoDecisions,
    "get-auto-decision": handleGetAutoDecision,
    "review-auto-decision": handleReviewAutoDecision,
  };
  const handler = subcommand === undefined ? undefined : handlers[subcommand];
  if (handler === undefined) return false;
  handler(args, explicitProjectDir);
  return true;
}

export function main(rawArgs: string[] = process.argv.slice(2)): void {

  const filteredArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
      projectDir = rawArgs[i + 1];
      i++;
    } else {
      filteredArgs.push(rawArgs[i]);
    }
  }

  const subcommand = filteredArgs[0];

  try {
    if (subcommand === "start") {
  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
      try {
        initProcessObservability(`tool:amadeus-bolt:${subcommand}`, resolveProjectDir(projectDir));
      } catch {
        // no resolvable workflow -> nothing to observe
      }
    }
    handleBoltCommand(subcommand, filteredArgs.slice(1), projectDir);
  } catch (e) {
    error(errorMessage(e));
  }
}

function error(msg: string, explicitProjectDir?: string): never {
  const pd = resolveProjectDir(explicitProjectDir ?? projectDir);
  const command = `amadeus-bolt ${process.argv.slice(2).join(" ")}`.trim();
  emitError(pd, "amadeus-bolt", command, msg);
}

// Emit BOLT_FAILED for partial-progress recovery in --worktree / --merge
// flows. Best-effort: a failure in the audit emit itself shouldn't mask the
// original error reason, so swallow and let failJson surface the cause.
function failBolt(
  pd: string,
  name: string,
  slug: string,
  reasonEnum: string,
  detail: string
): void {
  try {
    emitAudit(pd, "BOLT_FAILED", {
      "Failed Bolt": name,
      "Bolt slug": slug,
      "Error summary": `${reasonEnum}: ${detail}`,
    });
  } catch {
    /* noop — original error will surface via failJson next */
  }
}

// Print failure-envelope shape and exit non-zero. Distinct from error() above
// (which calls emitError → ERROR_LOGGED audit). This shape is consumed by
// the orchestrator's halt-and-ask prose to render machine-readable failure.
function failJson(
  stage:
    | "start-worktree"
    | "complete-merge"
    | "abort-discard"
    | "hold-merge"
    | "release-merge",
  slug: string,
  reasonEnum: string,
  detail: string
): never {
  const envelope = {
    ok: false,
    slug,
    stage,
    reason: reasonEnum,
    detail,
  };
  console.log(JSON.stringify(envelope));
  process.exit(1);
}

if (import.meta.main) {
  main();
}
