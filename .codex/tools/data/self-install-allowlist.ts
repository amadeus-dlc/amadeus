export type TrackedEntry = {
  readonly path: string;
  readonly depth: 1 | 2;
};

export type SelfInstallAllowlist = {
  readonly tracked: readonly TrackedEntry[];
  readonly preservedRuntime: readonly string[];
  readonly perUserPatterns: readonly RegExp[];
};

const GENERATED_SELF_INSTALL_ROOTS = [
  ".agents",
  ".claude",
  ".codex",
  ".cursor",
  ".kimi-code",
  ".opencode",
] as const;

const HISTORICAL_GITATTRIBUTES_EXCEPTIONS = [".codex/hooks.json"] as const;

export const COMPOSED_SCOPE_RE = /^\.[^/]+\/scopes\/amadeus-[^/]+\.md$/;
export const SCOPE_GRID_RE = /^\.[^/]+\/tools\/data\/scope-grid\.json$/;
export const PLUGIN_ENGINE_STATE_RE = /^\.[^/]+\/\.amadeus-plugin-[^/]+(\/.*)?$/;
export const STAGE_GRAPH_RE = /^\.[^/]+\/tools\/data\/stage-graph\.json$/;

function normalizedPathSegments(path: string): readonly string[] {
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  const segments = normalized.split("/");
  const hasUnsafeSyntax =
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.includes("\\") ||
    normalized.includes("\0") ||
    /[*?[\]]/.test(normalized) ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..");
  if (hasUnsafeSyntax || segments.length < 2 || !segments[0].startsWith(".")) {
    throw new Error(`invalid allowlist path: ${JSON.stringify(path)}`);
  }
  return segments;
}

function trackedPathSet(entries: readonly TrackedEntry[]): ReadonlySet<string> {
  const trackedPaths = new Set<string>();
  for (const entry of entries) {
    const segments = normalizedPathSegments(entry.path);
    if (entry.path.endsWith("/") || segments.length - 1 !== entry.depth) {
      throw new Error(`allowlist path ${entry.path} does not match depth ${entry.depth}`);
    }
    if (trackedPaths.has(entry.path)) {
      throw new Error(`duplicate tracked allowlist path: ${entry.path}`);
    }
    trackedPaths.add(entry.path);
  }
  return trackedPaths;
}

function assertRuntimePaths(
  paths: readonly string[],
  trackedPaths: ReadonlySet<string>,
): void {
  const runtimePaths = new Set<string>();
  for (const path of paths) {
    normalizedPathSegments(path);
    const comparablePath = path.endsWith("/") ? path.slice(0, -1) : path;
    if (trackedPaths.has(path) || trackedPaths.has(comparablePath)) {
      throw new Error(`path appears in multiple allowlist categories: ${path}`);
    }
    if (runtimePaths.has(comparablePath)) {
      throw new Error(`duplicate runtime allowlist path: ${path}`);
    }
    runtimePaths.add(comparablePath);
  }
}

function assertUniquePatterns(patternsToCheck: readonly RegExp[]): void {
  const patterns = new Set<string>();
  for (const pattern of patternsToCheck) {
    const key = `${pattern.source}/${pattern.flags}`;
    if (patterns.has(key)) throw new Error(`duplicate per-user pattern: /${key}`);
    patterns.add(key);
  }
}

function assertAllowlist(allowlist: SelfInstallAllowlist): void {
  const trackedPaths = trackedPathSet(allowlist.tracked);
  assertRuntimePaths(allowlist.preservedRuntime, trackedPaths);
  assertUniquePatterns(allowlist.perUserPatterns);
}

export const SELF_INSTALL_ALLOWLIST: SelfInstallAllowlist = {
  tracked: [
    { path: ".claude/CLAUDE.md", depth: 1 },
    { path: ".claude/settings.json", depth: 1 },
    { path: ".codex/config.toml", depth: 1 },
    { path: ".cursor/hooks.json", depth: 1 },
    { path: ".opencode/opencode.json", depth: 1 },
    { path: ".claude/hooks/amadeus-dispatch.ts", depth: 2 },
  ],
  preservedRuntime: [
    ".claude/settings.local.json",
    ".claude/worktrees/",
    ".codex/hooks.json",
    ".codex/agmsg-delivery-mode",
    ".codex/local/",
  ],
  perUserPatterns: [
    COMPOSED_SCOPE_RE,
    SCOPE_GRID_RE,
    PLUGIN_ENGINE_STATE_RE,
    STAGE_GRAPH_RE,
  ],
};

export function preserved(allowlist: SelfInstallAllowlist): readonly string[] {
  assertAllowlist(allowlist);
  return [
    ...allowlist.tracked.map((entry) => entry.path),
    ...allowlist.preservedRuntime,
  ];
}

export function gitignoreExpectation(
  allowlist: SelfInstallAllowlist,
): readonly string[] {
  assertAllowlist(allowlist);
  const patterns: string[] = [];
  for (const root of GENERATED_SELF_INSTALL_ROOTS) {
    patterns.push(`/${root}/**`);
    const entries = allowlist.tracked
      .filter((entry) => entry.path.startsWith(`${root}/`))
      .sort((left, right) => left.path.localeCompare(right.path));
    const includedParents = new Set<string>();
    for (const entry of entries) {
      if (entry.depth === 2) {
        const parent = entry.path.slice(0, entry.path.lastIndexOf("/"));
        if (!includedParents.has(parent)) {
          patterns.push(`!/${parent}/`);
          includedParents.add(parent);
        }
      }
      patterns.push(`!/${entry.path}`);
    }
  }
  return patterns;
}

export function gitattributesExpectation(
  allowlist: SelfInstallAllowlist,
): readonly string[] {
  assertAllowlist(allowlist);
  return [
    ...allowlist.tracked.map((entry) => entry.path),
    ...HISTORICAL_GITATTRIBUTES_EXCEPTIONS,
  ]
    .sort()
    .map((path) => `${path} -linguist-generated`);
}
