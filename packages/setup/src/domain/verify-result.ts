import type { HarnessName } from "./harness.ts";
import type { ResolvedVersion } from "./resolved-version.ts";

export type Check = {
  readonly name: "required-files" | "harness-dir" | "tools-dir" | "memory-shell" | "state-absence";
  readonly ok: boolean;
  readonly detail: string;
};

export type VerifyResult = {
  allPassed(): boolean;
  failures(): ReadonlyArray<Check>;
  checks(): ReadonlyArray<Check>;
};

export namespace VerifyResult {
  export function of(checks: readonly Check[]): VerifyResult {
    return Object.freeze({
      allPassed(): boolean {
        return checks.every((check) => check.ok);
      },
      failures(): ReadonlyArray<Check> {
        return checks.filter((check) => !check.ok);
      },
      checks(): ReadonlyArray<Check> {
        return checks;
      },
    });
  }
}

Object.freeze(VerifyResult);

export type NextSteps = {
  readonly harness: HarnessName;
  readonly version: ResolvedVersion;
  readonly target: string;
  lines(): readonly string[];
};

export namespace NextSteps {
  export function of(harness: HarnessName, version: ResolvedVersion, target: string): NextSteps {
    return Object.freeze({
      harness,
      version,
      target,
      lines(): readonly string[] {
        return Object.freeze([
          `Installed ${harness} ${version.tag} to ${target}.`,
          "Next steps:",
          `  1. cd ${target}`,
          "  2. Open your AI harness and run /amadeus (or the equivalent slash command).",
          "  3. Describe what you want to build — the engine starts your first intent automatically.",
        ]);
      },
    });
  }
}

Object.freeze(NextSteps);
