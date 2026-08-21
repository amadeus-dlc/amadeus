// covers: file:plugins/github-pr-convergence/tools/pr-convergence-cli.ts, file:plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateReportFormat } from "../../plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts";
import { parseAttestation } from "../../plugins/github-pr-convergence/tools/pr-convergence-attestation.ts";
import { reportPathFor, runCli, type CliSeams } from "../../plugins/github-pr-convergence/tools/pr-convergence-cli.ts";
import type { GhSpawn } from "../../plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts";
import type { GitSpawn } from "../../plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts";
import {
  projectDeliveryBoltPlan,
  projectEngineSingletonDeliveryBolt,
} from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";
import { compile as compileRuntime } from "../../packages/framework/core/tools/amadeus-runtime.ts";
import { deliveryEvidenceCoverageRefusal } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { loadGraph } from "../../packages/framework/core/tools/amadeus-graph.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(
  import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "data", "stage-graph.json",
);

const roots: string[] = [];
afterEach(() => { while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true }); });

type Scope = "self-fix" | "self-feature" | "self-refactor" | "self-document";

function fixture(scope: Scope): { root: string; record: string; body: string; sha: string } {
  const root = mkdtempSync(join(tmpdir(), "t534-self-")); roots.push(root);
  const record = join(root, "amadeus/spaces/default/intents/260812-pr-gate");
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(join(root, "amadeus/spaces/default/intents/intents.json"), JSON.stringify([
    { slug: "pr-gate", uuid: "uuid-2838", dirName: "260812-pr-gate", scope, status: "in-flight" },
  ]));
  writeFileSync(join(record, "amadeus-state.md"), `- **Scope**: ${scope}\n`);
  const body = join(root, "body.md"); writeFileSync(body, "## Summary\n\nIssue 2838.\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "t534@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "t534"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  return { root, record, body, sha };
}

function writeEngineSingletonCarrier(f: ReturnType<typeof fixture>): void {
  const state = `# AI-DLC State Tracking

## Project Information
- **Scope**: self-fix
- **State Version**: 7

## Stage Progress
- [S] units-generation — SKIP
- [S] delivery-planning — SKIP
- [-] code-generation — EXECUTE
`;
  writeFileSync(join(f.record, "amadeus-state.md"), state);
  mkdirSync(join(f.record, "construction", "pr-gate"), { recursive: true });
  compileRuntime({ projectDir: f.root });
  const graph = JSON.parse(readFileSync(join(f.record, "runtime-graph.json"), "utf-8"));
  if (graph.delivery_bolts?.authority !== "engine-singleton") {
    throw new Error("runtime compile must write engine singleton projection");
  }
}

function engineCreateArgs(
  f: ReturnType<typeof fixture>,
  units = "pr-gate",
  bolt = "pr-gate",
): string[] {
  return [
    "create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
    "--title", "fix: singleton", "--body-file", f.body, "--record", f.record,
    "--bolt", bolt, "--unit", "pr-gate",
    ...(units === "pr-gate" ? [] : ["--units", units]),
  ];
}

function setEngineProjectionField(f: ReturnType<typeof fixture>, field: string, value: unknown): void {
  const path = join(f.record, "runtime-graph.json");
  const graph = JSON.parse(readFileSync(path, "utf-8"));
  graph.delivery_bolts[field] = value;
  writeFileSync(path, JSON.stringify(graph));
}

function git(sha: string, dirty = false, branch = "feature/2838"): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const stdout = key === "branch --show-current" ? `${branch}\n`
      : key.startsWith("rev-parse") ? `${sha}\n`
      : key.startsWith("diff --name-only") ? "plugins/github-pr-convergence/tool.ts\n"
      : key.startsWith("status") ? (dirty ? " M tracked.ts\n" : "")
      : key.startsWith("ls-remote") ? `${sha}\trefs/heads/${branch}\n` : "";
    return { code: 0, stdout, stderr: "" };
  };
}

function gh(
  sha: string,
  calls: string[][],
  provenance?: { title: string; body: string },
  target: { pr: number; branch: string } = { pr: 2838, branch: "feature/2838" },
): GhSpawn {
  return async (argv) => {
    calls.push([...argv]);
    const text = argv.join(" ");
    if (text.includes("--version")) return { code: 0, stdout: "gh version", stderr: "" };
    if (text.includes("auth status")) return { code: 0, stdout: "ok", stderr: "" };
    if (text.includes("pr create")) return { code: 0, stdout: `https://github.com/amadeus-dlc/amadeus/pull/${target.pr}\n`, stderr: "" };
    if (text.includes("reviewThreads")) {
      return { code: 0, stdout: readFileSync(join(import.meta.dir, "../fixtures/pr-convergence/measured-pr-2268.graphql.json"), "utf-8"), stderr: "" };
    }
    return { code: 0, stdout: JSON.stringify({ data: { repository: { pullRequest: {
      mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", state: "OPEN", headRefOid: sha,
      headRefName: target.branch,
      title: provenance?.title ?? "", body: provenance?.body ?? "",
    } } } }), stderr: "" };
  };
}

function seams(
  record: string,
  sha: string,
  calls: string[][],
  dirty = false,
  provenance?: { title: string; body: string },
  target: { pr: number; branch: string } = { pr: 2838, branch: "feature/2838" },
): CliSeams {
  return {
    ghSpawn: gh(sha, calls, provenance, target), gitSpawn: git(sha, dirty, target.branch), sleep: async () => undefined,
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

function writeDeliveryPlan(record: string, body: string): void {
  mkdirSync(join(record, "inception", "delivery-planning"), { recursive: true });
  writeFileSync(join(record, "inception", "delivery-planning", "bolt-plan.md"), body);
  const projected = projectDeliveryBoltPlan(body);
  if (!projected.ok) throw new Error(projected.message);
  writeFileSync(join(record, "runtime-graph.json"), `${JSON.stringify({ delivery_bolts: projected.projection }, null, 2)}\n`);
}

const SCOPES: readonly [Scope][] = [["self-fix"], ["self-feature"], ["self-refactor"], ["self-document"]];

describe.each(SCOPES)("t534 self delivery lifecycle (scope=%s)", (scope) => {
  test("create writes an attested created report and fires no GitHub mutation when prerequisites fail", async () => {
    const f = fixture(scope); const calls: string[][] = [];
    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
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
    const f = fixture(scope); const calls: string[][] = [];
    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
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

describe("t534 multi-Unit Bolt delivery lifecycle", () => {
  test("active self-fix singleton compiles authority and passes create, status, report, and completion", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeEngineSingletonCarrier(f);
    expect((await runCli(engineCreateArgs(f), seams(f.record, f.sha, calls))).exitCode).toBe(0);

    const provenance = {
      title: "[pr-gate/pr-gate/pr-gate] fix: singleton",
      body: "## Summary\n\nIssue 2838.\n\n## Amadeus Work\n\n" +
        "- Intent: `pr-gate`\n- Bolt: `pr-gate`\n- Unit: `pr-gate`\n" +
        "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2838`\n",
    };
    const statusArgs = ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "2838", "--unit", "pr-gate", "--record", f.record];
    expect((await runCli(statusArgs, seams(f.record, f.sha, calls, false, provenance))).exitCode).toBe(0);
    const mismatchedProvenance = {
      title: "[pr-gate/pr-gate/foreign+pr-gate] fix: singleton",
      body: provenance.body.replace("- Unit: `pr-gate`", "- Unit: `foreign,pr-gate`"),
    };
    const mismatchedStatus = await runCli(
      [...statusArgs, "--units", "foreign,pr-gate"],
      seams(f.record, f.sha, calls, false, mismatchedProvenance),
    );
    expect(mismatchedStatus.exitCode).toBe(3);
    expect(mismatchedStatus.stderr).toContain("DELIVERY_BOLT_AUTHORITY_MISMATCH");
    const reportArgs = ["report", "--repo", "amadeus-dlc/amadeus", "--pr", "2838", "--unit", "pr-gate", "--record", f.record];
    expect((await runCli(reportArgs, seams(f.record, f.sha, calls, false, provenance))).exitCode).toBe(0);
    const reportPath = reportPathFor(f.record, "pr-gate");
    expect(evaluateReportFormat(reportPath, "pr-convergence").pass).toBe(true);
    const sensorGraphPath = join(f.record, "runtime-graph.json");
    const sensorGraph = readFileSync(sensorGraphPath, "utf-8");
    const mismatchedGraph = JSON.parse(sensorGraph);
    mismatchedGraph.delivery_bolts.bolts[0].units = ["foreign"];
    writeFileSync(sensorGraphPath, JSON.stringify(mismatchedGraph));
    expect(evaluateReportFormat(reportPath, "pr-convergence").findings).toContainEqual({
      field: "member units",
      reason: "does not match the approved Delivery Bolt projection",
    });
    writeFileSync(sensorGraphPath, sensorGraph);

    const codeGeneration = loadGraph().find((stage) => stage.slug === "code-generation");
    if (codeGeneration === undefined) throw new Error("code-generation stage must exist");
    expect(deliveryEvidenceCoverageRefusal(f.root, {
      ...codeGeneration,
      produces: ["pr-convergence-report"],
    }, readFileSync(join(f.record, "amadeus-state.md"), "utf-8"))).toBeNull();

    const graphPath = join(f.record, "runtime-graph.json");
    const statePath = join(f.record, "amadeus-state.md");
    const graph = readFileSync(graphPath, "utf-8");
    const state = readFileSync(statePath, "utf-8");
    setEngineProjectionField(f, "sourceDigest", `sha256:${"0".repeat(64)}`);
    expect(deliveryEvidenceCoverageRefusal(f.root, {
      ...codeGeneration,
      produces: ["pr-convergence-report"],
    }, state)).toContain("DELIVERY_EVIDENCE_CARRIER_MISMATCH");
    writeFileSync(graphPath, graph);
    writeFileSync(statePath, state.replace("delivery-planning — SKIP", "delivery-planning — EXECUTE"));
    expect(deliveryEvidenceCoverageRefusal(f.root, {
      ...codeGeneration,
      produces: ["pr-convergence-report"],
    }, readFileSync(statePath, "utf-8"))).toContain("DELIVERY_EVIDENCE_CARRIER_STALE");
  });

  test("engine singleton ignores construction directories owned by stages outside the runtime audit rows", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeEngineSingletonCarrier(f);
    const statePath = join(f.record, "amadeus-state.md");
    const state = readFileSync(statePath, "utf-8").replace(
      "- [-] code-generation — EXECUTE",
      "- [-] code-generation — EXECUTE\n- [x] conformance-fixture — EXECUTE",
    );
    writeFileSync(statePath, state);
    mkdirSync(join(f.record, "construction", "conformance-fixture", "check-proof"), { recursive: true });
    const projected = projectEngineSingletonDeliveryBolt(
      f.root,
      state,
      new Set(["conformance-fixture"]),
    );
    if (projected.kind !== "projection") throw new Error("a foreign stage directory must not become a Unit");
    const graphPath = join(f.record, "runtime-graph.json");
    const graph = JSON.parse(readFileSync(graphPath, "utf-8"));
    graph.delivery_bolts = projected.projection;
    writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);

    expect((await runCli(engineCreateArgs(f), seams(f.record, f.sha, calls))).exitCode).toBe(0);
  });

  test("engine singleton authority rejects projection, state, cardinality, plan, and requested-Unit drift", async () => {
    const cases: Array<(f: ReturnType<typeof fixture>) => void> = [
      ...([
        ["sourceDigest", `sha256:${"0".repeat(64)}`],
        ["unit", "foreign"],
        ["scope", "self-refactor"],
        ["deliveryPlanning", "EXECUTE"],
        ["bolts", [{ bolt: "pr-gate", units: ["foreign"] }]],
      ] as const).map(([field, value]) =>
        (f: ReturnType<typeof fixture>) => setEngineProjectionField(f, field, value)
      ),
      (f) => writeFileSync(
        join(f.record, "amadeus-state.md"),
        readFileSync(join(f.record, "amadeus-state.md"), "utf-8").replace("**Scope**: self-fix", "**Scope**: self-feature"),
      ),
      (f) => writeFileSync(
        join(f.record, "amadeus-state.md"),
        readFileSync(join(f.record, "amadeus-state.md"), "utf-8").replace("delivery-planning — SKIP", "delivery-planning — EXECUTE"),
      ),
      (f) => mkdirSync(join(f.record, "construction", "second-unit"), { recursive: true }),
      (f) => {
        mkdirSync(join(f.record, "inception", "delivery-planning"), { recursive: true });
        writeFileSync(join(f.record, "inception", "delivery-planning", "bolt-plan.md"), "## Bolt other\n\n- **Units:** `other`\n");
      },
    ];
    for (const mutate of cases) {
      const f = fixture("self-fix"); const calls: string[][] = [];
      writeEngineSingletonCarrier(f);
      mutate(f);
      const result = await runCli(engineCreateArgs(f), seams(f.record, f.sha, calls));
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/DELIVERY_BOLT_AUTHORITY_(?:STALE|MISMATCH)/);
      expect(calls).toEqual([]);
    }

    const requested = fixture("self-fix"); const requestedCalls: string[][] = [];
    writeEngineSingletonCarrier(requested);
    expect((await runCli(
      engineCreateArgs(requested, "pr-gate,foreign"),
      seams(requested.record, requested.sha, requestedCalls),
    )).exitCode).toBe(2);
    expect(requestedCalls).toEqual([]);

    const foreignBolt = fixture("self-fix"); const foreignBoltCalls: string[][] = [];
    writeEngineSingletonCarrier(foreignBolt);
    expect((await runCli(
      engineCreateArgs(foreignBolt, "pr-gate", "other"),
      seams(foreignBolt.record, foreignBolt.sha, foreignBoltCalls),
    )).exitCode).toBe(2);
    expect(foreignBoltCalls).toEqual([]);
  });

  test("completion rejects a runtime carrier when no Intent record resolves", () => {
    const root = mkdtempSync(join(tmpdir(), "t534-no-intent-")); roots.push(root);
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    mkdirSync(join(intents, "construction", "orphan-unit"), { recursive: true });
    writeFileSync(join(intents, "amadeus-state.md"), "- **Scope**: self-fix\n");
    writeFileSync(join(intents, "runtime-graph.json"), JSON.stringify({
      delivery_bolts: { authority: "approved-plan" },
    }));
    const codeGeneration = loadGraph().find((stage) => stage.slug === "code-generation");
    if (codeGeneration === undefined) throw new Error("code-generation stage must exist");
    expect(deliveryEvidenceCoverageRefusal(root, {
      ...codeGeneration,
      produces: ["pr-convergence-report"],
    }, readFileSync(join(intents, "amadeus-state.md"), "utf-8")))
      .toContain("no Intent record resolves");
  });

  test("completion reports missing and malformed approved carrier sources and graphs", () => {
    const f = fixture("self-fix");
    const statePath = join(f.record, "amadeus-state.md");
    const stateContent = readFileSync(statePath, "utf-8");
    mkdirSync(join(f.record, "construction", "cli"), { recursive: true });
    const codeGeneration = loadGraph().find((stage) => stage.slug === "code-generation");
    if (codeGeneration === undefined) throw new Error("code-generation stage must exist");
    const node = {
      ...codeGeneration,
      produces: ["pr-convergence-report"],
    };
    const graphPath = join(f.record, "runtime-graph.json");
    const planPath = join(f.record, "inception", "delivery-planning", "bolt-plan.md");

    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    rmSync(planPath);
    expect(deliveryEvidenceCoverageRefusal(
      f.root,
      node,
      stateContent,
    )).toContain("projected Delivery Bolt source is missing");

    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    writeFileSync(planPath, "## Bolt invalid/slug\n\n- **Units:** `cli`\n");
    expect(deliveryEvidenceCoverageRefusal(
      f.root,
      node,
      stateContent,
    )).toContain("every Delivery Bolt must have a non-empty slug");

    writeFileSync(graphPath, "not-json\n");
    expect(deliveryEvidenceCoverageRefusal(
      f.root,
      node,
      stateContent,
    )).toContain("missing or unreadable");
    writeFileSync(graphPath, "[]\n");
    expect(deliveryEvidenceCoverageRefusal(
      f.root,
      node,
      stateContent,
    )).toContain("is not an object");
    rmSync(statePath);
    expect(() => deliveryEvidenceCoverageRefusal(f.root, node, stateContent)).not.toThrow();
  });

  test("validates approved Delivery Bolt membership for a singleton", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    const result = await runCli(
      ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
        "--title", "fix: gate", "--body-file", f.body, "--record", f.record, "--bolt", "delivery",
        "--unit", "foreign"],
      seams(f.record, f.sha, calls),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("approved member Units");
    expect(calls).toEqual([]);
  });

  test("keeps singleton report bytes and fails closed on absent or partial authority", async () => {
    const argsFor = (f: ReturnType<typeof fixture>, bolt = "delivery") => [
      "create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
      "--title", "fix: gate", "--body-file", f.body, "--record", f.record, "--bolt", bolt, "--unit", "cli",
    ];

    const configured = fixture("self-fix"); const configuredCalls: string[][] = [];
    writeDeliveryPlan(configured.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    expect((await runCli(argsFor(configured), seams(configured.record, configured.sha, configuredCalls))).exitCode).toBe(0);
    expect(readFileSync(reportPathFor(configured.record, "cli"), "utf-8")).not.toContain("## Owner Projection");

    const foreignBolt = fixture("self-fix"); const foreignCalls: string[][] = [];
    writeDeliveryPlan(foreignBolt.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    expect((await runCli(argsFor(foreignBolt, "other"), seams(foreignBolt.record, foreignBolt.sha, foreignCalls))).exitCode).toBe(2);
    expect(foreignCalls).toEqual([]);

    const stale = fixture("self-fix"); const staleCalls: string[][] = [];
    writeDeliveryPlan(stale.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    writeFileSync(join(stale.record, "inception", "delivery-planning", "bolt-plan.md"),
      "## Bolt delivery\n\n- **Units:** `cli`\n\n<!-- changed -->\n");
    const staleResult = await runCli(argsFor(stale), seams(stale.record, stale.sha, staleCalls));
    expect(staleResult.exitCode).toBe(2);
    expect(staleResult.stderr).toContain("stale");
    expect(staleCalls).toEqual([]);

    const planOnly = fixture("self-fix"); const planOnlyCalls: string[][] = [];
    mkdirSync(join(planOnly.record, "inception", "delivery-planning"), { recursive: true });
    writeFileSync(join(planOnly.record, "inception", "delivery-planning", "bolt-plan.md"),
      "## Bolt delivery\n\n- **Units:** `cli`\n");
    expect((await runCli(argsFor(planOnly), seams(planOnly.record, planOnly.sha, planOnlyCalls))).exitCode).toBe(2);
    expect(planOnlyCalls).toEqual([]);

    const projectionOnly = fixture("self-fix"); const projectionOnlyCalls: string[][] = [];
    writeDeliveryPlan(projectionOnly.record, "## Bolt delivery\n\n- **Units:** `cli`\n");
    rmSync(join(projectionOnly.record, "inception", "delivery-planning", "bolt-plan.md"));
    expect((await runCli(argsFor(projectionOnly), seams(projectionOnly.record, projectionOnly.sha, projectionOnlyCalls))).exitCode).toBe(2);
    expect(projectionOnlyCalls).toEqual([]);

    for (const stateSuffix of [
      "- **State Version**: 7\n",
      "- **State Version**: 7\n- [x] delivery-planning — EXECUTE\n",
      "- **State Version**: unknown\n- [x] delivery-planning — EXECUTE\n",
    ]) {
      const absent = fixture("self-fix"); const absentCalls: string[][] = [];
      writeFileSync(join(absent.record, "amadeus-state.md"), `- **Scope**: self-fix\n${stateSuffix}`);
      const result = await runCli(argsFor(absent), seams(absent.record, absent.sha, absentCalls));
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("DELIVERY_BOLT_AUTHORITY_MISSING");
      expect(absentCalls).toEqual([]);
    }
  });

  test("projects one PR and head tuple into distinct owner-bound reports", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeDeliveryPlan(f.record,
      "## Bolt delivery: PR attestation\n\n- **Units:** U1 `unit-a`, U2 `unit-b`\n");
    const createArgs = ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
      "--title", "fix: gate", "--body-file", f.body, "--record", f.record, "--bolt", "delivery",
      "--unit", "unit-b", "--units", "unit-b,unit-a"];
    expect((await runCli(createArgs, seams(f.record, f.sha, calls))).exitCode).toBe(0);
    const a = reportPathFor(f.record, "unit-a");
    const b = reportPathFor(f.record, "unit-b");
    expect(existsSync(a)).toBe(true);
    expect(existsSync(b)).toBe(true);
    expect(readFileSync(a, "utf-8")).toContain("- unit: unit-a");
    expect(readFileSync(b, "utf-8")).toContain("- unit: unit-b");
    expect(readFileSync(a, "utf-8")).toContain("- member units: unit-a,unit-b");
    expect(readFileSync(a, "utf-8")).not.toBe(readFileSync(b, "utf-8"));
    const receiptA = parseAttestation(readFileSync(a, "utf-8"));
    const receiptB = parseAttestation(readFileSync(b, "utf-8"));
    expect(receiptA?.contentDigest).not.toBe(receiptB?.contentDigest);
    expect(readFileSync(a, "utf-8")).toContain("## Owner Projection");
    expect(readFileSync(a, "utf-8")).toContain("- owner unit: unit-a");
    expect(readFileSync(a, "utf-8")).toContain(
      "- report path: amadeus/spaces/default/intents/260812-pr-gate/construction/unit-a/code-generation/pr-convergence-report.md",
    );

    const provenance = {
      title: "[pr-gate/delivery/unit-a+unit-b] fix: gate",
      body: "## Summary\n\nIssue 2838.\n\n## Amadeus Work\n\n" +
        "- Intent: `pr-gate`\n- Bolt: `delivery`\n- Unit: `unit-a,unit-b`\n" +
        "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2838`\n",
    };
    const reportArgs = ["report", "--repo", "amadeus-dlc/amadeus", "--pr", "2838", "--unit", "unit-a",
      "--units", "unit-b,unit-a", "--record", f.record];
    expect((await runCli(reportArgs, seams(f.record, f.sha, calls, false, provenance))).exitCode).toBe(0);
    expect(evaluateReportFormat(a, "pr-convergence").pass).toBe(true);
    expect(evaluateReportFormat(b, "pr-convergence").pass).toBe(true);
    const originalB = readFileSync(b, "utf-8");
    writeFileSync(b, originalB.replace("- owner unit: unit-b", "- owner unit: unit-a"));
    expect(evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field))
      .toContain("owner projection");
    writeFileSync(b, originalB.replace(
      "/construction/unit-b/code-generation/pr-convergence-report.md",
      "/construction/unit-a/code-generation/pr-convergence-report.md",
    ));
    expect(evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field))
      .toContain("owner projection");
    writeFileSync(b, readFileSync(a, "utf-8"));
    expect(evaluateReportFormat(b, "pr-convergence")).toMatchObject({ pass: false });

    writeFileSync(b, originalB.replace("## Owner Projection", "## Broken Owner Projection"));
    expect(evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field))
      .toContain("owner projection");
    writeFileSync(b, `${originalB}\n`);
    const nonCanonical = evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field);
    expect(nonCanonical).toContain("canonical bytes");
    expect(nonCanonical).toContain("attestation");
    writeFileSync(b, originalB.replaceAll("- member units: unit-a,unit-b", "- member units: unit-a"));
    expect(evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field))
      .toContain("member units");
    writeFileSync(b, originalB);
    writeDeliveryPlan(f.record, "## Bolt delivery\n\n- **Units:** `unit-a`, `unit-c`\n");
    expect(evaluateReportFormat(b, "pr-convergence").findings.map((finding) => finding.field))
      .toContain("member units");
  });

  test("rejects partial, duplicate, and foreign owner membership before GitHub access", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeDeliveryPlan(f.record,
      "## Bolt delivery\n\n- **Units:** U1 `unit-a`, U2 `unit-b`\n");
    const base = ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--title", "fix",
      "--body-file", f.body, "--record", f.record, "--bolt", "delivery", "--unit", "unit-b", "--units"];
    const partial = await runCli([...base, "unit-a"], seams(f.record, f.sha, calls));
    expect(partial.exitCode).toBe(2);
    expect(partial.stderr).toContain("must be a member of --units");
    const duplicate = await runCli([...base, "unit-a,unit-a"], seams(f.record, f.sha, calls));
    expect(duplicate.exitCode).toBe(2);
    expect(duplicate.stderr).toContain("duplicate Units");
    const mismatchBase = base.toSpliced(base.indexOf("unit-b"), 1, "unit-a");
    const mismatch = await runCli([...mismatchBase, "unit-a,unit-c"], seams(f.record, f.sha, calls));
    expect(mismatch.exitCode).toBe(2);
    expect(mismatch.stderr).toContain("does not match the approved member Units");
    expect(calls).toEqual([]);
  });

  test("rejects a stale runtime projection before GitHub access", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeDeliveryPlan(f.record,
      "## Bolt delivery\n\n- **Units:** `unit-a`, `unit-b`\n");
    writeFileSync(join(f.record, "inception", "delivery-planning", "bolt-plan.md"),
      "## Bolt delivery\n\n- **Units:** `unit-a`, `unit-b`, `unit-c`\n");

    const result = await runCli(
      ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--title", "fix",
        "--body-file", f.body, "--record", f.record, "--bolt", "delivery", "--unit", "unit-a",
        "--units", "unit-a,unit-b"],
      seams(f.record, f.sha, calls),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("stale");
    expect(calls).toEqual([]);
  });

  test("keeps two Delivery Bolts on separate PR and head identities", async () => {
    const f = fixture("self-fix"); const calls: string[][] = [];
    writeDeliveryPlan(f.record,
      "## Bolt bolt-a\n\n- **Units:** `unit-a1`, `unit-a2`\n\n" +
      "## Bolt bolt-b\n\n- **Units:** `unit-b1`, `unit-b2`\n");
    const workBody = (bolt: string, units: string) =>
      "## Summary\n\nIssue 2838.\n\n## Amadeus Work\n\n" +
      `- Intent: \`pr-gate\`\n- Bolt: \`${bolt}\`\n- Unit: \`${units}\`\n` +
      "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2838`\n";

    const createA = ["create", "--repo", "amadeus-dlc/amadeus", "--head", "feature/2838", "--base", "main",
      "--title", "fix: bolt a", "--body-file", f.body, "--record", f.record, "--bolt", "bolt-a",
      "--unit", "unit-a1", "--units", "unit-a2,unit-a1"];
    expect((await runCli(createA, seams(f.record, f.sha, calls))).exitCode).toBe(0);
    const provenanceA = {
      title: "[pr-gate/bolt-a/unit-a1+unit-a2] fix: bolt a",
      body: workBody("bolt-a", "unit-a1,unit-a2"),
    };
    expect((await runCli(
      ["report", "--repo", "amadeus-dlc/amadeus", "--pr", "2838", "--unit", "unit-a1",
        "--units", "unit-a1,unit-a2", "--record", f.record],
      seams(f.record, f.sha, calls, false, provenanceA),
    )).exitCode).toBe(0);

    writeFileSync(join(f.root, "second-bolt.txt"), "second head\n");
    execFileSync("git", ["add", "-A"], { cwd: f.root });
    execFileSync("git", ["commit", "-q", "-m", "second bolt"], { cwd: f.root });
    const shaB = execFileSync("git", ["rev-parse", "HEAD"], { cwd: f.root, encoding: "utf-8" }).trim();
    const targetB = { pr: 2839, branch: "feature/2839" };
    const createB = ["create", "--repo", "amadeus-dlc/amadeus", "--head", targetB.branch, "--base", "main",
      "--title", "fix: bolt b", "--body-file", f.body, "--record", f.record, "--bolt", "bolt-b",
      "--unit", "unit-b2", "--units", "unit-b2,unit-b1"];
    expect((await runCli(createB, seams(f.record, shaB, calls, false, undefined, targetB))).exitCode).toBe(0);
    const provenanceB = {
      title: "[pr-gate/bolt-b/unit-b1+unit-b2] fix: bolt b",
      body: workBody("bolt-b", "unit-b1,unit-b2"),
    };
    expect((await runCli(
      ["report", "--repo", "amadeus-dlc/amadeus", "--pr", "2839", "--unit", "unit-b1",
        "--units", "unit-b1,unit-b2", "--record", f.record],
      seams(f.record, shaB, calls, false, provenanceB, targetB),
    )).exitCode).toBe(0);

    const reportA = readFileSync(reportPathFor(f.record, "unit-a1"), "utf-8");
    const reportB = readFileSync(reportPathFor(f.record, "unit-b1"), "utf-8");
    expect(reportA).toContain("- pull request: amadeus-dlc/amadeus#2838");
    expect(reportA).toContain(`- local head: ${f.sha}`);
    expect(reportB).toContain("- pull request: amadeus-dlc/amadeus#2839");
    expect(reportB).toContain(`- local head: ${shaB}`);
    expect(shaB).not.toBe(f.sha);
  });
});
