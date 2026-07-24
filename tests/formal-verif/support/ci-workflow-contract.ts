import { createHash } from "node:crypto";

const CHECKOUT_SHA = "11d5960a326750d5838078e36cf38b85af677262";
const SETUP_BUN_SHA = "0c5077e51419868618aeaa5fe8019c62421857d6";
const UPLOAD_SHA = "ea165f8d65b6e75b540449e92b4886f43607fa02";

interface WorkflowStep {
  readonly id?: string;
  readonly uses?: string;
  readonly if?: string;
  readonly "continue-on-error"?: boolean;
  readonly with?: Readonly<Record<string, unknown>>;
  readonly run?: string;
}

interface WorkflowJob {
  readonly if?: string;
  readonly needs?: string | readonly string[];
  readonly "runs-on"?: string;
  readonly "timeout-minutes"?: number;
  readonly permissions?: Readonly<Record<string, string>>;
  readonly steps?: readonly WorkflowStep[];
}

interface Workflow {
  readonly on?: Readonly<Record<string, unknown>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

export const U4_DISPATCH_LINE = "  workflow_dispatch: {}\n";
export const U4_EMPTY_BASE_BRANCH = `          if [[ -z "\${BASE_SHA}" ]]; then
            printf 'full=false\\ndrift=false\\ncoverage=false\\n' >> "\${GITHUB_OUTPUT}"
            exit 0
          fi

`;

export function normalizedCiBaseline(source: string): string {
  const withoutJob = source.replace(
    /\n {2}# U4 formal-model-check begin\n[\s\S]*?\n {2}# U4 formal-model-check end\n/,
    "",
  );
  return withoutJob
    .replace(U4_DISPATCH_LINE, "")
    .replace(U4_EMPTY_BASE_BRANCH, "");
}

function stepById(job: WorkflowJob, id: string): WorkflowStep | undefined {
  return job.steps?.find((step) => step.id === id);
}

function inspectFormalSteps(formal: WorkflowJob): string[] {
  const findings: string[] = [];
  const checkout = stepById(formal, "formal-checkout");
  const setup = stepById(formal, "formal-setup-bun");
  const acceptance = stepById(formal, "formal-acceptance");
  const verify = stepById(formal, "formal-verify");
  const upload = stepById(formal, "formal-upload");
  const terminal = stepById(formal, "formal-terminal");
  if (checkout?.uses !== `actions/checkout@${CHECKOUT_SHA}`) {
    findings.push("checkout action is not pinned");
  }
  if (
    setup?.uses !== `oven-sh/setup-bun@${SETUP_BUN_SHA}`
    || setup.with?.["bun-version"] !== "1.3.13"
  ) {
    findings.push("Bun action or version is not pinned");
  }
  if (upload?.uses !== `actions/upload-artifact@${UPLOAD_SHA}`) {
    findings.push("upload action is not pinned");
  }
  if (
    upload?.if !== "always()"
    || upload.with?.["if-no-files-found"] !== "error"
    || upload["continue-on-error"] !== true
  ) {
    findings.push("always artifact upload contract drifted");
  }
  if (
    acceptance?.if !== "always()"
    || acceptance["continue-on-error"] !== true
    || verify?.if !== "always()"
    || verify["continue-on-error"] !== true
    || terminal?.if !== "always()"
  ) {
    findings.push("always evidence or terminal flow drifted");
  }
  if (
    !acceptance?.run?.includes("run-model-check-ci.ts run")
    || !verify?.run?.includes("run-model-check-ci.ts verify")
    || !terminal?.run?.includes("UPLOAD_OUTCOME")
  ) {
    findings.push("formal acceptance, verification, or terminal command is missing");
  }
  return findings;
}

function inspectFormalJob(
  formal: WorkflowJob,
  jobs: Readonly<Record<string, WorkflowJob>>,
): string[] {
  const findings: string[] = [];
  if (formal.if !== "github.event_name == 'workflow_dispatch'") {
    findings.push("formal job event condition drifted");
  }
  if (
    formal["runs-on"] !== "ubuntu-latest"
    || formal["timeout-minutes"] !== 30
    || formal.permissions?.contents !== "read"
    || Object.keys(formal.permissions ?? {}).length !== 1
  ) {
    findings.push("formal job runtime or permissions drifted");
  }
  if (formal.needs !== undefined) findings.push("formal job must remain independent");
  const ciSuccessNeeds = jobs["ci-success"]?.needs;
  if (
    (Array.isArray(ciSuccessNeeds) && ciSuccessNeeds.includes("formal-model-check"))
    || ciSuccessNeeds === "formal-model-check"
  ) {
    findings.push("ci-success must not depend on formal job");
  }
  return [...findings, ...inspectFormalSteps(formal)];
}

export function inspectCiWorkflow(
  source: string,
  expectedBaselineSha256: string,
  legacyWorkflowExists: boolean,
): string[] {
  const findings: string[] = [];
  let workflow: Workflow;
  try {
    workflow = Bun.YAML.parse(source) as Workflow;
  } catch {
    return ["ci.yml is not valid YAML"];
  }
  const actualBaseline = createHash("sha256")
    .update(normalizedCiBaseline(source))
    .digest("hex");
  if (actualBaseline !== expectedBaselineSha256) {
    findings.push("changes outside the three permitted U4 edits");
  }
  if (!workflow.on || !Object.hasOwn(workflow.on, "workflow_dispatch")) {
    findings.push("workflow_dispatch trigger is missing");
  }
  const jobs = workflow.jobs ?? {};
  const formal = jobs["formal-model-check"];
  if (!formal) return [...findings, "formal-model-check job is missing"];
  findings.push(...inspectFormalJob(formal, jobs));
  if (legacyWorkflowExists) findings.push("legacy formal-verification.yml still exists");
  return findings;
}
