import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authorizeExecution, verifyAuthorizedProcessRequest } from "../../scripts/formal-verif/execution-policy.ts";

describe("formal verification execution policy", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  function workspace() {
    const root = mkdtempSync(join(tmpdir(), "fv-execution-policy-"));
    roots.push(root);
    mkdirSync(join(root, "bin"), { recursive: true });
    mkdirSync(join(root, "inputs"), { recursive: true });
    writeFileSync(join(root, "bin/tool"), "tool-v1");
    writeFileSync(join(root, "inputs/public.json"), "{}\n");
    const executableHash = createHash("sha256").update("tool-v1").digest("hex");
    return { root, executableHash };
  }

  test("authorizes a frozen repository input as a read-only snapshot", () => {
    const { root, executableHash } = workspace();
    const result = authorizeExecution({
      repositoryRoot: root,
      snapshotRoot: join(root, ".snapshots"),
      executable: { path: "bin/tool", version: "1.0.0", sha256: executableHash },
      allowedEnvironmentKeys: ["LANG"],
      allowedPathPrefixes: ["bin", "inputs"],
    }, {
      revisionIdentity: "9".repeat(64),
      argv: ["bin/tool", "--input", "inputs/public.json"],
      cwd: ".",
      environment: { LANG: "C" },
      inputPaths: ["inputs/public.json"],
      outputPath: "outputs/cell",
      arm: "tla",
      subject: "HEALTHY_BASELINE",
      armSha: "a".repeat(64),
      baselineSha: "b".repeat(64),
      inputSetHash: "c".repeat(64),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.argv).toEqual(["bin/tool", "--input", "inputs/public.json"]);
      expect(result.value.snapshotIdentity).toMatch(/^[0-9a-f]{64}$/);
      expect(result.value.environment).toEqual({ LANG: "C" });
      expect(result.value.argv[0]).toBe("bin/tool");
      expect(result.value.cwd).toBe(".");
      expect(result.value.snapshotFiles.map((file) => file.path)).toEqual(["bin/tool", "inputs/public.json"]);
    }
  });

  test.each([
    ["wrong executable", { argv: ["bin/other"] }],
    ["empty argument", { argv: ["bin/tool", ""] }],
    ["NUL argument", { argv: ["bin/tool", "bad\0arg"] }],
    ["output traversal", { outputPath: "../outside" }],
    ["absolute output", { outputPath: "/tmp/out" }],
    ["invalid arm SHA", { armSha: "A".repeat(64) }],
    ["invalid input hash", { inputSetHash: "short" }],
    ["unknown environment", { environment: { PATH: "/tmp" } }],
    ["credential environment", { environment: { TOKEN: "secret" } }],
  ])("rejects %s before spawn", (_name, override) => {
    const { root, executableHash } = workspace();
    const request = {
      revisionIdentity: "9".repeat(64), argv: ["bin/tool"], cwd: ".", environment: {}, inputPaths: ["inputs/public.json"], outputPath: "outputs/cell",
      arm: "tla" as const, subject: "HEALTHY_BASELINE", armSha: "a".repeat(64), baselineSha: "b".repeat(64), inputSetHash: "c".repeat(64),
      ...override,
    };
    expect(authorizeExecution({ repositoryRoot: root, snapshotRoot: join(root, ".snapshots"), executable: { path: "bin/tool", version: "1.0.0", sha256: executableHash }, allowedEnvironmentKeys: ["LANG"], allowedPathPrefixes: ["bin", "inputs"] }, request).ok).toBe(false);
  });

  test("rejects executable content drift", () => {
    const { root } = workspace();
    const result = authorizeExecution({ repositoryRoot: root, snapshotRoot: join(root, ".snapshots"), executable: { path: "bin/tool", version: "1.0.0", sha256: "f".repeat(64) }, allowedEnvironmentKeys: [], allowedPathPrefixes: ["bin", "inputs"] }, { revisionIdentity: "9".repeat(64), argv: ["bin/tool"], cwd: ".", environment: {}, inputPaths: ["inputs/public.json"], outputPath: "outputs/cell", arm: "tla", subject: "HEALTHY_BASELINE", armSha: "a".repeat(64), baselineSha: "b".repeat(64), inputSetHash: "c".repeat(64) });
    expect(result.ok).toBe(false);
  });

  test("rejects a snapshot changed after authorization", () => {
    const { root, executableHash } = workspace();
    const result = authorizeExecution({ repositoryRoot: root, snapshotRoot: join(root, ".snapshots"), executable: { path: "bin/tool", version: "1.0.0", sha256: executableHash }, allowedEnvironmentKeys: [], allowedPathPrefixes: ["bin", "inputs"] }, { revisionIdentity: "9".repeat(64), argv: ["bin/tool"], cwd: ".", environment: {}, inputPaths: ["inputs/public.json"], outputPath: "outputs/cell", arm: "tla", subject: "HEALTHY_BASELINE", armSha: "a".repeat(64), baselineSha: "b".repeat(64), inputSetHash: "c".repeat(64) });
    if (!result.ok) throw new Error("setup");
    chmodSync(join(result.value.snapshotRoot, "inputs/public.json"), 0o600);
    writeFileSync(join(result.value.snapshotRoot, "inputs/public.json"), "tampered");
    expect(verifyAuthorizedProcessRequest(result.value).ok).toBe(false);
  });

  test("rejects request-coordinate drift after authorization", () => {
    const { root, executableHash } = workspace();
    const result = authorizeExecution({ repositoryRoot: root, snapshotRoot: join(root, ".snapshots"), executable: { path: "bin/tool", version: "1.0.0", sha256: executableHash }, allowedEnvironmentKeys: [], allowedPathPrefixes: ["bin", "inputs"] }, { revisionIdentity: "9".repeat(64), argv: ["bin/tool"], cwd: ".", environment: {}, inputPaths: ["inputs/public.json"], outputPath: "outputs/cell", arm: "tla", subject: "HEALTHY_BASELINE", armSha: "a".repeat(64), baselineSha: "b".repeat(64), inputSetHash: "c".repeat(64) });
    if (!result.ok) throw new Error("setup");
    expect(verifyAuthorizedProcessRequest({ ...result.value, outputPath: "outputs/other" }).ok).toBe(false);
    expect(verifyAuthorizedProcessRequest({ ...result.value, cwd: "inputs" }).ok).toBe(false);
  });
});
