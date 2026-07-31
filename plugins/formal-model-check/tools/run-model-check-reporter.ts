import {
  modelCheckExitCode,
  type ModelCheckOutcome,
} from "./run-model-check-domain.ts";

export interface ModelCheckReporter {
  report(runId: string | null, outcome: ModelCheckOutcome): void;
}

export function terminalModelCheckLines(
  runId: string | null,
  outcome: ModelCheckOutcome,
): readonly [string, string] {
  const exitCode = modelCheckExitCode(outcome);
  return [
    JSON.stringify({
      schema: "amadeus.run-model-check.v1",
      runId,
      outcome: outcome.kind,
      exitCode,
      errorCode: outcome.kind === "HARNESS_ERROR" ? outcome.code : null,
      counterexampleIdentity: outcome.kind === "DETECTED"
        ? outcome.counterexampleIdentity
        : null,
    }),
    outcome.kind === "HARNESS_ERROR"
      ? `run-model-check: HARNESS_ERROR (${outcome.code})`
      : `run-model-check: ${outcome.kind}`,
  ];
}

export class StderrModelCheckReporter implements ModelCheckReporter {
  constructor(private readonly writeLine: (line: string) => void) {}

  report(runId: string | null, outcome: ModelCheckOutcome): void {
    for (const line of terminalModelCheckLines(runId, outcome)) this.writeLine(line);
  }
}
