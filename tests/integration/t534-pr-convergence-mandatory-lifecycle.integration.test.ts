// covers: file:plugins/pr-convergence/tools/pr-convergence-cli.ts, file:plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateReportFormat } from "../../plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts";
import { reportPathFor, runCli, type CliSeams } from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";
import type { GhSpawn } from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import type { GitSpawn } from "../../plugins/pr-convergence/tools/pr-convergence-git-runner.ts";

const roots: string[] = [];
afterEach(() => { while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true }); });

function fixture(): { root: string; record: string; body: string; sha: string } {
  const root = mkdtempSync(join(tmpdir(), "t534-self-")); roots.push(root);
  const record = join(root, "amadeus/spaces/default/intents/260812-pr-gate");
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(join(root, "amadeus/spaces/default/intents/intents.json"), JSON.stringify([
    { slug: "pr-gate", uuid: "uuid-2838", dirName: "260812-pr-gate", status: "in-flight" },
  ]));
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n");
  const body = join(root, "body.md"); writeFileSync(body, "## Summary\n\nIssue 2838.\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "t534@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "t534"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  return { root, record, body, sha };
}

function git(sha: string, dirty = false): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const stdout = key === "branch --show-current" ? "feature/2838\n"
      : key.startsWith("rev-parse") ? `${sha}\n`
      : key.startsWith("diff --name-only") ? "plugins/pr-convergence/tool.ts\n"
      : key.startsWith("status") ? (dirty ? " M tracked.ts\n" : "")
      : key.startsWith("ls-remote") ? `${sha}\trefs/heads/feature/2838\n` : "";
    return { code: 0, stdout, stderr: "" };
  };
}

function gh(sha: string, calls: string[][], provenance?: { title: string; body: string }): GhSpawn {
  return async (argv) => {
    calls.push([...argv]);
    const text = argv.join(" ");
    if (text.includes("--version")) return { code: 0, stdout: "gh version", stderr: "" };
    if (text.includes("auth status")) return { code: 0, stdout: "ok", stderr: "" };
    if (text.includes("pr create")) return { code: 0, stdout: "https://github.com/amadeus-dlc/amadeus/pull/2838\n", stderr: "" };
    if (text.includes("reviewThreads")) {
      return { code: 0, stdout: readFileSync(join(import.meta.dir, "../fixtures/pr-convergence/measured-pr-2268.graphql.json"), "utf-8"), stderr: "" };
    }
    return { code: 0, stdout: JSON.stringify({ data: { repository: { pullRequest: {
      mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", state: "OPEN", headRefOid: sha,
      title: provenance?.title ?? "", body: provenance?.body ?? "",
    } } } }), stderr: "" };
  };
}

function seams(record: string, sha: string, calls: string[][], dirty = false, provenance?: { title: string; body: string }): CliSeams {
  return {
    ghSpawn: gh(sha, calls, provenance), gitSpawn: git(sha, dirty), sleep: async () => undefined,
    now: () => "2026-08-12T00:00:00Z", emitDecision: async () => ({ code: 0, stderr: "" }),
    emitAttestation: async (argv) => {
      const attributes: Record<string, string> = { Event: "ARTIFACT_ATTESTED" };
      for (let i = 0; i < argv.length; i += 1) if (argv[i] === "--field") {
        const value = argv[++i] ?? ""; const at = value.indexOf("="); attributes[value.slice(0, at)] = value.slice(at + 1);
      }
      writeFileSync(join(record, "audit", "attestation.jsonl"), `${JSON.stringify({ attributes })}\n`, { flag: "a" });
      return { code: 0, stderr: "" };
    },
    fireSensor: async () => ({ code: 0, stderr: "" }),
  };
}

describe("t534 self delivery lifecycle", () => {
  test("create writes an attested created report and fires no GitHub mutation when prerequisites fail", async () => {
    const f = fixture(); const calls: string[][] = [];
    const args = ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
      "--title", "fix: gate", "--body-file", f.body, "--record", f.record, "--bolt", "delivery", "--unit", "cli"];
    const refused = await runCli(args, seams(f.record, f.sha, calls, true));
    expect(refused.exitCode).toBe(1);
    expect(calls).toEqual([]);

    const accepted = await runCli(args, seams(f.record, f.sha, calls));
    expect(accepted.exitCode).toBe(0);
    const report = reportPathFor(f.record, "cli");
    expect(existsSync(report)).toBe(true);
    expect(readFileSync(report, "utf-8")).toContain("- kind: created");
    expect(evaluateReportFormat(report, "code-generation")).toMatchObject({ pass: true, reason: "created" });
    expect(evaluateReportFormat(report, "pr-convergence")).toMatchObject({ pass: false, reason: "created" });
  });

  test("advances created to converged, is idempotent, and rejects tampered bytes", async () => {
    const f = fixture(); const calls: string[][] = [];
    const createArgs = ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
      "--title", "fix: gate", "--body-file", f.body, "--record", f.record, "--bolt", "delivery", "--unit", "cli"];
    expect((await runCli(createArgs, seams(f.record, f.sha, calls))).exitCode).toBe(0);
    const provenance = {
      title: "[pr-gate/delivery/cli] fix: gate",
      body: "## Summary\n\nIssue 2838.\n\n## Amadeus Work\n\n" +
        "- Intent: `pr-gate`\n- Bolt: `delivery`\n- Unit: `cli`\n" +
        "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2838`\n",
    };
    const reportArgs = ["report", "--repo", "amadeus-dlc/amadeus", "--pr", "2838", "--unit", "cli", "--record", f.record];
    const first = await runCli(reportArgs, seams(f.record, f.sha, calls, false, provenance));
    expect(first.exitCode).toBe(0);
    const report = reportPathFor(f.record, "cli");
    expect(readFileSync(report, "utf-8")).toContain("- kind: converged");
    const beforeAudit = readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8");
    expect((await runCli(reportArgs, seams(f.record, f.sha, calls, false, provenance))).exitCode).toBe(0);
    expect(readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8")).toBe(beforeAudit);

    writeFileSync(report, readFileSync(report, "utf-8").replace("- converged: true", "- converged: false"));
    const tampered = await runCli(reportArgs, seams(f.record, f.sha, calls, false, provenance));
    expect(tampered.exitCode).toBe(1);
    expect(tampered.stderr).toContain("tampered");
  });
});
