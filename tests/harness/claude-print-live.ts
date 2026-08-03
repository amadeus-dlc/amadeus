import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  CLAUDE_REQUIRED_HELP_FLAGS,
  createClaudeFamilyContext,
  probeClaudeNativeCredential,
} from "./live-e2e/claude.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { capabilityById } from "./live-e2e/registry.ts";

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-print");
  if (!resolved.ok) throw new Error("claude-print capability is not registered");
  return resolved.value;
})();

export function claudePrintLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface ClaudePrintLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly claudeBin: string;
  readonly distributionDir: string;
}

export function claudePrintLiveRequirementsSkipReason({
  env,
  claudeBin,
  distributionDir,
}: ClaudePrintLiveRequirements): string | null {
  const gateReason = claudePrintLiveSkipReason(env);
  if (gateReason !== null) return gateReason;

  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) return `Claude child environment rejected ${isolated.error.key}`;
  const version = spawnSync(claudeBin, ["--version"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 64 * 1024,
  });
  const parsed = version.status === 0 ? createClaudeFamilyContext().parseVersion(version.stdout) : null;
  if (parsed === null || !createClaudeFamilyContext().versionAtLeast(parsed, [2, 1, 220])) {
    return `claude >= 2.1.220 not found (AMADEUS_CLAUDE_BIN=${claudeBin})`;
  }
  const help = spawnSync(claudeBin, ["--help"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 1024 * 1024,
  });
  if (help.status !== 0 || CLAUDE_REQUIRED_HELP_FLAGS.some((flag) => !help.stdout.includes(flag))) {
    return "claude print structured-output capability is unavailable";
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY && !probeClaudeNativeCredential(claudeBin, env)) {
    return "provide ANTHROPIC_API_KEY or a usable native Claude keychain credential";
  }
  return null;
}
