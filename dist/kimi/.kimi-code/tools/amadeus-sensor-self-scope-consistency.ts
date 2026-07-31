// Self-development-only sensor for Amadeus scope registry parity.
//
// The distributed tool stays dormant in ordinary projects. It activates only
// when at least one `self-*` scope is present, then requires the five Amadeus
// dogfood harness surfaces to expose the same four canonical self scopes in
// both `scopes/amadeus-self-*.md` and `tools/data/scope-grid.json`.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const SELF_HARNESSES = [".claude", ".codex", ".cursor", ".opencode", ".kimi-code"] as const;
export const EXPECTED_SELF_SCOPES = [
  "self-document",
  "self-feature",
  "self-fix",
  "self-refactor",
] as const;
const LEGACY_SELF_SCOPES = new Set([
  "amadeus-bugfix",
  "amadeus-document",
  "amadeus-feature",
  "amadeus-fix",
  "amadeus-refactor",
]);

interface Finding {
  readonly harness: string;
  readonly surface: "scope-file" | "scope-grid";
  readonly reason: "missing" | "unexpected" | "name-mismatch" | "unreadable";
  readonly scope?: string;
  readonly path: string;
}

export interface SelfScopeConsistencyResult {
  readonly pass: boolean;
  readonly findings_count: number;
  readonly findings: readonly Finding[];
  readonly skipped: "no-self-scopes" | null;
}

interface HarnessSnapshot {
  readonly harness: string;
  readonly fileScopes: ReadonlySet<string>;
  readonly gridScopes: ReadonlySet<string>;
  readonly findings: readonly Finding[];
}

interface SurfaceSnapshot {
  readonly scopes: ReadonlySet<string>;
  readonly findings: readonly Finding[];
}

function frontmatterName(body: string): string | null {
  const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return null;
  const name = frontmatter[1].match(/^name:\s*([^\s#]+)\s*$/m);
  return name?.[1] ?? null;
}

function inspectScopeFile(
  harness: string,
  scopesDir: string,
  filename: string,
): { scope?: string; finding?: Finding } {
  const legacyMatch = filename.match(/^amadeus-(amadeus-[a-z][a-z0-9-]*)\.md$/);
  if (legacyMatch && LEGACY_SELF_SCOPES.has(legacyMatch[1])) {
    return {
      finding: {
        harness,
        surface: "scope-file",
        reason: "unexpected",
        scope: legacyMatch[1],
        path: join(scopesDir, filename),
      },
    };
  }
  const match = filename.match(/^amadeus-(self-[a-z][a-z0-9-]*)\.md$/);
  if (!match) return {};
  const scope = match[1];
  const path = join(scopesDir, filename);
  try {
    const declared = frontmatterName(readFileSync(path, "utf-8"));
    if (declared === scope) return { scope };
    return {
      scope,
      finding: { harness, surface: "scope-file", reason: "name-mismatch", scope, path },
    };
  } catch {
    return {
      scope,
      finding: { harness, surface: "scope-file", reason: "unreadable", scope, path },
    };
  }
}

function readScopeFiles(harness: string, scopesDir: string): SurfaceSnapshot {
  const findings: Finding[] = [];
  const scopes = new Set<string>();

  if (existsSync(scopesDir)) {
    for (const filename of readdirSync(scopesDir).sort()) {
      const inspected = inspectScopeFile(harness, scopesDir, filename);
      if (inspected.scope) scopes.add(inspected.scope);
      if (inspected.finding) findings.push(inspected.finding);
    }
  }
  return { scopes, findings };
}

function readGridScopes(harness: string, gridPath: string): SurfaceSnapshot {
  const findings: Finding[] = [];
  const scopes = new Set<string>();
  if (!existsSync(gridPath)) return { scopes, findings };
  try {
    const grid = JSON.parse(readFileSync(gridPath, "utf-8")) as Record<string, unknown>;
    for (const scope of Object.keys(grid)) {
      if (scope.startsWith("self-")) scopes.add(scope);
      if (LEGACY_SELF_SCOPES.has(scope)) {
        findings.push({
          harness,
          surface: "scope-grid",
          reason: "unexpected",
          scope,
          path: gridPath,
        });
      }
    }
  } catch {
    findings.push({
      harness,
      surface: "scope-grid",
      reason: "unreadable",
      path: gridPath,
    });
  }
  return { scopes, findings };
}

function readHarnessSnapshot(projectRoot: string, harness: string): HarnessSnapshot {
  const files = readScopeFiles(harness, join(projectRoot, harness, "scopes"));
  const grid = readGridScopes(
    harness,
    join(projectRoot, harness, "tools", "data", "scope-grid.json"),
  );
  return {
    harness,
    fileScopes: files.scopes,
    gridScopes: grid.scopes,
    findings: [...files.findings, ...grid.findings],
  };
}

function compareExpected(
  snapshot: HarnessSnapshot,
  surface: "scope-file" | "scope-grid",
  actual: ReadonlySet<string>,
  path: string,
): Finding[] {
  const findings: Finding[] = [];
  const expected = new Set<string>(EXPECTED_SELF_SCOPES);
  for (const scope of EXPECTED_SELF_SCOPES) {
    if (!actual.has(scope)) {
      findings.push({ harness: snapshot.harness, surface, reason: "missing", scope, path });
    }
  }
  for (const scope of [...actual].sort()) {
    if (!expected.has(scope)) {
      findings.push({ harness: snapshot.harness, surface, reason: "unexpected", scope, path });
    }
  }
  return findings;
}

export function evaluateSelfScopeConsistency(
  projectRoot: string,
): SelfScopeConsistencyResult {
  const snapshots = SELF_HARNESSES.map((harness) =>
    readHarnessSnapshot(projectRoot, harness)
  );
  const active = snapshots.some(
    (snapshot) =>
      snapshot.fileScopes.size > 0 ||
      snapshot.gridScopes.size > 0 ||
      snapshot.findings.some((finding) => finding.scope !== undefined),
  );
  if (!active) {
    return { pass: true, findings_count: 0, findings: [], skipped: "no-self-scopes" };
  }

  const findings = snapshots.flatMap((snapshot) => [
    ...snapshot.findings,
    ...compareExpected(
      snapshot,
      "scope-file",
      snapshot.fileScopes,
      join(projectRoot, snapshot.harness, "scopes"),
    ),
    ...compareExpected(
      snapshot,
      "scope-grid",
      snapshot.gridScopes,
      join(projectRoot, snapshot.harness, "tools", "data", "scope-grid.json"),
    ),
  ]);
  return {
    pass: findings.length === 0,
    findings_count: findings.length,
    findings,
    skipped: null,
  };
}

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function main(argv: string[] = process.argv.slice(2)): void {
  if (!flagValue(argv, "--stage")) {
    process.stderr.write("amadeus-sensor-self-scope-consistency: --stage is required\n");
    process.exit(1);
  }
  if (!flagValue(argv, "--output-path")) {
    process.stderr.write("amadeus-sensor-self-scope-consistency: --output-path is required\n");
    process.exit(1);
  }
  const projectRoot = process.env.AMADEUS_PROJECT_DIR ?? process.cwd();
  process.stdout.write(`${JSON.stringify(evaluateSelfScopeConsistency(projectRoot))}\n`);
}

if (import.meta.main) main();
