import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

export type TimingSinkKind =
  | "final-timeout-rescale"
  | "test-time-rescale"
  | "sleep"
  | "timer"
  | "process-timeout"
  | "timeout-ms"
  | "timing-default"
  | "timing-constant"
  | "deadline"
  | "test-timeout";

export interface TimingSinkFinding {
  path: string;
  sink: TimingSinkKind;
  line: number;
  expression: string;
}

export interface TimingAllowlistEntry {
  path: string;
  sink: TimingSinkKind;
  count: number;
  reason: string;
}

const NUMBER = String.raw`[1-9][0-9_]*`;
const PATTERNS: ReadonlyArray<readonly [TimingSinkKind, RegExp]> = [
  ["sleep", new RegExp(String.raw`\b(?:Bun\.)?sleep\(\s*${NUMBER}\s*\)`, "g")],
  ["timer", new RegExp(String.raw`\bset(?:Timeout|Interval)\s*\([^\n]*?,\s*${NUMBER}\s*\)`, "g")],
  ["process-timeout", new RegExp(String.raw`\btimeout\s*:\s*${NUMBER}\b`, "g")],
  ["timeout-ms", new RegExp(String.raw`\btimeoutMs\s*:\s*${NUMBER}\b`, "g")],
  [
    "timing-default",
    new RegExp(
      String.raw`\b(?:timeoutMs|waitMs|budgetMs|intervalMs|stableMs|pollMs)\s*=\s*${NUMBER}\b`,
      "g",
    ),
  ],
  [
    "timing-constant",
    new RegExp(
      String.raw`\b[A-Z][A-Z0-9_]*(?:TIMEOUT|DEADLINE|POLL|WAIT|SLEEP|SETTLE)[A-Z0-9_]*\s*=\s*${NUMBER}\b`,
      "g",
    ),
  ],
  ["deadline", new RegExp(String.raw`Date\.now\(\)\s*\+\s*${NUMBER}\b`, "g")],
];

const SCAN_ROOTS = [
  "tests/smoke",
  "tests/unit",
  "tests/integration",
  "tests/e2e",
  "tests/harness",
  "tests/lib",
] as const;

const PROHIBITED_ALLOWLIST_SINKS = new Set<TimingSinkKind>([
  "final-timeout-rescale",
  "test-time-rescale",
]);

function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (source.charCodeAt(i) === 10) line++;
  return line;
}

export function scanTimingSource(path: string, source: string): TimingSinkFinding[] {
  const findings: TimingSinkFinding[] = [];
  for (const [sink, pattern] of PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (
        sink === "timing-constant" &&
        (/\b[A-Z0-9_]*_BASE(?:_MS)?\s*=/.test(match[0]) || /\bMAX_[A-Z0-9_]*\s*=/.test(match[0]))
      ) {
        continue;
      }
      findings.push({
        path,
        sink,
        line: lineAt(source, match.index),
        expression: match[0],
      });
    }
  }

  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const finalBudgetNames = new Set<string>();
  const declarations: Array<{ name: string; initializer: ts.Expression }> = [];
  const collectDeclarations = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      declarations.push({ name: node.name.text, initializer: node.initializer });
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);
  const containsFinalBudget = (node: ts.Node): boolean => {
    if (
      (ts.isIdentifier(node) &&
        (node.text === "AMADEUS_TEST_TIMEOUT" || finalBudgetNames.has(node.text))) ||
      (ts.isStringLiteral(node) && node.text === "AMADEUS_TEST_TIMEOUT")
    ) {
      return true;
    }
    let found = false;
    ts.forEachChild(node, (child) => {
      if (!found && containsFinalBudget(child)) found = true;
    });
    return found;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const declaration of declarations) {
      if (
        !finalBudgetNames.has(declaration.name) &&
        containsFinalBudget(declaration.initializer)
      ) {
        finalBudgetNames.add(declaration.name);
        changed = true;
      }
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const isScaleTestTime =
        ts.isIdentifier(expression) && expression.text === "scaleTestTime";
      if (
        isScaleTestTime &&
        node.arguments[0] &&
        containsFinalBudget(node.arguments[0])
      ) {
        findings.push({
          path,
          sink: "final-timeout-rescale",
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          expression: node.getText(sourceFile),
        });
      }
      if (isScaleTestTime) {
        let containsNestedScale = false;
        const findNestedScale = (candidate: ts.Node): void => {
          if (
            ts.isCallExpression(candidate) &&
            ts.isIdentifier(candidate.expression) &&
            candidate.expression.text === "scaleTestTime"
          ) {
            containsNestedScale = true;
            return;
          }
          ts.forEachChild(candidate, findNestedScale);
        };
        for (const argument of node.arguments) findNestedScale(argument);
        if (containsNestedScale) {
          findings.push({
            path,
            sink: "test-time-rescale",
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            expression: node.getText(sourceFile),
          });
        }
      }
      const isTest =
        (ts.isIdentifier(expression) && (expression.text === "test" || expression.text === "it")) ||
        (ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          (expression.expression.text === "test" || expression.expression.text === "it"));
      const isSuiteDefault = ts.isIdentifier(expression) && expression.text === "setDefaultTimeout";
      const argument = isSuiteDefault ? node.arguments[0] : isTest ? node.arguments[2] : undefined;
      const isScaled =
        argument &&
        ts.isCallExpression(argument) &&
        ts.isIdentifier(argument.expression) &&
        argument.expression.text === "scaleTestTime";
      if (argument && !isScaled) {
        findings.push({
          path,
          sink: "test-timeout",
          line: sourceFile.getLineAndCharacterOfPosition(argument.getStart(sourceFile)).line + 1,
          expression: node.getText(sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings.sort((a, b) => a.line - b.line || a.sink.localeCompare(b.sink));
}

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) files.push(path);
  }
  return files;
}

export function scanTestTimingSinks(repoRoot: string): {
  findings: TimingSinkFinding[];
  paths: Set<string>;
} {
  const paths = new Set<string>();
  const findings: TimingSinkFinding[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    for (const absolute of sourceFiles(join(repoRoot, scanRoot))) {
      const path = relative(repoRoot, absolute).replaceAll("\\", "/");
      paths.add(path);
      findings.push(...scanTimingSource(path, readFileSync(absolute, "utf8")));
    }
  }
  return { findings, paths };
}

function allowlistKey(entry: Pick<TimingAllowlistEntry, "path" | "sink">): string {
  return `${entry.path}\0${entry.sink}`;
}

export function validateTimingAllowlist(
  allowlist: TimingAllowlistEntry[],
  knownPaths: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of allowlist) {
    const key = allowlistKey(entry);
    if (seen.has(key)) errors.push(`duplicate allowlist entry: ${entry.path} (${entry.sink})`);
    seen.add(key);
    if (PROHIBITED_ALLOWLIST_SINKS.has(entry.sink)) {
      errors.push(`allowlist cannot classify prohibited timing sink: ${entry.path} (${entry.sink})`);
    }
    if (!knownPaths.has(entry.path)) errors.push(`allowlist path does not exist in the scan: ${entry.path}`);
    if (entry.reason.trim() === "") errors.push(`allowlist reason is blank: ${entry.path} (${entry.sink})`);
    if (!Number.isSafeInteger(entry.count) || entry.count <= 0) {
      errors.push(`allowlist count must be a positive safe integer: ${entry.path} (${entry.sink})`);
    }
  }
  return errors;
}

export function evaluateTimingSinks(
  findings: TimingSinkFinding[],
  allowlist: TimingAllowlistEntry[],
): { ok: boolean; errors: string[] } {
  const measured = new Map<string, { count: number; first: TimingSinkFinding }>();
  for (const finding of findings) {
    const key = allowlistKey(finding);
    const current = measured.get(key);
    if (current) current.count++;
    else measured.set(key, { count: 1, first: finding });
  }

  const allowed = new Map(allowlist.map((entry) => [allowlistKey(entry), entry]));
  const errors: string[] = [];
  for (const [key, value] of measured) {
    const entry = allowed.get(key);
    if (PROHIBITED_ALLOWLIST_SINKS.has(value.first.sink)) {
      errors.push(
        `prohibited timing sink: ${value.first.path}:${value.first.line} (${value.first.sink}, count ${value.count})`,
      );
    } else if (!entry) {
      errors.push(
        `unclassified timing sink: ${value.first.path}:${value.first.line} (${value.first.sink}, count ${value.count})`,
      );
    } else if (entry.count !== value.count) {
      errors.push(
        `timing sink count drift: ${entry.path} (${entry.sink}) allowlist ${entry.count}, measured ${value.count}`,
      );
    }
  }
  for (const [key, entry] of allowed) {
    if (!measured.has(key)) errors.push(`stale allowlist entry: ${entry.path} (${entry.sink})`);
  }
  return { ok: errors.length === 0, errors };
}

export function loadTimingAllowlist(path: string): TimingAllowlistEntry[] {
  if (!existsSync(path)) throw new Error(`test timing allowlist not found: ${path}`);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("test timing allowlist must be a JSON array");
  return parsed as TimingAllowlistEntry[];
}
