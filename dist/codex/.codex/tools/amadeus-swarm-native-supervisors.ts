// Production composition root for provider-neutral native swarm supervision.

import { join } from "node:path";
import { recordDir } from "./amadeus-lib.ts";
import { createNativeCaptureSupervisor } from "./amadeus-swarm-native-capture.ts";
import {
  createLifecycleNativeExecution,
  type LifecycleNativeExecution,
} from "./amadeus-swarm-native-execution.ts";
import { createNativeProcessPort } from "./amadeus-swarm-native-process.ts";
import { createNativeResourceSupervisor } from "./amadeus-swarm-native-resources.ts";

export type ProductionNativeExecutionInput = Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
}>;

function buildProductionNativeExecution(input: ProductionNativeExecutionInput): LifecycleNativeExecution {
  const root = recordDir(input.projectDir, input.intent, input.space) ?? input.projectDir;
  const capture = createNativeCaptureSupervisor();
  const process = createNativeProcessPort({ rootDir: root, output: capture.output });
  const resources = createNativeResourceSupervisor({
    journalRoot: join(root, ".amadeus-swarm-driver", "native", "resources"),
    recoveryObserver: process.recoveryObserver,
  });
  return createLifecycleNativeExecution({ resources, capture: capture.capture, process });
}

export function createProductionNativeExecution(
  input: ProductionNativeExecutionInput,
): LifecycleNativeExecution {
  let execution: LifecycleNativeExecution | undefined;
  return Object.freeze({
    execute(runInput) {
      execution ??= buildProductionNativeExecution(input);
      return execution.execute(runInput);
    },
  });
}
