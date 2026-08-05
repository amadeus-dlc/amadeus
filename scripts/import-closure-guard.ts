// scripts/import-closure-guard.ts — C8 ImportClosureGuard (U6, FR-011).
//
// The composed runtime of a plugin carries exactly the files its plugin.json
// declares. A module that is reachable by a relative import from a declared
// tool but is itself undeclared becomes a missing import in the composed host —
// a defect the packager's existing checks (which only validate DECLARED files)
// cannot see. This guard closes that class: it walks the transitive relative
// import closure from the declared tool entrypoints and fails the projection
// when the closure is not covered by the manifest and the plugin's owned paths.
//
// RESPONSIBILITY SPLIT (see the unit's security design). This module is pure:
// it owns POSIX string normalization of import specifiers and the repo-root
// boundary judgement, and it reaches the filesystem only through the injected
// `readFile`. Resolving symlinks to their real target — the escape a string
// normalizer structurally cannot see — belongs to the concrete filesystem
// adapter that supplies `readFile` (scripts/plugin-projection.ts), which returns
// null for a reference whose realpath leaves the repo root so the escape lands
// in this module's `unreadable` enumeration.
//
// FAIL-CLOSED: there is no allowlist, skip list, or exception hatch. A module in
// the closure passes only by being declared in the manifest and owned by the
// plugin; an unresolvable reference is enumerated as a failure, never silently
// dropped from the closure.
//
// `RepoPath` is a repo-root-relative POSIX path. It is deliberately a plain
// string alias rather than a branded type: the failure arrays must be able to
// carry references that failed the boundary parse (an escaping or absolute
// specifier is by definition not a valid repo path), so a brand would be cast
// away at the exact boundary it claims to protect.

import { posix } from "node:path";
import type { PluginManifest } from "../packages/framework/core/tools/amadeus-plugin-compose.ts";

export type RepoPath = string;

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

// The single failure type both seams return. Every array is fully enumerated
// (never truncated to the first offender) so one build failure lists the whole
// repair set.
export type ClosureFailure = {
  readonly kind: "closure-failure";
  readonly unreadable: readonly RepoPath[];
  readonly missingFromManifest: readonly RepoPath[];
  readonly missingFromOwnedPaths: readonly RepoPath[];
};

export type ClosureProof = {
  readonly kind: "closure-proof";
  readonly closure: readonly RepoPath[];
};

// Read seam: repo-relative path in, file text out, null for anything the adapter
// refuses to read (absent, unreadable, or resolving outside the repo root).
export type ReadRepoFile = (path: RepoPath) => string | null;

function ok<T>(value: T): Result<T, ClosureFailure> {
  return { ok: true, value };
}

function fail(parts: Partial<Omit<ClosureFailure, "kind">>): Result<never, ClosureFailure> {
  return {
    ok: false,
    error: {
      kind: "closure-failure",
      unreadable: parts.unreadable ?? [],
      missingFromManifest: parts.missingFromManifest ?? [],
      missingFromOwnedPaths: parts.missingFromOwnedPaths ?? [],
    },
  };
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

// Boundary parse for a repo-relative POSIX path. Returns the normalized path, or
// null when the input is empty, absolute (POSIX or Windows drive), or resolves
// above the repo root. Callers treat null as "not a repo path" and enumerate the
// offending reference verbatim.
export function normalizeRepoPath(raw: string): RepoPath | null {
  if (raw === "" || raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) return null;
  const normalized = posix.normalize(raw);
  if (normalized === "" || normalized === "." || normalized === "..") return null;
  if (normalized.startsWith("../") || normalized.startsWith("/")) return null;
  return normalized;
}

// A relative specifier is the only kind this guard resolves. A bare specifier
// ("node:crypto", "zod") is resolved by the runtime from outside the repo tree
// and is out of closure scope; an absolute specifier is a boundary violation.
function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function isAbsoluteSpecifier(specifier: string): boolean {
  return specifier.startsWith("/") || /^[A-Za-z]:/.test(specifier);
}

// Every static/dynamic module reference form the plugin sources use:
// `from "x"`, `import "x"`, `import("x")`, `require("x")`. One alternation with
// no nested quantifier, so matching stays linear in the source length.
const MODULE_REFERENCE_RE = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*(["'])([^"'\n]*)\1/g;

// The raw module specifiers referenced by `source`, in source order.
export function extractModuleSpecifiers(source: string): readonly string[] {
  const out: string[] = [];
  for (const match of source.matchAll(MODULE_REFERENCE_RE)) out.push(match[2]);
  return out;
}

// Resolve one specifier against the importing file. Returns the normalized repo
// path, or the rejected reference (as a string) when it is not a repo path.
type Resolution =
  | { readonly kind: "resolved"; readonly path: RepoPath }
  | { readonly kind: "rejected"; readonly reference: string }
  | { readonly kind: "out-of-scope" };

function resolveSpecifier(importer: RepoPath, specifier: string): Resolution {
  if (isAbsoluteSpecifier(specifier)) return { kind: "rejected", reference: specifier };
  if (!isRelativeSpecifier(specifier)) return { kind: "out-of-scope" };
  const joined = posix.join(posix.dirname(importer), specifier);
  const path = normalizeRepoPath(joined);
  return path === null ? { kind: "rejected", reference: joined } : { kind: "resolved", path };
}

// Walk the transitive relative-import closure from `entrypoints`. The returned
// closure includes the entrypoints themselves and is sorted. Any entrypoint or
// referenced module that cannot be read, or whose specifier leaves the repo
// root, is enumerated in `unreadable` — the closure is never quietly shrunk.
export function resolveImportClosure(
  entrypoints: readonly RepoPath[],
  readFile: ReadRepoFile,
): Result<readonly RepoPath[], ClosureFailure> {
  const visited = new Set<RepoPath>();
  const unreadable: string[] = [];
  const queue: RepoPath[] = [];

  for (const raw of entrypoints) {
    const path = normalizeRepoPath(raw);
    if (path === null) unreadable.push(raw);
    else queue.push(path);
  }

  while (queue.length > 0) {
    const current = queue.shift() as RepoPath;
    if (visited.has(current)) continue;
    visited.add(current);
    const source = readFile(current);
    if (source === null) {
      unreadable.push(current);
      visited.delete(current);
      continue;
    }
    for (const specifier of extractModuleSpecifiers(source)) {
      const resolution = resolveSpecifier(current, specifier);
      if (resolution.kind === "rejected") unreadable.push(resolution.reference);
      else if (resolution.kind === "resolved" && !visited.has(resolution.path)) queue.push(resolution.path);
    }
  }

  if (unreadable.length > 0) return fail({ unreadable: sortedUnique(unreadable) });
  return ok(sortedUnique([...visited]));
}

// Check the closure against what the plugin actually ships. `closure` must be
// covered twice over: declared in the manifest (so composition copies it into
// the host) and present in the plugin's owned source paths (so the declaration
// has a file behind it). Both differences are enumerated in full.
export function checkManifestClosure(
  manifest: PluginManifest,
  closure: readonly RepoPath[],
  ownedPaths: readonly RepoPath[],
): Result<ClosureProof, ClosureFailure> {
  const declared = new Set<RepoPath>([
    ...manifest.stages.map((s) => s.path),
    ...manifest.tools.map((t) => t.path),
  ]);
  const owned = new Set<RepoPath>(ownedPaths);
  const missingFromManifest: RepoPath[] = [];
  const missingFromOwnedPaths: RepoPath[] = [];
  for (const path of closure) {
    if (!declared.has(path)) missingFromManifest.push(path);
    if (!owned.has(path)) missingFromOwnedPaths.push(path);
  }
  if (missingFromManifest.length > 0 || missingFromOwnedPaths.length > 0)
    return fail({
      missingFromManifest: sortedUnique(missingFromManifest),
      missingFromOwnedPaths: sortedUnique(missingFromOwnedPaths),
    });
  return ok({ kind: "closure-proof", closure: sortedUnique(closure) });
}

// Render a failure as one diagnostic line per offending reference, prefixed by
// the plugin it belongs to. The projection prints these and exits non-zero.
export function describeClosureFailure(plugin: string, failure: ClosureFailure): readonly string[] {
  const lines: string[] = [];
  for (const p of failure.unreadable) lines.push(`UNREADABLE import in ${plugin}: ${p}`);
  for (const p of failure.missingFromManifest)
    lines.push(`MISSING from ${plugin} plugin.json: ${p}`);
  for (const p of failure.missingFromOwnedPaths)
    lines.push(`MISSING from ${plugin} owned sources: ${p}`);
  return lines.sort();
}
