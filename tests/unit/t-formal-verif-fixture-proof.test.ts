import { describe, expect, test } from "bun:test";
import type { RawProcessOutcome } from "../../scripts/formal-verif/execution-evidence.ts";
import { createIndependentFallingProof, verifyIndependentFallingProof, type GitProofPort, type ProofProcessPort } from "../../scripts/formal-verif/fixture-proof.ts";
import type { DefectRow } from "../../scripts/formal-verif/fixture-registry-domain.ts";

const sha = (char: string) => char.repeat(64);
const hunk = { path: "src/fix.ts", oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, hunkHash: sha("c") };
const row: DefectRow = { defectId: "D1", predicateId: "P1", sourceRefs: ["issues/1252"], fixCommit: sha("1"), baselineSha: sha("a"), targetRegression: "target", nonTargetRegressions: ["other"], patchIdentity: sha("b"), allowedHunks: [hunk], affectedPaths: [hunk.path], rootCluster: "R1", proofIdentity: sha("d"), rowIdentity: sha("e") };
const outcome = (exitCode: number, text: string): RawProcessOutcome => ({ exitCode, signal: null, stdout: new TextEncoder().encode(text), stderr: new Uint8Array(), timedOut: false, completedExploration: true, toolVersions: { bun: "1.3.13" } });
const validProcess = (): ProofProcessPort => ({ execute: async (request) => request.phase === "INJECTED_TARGET" ? outcome(1, "red") : outcome(0, request.phase.includes("NON_TARGET") ? "same" : "green") });
const validGit = (): GitProofPort => ({ inspect: async () => ({ baselineSha: sha("a"), baselineTreeHash: sha("6"), injectionSha: sha("2"), parentShas: [sha("a")], treeHash: sha("3"), patchIdentity: sha("b"), changedHunks: [hunk] }) });
const run = (process = validProcess(), git = validGit()) => createIndependentFallingProof({ row, repositoryRoot: ".", baselineWorktree: ".", injectedWorktree: ".", executableIdentity: sha("4"), testIdentity: sha("5"), argv: ["bun", "test"], artifactRefs: ["evidence/proof.json"], deadlineMs: 100 }, { process, git });

describe("formal verification falling proof", () => {
  test("mints proof only for green baseline, isolated target red, and unchanged non-targets", async () => {
    const requests: Parameters<ProofProcessPort["execute"]>[0][] = [];
    const process: ProofProcessPort = { execute: async (request) => { requests.push(request); return validProcess().execute(request); } };
    const result = await run(process);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.proofId).toMatch(/^[0-9a-f]{64}$/);
    expect(requests.every((request) => request.environment.LC_ALL === "C" && request.environment.GIT_CONFIG_NOSYSTEM === "1" && !("PATH" in request.environment))).toBe(true);
    if (!result.ok) throw new Error("setup");
    const closedRow = { ...row, proofIdentity: result.value.proofId };
    expect(verifyIndependentFallingProof(closedRow, result.value).ok).toBe(true);
    expect(verifyIndependentFallingProof(closedRow, { ...result.value }).ok).toBe(false);
  });

  test.each([
    ["baseline red", "BASELINE_TARGET", outcome(1, "red")],
    ["target non-red", "INJECTED_TARGET", outcome(0, "green")],
    ["non-target ripple", "INJECTED_NON_TARGET", outcome(0, "drift")],
    ["timeout", "INJECTED_TARGET", { ...outcome(1, "red"), timedOut: true }],
    ["signal", "INJECTED_TARGET", { ...outcome(1, "red"), exitCode: null, signal: "SIGTERM" }],
  ] as const)("rejects %s", async (_name, phase, replacement) => {
    const process: ProofProcessPort = { execute: async (request) => request.phase === phase ? replacement : validProcess().execute(request) };
    expect((await run(process)).ok).toBe(false);
  });

  test.each([
    ["wrong parent", { parentShas: [sha("f")] }],
    ["merge commit", { parentShas: [sha("a"), sha("f")] }],
    ["hunk escape", { changedHunks: [{ ...hunk, path: "src/other.ts" }] }],
    ["patch drift", { patchIdentity: sha("f") }],
  ])("rejects %s", async (_name, override) => {
    const base = await validGit().inspect({ repositoryRoot: ".", baselineWorktree: ".", injectedWorktree: ".", argv: [], environment: {}, deadlineMs: 1 });
    const git: GitProofPort = { inspect: async () => ({ ...base, ...override }) };
    expect((await run(validProcess(), git)).ok).toBe(false);
  });

  test("rejects tool identity drift across proof runs", async () => {
    const process: ProofProcessPort = { execute: async (request) => request.phase === "INJECTED_NON_TARGET" ? { ...outcome(0, "same"), toolVersions: { bun: "drift" } } : validProcess().execute(request) };
    expect((await run(process)).ok).toBe(false);
  });
});
