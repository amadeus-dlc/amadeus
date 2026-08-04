// covers: workflow:no-silent-drop-evidence-reconcile
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const WORKFLOW_PATH = join(ROOT, ".github", "workflows", "no-silent-drop-evidence-reconcile.yml");
const expression = (body: string): string => ["$", `{{ ${body} }}`].join("");

type WorkflowStep = {
  id?: string;
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
};

type Workflow = {
  on?: { push?: { branches?: string[] }; pull_request?: unknown };
  permissions?: Record<string, unknown>;
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
  jobs?: Record<string, {
    needs?: unknown;
    "timeout-minutes"?: number;
    permissions?: Record<string, unknown>;
    steps?: WorkflowStep[];
  }>;
};

describe("t427 main-only evidence reconciliation workflow", () => {
  test("is structurally main-only, independent from CI Success, finite, and serialized", () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;
    expect(workflow.on?.push?.branches).toEqual(["main"]);
    expect(workflow.on?.pull_request).toBeUndefined();
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.concurrency).toEqual({
      group: "no-silent-drop-evidence-reconcile-main",
      "cancel-in-progress": false,
    });
    const job = workflow.jobs?.reconcile;
    expect(job).toBeDefined();
    expect(job?.needs).toBeUndefined();
    expect(job?.["timeout-minutes"]).toBe(10);
    expect(job?.permissions).toEqual({ contents: "read" });
  });

  test("uses only the existing short-lived GitHub App credential and calls the CLI", () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;
    const steps = workflow.jobs?.reconcile?.steps ?? [];
    const token = steps.find((step) => step.name === "Create GitHub App token");
    expect(token?.uses).toBe("actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1");
    expect(token?.with).toMatchObject({
      "client-id": expression("vars.METRICS_BOT_CLIENT_ID"),
      "private-key": expression("secrets.METRICS_BOT_PRIVATE_KEY"),
      "permission-contents": "write",
      "permission-pull-requests": "read",
    });
    const checkout = steps.find((step) => step.name === "Checkout event revision");
    expect(checkout?.with).toMatchObject({ ref: expression("github.sha"), "fetch-depth": 0 });
    const reconcile = steps.find((step) => step.name === "Reconcile evidence revision");
    expect(reconcile?.run).toContain("bun scripts/no-silent-drop-evidence.ts reconcile");
    expect(reconcile?.run).toContain('--event-revision "$GITHUB_SHA"');
    expect(reconcile?.run).toContain('--repository "$GITHUB_REPOSITORY"');
    expect(reconcile?.run).toContain('tee -a "$GITHUB_STEP_SUMMARY"');
    expect(reconcile?.run).not.toContain("continue-on-error");
    expect(reconcile?.run).not.toContain("|| true");
  });

  test("keeps three-layer calculation and loop/stale decisions out of workflow shell", () => {
    const source = readFileSync(WORKFLOW_PATH, "utf8");
    expect(source).not.toContain("adoption-evidence.json");
    expect(source).not.toContain("adoption-evidence-manifest.json");
    expect(source).not.toContain("adoption-runs.json");
    expect(source).not.toContain("git push --force");
    const cli = readFileSync(join(ROOT, "scripts", "no-silent-drop-evidence.ts"), "utf8");
    expect(cli).toContain("currentBindingIsValidForEvent");
    expect(cli).toContain("proveIdentityOnlyRebind");
    expect(cli).toContain("remoteMainTip");
  });

  test("records stable credential, checkout, and preflight failure codes with the event SHA", () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;
    const steps = workflow.jobs?.reconcile?.steps ?? [];
    expect(steps.find((step) => step.name === "Create GitHub App token")?.id).toBe("app-token");
    expect(steps.find((step) => step.name === "Checkout event revision")?.id).toBe("checkout");
    expect(steps.find((step) => step.name === "Set up Bun")?.id).toBe("setup_bun");
    expect(steps.find((step) => step.name === "Install dependencies")?.id).toBe("install");
    expect(steps.find((step) => step.name === "Get GitHub App user ID")?.id).toBe("app-user");
    expect(steps.find((step) => step.name === "Configure GitHub App identity")?.id).toBe("configure");
    expect(steps.find((step) => step.name === "Reconcile evidence revision")?.id).toBe("reconcile");

    const report = steps.find((step) => step.name === "Report preflight failure");
    expect(report?.if).toBe(expression("failure() && steps.reconcile.outcome != 'failure'"));
    expect(report?.env).toMatchObject({
      EVENT_REVISION: expression("github.sha"),
      CREDENTIAL_OUTCOME: expression("steps.app-token.outcome"),
      CHECKOUT_OUTCOME: expression("steps.checkout.outcome"),
    });
    expect(report?.run).toContain("REBIND_CREDENTIAL_FAILED");
    expect(report?.run).toContain("REBIND_CHECKOUT_FAILED");
    expect(report?.run).toContain("REBIND_PREFLIGHT_FAILED");
    expect(report?.run).toContain('"targetRevision":"%s"');
    expect(report?.run).toContain('>> "$GITHUB_STEP_SUMMARY"');
  });
});
