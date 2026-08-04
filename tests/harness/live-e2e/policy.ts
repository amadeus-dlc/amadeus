import type { PreflightFinding } from "./adapter.ts";
import type { LiveCapability } from "./registry.ts";
import type { LiveCode, Result } from "./contract.ts";

export interface EnvironmentDeclaration {
  readonly allowedKeys: readonly string[];
  readonly sensitiveKeys: readonly string[];
  readonly sourcePathKeys: readonly string[];
}

export type GateDecision =
  | Readonly<{ kind: "allow" }>
  | Readonly<{
      kind: "skip";
      code: Extract<LiveCode, `AMADEUS_LIVE_E2E:SKIP:${string}`>;
      diagnostic: string;
    }>;

export interface PolicyViolation {
  readonly kind: "source-path-key" | "sensitive-key";
  readonly key: string;
}

const PREFLIGHT_ORDER: readonly Extract<LiveCode, `AMADEUS_LIVE_E2E:SKIP:${string}`>[] = [
  "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
  "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
  "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
  "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
  "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
];

export function evaluateLiveGate(
  env: Readonly<Record<string, string | undefined>>,
  capability: LiveCapability,
): GateDecision {
  if (env.GITHUB_ACTIONS === "true") {
    return {
      kind: "skip",
      code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
      diagnostic: "live execution is forbidden on GitHub Actions",
    };
  }
  if (env[capability.optInKey] !== "1") {
    return {
      kind: "skip",
      code: "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED",
      diagnostic: `set ${capability.optInKey}=1 to run this live journey`,
    };
  }
  return { kind: "allow" };
}

export function selectPrimaryPreflightCode(
  findings: readonly PreflightFinding[],
): Extract<LiveCode, `AMADEUS_LIVE_E2E:SKIP:${string}`> {
  for (const code of PREFLIGHT_ORDER) {
    if (findings.some((finding) => finding.code === code)) return code;
  }
  return "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED";
}

export function buildChildEnvironment(
  parent: Readonly<Record<string, string | undefined>>,
  declaration: EnvironmentDeclaration,
): Result<Readonly<Record<string, string>>, PolicyViolation> {
  const forbidden = new Set([...declaration.sensitiveKeys, ...declaration.sourcePathKeys]);
  const child: Record<string, string> = {};
  for (const key of declaration.allowedKeys) {
    if (forbidden.has(key)) {
      return {
        ok: false,
        error: {
          kind: declaration.sourcePathKeys.includes(key) ? "source-path-key" : "sensitive-key",
          key,
        },
      };
    }
    const value = parent[key];
    if (value !== undefined) child[key] = value;
  }
  return { ok: true, value: child };
}
