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
} from "./amadeus-layered-config.ts";
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
      autoFileFindings: "off" | "prompt" | "auto";
    }>
  | Readonly<{ kind: "invalid" }>;

export type FindingFileOutcome =
  | Readonly<{
      kind: "created" | "existing";
      issueNumber: number;
      issueUrl: string;
      marker: string;
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

export async function fileAmadeusFinding(
  input: AmadeusFindingInput,
  dependencies: FindingCoordinatorDependencies,
): Promise<FindingFileOutcome> {
  const marker = findingMarker(input.fingerprint);
  const resolved = dependencies.resolveConfig(input.projectDir);
  if (resolved.kind === "invalid") {
    return { kind: "failure", reason: "invalid-config", marker };
  }
  if (!input.approved && resolved.autoFileFindings === "off") {
    return { kind: "disabled", marker };
  }
  if (!input.approved && resolved.autoFileFindings === "prompt") {
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
  };
}

export const defaultFindingDependencies = {
  resolveConfig: (projectDir: string): FindingConfigOutcome => {
    const outcome = resolveAmadeusConfig(projectDir);
    return outcome.kind === "invalid"
      ? { kind: "invalid" }
      : {
          kind: "resolved",
          autoFileFindings: outcome.config.autoFileFindings,
        };
  },
} satisfies Pick<FindingCoordinatorDependencies, "resolveConfig">;

type FileCommand = Readonly<{
  projectDir: string;
  kind: FindingKind;
  title: string;
  bodyFile: string;
  fingerprint: string;
  approved: boolean;
}>;

type CollectedFileFlags = Readonly<{
  values: Map<string, string>;
  approved: boolean;
}>;

const FILE_VALUE_FLAGS = new Set([
  "--project-dir",
  "--kind",
  "--title",
  "--body-file",
  "--fingerprint",
]);

function collectFileFlags(argv: readonly string[]): CollectedFileFlags {
  const values = new Map<string, string>();
  let approved = false;
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--approved") {
      approved = true;
      continue;
    }
    if (flag === undefined || !FILE_VALUE_FLAGS.has(flag)) {
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

function requiredFileValue(
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

function parseFileCommand(argv: readonly string[]): FileCommand {
  if (argv[0] !== "file") throw new Error("expected the file subcommand");
  const { values, approved } = collectFileFlags(argv);
  return {
    projectDir: requiredFileValue(values, "--project-dir"),
    kind: findingKind(requiredFileValue(values, "--kind")),
    title: requiredFileValue(values, "--title", 256),
    bodyFile: requiredFileValue(values, "--body-file"),
    fingerprint: requiredFileValue(values, "--fingerprint", 512),
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
    const command = parseFileCommand(argv);
    const outcome = await fileAmadeusFinding(
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
  } catch {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "amadeus-finding: invalid input\n",
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
