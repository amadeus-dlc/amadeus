// Harness capability boundary for execution observability (#1602).
//
// Adapters convert native facts and invoke native callbacks. They do not mint
// execution IDs, decide retry policy, or mutate canonical lifecycle state.

import type { Fact } from "./amadeus-execution-contract.ts";

export type ExecutionHarness =
  | "claude"
  | "codex"
  | "cursor"
  | "kiro"
  | "kiro-ide"
  | "opencode"
  | "kimi";

export type DispatchEffectQuery =
  | "no-effect-confirmed"
  | "effect-possible"
  | "unknown";

export interface HarnessCapabilities {
  readonly startSignal: boolean;
  readonly completionSignal: boolean;
  readonly nativeHandle: boolean;
  readonly dispatchEffectQuery: boolean;
}

type NativeFactInput = string | Fact<string> | undefined;

export interface NativeHarnessFacts {
  readonly model?: NativeFactInput;
  readonly harnessVersion?: NativeFactInput;
  readonly nativeHandle?: NativeFactInput;
  readonly monotonicClockAvailable?: boolean;
}

export interface NormalizedHarnessFacts {
  readonly model: Fact<string>;
  readonly harnessVersion: Fact<string>;
  readonly nativeHandle: Fact<string>;
  readonly clockAvailability: Fact<string>;
}

export interface NativeDispatchRequest<T> {
  readonly executeNative: () => T;
}

export interface NativeEffectQueryRequest {
  readonly queryNative?: () => DispatchEffectQuery;
}

export interface HarnessCapabilityPort {
  readonly harness: ExecutionHarness;
  normalize(input: NativeHarnessFacts): NormalizedHarnessFacts;
  capabilities(): Fact<HarnessCapabilities>;
  dispatch<T>(request: NativeDispatchRequest<T>): T;
  queryDispatchEffect(request: NativeEffectQueryRequest): DispatchEffectQuery;
}

export interface ExecutionEnvironmentSnapshot {
  readonly harness: Fact<ExecutionHarness>;
  readonly model: Fact<string>;
  readonly harnessVersion: Fact<string>;
  readonly capability: Fact<HarnessCapabilities>;
  readonly clockAvailability: Fact<string>;
}

function isFact(value: NativeFactInput): value is Fact<string> {
  return (
    typeof value === "object" &&
    value !== null &&
    "state" in value &&
    ["available", "unavailable", "legacy-unknown", "incomplete"].includes(value.state)
  );
}

function normalizeFact(value: NativeFactInput, unavailableReason: string): Fact<string> {
  if (isFact(value)) return value;
  if (typeof value !== "string" || value.trim() === "") {
    return { state: "unavailable", reason: unavailableReason };
  }
  return { state: "available", value: value.trim() };
}

function normalizeClockAvailability(value: boolean | undefined): Fact<string> {
  if (value === undefined) {
    return { state: "incomplete", missingFields: ["monotonicClockAvailable"] };
  }
  return { state: "available", value: value ? "monotonic+wall" : "wall-only" };
}

function port(
  harness: ExecutionHarness,
  capabilities: HarnessCapabilities,
): HarnessCapabilityPort {
  const adapter: HarnessCapabilityPort = {
    harness,
    normalize(input: NativeHarnessFacts): NormalizedHarnessFacts {
      return {
        model: normalizeFact(input.model, "native-model-not-exposed"),
        harnessVersion: normalizeFact(
          input.harnessVersion,
          "native-harness-version-not-exposed",
        ),
        nativeHandle: normalizeFact(input.nativeHandle, "native-handle-not-exposed"),
        clockAvailability: normalizeClockAvailability(
          input.monotonicClockAvailable,
        ),
      };
    },
    capabilities() {
      return { state: "available", value: capabilities };
    },
    dispatch<T>(request: NativeDispatchRequest<T>): T {
      return request.executeNative();
    },
    queryDispatchEffect(request: NativeEffectQueryRequest): DispatchEffectQuery {
      return request.queryNative?.() ?? "unknown";
    },
  };
  return Object.freeze(adapter);
}

// These values describe surfaces the shipped packages expose today. An absent
// native query remains unknown; the adapter never turns absence into proof
// that dispatch had no effect.
export const HARNESS_CAPABILITY_PORTS: Readonly<
  Record<ExecutionHarness, HarnessCapabilityPort>
> = Object.freeze({
  claude: port("claude", {
    startSignal: true,
    completionSignal: true,
    nativeHandle: true,
    dispatchEffectQuery: false,
  }),
  codex: port("codex", {
    startSignal: false,
    completionSignal: true,
    nativeHandle: true,
    dispatchEffectQuery: false,
  }),
  cursor: port("cursor", {
    startSignal: false,
    completionSignal: true,
    nativeHandle: false,
    dispatchEffectQuery: false,
  }),
  kiro: port("kiro", {
    startSignal: false,
    completionSignal: true,
    nativeHandle: false,
    dispatchEffectQuery: false,
  }),
  "kiro-ide": port("kiro-ide", {
    startSignal: true,
    completionSignal: true,
    nativeHandle: false,
    dispatchEffectQuery: false,
  }),
  opencode: port("opencode", {
    startSignal: false,
    completionSignal: true,
    nativeHandle: false,
    dispatchEffectQuery: false,
  }),
  kimi: port("kimi", {
    startSignal: true,
    completionSignal: true,
    nativeHandle: true,
    dispatchEffectQuery: false,
  }),
});

export function captureExecutionEnvironment(
  harness: ExecutionHarness,
  input: NativeHarnessFacts,
): ExecutionEnvironmentSnapshot {
  const adapter = HARNESS_CAPABILITY_PORTS[harness];
  const normalized = adapter.normalize(input);
  return {
    harness: { state: "available", value: harness },
    model: normalized.model,
    harnessVersion: normalized.harnessVersion,
    capability: adapter.capabilities(),
    clockAvailability: normalized.clockAvailability,
  };
}

export function executionHarnessFrom(
  harnessType: string,
  packageName?: string | null,
): ExecutionHarness | null {
  if (packageName === "kiro-ide") return "kiro-ide";
  if (harnessType === "claude-code") return "claude";
  if (
    harnessType === "codex" ||
    harnessType === "cursor" ||
    harnessType === "kiro" ||
    harnessType === "opencode" ||
    harnessType === "kimi"
  ) {
    return harnessType;
  }
  return null;
}

export function captureDetectedExecutionEnvironment(
  harnessType: string,
  packageName: string | null,
  input: NativeHarnessFacts,
): ExecutionEnvironmentSnapshot {
  const harness = executionHarnessFrom(harnessType, packageName);
  if (harness !== null) return captureExecutionEnvironment(harness, input);
  const unavailable = (reason: string): Fact<string> => ({
    state: "unavailable",
    reason,
  });
  return {
    harness: {
      state: "unavailable",
      reason: "execution-harness-not-detected",
    },
    model: unavailable("native-model-not-exposed"),
    harnessVersion: unavailable("native-harness-version-not-exposed"),
    capability: {
      state: "unavailable",
      reason: "execution-harness-not-detected",
    },
    clockAvailability: normalizeClockAvailability(input.monotonicClockAvailable),
  };
}

export function renderFact<T>(fact: Fact<T>): string {
  return JSON.stringify(fact);
}
