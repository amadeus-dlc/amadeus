// Pure validate/plan seam for scripts/release-version-sync.ts (#702).
//
// No IO, no side effects: given the target version and each surface's current
// contents, it either returns a full patch plan for EVERY surface, or a typed
// failure naming the first surface whose pattern did not match. The CLI writes
// only when the plan is ok, so a half-applied state is structurally impossible
// (FR-702-2). Split into its own module so the seam is importable in-process by
// tests without executing the CLI's argv/git side effects.

export interface VersionSurface {
  readonly relPath: string;
  /** Acceptance + replacement target pattern (no `g` flag — single replace). */
  readonly accept: RegExp;
  readonly replacement: (version: string) => string;
}

// The canonical version surfaces the release sync patches — ONE definition,
// consumed by both the planner and the CLI (no hand-duplicated file list).
export const VERSION_SURFACES: readonly VersionSurface[] = [
  {
    relPath: "packages/framework/core/tools/amadeus-version.ts",
    accept: /AMADEUS_VERSION = "[^"]+"/,
    replacement: (v) => `AMADEUS_VERSION = "${v}"`,
  },
  {
    relPath: "README.md",
    // Symmetric with the version-acceptance regex in the CLI: allow an optional
    // prerelease suffix so a prerelease badge can advance to any next version
    // (FR-702-1). Without this the badge stalls once it becomes a prerelease.
    accept: /badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/,
    replacement: (v) => `badge/version-${v}-blue`,
  },
];

export interface PatchPlanEntry {
  readonly relPath: string;
  readonly next: string;
  readonly changed: boolean;
}

export type PlanResult =
  | { readonly ok: true; readonly entries: readonly PatchPlanEntry[] }
  | { readonly ok: false; readonly relPath: string; readonly pattern: string };

/**
 * Validate every surface's pattern against its supplied contents and, only if
 * all match, return the full patch plan. On the first miss (or a surface whose
 * contents were not supplied) return a typed failure naming that surface — and
 * NO entries, so there is nothing to partially apply.
 */
export function planVersionSync(
  version: string,
  contentsByPath: Readonly<Record<string, string>>,
  surfaces: readonly VersionSurface[] = VERSION_SURFACES,
): PlanResult {
  const entries: PatchPlanEntry[] = [];
  for (const s of surfaces) {
    const src = contentsByPath[s.relPath];
    if (src === undefined || !s.accept.test(src)) {
      return { ok: false, relPath: s.relPath, pattern: String(s.accept) };
    }
    const next = src.replace(s.accept, s.replacement(version));
    entries.push({ relPath: s.relPath, next, changed: next !== src });
  }
  return { ok: true, entries };
}
