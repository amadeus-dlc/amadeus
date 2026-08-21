import type { EnvironmentDeclaration } from "./policy.ts";
import type { Result } from "./contract.ts";

export type LiveAdapterId =
  | "codex-exec"
  | "claude-print"
  | "claude-sdk"
  | "claude-tui"
  | "kimi-print"
  | "kiro-tui";
export type CapabilityStatus = "supported" | "unsupported" | "unverified";

export interface LiveCapability {
  readonly id: LiveAdapterId;
  readonly harness: string;
  readonly transport: string;
  readonly optInKey: string;
  readonly minimumVersion: string;
  /** Reference version used for the last capability measurement, not a runtime probe result. */
  readonly measuredVersion: string;
  readonly status: CapabilityStatus;
  readonly anchorKinds: readonly ("exit" | "schema" | "file" | "state" | "tool" | "audit")[];
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
  {
    id: "claude-print",
    harness: "claude",
    transport: "print",
    optInKey: "AMADEUS_CLAUDE_PRINT_LIVE",
    minimumVersion: "2.1.220",
    measuredVersion: "2.1.220",
    status: "supported",
    anchorKinds: ["exit", "schema", "state"],
    environment: {
      allowedKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR"],
      sensitiveKeys: ["ANTHROPIC_API_KEY"],
      sourcePathKeys: ["HOME", "CLAUDE_CONFIG_DIR"],
    },
    isolationSummary: "fresh project/home; project settings only; environment credential lease",
  },
  {
    id: "claude-sdk",
    harness: "claude",
    transport: "agent-sdk",
    optInKey: "AMADEUS_CLAUDE_SDK_LIVE",
    minimumVersion: "0.3.158",
    measuredVersion: "0.3.158",
    status: "supported",
    anchorKinds: ["schema", "tool", "state", "audit"],
    environment: {
      allowedKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR"],
      sensitiveKeys: ["ANTHROPIC_API_KEY"],
      sourcePathKeys: ["HOME", "CLAUDE_CONFIG_DIR"],
    },
    isolationSummary: "SDK-owned worker group; one-shot credential pipe; project settings only",
  },
  {
    id: "claude-tui",
    harness: "claude",
    transport: "tui",
    optInKey: "AMADEUS_TUI_LIVE",
    minimumVersion: "2.1.220",
    measuredVersion: "2.1.220",
    status: "supported",
    anchorKinds: ["file", "state"],
    environment: {
      allowedKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR"],
      sensitiveKeys: ["ANTHROPIC_API_KEY"],
      sourcePathKeys: ["HOME", "CLAUDE_CONFIG_DIR"],
    },
    isolationSummary: "fresh project/home; project settings only; run-private tmux socket and session",
  },
  {
    id: "kimi-print",
    harness: "kimi",
    transport: "print",
    optInKey: "AMADEUS_KIMI_PRINT_LIVE",
    minimumVersion: "0.28.1",
    measuredVersion: "0.37.2",
    status: "supported",
    anchorKinds: ["exit", "file"],
    environment: {
      allowedKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR"],
      sensitiveKeys: ["KIMI_API_KEY", "MOONSHOT_API_KEY"],
      sourcePathKeys: ["HOME", "KIMI_CODE_HOME", "AMADEUS_KIMI_SOURCE_HOME"],
    },
    isolationSummary:
      "fresh project/home; source OAuth entries bound by reference, never copied; scratch-local config, sessions and logs",
  },
  {
    id: "kiro-tui",
    harness: "kiro",
    transport: "tui",
    optInKey: "AMADEUS_KIRO_TUI_LIVE",
    minimumVersion: "2.6.0",
    measuredVersion: "2.13.0",
    status: "supported",
    anchorKinds: ["file", "state"],
    environment: {
      allowedKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR", "TERM"],
      sensitiveKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"],
      sourcePathKeys: ["HOME", "XDG_DATA_HOME", "KIRO_HOME"],
    },
    isolationSummary:
      "fresh project/home; source auth bound by reference, never copied; run-private tmux socket and session",
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
    if (capability.status !== "supported" && !capability.followUpIssue) {
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

export function requireCapability(id: LiveAdapterId): LiveCapability {
  const resolved = capabilityById(id);
  if (!resolved.ok) throw new Error(`${id} capability is not registered`);
  return resolved.value;
}
