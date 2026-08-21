import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { defaultKiroSourceHome, kiroHomeLayout } from "./live-e2e/kiro.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";
import { parseVersion, versionAtLeast } from "./live-e2e/version.ts";

const CAPABILITY = requireCapability("kiro-acp");

/**
 * The gate half, decided by the kernel: CI hard deny first, then the exact
 * opt-in. Every Kiro ACP entry point — the adapter, the driver's calibration,
 * and any journey built on them — reads this one function, so none of them can
 * grow a second answer to "may this run at all" (BR-ACP-01).
 */
export function kiroAcpLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface KiroAcpLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly kiroBin: string;
  readonly distributionDir?: string;
  /** Home owning the Kiro auth database. */
  readonly sourceHome?: string;
}

/**
 * Gate plus the prerequisite probes, in the kernel's own precedence order. The
 * distribution check is optional because the driver's own calibration runs
 * against a fixture project rather than a shipped tree; the adapter always
 * passes one.
 */
export function kiroAcpLiveRequirementsSkipReason({
  env,
  kiroBin,
  distributionDir,
  sourceHome,
}: KiroAcpLiveRequirements): string | null {
  const gateReason = kiroAcpLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) return `Kiro child environment rejected ${isolated.error.key}`;
  const minimumVersion = parseVersion(CAPABILITY.minimumVersion);
  if (minimumVersion === null) throw new Error("invalid kiro-acp minimum version");
  const kiro = spawnSync(kiroBin, ["--version"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(15_000),
  });
  if (kiro.status !== 0) return `kiro-cli not found (AMADEUS_KIRO_BIN=${kiroBin})`;
  const parsed = parseVersion(kiro.stdout);
  if (parsed === null || !versionAtLeast(parsed, minimumVersion)) {
    return `kiro-cli >= ${CAPABILITY.minimumVersion} not found (AMADEUS_KIRO_BIN=${kiroBin})`;
  }
  if (distributionDir !== undefined && !existsSync(distributionDir)) {
    return `distributable missing: ${distributionDir}`;
  }
  // Presence only — the auth database is never read, copied, or opened here.
  const layout = kiroHomeLayout(sourceHome ?? defaultKiroSourceHome(env), process.platform, env);
  if (!existsSync(layout.authFile)) return "Kiro CLI is not authenticated (run `kiro-cli login`)";
  return null;
}
