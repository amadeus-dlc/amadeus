import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createClaudeFamilyContext, probeClaudeNativeCredential } from "./live-e2e/claude.ts";
import { CLAUDE_TUI_REQUIRED_HELP_FLAGS } from "./live-e2e/claude-tui.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { capabilityById } from "./live-e2e/registry.ts";

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-tui");
  if (!resolved.ok) throw new Error("claude-tui capability is not registered");
  return resolved.value;
})();

export function claudeTuiLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface ClaudeTuiLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly claudeBin: string;
  readonly tmuxBin: string;
  readonly distributionDir: string;
}

export function claudeTuiLiveRequirementsSkipReason({
  env,
  claudeBin,
  tmuxBin,
  distributionDir,
}: ClaudeTuiLiveRequirements): string | null {
  const gateReason = claudeTuiLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) return `Claude child environment rejected ${isolated.error.key}`;
  const tmux = spawnSync(tmuxBin, ["-V"], { encoding: "utf8", env: isolated.value });
  if (tmux.status !== 0 || !/tmux\s+\d+\.\d+/i.test(tmux.stdout)) return "tmux capability is unavailable";
  const claude = spawnSync(claudeBin, ["--version"], { encoding: "utf8", env: isolated.value });
  const parsed = claude.status === 0 ? createClaudeFamilyContext().parseVersion(claude.stdout) : null;
  if (parsed === null || !createClaudeFamilyContext().versionAtLeast(parsed, [2, 1, 220])) {
    return `claude >= 2.1.220 not found (AMADEUS_CLAUDE_BIN=${claudeBin})`;
  }
  const help = spawnSync(claudeBin, ["--help"], { encoding: "utf8", env: isolated.value });
  if (help.status !== 0 || CLAUDE_TUI_REQUIRED_HELP_FLAGS.some((flag) => !help.stdout.includes(flag))) {
    return "claude TUI capability is unavailable";
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY && !probeClaudeNativeCredential(claudeBin, env)) {
    return "provide ANTHROPIC_API_KEY or a usable native Claude keychain credential";
  }
  return null;
}
