import { isAbsolute } from "node:path";
import { verifyCiAcceptanceArtifacts } from "./ci-model-check-artifacts.ts";
import { executeCiModelCheckAcceptance } from "./ci-model-check-runner.ts";
import { NodeCiModelCheckPort } from "./node-ci-model-check-port.ts";

function usage(): never {
  process.stderr.write("usage: run-model-check-ci.ts run|verify --root <absolute-path>\n");
  process.exit(2);
}

function parseRoot(argv: readonly string[]): { command: "run" | "verify"; root: string } {
  if (
    (argv[0] !== "run" && argv[0] !== "verify")
    || argv[1] !== "--root"
    || typeof argv[2] !== "string"
    || argv.length !== 3
    || !isAbsolute(argv[2])
  ) {
    return usage();
  }
  return { command: argv[0], root: argv[2] };
}

async function main(argv: readonly string[]): Promise<0 | 2> {
  const input = parseRoot(argv);
  if (input.command === "verify") {
    const verified = verifyCiAcceptanceArtifacts(input.root);
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
    },
    new NodeCiModelCheckPort(process.cwd()),
  );
  process.stderr.write(`${JSON.stringify(result)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
