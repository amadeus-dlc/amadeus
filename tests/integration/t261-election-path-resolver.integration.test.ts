// t261 — election-path-resolver real-FS contract tests.
// The registry is the ONLY path to an election directory: resolveElectionDir
// returns the indexed physical directory or throws. There is no direct-name
// fallback — an election absent from the registry is not reachable.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendElectionToRegistry,
  electionsRegistryPath,
  resolveElectionDir,
  type ElectionRegistryEntry,
} from "../../packages/framework/core/tools/amadeus-election-store";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-path-resolver-"));
});

afterEach(() => {
  mock.restore();
  rmSync(root, { recursive: true, force: true });
});

function row(electionId: string, dirName: string): ElectionRegistryEntry {
  return {
    electionId,
    dirName,
    createdAt: "2026-07-23T00:00:00Z",
    status: "open",
  };
}

describe("resolveElectionDir", () => {
  test("registry hit resolves the indexed physical directory", () => {
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    expect(resolveElectionDir(root, "E-A")).toBe(join(root, "260723-e-a"));
  });

  test("registry lookup is exact and does not bind a sibling row", () => {
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    expect(() => resolveElectionDir(root, "E-AA")).toThrow("election not in registry: E-AA");
  });

  test("an unindexed directory carrying the election id is NOT reachable", () => {
    mkdirSync(join(root, "E-UNINDEXED"));
    expect(() => resolveElectionDir(root, "E-UNINDEXED")).toThrow(
      "election not in registry: E-UNINDEXED",
    );
  });

  test("registry miss with an unindexed same-id directory present still throws", () => {
    expect(appendElectionToRegistry(root, row("E-NEW", "260723-e-new")).ok).toBe(true);
    mkdirSync(join(root, "E-OLD"));
    expect(() => resolveElectionDir(root, "E-OLD")).toThrow("election not in registry: E-OLD");
  });

  test("absent registry and absent directory throws loudly", () => {
    expect(() => resolveElectionDir(root, "E-MISSING")).toThrow(
      "election not in registry: E-MISSING",
    );
  });

  test("corrupt registry fails closed even when a same-id directory exists", () => {
    mkdirSync(join(root, "E-LEGACY"));
    writeFileSync(electionsRegistryPath(root), "{broken");
    expect(() => resolveElectionDir(root, "E-LEGACY")).toThrow(
      "elections registry corrupt: elections.json is not valid JSON",
    );
  });

  test("the indexed dirName wins over a same-id directory sitting beside it", () => {
    mkdirSync(join(root, "E-A"));
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    expect(resolveElectionDir(root, "E-A")).toBe(join(root, "260723-e-a"));
  });
});
