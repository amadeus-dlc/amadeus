import { isAbsolute } from "node:path";
import { verifyCiAcceptanceArtifacts } from "./ci-model-check-artifacts.ts";
import { ciModelTargetFor, type CiModelTarget } from "./ci-model-check-domain.ts";
import { executeCiModelCheckAcceptance } from "./ci-model-check-runner.ts";
import { NodeCiModelCheckPort } from "./node-ci-model-check-port.ts";
import {
  loadVerifiedTlaSources,
  selectVerifiedModel,
} from "./tla-model-loader.ts";

interface CiCliInput {
  readonly command: "run" | "verify";
  readonly root: string;
  readonly modelName: string | null;
}

interface CiMainDependencies {
  readonly writeError: (value: string) => void;
  readonly loadSources: typeof loadVerifiedTlaSources;
  readonly selectModel: typeof selectVerifiedModel;
  readonly verify: typeof verifyCiAcceptanceArtifacts;
  readonly execute: typeof executeCiModelCheckAcceptance;
  readonly createPort: () => NodeCiModelCheckPort;
}

const DEFAULT_CI_MAIN_DEPENDENCIES: CiMainDependencies = {
  writeError: (value) => process.stderr.write(value),
  loadSources: loadVerifiedTlaSources,
  selectModel: selectVerifiedModel,
  verify: verifyCiAcceptanceArtifacts,
  execute: executeCiModelCheckAcceptance,
  createPort: () => new NodeCiModelCheckPort(process.cwd()),
};

export function parseCiArguments(argv: readonly string[]): CiCliInput | null {
  if (
    (argv[0] !== "run" && argv[0] !== "verify")
    || argv[1] !== "--root"
    || typeof argv[2] !== "string"
    || !isAbsolute(argv[2])
  ) {
    return null;
  }
  if (argv.length === 3) {
    return { command: argv[0], root: argv[2], modelName: null };
  }
  if (argv.length === 5 && argv[3] === "--model" && argv[4]) {
    return { command: argv[0], root: argv[2], modelName: argv[4] };
  }
  return null;
}

export async function main(
  argv: readonly string[],
  overrides: Partial<CiMainDependencies> = {},
): Promise<0 | 2> {
  const dependencies = { ...DEFAULT_CI_MAIN_DEPENDENCIES, ...overrides };
  const input = parseCiArguments(argv);
  if (input === null) {
    dependencies.writeError(
      "usage: run-model-check-ci.ts run|verify --root <absolute-path> [--model <registered-name>]\n",
    );
    return 2;
  }
  const models = loadSelectedModelTargets(input.modelName, dependencies);
  if (models === null) return 2;
  if (input.command === "verify") return verifyArtifacts(input.root, models, dependencies);
  return runAcceptance(input.root, models, dependencies);
}

function writeHarnessError(
  error: { readonly code: string; readonly detail: string },
  dependencies: CiMainDependencies,
): void {
  dependencies.writeError(`${JSON.stringify({
    kind: "HARNESS_ERROR",
    code: error.code,
    detail: error.detail,
  })}\n`);
}

function loadSelectedModelTargets(
  modelName: string | null,
  dependencies: CiMainDependencies,
): CiModelTarget[] | null {
  const loaded = dependencies.loadSources();
  if (!loaded.ok) {
    writeHarnessError(loaded.error, dependencies);
    return null;
  }
  let selected = loaded.value.models;
  if (modelName !== null) {
    const model = dependencies.selectModel(loaded.value, modelName);
    if (!model.ok) {
      writeHarnessError(model.error, dependencies);
      return null;
    }
    selected = [model.value];
  }
  return selected.map(ciModelTargetFor);
}

function verifyArtifacts(
  root: string,
  models: readonly CiModelTarget[],
  dependencies: CiMainDependencies,
): 0 | 2 {
  const verified = dependencies.verify(root, models.map((model) => model.name));
  dependencies.writeError(`${JSON.stringify({
    kind: verified.ok ? "NOT_DETECTED" : "HARNESS_ERROR",
    code: verified.ok ? "CI_ARTIFACTS_VERIFIED" : "CI_ARTIFACTS_INVALID",
    detail: verified.ok ? "CI model-check artifacts verified" : verified.error,
  })}\n`);
  return verified.ok ? 0 : 2;
}

async function runAcceptance(
  root: string,
  models: readonly CiModelTarget[],
  dependencies: CiMainDependencies,
): Promise<0 | 2> {
  const result = await dependencies.execute(
    {
      evidenceRoot: root,
      runtime: {
        bunVersion: Bun.version,
        runnerOs: process.env.RUNNER_OS ?? "",
        runnerArch: process.env.RUNNER_ARCH ?? "",
        githubRunId: process.env.GITHUB_RUN_ID ?? "",
        githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "",
        headSha: process.env.GITHUB_SHA ?? "",
      },
      models,
    },
    dependencies.createPort(),
  );
  dependencies.writeError(`${JSON.stringify(result)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
