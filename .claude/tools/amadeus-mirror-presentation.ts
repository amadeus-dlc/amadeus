// amadeus-mirror-presentation.ts — C8 Mirror presentation.
//
// The renderers accept already-resolved, secret-free domain snapshots. They do
// not read files or GitHub and never derive local state from remote Issue text.

import { MIRROR_PROJECT_FIELD_CONTRACT } from "./amadeus-mirror-project-contract.ts";
import type {
  MirrorEventIdentity,
  MirrorIssueContent,
  MirrorOperation,
  MirrorSnapshot,
  MirrorStatusContext,
} from "./amadeus-mirror-types.ts";

// Immutable runtime-owned user contract. Distribution/docs validators import
// this one-way; runtime code never imports build-time projection modules.
export const MIRROR_USER_CONTRACT = {
  modes: ["off", "prompt", "auto"],
  defaultMode: "prompt",
  booleanCompatibility: "rejected",
  precedence: ["global", "space", "intent"],
  selectorDefaults: {
    space: "active-space",
    intent: "active-intent",
  },
  boundaries: [
    "intent-capture-approved",
    "phase-verified",
    "parked",
    "workflow-completed",
    "manual",
  ],
  completionOrder: ["create", "sync", "close"],
  operations: ["create", "sync", "close"],
  boundaryCommands: [
    {
      path: ["boundary", "intent-capture"],
      requiredOptions: ["--instance"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["boundary", "phase"],
      requiredOptions: ["--instance", "--phase"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["boundary", "park"],
      requiredOptions: ["--instance", "--stage"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["boundary", "completion"],
      requiredOptions: ["--instance"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
  ],
  manualCommands: [
    {
      path: ["manual", "create"],
      requiredOptions: ["--instance"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["manual", "sync"],
      requiredOptions: ["--instance"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["manual", "close"],
      requiredOptions: ["--instance"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
  ],
  answerCommands: [
    {
      path: ["answer", "approve"],
      requiredOptions: ["--binding-id"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
    {
      path: ["answer", "skip"],
      requiredOptions: ["--binding-id"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
    },
  ],
  repairCommands: [
    {
      path: ["repair", "status"],
      requiredOptions: [],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
      mutatesRemote: false,
    },
    {
      path: ["repair", "relink"],
      requiredOptions: ["--issue"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
      mutatesRemote: false,
    },
    {
      path: ["repair", "abandon"],
      requiredOptions: ["--operation"],
      optionalOptions: ["--repo", "--space", "--intent", "--project-dir"],
      positionalArguments: "forbidden",
      mutatesRemote: false,
    },
  ],
  failure: {
    workflowMayAdvance: true,
    retry: "next-eligible-boundary-or-explicit-manual-command",
  },
  closeGuards: [
    "verified-provenance",
    "matching-repository",
    "workflow-landed",
    "final-sync-succeeded",
  ],
  scopeExclusions: ["pull-request", "release", "deploy", "daemon", "polling"],
  // Project board sync. `mirror-projects` names the boards an Intent syncs to;
  // it resolves per key, so a layer that carries it replaces the previous
  // layer's list outright and never merges into it, and it is independent of
  // `auto-mirror` (the mode decides whether an operation runs at all).
  projectConfig: {
    key: "mirror-projects",
    shape:
      'array of { project: "<owner>/<number>", phase-field?: string, status-names?: { <phase>: string } }',
    phaseKeys: ["ideation", "inception", "construction", "operation", "done"],
    layerResolution: "last-layer-with-a-value-replaces",
    independentOf: "auto-mirror",
    phaseField: {
      key: "phase-field",
      default: MIRROR_PROJECT_FIELD_CONTRACT.lifecycle.defaultField,
    },
    authoritativeField: "phase-field",
    auxiliaryStatus: {
      field: MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.field,
      active: MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.active,
      complete: MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.complete,
      parked: "keep",
      archived: "keep",
      failureMode: "non-blocking",
    },
  },
  // Reading and setting a Project column needs one extra token scope. The
  // credential itself stays with gh: this tool never changes a scope and never
  // re-authenticates on a user's behalf.
  projectAuth: {
    scope: "project",
    credentialStore: "gh",
    automaticScopeChange: false,
  },
  // What `repair status` reports per board. It is read-only: it observes the
  // boards and writes nothing, locally or remotely.
  projectDiagnostics: {
    command: ["repair", "status"],
    resolutions: [
      "resolved",
      "field-missing",
      "option-missing",
      "permission-denied",
    ],
    availableOptionsOn: "option-missing",
    mutatesRemote: false,
  },
} as const;

type ContractCommand =
  | (typeof MIRROR_USER_CONTRACT.boundaryCommands)[number]
  | (typeof MIRROR_USER_CONTRACT.manualCommands)[number]
  | (typeof MIRROR_USER_CONTRACT.answerCommands)[number]
  | (typeof MIRROR_USER_CONTRACT.repairCommands)[number];

export function mirrorContractCommandUsage(command: ContractCommand): string {
  const options = [
    ...command.requiredOptions.map((option) => `${option} <value>`),
    ...command.optionalOptions.map((option) => `[${option} <value>]`),
  ];
  return `${command.path.join(" ")}${options.length ? ` ${options.join(" ")}` : ""}`;
}

export function renderMirrorLifecycleHelp(): string {
  const commands: readonly ContractCommand[] = [
    ...MIRROR_USER_CONTRACT.boundaryCommands,
    ...MIRROR_USER_CONTRACT.manualCommands,
    ...MIRROR_USER_CONTRACT.answerCommands,
    ...MIRROR_USER_CONTRACT.repairCommands,
  ];
  return [
    "Usage: amadeus-mirror-lifecycle.ts <command> [options]",
    ...commands.map((command) => `  ${mirrorContractCommandUsage(command)}`),
    `Selector defaults: ${MIRROR_USER_CONTRACT.selectorDefaults.space}, ${MIRROR_USER_CONTRACT.selectorDefaults.intent}.`,
    "Positional arguments are forbidden.",
  ].join("\n");
}

export function renderMirrorLegacyHelp(): string {
  return [
    "Usage: bun <harness-dir>/tools/amadeus-mirror.ts <create|sync|close> --instance <id> [--intent <dirName>]",
    "       bun <harness-dir>/tools/amadeus-mirror.ts status [--intent <dirName>]",
    `Lifecycle default mode: ${MIRROR_USER_CONTRACT.defaultMode}.`,
    "Operational note: create/close are run by the conductor by team agreement; this is not mechanically enforced (see team.md).",
  ].join("\n");
}

const SECRET_ASSIGNMENT =
  /\b(token|secret|password|passwd|api[-_]?key|authorization)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/giu;
const URL_QUERY = /\bhttps?:\/\/[^\s?#]+[?][^\s#]*/giu;
const BEARER = /\bbearer\s+[a-z0-9._~+/=-]+/giu;

function redactSummary(value: string): string {
  return value
    .replace(URL_QUERY, (url) => `${url.slice(0, url.indexOf("?"))}?[REDACTED]`)
    .replace(SECRET_ASSIGNMENT, "$1=[REDACTED]")
    .replace(BEARER, "Bearer [REDACTED]")
    .trim();
}

function oneLine(value: string): string {
  return redactSummary(value).replace(/\s*\r?\n\s*/gu, " ");
}

export function renderMirrorIssueContent(input: {
  snapshot: MirrorSnapshot;
  marker: string;
}): MirrorIssueContent {
  const { snapshot } = input;
  const summary = redactSummary(snapshot.projectSummary);
  const titleSummary = oneLine(snapshot.projectSummary) || snapshot.intentUuid;
  const body = [
    "## Intent UUID",
    snapshot.intentUuid,
    "",
    "## Summary",
    summary,
    "",
    "## Phase",
    snapshot.lifecyclePhase,
    "",
    "## Stage",
    snapshot.currentStage,
    "",
    "## Status",
    snapshot.status,
    "",
    "## Updated At",
    snapshot.updatedAt,
    "",
    "## Mirror Marker",
    input.marker,
  ].join("\n");
  return {
    title: `Intent Mirror: ${titleSummary}`,
    body,
    labels: ["amadeus-intent-mirror"],
  };
}

function currentReceipt(context: MirrorStatusContext) {
  return Object.values(context.state.receipts)
    .filter((receipt) =>
      receipt.status === "prepared" ||
      receipt.status === "attempted" ||
      receipt.status === "pending" ||
      receipt.status === "safety-blocked",
    )
    .sort(
      (left, right) =>
        left.preparedAt.localeCompare(right.preparedAt) ||
        left.key.localeCompare(right.key),
    )[0];
}

function currentWarning(context: MirrorStatusContext) {
  return [...context.state.warnings].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      (left.operationId ?? "").localeCompare(right.operationId ?? ""),
  )[0];
}

export function renderMirrorStatus(context: MirrorStatusContext): string {
  const receipt = currentReceipt(context);
  const warning = currentWarning(context);
  const source =
    context.configSources.length === 0
      ? "default"
      : context.configSources.map(oneLine).join(", ");
  const repository =
    context.state.provenance?.createIdentity.repository.canonical ?? "unlinked";
  const issue =
    context.state.issueNumber === null ? "unlinked" : `#${context.state.issueNumber}`;
  const pending = receipt
    ? `${receipt.event.operation} (${receipt.status})`
    : "none";
  const warningText = warning
    ? [
        warning.classification,
        warning.effect,
        warning.occurredAt,
        warning.retryable ? "retryable" : "not-retryable",
        oneLine(warning.summary),
      ].join(" | ")
    : "none";
  const nextAction =
    context.mode === "off"
      ? "Mirror operations are suppressed; use a manual command to act."
      : receipt?.status === "safety-blocked"
        ? "Inspect status and use the guarded repair flow."
        : receipt
          ? "Retry at the next eligible boundary or use a manual command."
          : context.state.issueNumber === null
            ? "Create the mirror at an eligible boundary."
            : "Synchronize at the next eligible boundary.";

  return [
    `Mode: ${context.mode}`,
    `Config Source: ${source}`,
    `Issue: ${issue}`,
    `Repository: ${repository}`,
    `Provenance: ${context.provenanceStatus}`,
    `Pending/Safety Blocked: ${pending}`,
    `Warning: ${warningText}`,
    `Next Action: ${nextAction}`,
  ].join("\n");
}

// The Project face of the operation being asked about, folded into the existing
// per-operation binding rather than a second question: how many boards this one
// approval would touch, and which column it would write (empty when it writes
// none). Absent means the invocation syncs no board at all and the prompt says
// nothing about Projects.
export type MirrorPromptProjects = Readonly<{
  count: number;
  statusNames: readonly string[];
}>;

export type MirrorPromptInput = Readonly<{
  operation: MirrorOperation;
  event: MirrorEventIdentity;
  intentDir: string;
  repository: string;
  issueNumber: number | null;
  projects?: MirrorPromptProjects;
}>;

function projectLine(
  operation: MirrorOperation,
  projects: MirrorPromptProjects,
): string {
  const boards =
    operation === "create"
      ? `${projects.count} board(s) to join`
      : `${projects.count} board(s)`;
  const status =
    projects.statusNames.length === 0
      ? "left unchanged"
      : projects.statusNames.map((name) => `"${oneLine(name)}"`).join(" / ");
  return `Projects: ${boards}; Status: ${status}`;
}

export function renderMirrorPrompt(input: MirrorPromptInput): string {
  if (!MIRROR_USER_CONTRACT.operations.includes(input.operation))
    throw new Error("unsupported Mirror operation");
  const issue =
    input.issueNumber === null ? "not linked" : `#${input.issueNumber}`;
  const projects =
    input.projects !== undefined && input.projects.count > 0
      ? [projectLine(input.operation, input.projects)]
      : [];
  return [
    `Mirror operation: ${input.operation}`,
    `Intent: ${oneLine(input.intentDir)}`,
    `Repository: ${oneLine(input.repository)}`,
    `Issue: ${issue}`,
    ...projects,
    `Boundary: ${input.event.boundary.kind}:${oneLine(input.event.boundary.instance)}`,
    "Approve to run this one guarded operation.",
    "Skip to suppress only this event; later eligible events may ask again.",
  ].join("\n");
}
