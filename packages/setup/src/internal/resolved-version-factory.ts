import type { SemVer } from "../domain/semver.ts";
import type { ResolvedVersion } from "../domain/resolved-version.ts";

// ADR-003: archive is always fetched from codeload, keyed by the "v"-prefixed tag.
const CODELOAD_BASE = "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags";

export function createResolvedVersion(semver: SemVer, source: "release" | "tag"): ResolvedVersion {
  const tag = semver.format();
  return Object.freeze({
    tag,
    semver,
    source,
    archiveUrl(): URL {
      return new URL(`${CODELOAD_BASE}/${tag}`);
    },
    isSameAs(other: SemVer): boolean {
      return semver.equals(other);
    },
  });
}
