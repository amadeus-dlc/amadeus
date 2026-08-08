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
// Each catalog contract is bound to the file that must declare it, so a rename of the
// implementation is a loud RULE_INVALID instead of a silently emptied rule. The binding is
// only enforced when that file is inside the scanned set: fixture and synthetic-repository
// scans legitimately contain none of these implementations.
export const NSD003_CATALOG = [
  { name: "persistBlocked", file: "packages/framework/core/tools/amadeus-mirror-executor.ts" },
  { name: "setCheckbox", file: "packages/framework/core/tools/amadeus-lib.ts" },
  { name: "setStageSuffix", file: "packages/framework/core/tools/amadeus-lib.ts" },
  { name: "resyncOneIntent", file: "packages/framework/core/tools/amadeus-lib.ts" },
] as const;
const NSD003_FUNCTIONS = new Set(NSD003_CATALOG.map((entry) => entry.name as string));

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

type AstGrepLoader = {
  readonly resolve: (specifier: string) => string;
  readonly load: (entry: string) => unknown;
};

export function loadVerifiedAstGrep(
  repoRoot: string,
  loader?: AstGrepLoader,
): AstGrepModule {
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
  const activeLoader = loader ?? { resolve: require.resolve, load: require };
  let entry: string;
  try {
    entry = realpathSync(activeLoader.resolve("@ast-grep/napi"));
  } catch (error) {
    throw new InfraFailure("TOOL_MISSING", `local ast-grep entrypoint is unavailable: ${String(error)}`);
  }
  const trustedDir = `${realpathSync(dirname(localPackage))}/`;
  if (!entry.startsWith(trustedDir)) {
    throw new InfraFailure("TOOL_MISSING", `ast-grep resolved outside the verified local package: ${entry}`);
  }
  try {
    return activeLoader.load(entry) as AstGrepModule;
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
    throw new InfraFailure("SCAN_PARTIAL", `${file}: source contains an unparseable candidate AST region`);
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
    if (isNsd003Function(node)) {
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

function discriminantKinds(returnType: ts.Type, checker: ts.TypeChecker): ReadonlySet<string> {
  const members = returnType.isUnion() ? returnType.types : [returnType];
  const kinds = new Set<string>();
  for (const member of members) {
    const kind = member.getProperty("kind");
    const declaration = kind?.valueDeclaration ?? kind?.declarations?.[0];
    if (!kind || !declaration) continue;
    const kindType = checker.getTypeOfSymbolAtLocation(kind, declaration);
    if (kindType.isStringLiteral()) kinds.add(kindType.value);
  }
  return kinds;
}

export function stateResultKinds(call: ts.CallExpression, checker: ts.TypeChecker): ReadonlySet<string> {
  const signature = checker.getResolvedSignature(call);
  if (!signature) {
    throw new InfraFailure("RULE_INVALID", "applyTransition does not resolve to a single callable contract");
  }
  return discriminantKinds(checker.getReturnTypeOfSignature(signature), checker);
}

function stateResultContract(call: ts.CallExpression, checker: ts.TypeChecker): boolean {
  const kinds = stateResultKinds(call, checker);
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

type PersistedTransition = {
  readonly binding: string;
  readonly statementIndex: number;
  readonly kinds: ReadonlySet<string>;
};

function persistedTransition(body: ts.Block, checker: ts.TypeChecker): PersistedTransition | null {
  const matches: Array<{ readonly binding: string; readonly call: ts.CallExpression; readonly statementIndex: number }> = [];
  for (const [statementIndex, statement] of body.statements.entries()) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const call = directCall(declaration.initializer);
      const binding = identifierName(declaration.name);
      if (call && binding && identifierName(call.expression) === "applyTransition") {
        matches.push({ binding, call, statementIndex });
      }
    }
  }
  if (matches.length !== 1) return null;
  const match = matches[0] as (typeof matches)[number];
  const kinds = stateResultKinds(match.call, checker);
  if (!kinds.has("ok") || ![...kinds].some((kind) => kind !== "ok")) {
    throw new InfraFailure("RULE_INVALID", "applyTransition return type is not the approved StateResult contract");
  }
  return {
    binding: match.binding,
    statementIndex: match.statementIndex,
    kinds,
  };
}

function exactKindComparison(
  expression: ts.Expression,
  binding: string,
): { readonly operator: ts.SyntaxKind; readonly value: string } | null {
  if (!ts.isBinaryExpression(expression)) return null;
  if (!ts.isPropertyAccessExpression(expression.left)) return null;
  if (identifierName(expression.left.expression) !== binding || expression.left.name.text !== "kind") return null;
  if (!ts.isStringLiteralLike(expression.right)) return null;
  return { operator: expression.operatorToken.kind, value: expression.right.text };
}

function failureReturn(statement: ts.Statement, binding: string): boolean {
  const returned = ts.isReturnStatement(statement)
    ? statement
    : ts.isBlock(statement) && statement.statements.length === 1 && ts.isReturnStatement(statement.statements[0])
      ? statement.statements[0]
      : null;
  if (!returned?.expression) return false;
  if (ts.isObjectLiteralExpression(returned.expression)) return returnKind(returned, "failed");
  const call = directCall(returned.expression);
  return Boolean(call
    && identifierName(call.expression) === "transitionFailure"
    && call.arguments.some((argument) => identifierName(argument) === binding));
}

function transitionFailureGuard(statement: ts.Statement, transition: PersistedTransition): boolean {
  if (!ts.isIfStatement(statement) || statement.elseStatement) return false;
  const comparison = exactKindComparison(statement.expression, transition.binding);
  if (!comparison || transition.kinds.size !== 2
    || !transition.kinds.has("ok") || !transition.kinds.has("failed")) return false;
  const selectsFailure = comparison.operator === ts.SyntaxKind.EqualsEqualsEqualsToken && comparison.value === "failed";
  const excludesSuccess = comparison.operator === ts.SyntaxKind.ExclamationEqualsEqualsToken && comparison.value === "ok";
  return (selectsFailure || excludesSuccess) && failureReturn(statement.thenStatement, transition.binding);
}

function safetyBlockedReturn(expression: ts.Expression | undefined): boolean {
  if (!expression || !ts.isObjectLiteralExpression(expression)) return false;
  return expression.properties.some((property) =>
    ts.isPropertyAssignment(property)
    && property.name.getText() === "kind"
    && ts.isStringLiteralLike(property.initializer)
    && property.initializer.text === "safety-blocked");
}

function persistBlockedIsSafe(body: ts.Block, checker: ts.TypeChecker): boolean {
  const transition = persistedTransition(body, checker);
  if (!transition) return false;
  const guard = topLevelStatementIndex(body, (statement) => transitionFailureGuard(statement, transition));
  const success = returnsIn(body, safetyBlockedReturn);
  return guard > transition.statementIndex && allSuccessAfter(body, success, guard);
}

function nodesIn<T extends ts.Node>(root: ts.Node, guard: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== root && ts.isFunctionLike(node)) return;
    if (guard(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

function directCall(expression: ts.Expression | undefined): ts.CallExpression | null {
  if (!expression) return null;
  const unwrapped = ts.isParenthesizedExpression(expression) ? expression.expression : expression;
  return ts.isCallExpression(unwrapped) ? unwrapped : null;
}

function directCallExpressionName(expression: ts.Expression | undefined): string | null {
  const call = directCall(expression);
  return call ? directCallName(call) : null;
}

function identifierName(node: ts.Node | undefined): string | null {
  return node && ts.isIdentifier(node) ? node.text : null;
}

function boundCall(body: ts.Block, callName: string): { readonly binding: string; readonly call: ts.CallExpression } | null {
  const matches: Array<{ readonly binding: string; readonly call: ts.CallExpression }> = [];
  for (const declaration of nodesIn(body, ts.isVariableDeclaration)) {
    const call = directCall(declaration.initializer);
    const binding = identifierName(declaration.name);
    if (call && binding && directCallName(call) === callName) matches.push({ binding, call });
  }
  for (const binary of nodesIn(body, ts.isBinaryExpression)) {
    const call = directCall(binary.right);
    const binding = identifierName(binary.left);
    if (binary.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && call && binding && directCallName(call) === callName) matches.push({ binding, call });
  }
  return matches.length === 1 ? matches[0] as { readonly binding: string; readonly call: ts.CallExpression } : null;
}

function boundIdentifierCall(
  body: ts.Block,
  callName: string,
): { readonly binding: string; readonly call: ts.CallExpression } | null {
  const bound = boundCall(body, callName);
  return bound && identifierName(bound.call.expression) === callName ? bound : null;
}

function hasProperty(node: ts.Node, objectName: string, propertyName: string): boolean {
  return nodesIn(node, ts.isPropertyAccessExpression).some((property) =>
    identifierName(property.expression) === objectName && property.name.text === propertyName);
}

function hasIdentifier(node: ts.Node, name: string): boolean {
  return nodesIn(node, ts.isIdentifier).some((identifier) => identifier.text === name);
}

function hasThrow(statement: ts.Statement): boolean {
  return ts.isThrowStatement(statement) || nodesIn(statement, ts.isThrowStatement).length > 0;
}

function returnKind(statement: ts.Statement, expected: string): boolean {
  const returned = ts.isReturnStatement(statement)
    ? statement
    : ts.isBlock(statement)
      ? statement.statements.find(ts.isReturnStatement)
      : undefined;
  if (!returned?.expression || !ts.isObjectLiteralExpression(returned.expression)) return false;
  return returned.expression.properties.some((property) =>
    ts.isPropertyAssignment(property)
    && property.name.getText() === "kind"
    && ts.isStringLiteralLike(property.initializer)
    && property.initializer.text === expected);
}

function notFoundGuard(statement: ts.Statement, targetName: string): boolean {
  return ts.isIfStatement(statement)
    && hasIdentifier(statement.expression, targetName)
    && hasIdentifier(statement.expression, "undefined")
    && returnKind(statement.thenStatement, "not-found");
}

function helperFailureGuards(
  body: ts.Block,
  targetAfter: string,
  targetBefore: string,
  postcondition: string,
  before: string,
  content: string,
): boolean {
  const guards = body.statements.filter(ts.isIfStatement);
  const postconditionGuard = guards.some((guard) =>
    hasIdentifier(guard.expression, targetAfter)
    && nodesIn(guard.expression, ts.isCallExpression).some((call) =>
      identifierName(call.expression) === postcondition && identifierName(call.arguments[0]) === targetAfter)
    && hasThrow(guard.thenStatement));
  const isolationGuard = guards.some((guard) =>
    hasIdentifier(guard.expression, targetBefore)
    && hasProperty(guard.expression, before, "content")
    && hasIdentifier(guard.expression, content)
    && nodesIn(guard.expression, ts.isCallExpression).filter((call) => directCallName(call) === "slice").length >= 4
    && hasThrow(guard.thenStatement));
  return postconditionGuard && isolationGuard;
}

function helperReturnsChanged(body: ts.Block, contentName: string): boolean {
  const returns = returnsIn(body, () => true);
  const call = directCall(returns[0]?.expression);
  return returns.length === 1
    && identifierName(call?.expression) === "changed"
    && identifierName(call?.arguments[0]) === contentName;
}

type MutationHelperParameters = {
  readonly before: string;
  readonly content: string;
  readonly operation: string;
  readonly target: string;
  readonly postcondition: string;
};

function mutationHelperParameters(declaration: ts.FunctionDeclaration): MutationHelperParameters | null {
  if (declaration.parameters.length !== 5) return null;
  const [before, content, operation, target, postcondition] = declaration.parameters.map((parameter) =>
    identifierName(parameter.name));
  return before && content && operation && target && postcondition
    ? { before, content, operation, target, postcondition }
    : null;
}

function helperTargetBindings(body: ts.Block, after: string, before: string): readonly [string, string] | null {
  const targetCalls = nodesIn(body, ts.isCallExpression)
    .filter((call) => identifierName(call.expression) === "targetStageLine");
  if (targetCalls.length !== 2) return null;
  const targetAfter = targetCalls.find((call) => identifierName(call.arguments[0]) === after);
  const targetBefore = targetCalls.find((call) => identifierName(call.arguments[0]) === before);
  const afterBinding = targetAfter?.parent && ts.isVariableDeclaration(targetAfter.parent)
    ? identifierName(targetAfter.parent.name) : null;
  const beforeBinding = targetBefore?.parent && ts.isVariableDeclaration(targetBefore.parent)
    ? identifierName(targetBefore.parent.name) : null;
  return afterBinding && beforeBinding ? [afterBinding, beforeBinding] : null;
}

function helperReparseIsBound(
  reparsed: NonNullable<ReturnType<typeof boundCall>>,
  after: NonNullable<ReturnType<typeof boundCall>>,
  parameters: MutationHelperParameters,
): boolean {
  return identifierName(reparsed.call.arguments[0]) === parameters.content
    && identifierName(after.call.arguments[0]) === reparsed.binding
    && identifierName(after.call.arguments[1]) === parameters.operation
    && identifierName(after.call.arguments[2]) === parameters.target;
}

function verifiedMutationHelper(declaration: ts.FunctionDeclaration): boolean {
  if (!declaration.body) return false;
  const parameters = mutationHelperParameters(declaration);
  const reparsed = boundIdentifierCall(declaration.body, "validateStageState");
  const after = boundIdentifierCall(declaration.body, "validatedStageStateData");
  if (!parameters || !reparsed || !after || !helperReparseIsBound(reparsed, after, parameters)) return false;
  const targets = helperTargetBindings(declaration.body, after.binding, parameters.before);
  if (!targets) return false;
  return helperFailureGuards(
    declaration.body,
    targets[0],
    targets[1],
    parameters.postcondition,
    parameters.before,
    parameters.content,
  ) && helperReturnsChanged(declaration.body, parameters.content);
}

function resolvedMutationHelper(call: ts.CallExpression, checker: ts.TypeChecker): ts.FunctionDeclaration {
  const signature = checker.getResolvedSignature(call);
  let symbol = checker.getSymbolAtLocation(call.expression);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const implementations = symbol?.declarations?.filter((declaration): declaration is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(declaration) && declaration.body !== undefined) ?? [];
  if (!signature || implementations.length !== 1 || implementations[0]?.name?.text !== "verifyStageMutation") {
    throw new InfraFailure("RULE_INVALID", "verifyStageMutation does not resolve to one implementation");
  }
  const returnType = checker.getReturnTypeOfSignature(signature);
  const kinds = discriminantKinds(returnType, checker);
  if (kinds.size !== 2 || !kinds.has("changed") || !kinds.has("not-found")) {
    throw new InfraFailure("RULE_INVALID", "verifyStageMutation does not return TextMutationResult");
  }
  return implementations[0] as ts.FunctionDeclaration;
}

function mutationPredicateIsExact(name: string, expression: ts.Expression, desiredName: string): boolean {
  if (!ts.isArrowFunction(expression) || expression.parameters.length !== 1) return false;
  const line = identifierName(expression.parameters[0]?.name);
  if (!line || ts.isBlock(expression.body)) return false;
  if (name === "setCheckbox") {
    return ts.isBinaryExpression(expression.body)
      && expression.body.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      && hasProperty(expression.body, line, "state")
      && hasIdentifier(expression.body, desiredName);
  }
  const call = directCall(expression.body);
  return Boolean(call
    && ts.isPropertyAccessExpression(call.expression)
    && call.expression.name.text === "startsWith"
    && hasProperty(call.expression.expression, line, "suffix")
    && identifierName(call.arguments[0]) === desiredName);
}

function replacementUsesDesired(body: ts.Block, replacement: ts.CallExpression, desiredName: string): boolean {
  if (hasIdentifier(replacement, desiredName)) return true;
  return nodesIn(body, ts.isVariableDeclaration).some((declaration) => {
    const binding = identifierName(declaration.name);
    return binding !== null
      && replacement.arguments.some((argument) => hasIdentifier(argument, binding))
      && declaration.initializer !== undefined
      && ts.isElementAccessExpression(declaration.initializer)
      && identifierName(declaration.initializer.expression) === "CHECKBOX_MAP"
      && identifierName(declaration.initializer.argumentExpression) === desiredName;
  });
}

type MutationTargetParameters = {
  readonly state: string;
  readonly slug: string;
  readonly desired: string;
};

type MutationTargetBindings = {
  readonly data: NonNullable<ReturnType<typeof boundCall>>;
  readonly target: NonNullable<ReturnType<typeof boundCall>>;
  readonly operation: string;
};

type MutationContentBindings = {
  readonly content: ts.VariableDeclaration;
  readonly contentName: string;
};

function mutationTargetParameters(
  declaration: ts.FunctionDeclaration,
  checker: ts.TypeChecker,
): MutationTargetParameters | null {
  if (declaration.parameters.length !== 3) return null;
  const [state, slug, desired] = declaration.parameters.map((parameter) => identifierName(parameter.name));
  const stateType = checker.getTypeAtLocation(declaration.parameters[0] as ts.ParameterDeclaration);
  const stateTypeName = stateType.aliasSymbol?.getName() ?? stateType.symbol?.getName();
  return state && slug && desired && stateTypeName === "ValidatedStageState"
    ? { state, slug, desired }
    : null;
}

function mutationTargetBindings(body: ts.Block, parameters: MutationTargetParameters): MutationTargetBindings | null {
  const data = boundIdentifierCall(body, "validatedStageStateData");
  const target = boundIdentifierCall(body, "targetStageLine");
  const operation = identifierName(data?.call.arguments[1]);
  if (!data || !target || !operation) return null;
  if (identifierName(data.call.arguments[0]) !== parameters.state) return null;
  if (identifierName(target.call.arguments[0]) !== data.binding) return null;
  if (identifierName(target.call.arguments[1]) !== parameters.slug) return null;
  return { data, target, operation };
}

function mutationContentBindings(
  body: ts.Block,
  bindings: MutationTargetBindings,
  desired: string,
): MutationContentBindings | null {
  const replacement = boundCall(body, "replace");
  if (!replacement || !ts.isPropertyAccessExpression(replacement.call.expression)) return null;
  if (!hasProperty(replacement.call.expression.expression, bindings.target.binding, "line")) return null;
  if (!replacementUsesDesired(body, replacement.call, desired)) return null;
  const content = body.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .find((variable) => hasProperty(variable, bindings.data.binding, "content")
      && hasIdentifier(variable, bindings.target.binding));
  const contentName = identifierName(content?.name);
  if (!content || !contentName || !content.initializer) return null;
  return hasIdentifier(content.initializer, replacement.binding) ? { content, contentName } : null;
}

function returnedMutationDelegate(
  name: string,
  body: ts.Block,
  parameters: MutationTargetParameters,
  bindings: MutationTargetBindings,
  content: MutationContentBindings,
): ts.CallExpression | null {
  const returned = returnsIn(body, (expression) => directCallExpressionName(expression) === "verifyStageMutation");
  if (returned.length !== 1) return null;
  if (topLevelIndex(returned[0] as ts.ReturnStatement, body) <= topLevelIndex(content.content, body)) return null;
  const delegate = directCall(returned[0]?.expression);
  if (delegate?.arguments.length !== 5) return null;
  if (identifierName(delegate.expression) !== "verifyStageMutation") return null;
  const args = delegate.arguments;
  if (identifierName(args[0]) !== bindings.data.binding) return null;
  if (identifierName(args[1]) !== content.contentName) return null;
  if (identifierName(args[2]) !== bindings.operation) return null;
  if (identifierName(args[3]) !== parameters.slug) return null;
  return mutationPredicateIsExact(name, args[4] as ts.Expression, parameters.desired) ? delegate : null;
}

function delegatedTextMutationIsSafe(
  name: string,
  declaration: ts.FunctionDeclaration,
  checker: ts.TypeChecker,
): boolean {
  const body = declaration.body as ts.Block;
  const parameters = mutationTargetParameters(declaration, checker);
  if (!parameters) return false;
  const bindings = mutationTargetBindings(body, parameters);
  if (!bindings) return false;
  const found = topLevelStatementIndex(body, (statement) => notFoundGuard(statement, bindings.target.binding));
  const content = mutationContentBindings(body, bindings, parameters.desired);
  if (found < 0 || !content) return false;
  const delegate = returnedMutationDelegate(name, body, parameters, bindings, content);
  if (!delegate) return false;
  return verifiedMutationHelper(resolvedMutationHelper(delegate, checker));
}

function textMutationIsSafe(declaration: ts.FunctionDeclaration, checker: ts.TypeChecker): boolean {
  const body = declaration.body as ts.Block;
  const found = topLevelStatementIndex(body, (statement) =>
    guardedFailure(statement, ["content", "return"])
    && /(?:includes|match|test|exec)\s*\(/.test(statement.getText()));
  const mutation = topLevelStatementIndex(body, (statement) =>
    ts.isVariableStatement(statement) && /\.replace\s*\(/.test(statement.getText()), found);
  const postcondition = topLevelStatementIndex(body, (statement) =>
    guardedFailure(statement, ["return"])
    && /(?:includes|match|test|exec|parseCheckboxes)\s*\(/.test(statement.getText()), mutation);
  const success = returnsIn(body, (expression) => returnsSuccess(expression));
  const inlineSafe = found >= 0 && mutation > found && postcondition > mutation && allSuccessAfter(body, success, postcondition);
  return inlineSafe || delegatedTextMutationIsSafe(declaration.name?.text ?? "", declaration, checker);
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

function nsd003Safe(name: string, declaration: ts.FunctionDeclaration, checker: ts.TypeChecker): boolean {
  const body = declaration.body as ts.Block;
  if (name === "persistBlocked") return persistBlockedIsSafe(body, checker);
  if (name === "resyncOneIntent") return composeResyncIsSafe(body);
  return textMutationIsSafe(declaration, checker);
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

function isNsd003Function(node: ts.Node): node is ts.FunctionDeclaration & { name: ts.Identifier } {
  return ts.isFunctionDeclaration(node) && node.body !== undefined && node.name !== undefined
    && NSD003_FUNCTIONS.has(node.name.text);
}

function catalogImplementationNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (isNsd003Function(node)) {
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
  if (!isNsd003Function(node)) return null;
  return nsd003Safe(node.name.text, node, checker)
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
  const contractNamesByFile = new Map<string, Map<string, number>>();
  for (const parsed of parsedSources) {
    const sourceFile = program.getSourceFile(parsed.file);
    if (!sourceFile) throw new InfraFailure("RULE_INVALID", `${parsed.file}: TypeScript Program omitted the snapshot`);
    assertStructuralCoverage(parsed, sourceFile);
    // Scanned paths reach here from path.relative (engine.ts, snapshot capture),
    // which separates with backslashes on Windows while the catalog is written
    // with forward slashes. Keying raw would put every host outside the scan
    // there, skipping the census in silence -- the exact lapse the census exists
    // to catch. Normalise the separator so the key is about the path.
    const scannedFile = parsed.file.replaceAll("\\", "/");
    const perFile = contractNamesByFile.get(scannedFile) ?? new Map<string, number>();
    contractNamesByFile.set(scannedFile, perFile);
    for (const name of catalogImplementationNames(sourceFile)) {
      contractNames.set(name, (contractNames.get(name) ?? 0) + 1);
      perFile.set(name, (perFile.get(name) ?? 0) + 1);
    }
    candidates.push(...semanticCandidates(parsed, sourceFile, checker));
  }
  if ([...contractNames.values()].some((count) => count > 1)) {
    throw new InfraFailure("RULE_INVALID", "multiple implementations resolve to one NSD003 catalog contract");
  }
  // Counted PER HOST, not repo-wide: a repo-wide count answers "does this name
  // exist somewhere", which any same-named helper elsewhere satisfies — so
  // renaming the catalogued implementation would still read as one match and
  // pass. The contract is that THIS file declares it, so ask this file.
  for (const entry of NSD003_CATALOG) {
    const perFile = contractNamesByFile.get(entry.file);
    if (perFile === undefined) continue; // host outside this scan's inputs
    if ((perFile.get(entry.name) ?? 0) !== 1) {
      throw new InfraFailure(
        "RULE_INVALID",
        `NSD003 catalog entry resolves to no implementation: ${entry.name} (${entry.file})`,
      );
    }
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

export function scanSourceForTest(file: string, source: string, repoRoot: string): Finding[] {
  const ast = loadVerifiedAstGrep(repoRoot);
  return scanParsedSources([parseSource(ast, file, source)]).findings;
}

export function assertSafeRelativePath(path: string, repoRoot: string): void {
  if (isAbsolute(path) || relative(repoRoot, resolve(repoRoot, path)).startsWith("..")) {
    throw new InfraFailure("BASELINE_INVALID", `path escapes the repository: ${path}`);
  }
}
