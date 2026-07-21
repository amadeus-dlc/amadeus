import { isAbsolute, relative, resolve } from "node:path";
import { realpathSync } from "node:fs";
import type { Result } from "./contract.ts";

export interface PathPolicyError { kind: "PathPolicyError"; message: string }

export function validateRepositoryPath(root: string, candidate: string, allowedPrefixes: readonly string[]): Result<string, PathPolicyError> {
  const fail = (message: string): Result<never, PathPolicyError> => ({ ok: false, error: { kind: "PathPolicyError", message } });
  if (!candidate || candidate.includes("\0") || isAbsolute(candidate) || candidate.split(/[\\/]/).includes("..")) return fail("path must be repository relative");
  const lexical = resolve(root, candidate);
  let actual: string;
  try { actual = realpathSync(lexical); } catch { return fail("path does not exist"); }
  const rel = relative(realpathSync(root), actual).replaceAll("\\", "/");
  if (rel.startsWith("../") || rel === "..") return fail("symlink escapes repository");
  if (!allowedPrefixes.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) return fail("path is outside owned allowlist");
  return { ok: true, value: rel };
}
