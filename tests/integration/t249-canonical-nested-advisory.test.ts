// covers: subcommand:amadeus-utility:detect
//
// In-process coverage twin for the CANONICAL amadeus-utility handleDetect
// advisory surface. The primary t249 suites import the shipped dist copy; this
// case drives the canonical source directly so the "multiple nested candidates,
// not auto-selected" text branch (the non-JSON advisory row) is measured on the
// file the patch gate scores. Real temp dirs (node:fs) put it in the
// integration tier.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { handleDetect } from "../../packages/framework/core/tools/amadeus-utility.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
// Canonical tools have no co-located data files (those ship under dist/), so
// point the scope-mapping loader at the shipped data the same way the spawn
// suites do.
const STAGE_GRAPH = join(REPO_ROOT, "dist/claude/.claude/tools/data/stage-graph.json");
const SCOPE_GRID = join(REPO_ROOT, "dist/claude/.claude/tools/data/scope-grid.json");

const temps: string[] = [];
const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  for (const k of ["AMADEUS_STAGE_GRAPH", "AMADEUS_SCOPE_GRID"]) {
    savedEnv.set(k, process.env[k]);
  }
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_SCOPE_GRID = SCOPE_GRID;
});

afterEach(() => {
  for (const [k, v] of savedEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  savedEnv.clear();
  while (temps.length > 0) rmSync(temps.pop()!, { recursive: true, force: true });
});

function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), "t249-canon-nested-"));
  temps.push(dir);
  return dir;
}

function write(root: string, rel: string, body: string): void {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body, "utf-8");
}

function captureStdout(fn: () => void): string {
  const orig = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return out;
}

describe("t249 canonical handleDetect advisory (multiple nested)", () => {
  test("prints the not-auto-selected advisory for two nested candidates", () => {
    const root = tmp();
    write(root, "README.md", "# empty root\n");
    // Two depth-1 projects whose only signal is a non-source manifest keep the
    // root's own language walk empty, so both are nested candidates and none is
    // auto-selected — exercising the human-readable advisory row.
    write(root, "app-a/angular.json", "{}\n");
    write(root, "app-b/angular.json", "{}\n");
    const out = captureStdout(() => handleDetect(root, {}));
    expect(out).toContain("Nested candidates (not auto-selected):");
    expect(out).toContain("app-a");
    expect(out).toContain("app-b");
  });
});
