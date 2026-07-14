// covers: module:amadeus-swarm-native-execution, requirement:FR-18, requirement:FR-20, requirement:FR-21
// size: medium

import { describe, expect, test } from "bun:test";
import type {
  AdapterResourcePreparation,
  CoordinatorTransport,
  DriverAdapter,
  DriverControlSignal,
  DriverPlan,
  EvidenceInputs,
  LaunchInput,
  LiveEvidenceInputs,
  NormalizedDriverEvent,
  NormalizeContext,
  ProcessTerminal,
  RawNativeEvent,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import { ProbeResult } from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import {
  createLifecycleNativeExecution,
  type NativeDispatchCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";

async function* emptyBytes(): AsyncIterable<Uint8Array> {}
async function* emptyNativeEvents(): AsyncIterable<RawNativeEvent> {}

const liveInputs: LiveEvidenceInputs = Object.freeze({
  providerState: emptyBytes(),
  nativeEvents: emptyNativeEvents(),
});

const probeResult = ProbeResult.build({
  status: "available",
  reason: "none",
  modeIdentifier: "codex-ultra",
  checks: Object.freeze([
    Object.freeze({ name: "mode", ok: true, diagnosticCode: "CLI_AVAILABLE" }),
  ]),
});
if (probeResult.type === "err") throw new Error("Invalid probe fixture");

const plan: DriverPlan = Object.freeze({
  kind: "driver-plan",
  schemaVersion: 1,
  executionId: "execution-1",
  attemptId: "attempt-1",
  requested: "codex-ultra",
  selected: "codex-ultra",
  executionMode: "native",
  harness: "codex",
  batch: 1,
  topology: "coordinated",
  topologyReason: "coordination-signal",
  fallbackReason: "none",
  probe: probeResult.value,
  waves: Object.freeze([Object.freeze({ index: 0, units: Object.freeze(["alpha", "beta"]) })]),
  planDigest: "plan-digest",
  attemptNonceHash: "nonce-hash",
});

function launchInput(nativeRunId = "native-run-1"): LaunchInput {
  return Object.freeze({
    plan,
    wave: plan.waves[0],
    preparedUnits: Object.freeze([
      Object.freeze({ unit: "alpha", worktreePath: "/repo/alpha", branchName: "unit/alpha" }),
      Object.freeze({ unit: "beta", worktreePath: "/repo/beta", branchName: "unit/beta" }),
    ]),
    convergenceCommand: "bun test",
    evidenceDir: "/evidence",
    nativeRunId,
  });
}

function normalizeContext(): NormalizeContext {
  return Object.freeze({
    driver: "codex-ultra",
    executionId: "execution-1",
    attemptId: "attempt-1",
    attemptNonceHash: "nonce-hash",
    planDigest: "plan-digest",
    waveIndex: 0,
    waveDigest: digestValue(plan.waves[0]),
    expectedUnits: Object.freeze(["alpha", "beta"]),
  });
}

function plannedProcess(nativeRunId = "native-run-1") {
  return Object.freeze({
    nativeRunId,
    identityRelativePath: ".amadeus/native/identity.json",
    armRelativePath: ".amadeus/native/arm.json",
    armDigest: "arm-digest",
  });
}

function adapter(
  calls: string[],
  preparation: AdapterResourcePreparation,
): DriverAdapter {
  return Object.freeze({
    driver: "codex-ultra",
    provider: "codex",
    supports: (harness) => harness === "codex",
    probe: async () => plan.probe,
    prepareResources: () => {
      calls.push("prepare-resources");
      return preparation;
    },
    buildExecution: (input) => {
      calls.push("build-execution");
      return Object.freeze({
        launch: Object.freeze({
          executable: "codex",
          args: Object.freeze(["exec"]),
          cwd: "/repo",
          env: Object.freeze({}),
          transport: Object.freeze({
            kind: "stdio-json" as const,
            stdin: "closed" as const,
            output: "stream-json" as const,
          }),
          timeoutMs: 1_000,
        }),
        capture: Object.freeze({ kind: "hook-only" as const, hookDir: "/evidence/hooks" }),
        captureIdentity: Object.freeze({
          executionId: input.plan.executionId,
          attemptId: input.plan.attemptId,
          attemptNonceHash: input.plan.attemptNonceHash,
          planDigest: input.plan.planDigest,
          waveIndex: input.wave.index,
          waveDigest: digestValue(input.wave),
        }),
        resources: preparation.resources,
      });
    },
    resolveCaptureBinding: () => Object.freeze({ kind: "not-binding" as const }),
    observeControl: async function* () {},
    normalize: async function* (_inputs: EvidenceInputs) {
      calls.push("normalize");
      yield* [] as NormalizedDriverEvent[];
    },
  });
}

describe("t237 closed native execution lifecycle", () => {
  test("checkpoints identity before arm and joins capture before cleanup", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materializedResources = Object.freeze([
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-digest",
        contentOrBaselineDigest: "content-digest",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const terminal: ProcessTerminal = Object.freeze({
      transport: "stdio-json",
      exitCode: 0,
      processGroupId: 42,
      nativeRunId: "native-run-1",
      processIdentityDigest: "process-identity-digest",
    });
    let checkpoint: NativeDispatchCheckpoint | undefined;
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => {
          calls.push("materialize");
          return resources;
        },
        cleanup: async () => {
          calls.push("cleanup");
        },
      }),
      capture: Object.freeze({
        start: async () => {
          calls.push("capture-start");
          return Object.freeze({
            liveInputs,
            bindingEvents: emptyNativeEvents(),
            applyBinding: async () => {
              calls.push("apply-binding");
            },
            stopAndWait: async (observedTerminal: ProcessTerminal) => {
              calls.push("capture-stop");
              expect(observedTerminal).toEqual(terminal);
              return Object.freeze({ ...liveInputs, processTerminal: observedTerminal });
            },
            abortAndWait: async () => {
              calls.push("capture-abort");
            },
          });
        },
      }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => {
          calls.push("process-spawn");
          return Object.freeze({
            observeIdentity: async () => {
              calls.push("identity");
              return Object.freeze({
                processIdentityDigest: "process-identity-digest",
                armDigest: "arm-digest",
              });
            },
            arm: async () => {
              calls.push("arm");
            },
            waitForTerminal: async (
              waitInput: Readonly<{
                transport: CoordinatorTransport;
                controlSignals?: AsyncIterable<DriverControlSignal>;
              }>,
            ) => {
              calls.push("terminal");
              expect(waitInput.controlSignals).toBeUndefined();
              return terminal;
            },
            terminateAndWait: async () => {
              calls.push("process-terminate");
              return terminal;
            },
          });
        },
      }),
    });

    const events = await execution.execute({
      adapter: adapter(calls, preparation),
      launchInput: launchInput(),
      context: normalizeContext(),
      onDispatchPrepared: async () => {
        calls.push("dispatch-prepared");
      },
      onResourcesPrepared: async () => {
        calls.push("resources-prepared");
      },
      onReadyToArm: async (value) => {
        calls.push("checkpoint");
        checkpoint = value;
      },
      onCaptureBound: async () => {
        calls.push("capture-bound");
      },
    });

    expect(events).toEqual([]);
    expect(checkpoint).toMatchObject({
      kind: "native",
      nativeRunId: "native-run-1",
      resourceReceiptDigest: resources.receiptDigest,
      processIdentityDigest: "process-identity-digest",
      armDigest: "arm-digest",
      capture: { kind: "hook-only", transport: "stdio-json" },
    });
    expect(calls).toEqual([
      "prepare-resources",
      "process-plan",
      "dispatch-prepared",
      "materialize",
      "build-execution",
      "resources-prepared",
      "capture-start",
      "process-spawn",
      "identity",
      "checkpoint",
      "arm",
      "terminal",
      "capture-stop",
      "normalize",
      "cleanup",
    ]);

  });

  test("binds event capture and consumes PTY control without treating it as normalized evidence", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materializedResources = Object.freeze([
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-digest",
        contentOrBaselineDigest: "content-digest",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const base = adapter(calls, preparation);
    const event = Object.freeze({ source: "hook" as const, bytes: new Uint8Array([1]) });
    const controlSignal = Object.freeze({
      kind: "ready-for-graceful-exit" as const,
      driver: "codex-ultra" as const,
      executionId: "execution-1",
      attemptId: "attempt-1",
      attemptNonceHash: "nonce-hash",
      planDigest: "plan-digest",
      waveIndex: 0,
      waveDigest: digestValue(plan.waves[0]),
      coveredUnits: Object.freeze(["alpha", "beta"]),
      liveEvidenceDigest: "live-evidence",
    });
    const ptyAdapter: DriverAdapter = Object.freeze({
      ...base,
      buildExecution: (input) => {
        calls.push("build-execution");
        return Object.freeze({
          launch: Object.freeze({
            executable: "claude",
            args: Object.freeze([]),
            cwd: "/repo",
            env: Object.freeze({}),
            transport: Object.freeze({
              kind: "pty-interactive" as const,
              initialInput: new Uint8Array([2]),
              columns: 120 as const,
              rows: 40 as const,
              exitOnSignal: "ready-for-graceful-exit" as const,
              gracefulExitInput: new Uint8Array([3]),
              controlTimeoutMs: 1_000,
              gracefulExitTimeoutMs: 1_000,
            }),
            timeoutMs: 2_000,
          }),
          capture: Object.freeze({
            kind: "event-bound-provider-path" as const,
            hookDir: "/evidence/hooks",
          }),
          captureIdentity: Object.freeze({
            executionId: input.plan.executionId,
            attemptId: input.plan.attemptId,
            attemptNonceHash: input.plan.attemptNonceHash,
            planDigest: input.plan.planDigest,
            waveIndex: input.wave.index,
            waveDigest: digestValue(input.wave),
          }),
          resources: resourcePlans,
        });
      },
      resolveCaptureBinding: ({ event: observed }) => {
        calls.push("resolve-binding");
        expect(observed).toEqual(event);
        const exactPaths = Object.freeze(["/provider/run-1"]);
        return Object.freeze({
          kind: "bound" as const,
          binding: Object.freeze({
            kind: "event-bound-provider-path" as const,
            nativeRunId: "native-run-1",
            exactPaths,
            exactPathDigest: digestValue(exactPaths),
            sourceEventDigest: digestValue(observed),
          }),
        });
      },
      observeControl: async function* () {
        calls.push("observe-control");
        yield controlSignal;
      },
    });
    const terminal: ProcessTerminal = Object.freeze({
      transport: "pty-interactive",
      exitCode: 0,
      processGroupId: 43,
      nativeRunId: "native-run-1",
      processIdentityDigest: "identity",
      controlSignalDigest: digestValue(controlSignal),
    });
    async function* bindingEvents(): AsyncIterable<RawNativeEvent> {
      calls.push("binding-event");
      yield event;
    }
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => {
          calls.push("materialize");
          return resources;
        },
        cleanup: async () => {
          calls.push("cleanup");
        },
      }),
      capture: Object.freeze({
        start: async () => {
          calls.push("capture-start");
          return Object.freeze({
            liveInputs,
            bindingEvents: bindingEvents(),
            applyBinding: async () => {
              calls.push("apply-binding");
            },
            stopAndWait: async () => {
              calls.push("capture-stop");
              return Object.freeze({ ...liveInputs, processTerminal: terminal });
            },
            abortAndWait: async () => {
              calls.push("capture-abort");
            },
          });
        },
      }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => {
          calls.push("process-spawn");
          return Object.freeze({
            observeIdentity: async () => {
              calls.push("identity");
              return Object.freeze({ processIdentityDigest: "identity", armDigest: "arm-digest" });
            },
            arm: async () => {
              calls.push("arm");
            },
            waitForTerminal: async (waitInput: Readonly<{
              transport: CoordinatorTransport;
              controlSignals?: AsyncIterable<DriverControlSignal>;
            }>) => {
              calls.push("terminal-wait");
              let controls = 0;
              for await (const signal of waitInput.controlSignals ?? []) {
                calls.push("control-signal");
                controls += 1;
                expect(signal.kind).toBe("ready-for-graceful-exit");
              }
              expect(controls).toBe(1);
              return terminal;
            },
            terminateAndWait: async () => {
              calls.push("process-terminate");
              return terminal;
            },
          });
        },
      }),
    });
    let bound = 0;

    const events = await execution.execute({
      adapter: ptyAdapter,
      launchInput: launchInput(),
      context: normalizeContext(),
      onDispatchPrepared: async () => {
        calls.push("dispatch-prepared");
      },
      onResourcesPrepared: async () => {
        calls.push("resources-prepared");
      },
      onReadyToArm: async ({ capture }) => {
        calls.push("checkpoint");
        expect(capture.kind).toBe("event-bound-provider-path");
        expect("binding" in capture).toBeFalse();
      },
      onCaptureBound: async () => {
        calls.push("capture-bound");
        bound += 1;
      },
    });

    expect(events).toEqual([]);
    expect(bound).toBe(1);
    expect(calls).toEqual([
      "prepare-resources",
      "process-plan",
      "dispatch-prepared",
      "materialize",
      "build-execution",
      "resources-prepared",
      "capture-start",
      "process-spawn",
      "identity",
      "checkpoint",
      "arm",
      "binding-event",
      "resolve-binding",
      "capture-bound",
      "apply-binding",
      "observe-control",
      "terminal-wait",
      "control-signal",
      "capture-stop",
      "normalize",
      "cleanup",
    ]);

    calls.length = 0;
    const staleControlAdapter: DriverAdapter = Object.freeze({
      ...ptyAdapter,
      observeControl: async function* () {
        yield Object.freeze({
          kind: "ready-for-graceful-exit" as const,
          driver: "codex-ultra" as const,
          executionId: "execution-1",
          attemptId: "stale-attempt",
          attemptNonceHash: "nonce-hash",
          planDigest: "plan-digest",
          waveIndex: 0,
          waveDigest: digestValue(plan.waves[0]),
          coveredUnits: Object.freeze(["alpha", "beta"]),
          liveEvidenceDigest: "live-evidence",
        });
      },
    });
    await expect(
      execution.execute({
        adapter: staleControlAdapter,
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {},
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("CONTROL_SIGNAL_INVALID");
    expect(calls).toContain("process-terminate");
    expect(calls).toContain("capture-stop");
    expect(calls).toContain("cleanup");

    const throwingControlAdapter: DriverAdapter = Object.freeze({
      ...ptyAdapter,
      observeControl: async function* () {
        throw new Error("control-source-failed");
      },
    });
    await expect(
      execution.execute({
        adapter: throwingControlAdapter,
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {},
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("control-source-failed");
  });

  test("rejects a malformed fixed binding before capture starts", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "provider-run",
        path: "/provider/run-1",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materializedResources = Object.freeze([
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-hooks",
        contentOrBaselineDigest: "content-hooks",
      }),
      Object.freeze({
        resourceId: "provider-run",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/provider/run-1"]),
        ownerDigest: "owner-provider",
        contentOrBaselineDigest: "content-provider",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const base = adapter(calls, preparation);
    const invalidAdapter: DriverAdapter = Object.freeze({
      ...base,
      buildExecution: (input) => {
        calls.push("build-execution");
        const exactPaths = Object.freeze(["/provider/run-1"]);
        return Object.freeze({
          launch: Object.freeze({
            executable: "codex",
            args: Object.freeze(["exec"]),
            cwd: "/repo",
            env: Object.freeze({}),
            transport: Object.freeze({
              kind: "stdio-json" as const,
              stdin: "closed" as const,
              output: "stream-json" as const,
            }),
            timeoutMs: 1_000,
          }),
          capture: Object.freeze({
            kind: "fixed-provider-path" as const,
            hookDir: "/evidence/hooks",
            initialBinding: Object.freeze({
              kind: "fixed-provider-path" as const,
              nativeRunId: input.nativeRunId,
              exactPaths,
              exactPathDigest: "wrong-digest",
              sourcePlanDigest: preparation.preparationDigest,
            }),
          }),
          captureIdentity: Object.freeze({
            executionId: input.plan.executionId,
            attemptId: input.plan.attemptId,
            attemptNonceHash: input.plan.attemptNonceHash,
            planDigest: input.plan.planDigest,
            waveIndex: input.wave.index,
            waveDigest: digestValue(input.wave),
          }),
          resources: resourcePlans,
        });
      },
    });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => resources,
        cleanup: async () => {
          calls.push("cleanup");
        },
      }),
      capture: Object.freeze({
        start: async () => {
          calls.push("capture-start");
          throw new Error("must not start");
        },
      }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => {
          throw new Error("must not spawn");
        },
      }),
    });

    await expect(
      execution.execute({
        adapter: invalidAdapter,
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {
          calls.push("dispatch-prepared");
        },
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("CAPTURE_BINDING_INVALID");
    expect(calls).toEqual([
      "prepare-resources",
      "process-plan",
      "dispatch-prepared",
      "build-execution",
      "cleanup",
    ]);
  });

  test("rejects duplicate materialized resource receipts before capture starts", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const duplicate = Object.freeze({
      resourceId: "hooks",
      kind: "attempt-owned-directory" as const,
      resolvedPaths: Object.freeze(["/evidence/hooks"]),
      ownerDigest: "owner-digest",
      contentOrBaselineDigest: "content-digest",
    });
    const materializedResources = Object.freeze([duplicate, duplicate]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => resources,
        cleanup: async () => {
          calls.push("cleanup");
        },
      }),
      capture: Object.freeze({
        start: async () => {
          calls.push("capture-start");
          throw new Error("must not start");
        },
      }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => {
          throw new Error("must not spawn");
        },
      }),
    });

    await expect(
      execution.execute({
        adapter: adapter(calls, preparation),
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {
          calls.push("dispatch-prepared");
        },
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("RESOURCE_RECEIPT_INVALID");
    expect(calls).toEqual(["prepare-resources", "process-plan", "dispatch-prepared", "cleanup"]);
  });

  test("terminates, joins, and cleans up when the audit-first arm checkpoint fails", async () => {
    const calls: string[] = [];
    let terminateFailure = false;
    let captureFailure = false;
    let cleanupFailure = false;
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materializedResources = Object.freeze([
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-digest",
        contentOrBaselineDigest: "content-digest",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const terminal: ProcessTerminal = Object.freeze({
      transport: "stdio-json",
      exitCode: 143,
      processGroupId: 44,
      nativeRunId: "native-run-1",
      processIdentityDigest: "process-identity",
    });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => {
          calls.push("materialize");
          return resources;
        },
        cleanup: async () => {
          calls.push("cleanup");
          if (cleanupFailure) throw new Error("cleanup-failed");
        },
      }),
      capture: Object.freeze({
        start: async () => {
          calls.push("capture-start");
          return Object.freeze({
            liveInputs,
            bindingEvents: emptyNativeEvents(),
            applyBinding: async () => {
              calls.push("apply-binding");
            },
            stopAndWait: async () => {
              calls.push("capture-stop");
              if (captureFailure) throw new Error("capture-stop-failed");
              return Object.freeze({ ...liveInputs, processTerminal: terminal });
            },
            abortAndWait: async () => {
              calls.push("capture-abort");
            },
          });
        },
      }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => {
          calls.push("process-spawn");
          return Object.freeze({
            observeIdentity: async () => {
              calls.push("identity");
              return Object.freeze({
                processIdentityDigest: "process-identity",
                armDigest: "arm-digest",
              });
            },
            arm: async () => {
              calls.push("arm");
            },
            waitForTerminal: async () => {
              calls.push("terminal");
              return terminal;
            },
            terminateAndWait: async () => {
              calls.push("process-terminate");
              if (terminateFailure) throw new Error("terminate-failed");
              return terminal;
            },
          });
        },
      }),
    });

    await expect(
      execution.execute({
        adapter: adapter(calls, preparation),
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {
          calls.push("dispatch-prepared");
        },
        onResourcesPrepared: async () => {
          calls.push("resources-prepared");
        },
        onReadyToArm: async () => {
          calls.push("checkpoint");
          throw new Error("checkpoint-write-failed");
        },
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("checkpoint-write-failed");
    expect(calls).toEqual([
      "prepare-resources",
      "process-plan",
      "dispatch-prepared",
      "materialize",
      "build-execution",
      "resources-prepared",
      "capture-start",
      "process-spawn",
      "identity",
      "checkpoint",
      "process-terminate",
      "capture-stop",
      "cleanup",
    ]);

    const runWithCheckpointFailure = () => execution.execute({
      adapter: adapter([], preparation),
      launchInput: launchInput(),
      context: normalizeContext(),
      onDispatchPrepared: async () => {},
      onResourcesPrepared: async () => {},
      onReadyToArm: async () => {
        throw new Error("checkpoint-write-failed");
      },
      onCaptureBound: async () => {},
    });

    terminateFailure = true;
    await expect(runWithCheckpointFailure()).rejects.toThrow("NATIVE_EXECUTION_RECOVERY_FAILED");
    terminateFailure = false;
    captureFailure = true;
    await expect(runWithCheckpointFailure()).rejects.toThrow("NATIVE_EXECUTION_RECOVERY_FAILED");
    captureFailure = false;
    cleanupFailure = true;
    await expect(runWithCheckpointFailure()).rejects.toThrow("NATIVE_EXECUTION_RECOVERY_FAILED");
  });

  test("fails closed and recovers when event-bound capture reaches EOF without a binding", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materializedResources = Object.freeze([
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-digest",
        contentOrBaselineDigest: "content-digest",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materializedResources),
      resources: materializedResources,
    });
    const base = adapter(calls, preparation);
    const eventAdapter: DriverAdapter = Object.freeze({
      ...base,
      buildExecution: (input) => {
        calls.push("build-execution");
        return Object.freeze({
          launch: Object.freeze({
            executable: "codex",
            args: Object.freeze(["exec"]),
            cwd: "/repo",
            env: Object.freeze({}),
            transport: Object.freeze({
              kind: "stdio-json" as const,
              stdin: "closed" as const,
              output: "stream-json" as const,
            }),
            timeoutMs: 1_000,
          }),
          capture: Object.freeze({
            kind: "event-bound-provider-path" as const,
            hookDir: "/evidence/hooks",
          }),
          captureIdentity: Object.freeze({
            executionId: input.plan.executionId,
            attemptId: input.plan.attemptId,
            attemptNonceHash: input.plan.attemptNonceHash,
            planDigest: input.plan.planDigest,
            waveIndex: input.wave.index,
            waveDigest: digestValue(input.wave),
          }),
          resources: resourcePlans,
        });
      },
    });
    const terminal: ProcessTerminal = Object.freeze({
      transport: "stdio-json",
      exitCode: 143,
      processGroupId: 45,
      nativeRunId: "native-run-1",
      processIdentityDigest: "process-identity",
    });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => resources,
        cleanup: async () => {
          calls.push("cleanup");
        },
      }),
      capture: Object.freeze({
        start: async () => Object.freeze({
          liveInputs,
          bindingEvents: emptyNativeEvents(),
          applyBinding: async () => {
            calls.push("apply-binding");
          },
          stopAndWait: async () => {
            calls.push("capture-stop");
            return Object.freeze({ ...liveInputs, processTerminal: terminal });
          },
          abortAndWait: async () => {
            calls.push("capture-abort");
          },
        }),
      }),
      process: Object.freeze({
        plan: () => plannedProcess(),
        spawn: async () => Object.freeze({
          observeIdentity: async () => Object.freeze({
            processIdentityDigest: "process-identity",
            armDigest: "arm-digest",
          }),
          arm: async () => {
            calls.push("arm");
          },
          waitForTerminal: async () => {
            calls.push("terminal");
            return terminal;
          },
          terminateAndWait: async () => {
            calls.push("process-terminate");
            return terminal;
          },
        }),
      }),
    });

    await expect(
      execution.execute({
        adapter: eventAdapter,
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {},
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {
          calls.push("capture-bound");
        },
      }),
    ).rejects.toThrow("CAPTURE_BINDING_MISSING");
    expect(calls).toContain("arm");
    expect(calls).toContain("process-terminate");
    expect(calls).toContain("capture-stop");
    expect(calls).toContain("cleanup");
    expect(calls).not.toContain("terminal");
    expect(calls).not.toContain("capture-bound");
  });

  test("accepts every closed resource variant with a fixed capture binding", async () => {
    const calls: string[] = [];
    const resourcePlans = Object.freeze([
      Object.freeze({
        kind: "exclusive-reservation" as const,
        resourceId: "provider-run",
        candidates: Object.freeze([
          Object.freeze({ reservationPath: "/locks/run-1", guardedPaths: Object.freeze(["/provider/run-1"]) }),
        ]),
      }),
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "config",
        path: "/evidence/config.json",
        bytes: new Uint8Array([1]),
        mode: "0600" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "hooks",
        path: "/evidence/hooks",
        mode: "0700" as const,
      }),
      Object.freeze({
        kind: "pre-arm-baseline" as const,
        resourceId: "baseline",
        exactPaths: Object.freeze(["/provider/baseline"]),
        allowAbsent: false,
      }),
    ]);
    const preparation = Object.freeze({
      resources: resourcePlans,
      preparationDigest: digestValue(resourcePlans),
    });
    const materialized = Object.freeze([
      Object.freeze({
        resourceId: "provider-run",
        kind: "exclusive-reservation" as const,
        selectedCandidateIndex: 0,
        resolvedPaths: Object.freeze(["/provider/run-1"]),
        ownerDigest: "owner-run",
        contentOrBaselineDigest: "content-run",
      }),
      Object.freeze({
        resourceId: "config",
        kind: "attempt-owned-file" as const,
        resolvedPaths: Object.freeze(["/evidence/config.json"]),
        ownerDigest: "owner-config",
        contentOrBaselineDigest: "content-config",
      }),
      Object.freeze({
        resourceId: "hooks",
        kind: "attempt-owned-directory" as const,
        resolvedPaths: Object.freeze(["/evidence/hooks"]),
        ownerDigest: "owner-hooks",
        contentOrBaselineDigest: "content-hooks",
      }),
      Object.freeze({
        resourceId: "baseline",
        kind: "pre-arm-baseline" as const,
        resolvedPaths: Object.freeze(["/provider/baseline"]),
        ownerDigest: "owner-baseline",
        contentOrBaselineDigest: "content-baseline",
      }),
    ]);
    const resources = Object.freeze({
      preparationDigest: preparation.preparationDigest,
      receiptDigest: digestValue(materialized),
      resources: materialized,
    });
    const base = adapter(calls, preparation);
    const fixedAdapter: DriverAdapter = Object.freeze({
      ...base,
      buildExecution: (input) => {
        calls.push("build-execution");
        const exactPaths = Object.freeze(["/provider/run-1"]);
        return Object.freeze({
          launch: Object.freeze({
            executable: "codex",
            args: Object.freeze(["exec"]),
            cwd: "/repo",
            env: Object.freeze({}),
            transport: Object.freeze({
              kind: "stdio-json" as const,
              stdin: "closed" as const,
              output: "jsonl" as const,
            }),
            timeoutMs: 1_000,
          }),
          capture: Object.freeze({
            kind: "fixed-provider-path" as const,
            hookDir: "/evidence/hooks",
            initialBinding: Object.freeze({
              kind: "fixed-provider-path" as const,
              nativeRunId: input.nativeRunId,
              exactPaths,
              exactPathDigest: digestValue(exactPaths),
              sourcePlanDigest: preparation.preparationDigest,
            }),
          }),
          captureIdentity: Object.freeze({
            executionId: input.plan.executionId,
            attemptId: input.plan.attemptId,
            attemptNonceHash: input.plan.attemptNonceHash,
            planDigest: input.plan.planDigest,
            waveIndex: input.wave.index,
            waveDigest: digestValue(input.wave),
          }),
          resources: resourcePlans,
        });
      },
    });
    const terminal: ProcessTerminal = Object.freeze({
      transport: "stdio-json",
      exitCode: 0,
      processGroupId: 46,
      nativeRunId: "native-run-1",
      processIdentityDigest: "identity",
    });
    let checkpoint: NativeDispatchCheckpoint | undefined;
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({ materialize: async () => resources, cleanup: async () => {} }),
      capture: Object.freeze({
        start: async () => Object.freeze({
          liveInputs,
          bindingEvents: emptyNativeEvents(),
          applyBinding: async () => {},
          stopAndWait: async () => Object.freeze({ ...liveInputs, processTerminal: terminal }),
          abortAndWait: async () => {},
        }),
      }),
      process: Object.freeze({
        plan: () => plannedProcess(),
        spawn: async () => Object.freeze({
          observeIdentity: async () => Object.freeze({ processIdentityDigest: "identity", armDigest: "arm-digest" }),
          arm: async () => {},
          waitForTerminal: async () => terminal,
          terminateAndWait: async () => terminal,
        }),
      }),
    });

    await execution.execute({
      adapter: fixedAdapter,
      launchInput: launchInput(),
      context: normalizeContext(),
      onDispatchPrepared: async () => {},
      onResourcesPrepared: async () => {},
      onReadyToArm: async (value) => {
        checkpoint = value;
      },
      onCaptureBound: async () => {},
    });
    expect(checkpoint?.capture).toMatchObject({
      kind: "fixed-provider-path",
      binding: { sourceResourceIds: ["provider-run"] },
    });
  });

  test("rejects duplicate preparation ids before planning a process", async () => {
    const calls: string[] = [];
    const duplicate = Object.freeze({
      kind: "attempt-owned-directory" as const,
      resourceId: "duplicate",
      path: "/evidence/hooks",
      mode: "0700" as const,
    });
    const resources = Object.freeze([duplicate, duplicate]);
    const preparation = Object.freeze({ resources, preparationDigest: digestValue(resources) });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => {
          throw new Error("must not materialize");
        },
        cleanup: async () => {},
      }),
      capture: Object.freeze({ start: async () => { throw new Error("must not capture"); } }),
      process: Object.freeze({
        plan: () => {
          calls.push("process-plan");
          return plannedProcess();
        },
        spawn: async () => { throw new Error("must not spawn"); },
      }),
    });
    await expect(
      execution.execute({
        adapter: adapter(calls, preparation),
        launchInput: launchInput(),
        context: normalizeContext(),
        onDispatchPrepared: async () => {},
        onResourcesPrepared: async () => {},
        onReadyToArm: async () => {},
        onCaptureBound: async () => {},
      }),
    ).rejects.toThrow("RESOURCE_PREPARATION_INVALID");
    expect(calls).toEqual(["prepare-resources"]);
  });
});
