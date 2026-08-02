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
  readStateFile,
  runtimeGraphPath,
  setField,
  writeFileAtomic,
  writeStateFile,
} from "./amadeus-lib.ts";

export const EXECUTION_PROJECTION_DIGEST_FIELD = "Execution Projection Digest";

export interface RequiredProjectionPorts {
  readonly writeState?: (projectDir: string, content: string) => void;
  readonly writeRuntime?: (path: string, content: string) => void;
  readonly projectTelemetry?: (event: ExecutionEvent) => void;
}

function projectState(content: string, digest: string): string {
  const updated = setField(content, EXECUTION_PROJECTION_DIGEST_FIELD, digest);
  if (updated !== content) return updated;
  const marker = "## Runtime State\n";
  if (!content.includes(marker)) {
    throw new Error("state has no Runtime State section for execution projection");
  }
  return content.replace(
    marker,
    `${marker}- **${EXECUTION_PROJECTION_DIGEST_FIELD}**: ${digest}\n`,
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
      throw new Error("runtime graph is unavailable for execution projection");
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
