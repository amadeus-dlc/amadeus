import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createFindingMutationPermit } from "./amadeus-finding-capability.ts";
import type {
  FindingGitHubGateway,
  FindingKind,
} from "./amadeus-finding-types.ts";
import {
  type MirrorConfigOutcome,
  resolveMirrorConfig,
} from "./amadeus-mirror-config.ts";
import {
  createMirrorGitHubGateway,
  parseRepositoryIdentity,
} from "./amadeus-mirror-gateway.ts";
import { createMirrorProcessRunner } from "./amadeus-mirror-runner.ts";
import type { RepositoryIdentity } from "./amadeus-mirror-types.ts";

function canonicalAmadeusRepository(): RepositoryIdentity {
  const repository = parseRepositoryIdentity("amadeus-dlc", "amadeus");
  if (repository === null) {
    throw new Error("invalid canonical Amadeus repository identity");
  }
  return repository;
}

const AMADEUS_REPOSITORY = canonicalAmadeusRepository();

export type AmadeusFindingInput = Readonly<{
  projectDir: string;
  kind: FindingKind;
  title: string;
  body: string;
  fingerprint: string;
  approved?: boolean;
}>;

export type FindingCoordinatorDependencies = Readonly<{
  resolveConfig: (projectDir: string) => MirrorConfigOutcome;
  gateway: FindingGitHubGateway;
}>;

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
  if (!input.approved && resolved.config.autoFileFindings === "off") {
    return { kind: "disabled", marker };
  }
  if (!input.approved && resolved.config.autoFileFindings === "prompt") {
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
    labels: [],
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
  resolveConfig: (projectDir: string): MirrorConfigOutcome =>
    resolveMirrorConfig(projectDir),
} satisfies Pick<FindingCoordinatorDependencies, "resolveConfig">;

type FileCommand = Readonly<{
  projectDir: string;
  kind: FindingKind;
  title: string;
  bodyFile: string;
  fingerprint: string;
  approved: boolean;
}>;

const FILE_VALUE_FLAGS = new Set([
  "--project-dir",
  "--kind",
  "--title",
  "--body-file",
  "--fingerprint",
]);

function collectFileFlags(argv: readonly string[]): {
  values: Map<string, string>;
  approved: boolean;
} {
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
  const projectReal = realpathSync(projectDir);
  const bodyReal = realpathSync(
    isAbsolute(bodyFile) ? bodyFile : resolve(projectReal, bodyFile),
  );
  const rel = relative(projectReal, bodyReal);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("finding body must be inside the workspace");
  }
  const stat = lstatSync(bodyReal);
  if (!stat.isFile() || stat.size > 64 * 1024) {
    throw new Error("finding body must be a regular file no larger than 64 KiB");
  }
  const body = readFileSync(bodyReal, "utf-8");
  if (body.length === 0) throw new Error("finding body must not be empty");
  return body;
}

export async function runFindingMain(argv = process.argv.slice(2)): Promise<void> {
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
      {
        resolveConfig: defaultFindingDependencies.resolveConfig,
        gateway: createMirrorGitHubGateway(createMirrorProcessRunner()),
      },
    );
    process.stdout.write(`${JSON.stringify(outcome)}\n`);
    if (outcome.kind === "failure") process.exitCode = 1;
  } catch {
    process.stderr.write("amadeus-finding: invalid input\n");
    process.exitCode = 2;
  }
}

if (import.meta.main) {
  await runFindingMain();
}
