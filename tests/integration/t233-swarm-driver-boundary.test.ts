// covers: module:amadeus-swarm-driver-boundary, requirement:FR-05, requirement:FR-18, requirement:FR-20
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const TOOLS = join(REPO_ROOT, "packages", "framework", "core", "tools");

function source(name: string): string {
  return readFileSync(join(TOOLS, name), "utf-8");
}

function localImports(name: string): readonly string[] {
  return [...source(name).matchAll(/from\s+["']\.\/([^"']+\.ts)["']/g)].map((match) =>
    basename(match[1]),
  );
}

function transitiveImports(roots: readonly string[]): ReadonlySet<string> {
  const visited = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const imported of localImports(current)) {
      try {
        source(imported);
        pending.push(imported);
      } catch {
        // Provider subdirectories are outside the C-01/C-11 shared-boundary check.
      }
    }
  }
  return visited;
}

describe("t233 swarm driver architecture boundary", () => {
  test("keeps C-01 driver lifecycle and C-11 referee free of direct imports", () => {
    const driverFiles = [
      "amadeus-swarm-driver-lifecycle.ts",
      "amadeus-swarm-driver-store.ts",
      "amadeus-swarm-driver-supervisor.ts",
      "amadeus-swarm-driver-runtime.ts",
      "amadeus-swarm-driver.ts",
    ];
    const refereeFiles = ["amadeus-swarm-referee-finalize.ts", "amadeus-swarm.ts"];
    for (const file of driverFiles) {
      const body = source(file);
      expect(body).not.toMatch(/from\s+["'][^"']*amadeus-swarm-referee-finalize/);
      expect(body).not.toMatch(/from\s+["'][^"']*amadeus-swarm\.ts/);
    }
    for (const file of refereeFiles) {
      expect(source(file)).not.toMatch(
        /from\s+["'][^"']*amadeus-swarm-driver-(?:lifecycle|store|supervisor|runtime)(?:\.ts)?["']/,
      );
    }
  });

  test("keeps the C-11 transitive import closure out of C-01 private modules", () => {
    const closure = transitiveImports([
      "amadeus-swarm.ts",
      "amadeus-swarm-referee-finalize.ts",
      "amadeus-armed-process.ts",
    ]);
    const c01Private = [
      "amadeus-swarm-driver-lifecycle.ts",
      "amadeus-swarm-driver-store.ts",
      "amadeus-swarm-driver-supervisor.ts",
      "amadeus-swarm-driver-runtime.ts",
      "amadeus-swarm-driver.ts",
    ];
    expect(c01Private.filter((file) => closure.has(file))).toEqual([]);
  });

  test("assembles exactly three provider modules through static imports", () => {
    const runtime = source("amadeus-swarm-driver-runtime.ts");
    const imports = [...runtime.matchAll(/from\s+["']\.\/amadeus-swarm-driver-adapters\/(claude|codex|kiro)\.ts["']/g)]
      .map((match) => match[1])
      .sort();
    expect(imports).toEqual(["claude", "codex", "kiro"]);
    expect(runtime).not.toMatch(/\bimport\s*\(/);
    expect(runtime).toContain("DriverRegistrationSet.build([");
    expect(runtime).toContain("for (const driver of NATIVE_DRIVER_VALUES)");
  });

  test("does not discover plugins dynamically or add network and runtime dependencies", () => {
    const boundary = [
      "amadeus-swarm-driver-runtime.ts",
      "amadeus-swarm-driver-adapters/claude.ts",
      "amadeus-swarm-driver-adapters/codex.ts",
      "amadeus-swarm-driver-adapters/kiro.ts",
    ].map(source).join("\n");
    const forbiddenCalls = ["fet" + "ch", "Web" + "Socket", "create" + "Connection", "readdir" + "Sync", "glob" + "Sync"];
    expect(boundary).not.toMatch(new RegExp(`\\b(?:${forbiddenCalls.join("|")})\\s*\\(`));
    expect(boundary).not.toMatch(/\bimport\s*\(/);
    expect(boundary).not.toContain("node_modules");
  });

  test("guards both irreversible merge primitives with claim, fencing, and arm", () => {
    const bolt = source("amadeus-bolt.ts");
    const worktree = source("amadeus-worktree.ts");
    const referee = source("amadeus-swarm.ts");
    for (const primitive of [bolt, worktree]) {
      expect(primitive).toContain("validateFinalizeOperationClaim");
      expect(primitive).toContain('flags["operation-id"]');
      expect(primitive).toContain('flags["claim-file"]');
      expect(primitive).toContain('flags["fencing-token"]');
    }
    expect(referee).toContain("executeArmedProcess");
    expect(referee).toContain('stdin: "closed"');
    expect(referee).toContain("fencingToken: operation.fencingToken");
  });

  test("shares only neutral canonical, finalize-contract, claim, and armed-process primitives", () => {
    const referee = source("amadeus-swarm.ts");
    expect(referee).toContain('from "./amadeus-armed-process.ts"');
    expect(source("amadeus-swarm-driver-supervisor.ts")).toContain(
      'export * from "./amadeus-armed-process.ts"',
    );
    expect(source("amadeus-swarm-finalize-contract.ts")).not.toMatch(/from\s+["']\.\/amadeus-swarm-driver-/);
  });
});
