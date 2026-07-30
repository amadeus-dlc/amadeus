import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicationMain } from "../../scripts/metrics-publication.ts";
import {
  MaintenanceCliPort,
  SnapshotCliPort,
  systemCommandRunner,
} from "../../scripts/metrics-publication-github.ts";

const BOT_LOGIN = "amadeus-metrics[bot]";
const REPOSITORY = "amadeus-dlc/amadeus";
const ROOT = join(import.meta.dir, "../..");

function run(cwd: string, command: string[], env: Record<string, string> = {}): string {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`${command.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function fakeGhSource(): string {
  return String.raw`#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const statePath = process.env.FAKE_GH_STATE;
if (!statePath) throw new Error("FAKE_GH_STATE is required");
const state = JSON.parse(readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
const git = (...gitArgs) => {
  const result = spawnSync("git", gitArgs, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
const option = (name) => args[args.indexOf(name) + 1];

if (args[0] === "pr" && args[1] === "list") {
  const head = option("--head");
  process.stdout.write(JSON.stringify(state.pullRequests.filter((candidate) => candidate.headRefName === head)));
} else if (args[0] === "pr" && args[1] === "create") {
  git("fetch", "--no-tags", "origin", "main");
  const head = option("--head");
  const oid = git("ls-remote", "--heads", "origin", "refs/heads/" + head).split(/\s+/)[0];
  const files = git("diff", "--numstat", "origin/main", oid, "--", "metrics/")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, path] = line.split("\t");
      return { path, additions: Number(additions), deletions: Number(deletions) };
    });
  const number = state.nextNumber++;
  const url = "https://example.test/pull/" + number;
  state.pullRequests.push({
    number,
    url,
    state: "OPEN",
    mergeStateStatus: "CLEAN",
    mergedAt: null,
    headRefName: head,
    headRefOid: oid,
    headRepository: { nameWithOwner: "amadeus-dlc/amadeus" },
    author: { login: "amadeus-metrics[bot]" },
    title: option("--title"),
    body: option("--body"),
    files,
  });
  writeFileSync(statePath, JSON.stringify(state));
  process.stdout.write(url);
} else if (args[0] === "pr" && args[1] === "merge") {
  const url = args.at(-1);
  const pullRequest = state.pullRequests.find((candidate) => candidate.url === url);
  if (!pullRequest) throw new Error("unknown pull request " + url);
  git("push", "origin", pullRequest.headRefOid + ":refs/heads/main");
  git("push", "origin", ":refs/heads/" + pullRequest.headRefName);
  pullRequest.state = "MERGED";
  pullRequest.mergedAt = new Date().toISOString();
  state.merges++;
  writeFileSync(statePath, JSON.stringify(state));
} else if (args[0] === "pr" && args[1] === "close") {
  const pullRequest = state.pullRequests.find((candidate) => candidate.url === args[2]);
  if (!pullRequest) throw new Error("unknown pull request " + args[2]);
  pullRequest.state = "CLOSED";
  writeFileSync(statePath, JSON.stringify(state));
} else if (args[0] === "api" && args.some((arg) => arg.endsWith("/dispatches"))) {
  state.dispatches++;
  writeFileSync(statePath, JSON.stringify(state));
} else {
  throw new Error("unsupported fake gh command: " + args.join(" "));
}
`;
}

function snapshotWriterSource(): string {
  return String.raw`import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const sha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const metrics = "metrics";
mkdirSync(metrics, { recursive: true });
const path = metrics + "/2026-07-30T00-00-00-000Z-" + sha.slice(0, 12) + ".json";
writeFileSync(path, JSON.stringify({ schema_version: 1, captured_at: "2026-07-30T00:00:00.000Z", commit: sha, collectors: {} }, null, 2) + "\n");
console.log("OK 0 collectors " + path);
`;
}

describe.serial("t222 metrics publication hermetic Git/GitHub boundary", () => {
  let temporaryRoot = "";
  let remote = "";
  let repository = "";
  let statePath = "";
  let originalPath = "";

  beforeEach(() => {
    temporaryRoot = mkdtempSync(join(tmpdir(), "amadeus-metrics-publication-"));
    remote = join(temporaryRoot, "remote.git");
    repository = join(temporaryRoot, "work");
    statePath = join(temporaryRoot, "gh-state.json");
    const seed = join(temporaryRoot, "seed");
    const bin = join(temporaryRoot, "bin");
    mkdirSync(seed);
    mkdirSync(bin);
    run(temporaryRoot, ["git", "init", "--bare", remote]);
    run(seed, ["git", "init", "-b", "main"]);
    run(seed, ["git", "config", "user.name", BOT_LOGIN]);
    run(seed, ["git", "config", "user.email", "metrics@example.test"]);
    mkdirSync(join(seed, "metrics"));
    mkdirSync(join(seed, "scripts"));
    writeFileSync(join(seed, "metrics/index.html"), "<!doctype html><title>empty</title>\n");
    writeFileSync(join(seed, "scripts/metrics-snapshot.ts"), snapshotWriterSource());
    for (const file of ["metrics-timeseries.ts", "metrics-retention.ts", "metrics-visualize.ts"]) {
      cpSync(join(ROOT, "scripts", file), join(seed, "scripts", file));
    }
    writeFileSync(join(seed, "README.md"), "seed\n");
    run(seed, ["git", "add", "."]);
    run(seed, ["git", "commit", "-m", "seed"]);
    run(seed, ["git", "remote", "add", "origin", remote]);
    run(seed, ["git", "push", "-u", "origin", "main"]);
    run(temporaryRoot, ["git", "--git-dir", remote, "symbolic-ref", "HEAD", "refs/heads/main"]);
    run(temporaryRoot, ["git", "clone", remote, repository]);
    run(repository, ["git", "config", "user.name", BOT_LOGIN]);
    run(repository, ["git", "config", "user.email", "metrics@example.test"]);
    writeFileSync(statePath, JSON.stringify({ nextNumber: 1, pullRequests: [], dispatches: 0, merges: 0 }));
    const fakeGh = join(bin, "gh");
    writeFileSync(fakeGh, fakeGhSource());
    chmodSync(fakeGh, 0o755);
    originalPath = process.env.PATH ?? "";
    process.env.PATH = `${bin}:${originalPath}`;
    process.env.FAKE_GH_STATE = statePath;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    delete process.env.FAKE_GH_STATE;
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  function headSha(): string {
    return run(repository, ["git", "rev-parse", "origin/main"]);
  }

  async function publishSnapshot(sha: string): Promise<number> {
    return publicationMain(
      [
        "snapshot",
        "--target-sha",
        sha,
        "--repository",
        REPOSITORY,
        "--bot-login",
        BOT_LOGIN,
        "--deadline-seconds",
        "10",
        "--poll-seconds",
        "1",
      ],
      { repoRoot: repository },
    );
  }

  function addMainCommit(label: string): string {
    run(repository, ["git", "fetch", "origin", "main"]);
    run(repository, ["git", "switch", "-C", "main", "origin/main"]);
    writeFileSync(join(repository, "README.md"), `${label}\n`);
    run(repository, ["git", "add", "README.md"]);
    run(repository, ["git", "commit", "-m", label]);
    run(repository, ["git", "push", "origin", "main"]);
    run(repository, ["git", "fetch", "origin", "main"]);
    return headSha();
  }

  function addSnapshotJson(commitSha: string): void {
    run(repository, ["git", "fetch", "origin", "main"]);
    run(repository, ["git", "switch", "-C", "main", "origin/main"]);
    const path = `metrics/2026-07-30T12-00-00-000Z-${commitSha.slice(0, 12)}.json`;
    writeFileSync(
      join(repository, path),
      `${JSON.stringify({ schema_version: 1, captured_at: "2026-07-30T12:00:00.000Z", commit: commitSha, collectors: {} }, null, 2)}\n`,
    );
    run(repository, ["git", "add", path]);
    run(repository, ["git", "commit", "-m", `snapshot ${commitSha}`]);
    run(repository, ["git", "push", "origin", "main"]);
    run(repository, ["git", "fetch", "origin", "main"]);
  }

  function pushSnapshotBranch(commitSha: string): string {
    run(repository, ["git", "switch", "--detach", commitSha]);
    run(repository, ["bun", "scripts/metrics-snapshot.ts", "--write"]);
    run(repository, ["git", "add", "metrics/"]);
    run(repository, ["git", "commit", "-m", `snapshot branch ${commitSha}`]);
    const branch = `metrics/snapshot-${commitSha}`;
    run(repository, ["git", "push", "origin", `HEAD:refs/heads/${branch}`]);
    return branch;
  }

  test("same SHA three times stays one JSON and resends maintenance dispatch", async () => {
    const sha = headSha();
    expect(await publishSnapshot(sha)).toBe(0);
    expect(await publishSnapshot(sha)).toBe(0);
    expect(await publishSnapshot(sha)).toBe(0);
    run(repository, ["git", "fetch", "origin", "main"]);
    const jsonFiles = run(repository, ["git", "ls-tree", "-r", "--name-only", "origin/main", "--", "metrics/"])
      .split("\n")
      .filter((file) => file.endsWith(".json"));
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    expect(jsonFiles).toHaveLength(1);
    expect(state.pullRequests).toHaveLength(1);
    expect(state.dispatches).toBe(3);
  }, 30_000);

  test("three different SHAs do not conflict and maintenance converges to one stable branch generation", async () => {
    for (const label of ["change-one", "change-two", "change-three"]) {
      expect(await publishSnapshot(addMainCommit(label))).toBe(0);
    }
    expect(
      await publicationMain(
        [
          "maintenance",
          "--repository",
          REPOSITORY,
          "--bot-login",
          BOT_LOGIN,
          "--deadline-seconds",
          "10",
          "--poll-seconds",
          "1",
        ],
        { repoRoot: repository },
      ),
    ).toBe(0);
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    const maintenancePullRequests = state.pullRequests.filter(
      (pullRequest: { headRefName: string }) => pullRequest.headRefName === "metrics/maintenance",
    );
    expect(maintenancePullRequests).toHaveLength(1);
    expect(run(repository, ["git", "ls-remote", "--heads", "origin", "refs/heads/metrics/maintenance"])).toBe("");
  }, 30_000);

  test("human-owned branch-only candidate fails closed without deletion", async () => {
    const sha = addMainCommit("human-candidate");
    run(repository, ["git", "switch", "--detach", sha]);
    run(repository, ["git", "config", "user.name", "Human"]);
    const path = `metrics/2026-07-30T00-00-00-000Z-${sha.slice(0, 12)}.json`;
    writeFileSync(
      join(repository, path),
      `${JSON.stringify({ schema_version: 1, captured_at: "2026-07-30T00:00:00.000Z", commit: sha, collectors: {} }, null, 2)}\n`,
    );
    run(repository, ["git", "add", path]);
    run(repository, ["git", "commit", "-m", "human snapshot"]);
    const branch = `metrics/snapshot-${sha}`;
    run(repository, ["git", "push", "origin", `HEAD:refs/heads/${branch}`]);
    run(repository, ["git", "config", "user.name", BOT_LOGIN]);
    expect(await publishSnapshot(sha)).toBe(1);
    expect(run(repository, ["git", "ls-remote", "--heads", "origin", `refs/heads/${branch}`])).toContain(branch);
  }, 30_000);

  test("maintenance reconciliation ignores snapshots landed after its cutoff", async () => {
    const targetSha = addMainCommit("cutoff-target");
    expect(await publishSnapshot(targetSha)).toBe(0);
    const cutoffSha = headSha();
    expect(
      await publicationMain(
        [
          "maintenance",
          "--repository",
          REPOSITORY,
          "--bot-login",
          BOT_LOGIN,
          "--deadline-seconds",
          "10",
          "--poll-seconds",
          "1",
        ],
        { repoRoot: repository },
      ),
    ).toBe(0);
    const laterTarget = addMainCommit("after-cutoff-target");
    addSnapshotJson(laterTarget);

    const port = new MaintenanceCliPort({
      repoRoot: repository,
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
      runner: systemCommandRunner,
    });
    const observation = await port.reconcile(cutoffSha);
    expect(observation.inventory.hasDiff).toBe(false);
    expect(observation.mainSha).not.toBe(cutoffSha);
  }, 30_000);

  test("snapshot branch ownership ignores snapshots added to main after the branch point", async () => {
    const targetSha = addMainCommit("snapshot-branch-target");
    const branch = pushSnapshotBranch(targetSha);
    const laterTarget = addMainCommit("snapshot-after-branch");
    addSnapshotJson(laterTarget);

    const port = new SnapshotCliPort({
      repoRoot: repository,
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
      targetSha,
      runner: systemCommandRunner,
    });
    const inventory = await port.inventory();
    expect(inventory.problems).toEqual([]);
    expect(inventory.branches).toHaveLength(1);
    expect(inventory.branches[0]).toMatchObject({
      name: branch,
      ownership: { ok: true },
      files: [{ status: "A" }],
    });
  }, 30_000);

  test("maintenance publish never stages an untracked snapshot JSON", async () => {
    const targetSha = addMainCommit("maintenance-untracked-target");
    addSnapshotJson(targetSha);
    const port = new MaintenanceCliPort({
      repoRoot: repository,
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
      runner: systemCommandRunner,
    });
    const preparation = await port.prepare();
    expect(preparation.inventory.hasDiff).toBe(true);
    writeFileSync(join(repository, "metrics/untracked.json"), "{}\n");

    const result = await port.publish(preparation);
    expect(result.kind).toBe("published");
    const staged = spawnSync("git", ["cat-file", "-e", "HEAD:metrics/untracked.json"], {
      cwd: repository,
      encoding: "utf8",
    });
    expect(staged.status).not.toBe(0);
  }, 30_000);
});
