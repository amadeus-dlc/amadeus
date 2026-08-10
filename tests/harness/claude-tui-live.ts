import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createClaudeFamilyContext } from "./live-e2e/claude.ts";
import { CLAUDE_TUI_REQUIRED_HELP_FLAGS } from "./live-e2e/claude-tui.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";

const CAPABILITY = requireCapability("claude-tui");

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
  const spawnOptions = { encoding: "utf8", env: isolated.value, timeout: scaleTestTime(15_000) } as const;
  const tmux = spawnSync(tmuxBin, ["-V"], { ...spawnOptions, maxBuffer: 64 * 1024 });
  if (tmux.status !== 0 || !/tmux\s+\d+\.\d+/i.test(tmux.stdout)) return "tmux capability is unavailable";
  const claudeContext = createClaudeFamilyContext();
  const minimumVersion = claudeContext.parseVersion(CAPABILITY.minimumVersion);
  if (minimumVersion === null) throw new Error("invalid claude-tui minimum version");
  const claude = spawnSync(claudeBin, ["--version"], { ...spawnOptions, maxBuffer: 64 * 1024 });
  const parsed = claude.status === 0 ? claudeContext.parseVersion(claude.stdout) : null;
  if (parsed === null || !claudeContext.versionAtLeast(parsed, minimumVersion)) {
    return `claude >= ${CAPABILITY.minimumVersion} not found (AMADEUS_CLAUDE_BIN=${claudeBin})`;
  }
  const help = spawnSync(claudeBin, ["--help"], { ...spawnOptions, maxBuffer: 1024 * 1024 });
  if (help.status !== 0 || CLAUDE_TUI_REQUIRED_HELP_FLAGS.some((flag) => !help.stdout.includes(flag))) {
    return "claude TUI capability is unavailable";
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY) return "provide ANTHROPIC_API_KEY";
  return null;
}
