// Self-development-only sensor for Amadeus scope registry parity.
//
// The distributed tool stays dormant in ordinary projects. It activates only
// when at least one `self-*` scope is present, then requires the five Amadeus
// dogfood harness surfaces to expose the same four canonical self scopes in
// both `scopes/amadeus-self-*.md` and `tools/data/scope-grid.json`.
//
// Matching identities are necessary but not sufficient: the faces are copies
// of one another, so the sensor also compares their content — scope prose byte
// for byte, and every stage cell the faces share. Names-only checking is what
// let the 2026-07-28 self-feature lightening sit on .claude alone (#2033).

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
  readonly reason:
    | "missing"
    | "unexpected"
    | "name-mismatch"
    | "unreadable"
    | "cell-mismatch"
    | "body-mismatch";
  readonly scope?: string;
  // Set on cell-mismatch only: the stage key whose cell diverged, with the
  // canonical face's value and this face's value.
  readonly stage?: string;
  readonly expected?: string;
  readonly actual?: string;
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
  // Retained content, keyed by scope: file bodies and scope-grid stage cells.
  // Name sets alone cannot catch a face whose cell values or prose drifted.
  readonly bodies: ReadonlyMap<string, string>;
  readonly cells: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly findings: readonly Finding[];
}

interface SurfaceSnapshot<T> {
  readonly scopes: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, T>;
  readonly findings: readonly Finding[];
}

function scopesDirOf(projectRoot: string, harness: string): string {
  return join(projectRoot, harness, "scopes");
}

function gridPathOf(projectRoot: string, harness: string): string {
  return join(projectRoot, harness, "tools", "data", "scope-grid.json");
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
): { scope?: string; body?: string; finding?: Finding } {
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
    const body = readFileSync(path, "utf-8");
    const declared = frontmatterName(body);
    if (declared === scope) return { scope, body };
    return {
      scope,
      body,
      finding: { harness, surface: "scope-file", reason: "name-mismatch", scope, path },
    };
  } catch {
    return {
      scope,
      finding: { harness, surface: "scope-file", reason: "unreadable", scope, path },
    };
  }
}

function readScopeFiles(harness: string, scopesDir: string): SurfaceSnapshot<string> {
  const findings: Finding[] = [];
  const scopes = new Set<string>();
  const values = new Map<string, string>();

  if (existsSync(scopesDir)) {
    for (const filename of readdirSync(scopesDir).sort()) {
      const inspected = inspectScopeFile(harness, scopesDir, filename);
      if (inspected.scope) {
        scopes.add(inspected.scope);
        if (inspected.body !== undefined) values.set(inspected.scope, inspected.body);
      }
      if (inspected.finding) findings.push(inspected.finding);
    }
  }
  return { scopes, values, findings };
}

function stageCells(row: unknown): ReadonlyMap<string, string> {
  const cells = new Map<string, string>();
  const stages = (row as { stages?: unknown } | null)?.stages;
  if (typeof stages !== "object" || stages === null) return cells;
  for (const [stage, cell] of Object.entries(stages as Record<string, unknown>)) {
    if (typeof cell === "string") cells.set(stage, cell);
  }
  return cells;
}

function readGridScopes(
  harness: string,
  gridPath: string,
): SurfaceSnapshot<ReadonlyMap<string, string>> {
  const findings: Finding[] = [];
  const scopes = new Set<string>();
  const values = new Map<string, ReadonlyMap<string, string>>();
  if (!existsSync(gridPath)) return { scopes, values, findings };
  try {
    const grid = JSON.parse(readFileSync(gridPath, "utf-8")) as Record<string, unknown>;
    for (const scope of Object.keys(grid)) {
      if (scope.startsWith("self-")) {
        scopes.add(scope);
        values.set(scope, stageCells(grid[scope]));
      }
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
  return { scopes, values, findings };
}

function readHarnessSnapshot(projectRoot: string, harness: string): HarnessSnapshot {
  const files = readScopeFiles(harness, scopesDirOf(projectRoot, harness));
  const grid = readGridScopes(harness, gridPathOf(projectRoot, harness));
  return {
    harness,
    fileScopes: files.scopes,
    gridScopes: grid.scopes,
    bodies: files.values,
    cells: grid.values,
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

// Cells are compared over the intersection of stage keys all faces carry.
// Keys only some faces hold are exempt by construction: plugin composition is
// per-face (`self-feature.formal-model-check` exists on .claude alone by
// design), so ranging over the union would report that intentional asymmetry
// as drift on the four faces that legitimately lack the key.
function compareCells(
  projectRoot: string,
  snapshots: readonly HarnessSnapshot[],
  scope: string,
): Finding[] {
  // Compare only the faces that carry the scope row: a face missing the row
  // is already reported as `missing`, and letting it participate here would
  // blank the shared-key intersection and mask real divergence between the
  // remaining faces (CodeRabbit finding on #2041).
  const present = snapshots.filter((face) => face.cells.get(scope) !== undefined);
  const [reference, ...rest] = present;
  const referenceCells = reference?.cells.get(scope);
  if (!referenceCells || rest.length === 0) return [];
  const shared = [...referenceCells.keys()]
    .filter((stage) => rest.every((face) => face.cells.get(scope)?.has(stage) === true))
    .sort();
  const findings: Finding[] = [];
  for (const face of rest) {
    for (const stage of shared) {
      const expected = referenceCells.get(stage);
      const actual = face.cells.get(scope)?.get(stage);
      if (expected === undefined || actual === undefined || expected === actual) continue;
      findings.push({
        harness: face.harness,
        surface: "scope-grid",
        reason: "cell-mismatch",
        scope,
        stage,
        expected,
        actual,
        path: gridPathOf(projectRoot, face.harness),
      });
    }
  }
  return findings;
}

function compareBodies(
  projectRoot: string,
  snapshots: readonly HarnessSnapshot[],
  scope: string,
): Finding[] {
  // Same present-face discipline as compareCells: a face without the scope
  // file is a `missing` finding, never a comparison blank.
  const present = snapshots.filter((face) => face.bodies.get(scope) !== undefined);
  const [reference, ...rest] = present;
  const referenceBody = reference?.bodies.get(scope);
  if (referenceBody === undefined || rest.length === 0) return [];
  const findings: Finding[] = [];
  for (const face of rest) {
    const body = face.bodies.get(scope);
    if (body === undefined || body === referenceBody) continue;
    findings.push({
      harness: face.harness,
      surface: "scope-file",
      reason: "body-mismatch",
      scope,
      path: join(scopesDirOf(projectRoot, face.harness), `amadeus-${scope}.md`),
    });
  }
  return findings;
}

// Every face is a copy of the same self scope, so agreement BETWEEN faces is
// the invariant — no table of expected cell values is declared anywhere. A
// second source of truth for cells would itself drift from the grids it
// polices, and would need editing for every legitimate scope change.
//
// The first face CARRYING a scope is read as its reference (normally
// .claude, the hand-edited face); the others are promoted copies of it. That
// choice only decides which side of a divergence gets reported, never
// whether one is reported.
function compareAcrossFaces(
  projectRoot: string,
  snapshots: readonly HarnessSnapshot[],
): Finding[] {
  return EXPECTED_SELF_SCOPES.flatMap((scope) => [
    ...compareCells(projectRoot, snapshots, scope),
    ...compareBodies(projectRoot, snapshots, scope),
  ]);
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

  const findings = [
    ...snapshots.flatMap((snapshot) => [
      ...snapshot.findings,
      ...compareExpected(
        snapshot,
        "scope-file",
        snapshot.fileScopes,
        scopesDirOf(projectRoot, snapshot.harness),
      ),
      ...compareExpected(
        snapshot,
        "scope-grid",
        snapshot.gridScopes,
        gridPathOf(projectRoot, snapshot.harness),
      ),
    ]),
    ...compareAcrossFaces(projectRoot, snapshots),
  ];
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
