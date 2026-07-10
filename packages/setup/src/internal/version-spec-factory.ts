import type { SemVer } from "../domain/semver.ts";
import type { VersionSpec } from "../domain/version-spec.ts";

export function createVersionSpec(kind: "latest" | "exact", exactVersion: SemVer | null): VersionSpec {
  return Object.freeze({
    kind,
    admits(candidate: SemVer): boolean {
      if (kind === "latest") {
        return candidate.isStable(); // BR-F02: default resolution always excludes prereleases
      }
      // BR-F04: an explicit --version matches the exact tag only; prerelease is
      // allowed when requested explicitly (no isStable() check here).
      return exactVersion !== null && candidate.equals(exactVersion);
    },
    describe(): string {
      return kind === "latest" ? "latest stable version" : `version ${exactVersion?.format() ?? "?"}`;
    },
    exactTag(): `v${string}` | null {
      return exactVersion?.format() ?? null;
    },
  });
}
