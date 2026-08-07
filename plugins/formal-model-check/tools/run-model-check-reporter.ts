import {
  modelCheckExitCode,
  type ModelCheckOutcome,
} from "./run-model-check-domain.ts";

export interface ModelCheckReporter {
  report(runId: string | null, outcome: ModelCheckOutcome): void;
}

/** The detail to surface, or null when this outcome does not carry one. */
function environmentDetail(outcome: ModelCheckOutcome): string | null {
  if (outcome.kind !== "HARNESS_ERROR") return null;
  if (outcome.code !== "ENVIRONMENT_UNAVAILABLE") return null;
  const detail = outcome.detail.trim();
  return detail.length > 0 ? detail : null;
}

export function terminalModelCheckLines(
  runId: string | null,
  outcome: ModelCheckOutcome,
): readonly [string, string] {
  const exitCode = modelCheckExitCode(outcome);
  const detail = environmentDetail(outcome);
  return [
    JSON.stringify({
      schema: "amadeus.run-model-check.v1",
      runId,
      outcome: outcome.kind,
      exitCode,
      errorCode: outcome.kind === "HARNESS_ERROR" ? outcome.code : null,
      // Additive, and deliberately scoped to ENVIRONMENT_UNAVAILABLE.
      //
      // The code alone names a class of failure, not which check failed or what
      // it saw, and for this class that gap was the whole defect (#2410): four
      // intents each rediscovered the same JDK/JAVA_HOME mismatch from the
      // planner source because the terminal output said nothing.
      //
      // It is NOT widened to every HARNESS_ERROR here. Acquisition failures
      // deliberately keep their message off stderr — pinned by
      // t-formal-verif-run-model-check.integration ("publishes acquisition
      // failure as an isolated partial receipt"), whose diagnostic surface is
      // the published env-receipt.json instead. Widening that is a contract
      // change and needs its own ruling, not a side effect of this fix.
      errorDetail: environmentDetail(outcome),
      counterexampleIdentity: outcome.kind === "DETECTED"
        ? outcome.counterexampleIdentity
        : null,
    }),
    detail === null
      ? outcome.kind === "HARNESS_ERROR"
        ? `run-model-check: HARNESS_ERROR (${outcome.code})`
        : `run-model-check: ${outcome.kind}`
      : `run-model-check: HARNESS_ERROR (${(outcome as { code: string }).code}) — ${detail}`,
  ];
}

export class StderrModelCheckReporter implements ModelCheckReporter {
  constructor(private readonly writeLine: (line: string) => void) {}

  report(runId: string | null, outcome: ModelCheckOutcome): void {
    for (const line of terminalModelCheckLines(runId, outcome)) this.writeLine(line);
  }
}
