import { SemVer } from "../domain/semver.ts";
import type { ArchiveSource, ResolvedVersion } from "../domain/resolved-version.ts";

// ADR-003: releases from this boundary use verified release assets. Older tags
// retain the original codeload URL byte-for-byte.
export const ASSET_INTRO_VERSION = "0.1.8";
const CODELOAD_BASE = "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags";
const RELEASE_BASE = "https://github.com/amadeus-dlc/amadeus/releases/download";

const parsedAssetIntroVersion = SemVer.parse(ASSET_INTRO_VERSION);
if (parsedAssetIntroVersion.type === "err") throw new Error("ASSET_INTRO_VERSION must be valid semver");
const assetIntroVersion = parsedAssetIntroVersion.value;

function resolveArchiveSource(semver: SemVer): ArchiveSource {
  const tag = semver.format();
  if (!semver.equals(assetIntroVersion) && !semver.isLaterThan(assetIntroVersion)) {
    return Object.freeze({ kind: "codeload", archiveUrl: new URL(`${CODELOAD_BASE}/${tag}`) });
  }
  const archiveName = `amadeus-dist-${tag}.tar.gz`;
  const releaseUrl = `${RELEASE_BASE}/${tag}`;
  return Object.freeze({
    kind: "asset",
    archiveName,
    archiveUrl: new URL(`${releaseUrl}/${archiveName}`),
    checksumUrl: new URL(`${releaseUrl}/SHA256SUMS`),
  });
}

export function createResolvedVersion(semver: SemVer, source: "release" | "tag"): ResolvedVersion {
  const tag = semver.format();
  return Object.freeze({
    tag,
    semver,
    source,
    archiveSource(): ArchiveSource {
      return resolveArchiveSource(semver);
    },
    archiveUrl(): URL {
      return resolveArchiveSource(semver).archiveUrl;
    },
    isSameAs(other: SemVer): boolean {
      return semver.equals(other);
    },
  });
}
