// Canonical harness capability registry. This Core location is projected
// byte-for-byte into every harness distribution.

export const HARNESS_REGISTRY = [
  { id: "claude", displayName: "Claude Code", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once" } },
  { id: "codex", displayName: "Codex", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once" } },
  { id: "cursor", displayName: "Cursor", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once" } },
  { id: "kiro", displayName: "Kiro CLI", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable" } },
  { id: "kiro-ide", displayName: "Kiro IDE", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable" } },
  { id: "opencode", displayName: "OpenCode", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once" } },
  { id: "kimi", displayName: "Kimi Code", packageFace: true, selfInstallFace: true,
    autonomyContract: true, autonomyLive: true,
    native: { liveAuthorization: "credential-attested", judgeReplay: "invoke-once" } },
  { id: "pi", displayName: "Pi Coding Agent", packageFace: true, selfInstallFace: false,
    autonomyContract: true, autonomyLive: false,
    native: { liveAuthorization: "unavailable", judgeReplay: "unavailable" } },
] as const;

type RegistryRow = (typeof HARNESS_REGISTRY)[number];
export type HarnessId = RegistryRow["id"];
export type PackageHarnessId = RegistryRow extends infer Row
  ? Row extends { readonly packageFace: true; readonly id: infer Id extends string } ? Id : never
  : never;
export type SelfInstallHarnessId = RegistryRow extends infer Row
  ? Row extends { readonly selfInstallFace: true; readonly id: infer Id extends string } ? Id : never
  : never;

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
  };
}

export const PACKAGE_HARNESS_IDS = HARNESS_REGISTRY
  .filter((descriptor) => descriptor.packageFace)
  .map((descriptor) => descriptor.id) as readonly PackageHarnessId[];

export const SELF_INSTALL_HARNESS_IDS = HARNESS_REGISTRY
  .filter((descriptor) => descriptor.selfInstallFace)
  .map((descriptor) => descriptor.id) as readonly SelfInstallHarnessId[];

export interface ValidatedHarnessRegistry {
  readonly descriptors: readonly HarnessDescriptor[];
  readonly registryDigest: string;
}
