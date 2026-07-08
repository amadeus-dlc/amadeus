import type { HarnessName } from "../domain/harness.ts";
import type { BuildInput, Disposition, Manifest, ManifestFiles, ManifestJson } from "../domain/manifest.ts";
import type { SemVer } from "../domain/semver.ts";

type ManifestState = {
  readonly installerPackageVersion: string;
  readonly distributionVersion: SemVer;
  readonly sourceTag: `v${string}`;
  readonly installedAt: string;
  readonly harness: HarnessName;
  readonly files: ManifestFiles;
};

export function createManifest(state: ManifestState): Manifest {
  return Object.freeze({
    schemaVersion: 1 as const,
    installerPackageVersion: state.installerPackageVersion,
    distributionVersion: state.distributionVersion,
    sourceTag: state.sourceTag,
    installedAt: state.installedAt,
    harness: state.harness,
    dispositionFor(path: string, actualMd5: string | null): Disposition {
      // Law of Demeter: callers ask the manifest, not manifest.files() directly.
      return state.files.dispositionFor(path, actualMd5);
    },
    isNewerThan(candidate: SemVer): boolean {
      return state.distributionVersion.isLaterThan(candidate);
    },
    requiredPaths(): readonly string[] {
      return state.files.requiredPaths();
    },
    upgradedTo(next: BuildInput): Manifest {
      return createManifest({
        installerPackageVersion: next.meta.installerPackageVersion,
        distributionVersion: next.payload.version.semver,
        sourceTag: next.payload.version.tag,
        installedAt: next.meta.installStartedAt,
        harness: next.meta.harness,
        files: next.files,
      });
    },
    toJSON(): ManifestJson {
      return Object.freeze({
        schemaVersion: 1 as const,
        installerPackageVersion: state.installerPackageVersion,
        distributionVersion: state.distributionVersion.format(),
        sourceTag: state.sourceTag,
        installedAt: state.installedAt,
        harness: state.harness,
        files: state.files.entries().map((entry) => ({
          path: entry.path,
          class: entry.class,
          required: entry.required,
          md5: entry.md5,
        })),
      });
    },
  });
}
