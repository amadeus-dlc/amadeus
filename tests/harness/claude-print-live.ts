import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  CLAUDE_REQUIRED_HELP_FLAGS,
  createClaudeFamilyContext,
} from "./live-e2e/claude.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";

const CAPABILITY = requireCapability("claude-print");

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
  const claudeContext = createClaudeFamilyContext();
  const minimumVersion = claudeContext.parseVersion(CAPABILITY.minimumVersion);
  if (minimumVersion === null) throw new Error("invalid claude-print minimum version");
  const version = spawnSync(claudeBin, ["--version"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(15_000),
  });
  const parsed = version.status === 0 ? claudeContext.parseVersion(version.stdout) : null;
  if (parsed === null || !claudeContext.versionAtLeast(parsed, minimumVersion)) {
    return `claude >= ${CAPABILITY.minimumVersion} not found (AMADEUS_CLAUDE_BIN=${claudeBin})`;
  }
  const help = spawnSync(claudeBin, ["--help"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 1024 * 1024,
    timeout: scaleTestTime(15_000),
  });
  if (help.status !== 0 || CLAUDE_REQUIRED_HELP_FLAGS.some((flag) => !help.stdout.includes(flag))) {
    return "claude print structured-output capability is unavailable";
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY) return "provide ANTHROPIC_API_KEY";
  return null;
}
