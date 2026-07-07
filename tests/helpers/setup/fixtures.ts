import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SetupCommand } from "../../../packages/setup/src/cli/types.ts";
import { CANONICAL_SOURCE_REPO, type DistributionFile, type LoadedDistribution, type ResolvedVersion } from "../../../packages/setup/src/domain/source-types.ts";
import { INSTALLER_MANIFEST_PATH, type InstallerManifest } from "../../../packages/setup/src/domain/target-types.ts";

export const FIXED_INSTALLED_AT = "2026-07-07T12:34:56.000Z";
export const FIXED_OPERATION_TIMESTAMP = new Date(FIXED_INSTALLED_AT);

export const DEFAULT_RESOLVED_VERSION: ResolvedVersion = {
  distributionVersion: "1.2.3",
  sourceTag: "v1.2.3",
  sourceRepo: CANONICAL_SOURCE_REPO,
  ignoredTags: [],
};

export function md5(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

export function distributionFile(
  path: string,
  input: Partial<DistributionFile> & { content?: string } = {},
): DistributionFile {
  const content = input.content ?? path;
  return {
    path,
    class: input.class ?? "shared",
    required: input.required ?? true,
    md5: input.md5 ?? md5(content),
  };
}

export function installerManifest(input: Partial<InstallerManifest> = {}): InstallerManifest {
  return {
    schemaVersion: 1,
    installerPackageVersion: "0.0.0",
    distributionVersion: "1.2.3",
    sourceTag: "v1.2.3",
    installedAt: FIXED_INSTALLED_AT,
    harness: "codex",
    files: [distributionFile("AGENTS.md", { content: "agents" })],
    ...input,
  };
}

export function loadedDistribution(
  root: string,
  harness: LoadedDistribution["harness"],
  files: DistributionFile[],
  resolvedVersion: ResolvedVersion = DEFAULT_RESOLVED_VERSION,
): LoadedDistribution {
  return {
    root,
    harness,
    resolvedVersion,
    files: files.map((file) => ({
      path: file.path,
      absolutePath: join(root, file.path),
      md5: file.md5,
    })),
  };
}

export function installCommand(overrides: Partial<SetupCommand> = {}): SetupCommand {
  return {
    command: "install",
    harness: "codex",
    target: undefined,
    version: undefined,
    yes: false,
    force: false,
    ...overrides,
  };
}

export function upgradeCommand(overrides: Partial<SetupCommand> = {}): SetupCommand {
  return {
    command: "upgrade",
    harness: "codex",
    target: undefined,
    version: undefined,
    yes: false,
    force: false,
    ...overrides,
  };
}

export interface TempWorkspace {
  root: string;
  cleanup(): void;
}

export function createTempWorkspace(prefix: string): TempWorkspace {
  const root = mkdtempSync(join(tmpdir(), prefix));
  return {
    root,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export { INSTALLER_MANIFEST_PATH };
