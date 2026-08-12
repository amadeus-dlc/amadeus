import { scaleTestTime } from "../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { defaultKiroSourceHome, kiroHomeLayout } from "./live-e2e/kiro.ts";
import { buildChildEnvironment, evaluateLiveGate } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";
import { parseVersion, versionAtLeast } from "./live-e2e/version.ts";

const CAPABILITY = requireCapability("kiro-tui");

export function kiroTuiLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const gate = evaluateLiveGate(env, CAPABILITY);
  return gate.kind === "skip" ? gate.diagnostic : null;
}

export interface KiroTuiLiveRequirements {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly kiroBin: string;
  readonly tmuxBin: string;
  readonly distributionDir: string;
  /** Home owning the Kiro auth database and chat runtime. */
  readonly sourceHome?: string;
}

export function kiroTuiLiveRequirementsSkipReason({
  env,
  kiroBin,
  tmuxBin,
  distributionDir,
  sourceHome,
}: KiroTuiLiveRequirements): string | null {
  const gateReason = kiroTuiLiveSkipReason(env);
  if (gateReason !== null) return gateReason;
  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) return `Kiro child environment rejected ${isolated.error.key}`;
  const spawnOptions = { encoding: "utf8", env: isolated.value, timeout: scaleTestTime(15_000) } as const;
  const tmux = spawnSync(tmuxBin, ["-V"], { ...spawnOptions, maxBuffer: 64 * 1024 });
  if (tmux.status !== 0 || !/tmux\s+\d+\.\d+/i.test(tmux.stdout)) return "tmux capability is unavailable";
  const minimumVersion = parseVersion(CAPABILITY.minimumVersion);
  if (minimumVersion === null) throw new Error("invalid kiro-tui minimum version");
  const kiro = spawnSync(kiroBin, ["--version"], { ...spawnOptions, maxBuffer: 64 * 1024 });
  const parsed = kiro.status === 0 ? parseVersion(kiro.stdout) : null;
  if (parsed === null || !versionAtLeast(parsed, minimumVersion)) {
    return `kiro-cli >= ${CAPABILITY.minimumVersion} not found (AMADEUS_KIRO_BIN=${kiroBin})`;
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;
  // Kiro authentication is on disk under the source home, so it is probed by
  // presence only — the adapter never reads or copies the database itself.
  const layout = kiroHomeLayout(sourceHome ?? defaultKiroSourceHome(env), process.platform, env);
  if (!existsSync(layout.authFile)) return "Kiro CLI is not authenticated (run `kiro-cli login`)";
  if (!existsSync(layout.chatBinary)) return "Kiro CLI chat runtime is unavailable";
  return null;
}
