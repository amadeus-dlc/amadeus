import ts from "typescript";
import { basename } from "node:path";
import { isAmadeusToolPath } from "../harness/cli-target.ts";
import {
  importedBindingOf,
  sourceWithTypeChecker,
  visitNodes,
} from "./typescript-source.ts";

type CliScan = {
  cli: boolean;
  claude: boolean;
};

type ScanContext = {
  checker: ts.TypeChecker;
};

const SCAN_FILE = "/cli-mechanism-scan.ts";
const SCAN_CACHE = new Map<string, CliScan>();
const POSITIONAL_SPAWNS = new Set([
  "execFileSync",
  "spawn",
  "spawnSync",
]);
const CLI_TARGET_MODULE = "../harness/cli-target.ts";
const TEST_RUNNER = "run-tests.sh";

function unwrapped(expression: ts.Expression): ts.Expression {
  if (
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return unwrapped(expression.expression);
  }
  return expression;
}

function initializerFor(
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
): { expression: ts.Expression; symbol: ts.Symbol } | null {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (!symbol) return null;
  const expression = initializerForSymbol(symbol);
  return expression ? { expression, symbol } : null;
}

function initializerForSymbol(symbol: ts.Symbol): ts.Expression | null {
  const declaration = symbol.valueDeclaration;
  if (!declaration || !ts.isVariableDeclaration(declaration)) {
    return null;
  }
  if (
    ts.isVariableDeclaration(declaration) &&
    (!ts.isVariableDeclarationList(declaration.parent) ||
      !(declaration.parent.flags & ts.NodeFlags.Const))
  ) {
    return null;
  }
  return declaration.initializer ?? null;
}

function resolvedExpression(
  expression: ts.Expression,
  context: ScanContext,
  resolving = new Set<ts.Symbol>(),
): ts.Expression {
  const direct = unwrapped(expression);
  if (!ts.isIdentifier(direct)) return direct;
  const symbol = context.checker.getSymbolAtLocation(direct);
  if (!symbol || resolving.has(symbol)) return direct;
  const initializer = initializerFor(direct, context.checker);
  const nextExpression = initializer?.expression;
  if (!nextExpression) return direct;
  const next = new Set(resolving);
  next.add(symbol);
  return resolvedExpression(nextExpression, context, next);
}

function stringValue(node: ts.Expression): string | null {
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  ) {
    return node.text;
  }
  return null;
}

function isNodePathCall(
  call: ts.CallExpression,
  context: ScanContext,
): boolean {
  if (!ts.isIdentifier(call.expression)) return false;
  const imported = importedBindingOf(call.expression, context.checker);
  return imported?.module === "node:path" && imported.name === "join";
}

function staticPathValue(
  node: ts.Expression,
  context: ScanContext,
  resolving = new Set<ts.Symbol>(),
): string | null {
  const candidate = unwrapped(node);
  if (ts.isIdentifier(candidate)) {
    const initializer = initializerFor(candidate, context.checker);
    if (!initializer || resolving.has(initializer.symbol)) return null;
    const next = new Set(resolving);
    next.add(initializer.symbol);
    return staticPathValue(initializer.expression, context, next);
  }
  const text = stringValue(candidate);
  if (text !== null) return text;
  if (!ts.isCallExpression(candidate) || !isNodePathCall(candidate, context)) {
    return null;
  }
  const lastArgument = candidate.arguments.at(-1);
  return lastArgument
    ? staticPathValue(lastArgument, context, resolving)
    : null;
}

function matchesStaticPath(
  node: ts.Expression,
  matchesPath: (path: string) => boolean,
  context: ScanContext,
): boolean {
  const path = staticPathValue(node, context);
  return path !== null && matchesPath(path);
}

function matchesToolTarget(
  node: ts.Expression,
  context: ScanContext,
): boolean {
  const candidate = resolvedExpression(node, context);
  if (
    ts.isCallExpression(candidate) &&
    isAmadeusToolTargetCall(candidate, context)
  ) {
    const marked = candidate.arguments[0];
    if (!marked) return false;
    const staticPath = staticPathValue(marked, context);
    return staticPath === null || isAmadeusToolPath(staticPath);
  }
  return matchesStaticPath(candidate, isAmadeusToolPath, context);
}

function matchesRunnerTarget(
  node: ts.Expression,
  context: ScanContext,
): boolean {
  return matchesStaticPath(
    node,
    (path) => basename(path) === TEST_RUNNER,
    context,
  );
}

function isLiteralLauncher(
  expression: ts.Expression,
  expected: string,
  context: ScanContext,
): boolean {
  const resolved = resolvedExpression(expression, context);
  return (
    (ts.isStringLiteral(resolved) ||
      ts.isNoSubstitutionTemplateLiteral(resolved)) &&
    resolved.text === expected
  );
}

function isBunLauncher(
  expression: ts.Expression,
  context: ScanContext,
): boolean {
  const resolved = resolvedExpression(expression, context);
  if (
    (ts.isStringLiteral(resolved) ||
      ts.isNoSubstitutionTemplateLiteral(resolved)) &&
    resolved.text === "bun"
  ) {
    return true;
  }
  return (
    ts.isPropertyAccessExpression(resolved) &&
    ts.isIdentifier(resolved.expression) &&
    resolved.expression.text === "process" &&
    resolved.name.text === "execPath" &&
    !context.checker.getSymbolAtLocation(resolved.expression)
  );
}

function propertyName(node: ts.PropertyName): string | null {
  return ts.isIdentifier(node) || ts.isStringLiteral(node)
    ? node.text
    : null;
}

type CmdProperty = ts.PropertyAssignment | ts.ShorthandPropertyAssignment;

function isCmdProperty(
  property: ts.ObjectLiteralElementLike,
): property is CmdProperty {
  return (
    (ts.isPropertyAssignment(property) ||
      ts.isShorthandPropertyAssignment(property)) &&
    propertyName(property.name) === "cmd"
  );
}

function lastCmdProperty(
  object: ts.ObjectLiteralExpression,
): { property: CmdProperty; index: number } | null {
  for (let index = object.properties.length - 1; index >= 0; index--) {
    const property = object.properties[index];
    if (property && isCmdProperty(property)) return { property, index };
  }
  return null;
}

function mayOverrideCmd(property: ts.ObjectLiteralElementLike): boolean {
  if (
    !ts.isPropertyAssignment(property) &&
    !ts.isShorthandPropertyAssignment(property)
  ) {
    return true;
  }
  const name = propertyName(property.name);
  return name === null || name === "cmd";
}

function cmdInitializer(
  property: CmdProperty,
  context: ScanContext,
): ts.Expression | null {
  if (ts.isPropertyAssignment(property)) return property.initializer;
  const shorthandValue =
    context.checker.getShorthandAssignmentValueSymbol(property);
  return shorthandValue ? initializerForSymbol(shorthandValue) : null;
}

function bunCommand(
  call: ts.CallExpression,
  context: ScanContext,
): ts.ArrayLiteralExpression | null {
  const first = call.arguments[0];
  if (!first) return null;
  const command = resolvedExpression(first, context);
  if (!ts.isObjectLiteralExpression(command)) {
    return ts.isArrayLiteralExpression(command) ? command : null;
  }

  const cmd = lastCmdProperty(command);
  if (!cmd) return null;
  // A later spread, computed property, or unsupported member could replace
  // `cmd` at runtime. Refuse to infer a command when object ordering leaves
  // the final value ambiguous.
  if (command.properties.slice(cmd.index + 1).some(mayOverrideCmd)) return null;

  const initializer = cmdInitializer(cmd.property, context);
  if (!initializer) return null;
  const resolved = resolvedExpression(initializer, context);
  return ts.isArrayLiteralExpression(resolved) ? resolved : null;
}

function isBunSpawn(
  call: ts.CallExpression,
  context: ScanContext,
): boolean {
  return (
    ts.isPropertyAccessExpression(call.expression) &&
    ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === "Bun" &&
    !context.checker.getSymbolAtLocation(call.expression.expression) &&
    (call.expression.name.text === "spawn" ||
      call.expression.name.text === "spawnSync")
  );
}

function isAmadeusToolTargetCall(
  call: ts.CallExpression,
  context: ScanContext,
): boolean {
  if (!ts.isIdentifier(call.expression)) return false;
  const imported = importedBindingOf(call.expression, context.checker);
  return imported?.name === "amadeusToolTarget" &&
    imported.module === CLI_TARGET_MODULE;
}

function isBunArraySpawn(
  call: ts.CallExpression,
  context: ScanContext,
): boolean {
  if (!ts.isIdentifier(call.expression)) return false;
  const imported = importedBindingOf(call.expression, context.checker);
  return imported?.module === "bun" &&
    (imported.name === "spawn" || imported.name === "spawnSync");
}

function positionalSpawnName(
  call: ts.CallExpression,
  context: ScanContext,
): string | null {
  if (!ts.isIdentifier(call.expression)) return null;
  const imported = importedBindingOf(call.expression, context.checker);
  if (
    imported?.module === "node:child_process" &&
    POSITIONAL_SPAWNS.has(imported.name)
  ) {
    return imported.name;
  }
  return null;
}

function scanCommand(
  launcher: ts.Expression,
  args: readonly ts.Expression[],
  context: ScanContext,
): CliScan {
  const soleArgument = args.length === 1
    ? resolvedExpression(args[0], context)
    : null;
  const commandArgs = soleArgument && ts.isArrayLiteralExpression(soleArgument)
    ? soleArgument.elements.filter(ts.isExpression)
    : args;
  const target = commandArgs[0];
  const drivesTool =
    isBunLauncher(launcher, context) &&
    !!target &&
    matchesToolTarget(target, context);
  const drivesRunner =
    isLiteralLauncher(launcher, "bash", context) &&
    !!target &&
    matchesRunnerTarget(target, context);
  const drivesClaude =
    isLiteralLauncher(launcher, "claude", context) &&
    commandArgs.some((arg) =>
      isLiteralLauncher(arg, "-p", context) ||
      isLiteralLauncher(arg, "--print", context)
    );
  return {
    cli: drivesTool || drivesRunner || drivesClaude,
    claude: drivesClaude,
  };
}

function scanCall(
  call: ts.CallExpression,
  context: ScanContext,
): CliScan {
  if (isBunSpawn(call, context) || isBunArraySpawn(call, context)) {
    const command = bunCommand(call, context);
    const launcher = command?.elements[0];
    if (!command || !launcher || ts.isOmittedExpression(launcher)) {
      return { cli: false, claude: false };
    }
    return scanCommand(
      launcher,
      command.elements.slice(1),
      context,
    );
  }

  if (!positionalSpawnName(call, context)) {
    return { cli: false, claude: false };
  }
  const [launcher, args] = call.arguments;
  if (!launcher || !args) return { cli: false, claude: false };
  return scanCommand(launcher, [args], context);
}

function scanSource(src: string): CliScan {
  const cached = SCAN_CACHE.get(src);
  if (cached) return cached;
  if (!/\b(?:spawn(?:Sync)?|execFileSync)\b/.test(src)) {
    return { cli: false, claude: false };
  }

  const { sourceFile, checker } = sourceWithTypeChecker(src, SCAN_FILE);
  const result = { cli: false, claude: false };
  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const call = scanCall(node, { checker });
    result.cli ||= call.cli;
    result.claude ||= call.claude;
  });
  SCAN_CACHE.set(src, result);
  return result;
}

/** Reports a provenance-validated shipped CLI spawn expression. Launcher and
 * argv[0] must belong to the same call; call-graph reachability is intentionally
 * outside this static classifier. */
export function drivesCliSurface(src: string): boolean {
  return scanSource(src).cli;
}

/** Reports a live Claude print subprocess using the same call-bound scan. */
export function drivesClaudePrintSurface(src: string): boolean {
  return scanSource(src).claude;
}
