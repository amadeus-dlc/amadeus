import type { HarnessName } from "./harness.ts";

// Maps a harness to the dot-directory name it lives under on disk once
// installed. Kept as one canonical mapping (rather than re-deriving it in
// both installation-detection and verification) since kiro/kiro-ide share a
// single directory name. Type-only dependency on harness.ts: no HarnessName
// value is needed, only the type for the parameter/return annotations.
const ENGINE_DIR_BY_HARNESS: Readonly<Record<string, string>> = Object.freeze({
  claude: ".claude",
  codex: ".codex",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
});

export function engineDirNameFor(harness: HarnessName): string {
  const dir = ENGINE_DIR_BY_HARNESS[harness as string];
  if (dir === undefined) {
    throw new Error(`no engine directory mapping is defined for harness "${harness}"`);
  }
  return dir;
}

export function allEngineDirNames(): readonly string[] {
  return Object.freeze([...new Set(Object.values(ENGINE_DIR_BY_HARNESS))]);
}
