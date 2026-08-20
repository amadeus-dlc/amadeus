// t2772 — the real intent-birth path applies the self-development gate.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanupTestProject, REPO_ROOT, removeWorkspaceRecord, setupIntegrationProject } from "../harness/fixtures.ts";
import { writeSelfDevelopmentIntegrityAttestation } from "../../packages/framework/core/tools/amadeus-selfdev-integrity.ts";

const BUN = process.execPath;
const UTILITY = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    if (root.includes("amadeus-t2772-selfdev-")) rmSync(root, { recursive: true, force: true });
    else cleanupTestProject(root);
  }
});

function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr ?? result.stdout ?? "").trim()}`);
  }
}

function selfDevelopmentProject(): string {
  const root = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  temporaryRoots.push(root);
  cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), join(root, "packages", "framework", "core", "tools"), {
    recursive: true,
  });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts", "promote-self.ts"), "// self-development marker\n");
  writeFileSync(join(root, "README.md"), "seed\n");
  git(root, ["init", "-q"]);
  git(root, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(root, ["config", "user.email", "t@x"]);
  git(root, ["config", "user.name", "t"]);
  git(root, ["add", "README.md", "scripts", "packages", ".claude", "amadeus"]);
  git(root, ["commit", "-qm", "seed self-development workspace"]);
  const remote = mkdtempSync(join(tmpdir(), "amadeus-t2772-selfdev-"));
  temporaryRoots.push(remote);
  git(remote, ["init", "--bare", "-q"]);
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "-q", "-u", "origin", "main"]);
  writeSelfDevelopmentIntegrityAttestation(root, [".claude"]);
  return root;
}

function runBirth(root: string): { status: number; output: string } {
  const result = spawnSync(BUN, [UTILITY, "intent-birth", "--scope", "self-fix", "--project-dir", root], {
    cwd: root,
    encoding: "utf-8",
    env: { ...process.env, AMADEUS_DEFAULT_SCOPE: "" },
  });
  return { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function workspaceEntries(root: string): string[] {
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  return existsSync(intents) ? readdirSync(intents).sort() : [];
}

describe("t2772 self-development intent-birth gate", () => {
  test("allows a consistent self-fix birth through the real CLI path", () => {
    const root = selfDevelopmentProject();
    const result = runBirth(root);
    expect(result.status, result.output).toBe(0);
    expect(workspaceEntries(root).some((entry) => entry.includes("self-fix"))).toBe(true);
  });

  test("refuses a stale target before minting any intent state", () => {
    const root = selfDevelopmentProject();
    const before = workspaceEntries(root);
    writeFileSync(join(root, "README.md"), "advanced after build\n");
    git(root, ["add", "README.md"]);
    git(root, ["commit", "-qm", "advance after build evidence"]);

    const result = runBirth(root);
    expect(result.status).toBe(1);
    expect(result.output).toContain("bun run build");
    expect(result.output).toContain("HEAD");
    expect(workspaceEntries(root)).toEqual(before);
  });

  test("keeps ordinary feature birth behavior unchanged outside self-development", () => {
    const root = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    temporaryRoots.push(root);
    removeWorkspaceRecord(root);
    const result = spawnSync(BUN, [UTILITY, "intent-birth", "--scope", "feature", "--project-dir", root], {
      cwd: root,
      encoding: "utf-8",
    });
    expect(result.status).toBe(0);
  });
});
