export const CLAUDE_SIDE_EFFECT_CALLS = new Set(["probe", "lease", "scratch", "spawn", "ledger"]);
export const CLAUDE_BASE_ENVIRONMENT = ["HOME", "LANG", "LC_ALL", "NO_COLOR", "PATH", "TMPDIR"];

export function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return [...new Set(left)].sort().join("\0") === [...new Set(right)].sort().join("\0");
}
