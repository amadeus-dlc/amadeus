import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { defaultKimiSourceHome, kimiHomeLayout } from "./live-e2e/kimi.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";
import { parseVersion, versionAtLeast } from "./live-e2e/version.ts";

const CAPABILITY = requireCapability("kimi-print");

/**
 * The gate half, decided by the kernel: CI hard deny first, then the exact
 * opt-in. Every Kimi live entry point reads this one function, so no caller can
 * grow a second gate with a different answer (BR-KIMI-01 / BR-KIMI-02).
 */
export function kimiPrintLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface KimiPrintLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly kimiBin: string;
  readonly distributionDir: string;
  /** Home owning the Kimi OAuth entries. */
  readonly sourceHome?: string;
}

/**
 * Gate plus the prerequisite probes, in the kernel's own precedence order. Each
 * arm mirrors one canonical preflight code; the string is the operator-facing
 * half of the same decision the adapter's `preflight` returns as a code.
 */
export function kimiPrintLiveRequirementsSkipReason({
  env,
  kimiBin,
  distributionDir,
  sourceHome,
}: KimiPrintLiveRequirements): string | null {
  const gateReason = kimiPrintLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) return `Kimi child environment rejected ${isolated.error.key}`;
  const minimumVersion = parseVersion(CAPABILITY.minimumVersion);
  if (minimumVersion === null) throw new Error("invalid kimi-print minimum version");
  const kimi = spawnSync(kimiBin, ["--version"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(15_000),
  });
  if (kimi.status !== 0) return `kimi binary not found (AMADEUS_KIMI_BIN=${kimiBin})`;
  const parsed = parseVersion(kimi.stdout);
  if (parsed === null || !versionAtLeast(parsed, minimumVersion)) {
    return `kimi >= ${CAPABILITY.minimumVersion} not found (AMADEUS_KIMI_BIN=${kimiBin})`;
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  // Presence only — the OAuth entries are never read, copied, or opened here.
  const layout = kimiHomeLayout(sourceHome ?? defaultKimiSourceHome(env));
  if (!existsSync(layout.credentialsDir) && !existsSync(layout.oauthDir)) {
    return "Kimi Code is not authenticated (run `kimi login`)";
  }
  return null;
}
