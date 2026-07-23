// t261 — U2 election-path-resolver real-FS contract tests.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendElectionToRegistry,
  electionsRegistryPath,
  resolveElectionDir,
  type ElectionRegistryEntry,
} from "../../scripts/amadeus-election-store";

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
    expect(resolveElectionDir(root, "E-A")).toEqual({
      kind: "registry",
      dir: join(root, "260723-e-a"),
    });
  });

  test("registry lookup is exact and does not bind a sibling row", () => {
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    expect(() => resolveElectionDir(root, "E-AA")).toThrow("election not in registry: E-AA");
  });

  test("absent registry permits an existing direct-name legacy directory and warns", () => {
    mkdirSync(join(root, "E-LEGACY"));
    const warn = spyOn(console, "error").mockImplementation(() => undefined);
    expect(resolveElectionDir(root, "E-LEGACY")).toEqual({
      kind: "legacy-unmigrated",
      dir: join(root, "E-LEGACY"),
    });
    expect(warn).toHaveBeenCalledWith("unmigrated election E-LEGACY — legacy path(移行前)");
  });

  test("registry miss permits an existing direct-name legacy directory and warns", () => {
    expect(appendElectionToRegistry(root, row("E-NEW", "260723-e-new")).ok).toBe(true);
    mkdirSync(join(root, "E-OLD"));
    const warn = spyOn(console, "error").mockImplementation(() => undefined);
    expect(resolveElectionDir(root, "E-OLD").kind).toBe("legacy-unmigrated");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test("registry miss and absent legacy directory throws loudly", () => {
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    expect(() => resolveElectionDir(root, "E-MISSING")).toThrow(
      "election not in registry: E-MISSING",
    );
  });

  test("absent registry and absent legacy directory throws loudly", () => {
    expect(() => resolveElectionDir(root, "E-MISSING")).toThrow(
      "election not in registry: E-MISSING",
    );
  });

  test("corrupt registry fails closed even when a legacy directory exists", () => {
    mkdirSync(join(root, "E-LEGACY"));
    writeFileSync(electionsRegistryPath(root), "{broken");
    expect(() => resolveElectionDir(root, "E-LEGACY")).toThrow(
      "elections registry corrupt: elections.json is not valid JSON",
    );
  });

  test("registry hit wins over a same-id legacy directory without warning", () => {
    mkdirSync(join(root, "E-A"));
    expect(appendElectionToRegistry(root, row("E-A", "260723-e-a")).ok).toBe(true);
    const warn = spyOn(console, "error").mockImplementation(() => undefined);
    expect(resolveElectionDir(root, "E-A").dir).toBe(join(root, "260723-e-a"));
    expect(warn).not.toHaveBeenCalled();
  });
});
