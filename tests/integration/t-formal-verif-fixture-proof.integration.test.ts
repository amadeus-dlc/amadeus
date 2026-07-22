import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RawProcessOutcome } from "../../scripts/formal-verif/execution-evidence.ts";
import { createIndependentFallingProof, type GitProofPort, type ProofProcessPort } from "../../scripts/formal-verif/fixture-proof.ts";
import { createDefectUniverse } from "../../scripts/formal-verif/fixture-registry-domain.ts";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes).trim();
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

describe("formal verification temporary Git falling proof", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  test("binds an isolated direct-parent patch using a closed Git invocation", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-proof-git-")); roots.push(root);
    const repository = join(root, "repository"); const baselineWorktree = join(root, "baseline"); const injectedWorktree = join(root, "injected"); mkdirSync(repository);
    const git = realpathSync(Bun.which("git")!);
    const run = (args: string[], cwd = repository) => { const result = spawnSync(git, args, { cwd, env: { PATH: process.env.PATH ?? "", LC_ALL: "C" } }); if (result.status !== 0) throw new Error(decode(result.stderr)); return decode(result.stdout); };
    run(["init", "--object-format=sha256"]); run(["config", "user.name", "Fixture Test"]); run(["config", "user.email", "fixture@example.invalid"]);
    writeFileSync(join(repository, "mode.txt"), "healthy\n"); run(["add", "mode.txt"]); run(["commit", "-m", "baseline"]); const baselineSha = run(["rev-parse", "HEAD"]);
    run(["worktree", "add", "--detach", baselineWorktree, baselineSha]); run(["worktree", "add", "-b", "fixture", injectedWorktree, baselineSha]);
    writeFileSync(join(injectedWorktree, "mode.txt"), "injected\n"); run(["add", "mode.txt"], injectedWorktree); run(["commit", "-m", "inject"], injectedWorktree); const injectionSha = run(["rev-parse", "HEAD"], injectedWorktree);
    const patchBytes = spawnSync(git, ["-c", "core.hooksPath=/dev/null", "diff", "--binary", "--no-ext-diff", "--no-textconv", baselineSha, injectionSha], { cwd: injectedWorktree, env: { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" } }).stdout;
    const patchIdentity = hash(patchBytes); const hunk = { path: "mode.txt", oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, hunkHash: patchIdentity };
    const universe = createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "git-proof", baselineSha, rows: Array.from({ length: 7 }, (_, index) => ({ defectId: `D${index}`, predicateId: `P${index}`, sourceRefs: [`issues/${1252 + index}`], fixCommit: index === 0 ? injectionSha : (index + 1).toString(16).repeat(64), baselineSha, targetRegression: `target-${index}`, nonTargetRegressions: [`other-${index}`], patchIdentity: index === 0 ? patchIdentity : "b".repeat(64), allowedHunks: [index === 0 ? hunk : { ...hunk, path: `other-${index}` }], affectedPaths: [index === 0 ? "mode.txt" : `other-${index}`], rootCluster: `R${Math.min(index + 1, 5)}`, proofIdentity: (index + 1).toString(16).repeat(64) })) });
    if (!universe.ok) throw new Error(universe.error.message); const row = universe.value.rows[0]!;
    const processPort: ProofProcessPort = { execute: async (request): Promise<RawProcessOutcome> => { const injected = readFileSync(join(request.cwd, "mode.txt"), "utf8").startsWith("injected"); const target = request.phase.endsWith("TARGET") && !request.phase.includes("NON_TARGET"); const exitCode = injected && target ? 1 : 0; return { exitCode, signal: null, stdout: new TextEncoder().encode(request.phase.includes("NON_TARGET") ? "same" : exitCode === 0 ? "green" : "red"), stderr: new Uint8Array(), timedOut: false, completedExploration: true, toolVersions: { git: run(["--version"]).replace("git version ", "") } }; } };
    const inspectionPort: GitProofPort = { inspect: async (request) => {
      expect(request.environment).toEqual({ GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" });
      const closed = (args: string[]) => { const result = spawnSync(git, ["-c", "core.hooksPath=/dev/null", ...args], { cwd: injectedWorktree, env: request.environment }); if (result.status !== 0) throw new Error(decode(result.stderr)); return decode(result.stdout); };
      const parents = closed(["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").slice(1);
      return { baselineSha, baselineTreeHash: closed(["rev-parse", `${baselineSha}^{tree}`]), injectionSha: closed(["rev-parse", "HEAD"]), parentShas: parents, treeHash: closed(["rev-parse", "HEAD^{tree}"]), patchIdentity, changedHunks: [hunk] };
    } };
    const result = await createIndependentFallingProof({ row, repositoryRoot: root, baselineWorktree, injectedWorktree, executableIdentity: hash(git), testIdentity: "5".repeat(64), argv: ["bun", "test", "target"], artifactRefs: ["evidence/git-proof.json"], deadlineMs: 120_000 }, { process: processPort, git: inspectionPort });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.injectionSha).toBe(injectionSha);
    expect(result.ok && result.value.baselineTree).toBe(run(["rev-parse", `${baselineSha}^{tree}`]));
  });
});
