import { resolve } from "node:path";

export interface CoverageSourcePathContext {
  repoRoot: string;
  tempRoots: readonly string[];
}

const PACKAGE_HARNESS_DIRS = {
  claude: ".claude",
  codex: ".codex",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
} as const;

function portablePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function absolutePath(path: string, repoRoot: string): string {
  const portable = portablePath(path);
  if (portable.startsWith("/") || /^[A-Za-z]:\//.test(portable)) return portable;
  return portablePath(resolve(repoRoot, portable));
}

function pathUnderRoot(path: string, root: string, repoRoot: string): string | null {
  const absolute = absolutePath(path, repoRoot);
  const absoluteRoot = absolutePath(root, repoRoot).replace(/\/+$/, "") || "/";
  if (absoluteRoot === "/") return absolute.slice(1);
  const prefix = `${absoluteRoot}/`;
  return absolute.startsWith(prefix) ? absolute.slice(prefix.length) : null;
}

export function normalizeCoverageSourcePath(
  path: string,
  context: CoverageSourcePathContext,
): string {
  const normalizedPath = path.replace(/\\/g, "/");
  const sourceInRepo = pathUnderRoot(normalizedPath, context.repoRoot, context.repoRoot) !== null;
  if (!sourceInRepo) {
    for (const tempRoot of context.tempRoots) {
      const relativeToTemp = pathUnderRoot(normalizedPath, tempRoot, context.repoRoot);
      if (relativeToTemp === null) continue;
      const packagedHarness = relativeToTemp.match(
        /^amadeus-pkg-(kiro-ide|claude|codex|kiro)-[A-Za-z0-9]+\/(\.claude|\.codex|\.kiro)\/(.+)$/,
      );
      if (!packagedHarness) continue;
      const [, harness, harnessDir, source] = packagedHarness;
      if (PACKAGE_HARNESS_DIRS[harness as keyof typeof PACKAGE_HARNESS_DIRS] !== harnessDir) continue;
      return `packages/framework/core/${source}`;
    }
  }
  const generatedHarnessPrefixes = [
    ["dist/claude/.claude/", "packages/framework/core/"],
    ["dist/codex/.codex/", "packages/framework/core/"],
    ["dist/kiro/.kiro/", "packages/framework/core/"],
    ["dist/kiro-ide/.kiro/", "packages/framework/core/"],
    [".claude/", "packages/framework/core/"],
    [".codex/", "packages/framework/core/"],
  ] as const;
  for (const [from, to] of generatedHarnessPrefixes) {
    if (normalizedPath.startsWith(from)) {
      return `${to}${normalizedPath.slice(from.length)}`;
    }
  }
  return normalizedPath;
}
