import type { Result } from "./contract.ts";
import type {
  TlcExploration,
  TlcToolchainError,
} from "./tlc-toolchain.ts";

export type ModelCheckProvider = "auto" | "sandbox-exec" | "docker";

export interface RunModelCheckInput {
  readonly modelPath: string;
  readonly cfgPath: string;
  readonly outDir: string;
  readonly provider: ModelCheckProvider;
  readonly advisory?: {
    readonly target: string;
    readonly specIdentity: string;
    readonly instance: string;
  };
}

export interface CliError {
  readonly kind: "MISSING_ARG" | "UNKNOWN_ARG" | "INVALID_PROVIDER";
  readonly detail: string;
}

export interface EnvVerifyContext {
  readonly runId: string;
  readonly workspaceRoot: string;
  readonly scratchRoot: string;
  readonly jarPath: string;
  readonly jarSha256: string;
  readonly deadlineMs: number;
}

export type EnvSnapshot =
  | {
      readonly kind: "DARWIN";
      readonly plannerIdentity: string;
      readonly jarSha256: string;
      readonly jdkIdentity: string;
      readonly sandboxIdentity: string;
    }
  | {
      readonly kind: "DOCKER";
      readonly plannerIdentity: string;
      readonly imageRef: string;
      readonly jarSha256: string;
    };

export type EnvInspectionId =
  | "image-digest"
  | "jar-sha256"
  | "network-deny"
  | "jdk-snapshot"
  | "sandbox-profile";

export type EnvInspection =
  | {
      readonly id: EnvInspectionId;
      readonly status: "passed";
      readonly expected: string;
      readonly observed: string;
      readonly reason: "";
    }
  | {
      readonly id: EnvInspectionId;
      readonly status: "failed";
      readonly expected: string;
      readonly observed: string;
      readonly reason: string;
    }
  | {
      readonly id: EnvInspectionId;
      readonly status: "not-applicable";
      readonly expected: null;
      readonly observed: null;
      readonly reason: string;
    }
  | {
      readonly id: EnvInspectionId;
      readonly status: "not-run";
      readonly expected: string;
      readonly observed: null;
      readonly reason: string;
    };

export interface EnvInspectionPlan {
  readonly id: EnvInspectionId;
  readonly expected: string | null;
  readonly notApplicableReason: string | null;
}

export interface EnvReceipt {
  readonly schema: "amadeus.env-receipt.v1";
  readonly runId: string;
  readonly planner: string;
  readonly inspections: readonly EnvInspection[];
}

export function passedInspection(
  id: EnvInspectionId,
  expected: string,
  observed: string = expected,
): EnvInspection {
  return { id, status: "passed", expected, observed, reason: "" };
}

export function notApplicableInspection(
  id: EnvInspectionId,
  reason: string,
): EnvInspection {
  return { id, status: "not-applicable", expected: null, observed: null, reason };
}

export function failedInspection(
  id: EnvInspectionId,
  expected: string,
  observed: string,
  reason: string,
): EnvInspection {
  return { id, status: "failed", expected, observed, reason };
}

export function buildEnvReceipt(
  runId: string,
  planner: string,
  inspections: readonly EnvInspection[],
): EnvReceipt {
  return Object.freeze({
    schema: "amadeus.env-receipt.v1",
    runId,
    planner,
    inspections: Object.freeze([...inspections]),
  });
}

export function buildNotRunEnvReceipt(
  runId: string,
  planner: string,
  plan: readonly EnvInspectionPlan[],
  reason: string,
): EnvReceipt {
  return buildEnvReceipt(
    runId,
    planner,
    plan.map((inspection): EnvInspection => inspection.notApplicableReason === null
      ? {
          id: inspection.id,
          status: "not-run",
          expected: inspection.expected!,
          observed: null,
          reason,
        }
      : notApplicableInspection(inspection.id, inspection.notApplicableReason)),
  );
}

export interface TlcSpawnPlanner {
  readonly identity: string;
  buildArgv(manifestArgv: readonly string[]): readonly string[];
  snapshotEnvironment(
    context: EnvVerifyContext,
  ): Promise<Result<EnvSnapshot, TlcToolchainError>>;
  verifyEnvironment(
    snapshot: EnvSnapshot,
  ): Promise<Result<EnvReceipt, TlcToolchainError>>;
}

export interface DockerPlannerConfig {
  readonly imageRef: string;
  readonly jarPath: string;
  readonly jarSha256: string;
}

export type ModelCheckOutcome =
  | { readonly kind: "NOT_DETECTED" }
  | { readonly kind: "DETECTED"; readonly counterexampleIdentity: string }
  | {
      readonly kind: "HARNESS_ERROR";
      readonly code: string;
      readonly detail: string;
    };

const ADVISORY_OPTIONS = [
  "--advisory-target",
  "--advisory-spec-identity",
  "--advisory-instance",
] as const;
const VALUE_OPTIONS = new Set(["--model", "--cfg", "--out", "--provider", ...ADVISORY_OPTIONS]);

function parseProvider(value: string): Result<ModelCheckProvider, CliError> {
  if (value === "auto" || value === "sandbox-exec" || value === "docker") {
    return { ok: true, value };
  }
  return {
    ok: false,
    error: { kind: "INVALID_PROVIDER", detail: `unsupported provider: ${value}` },
  };
}

function advisoryFromValues(values: ReadonlyMap<string, string>): RunModelCheckInput["advisory"] {
  if (!ADVISORY_OPTIONS.every((option) => values.has(option))) return undefined;
  return {
    target: values.get("--advisory-target")!,
    specIdentity: values.get("--advisory-spec-identity")!,
    instance: values.get("--advisory-instance")!,
  };
}

export function parseRunModelCheckArgs(
  argv: readonly string[],
): Result<RunModelCheckInput, CliError> {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]!;
    if (!VALUE_OPTIONS.has(option) || values.has(option)) {
      return {
        ok: false,
        error: { kind: "UNKNOWN_ARG", detail: `unknown or duplicate argument: ${option}` },
      };
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--") || value.length === 0) {
      return {
        ok: false,
        error: { kind: "MISSING_ARG", detail: `missing value for ${option}` },
      };
    }
    values.set(option, value);
    index += 1;
  }
  for (const required of ["--model", "--cfg", "--out"]) {
    if (!values.has(required)) {
      return {
        ok: false,
        error: { kind: "MISSING_ARG", detail: `required argument is missing: ${required}` },
      };
    }
  }
  const provider = parseProvider(values.get("--provider") ?? "auto");
  if (!provider.ok) return provider;
  const advisoryCount = ADVISORY_OPTIONS.filter((option) => values.has(option)).length;
  if (advisoryCount !== 0 && advisoryCount !== ADVISORY_OPTIONS.length) {
    return {
      ok: false,
      error: { kind: "MISSING_ARG", detail: "all advisory correlation arguments are required together" },
    };
  }
  return {
    ok: true,
    value: {
      modelPath: values.get("--model")!,
      cfgPath: values.get("--cfg")!,
      outDir: values.get("--out")!,
      provider: provider.value,
      ...(advisoryCount === ADVISORY_OPTIONS.length ? { advisory: advisoryFromValues(values)! } : {}),
    },
  };
}

export function toModelCheckOutcome(exploration: TlcExploration): ModelCheckOutcome {
  switch (exploration.kind) {
    case "COMPLETE":
      return { kind: "NOT_DETECTED" };
    case "COUNTEREXAMPLE":
      return {
        kind: "DETECTED",
        counterexampleIdentity: exploration.counterexampleIdentity,
      };
    case "HARNESS_ERROR":
      return {
        kind: "HARNESS_ERROR",
        code: exploration.reason,
        detail: exploration.detail,
      };
  }
}

export function toolchainErrorOutcome(
  error: TlcToolchainError,
): Extract<ModelCheckOutcome, { kind: "HARNESS_ERROR" }> {
  return {
    kind: "HARNESS_ERROR",
    code: "code" in error ? error.code : error.kind,
    detail: error.message,
  };
}

export function modelCheckExitCode(outcome: ModelCheckOutcome): 0 | 1 | 2 {
  if (outcome.kind === "NOT_DETECTED") return 0;
  if (outcome.kind === "DETECTED") return 1;
  return 2;
}
