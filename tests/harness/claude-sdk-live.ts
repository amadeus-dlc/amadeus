import { existsSync } from "node:fs";
import { isClaudeSdkVersionSupported, probeClaudeSdkVersion } from "./live-e2e/claude-sdk.ts";
import { evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";

const CAPABILITY = requireCapability("claude-sdk");

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
  distributionDir,
  packageJsonPath,
}: ClaudeSdkLiveRequirements): string | null {
  const gateReason = claudeSdkLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const version = probeClaudeSdkVersion(packageJsonPath);
  if (version === null || !isClaudeSdkVersionSupported(version)) {
    return `Claude Agent SDK >= ${CAPABILITY.minimumVersion} is unavailable`;
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  if (!env.ANTHROPIC_API_KEY) return "provide ANTHROPIC_API_KEY";
  return null;
}
