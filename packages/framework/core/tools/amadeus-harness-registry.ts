// Canonical harness capability registry. This Core location is projected
// byte-for-byte into every harness distribution.

export interface HarnessDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly packageFace: boolean;
  readonly selfInstallFace: boolean;
  readonly autonomyContract: boolean;
  readonly autonomyLive: boolean;
  readonly native: {
    readonly liveAuthorization: "credential-attested" | "unavailable";
    readonly judgeReplay: "invoke-once" | "unavailable";
    readonly liveCommandEnv: string | null;
  };
}

export const HARNESS_REGISTRY = [
  { id: "claude", displayName: "Claude Code", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once",
      liveCommandEnv: "AMADEUS_CLAUDE_LIVE_COMMAND_JSON" } },
  { id: "codex", displayName: "Codex", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once",
      liveCommandEnv: "AMADEUS_CODEX_LIVE_COMMAND_JSON" } },
  { id: "cursor", displayName: "Cursor", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once",
      liveCommandEnv: "AMADEUS_CURSOR_LIVE_COMMAND_JSON" } },
  { id: "kiro", displayName: "Kiro CLI", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable", liveCommandEnv: null } },
  { id: "kiro-ide", displayName: "Kiro IDE", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable", liveCommandEnv: null } },
  { id: "opencode", displayName: "OpenCode", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once",
      liveCommandEnv: "AMADEUS_OPENCODE_LIVE_COMMAND_JSON" } },
  { id: "kimi", displayName: "Kimi Code", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once",
      liveCommandEnv: "AMADEUS_KIMI_LIVE_COMMAND_JSON" } },
  { id: "pi", displayName: "Pi Coding Agent", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable", liveCommandEnv: null } },
] as const satisfies readonly HarnessDescriptor[];

type RegistryRow = (typeof HARNESS_REGISTRY)[number];
export type HarnessId = RegistryRow["id"];
export type PackageHarnessId = RegistryRow extends infer Row
  ? Row extends { readonly packageFace: true; readonly id: infer Id extends string } ? Id : never
  : never;
export type SelfInstallHarnessId = RegistryRow extends infer Row
  ? Row extends { readonly selfInstallFace: true; readonly id: infer Id extends string } ? Id : never
  : never;

export const PACKAGE_HARNESS_IDS: readonly PackageHarnessId[] = HARNESS_REGISTRY
  .filter((descriptor): descriptor is RegistryRow & { readonly packageFace: true } => descriptor.packageFace)
  .map((descriptor) => descriptor.id as PackageHarnessId);

export const SELF_INSTALL_HARNESS_IDS: readonly SelfInstallHarnessId[] = HARNESS_REGISTRY
  .filter((descriptor): descriptor is RegistryRow & { readonly selfInstallFace: true } => descriptor.selfInstallFace)
  .map((descriptor) => descriptor.id as SelfInstallHarnessId);

// The registry paired with its content digest, as intent completion consumes
// it (amadeus-intent-completion.ts): revision and cohort bindings pin the
// registryDigest so a cohort minted against one registry cannot be replayed
// against another.
export interface ValidatedHarnessRegistry {
  readonly descriptors: readonly HarnessDescriptor[];
  readonly registryDigest: string;
}
