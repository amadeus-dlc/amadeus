import { realpathSync } from "node:fs";
import { relative } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import type { RawProcessOutcome } from "./execution-evidence.ts";
import type { AllowedHunk, DefectRow, RegistryError } from "./fixture-registry-domain.ts";
import type { Result } from "./contract.ts";

export type ProofPhase = "BASELINE_TARGET" | "BASELINE_NON_TARGET" | "INJECTED_TARGET" | "INJECTED_NON_TARGET";
export interface ProofProcessRequest {
  phase: ProofPhase;
  argv: readonly string[];
  cwd: string;
  environment: Readonly<Record<string, string>>;
  deadlineMs: number;
  executableIdentity: string;
  testIdentity: string;
}
export interface ProofProcessPort { execute(request: ProofProcessRequest): Promise<RawProcessOutcome> }

export interface GitBranchInspection {
  baselineSha: string;
  baselineTreeHash: string;
  injectionSha: string;
  parentShas: readonly string[];
  treeHash: string;
  patchIdentity: string;
  changedHunks: readonly AllowedHunk[];
}
export interface GitProofPort {
  inspect(request: { repositoryRoot: string; baselineWorktree: string; injectedWorktree: string; argv: readonly string[]; environment: Readonly<Record<string, string>>; deadlineMs: number }): Promise<GitBranchInspection>;
}

export interface IndependentFallingProof {
  proofId: string;
  rowIdentity: string;
  baselineTree: string;
  injectedTree: string;
  injectionSha: string;
  commandIdentity: string;
  baselineReceipt: string;
  injectedReceipt: string;
  nonTargetReceipt: string;
  branchIdentity: string;
  artifactRefs: readonly string[];
}
const ISSUED_PROOFS = new WeakSet<IndependentFallingProof>();

const SHA = /^[0-9a-f]{64}$/;
const CLOSED_ENV = Object.freeze({ GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" });
const safeRef = (value: string) => value.length > 0 && !value.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) && !value.split(/[\\/]/).includes("..");
const fail = (kind: "ProofError" | "BranchIsolationError", message: string, cause?: string): Result<never, RegistryError> => ({ ok: false, error: { kind, message, cause } });

function contained(root: string, candidate: string): boolean {
  try {
    const rel = relative(realpathSync(root), realpathSync(candidate));
    return rel === "" || (!rel.startsWith("..") && !/^[\\/]/.test(rel));
  } catch { return false; }
}

function receipt(outcome: RawProcessOutcome): string {
  return canonicalIdentity({
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    stdoutHash: canonicalIdentity(Array.from(outcome.stdout), "amadeus.formal-verif.proof-stdout.v1").sha256,
    stderrHash: canonicalIdentity(Array.from(outcome.stderr), "amadeus.formal-verif.proof-stderr.v1").sha256,
    timedOut: outcome.timedOut,
    completedExploration: outcome.completedExploration,
    toolVersions: outcome.toolVersions,
  }, "amadeus.formal-verif.proof-outcome.v1").sha256;
}

function completed(outcome: RawProcessOutcome, expected: "GREEN" | "RED"): boolean {
  if (outcome.timedOut || outcome.signal !== null || !outcome.completedExploration || outcome.exitCode === null) return false;
  return expected === "GREEN" ? outcome.exitCode === 0 : outcome.exitCode > 0;
}

function sameHunk(left: AllowedHunk, right: AllowedHunk): boolean {
  return left.path === right.path && left.oldStart === right.oldStart && left.oldLines === right.oldLines && left.newStart === right.newStart && left.newLines === right.newLines && left.hunkHash === right.hunkHash;
}

export function verifyFixtureBranch(row: DefectRow, inspection: GitBranchInspection): Result<string, RegistryError> {
  if ([inspection.baselineSha, inspection.baselineTreeHash, inspection.injectionSha, inspection.treeHash, inspection.patchIdentity].some((value) => !SHA.test(value))) return fail("BranchIsolationError", "branch inspection contains an invalid identity");
  if (inspection.baselineSha !== row.baselineSha || inspection.parentShas.length !== 1 || inspection.parentShas[0] !== row.baselineSha) return fail("BranchIsolationError", "fixture injection must have the healthy baseline as its only parent");
  if (inspection.patchIdentity !== row.patchIdentity || inspection.changedHunks.length === 0 || inspection.changedHunks.some((actual) => !row.allowedHunks.some((allowed) => sameHunk(actual, allowed)))) return fail("BranchIsolationError", "actual diff escapes the canonical allowed hunk set");
  if (new Set(inspection.changedHunks.map((hunk) => canonicalIdentity(hunk).sha256)).size !== inspection.changedHunks.length) return fail("BranchIsolationError", "actual diff repeats a hunk");
  return { ok: true, value: canonicalIdentity(inspection, "amadeus.formal-verif.fixture-branch.v1").sha256 };
}

export function verifyIndependentFallingProof(row: DefectRow, proof: IndependentFallingProof): Result<void, RegistryError> {
  const { proofId, ...body } = proof;
  if (!ISSUED_PROOFS.has(proof) || proof.rowIdentity !== row.rowIdentity || proofId !== row.proofIdentity || canonicalIdentity(body, "amadeus.formal-verif.falling-proof.v1").sha256 !== proofId) return fail("ProofError", "falling proof was not issued by the verified proof runner");
  return { ok: true, value: undefined };
}

export async function createIndependentFallingProof(input: {
  row: DefectRow;
  repositoryRoot: string;
  baselineWorktree: string;
  injectedWorktree: string;
  executableIdentity: string;
  testIdentity: string;
  argv: readonly string[];
  artifactRefs: readonly string[];
  deadlineMs: number;
}, dependencies: { process: ProofProcessPort; git: GitProofPort }): Promise<Result<IndependentFallingProof, RegistryError>> {
  if (!contained(input.repositoryRoot, input.baselineWorktree) || !contained(input.repositoryRoot, input.injectedWorktree)) return fail("ProofError", "proof worktrees must be repository-contained");
  if (![input.executableIdentity, input.testIdentity].every((value) => SHA.test(value)) || !Number.isFinite(input.deadlineMs) || input.deadlineMs <= 0 || input.argv.length === 0 || input.argv.some((arg) => !arg || arg.includes("\0"))) return fail("ProofError", "proof command identity, argv, or deadline is invalid");
  if (input.artifactRefs.length === 0 || input.artifactRefs.some((ref) => !safeRef(ref)) || new Set(input.artifactRefs).size !== input.artifactRefs.length) return fail("ProofError", "raw artifact references must be unique repository paths");
  const commandIdentity = canonicalIdentity({ argv: input.argv, environment: CLOSED_ENV, executableIdentity: input.executableIdentity, testIdentity: input.testIdentity }, "amadeus.formal-verif.proof-command.v1").sha256;
  const phases: readonly ProofPhase[] = ["BASELINE_TARGET", "BASELINE_NON_TARGET", "INJECTED_TARGET", "INJECTED_NON_TARGET"];
  const outcomes = new Map<ProofPhase, RawProcessOutcome>();
  try {
    for (const phase of phases) {
      const cwd = phase.startsWith("BASELINE") ? input.baselineWorktree : input.injectedWorktree;
      outcomes.set(phase, await dependencies.process.execute({ phase, argv: [...input.argv], cwd, environment: CLOSED_ENV, deadlineMs: input.deadlineMs, executableIdentity: input.executableIdentity, testIdentity: input.testIdentity }));
    }
  } catch (cause) { return fail("ProofError", "proof process failed", cause instanceof Error ? cause.message : String(cause)); }
  const baselineTarget = outcomes.get("BASELINE_TARGET")!;
  const baselineNonTarget = outcomes.get("BASELINE_NON_TARGET")!;
  const injectedTarget = outcomes.get("INJECTED_TARGET")!;
  const injectedNonTarget = outcomes.get("INJECTED_NON_TARGET")!;
  if (!completed(baselineTarget, "GREEN") || !completed(baselineNonTarget, "GREEN")) return fail("ProofError", "target and non-target regressions must be green at baseline");
  if (!completed(injectedTarget, "RED")) return fail("ProofError", "candidate patch must independently make the target regression red");
  if (!completed(injectedNonTarget, "GREEN") || receipt(baselineNonTarget) !== receipt(injectedNonTarget)) return fail("ProofError", "candidate patch changed a non-target regression");
  const versions = canonicalIdentity(baselineTarget.toolVersions).sha256;
  if ([baselineNonTarget, injectedTarget, injectedNonTarget].some((item) => canonicalIdentity(item.toolVersions).sha256 !== versions)) return fail("ProofError", "proof tool identity drifted between runs");
  let inspection: GitBranchInspection;
  try { inspection = await dependencies.git.inspect({ repositoryRoot: input.repositoryRoot, baselineWorktree: input.baselineWorktree, injectedWorktree: input.injectedWorktree, argv: ["git", "rev-list", "diff-tree"], environment: CLOSED_ENV, deadlineMs: input.deadlineMs }); }
  catch (cause) { return fail("BranchIsolationError", "Git inspection failed", cause instanceof Error ? cause.message : String(cause)); }
  const branch = verifyFixtureBranch(input.row, inspection);
  if (!branch.ok) return branch;
  const draft = { rowIdentity: input.row.rowIdentity, baselineTree: inspection.baselineTreeHash, injectedTree: inspection.treeHash, injectionSha: inspection.injectionSha, commandIdentity, baselineReceipt: receipt(baselineTarget), injectedReceipt: receipt(injectedTarget), nonTargetReceipt: receipt(injectedNonTarget), branchIdentity: branch.value, artifactRefs: [...input.artifactRefs] };
  const proof = { ...draft, proofId: canonicalIdentity(draft, "amadeus.formal-verif.falling-proof.v1").sha256 };
  ISSUED_PROOFS.add(proof);
  return { ok: true, value: proof };
}
