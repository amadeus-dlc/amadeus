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
const INTENTIONAL_DROP = /intentional-drop:\s+\S/i;
const RESULT_TYPE = /(?:\bboolean\b|\b(?:Result|Outcome|Receipt|StateResult)\b)/;
const KNOWN_RESULT_SYMBOLS = new Set(["applyTransition", "persistBlocked"]);
const LOG_ONLY_CALL = /^(?:await\s+)?(?:[A-Za-z_$][\w$]*\??\.)*(?:log|warn|error|info|debug)\s*\(/;
const DIRECT_CALL = /^(?:await\s+)?(?:void\s+)?(?:[A-Za-z_$][\w$]*\??\.)*([A-Za-z_$][\w$]*)\s*\(/;

type AstGrepModule = typeof import("@ast-grep/napi");
type Candidate = {
  readonly kind: string;
  readonly text: string;
  readonly line: number;
  readonly column: number;
  readonly node: SgNode;
};

export type ParsedSource = {
  readonly file: string;
  readonly source: string;
  readonly candidates: readonly Candidate[];
  readonly declaredSymbols: ReadonlySet<string>;
  readonly resultSymbols: ReadonlySet<string>;
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

function namedChildren(node: SgNode): SgNode[] {
  return node.children().filter((child) => child.isNamed());
}

function declaredFunction(text: string): { name: string; returnsResult: boolean } | null {
  const match = text.match(
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*:\s*([^\n{]+)/s,
  );
  if (!match) return null;
  const name = match[1] as string;
  const returnType = (match[2] as string).trim();
  return {
    name,
    returnsResult:
      RESULT_TYPE.test(returnType)
      || (/^emit(?:Audit)?$/.test(name) && !/\bvoid\b/.test(returnType)),
  };
}

export function parseSource(
  ast: AstGrepModule,
  file: string,
  source: string,
): ParsedSource {
  let parsed: SgRoot;
  try {
    parsed = ast.parse(languageFor(file, ast), source);
  } catch (error) {
    throw new InfraFailure("SCAN_PARTIAL", `${file}: ast-grep parse failed: ${String(error)}`);
  }
  let nodes: SgNode[];
  try {
    // One ast-grep query covers the candidate shapes and the per-file program sentinel.
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
    const tsParsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const syntaxErrors = (tsParsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    const riskyUnsupportedShape = errorNodes.some((node) => /\b(?:catch|emit\w*|applyTransition|persistBlocked)\b/.test(node.text()));
    if (syntaxErrors.length > 0 || riskyUnsupportedShape) {
      throw new InfraFailure("SCAN_PARTIAL", `${file}: source contains an unparseable candidate AST region`);
    }
  }
  const candidates = nodes
    .filter((node) => node.kind() !== "program")
    .map((node) => ({
      kind: String(node.kind()),
      text: node.text(),
      line: node.range().start.line + 1,
      column: node.range().start.column + 1,
      node,
    }));
  const resultSymbols = new Set(KNOWN_RESULT_SYMBOLS);
  const declaredSymbols = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.kind !== "function_declaration") continue;
    const declaration = declaredFunction(candidate.text);
    if (!declaration) continue;
    declaredSymbols.add(declaration.name);
    if (declaration.returnsResult) resultSymbols.add(declaration.name);
  }
  return { file, source, candidates, declaredSymbols, resultSymbols };
}

function hasIntentionalMarker(source: string, line: number): boolean {
  const lines = source.split(/\r?\n/);
  return [lines[line - 1], lines[line - 2]].some((text) => text !== undefined && INTENTIONAL_DROP.test(text));
}

function catchRule(candidate: Candidate): RuleId | null {
  const block = candidate.node.children().find((node) => node.kind() === "statement_block");
  if (!block) return null;
  const statements = namedChildren(block);
  if (statements.length === 0) return "NSD001";
  const isLogOnly = statements.every(
    (statement) => statement.kind() === "expression_statement" && LOG_ONLY_CALL.test(statement.text().trim()),
  );
  return isLogOnly ? "NSD002" : null;
}

function messages(ruleId: RuleId, symbol?: string): string {
  if (ruleId === "NSD001") return "Empty catch block silently drops the failure";
  if (ruleId === "NSD002") return "Catch block only logs and neither returns nor rethrows";
  return `Result from ${symbol ?? "a fallible call"} is discarded without inspection`;
}

function ruleForCandidate(
  candidate: Candidate,
  parsed: ParsedSource,
  globalResultSymbols: ReadonlySet<string>,
): { ruleId: RuleId; symbol?: string } | null {
  if (candidate.kind === "catch_clause") {
    const ruleId = catchRule(candidate);
    return ruleId ? { ruleId } : null;
  }
  if (candidate.kind !== "expression_statement") return null;
  const symbol = candidate.text.trim().match(DIRECT_CALL)?.[1];
  if (!symbol) return null;
  const isResult = parsed.declaredSymbols.has(symbol)
    ? parsed.resultSymbols.has(symbol)
    : globalResultSymbols.has(symbol);
  return isResult ? { ruleId: "NSD003", symbol } : null;
}

function buildFinding(
  parsed: ParsedSource,
  candidate: Candidate,
  matched: { ruleId: RuleId; symbol?: string },
  ordinals: Map<string, number>,
): Finding {
  const snippet = normalizeSnippet(candidate.text);
  const ordinalKey = `${parsed.file}\0${matched.ruleId}\0${snippet}`;
  const ordinal = ordinals.get(ordinalKey) ?? 0;
  ordinals.set(ordinalKey, ordinal + 1);
  return {
    ruleId: matched.ruleId,
    file: parsed.file,
    line: candidate.line,
    column: candidate.column,
    message: messages(matched.ruleId, matched.symbol),
    snippet,
    fingerprint: findingFingerprint(matched.ruleId, parsed.file, snippet, ordinal),
  };
}

export function findingsFromParsed(
  parsedSources: readonly ParsedSource[],
): Finding[] {
  const globalResultSymbols = new Set(KNOWN_RESULT_SYMBOLS);
  for (const parsed of parsedSources) {
    for (const symbol of parsed.resultSymbols) globalResultSymbols.add(symbol);
  }
  const findings: Finding[] = [];
  const ordinals = new Map<string, number>();
  for (const parsed of parsedSources) {
    for (const candidate of parsed.candidates) {
      const matched = ruleForCandidate(candidate, parsed, globalResultSymbols);
      if (!matched || hasIntentionalMarker(parsed.source, candidate.line)) continue;
      findings.push(buildFinding(parsed, candidate, matched, ordinals));
    }
  }
  return findings.sort((left, right) =>
    left.file.localeCompare(right.file)
    || left.line - right.line
    || left.column - right.column
    || left.ruleId.localeCompare(right.ruleId)
  );
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
