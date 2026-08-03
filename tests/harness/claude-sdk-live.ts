import { existsSync } from "node:fs";
import {
  CLAUDE_SDK_MINIMUM_VERSION,
  isClaudeSdkVersionSupported,
  probeClaudeSdkVersion,
} from "./live-e2e/claude-sdk.ts";
import { probeClaudeNativeCredential } from "./live-e2e/claude.ts";
import { evaluateLiveGate } from "./live-e2e/policy.ts";
import { capabilityById } from "./live-e2e/registry.ts";

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-sdk");
  if (!resolved.ok) throw new Error("claude-sdk capability is not registered");
  return resolved.value;
})();

export function claudeSdkLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface ClaudeSdkLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly claudeBin: string;
  readonly distributionDir: string;
  readonly packageJsonPath?: string;
}

export function claudeSdkLiveRequirementsSkipReason({
  env,
  claudeBin,
  distributionDir,
  packageJsonPath,
}: ClaudeSdkLiveRequirements): string | null {
  const gateReason = claudeSdkLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const version = probeClaudeSdkVersion(packageJsonPath);
  if (version === null || !isClaudeSdkVersionSupported(version)) {
    return `Claude Agent SDK >= ${CLAUDE_SDK_MINIMUM_VERSION} is unavailable`;
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY && !probeClaudeNativeCredential(claudeBin, env)) {
    return "provide ANTHROPIC_API_KEY or a usable native Claude keychain credential";
  }
  return null;
}
