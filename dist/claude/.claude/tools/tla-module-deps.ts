// Transitive TLA module dependency resolution (FR-2 foundation).
//
// Pure module: no fs access, no `node:` imports. The caller injects
// `readModule`, which is responsible for reading `specs/tla/<Name>.tla`
// inside the canonical boundary. Extraction is line-based after comment
// stripping, so EXTENDS/INSTANCE-shaped text inside comments or deeper in a
// line is never adopted as a dependency. Every failure is an explicit typed
// error — no silent fallback, no silent skip.

export type ModuleDepsErrorCode =
  | "MODULE_DEP_UNRESOLVED"
  | "MODULE_DEP_CYCLE"
  | "MODULE_DEP_OUT_OF_BOUNDS";

export interface ModuleDepsError {
  readonly kind: "MODULE_DEPS";
  readonly code: ModuleDepsErrorCode;
  readonly relativePath: string;
  readonly detail: string;
}

export interface ModuleDeclarationDrift {
  readonly modelName: string;
  readonly declared: readonly string[];
  readonly resolved: readonly string[];
  readonly missing: readonly string[];
  readonly extra: readonly string[];
}

type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// TLA module identifiers, the same grammar the model map uses for model names.
const MODEL_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

// TLA2Tools standard modules. References to these are language built-ins, not
// specs/tla assets, so they are neither tracked nor resolved.
export const TLA_STANDARD_MODULES: readonly string[] = [
  "Bags",
  "FiniteSets",
  "Integers",
  "Naturals",
  "Reals",
  "Sequences",
  "TLC",
];

function failure(
  code: ModuleDepsErrorCode,
  moduleName: string,
  detail: string,
): Result<never, ModuleDepsError> {
  return {
    ok: false,
    error: {
      kind: "MODULE_DEPS",
      code,
      relativePath: `specs/tla/${moduleName}.tla`,
      detail,
    },
  };
}

function checkModuleName(moduleName: string): Result<null, ModuleDepsError> {
  if (!MODEL_NAME.test(moduleName)) {
    return failure(
      "MODULE_DEP_OUT_OF_BOUNDS",
      moduleName,
      `module name ${JSON.stringify(moduleName)} is outside the TLA module identifier grammar`,
    );
  }
  return { ok: true, value: null };
}

// Removes comments while preserving line boundaries. Block comments are
// non-nested and may span lines; `(*` inside a `\*` line comment is inert.
// An unterminated block comment swallows the rest of the module so malformed
// source cannot yield fabricated dependencies (BR-R6).
function stripBlockComments(source: string): string {
  let out = "";
  let index = 0;
  let inBlock = false;
  while (index < source.length) {
    if (inBlock) {
      if (source.startsWith("*)", index)) {
        inBlock = false;
        index += 2;
      } else {
        if (source[index] === "\n") out += "\n";
        index += 1;
      }
      continue;
    }
    if (source.startsWith("\\*", index)) {
      const newline = source.indexOf("\n", index + 2);
      if (newline === -1) break;
      out += "\n";
      index = newline + 1;
      continue;
    }
    if (source.startsWith("(*", index)) {
      inBlock = true;
      index += 2;
      continue;
    }
    out += source[index];
    index += 1;
  }
  return out;
}

// Direct references of one module: EXTENDS lines and INSTANCE declarations
// (including the `<name> == INSTANCE X` assignment form; WITH clauses are
// never read). Standard modules are excluded here so callers never see them.
export function extractModuleRefs(
  moduleName: string,
  source: string,
): Result<readonly string[], ModuleDepsError> {
  const nameCheck = checkModuleName(moduleName);
  if (!nameCheck.ok) return nameCheck;
  const refs: string[] = [];
  const withoutBlocks = stripBlockComments(source);
  const lines = withoutBlocks.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (line.length === 0) continue;
    let extendsRest: string | null = null;
    let instanceRest: string | null = null;
    if (line.startsWith("EXTENDS ")) {
      extendsRest = line.slice("EXTENDS ".length);
      while (extendsRest.trimEnd().endsWith(",") && index + 1 < lines.length) {
        index += 1;
        const continuation = lines[index]!.trim();
        if (continuation.length > 0) extendsRest += continuation;
      }
    } else if (line.startsWith("INSTANCE ")) {
      instanceRest = line.slice("INSTANCE ".length);
    } else {
      const assignment = line.match(/^[A-Za-z][A-Za-z0-9_]*\s*==\s*INSTANCE\s+(.+)$/);
      if (assignment) instanceRest = assignment[1];
    }
    // EXTENDS takes every comma-separated name; INSTANCE takes only the first
    // identifier (WITH-clause names are not dependencies).
    const tokens = extendsRest !== null
      ? extendsRest.split(",").map((token) => token.trim())
      : instanceRest !== null
        ? [instanceRest.trim().split(/\s+/)[0] ?? ""]
        : [];
    for (const candidate of tokens) {
      if (candidate.length === 0) continue;
      if (!MODEL_NAME.test(candidate)) {
        return failure(
          "MODULE_DEP_UNRESOLVED",
          moduleName,
          `malformed module reference ${JSON.stringify(candidate)} in EXTENDS/INSTANCE of ${moduleName}`,
        );
      }
      if (!TLA_STANDARD_MODULES.includes(candidate)) refs.push(candidate);
    }
  }
  return { ok: true, value: refs };
}

// Transitive closure over readModule. The start module itself is excluded
// from the result; output is sorted and deduplicated (deterministic).
export function resolveAuxiliaryModules(
  moduleName: string,
  readModule: (name: string) => Result<string, ModuleDepsError>,
): Result<readonly string[], ModuleDepsError> {
  const nameCheck = checkModuleName(moduleName);
  if (!nameCheck.ok) return nameCheck;
  const resolved = new Set<string>();
  const visited = new Set<string>();
  // DFS with an explicit stack; `path` tracks the current chain for cycles.
  const visit = (
    current: string,
    path: readonly string[],
  ): Result<null, ModuleDepsError> => {
    if (path.includes(current)) {
      return failure(
        "MODULE_DEP_CYCLE",
        current,
        `cyclic module reference: ${[...path, current].join(" -> ")}`,
      );
    }
    if (visited.has(current)) return { ok: true, value: null };
    visited.add(current);
    const source = readModule(current);
    if (!source.ok) {
      if (source.error.code === "MODULE_DEP_UNRESOLVED") return source;
      return failure(
        source.error.code,
        current,
        `cannot read module ${current}: ${source.error.detail}`,
      );
    }
    const refs = extractModuleRefs(current, source.value);
    if (!refs.ok) return refs;
    if (current !== moduleName) resolved.add(current);
    for (const ref of refs.value) {
      const step = visit(ref, [...path, current]);
      if (!step.ok) return step;
    }
    return { ok: true, value: null };
  };
  const walked = visit(moduleName, []);
  if (!walked.ok) return walked;
  return { ok: true, value: [...resolved].sort() };
}

// Declaration-vs-resolution comparison (BR-C1, consumed by the loader and
// the completeness sensor). Both directions are reported; a one-sided subset
// check is never sufficient.
export function compareModuleDeclarations(
  modelName: string,
  declared: readonly string[],
  resolved: readonly string[],
): ModuleDeclarationDrift {
  const declaredSet = new Set(declared);
  const resolvedSet = new Set(resolved);
  const missing = [...resolvedSet].filter((name) => !declaredSet.has(name)).sort();
  const extra = [...declaredSet].filter((name) => !resolvedSet.has(name)).sort();
  return {
    modelName,
    declared: [...declaredSet].sort(),
    resolved: [...resolvedSet].sort(),
    missing,
    extra,
  };
}
