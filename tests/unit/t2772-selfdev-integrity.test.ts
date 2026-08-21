// t2772 — self-development intent-birth integrity policy.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ABSENT_BASE_MARKER,
  SELFDEV_INTEGRITY_RELATIVE_PATH,
  digestDirectory,
  digestRuntimeTools,
  evaluateSelfDevelopmentIntegrity,
  writeSelfDevelopmentIntegrityAttestation,
  type SelfDevelopmentIntegrityAttestation,
  type SelfDevelopmentIntegrityContext,
  type SelfDevelopmentIntegrityDeps,
} from "../../packages/framework/core/tools/amadeus-selfdev-integrity.ts";

const HEAD = "a".repeat(40);
const ORIGIN_MAIN = "b".repeat(40);

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t2772-"));
  roots.push(root);
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  mkdirSync(join(root, ".claude", "tools"), { recursive: true });
  writeFileSync(join(root, "packages", "framework", "core", "tools", "engine.ts"), "same\n");
  writeFileSync(join(root, ".claude", "tools", "engine.ts"), "same\n");
  mkdirSync(join(root, ".amadeus"), { recursive: true });
  return root;
}

function context(projectDir: string, scope = "self-fix"): SelfDevelopmentIntegrityContext {
  return {
    projectDir,
    scope,
    selfDevelopmentWorkspace: true,
    runtimeHarness: ".claude",
  };
}

function gitDeps(overrides: Partial<Record<string, { status: number; stdout?: string; stderr?: string }>> = {}) {
  const calls: string[][] = [];
  const deps: SelfDevelopmentIntegrityDeps = {
    runGit: (_projectDir, args) => {
      calls.push([...args]);
      const key = args.join(" ");
      const override = overrides[key];
      if (override) return { status: override.status, stdout: override.stdout ?? "", stderr: override.stderr ?? "" };
      if (key === "fetch origin") return { status: 0, stdout: "", stderr: "" };
      if (key === "rev-parse HEAD") return { status: 0, stdout: `${HEAD}\n`, stderr: "" };
      if (key === "rev-parse refs/remotes/origin/main") return { status: 0, stdout: `${ORIGIN_MAIN}\n`, stderr: "" };
      if (key === "merge-base --is-ancestor refs/remotes/origin/main HEAD") return { status: 0, stdout: "", stderr: "" };
      throw new Error(`unexpected git command: ${key}`);
    },
  };
  return { deps, calls };
}

function writeAttestation(root: string, patch: Partial<SelfDevelopmentIntegrityAttestation> = {}): void {
  const sourceDigest = digestDirectory(join(root, "packages", "framework", "core", "tools"));
  const sourceRoot = join(root, "packages", "framework", "core", "tools");
  const runtimeDigest = digestRuntimeTools(join(root, ".claude", "tools"), sourceRoot);
  const value: SelfDevelopmentIntegrityAttestation = {
    schemaVersion: 1,
    targetHead: HEAD,
    observedOriginMain: ORIGIN_MAIN,
    buildStatus: "success",
    builtAt: "2026-08-21T00:00:00.000Z",
    sourceDigest,
    runtimeDigests: { ".claude": runtimeDigest },
    ...patch,
  };
  writeFileSync(join(root, SELFDEV_INTEGRITY_RELATIVE_PATH), `${JSON.stringify(value, null, 2)}\n`);
}

function blocked(decision: ReturnType<typeof evaluateSelfDevelopmentIntegrity>) {
  expect(decision.kind).toBe("blocked");
  if (decision.kind !== "blocked") throw new Error("expected blocked decision");
  return decision;
}

describe("t2772 self-development integrity policy", () => {
  test("is not applicable to non-self scopes", () => {
    const root = project();
    const { deps, calls } = gitDeps();
    const decision = evaluateSelfDevelopmentIntegrity(context(root, "feature"), deps);
    expect(decision.kind).toBe("allowed");
    expect(decision.evaluations[0]?.verdict.kind).toBe("not-applicable");
    expect(calls).toEqual([]);
  });

  test("allows a current attestation after a fresh fetch and ancestor check", () => {
    const root = project();
    writeAttestation(root);
    const { deps } = gitDeps();
    const decision = evaluateSelfDevelopmentIntegrity(context(root), deps);
    expect(decision.kind).toBe("allowed");
  });

  test("refuses a missing attestation with the exact build regeneration command", () => {
    const root = project();
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("self-development build attestation is missing");
    expect(`${decision.refusal.reason} ${decision.refusal.recovery ?? ""}`).toContain("bun run build");
  });

  test("refuses stale target evidence", () => {
    const root = project();
    writeAttestation(root, { targetHead: "c".repeat(40) });
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("targets");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("refuses source/runtime digest mismatch", () => {
    const root = project();
    writeFileSync(join(root, ".claude", "tools", "engine.ts"), "runtime drift\n");
    writeAttestation(root);
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("source/runtime");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("turns fetch failure into an unknown refusal", () => {
    const root = project();
    writeAttestation(root);
    const { deps } = gitDeps({ "fetch origin": { status: 1, stderr: "network unavailable" } });
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.reason).toContain("git fetch origin");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("refuses when the freshly fetched origin/main is not an ancestor", () => {
    const root = project();
    writeAttestation(root);
    const { deps } = gitDeps({
      "merge-base --is-ancestor refs/remotes/origin/main HEAD": {
        status: 1,
        stderr: "not ancestor",
      },
    });
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("origin/main is not an ancestor");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("refuses malformed evidence", () => {
    const root = project();
    writeFileSync(join(root, SELFDEV_INTEGRITY_RELATIVE_PATH), "{broken\n");
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("malformed");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("refuses a well-formed JSON object with an invalid attestation schema", () => {
    const root = project();
    writeAttestation(root, { schemaVersion: 2 as unknown as 1 });
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("malformed");
  });

  test("refuses an attestation written without an origin/main binding", () => {
    const root = project();
    writeAttestation(root, { observedOriginMain: ABSENT_BASE_MARKER });
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("origin/main binding is absent");
    expect(decision.refusal.recovery).toContain("bun run build");
  });

  test("is not applicable when the repository is not self-development", () => {
    const root = project();
    const { deps } = gitDeps();
    const decision = evaluateSelfDevelopmentIntegrity({ ...context(root), selfDevelopmentWorkspace: false }, deps);
    expect(decision.evaluations[0]?.verdict.kind).toBe("not-applicable");
  });

  test("supports exact-file and directory-prefix digest exclusions", () => {
    const root = project();
    mkdirSync(join(root, "packages", "framework", "core", "tools", "generated"));
    writeFileSync(join(root, "packages", "framework", "core", "tools", "generated", "ignored.ts"), "ignored\n");
    const tools = join(root, "packages", "framework", "core", "tools");
    const digest = digestDirectory(tools, new Set(["engine.ts", "generated/"]));
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("refuses an attestation whose runtime digest is absent", () => {
    const root = project();
    writeAttestation(root, { runtimeDigests: {} });
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("no runtime digest for .claude");
  });

  test("refuses a digest recorded before source drift", () => {
    const root = project();
    writeAttestation(root);
    writeFileSync(join(root, "packages", "framework", "core", "tools", "engine.ts"), "source drift\n");
    const { deps } = gitDeps();
    const decision = blocked(evaluateSelfDevelopmentIntegrity(context(root), deps));
    expect(decision.refusal.reason).toContain("attestation is stale");
  });

  test("writes a build attestation atomically for the selected runtime", () => {
    const root = project();
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["update-ref", "refs/remotes/origin/main", head], { cwd: root });
    writeSelfDevelopmentIntegrityAttestation(root, [".claude"], () => new Date("2026-08-21T00:00:00.000Z"));
    const attestation = JSON.parse(
      readFileSync(join(root, SELFDEV_INTEGRITY_RELATIVE_PATH), "utf8"),
    ) as SelfDevelopmentIntegrityAttestation;
    expect(attestation.targetHead).toBe(head);
    expect(attestation.observedOriginMain).toBe(head);
    expect(attestation.runtimeDigests[".claude"]).toBe(attestation.sourceDigest);
  });

  test("maps unresolved git refs, ancestry errors, and runtime errors to unknown", () => {
    const root = project();
    writeAttestation(root);
    const missingHead = gitDeps({ "rev-parse HEAD": { status: 1, stderr: "missing" } });
    expect(blocked(evaluateSelfDevelopmentIntegrity(context(root), missingHead.deps)).blockingKind).toBe("unknown");
    const ancestryError = gitDeps({ "merge-base --is-ancestor refs/remotes/origin/main HEAD": { status: 2, stderr: "git error" } });
    expect(blocked(evaluateSelfDevelopmentIntegrity(context(root), ancestryError.deps)).blockingKind).toBe("unknown");
    rmSync(join(root, ".claude", "tools", "engine.ts"));
    expect(blocked(evaluateSelfDevelopmentIntegrity(context(root), gitDeps().deps)).blockingKind).toBe("unknown");
  });

  test("refuses an origin mismatch and build-time runtime mismatch", () => {
    const root = project();
    writeAttestation(root);
    const originMismatch = gitDeps({ "rev-parse refs/remotes/origin/main": { status: 0, stdout: `${"d".repeat(40)}\n` } });
    expect(blocked(evaluateSelfDevelopmentIntegrity(context(root), originMismatch.deps)).refusal.reason).toContain("observed origin/main");
    writeFileSync(join(root, ".claude", "tools", "engine.ts"), "runtime drift\n");
    expect(() => writeSelfDevelopmentIntegrityAttestation(root, [".claude"])).toThrow("source/runtime digest mismatch");
  });

  test("fails loudly when build attestation git refs cannot be resolved", () => {
    const root = project();
    expect(() => writeSelfDevelopmentIntegrityAttestation(root, [".claude"])).toThrow("cannot resolve HEAD");
  });

  test("writes an absent-base marker when origin/main is unavailable", () => {
    const root = project();
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
    writeSelfDevelopmentIntegrityAttestation(root, [".claude"], () => new Date("2026-08-21T00:00:00.000Z"));
    const attestation = JSON.parse(
      readFileSync(join(root, SELFDEV_INTEGRITY_RELATIVE_PATH), "utf8"),
    ) as SelfDevelopmentIntegrityAttestation;
    expect(attestation.observedOriginMain).toBe(ABSENT_BASE_MARKER);
  });
});
