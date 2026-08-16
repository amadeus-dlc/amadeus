import { createHash } from "node:crypto";
import { readContainedFile } from "./amadeus-contained-file.ts";
import { createFindingMutationPermit } from "./amadeus-finding-capability.ts";
import type {
  FindingGitHubGateway,
  FindingKind,
} from "./amadeus-finding-types.ts";
import type { GitHubRepository } from "./amadeus-github-types.ts";
import {
  resolveAmadeusConfig,
} from "./amadeus-config.ts";
import {
  createFindingGitHubGatewayAdapter,
} from "./amadeus-github-gateway.ts";
import { createGitHubProcessRunner } from "./amadeus-process-runner.ts";

const AMADEUS_REPOSITORY = Object.freeze({
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
}) satisfies GitHubRepository;

export type AmadeusFindingInput = Readonly<{
  projectDir: string;
  kind: FindingKind;
  title: string;
  body: string;
  fingerprint: string;
  approved?: boolean;
}>;

export type FindingCoordinatorDependencies = Readonly<{
  resolveConfig: (projectDir: string) => FindingConfigOutcome;
  gateway: FindingGitHubGateway;
}>;

export type FindingConfigOutcome =
  | Readonly<{
      kind: "resolved";
      creationMode: "off" | "prompt" | "auto";
    }>
  | Readonly<{ kind: "invalid" }>;

export type FindingIssueCreationOutcome =
  | Readonly<{
      kind: "created" | "existing";
      issueNumber: number;
      issueUrl: string;
      marker: string;
      // "CLOSED" on an existing match means the identical fingerprint was
      // already fixed once: a re-observation is a possible regression, and the
      // protocol surfaces it to the human instead of treating it as settled.
      issueState: "OPEN" | "CLOSED";
    }>
  | Readonly<{
      kind: "disabled" | "approval-required";
      marker: string;
    }>
  | Readonly<{
      kind: "failure";
      reason: "invalid-config" | "github" | "ambiguous-marker";
      marker: string;
    }>;

export function findingMarker(fingerprint: string): string {
  const digest = createHash("sha256").update(fingerprint).digest("hex");
  return `<!-- amadeus-finding:${digest} -->`;
}

function findingLabel(kind: FindingKind): "bug" | "enhancement" {
  return kind === "defect" ? "bug" : "enhancement";
}

function issueUrl(issueNumber: number): string {
  return `https://github.com/${AMADEUS_REPOSITORY.canonical}/issues/${issueNumber}`;
}

export async function createGithubIssueForFinding(
  input: AmadeusFindingInput,
  dependencies: FindingCoordinatorDependencies,
): Promise<FindingIssueCreationOutcome> {
  const marker = findingMarker(input.fingerprint);
  const resolved = dependencies.resolveConfig(input.projectDir);
  if (resolved.kind === "invalid") {
    return { kind: "failure", reason: "invalid-config", marker };
  }
  if (!input.approved && resolved.creationMode === "off") {
    return { kind: "disabled", marker };
  }
  if (!input.approved && resolved.creationMode === "prompt") {
    return { kind: "approval-required", marker };
  }

  const ready = await dependencies.gateway.readiness(AMADEUS_REPOSITORY);
  if (ready.kind === "failure") {
    return { kind: "failure", reason: "github", marker };
  }
  const found = await dependencies.gateway.findIssuesByMarker(
    AMADEUS_REPOSITORY,
    marker,
  );
  if (found.kind === "failure") {
    return { kind: "failure", reason: "github", marker };
  }
  if (found.value.length > 1) {
    return { kind: "failure", reason: "ambiguous-marker", marker };
  }
  const existing = found.value[0];
  if (existing !== undefined) {
    return {
      kind: "existing",
      issueNumber: existing.number,
      issueUrl: issueUrl(existing.number),
      marker,
      issueState: existing.state,
    };
  }

  const permit = createFindingMutationPermit({
    repository: AMADEUS_REPOSITORY,
    marker,
  });
  const created = await dependencies.gateway.createFindingIssue(permit, {
    title: input.title,
    body: `${marker}\n\n${input.body}`,
    labels: [findingLabel(input.kind)],
  });
  if (created.kind === "failure") {
    return { kind: "failure", reason: "github", marker };
  }
  return {
    kind: "created",
    issueNumber: created.value.number,
    issueUrl: issueUrl(created.value.number),
    marker,
    issueState: created.value.state,
  };
}

export const defaultFindingDependencies = {
  resolveConfig: (projectDir: string): FindingConfigOutcome => {
    const outcome = resolveAmadeusConfig(projectDir);
    return outcome.kind === "invalid"
      ? { kind: "invalid" }
      : {
          kind: "resolved",
          creationMode: outcome.config.finding.github.issue.creation.consent,
        };
  },
} satisfies Pick<FindingCoordinatorDependencies, "resolveConfig">;

type CreateGithubIssueCommand = Readonly<{
  projectDir: string;
  kind: FindingKind;
  title: string;
  bodyFile: string;
  fingerprint: string;
  approved: boolean;
}>;

type CollectedCreationFlags = Readonly<{
  values: Map<string, string>;
  approved: boolean;
}>;

const CREATION_VALUE_FLAGS = new Set([
  "--project-dir",
  "--kind",
  "--title",
  "--body-file",
  "--fingerprint",
]);

function collectCreationFlags(argv: readonly string[]): CollectedCreationFlags {
  const values = new Map<string, string>();
  let approved = false;
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--approved") {
      approved = true;
      continue;
    }
    if (flag === undefined || !CREATION_VALUE_FLAGS.has(flag)) {
      throw new Error(`unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }
    values.set(flag, value);
    index += 1;
  }
  return { values, approved };
}

function requiredCreationValue(
  values: ReadonlyMap<string, string>,
  flag: string,
  maxLength?: number,
): string {
  const value = values.get(flag);
  if (
    value === undefined ||
    value.length === 0 ||
    (maxLength !== undefined && value.length > maxLength)
  ) {
    throw new Error(`invalid or missing ${flag}`);
  }
  return value;
}

function findingKind(value: string): FindingKind {
  if (value !== "defect" && value !== "concern") {
    throw new Error("invalid --kind");
  }
  return value;
}

function parseCreateGithubIssueCommand(
  argv: readonly string[],
): CreateGithubIssueCommand {
  if (argv[0] !== "create-github-issue") {
    throw new Error("expected the create-github-issue subcommand");
  }
  const { values, approved } = collectCreationFlags(argv);
  return {
    projectDir: requiredCreationValue(values, "--project-dir"),
    kind: findingKind(requiredCreationValue(values, "--kind")),
    title: requiredCreationValue(values, "--title", 256),
    bodyFile: requiredCreationValue(values, "--body-file"),
    fingerprint: requiredCreationValue(values, "--fingerprint", 512),
    approved,
  };
}

function readFindingBody(projectDir: string, bodyFile: string): string {
  const outcome = readContainedFile({
    rootDir: projectDir,
    path: bodyFile,
    maxBytes: 64 * 1024,
    allowEmpty: false,
  });
  if (outcome.kind !== "text") throw new Error("invalid finding body");
  return outcome.text;
}

export type FindingCliResult = Readonly<{
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}>;

export async function runFindingCli(
  argv: readonly string[],
  dependencies: FindingCoordinatorDependencies,
): Promise<FindingCliResult> {
  try {
    const command = parseCreateGithubIssueCommand(argv);
    const outcome = await createGithubIssueForFinding(
      {
        projectDir: command.projectDir,
        kind: command.kind,
        title: command.title,
        body: readFindingBody(command.projectDir, command.bodyFile),
        fingerprint: command.fingerprint,
        approved: command.approved,
      },
      dependencies,
    );
    return {
      exitCode: outcome.kind === "failure" ? 1 : 0,
      stdout: `${JSON.stringify(outcome)}\n`,
      stderr: "",
    };
  } catch (cause) {
    // Every throw on this path is a locally-minted fixed string (argv / body
    // validation) — never remote output — so the reason is safe to surface and
    // tells the conductor which input to correct.
    const reason = cause instanceof Error ? cause.message : "invalid input";
    return {
      exitCode: 2,
      stdout: "",
      stderr: `amadeus-finding: ${reason}\n`,
    };
  }
}

export async function runFindingMain(argv = process.argv.slice(2)): Promise<void> {
  const result = await runFindingCli(argv, {
    resolveConfig: defaultFindingDependencies.resolveConfig,
    gateway: createFindingGitHubGatewayAdapter(createGitHubProcessRunner()),
  });
  if (result.stdout.length > 0) process.stdout.write(result.stdout);
  if (result.stderr.length > 0) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

if (import.meta.main) {
  await runFindingMain();
}
