// Production composition root for provider-neutral native swarm supervision.

import { join } from "node:path";
import { recordDir } from "./amadeus-lib.ts";
import { createNativeCaptureSupervisor } from "./amadeus-swarm-native-capture.ts";
import {
  createLifecycleNativeExecution,
  type LifecycleNativeExecution,
} from "./amadeus-swarm-native-execution.ts";
import { createNativeProcessPort } from "./amadeus-swarm-native-process.ts";
import { createNativeAttemptRecovery } from "./amadeus-swarm-native-recovery.ts";
import { createNativeResourceSupervisor } from "./amadeus-swarm-native-resources.ts";
import type { AttemptRecoveryPort } from "./amadeus-swarm-driver-runtime.ts";

export type ProductionNativeExecutionInput = Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
}>;

export type ProductionNativeSupervisors = Readonly<{
  execution: LifecycleNativeExecution;
  recovery: AttemptRecoveryPort;
}>;

function buildProductionNativeSupervisors(
  input: ProductionNativeExecutionInput,
): ProductionNativeSupervisors {
  const root = recordDir(input.projectDir, input.intent, input.space) ?? input.projectDir;
  const capture = createNativeCaptureSupervisor();
  const process = createNativeProcessPort({ rootDir: root, output: capture.output });
  const resources = createNativeResourceSupervisor({
    journalRoot: join(root, ".amadeus-swarm-driver", "native", "resources"),
    recoveryObserver: process.recoveryObserver,
  });
  return Object.freeze({
    execution: createLifecycleNativeExecution({ resources, capture: capture.capture, process }),
    recovery: createNativeAttemptRecovery({ process, resources }),
  });
}

export function createProductionNativeSupervisors(
  input: ProductionNativeExecutionInput,
): ProductionNativeSupervisors {
  let supervisors: ProductionNativeSupervisors | undefined;
  const resolve = (): ProductionNativeSupervisors => {
    supervisors ??= buildProductionNativeSupervisors(input);
    return supervisors;
  };
  return Object.freeze({
    execution: Object.freeze({
      execute: (runInput: Parameters<LifecycleNativeExecution["execute"]>[0]) =>
        resolve().execution.execute(runInput),
    }),
    recovery: Object.freeze({
      recover: (recoveryInput: Parameters<AttemptRecoveryPort["recover"]>[0]) =>
        resolve().recovery.recover(recoveryInput),
    }),
  });
}

export function createProductionNativeExecution(
  input: ProductionNativeExecutionInput,
): LifecycleNativeExecution {
  return createProductionNativeSupervisors(input).execution;
}
