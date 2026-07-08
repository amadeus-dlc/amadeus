import type { SemVer } from "../domain/semver.ts";

// Internal factory (functional-domain-modeling-ts): not exported outside this
// package. SemVer.parse is the only smart constructor allowed to reach this,
// so an invalid SemVer can never be constructed from outside the domain layer.
export function createSemVer(major: number, minor: number, patch: number, prerelease: string | null): SemVer {
  return Object.freeze({
    major,
    minor,
    patch,
    prerelease,
    isStable(): boolean {
      return prerelease === null; // BR-F02
    },
    isLaterThan(other: SemVer): boolean {
      // BR-F03: numeric ordering, never lexicographic (v1.10.0 > v1.9.0).
      if (major !== other.major) return major > other.major;
      if (minor !== other.minor) return minor > other.minor;
      if (patch !== other.patch) return patch > other.patch;
      return false; // equal major.minor.patch: prerelease ordering is out of scope for default resolution
    },
    equals(other: SemVer): boolean {
      return major === other.major && minor === other.minor && patch === other.patch && prerelease === other.prerelease;
    },
    format(): `v${string}` {
      return prerelease ? `v${major}.${minor}.${patch}-${prerelease}` : `v${major}.${minor}.${patch}`;
    },
  });
}
