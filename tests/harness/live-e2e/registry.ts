import type { EnvironmentDeclaration } from "./policy.ts";
import type { Result } from "./contract.ts";

export type LiveAdapterId = "codex-exec";
export type CapabilityStatus = "supported" | "unsupported" | "unverified";

export interface LiveCapability {
  readonly id: LiveAdapterId;
  readonly harness: string;
  readonly transport: string;
  readonly optInKey: string;
  readonly minimumVersion: string;
  readonly measuredVersion: string;
  readonly status: CapabilityStatus;
  readonly anchorKinds: readonly ("exit" | "schema" | "file" | "state")[];
  readonly followUpIssue?: string;
  readonly environment: EnvironmentDeclaration;
  readonly isolationSummary: string;
}

export interface RegistryFinding {
  readonly kind: "duplicate-id" | "duplicate-opt-in" | "incomplete-supported" | "missing-issue";
  readonly adapterId: string;
}

export const LIVE_CAPABILITIES = [
  {
    id: "codex-exec",
    harness: "codex",
    transport: "exec",
    optInKey: "AMADEUS_CODEX_EXEC_LIVE",
    minimumVersion: "0.139.0",
    measuredVersion: "0.146.0",
    status: "supported",
    anchorKinds: ["exit", "schema", "file"],
    environment: {
      allowedKeys: ["PATH", "TMPDIR", "LANG", "LC_ALL"],
      sensitiveKeys: ["OPENAI_API_KEY"],
      sourcePathKeys: ["HOME", "CODEX_HOME", "AMADEUS_CODEX_EXEC_AUTH_HOME"],
    },
    isolationSummary: "fresh project/home; env credential lease; no source config or hooks",
  },
] as const satisfies readonly LiveCapability[];

export function validateCapabilityRegistry(
  capabilities: readonly LiveCapability[],
): readonly RegistryFinding[] {
  const findings: RegistryFinding[] = [];
  const ids = new Set<string>();
  const optIns = new Set<string>();
  for (const capability of capabilities) {
    if (ids.has(capability.id)) findings.push({ kind: "duplicate-id", adapterId: capability.id });
    ids.add(capability.id);
    if (optIns.has(capability.optInKey)) {
      findings.push({ kind: "duplicate-opt-in", adapterId: capability.id });
    }
    optIns.add(capability.optInKey);
    if (
      capability.status === "supported" &&
      (!capability.minimumVersion || !capability.measuredVersion || capability.anchorKinds.length === 0)
    ) {
      findings.push({ kind: "incomplete-supported", adapterId: capability.id });
    }
    if (capability.status === "unsupported" && !capability.followUpIssue) {
      findings.push({ kind: "missing-issue", adapterId: capability.id });
    }
  }
  return findings;
}

export function capabilityById(
  id: LiveAdapterId,
): Result<LiveCapability, Readonly<{ kind: "unknown-adapter"; adapterId: string }>> {
  const capability = LIVE_CAPABILITIES.find((entry) => entry.id === id);
  return capability === undefined
    ? { ok: false, error: { kind: "unknown-adapter", adapterId: id } }
    : { ok: true, value: capability };
}
