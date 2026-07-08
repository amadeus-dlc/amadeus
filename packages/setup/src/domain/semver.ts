import { createSemVer } from "../internal/semver-factory.ts";
import { Result } from "../shared/result.ts";

export type SemVer = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | null;
  isStable(): boolean;
  isLaterThan(other: SemVer): boolean;
  equals(other: SemVer): boolean;
  format(): `v${string}`;
};

// BR-F05: "v" prefix is optional and normalized away.
const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export namespace SemVer {
  export function parse(raw: string): Result<SemVer, VersionError> {
    const match = SEMVER_PATTERN.exec(raw.trim());
    if (!match) {
      return Result.err(
        VersionError.invalidFormat(raw, "expected MAJOR.MINOR.PATCH[-PRERELEASE], optionally prefixed with 'v'"),
      );
    }
    const [, majorRaw, minorRaw, patchRaw, prerelease] = match;
    return Result.ok(createSemVer(Number(majorRaw), Number(minorRaw), Number(patchRaw), prerelease ?? null));
  }

  export function latestStableOf(list: readonly SemVer[]): SemVer | undefined {
    let best: SemVer | undefined;
    for (const candidate of list) {
      if (!candidate.isStable()) continue; // BR-F02: default resolution always excludes prereleases
      if (!best || candidate.isLaterThan(best)) best = candidate;
    }
    return best;
  }
}

Object.freeze(SemVer);

export type VersionError = {
  readonly type: "invalid-format";
  readonly raw: string;
  readonly reason: string;
};

export namespace VersionError {
  export function invalidFormat(raw: string, reason: string): VersionError {
    return Object.freeze({ type: "invalid-format", raw, reason });
  }
}

Object.freeze(VersionError);
