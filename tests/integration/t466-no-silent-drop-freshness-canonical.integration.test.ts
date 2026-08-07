// covers: contract:no-silent-drop:identity-only-rebind
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NoSilentDropEvidenceAdapter } from "../../scripts/no-silent-drop-evidence-adapter.ts";
import {
  applyReboundBundle,
  buildReboundBundle,
  EVIDENCE_FRESHNESS_PATHSPECS,
} from "../no-silent-drop/evidence-rebind.ts";

const SOURCE_ROOT = join(import.meta.dir, "../..");
const GATE_PATH = "tests/no-silent-drop-gate.ts";
const ENGINE_PATH = "tests/no-silent-drop/engine.ts";
const CORPUS_PATH = "packages/framework/core/tools/fixture.ts";
const tempRoots: string[] = [];

function must(cwd: string, args: readonly string[]): string {
  const result = spawnSync(args[0] as string, args.slice(1), { cwd, encoding: "utf8", env: process.env });
  if (result.status !== 0) throw new Error(`${args.join(" ")}: ${result.stderr || result.stdout}`);
  return (result.stdout ?? "").trim();
}

/** A repository whose evidence bundle is bound to HEAD, with one file per freshness class. */
function boundRepository(): { root: string; binding: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-freshness-canonical-"));
  tempRoots.push(root);
  mkdirSync(join(root, "tests"), { recursive: true });
  cpSync(join(SOURCE_ROOT, "tests", "no-silent-drop"), join(root, "tests", "no-silent-drop"), { recursive: true });
  writeFileSync(join(root, GATE_PATH), "export const gate = true;\n");
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  writeFileSync(join(root, CORPUS_PATH), "export const scanned = true;\n");
  must(root, ["git", "init", "-q"]);
  must(root, ["git", "config", "user.name", "Evidence Bot"]);
  must(root, ["git", "config", "user.email", "evidence@example.test"]);
  must(root, ["git", "add", "."]);
  must(root, ["git", "commit", "-qm", "base"]);
  const binding = must(root, ["git", "rev-parse", "HEAD"]);
  applyReboundBundle(root, buildReboundBundle(root, binding));
  must(root, ["git", "add", "."]);
  must(root, ["git", "commit", "-qm", "bind evidence"]);
  return { root, binding: must(root, ["git", "rev-parse", "HEAD"]) };
}

function commitChange(root: string, path: string, body: string): string {
  writeFileSync(join(root, path), body);
  must(root, ["git", "add", "--", path]);
  must(root, ["git", "commit", "-qm", `change ${path}`]);
  return must(root, ["git", "rev-parse", "HEAD"]);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("t466 canonical no-silent-drop freshness path set", () => {
  test("is defined once and covers exactly the gate's own implementation", () => {
    expect([...EVIDENCE_FRESHNESS_PATHSPECS]).toEqual([
      ":(glob)tests/no-silent-drop/**/*.ts",
      "tests/no-silent-drop-gate.ts",
    ]);
    const definition = readFileSync(join(SOURCE_ROOT, "tests/no-silent-drop/evidence-rebind.ts"), "utf8");
    expect(definition).toContain(":(glob)tests/no-silent-drop/**/*.ts");
    for (const consumer of [
      "tests/integration/t413-no-silent-drop-ci-adoption.test.ts",
      "scripts/no-silent-drop-evidence-adapter.ts",
    ]) {
      const source = readFileSync(join(SOURCE_ROOT, consumer), "utf8");
      expect(source, consumer).toContain("EVIDENCE_FRESHNESS_PATHSPECS");
      expect(source, consumer).not.toContain(":(glob)tests/no-silent-drop/**/*.ts");
    }
  });

  test("reconcile freshness accepts scanned-corpus drift and rejects gate-implementation drift", () => {
    const corpus = boundRepository();
    const corpusEvent = commitChange(corpus.root, CORPUS_PATH, "export const scanned = false;\n");
    expect(new NoSilentDropEvidenceAdapter(corpus.root).currentBindingIsValidForEvent(corpusEvent)).toBeTrue();

    for (const path of [ENGINE_PATH, GATE_PATH]) {
      const drifted = boundRepository();
      const event = commitChange(drifted.root, path, "// drift\nexport const drifted = true;\n");
      expect(() => new NoSilentDropEvidenceAdapter(drifted.root).currentBindingIsValidForEvent(event), path)
        .toThrow("evidence freshness paths changed");
    }
  });
});
