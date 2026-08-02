import { realpathSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Lang as AstLang, NapiConfig, SgNode, SgRoot } from "@ast-grep/napi";
import ts from "typescript";
import {
  findingFingerprint,
  type Finding,
  InfraFailure,
  normalizeSnippet,
  type RuleId,
} from "./model.ts";

const EXACT_AST_GREP_VERSION = "0.45.0";
const INTENTIONAL_DROP = /^\s*\/\/ intentional-drop:\s*(\S(?:.*\S)?)\s*$/;
const NSD003_FUNCTIONS = new Set(["persistBlocked", "setCheckbox", "setStageSuffix", "resyncOneIntent"]);

type AstGrepModule = typeof import("@ast-grep/napi");
type Candidate = {
  readonly kind: string;
  readonly text: string;
  readonly line: number;
  readonly column: number;
};

export type ParsedSource = {
  readonly file: string;
  readonly source: string;
  readonly candidates: readonly Candidate[];
};

export type SemanticScan = {
  readonly findings: Finding[];
  readonly exemptionEligible: ReadonlySet<string>;
};

const CANDIDATE_CONFIG: NapiConfig = {
  rule: {
    any: [
      { kind: "program" },
      { kind: "catch_clause" },
      { kind: "expression_statement" },
      { kind: "function_declaration" },
      { kind: "ERROR" },
    ],
  },
};

export function loadVerifiedAstGrep(repoRoot: string): AstGrepModule {
  if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) {
    throw new InfraFailure("TOOL_MISSING", "NAPI_RS_NATIVE_LIBRARY_PATH cannot override the verified ast-grep copy");
  }
  const localPackage = join(repoRoot, "node_modules", "@ast-grep", "napi", "package.json");
  let packageJson: { version?: unknown };
  try {
    packageJson = JSON.parse(readFileSync(localPackage, "utf8")) as { version?: unknown };
  } catch (error) {
    throw new InfraFailure("TOOL_MISSING", `local ast-grep package is unavailable: ${String(error)}`);
  }
  if (packageJson.version !== EXACT_AST_GREP_VERSION) {
    throw new InfraFailure(
      "TOOL_MISSING",
      `local ast-grep version must be ${EXACT_AST_GREP_VERSION}, got ${String(packageJson.version)}`,
    );
  }
  const require = createRequire(import.meta.url);
  let entry: string;
  try {
    entry = realpathSync(require.resolve("@ast-grep/napi"));
  } catch (error) {
    throw new InfraFailure("TOOL_MISSING", `local ast-grep entrypoint is unavailable: ${String(error)}`);
  }
  const trustedDir = `${realpathSync(dirname(localPackage))}/`;
  if (!entry.startsWith(trustedDir)) {
    throw new InfraFailure("TOOL_MISSING", `ast-grep resolved outside the verified local package: ${entry}`);
  }
  try {
    return require(entry) as AstGrepModule;
  } catch (error) {
    throw new InfraFailure("TOOL_MISSING", `local ast-grep native binding failed to load: ${String(error)}`);
  }
}

function languageFor(file: string, ast: AstGrepModule): AstLang {
  if (/\.(?:tsx|jsx)$/.test(file)) return ast.Lang.Tsx;
  if (/\.(?:js|mjs|cjs)$/.test(file)) return ast.Lang.JavaScript;
  return ast.Lang.TypeScript;
}

export function parseSource(ast: AstGrepModule, file: string, source: string): ParsedSource {
  let parsed: SgRoot;
  try {
    parsed = ast.parse(languageFor(file, ast), source);
  } catch (error) {
    throw new InfraFailure("SCAN_PARTIAL", `${file}: ast-grep parse failed: ${String(error)}`);
  }
  let nodes: SgNode[];
  try {
    nodes = parsed.root().findAll(CANDIDATE_CONFIG);
  } catch (error) {
    throw new InfraFailure("RULE_INVALID", `candidate rule failed: ${String(error)}`);
  }
  const programCount = nodes.filter((node) => node.kind() === "program").length;
  if (programCount !== 1) {
    throw new InfraFailure("SCAN_PARTIAL", `${file}: expected one program coverage sentinel, got ${programCount}`);
  }
  const errorNodes = nodes.filter((node) => node.kind() === "ERROR");
  if (errorNodes.length > 0) {
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const syntaxErrors = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (syntaxErrors.length > 0 || errorNodes.some((node) => /\b(?:catch|applyTransition)\b/.test(node.text()))) {
      throw new InfraFailure("SCAN_PARTIAL", `${file}: source contains an unparseable candidate AST region`);
    }
  }
  const candidates = nodes
    .filter((node) => node.kind() !== "program" && node.kind() !== "ERROR")
    .map((node) => ({
      kind: String(node.kind()),
      text: node.text(),
      line: node.range().start.line + 1,
      column: node.range().start.column + 1,
    }));
  return { file, source, candidates };
}

function createSemanticProgram(parsedSources: readonly ParsedSource[]): ts.Program {
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noLib: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options, true);
  const sources = new Map(parsedSources.map((parsed) => [parsed.file, ts.createSourceFile(
    parsed.file,
    parsed.source,
    ts.ScriptTarget.Latest,
    true,
    /\.(?:js|jsx|mjs|cjs)$/.test(parsed.file) ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  )]));
  host.fileExists = (fileName) => sources.has(fileName);
  host.readFile = (fileName) => sources.get(fileName)?.text;
  host.getSourceFile = (fileName) => sources.get(fileName);
  return ts.createProgram([...sources.keys()], options, host);
}

function locationKey(sourceFile: ts.SourceFile, node: ts.Node, kind: string): string {
  const start = kind === "function_declaration"
    ? node.getChildren(sourceFile).find((child) => child.kind === ts.SyntaxKind.FunctionKeyword)?.getStart(sourceFile)
      ?? node.getStart(sourceFile)
    : node.getStart(sourceFile);
  const position = sourceFile.getLineAndCharacterOfPosition(start);
  return `${kind}\0${position.line + 1}\0${position.character + 1}`;
}

function assertStructuralCoverage(parsed: ParsedSource, sourceFile: ts.SourceFile): void {
  const structural = new Map<string, number>();
  for (const candidate of parsed.candidates) {
    const key = `${candidate.kind}\0${candidate.line}\0${candidate.column}`;
    structural.set(key, (structural.get(key) ?? 0) + 1);
  }
  const semantic: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node)) semantic.push(locationKey(sourceFile, node, "catch_clause"));
    if (ts.isExpressionStatement(node)) semantic.push(locationKey(sourceFile, node, "expression_statement"));
    if (ts.isFunctionDeclaration(node) && node.body && node.name && NSD003_FUNCTIONS.has(node.name.text)) {
      semantic.push(locationKey(sourceFile, node, "function_declaration"));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const key of semantic) {
    if (structural.get(key) !== 1) {
      throw new InfraFailure("RULE_INVALID", `${parsed.file}: structural/semantic candidate coverage mismatch at ${key}`);
    }
  }
}

function directCallName(expression: ts.Expression): string | null {
  const call = ts.isAwaitExpression(expression) ? expression.expression : expression;
  if (!ts.isCallExpression(call)) return null;
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
}

function callReturnsNever(expression: ts.Expression, checker: ts.TypeChecker): boolean {
  const target = ts.isAwaitExpression(expression) ? expression.expression : expression;
  if (!ts.isCallExpression(target)) return false;
  if (target.expression.getText() === "process.exit") return true;
  const signature = checker.getResolvedSignature(target);
  if (!signature) return false;
  return Boolean(checker.getReturnTypeOfSignature(signature).flags & ts.TypeFlags.Never);
}

function statementTerminates(statement: ts.Statement, checker: ts.TypeChecker): boolean {
  if (ts.isThrowStatement(statement)) return true;
  if (ts.isBreakStatement(statement) || ts.isContinueStatement(statement)) return true;
  if (ts.isReturnStatement(statement)) return true;
  if (ts.isBlock(statement)) return blockTerminates(statement, checker);
  if (ts.isExpressionStatement(statement)) return callReturnsNever(statement.expression, checker);
  if (ts.isIfStatement(statement)) {
    return statement.elseStatement !== undefined
      && statementTerminates(statement.thenStatement, checker)
      && statementTerminates(statement.elseStatement, checker);
  }
  if (ts.isTryStatement(statement)) return tryTerminates(statement, checker);
  return false;
}

function tryTerminates(statement: ts.TryStatement, checker: ts.TypeChecker): boolean {
  if (statement.finallyBlock && blockTerminates(statement.finallyBlock, checker)) return true;
  return blockTerminates(statement.tryBlock, checker)
    && Boolean(statement.catchClause && blockTerminates(statement.catchClause.block, checker));
}

function blockTerminates(block: ts.Block, checker: ts.TypeChecker): boolean {
  return block.statements.some((statement) => statementTerminates(statement, checker));
}

function stateResultContract(call: ts.CallExpression, checker: ts.TypeChecker): boolean {
  const signature = checker.getResolvedSignature(call);
  if (!signature) {
    throw new InfraFailure("RULE_INVALID", "applyTransition does not resolve to a single callable contract");
  }
  const returnType = checker.getReturnTypeOfSignature(signature);
  if (returnType.aliasSymbol?.getName() === "StateResult") return true;
  const members = returnType.isUnion() ? returnType.types : [returnType];
  const kinds = new Set<string>();
  for (const member of members) {
    const kind = member.getProperty("kind");
    const declaration = kind?.valueDeclaration ?? kind?.declarations?.[0];
    if (!kind || !declaration) continue;
    const kindType = checker.getTypeOfSymbolAtLocation(kind, declaration);
    if (kindType.isStringLiteral()) kinds.add(kindType.value);
  }
  return kinds.has("ok") && [...kinds].some((kind) => kind !== "ok");
}

function isDiscardedApplyTransition(node: ts.ExpressionStatement, checker: ts.TypeChecker): boolean {
  const expression = ts.isAwaitExpression(node.expression) ? node.expression.expression : node.expression;
  if (!ts.isCallExpression(expression) || directCallName(expression) !== "applyTransition") return false;
  if (!stateResultContract(expression, checker)) {
    throw new InfraFailure("RULE_INVALID", "applyTransition return type is not the approved StateResult contract");
  }
  return true;
}

function childCallCount(node: ts.Node): number {
  let count = 0;
  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child)) count += 1;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return count;
}

function intentionalDropReason(sourceFile: ts.SourceFile, node: ts.ExpressionStatement): string | null {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const lines = sourceFile.text.split(/\r?\n/);
  let cursor = line - 1;
  while (cursor >= 0 && lines[cursor]?.trim() === "") cursor -= 1;
  const marker = cursor >= 0 ? lines[cursor]?.match(INTENTIONAL_DROP) : null;
  if (!marker) return null;
  let previous = cursor - 1;
  while (previous >= 0 && lines[previous]?.trim() === "") previous -= 1;
  if (previous >= 0 && INTENTIONAL_DROP.test(lines[previous] ?? "")) return null;
  return childCallCount(node) === 1 ? (marker[1] as string) : null;
}

function topLevelIndex(node: ts.Node, body: ts.Block): number {
  let current = node;
  while (current.parent !== body && current.parent) current = current.parent;
  return body.statements.indexOf(current as ts.Statement);
}

function returnsIn(body: ts.Block, predicate: (expression: ts.Expression | undefined) => boolean): ts.ReturnStatement[] {
  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && predicate(node.expression)) returns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);
  return returns;
}

function topLevelStatementIndex(body: ts.Block, predicate: (statement: ts.Statement) => boolean, after = -1): number {
  return body.statements.findIndex((statement, index) => index > after && predicate(statement));
}

function statementTextIncludes(statement: ts.Statement, patterns: readonly string[]): boolean {
  const text = statement.getText();
  return patterns.every((pattern) => text.includes(pattern));
}

function guardedFailure(statement: ts.Statement, patterns: readonly string[]): boolean {
  return ts.isIfStatement(statement)
    && !statement.elseStatement
    && statementTextIncludes(statement, patterns)
    && (ts.isReturnStatement(statement.thenStatement)
      ? !returnsSuccess(statement.thenStatement.expression)
      : ts.isBlock(statement.thenStatement)
        && statement.thenStatement.statements.some((nested) =>
          ts.isThrowStatement(nested) || (ts.isReturnStatement(nested) && !returnsSuccess(nested.expression))));
}

function returnsSuccess(expression: ts.Expression | undefined, expected?: string): boolean {
  if (!expression) return false;
  const text = expression.getText();
  if (expected) return text.includes(expected);
  if (ts.isObjectLiteralExpression(expression)) {
    const kind = expression.properties.find((property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText() === "kind");
    return Boolean(kind && ts.isStringLiteralLike(kind.initializer) && ["ok", "success"].includes(kind.initializer.text));
  }
  if (ts.isCallExpression(expression)) {
    if (/(?:failed|failure|not-found|section-unrecognized|unreadable)/.test(text)) return false;
    return /(?:resynced|safety-blocked|success)/.test(text);
  }
  return true;
}

function allSuccessAfter(body: ts.Block, success: ts.ReturnStatement[], requiredIndex: number): boolean {
  return success.length > 0 && success.every((statement) => topLevelIndex(statement, body) > requiredIndex);
}

function persistBlockedIsSafe(body: ts.Block): boolean {
  const write = topLevelStatementIndex(body, (statement) =>
    ts.isVariableStatement(statement) && statementTextIncludes(statement, ["applyTransition("]));
  const guard = topLevelStatementIndex(body, (statement) => guardedFailure(statement, [".kind", '"ok"']), write);
  const success = returnsIn(body, (expression) => returnsSuccess(expression, "safety-blocked"));
  return write >= 0 && guard > write && allSuccessAfter(body, success, guard);
}

function textMutationIsSafe(body: ts.Block): boolean {
  const found = topLevelStatementIndex(body, (statement) =>
    guardedFailure(statement, ["content", "return"])
    && /(?:includes|match|test|exec)\s*\(/.test(statement.getText()));
  const mutation = topLevelStatementIndex(body, (statement) =>
    ts.isVariableStatement(statement) && /\.replace\s*\(/.test(statement.getText()), found);
  const postcondition = topLevelStatementIndex(body, (statement) =>
    guardedFailure(statement, ["return"])
    && /(?:includes|match|test|exec|parseCheckboxes)\s*\(/.test(statement.getText()), mutation);
  const success = returnsIn(body, (expression) => returnsSuccess(expression));
  return found >= 0 && mutation > found && postcondition > mutation && allSuccessAfter(body, success, postcondition);
}

function composeResyncIsSafe(body: ts.Block): boolean {
  const mutation = topLevelStatementIndex(body, (statement) => statementTextIncludes(statement, ["replaceStageProgressSection("]));
  const postcondition = topLevelStatementIndex(body, (statement) =>
    guardedFailure(statement, ["section-unrecognized"])
    && /(?:stageProgressSectionOf|rowSlugsAfter|inserted\.some)/.test(statement.getText()), mutation);
  const write = topLevelStatementIndex(body, (statement) => statementTextIncludes(statement, ["writeStateFile("]), postcondition);
  const success = returnsIn(body, (expression) => returnsSuccess(expression, "resynced"));
  return mutation >= 0 && postcondition > mutation && write > postcondition && allSuccessAfter(body, success, write);
}

function nsd003Safe(name: string, body: ts.Block): boolean {
  if (name === "persistBlocked") return persistBlockedIsSafe(body);
  if (name === "resyncOneIntent") return composeResyncIsSafe(body);
  return textMutationIsSafe(body);
}

type SourceFindingCandidate = {
  readonly parsed: ParsedSource;
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly ruleId: RuleId;
  readonly symbol?: string;
  readonly exemptionReason?: string;
};

function semanticCandidates(
  parsed: ParsedSource,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): SourceFindingCandidate[] {
  const findings: SourceFindingCandidate[] = [];
  const visit = (node: ts.Node): void => {
    const candidate = semanticCandidateForNode(parsed, sourceFile, node, checker);
    if (candidate) findings.push(candidate);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings;
}

function catalogImplementationNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body && node.name && NSD003_FUNCTIONS.has(node.name.text)) {
      names.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

function semanticCandidateForNode(
  parsed: ParsedSource,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  checker: ts.TypeChecker,
): SourceFindingCandidate | null {
  if (ts.isCatchClause(node) && !blockTerminates(node.block, checker)) {
    return { parsed, sourceFile, node, ruleId: "NSD001" };
  }
  if (ts.isExpressionStatement(node) && isDiscardedApplyTransition(node, checker)) {
    return {
      parsed,
      sourceFile,
      node,
      ruleId: "NSD002",
      symbol: "applyTransition",
      exemptionReason: intentionalDropReason(sourceFile, node) ?? undefined,
    };
  }
  if (!ts.isFunctionDeclaration(node) || !node.name || !NSD003_FUNCTIONS.has(node.name.text)) return null;
  if (!node.body) throw new InfraFailure("RULE_INVALID", `${node.name.text} has no analyzable implementation`);
  return nsd003Safe(node.name.text, node.body)
    ? null
    : { parsed, sourceFile, node, ruleId: "NSD003", symbol: node.name.text };
}

function messages(ruleId: RuleId, symbol?: string): string {
  if (ruleId === "NSD001") return "Catch block has a path that silently continues without an approved failure terminal";
  if (ruleId === "NSD002") return `StateResult from ${symbol ?? "applyTransition"} is discarded without inspection`;
  return `${symbol ?? "Mutation contract"} can report success without its required write and postcondition`;
}

function buildFinding(candidate: SourceFindingCandidate, ordinals: Map<string, number>): Finding {
  const { line, character } = candidate.sourceFile.getLineAndCharacterOfPosition(candidate.node.getStart(candidate.sourceFile));
  const snippet = normalizeSnippet(candidate.node.getText(candidate.sourceFile));
  const ordinalKey = `${candidate.parsed.file}\0${candidate.ruleId}\0${snippet}`;
  const ordinal = ordinals.get(ordinalKey) ?? 0;
  ordinals.set(ordinalKey, ordinal + 1);
  return {
    ruleId: candidate.ruleId,
    file: candidate.parsed.file,
    line: line + 1,
    column: character + 1,
    message: messages(candidate.ruleId, candidate.symbol),
    snippet,
    fingerprint: findingFingerprint(candidate.ruleId, candidate.parsed.file, snippet, ordinal),
  };
}

export function scanParsedSources(parsedSources: readonly ParsedSource[]): SemanticScan {
  const program = createSemanticProgram(parsedSources);
  const checker = program.getTypeChecker();
  const candidates: SourceFindingCandidate[] = [];
  const contractNames = new Map<string, number>();
  for (const parsed of parsedSources) {
    const sourceFile = program.getSourceFile(parsed.file);
    if (!sourceFile) throw new InfraFailure("RULE_INVALID", `${parsed.file}: TypeScript Program omitted the snapshot`);
    assertStructuralCoverage(parsed, sourceFile);
    for (const name of catalogImplementationNames(sourceFile)) {
      contractNames.set(name, (contractNames.get(name) ?? 0) + 1);
    }
    candidates.push(...semanticCandidates(parsed, sourceFile, checker));
  }
  if ([...contractNames.values()].some((count) => count > 1)) {
    throw new InfraFailure("RULE_INVALID", "multiple implementations resolve to one NSD003 catalog contract");
  }
  const ordinals = new Map<string, number>();
  const exemptionEligible = new Set<string>();
  const findings = candidates.map((candidate) => {
    const finding = buildFinding(candidate, ordinals);
    if (candidate.ruleId === "NSD002" && candidate.exemptionReason) exemptionEligible.add(finding.fingerprint);
    return finding;
  }).sort((left, right) =>
    left.file.localeCompare(right.file)
    || left.line - right.line
    || left.column - right.column
    || left.ruleId.localeCompare(right.ruleId));
  return { findings, exemptionEligible };
}

export function findingsFromParsed(parsedSources: readonly ParsedSource[]): Finding[] {
  return scanParsedSources(parsedSources).findings;
}

export function scanSourceForTest(file: string, source: string, repoRoot: string): Finding[] {
  const ast = loadVerifiedAstGrep(repoRoot);
  return findingsFromParsed([parseSource(ast, file, source)]);
}

export function assertSafeRelativePath(path: string): void {
  if (isAbsolute(path) || relative(resolve("."), resolve(path)).startsWith("..")) {
    throw new InfraFailure("BASELINE_INVALID", `path escapes the repository: ${path}`);
  }
}
