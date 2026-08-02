import { isAbsolute } from "node:path";
import { verifyCiAcceptanceArtifacts } from "./ci-model-check-artifacts.ts";
import { ciModelTargetFor } from "./ci-model-check-domain.ts";
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

async function main(argv: readonly string[]): Promise<0 | 2> {
  const input = parseCiArguments(argv);
  if (input === null) {
    process.stderr.write(
      "usage: run-model-check-ci.ts run|verify --root <absolute-path> [--model <registered-name>]\n",
    );
    return 2;
  }
  const loaded = loadVerifiedTlaSources();
  if (!loaded.ok) {
    process.stderr.write(`${JSON.stringify({
      kind: "HARNESS_ERROR",
      code: loaded.error.code,
      detail: loaded.error.detail,
    })}\n`);
    return 2;
  }
  let selected = loaded.value.models;
  if (input.modelName !== null) {
    const model = selectVerifiedModel(loaded.value, input.modelName);
    if (!model.ok) {
      process.stderr.write(`${JSON.stringify({
        kind: "HARNESS_ERROR",
        code: model.error.code,
        detail: model.error.detail,
      })}\n`);
      return 2;
    }
    selected = [model.value];
  }
  const models = selected.map(ciModelTargetFor);
  if (input.command === "verify") {
    const verified = verifyCiAcceptanceArtifacts(
      input.root,
      models.map((model) => model.name),
    );
    process.stderr.write(`${JSON.stringify({
      kind: verified.ok ? "NOT_DETECTED" : "HARNESS_ERROR",
      code: verified.ok ? "CI_ARTIFACTS_VERIFIED" : "CI_ARTIFACTS_INVALID",
      detail: verified.ok ? "CI model-check artifacts verified" : verified.error,
    })}\n`);
    return verified.ok ? 0 : 2;
  }
  const result = await executeCiModelCheckAcceptance(
    {
      evidenceRoot: input.root,
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
    new NodeCiModelCheckPort(process.cwd()),
  );
  process.stderr.write(`${JSON.stringify(result)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
