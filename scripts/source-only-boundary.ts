#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SELF_INSTALL_ALLOWLIST,
  sourceOnlyGeneratedPathPredicate,
} from "../packages/framework/core/tools/data/self-install-allowlist.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IS_SOURCE_ONLY_GENERATED_PATH = sourceOnlyGeneratedPathPredicate(SELF_INSTALL_ALLOWLIST);

export type BoundaryVerdict =
  | { readonly kind: "clean" }
  | { readonly kind: "violation"; readonly trackedGenerated: readonly string[] };

export function evaluateTrackedBoundary(
  trackedPaths: readonly string[],
  predicate: (path: string) => boolean = IS_SOURCE_ONLY_GENERATED_PATH,
): BoundaryVerdict {
  const trackedGenerated = trackedPaths.filter(predicate).sort();
  return trackedGenerated.length === 0
    ? { kind: "clean" }
    : { kind: "violation", trackedGenerated };
}

export function trackedGitFiles(projectDir: string): readonly string[] {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: projectDir,
    encoding: "buffer",
  });
  if (result.status !== 0) {
    const detail = result.stderr.toString("utf-8").trim();
    throw new Error(`git ls-files failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout
    .toString("utf-8")
    .split("\0")
    .filter(Boolean);
}

export function sourceOnlyBoundaryMain(projectDir: string = REPO_ROOT): number {
  let verdict: BoundaryVerdict;
  try {
    verdict = evaluateTrackedBoundary(trackedGitFiles(projectDir));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (verdict.kind === "clean") {
    console.log("source-only boundary: clean");
    return 0;
  }
  console.error(
    `source-only boundary violated — ${verdict.trackedGenerated.length} generated file(s) are tracked:`,
  );
  for (const path of verdict.trackedGenerated) console.error(`  ${path}`);
  return 1;
}

if (import.meta.main) process.exit(sourceOnlyBoundaryMain());
