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
      return comparePrerelease(prerelease, other.prerelease) > 0;
    },
    equals(other: SemVer): boolean {
      return major === other.major && minor === other.minor && patch === other.patch && prerelease === other.prerelease;
    },
    format(): `v${string}` {
      return prerelease ? `v${major}.${minor}.${patch}-${prerelease}` : `v${major}.${minor}.${patch}`;
    },
  });
}

// SemVer §11 prerelease precedence, restricted to same major.minor.patch:
// a missing prerelease (a release) has higher precedence than any prerelease;
// dot-separated identifiers compare left to right, numeric identifiers
// numerically and below alphanumeric ones, and a longer identifier set
// outranks a shorter prefix of it. Returns >0 when `a` is later than `b`, <0
// when earlier, 0 when equal.
function comparePrerelease(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const aIds = a.split(".");
  const bIds = b.split(".");
  for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
    const aId = aIds[i];
    const bId = bIds[i];
    if (aId === undefined) return -1;
    if (bId === undefined) return 1;
    if (aId === bId) continue;

    const aNumeric = /^\d+$/.test(aId);
    const bNumeric = /^\d+$/.test(bId);
    if (aNumeric && bNumeric) return Number(aId) - Number(bId) > 0 ? 1 : -1;
    if (aNumeric) return -1;
    if (bNumeric) return 1;
    return aId > bId ? 1 : -1;
  }
  return 0;
}
