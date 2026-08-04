export type Version = readonly [number, number, number];

export function parseVersion(text: string): Version | null {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function versionAtLeast(actual: Version, minimum: Version): boolean {
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}
