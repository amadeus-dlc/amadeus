import type { Harness } from "./installer-contracts.ts";

export const HARNESS_ENGINE_DIRS: Record<Harness, string> = {
  claude: ".claude",
  codex: ".codex",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
};

export const ACTIVE_SPACE_MEMORY_SHELL = "amadeus/spaces/default/memory" as const;

export function harnessEngineDir(harness: Harness): string {
  return HARNESS_ENGINE_DIRS[harness];
}

export function harnessToolsDir(harness: Harness): string {
  return `${HARNESS_ENGINE_DIRS[harness]}/tools`;
}
