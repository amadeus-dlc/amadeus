import type { SetupResult, SetupExitCode } from "../domain/apply-types.ts";
import type { EntrypointResult, SetupError } from "../domain/installer-contracts.ts";
import { renderError, renderPlan, renderResult } from "./reporter.ts";

export function renderSetupError(error: SetupError, exitCode: SetupExitCode = 2): EntrypointResult {
  return {
    code: exitCode,
    stdout: "",
    stderr: `${renderError(error)}\n`,
  };
}

export function renderSetupResult(result: SetupResult): EntrypointResult {
  const planPrefix = result.prependPlan && result.plan !== undefined ? `${renderPlan(result.plan)}\n\n` : "";
  const output = `${planPrefix}${renderResult(result, { omitPlan: result.prependPlan })}`;
  if (result.exitCode === 0) {
    return { code: 0, stdout: `${output}\n`, stderr: "" };
  }
  return { code: result.exitCode, stdout: "", stderr: `${output}\n` };
}
