// Canonical, FS-free predicate logic for the distribution-boundary guard.
//
// Intent 260722-election-core-promotion, Unit boundary-guard (FR-5a/5b/5c).
// This module is the SINGLE definition (construction guardrail: canonical single
// definition, BR-7) of:
//   - scanDistributionTreeForScriptsRefs (predicate 1, FR-5a)
//   - findDuplicatedAssets              (predicate 2, residual-invariant, FR-1a/2a/3a P5)
//   - AllowRule + AllowRule.parse       (id+glob+pattern smart constructor, BR-2)
//   - SCAN_ROOTS                        (canonical distribution-tree catalog, BR-7)
//
// It is a plain (non-.test.ts) helper so that BOTH the unit twin (pure-function
// assertions) and the integration twin (live FS scan) consume ONE definition
// WITHOUT a `.test.ts -> .test.ts` import. That import is unusable here: Bun
// either double-registers the imported test blocks, or — under an
// `import.meta.path === Bun.main` guard — SILENTLY SKIPS the unit twin in a
// multi-file / full-suite run (Bun.main resolves to a single entry), which is a
// false-green forbidden by the verification-theatre rule. See code-summary.md
// "Deviation" for the recorded evidence.
//
// Purity (domain-entities invariant): no fs / process / env access in this
// module. Real FS collection lives only in the integration twin
// (fs-tests-integration-first).

// Discriminated-union Result (project canonical FDM-TS style; mirrors
// packages/setup/src/shared/result.ts so the guard shares the repo's Result shape).
export type Result<T, E> = { readonly type: "ok"; readonly value: T } | { readonly type: "err"; readonly error: E };

export namespace Result {
  export function ok<T>(value: T): Result<T, never> {
    return Object.freeze({ type: "ok", value } as const);
  }
  export function err<E>(error: E): Result<never, E> {
    return Object.freeze({ type: "err", error } as const);
  }
}
Object.freeze(Result);

// ── Domain types (domain-entities.md) ─────────────────────────────────────────

export type ScanRootKind = "packages" | "dist" | "self-install";

export type ScanRoot = { readonly kind: ScanRootKind; readonly dir: string };

// SCAN_ROOTS — the canonical catalog of distribution trees the guard walks
// (BR-7: a future distribution surface is added HERE, in one place, never by
// scattering roots across call sites). Entries, in order:
//   - the framework SOURCE package (packages/framework)
//   - one built dist tree per shipped harness (dist/<harness>)
//   - one self-install tree per shipped harness (repo-root dotdir)
// Faces are enumerated explicitly (not via a live `ls`) so the catalog is a
// deterministic constant (reliability-design: determinism core). Comments stay
// count-free — no numeric markers to hand-sync when the catalog grows.
export const SCAN_ROOTS: readonly ScanRoot[] = Object.freeze([
  { kind: "packages", dir: "packages/framework" },
  { kind: "dist", dir: "dist/claude" },
  { kind: "dist", dir: "dist/codex" },
  { kind: "dist", dir: "dist/cursor" },
  { kind: "dist", dir: "dist/kiro" },
  { kind: "dist", dir: "dist/kiro-ide" },
  { kind: "dist", dir: "dist/opencode" },
  { kind: "self-install", dir: ".claude" },
  { kind: "self-install", dir: ".codex" },
  { kind: "self-install", dir: ".cursor" },
  { kind: "self-install", dir: ".opencode" },
  { kind: "self-install", dir: ".agents" },
] as const);

// AllowRule — an audit-able exemption (BR-2: id + file glob + pattern, all
// required; anonymous exemptions are impossible because parse rejects empty id).
export type AllowRule = { readonly id: string; readonly fileGlob: string; readonly pattern: RegExp };

export type RawAllowRule = { readonly id: string; readonly fileGlob: string; readonly pattern: string };

export type AllowRuleParseError =
  | { readonly kind: "empty-id"; readonly message: string }
  | { readonly kind: "empty-glob"; readonly message: string }
  | { readonly kind: "invalid-pattern"; readonly message: string };

export namespace AllowRule {
  // Smart constructor (parse-don't-validate): a compiled AllowRule is proof that
  // its id/glob are non-empty and its pattern is a compilable regex. Invalid
  // declarations cannot be represented.
  export function parse(raw: RawAllowRule): Result<AllowRule, AllowRuleParseError> {
    if (raw.id.trim() === "") {
      return Result.err({ kind: "empty-id", message: "AllowRule.id must be non-empty (BR-2: no anonymous exemptions)" });
    }
    if (raw.fileGlob.trim() === "") {
      return Result.err({ kind: "empty-glob", message: "AllowRule.fileGlob must be non-empty" });
    }
    let pattern: RegExp;
    try {
      pattern = new RegExp(raw.pattern);
    } catch (e) {
      return Result.err({ kind: "invalid-pattern", message: `AllowRule.pattern is not a compilable regex: ${(e as Error).message}` });
    }
    return Result.ok(Object.freeze({ id: raw.id, fileGlob: raw.fileGlob, pattern }));
  }
}
Object.freeze(AllowRule);

// Finding — predicate 1 output (component-methods C1 shape). line is 1-origin;
// excerpt is the trimmed source line, capped for log hygiene.
export type Finding = { readonly file: string; readonly line: number; readonly excerpt: string };

const EXCERPT_MAX = 80;

// Every maximal `scripts/<path>` token on a line, matched occurrence-by-occurrence
// (BR-1: NOT a line-level `grep -v` exclusion — a violation token on a line that
// also carries an allowed token is still detected). The char class covers the
// full path tail so a token like `scripts/amadeus-election.ts` extracts whole and
// is checked as a unit; a bare `scripts/` (next char not in the class) extracts as
// just `scripts/`.
const SCRIPTS_TOKEN_RE = /scripts\/[A-Za-z0-9._/-]*/g;

// Minimal glob matcher: literal segments, `*` (within a path segment), `**` (any
// depth). Sufficient for AllowRule.fileGlob (`**` = every file, or a scoped glob).
export function fileMatchesGlob(file: string, glob: string): boolean {
  const re = globToRegExp(glob);
  return re.test(file);
}

function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
      } else {
        out += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  out += "$";
  return new RegExp(out);
}

function excerpt(line: string): string {
  const trimmed = line.trim();
  return trimmed.length <= EXCERPT_MAX ? trimmed : trimmed.slice(0, EXCERPT_MAX);
}

// Predicate 1 (FR-5a): every `scripts/` path reference in the distribution tree
// that is NOT exempted by an applicable AllowRule. An occurrence is exempted iff
// some AllowRule whose fileGlob matches the file has a pattern that matches the
// occurrence's token. Pure over the supplied file set (no FS).
export function scanDistributionTreeForScriptsRefs(
  files: ReadonlyArray<{ readonly path: string; readonly content: string }>,
  allowlist: ReadonlyArray<AllowRule>,
): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const applicable = allowlist.filter((rule) => fileMatchesGlob(file.path, rule.fileGlob));
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const re = new RegExp(SCRIPTS_TOKEN_RE.source, "g");
      let match: RegExpExecArray | null = re.exec(line);
      while (match !== null) {
        const token = match[0];
        const exempted = applicable.some((rule) => rule.pattern.test(token));
        if (!exempted) {
          findings.push({ file: file.path, line: i + 1, excerpt: excerpt(line) });
        }
        match = re.exec(line);
      }
    }
  }
  return findings;
}

// Predicate 2 (residual invariant): the basenames present in BOTH `scripts/` and
// the distribution canon. Three-state semantics (BR-3): scripts-only -> [] (green,
// pre-move), canon-only -> [] (green, post-move), both-present -> non-empty (red,
// copy residue). Order-free; pure set intersection.
export function findDuplicatedAssets(scriptsBasenames: ReadonlyArray<string>, canonicalBasenames: ReadonlyArray<string>): string[] {
  const canon = new Set(canonicalBasenames);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const name of scriptsBasenames) {
    if (canon.has(name) && !seen.has(name)) {
      seen.add(name);
      dupes.push(name);
    }
  }
  return dupes;
}
