// Pi's setup and native-package views must derive from one authored catalog.
// covers: scripts/pi-package.ts
// covers: file:package.json
// size: medium

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  buildPiCandidateGraph,
  expectedPiPackageMetadata,
  gitPiSourceIdentity,
  localPiSourceIdentity,
  piCatalogDigest,
  piPackageMetadataProblems,
} from "../../scripts/pi-package.ts";

const ROOT = join(import.meta.dir, "..", "..");

describe("Pi package candidate graph", () => {
  test("binds setup and local/git package views to the same projected bytes", () => {
    const graph = buildPiCandidateGraph(ROOT);
    const rootPackage = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(rootPackage.private).toBe(true);
    expect(rootPackage.pi).toEqual(expectedPiPackageMetadata());
    expect(piPackageMetadataProblems(rootPackage.pi)).toEqual([]);
    expect(graph.package).toEqual(rootPackage.pi);

    for (const resource of graph.resources) {
      expect(graph.setupPaths).toContain(resource.destination);
      const projected = readFileSync(join(ROOT, "dist", "pi", ...resource.destination.split("/")));
      expect(createHash("sha256").update(projected).digest("hex")).toBe(resource.sha256);
    }
    expect(graph.package.extensions).toEqual(["./dist/pi/.pi/extensions/amadeus.ts"]);
    expect(graph.package.skills).toEqual(["./dist/pi/.pi/skills/amadeus"]);
  });

  test("detects package registry delete, add, rename, and path mutation", () => {
    const expected = expectedPiPackageMetadata();
    for (const candidate of [
      undefined,
      { extensions: [], skills: expected.skills },
      { extensions: [...expected.extensions, "./extra.ts"], skills: expected.skills },
      { extensions: ["./dist/pi/.pi/extensions/renamed.ts"], skills: expected.skills },
      { extensions: expected.extensions, skills: ["../escape"] },
      { extensions: expected.extensions, skills: expected.skills, prompts: [] },
    ]) {
      expect(piPackageMetadataProblems(candidate).length).toBeGreaterThan(0);
    }
  });

  test("changes the candidate identity when any catalog resource hash changes", () => {
    const graph = buildPiCandidateGraph(ROOT);
    expect(graph.resources.length).toBeGreaterThan(0);
    const mutated = graph.resources.map((resource, index) => index === 0 ? { ...resource, sha256: "0".repeat(64) } : resource);
    expect(piCatalogDigest(mutated)).not.toBe(graph.catalogDigest);
  });

  test("formal identities require a clean full local revision or credential-free immutable git revision", () => {
    const digest = "d".repeat(64);
    const revision = "a".repeat(40);
    expect(localPiSourceIdentity("/repo", revision, true, digest)).toEqual({
      kind: "formal", source: "local", revision, catalogDigest: digest, locator: "/repo",
    });
    expect(localPiSourceIdentity("/repo", revision, false, digest).kind).toBe("blocked");
    expect(gitPiSourceIdentity("https://github.com/amadeus-dlc/amadeus.git", revision, digest).kind).toBe("formal");
    for (const [locator, ref] of [
      ["https://user:secret@github.com/amadeus-dlc/amadeus.git", revision],
      ["https://github.com//amadeus-dlc/amadeus.git", revision],
      ["https://github.com/amadeus-dlc//amadeus.git", revision],
      ["https://github.com/amadeus-dlc/amadeus.git/", revision],
      ["https://github.com/amadeus-dlc/./amadeus.git", revision],
      ["https://github.com/amadeus-dlc/../amadeus.git", revision],
      ["https://%/amadeus.git", revision],
      ["https://github.com/amadeus-dlc\\amadeus.git", revision],
      ["https://github.com/amadeus-dlc/%2e%2e/amadeus.git", revision],
      ["https://github.com/amadeus-dlc/amadeus.git", "main"],
      ["https://github.com/amadeus-dlc/amadeus.git", "deadbeef"],
    ] as const) {
      expect(gitPiSourceIdentity(locator, ref, digest).kind).toBe("blocked");
    }
  });
});
