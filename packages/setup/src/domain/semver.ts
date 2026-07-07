export type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

export const SEMVER_PATTERN = /^(?:v)?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?$/;

export function parseSemver(value: string): ParsedSemver | undefined {
  const match = SEMVER_PATTERN.exec(value);
  if (match === null) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

export function formatSemver(parsed: ParsedSemver): string {
  const stable = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  return parsed.prerelease === undefined ? stable : `${stable}-${parsed.prerelease}`;
}

export function compareParsedSemver(left: ParsedSemver, right: ParsedSemver): number {
  for (const key of ["major", "minor", "patch"] as const) {
    const difference = left[key] - right[key];
    if (difference !== 0) {
      return difference;
    }
  }
  if (left.prerelease === right.prerelease) {
    return 0;
  }
  if (left.prerelease === undefined) {
    return 1;
  }
  if (right.prerelease === undefined) {
    return -1;
  }
  return left.prerelease.localeCompare(right.prerelease);
}

export function compareSemver(left: string, right: string): number {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  if (parsedLeft === undefined || parsedRight === undefined) {
    return left.localeCompare(right);
  }
  return compareParsedSemver(parsedLeft, parsedRight);
}
