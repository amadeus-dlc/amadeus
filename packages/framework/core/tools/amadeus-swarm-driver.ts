// Versioned JSON CLI for the shared swarm-driver lifecycle.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolveProjectDir } from "./amadeus-lib.ts";
import {
  createProductionCoordinator,
  type NativeExecutionPort,
  type RuntimeError,
  type SwarmDriverCoordinator,
} from "./amadeus-swarm-driver-runtime.ts";
import {
  digestValue,
  parseFinalizeRequestBinding,
  parseRefereeFinalizeEnvelope,
  rejectSecretLikeFields,
} from "./amadeus-swarm-driver-lifecycle.ts";
import {
  FLOOR_DRIVER_VALUES,
  HARNESS_VALUES,
  type LegacyExecution,
  type SwarmEnvironment,
} from "./amadeus-swarm-driver-contract.ts";
import { createLifecycleNativeExecution } from "./amadeus-swarm-native-execution.ts";

const COMMANDS = Object.freeze([
  "resolve",
  "run",
  "resume",
  "record-floor",
  "record-legacy",
  "record-finalize",
  "status",
] as const);
type Command = (typeof COMMANDS)[number];

type CliContext = Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
}>;

export type SwarmDriverCliResult = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export type SwarmDriverCliDependencies = Readonly<{
  coordinator(context: CliContext): SwarmDriverCoordinator;
  environment: SwarmEnvironment;
  now(): Date;
  mintId(): string;
}>;

const failClosedNativeExecution: NativeExecutionPort = createLifecycleNativeExecution({
  resources: Object.freeze({
    async materialize() {
      throw new Error("NATIVE_RESOURCE_SUPERVISOR_UNIMPLEMENTED");
    },
    async cleanup() {},
  }),
  capture: Object.freeze({
    async start() {
      throw new Error("NATIVE_CAPTURE_SUPERVISOR_UNIMPLEMENTED");
    },
  }),
  process: Object.freeze({
    plan({ nativeRunId }) {
      return Object.freeze({
        nativeRunId,
        identityRelativePath: `.amadeus/native/${nativeRunId}/identity.json`,
        armRelativePath: `.amadeus/native/${nativeRunId}/arm.json`,
        armDigest: digestValue({ nativeRunId, kind: "one-time-arm" }),
      });
    },
    async spawn() {
      throw new Error("NATIVE_PROCESS_SUPERVISOR_UNIMPLEMENTED");
    },
  }),
});

function productionDependencies(): SwarmDriverCliDependencies {
  return Object.freeze({
    coordinator: (context) =>
      createProductionCoordinator({
        ...context,
        nativeExecution: failClosedNativeExecution,
      }),
    environment: Object.freeze({
      ...(Object.hasOwn(process.env, "AMADEUS_SWARM_DRIVER")
        ? { AMADEUS_SWARM_DRIVER: process.env.AMADEUS_SWARM_DRIVER }
        : {}),
      ...(Object.hasOwn(process.env, "AMADEUS_USE_SWARM")
        ? { AMADEUS_USE_SWARM: process.env.AMADEUS_USE_SWARM }
        : {}),
    }),
    now: () => new Date(),
    mintId: randomUUID,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const COMMAND_BODY_KEYS: Readonly<Record<Command, ReadonlySet<string>>> = Object.freeze({
  resolve: new Set(["schemaVersion", "harness", "batch", "units", "topologySignals"]),
  run: new Set([
    "schemaVersion",
    "executionId",
    "attemptId",
    "batch",
    "preparedUnits",
    "convergenceCommand",
    "protectedSpec",
    "evidenceDir",
    "gitBinding",
  ]),
  resume: new Set(["schemaVersion", "batch"]),
  "record-floor": new Set([
    "schemaVersion",
    "executionId",
    "attemptId",
    "batch",
    "selected",
    "planDigest",
    "completedUnits",
    "resultDigest",
  ]),
  "record-legacy": new Set([
    "schemaVersion",
    "executionId",
    "attemptId",
    "batch",
    "execution",
    "planDigest",
    "completedUnits",
    "resultDigest",
  ]),
  "record-finalize": new Set(["schemaVersion", "phase", "binding", "envelope"]),
  status: new Set(["schemaVersion", "batch"]),
});

function versionedRecord(raw: string, command: Command): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || value.schemaVersion !== 1) return null;
    if (Object.keys(value).some((key) => !COMMAND_BODY_KEYS[command].has(key))) return null;
    if (rejectSecretLikeFields(value).type === "err") return null;
    return value;
  } catch {
    return null;
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function success(value: unknown, stderr = ""): SwarmDriverCliResult {
  return Object.freeze({
    exitCode: 0,
    stdout: json({ schemaVersion: 1, ok: true, result: value }),
    stderr,
  });
}

function errorResult(
  code: string,
  exitCode: number,
  details?: unknown,
): SwarmDriverCliResult {
  return Object.freeze({
    exitCode,
    stdout: json({
      schemaVersion: 1,
      ok: false,
      error: { code, ...(details === undefined ? {} : { details }) },
    }),
    stderr: `${code}\n`,
  });
}

function runtimeExit(error: RuntimeError): number {
  if (error.code === "INPUT_INVALID" || error.code === "SELECTION_FAILED") return 2;
  if (error.code === "EXPLICIT_DRIVER_UNAVAILABLE") return 3;
  if (error.code === "EVIDENCE_INVALID") return 5;
  return 4;
}

function runtimeResult<T>(result: Readonly<{ type: "ok"; value: T }> | Readonly<{ type: "err"; error: RuntimeError }>) {
  if (result.type === "ok") return success(result.value);
  return errorResult(result.error.code, runtimeExit(result.error), result.error.selectorError);
}

function parseInvocation(argv: readonly string[]):
  | Readonly<{ type: "ok"; command: Command; context: CliContext; inputPath?: string }>
  | Readonly<{ type: "err" }> {
  let command: Command | undefined;
  let projectDir: string | undefined;
  let intent: string | undefined;
  let space: string | undefined;
  let inputPath: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if ((COMMANDS as readonly string[]).includes(argument)) {
      if (command) return Object.freeze({ type: "err" });
      command = argument as Command;
      continue;
    }
    const [name, inlineValue] = argument.split("=", 2);
    if (!["--project-dir", "--intent", "--space", "--input"].includes(name)) {
      return Object.freeze({ type: "err" });
    }
    const value = inlineValue ?? argv[++index];
    if (!value) return Object.freeze({ type: "err" });
    if (name === "--project-dir") projectDir = value;
    else if (name === "--intent") intent = value;
    else if (name === "--space") space = value;
    else inputPath = value;
  }
  if (!command) return Object.freeze({ type: "err" });
  return Object.freeze({
    type: "ok",
    command,
    context: Object.freeze({
      projectDir: resolveProjectDir(projectDir),
      ...(intent ? { intent } : {}),
      ...(space ? { space } : {}),
    }),
    ...(inputPath ? { inputPath } : {}),
  });
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function positiveBatch(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isLegacyExecution(value: unknown): value is LegacyExecution {
  return value === "claude-dynamic-workflow" || FLOOR_DRIVER_VALUES.includes(value as never);
}

export async function executeSwarmDriverCommand(
  argv: readonly string[],
  rawInput: string,
  dependencies: SwarmDriverCliDependencies = productionDependencies(),
): Promise<SwarmDriverCliResult> {
  const invocation = parseInvocation(argv);
  if (invocation.type === "err") return errorResult("USAGE_INVALID", 2);
  const body = versionedRecord(
    invocation.inputPath ? readFileSync(invocation.inputPath, "utf-8") : rawInput,
    invocation.command,
  );
  if (!body) return errorResult("INPUT_SCHEMA_INVALID", 2);
  const coordinator = dependencies.coordinator(invocation.context);

  try {
    switch (invocation.command) {
      case "resolve": {
        if (
          !HARNESS_VALUES.includes(body.harness as never) ||
          !positiveBatch(body.batch) ||
          !stringArray(body.units) ||
          !Array.isArray(body.topologySignals)
        ) {
          return errorResult("INPUT_SCHEMA_INVALID", 2);
        }
        const result = await coordinator.resolve({
          harness: body.harness as (typeof HARNESS_VALUES)[number],
          batch: body.batch,
          units: body.units,
          topologySignals: body.topologySignals,
          selectionEnvironment: dependencies.environment,
          probeEnvironment: Object.freeze(
            Object.fromEntries(
              Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
            ),
          ),
          projectDir: invocation.context.projectDir,
        });
        const warning = Object.hasOwn(dependencies.environment, "AMADEUS_USE_SWARM")
          ? "AMADEUS_USE_SWARM_DEPRECATED\n"
          : "";
        const output = runtimeResult(result);
        return Object.freeze({ ...output, stderr: `${warning}${output.stderr}` });
      }
      case "run": {
        if (
          typeof body.executionId !== "string" ||
          typeof body.attemptId !== "string" ||
          !positiveBatch(body.batch) ||
          !Array.isArray(body.preparedUnits) ||
          typeof body.convergenceCommand !== "string" ||
          typeof body.evidenceDir !== "string" ||
          !isRecord(body.gitBinding) ||
          (body.protectedSpec !== undefined && typeof body.protectedSpec !== "string")
        ) {
          return errorResult("INPUT_SCHEMA_INVALID", 2);
        }
        return runtimeResult(
          await coordinator.run({
            executionId: body.executionId,
            attemptId: body.attemptId,
            batch: body.batch,
            preparedUnits: body.preparedUnits as never,
            convergenceCommand: body.convergenceCommand,
            ...(typeof body.protectedSpec === "string" ? { protectedSpec: body.protectedSpec } : {}),
            evidenceDir: body.evidenceDir,
            gitBinding: body.gitBinding as never,
          }),
        );
      }
      case "record-floor": {
        if (
          typeof body.executionId !== "string" ||
          typeof body.attemptId !== "string" ||
          !positiveBatch(body.batch) ||
          !FLOOR_DRIVER_VALUES.includes(body.selected as never) ||
          typeof body.planDigest !== "string" ||
          !stringArray(body.completedUnits) ||
          typeof body.resultDigest !== "string"
        ) {
          return errorResult("INPUT_SCHEMA_INVALID", 2);
        }
        return runtimeResult(
          coordinator.recordFloor({
            executionId: body.executionId,
            attemptId: body.attemptId,
            batch: body.batch,
            selected: body.selected as (typeof FLOOR_DRIVER_VALUES)[number],
            planDigest: body.planDigest,
            completedUnits: body.completedUnits,
            resultDigest: body.resultDigest,
          }),
        );
      }
      case "record-legacy": {
        if (
          typeof body.executionId !== "string" ||
          typeof body.attemptId !== "string" ||
          !positiveBatch(body.batch) ||
          !isLegacyExecution(body.execution) ||
          typeof body.planDigest !== "string" ||
          !stringArray(body.completedUnits) ||
          typeof body.resultDigest !== "string"
        ) {
          return errorResult("INPUT_SCHEMA_INVALID", 2);
        }
        return runtimeResult(
          coordinator.recordLegacy({
            executionId: body.executionId,
            attemptId: body.attemptId,
            batch: body.batch,
            execution: body.execution,
            planDigest: body.planDigest,
            completedUnits: body.completedUnits,
            resultDigest: body.resultDigest,
          }),
        );
      }
      case "record-finalize": {
        if (body.phase === "request" && isRecord(body.binding)) {
          if (Object.hasOwn(body, "envelope")) return errorResult("INPUT_SCHEMA_INVALID", 2);
          const parsed = parseFinalizeRequestBinding(body.binding);
          if (parsed.type === "err") return errorResult("INPUT_SCHEMA_INVALID", 2);
          return runtimeResult(coordinator.recordFinalizeRequest(parsed.value));
        }
        if (body.phase === "result" && isRecord(body.envelope)) {
          if (Object.hasOwn(body, "binding")) return errorResult("INPUT_SCHEMA_INVALID", 2);
          const parsed = parseRefereeFinalizeEnvelope(body.envelope);
          if (parsed.type === "err") return errorResult("INPUT_SCHEMA_INVALID", 2);
          return runtimeResult(coordinator.recordFinalizeResult(parsed.value));
        }
        return errorResult("INPUT_SCHEMA_INVALID", 2);
      }
      case "resume": {
        if (!positiveBatch(body.batch)) return errorResult("INPUT_SCHEMA_INVALID", 2);
        const checkpoint = coordinator.status(body.batch);
        if (checkpoint?.state !== "failed-resumable") {
          return errorResult("CHECKPOINT_STATE_INVALID", 4);
        }
        return runtimeResult(
          await coordinator.resume({
            batch: body.batch,
            previousAttemptId: checkpoint.attemptId,
            newAttemptId: dependencies.mintId(),
            nonceHash: digestValue(dependencies.mintId()),
            leaseId: dependencies.mintId(),
            ownerId: digestValue({ pid: process.pid, ppid: process.ppid }),
            mutationId: dependencies.mintId(),
            reusedConvergedUnits: Object.entries(checkpoint.unitStates)
              .filter(([, state]) => state === "referee-converged")
              .map(([unit]) => unit),
          }),
        );
      }
      case "status":
        if (!positiveBatch(body.batch)) return errorResult("INPUT_SCHEMA_INVALID", 2);
        return success(coordinator.status(body.batch));
    }
  } catch {
    return errorResult("PERSISTENCE_FAILED", 6);
  }
}

async function main(): Promise<void> {
  const result = await executeSwarmDriverCommand(
    process.argv.slice(2),
    process.stdin.isTTY ? "" : readFileSync(0, "utf-8"),
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

if (import.meta.main) await main();
