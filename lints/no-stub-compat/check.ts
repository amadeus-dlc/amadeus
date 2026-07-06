#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

type FindingCategory =
  | "compat-symbol"
  | "compat-alias"
  | "compat-comment"
  | "stub-throw"
  | "stub-empty-todo"
  | "stub-always-pass";

type BannedMarkerFinding = {
  file: string;
  line: number;
  category: FindingCategory;
  match: string;
};

type AllowlistEntry = {
  glob: string;
  category: FindingCategory;
  reason: string;
  endCondition: string;
};

type BannedMarkerCheckResult = {
  ok: boolean;
  messages: string[];
  findings: BannedMarkerFinding[];
  violations: BannedMarkerFinding[];
  allowlist: AllowlistEntry[];
};

type AnalyzeOptions = {
  root?: string;
  include?: string[];
};

type CheckOptions = AnalyzeOptions & {
  docsPath?: string;
};

type FunctionLikeWithBlockBody =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

const defaultRoot = process.cwd();
const defaultInclude = [".agents/skills", "amadeus-contracts", "dev-scripts", "lints", "skills"];
const allowlistHeading = "## Lint 許可リスト（no-stub-compat）";

// Identifiers in this file intentionally avoid the words this rule bans
// (legacy / shim / compat / deprecated) so the rule does not flag itself (BR-8).
// Matching is TOKEN-boundary, not substring (human decision at the
// build-and-test gate): an identifier is split into camelCase / snake_case
// tokens and flagged only when a whole token equals a banned word. General
// English words that merely contain one (compatible, CompatibilityChecker)
// must not force allowlist declarations.
const bannedWords = new Set(["legacy", "shim", "compat", "deprecated"]);

function identifierTokens(name: string): string[] {
  return name
    .split(/[_$]+/)
    .flatMap((segment) => segment.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/))
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase());
}
const notImplementedPattern = /not\s*implemented/i;
const todoPattern = /TODO|FIXME/;
// Built via concatenation so this file's own raw text never contains the
// contiguous marker below, only its constructed value (BR-8).
const bannedCommentPhrase = "後方" + "互換";

export function analyzeBannedMarkers(options: AnalyzeOptions = {}): BannedMarkerFinding[] {
  const root = resolve(options.root ?? defaultRoot);
  const files = listTsFiles(root, options.include ?? defaultInclude);
  const findings: BannedMarkerFinding[] = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const relativeFile = normalizePath(relative(root, file));

    findings.push(...findBannedSymbols(sourceFile, relativeFile));
    findings.push(...findBannedAliases(sourceFile, relativeFile));
    findings.push(...findBannedComments(sourceFile, text, relativeFile));
    findings.push(...findStubThrows(sourceFile, relativeFile));
    findings.push(...findStubEmptyTodos(sourceFile, text, relativeFile));
    findings.push(...findAlwaysPassAssertions(sourceFile, relativeFile));
  }

  return findings.sort((left, right) => {
    if (left.file !== right.file) return left.file.localeCompare(right.file);
    if (left.line !== right.line) return left.line - right.line;
    return left.category.localeCompare(right.category);
  });
}

export function checkBannedMarkers(options: CheckOptions = {}): BannedMarkerCheckResult {
  const root = resolve(options.root ?? defaultRoot);
  const findings = analyzeBannedMarkers({ root, include: options.include });
  const docsPath = resolve(options.docsPath ?? join(root, "docs/backward-compatibility.md"));
  const docText = existsSync(docsPath) ? readFileSync(docsPath, "utf8") : "";
  const allowlist = parseAllowlist(docText);
  const violations = findings.filter((finding) => !isAllowlisted(finding, allowlist));
  const messages = violations.map((violation) => formatViolationMessage(violation));

  return {
    ok: violations.length === 0,
    messages,
    findings,
    violations,
    allowlist,
  };
}

function findBannedSymbols(sourceFile: ts.SourceFile, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];

  function visit(node: ts.Node): void {
    const declaredName = declaredBannedName(node);
    if (declaredName) {
      findings.push(toFinding(sourceFile, relativeFile, node, "compat-symbol", declaredName));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function declaredBannedName(node: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(node) && node.name) return matchBannedName(node.name.text);
  if (ts.isClassDeclaration(node) && node.name) return matchBannedName(node.name.text);
  if (ts.isInterfaceDeclaration(node)) return matchBannedName(node.name.text);
  if (ts.isTypeAliasDeclaration(node)) return matchBannedName(node.name.text);
  if (ts.isEnumDeclaration(node)) return matchBannedName(node.name.text);
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isDeclaredConstOrLet(node)) {
    return matchBannedName(node.name.text);
  }
  return undefined;
}

function matchBannedName(name: string): string | undefined {
  return identifierTokens(name).some((token) => bannedWords.has(token)) ? name : undefined;
}

function isDeclaredConstOrLet(node: ts.VariableDeclaration): boolean {
  const declarationList = node.parent;
  if (!ts.isVariableDeclarationList(declarationList)) return false;
  return (declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0;
}

function findBannedAliases(sourceFile: ts.SourceFile, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;

    for (const element of statement.exportClause.elements) {
      if (!element.propertyName || element.propertyName.text === element.name.text) continue;
      const match = `${element.propertyName.text} as ${element.name.text}`;
      findings.push(toFinding(sourceFile, relativeFile, element, "compat-alias", match));
    }
  }

  return findings;
}

function findBannedComments(sourceFile: ts.SourceFile, text: string, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];
  let searchIndex = 0;

  while (true) {
    const index = text.indexOf(bannedCommentPhrase, searchIndex);
    if (index === -1) break;
    const line = sourceFile.getLineAndCharacterOfPosition(index).line + 1;
    findings.push({ file: relativeFile, line, category: "compat-comment", match: bannedCommentPhrase });
    searchIndex = index + bannedCommentPhrase.length;
  }

  return findings;
}

function findStubThrows(sourceFile: ts.SourceFile, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];

  function visit(node: ts.Node): void {
    if (ts.isThrowStatement(node)) {
      const snippet = node.getText(sourceFile).trim();
      if (notImplementedPattern.test(snippet)) {
        findings.push(toFinding(sourceFile, relativeFile, node, "stub-throw", snippet.slice(0, 80)));
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function findStubEmptyTodos(sourceFile: ts.SourceFile, text: string, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];

  function visit(node: ts.Node): void {
    if (isFunctionLike(node) && node.body && ts.isBlock(node.body) && node.body.statements.length === 0) {
      if (hasNearbyTodo(sourceFile, text, node)) {
        findings.push(toFinding(sourceFile, relativeFile, node, "stub-empty-todo", functionLabel(node)));
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function hasNearbyTodo(sourceFile: ts.SourceFile, text: string, node: FunctionLikeWithBlockBody): boolean {
  const block = node.body as ts.Block;
  const bodyText = text.slice(block.getStart(sourceFile) + 1, block.getEnd() - 1);
  if (todoPattern.test(bodyText)) return true;

  const declLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const lines = text.split("\n");
  const aboveText = lines.slice(Math.max(0, declLine - 3), declLine).join("\n");
  return todoPattern.test(aboveText);
}

function findAlwaysPassAssertions(sourceFile: ts.SourceFile, relativeFile: string): BannedMarkerFinding[] {
  const findings: BannedMarkerFinding[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const match = alwaysPassMatch(node);
      if (match) findings.push(toFinding(sourceFile, relativeFile, node, "stub-always-pass", match));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function alwaysPassMatch(node: ts.CallExpression): string | undefined {
  if (ts.isIdentifier(node.expression) && node.expression.text === "assert") {
    if (node.arguments.length === 1 && isTrueLiteral(node.arguments[0])) return "assert(true)";
    return undefined;
  }

  if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toBe") {
    const receiver = node.expression.expression;
    if (
      ts.isCallExpression(receiver) &&
      ts.isIdentifier(receiver.expression) &&
      receiver.expression.text === "expect" &&
      isTrueLiteral(receiver.arguments[0]) &&
      isTrueLiteral(node.arguments[0])
    ) {
      return "expect(true).toBe(true)";
    }
  }

  return undefined;
}

function isTrueLiteral(node: ts.Expression | undefined): boolean {
  return node !== undefined && node.kind === ts.SyntaxKind.TrueKeyword;
}

function isFunctionLike(node: ts.Node): node is FunctionLikeWithBlockBody {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function functionLabel(node: FunctionLikeWithBlockBody): string {
  if (ts.isConstructorDeclaration(node)) return "constructor";
  const name = node.name;
  if (name && ts.isIdentifier(name)) return name.text;
  return "<anonymous>";
}

function toFinding(
  sourceFile: ts.SourceFile,
  relativeFile: string,
  node: ts.Node,
  category: FindingCategory,
  match: string,
): BannedMarkerFinding {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  return { file: relativeFile, line, category, match };
}

function parseAllowlist(docText: string): AllowlistEntry[] {
  const lines = docText.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === allowlistHeading);
  if (headingIndex === -1) return [];

  const entries: AllowlistEntry[] = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
    const entry = parseAllowlistRow(line);
    if (entry) entries.push(entry);
  }
  return entries;
}

function parseAllowlistRow(line: string): AllowlistEntry | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  if (cells.length !== 4) return undefined;

  const [glob, category, reason, endCondition] = cells;
  if (glob === "対象（glob）" || glob.startsWith("---")) return undefined;
  if (!isFindingCategory(category)) return undefined;
  if (reason.length === 0 || endCondition.length === 0) return undefined;

  return { glob, category, reason, endCondition };
}

function isFindingCategory(value: string): value is FindingCategory {
  return (
    value === "compat-symbol" ||
    value === "compat-alias" ||
    value === "compat-comment" ||
    value === "stub-throw" ||
    value === "stub-empty-todo" ||
    value === "stub-always-pass"
  );
}

function isAllowlisted(finding: BannedMarkerFinding, allowlist: AllowlistEntry[]): boolean {
  return allowlist.some(
    (entry) => entry.category === finding.category && new Bun.Glob(entry.glob).match(finding.file),
  );
}

function listTsFiles(root: string, include: string[]): string[] {
  return include
    .map((path) => resolve(root, path))
    .filter((path) => existsSync(path))
    .flatMap((path) => walkTsFiles(path))
    .sort();
}

function walkTsFiles(path: string): string[] {
  const stats = statSync(path);
  if (stats.isFile()) return path.endsWith(".ts") ? [path] : [];
  if (!stats.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry === "dist") continue;
    files.push(...walkTsFiles(join(path, entry)));
  }
  return files;
}

function normalizePath(path: string): string {
  return path.split("\\").join("/");
}

function formatFinding(finding: BannedMarkerFinding): string {
  return `${finding.file}:${finding.line} [${finding.category}] ${finding.match}`;
}

function formatViolationMessage(finding: BannedMarkerFinding): string {
  return [
    `no-stub-compat violation: ${formatFinding(finding)}`,
    `  declare in docs/backward-compatibility.md under "${allowlistHeading}":`,
    `  | ${finding.file} | ${finding.category} | <維持理由> | <終了条件> |`,
  ].join("\n");
}

function parseArgs(args: string[]): { mode: "check" | "report" } {
  let mode: "check" | "report" = "check";
  for (const arg of args) {
    if (arg === "--check") mode = "check";
    else if (arg === "--report") mode = "report";
    else throw new Error(`unknown argument: ${arg}`);
  }
  return { mode };
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = checkBannedMarkers(args);
    const reportRows = (args.mode === "report" ? result.findings : result.violations).slice(0, 30);
    for (const finding of reportRows) console.log(formatFinding(finding));

    if (args.mode === "report") {
      console.log(`no-stub-compat: report (${result.violations.length} violations)`);
      process.exit(0);
    }

    if (!result.ok) {
      for (const message of result.messages) console.error(message);
      process.exit(1);
    }

    console.log(`no-stub-compat: ok (${result.violations.length} violations)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
