// covers: function:effectivePlanAction
//
// t3249 - a parked Intent must stay terminable when host config moves under it.
//
// THE DEFECT (#3249). Two judgements about "is this stage in scope" read two
// DIFFERENT sources: `complete-workflow`'s mandatory-plugin-stage guard reads
// `amadeus/config.json` plugin.scope-bindings (live host policy), while `jump
// resolve` reads the record's execution projection (the EXECUTE/SKIP grid,
// frozen when the Intent was born). Park an Intent, add a scope binding, and
// the two disagree: completion refuses because the stage is "pending", and the
// jump that would run it refuses because the plan says SKIP. Neither refusal
// names the divergence and neither names a way out.
//
// THE SECOND DEADLOCK (issue comment). `recompose --add` is the verb that
// reconciles the plan to the config - but it moves the final in-scope stage,
// which strands the workflow-completion preparation the previous final stage
// had already written. Every completion path then refuses that stale
// preparation and no verb clears it.
//
// This drives the ONE recovery path end to end: refuse-with-divergence ->
// recompose (which retracts the stranded preparation) -> complete.
//
// Mechanism: cli - spawns the shipped tools against a temp project born via
// intent-birth (the real state-file shape, not a fixture).

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";
import {
  prepareWorkflowCompletion,
  workflowCompletionPreparation,
} from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
const STATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");
const GOAL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-goal.ts");
const JUMP = join(ROOT, "packages", "framework", "core", "tools", "amadeus-jump.ts");
const toolEnv = {
  ...process.env,
  AMADEUS_STAGE_GRAPH: join(ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json"),
  AMADEUS_SCOPE_GRID: join(ROOT, "dist", "claude", ".claude", "tools", "data", "scope-grid.json"),
};

// `ci-pipeline` is the stand-in for the real case's pr-convergence: a stage
// the `fix` scope grid marks SKIP,
// which host config then binds as mandatory. scope-bindings are parsed
// syntactically (amadeus-config.ts parsePluginScopeBindings never consults the
// compiled graph), so the divergence reproduces without compiling a plugin.
const BOUND_STAGE = "ci-pipeline";
const BORN_FINAL_STAGE = "build-and-test";

const projects: string[] = [];
afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function run(project: string, tool: string, args: string[]) {
  return spawnSync(process.execPath, [tool, ...args, "--project-dir", project], {
    encoding: "utf8",
    env: { ...toolEnv, AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" },
  });
}

const out = (r: { stdout: string; stderr: string }): string => `${r.stdout}${r.stderr}`;

// Tool refusals land as a JSON `{"error": "..."}` envelope. Unwrap it so the
// assertions read the message itself rather than its JSON escaping.
function message(r: { stdout: string; stderr: string }): string {
  return out(r)
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) return line;
      try {
        const parsed = JSON.parse(trimmed) as { error?: unknown };
        return typeof parsed.error === "string" ? parsed.error : line;
      } catch {
        return line;
      }
    })
    .join("\n");
}

function statePath(project: string, record: string): string {
  return join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md");
}

function bornProject(
  ...bound: readonly string[]
): { project: string; record: string } {
  const project = createTestProject();
  projects.push(project);
  // The host binding that moved while the Intent was parked.
  const stages = Object.fromEntries(
    (bound.length > 0 ? bound : [BOUND_STAGE]).map((slug) => [slug, ["fix"]]),
  );
  writeFileSync(
    join(project, "amadeus", "config.json"),
    JSON.stringify({ plugin: { "scope-bindings": { "t3249-plugin": stages } } }),
  );
  const birth = run(project, UTIL, ["intent-birth", "--scope", "fix"]);
  expect(birth.status, out(birth)).toBe(0);
  const record = readFileSync(
    join(project, "amadeus", "spaces", "default", "intents", "active-intent"),
    "utf8",
  ).trim();
  return { project, record };
}

function reconcileAchieved(project: string, finalStage: string): void {
  const evidencePath = join(project, "goal-proof.txt");
  const evidence = `goal verified for ${finalStage}\n`;
  writeFileSync(evidencePath, evidence);
  const itemsPath = join(project, "goal-items.json");
  writeFileSync(
    itemsPath,
    JSON.stringify([
      {
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [
          {
            kind: "deterministic-check",
            reference: "goal-proof.txt",
            digest: createHash("sha256").update(evidence).digest("hex"),
          },
        ],
      },
    ]),
  );
  const reconcile = run(project, GOAL, [
    "reconcile", "--items", itemsPath, "--final-stage", finalStage,
  ]);
  expect(reconcile.status, out(reconcile)).toBe(0);
}

function auditText(project: string, record: string): string {
  const dir = join(project, "amadeus", "spaces", "default", "intents", record, "audit");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
}

describe("#3249 a plan/config divergence is named, not reported as a pending stage", () => {
  test("both refusals fire, and the completion refusal names the divergence and the way out", () => {
    const { project, record } = bornProject();
    reconcileAchieved(project, BORN_FINAL_STAGE);

    // Half one of the deadlock: the plan says SKIP, so the stage is unreachable.
    const jumped = run(project, JUMP, ["resolve", "--stage", BOUND_STAGE]);
    expect(message(jumped)).toContain(`is skipped for scope "fix"`);

    // Half two: completion refuses because host config mandates the very stage
    // the plan just refused to reach.
    const completed = run(project, STATE, [
      "complete-workflow", BORN_FINAL_STAGE,
      "--intent", record, "--space", "default",
    ]);
    expect(completed.status, out(completed)).not.toBe(0);
    const refusal = message(completed);
    expect(refusal).toContain(
      `host-bound plugin stage(s) "${BOUND_STAGE}" are mandatory for scope "fix"`,
    );

    // The defect: pre-fix this reads "and is pending. Run and complete it
    // before finishing." - a stage the plan will not let anyone run.
    expect(refusal).not.toContain("and is pending. Run and complete it before finishing.");
    // Post-fix: the divergence is named, and the refusal carries the one verb
    // that reconciles the plan to the config.
    expect(refusal).toContain("execution projection");
    expect(refusal).toContain(`recompose --add ${BOUND_STAGE}`);
    expect(refusal).toContain("set-autonomy --mode none");
  });

  test("every diverged stage is named in one refusal, so one recompose reconciles them", () => {
    // The real case (#3249) had THREE bound stages. Refusing one at a time
    // would cost a resume-refuse round trip per stage.
    const { project, record } = bornProject(
      "ci-pipeline",
      "deployment-pipeline",
      "observability-setup",
    );
    reconcileAchieved(project, BORN_FINAL_STAGE);

    const completed = run(project, STATE, [
      "complete-workflow", BORN_FINAL_STAGE,
      "--intent", record, "--space", "default",
    ]);
    expect(completed.status, out(completed)).not.toBe(0);
    const refusal = message(completed);
    expect(refusal).toContain(
      '"ci-pipeline", "deployment-pipeline", "observability-setup" are mandatory',
    );
    expect(refusal).toContain(
      "recompose --add ci-pipeline,deployment-pipeline,observability-setup",
    );
  });

  test("an on-plan mandatory stage still refuses with the unchanged pending wording", () => {
    // Negative control: the divergence branch must not swallow the ordinary
    // "you have not run it yet" case. code-generation is EXECUTE for `fix`.
    const { project, record } = bornProject("code-generation");
    reconcileAchieved(project, BORN_FINAL_STAGE);

    const completed = run(project, STATE, [
      "complete-workflow", BORN_FINAL_STAGE,
      "--intent", record, "--space", "default",
    ]);
    expect(completed.status, out(completed)).not.toBe(0);
    expect(message(completed)).toContain(
      `host-bound plugin stage "code-generation" is mandatory for scope "fix" and is pending. Run and complete it before finishing.`,
    );
    expect(message(completed)).not.toContain("recompose --add");
  });
});

describe("#3249 recompose retracts a completion preparation its own flip stranded", () => {
  test("adding a stage past the prepared terminal stage clears the stale preparation", () => {
    const { project, record } = bornProject();
    const sp = statePath(project, record);

    // The preparation the previous final stage's approve wrote, produced by the
    // production writer rather than hand-authored bytes.
    writeFileSync(
      sp,
      prepareWorkflowCompletion(
        readFileSync(sp, "utf8"),
        BORN_FINAL_STAGE,
        `terminal:${BORN_FINAL_STAGE}`,
      ),
    );
    expect(workflowCompletionPreparation(readFileSync(sp, "utf8"))?.stage).toBe(BORN_FINAL_STAGE);

    const recomposed = run(project, UTIL, ["recompose", "--add", BOUND_STAGE]);
    expect(recomposed.status, out(recomposed)).toBe(0);

    // build-and-test is no longer final, so its preparation is retracted rather
    // than left to refuse every completion path with no verb to clear it.
    expect(workflowCompletionPreparation(readFileSync(sp, "utf8"))).toBeNull();
    expect(out(recomposed)).toContain(`Workflow completion preparation retracted: ${BORN_FINAL_STAGE}`);
    expect(auditText(project, record)).toContain(
      `"Workflow completion retracted":"${BORN_FINAL_STAGE}"`,
    );
  });

  test("a flip that leaves the terminal stage in place keeps the preparation", () => {
    const { project, record } = bornProject();
    const sp = statePath(project, record);
    writeFileSync(
      sp,
      prepareWorkflowCompletion(
        readFileSync(sp, "utf8"),
        BORN_FINAL_STAGE,
        `terminal:${BORN_FINAL_STAGE}`,
      ),
    );

    // user-stories sits ahead of the cursor but BEHIND build-and-test, so the
    // terminal stage does not move and the preparation stays valid.
    const recomposed = run(project, UTIL, ["recompose", "--add", "user-stories"]);
    expect(recomposed.status, out(recomposed)).toBe(0);
    const prepared = workflowCompletionPreparation(readFileSync(sp, "utf8"));
    expect(prepared?.stage).toBe(BORN_FINAL_STAGE);
    expect(prepared?.instance).toBe(`terminal:${BORN_FINAL_STAGE}`);
    expect(out(recomposed)).not.toContain("Workflow completion preparation retracted");
  });
});

describe("#3249 the reconciled plan reaches termination", () => {
  test("recompose then complete-workflow terminates the workflow", () => {
    const { project, record } = bornProject();
    const sp = statePath(project, record);
    writeFileSync(
      sp,
      prepareWorkflowCompletion(
        readFileSync(sp, "utf8"),
        BORN_FINAL_STAGE,
        `terminal:${BORN_FINAL_STAGE}`,
      ),
    );

    const recomposed = run(project, UTIL, ["recompose", "--add", BOUND_STAGE]);
    expect(recomposed.status, out(recomposed)).toBe(0);

    // The plan now matches the config, so the bound stage is reachable...
    const jumped = run(project, JUMP, ["resolve", "--stage", BOUND_STAGE]);
    expect(message(jumped)).not.toContain("is skipped for scope");

    // ...and completing on it terminates the workflow.
    reconcileAchieved(project, BOUND_STAGE);
    const completed = run(project, STATE, [
      "complete-workflow", BOUND_STAGE,
      "--intent", record, "--space", "default",
    ]);
    expect(completed.status, out(completed)).toBe(0);
    expect(auditText(project, record)).toContain("WORKFLOW_COMPLETED");
    expect(readFileSync(sp, "utf8")).toContain("- **Status**: Completed");
  });
});
