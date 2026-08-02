// Required state/runtime projection barrier for execution lifecycle (#1602).

import { existsSync, readFileSync } from "node:fs";
import type {
  ExecutionEvent,
  ExecutionEventSet,
  ExecutionProjectionSink,
  ExecutionRepository,
  RequiredProjectionReceipt,
  TelemetryProjectionReceipt,
} from "./amadeus-execution-lifecycle.ts";
import {
  EXECUTION_PROJECTION_DIGEST_FIELD,
  readStateFile,
  runtimeGraphPath,
  setOrInsertField,
  writeFileAtomic,
  writeStateFile,
} from "./amadeus-lib.ts";
import { compile } from "./amadeus-runtime.ts";

export { EXECUTION_PROJECTION_DIGEST_FIELD };

export interface RequiredProjectionPorts {
  readonly writeState?: (projectDir: string, content: string) => void;
  readonly writeRuntime?: (path: string, content: string) => void;
  readonly projectTelemetry?: (event: ExecutionEvent) => void;
}

function projectState(content: string, digest: string): string {
  return setOrInsertField(
    content,
    "## Runtime State",
    EXECUTION_PROJECTION_DIGEST_FIELD,
    digest,
  );
}

export function createRequiredExecutionProjectionSink(
  projectDir: string,
  repository: ExecutionRepository,
  ports: RequiredProjectionPorts = {},
): ExecutionProjectionSink {
  const writeState = ports.writeState ?? writeStateFile;
  const writeRuntime = ports.writeRuntime ?? writeFileAtomic;

  const project = (set: ExecutionEventSet): RequiredProjectionReceipt => {
    const state = projectState(readStateFile(projectDir), set.digest);
    writeState(projectDir, state);

    const graphPath = runtimeGraphPath(projectDir);
    if (!existsSync(graphPath)) {
      compile({ projectDir });
    }
    if (!existsSync(graphPath)) {
      throw new Error("runtime graph compile did not produce an execution projection target");
    }
    const raw = JSON.parse(readFileSync(graphPath, "utf-8")) as Record<string, unknown>;
    const projected = {
      ...raw,
      execution_observability: {
        root_operation_id: set.rootOperationId,
        event_set_digest: set.digest,
      },
    };
    writeRuntime(graphPath, `${JSON.stringify(projected, null, 2)}\n`);
    return {
      digest: set.digest,
      stateProjectionReceiptId: `state-projection-${set.digest}`,
      runtimeProjectionReceiptId: `runtime-projection-${set.digest}`,
    };
  };

  return {
    projectRequired: project,
    rebuildRequired(rootOperationId) {
      const set = repository
        .readEventSets()
        .filter((candidate) => candidate.rootOperationId === rootOperationId)
        .at(-1);
      if (set === undefined) throw new Error("execution root has no canonical event set");
      return project(set);
    },
    projectTelemetry(event): TelemetryProjectionReceipt {
      try {
        ports.projectTelemetry?.(event);
        return { projected: ports.projectTelemetry !== undefined };
      } catch {
        return { projected: false };
      }
    },
  };
}
