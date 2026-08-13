// covers: harness-instrument:coverage-patch-gate
//
// t537 (process boundary) — the declared-class check as CI actually runs it
// (#1622). The unit sibling t536 pins the predicate against hand-written
// sources; this file drives `--check` through the AMADEUS_PATCH_* seams against
// temp fixtures, and sweeps the real ledger.
//
// Two sides are measured, because only one of them is a proof. That a wrong
// declaration turns the gate red is the falling proof; that the repository's own
// ledger stays green is the evidence the check is not simply rejecting
// everything.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSemanticSelector,
  findSyntaxClassMismatches,
  parseAllowlist,
  runCheck,
} from "../coverage-patch-gate.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = join(REPO_ROOT, "tests", ".coverage-patch-allowlist.json");
const GATE = join(REPO_ROOT, "tests", "coverage-patch-gate.ts");

const FIXTURE_SOURCE = [
  "export function read(load: (p: string) => string, path: string): string {",
  "  try {",
  "    return load(path);",
  "  } catch {",
  "    return '';",
  "  }",
  "}",
  "",
].join("\n");

describe("t537 the real ledger under the declared-class check", () => {
  const entries = parseAllowlist(readFileSync(LEDGER, "utf8"));
  const sources = new Map<string, string>();
  for (const entry of entries) {
    if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(REPO_ROOT, entry.file), "utf8"));
  }

  test("every declared class matches the code it resolves to", () => {
    expect(findSyntaxClassMismatches(entries, sources)).toEqual([]);
  });

  test("the sweep runs against declarations that actually exist", () => {
    // Without this the assertion above would also hold for a ledger that
    // declared nothing at all, and would keep holding as the ratchet advanced.
    expect(entries.filter((e) => e.selector.class !== undefined).length).toBeGreaterThan(0);
  });

  test("two sweeps of the ledger are byte-identical", () => {
    expect(JSON.stringify(findSyntaxClassMismatches(entries, sources))).toBe(
      JSON.stringify(findSyntaxClassMismatches(entries, sources)),
    );
  });

  // NFR-1, the half that no execution can demonstrate: a verdict that consulted
  // a model or a remote service would not be reproducible at all.
  test("the gate reaches for nothing but the filesystem, git, and the TypeScript parser", () => {
    const imports = [...readFileSync(GATE, "utf8").matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    expect(imports).toEqual(["node:child_process", "node:crypto", "node:fs", "node:path", "node:url", "typescript"]);
  });
});

describe("t537 process boundary: --check via AMADEUS_PATCH_* seams", () => {
  const SEAMS = ["AMADEUS_PATCH_LCOV", "AMADEUS_PATCH_DIFF", "AMADEUS_PATCH_BASE_REF", "AMADEUS_PATCH_ALLOWLIST"];
  const saved = new Map(SEAMS.map((k) => [k, process.env[k]]));
  const tmps: string[] = [];

  afterEach(() => {
    for (const k of SEAMS) {
      const v = saved.get(k);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function tempDir(prefix: string): string {
    const d = mkdtempSync(join(tmpdir(), prefix));
    tmps.push(d);
    return d;
  }

  /** The repository under check stays clean; the gate's inputs live elsewhere. */
  function fixtureRepo(): string {
    const repo = tempDir("declared-class-repo-");
    for (const args of [["init"], ["config", "user.email", "t537@example.invalid"], ["config", "user.name", "t537"]]) {
      expect(spawnSync("git", args, { cwd: repo, encoding: "utf8" }).status).toBe(0);
    }
    writeFileSync(join(repo, "tracked.ts"), FIXTURE_SOURCE);
    expect(spawnSync("git", ["add", "tracked.ts"], { cwd: repo, encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["commit", "-m", "test: seed fixture"], { cwd: repo, encoding: "utf8" }).status).toBe(0);

    const inputs = tempDir("declared-class-inputs-");
    writeFileSync(join(inputs, "lcov.info"), "SF:tracked.ts\nDA:3,0\nDA:5,0\nend_of_record\n");
    writeFileSync(join(inputs, "pr.diff"), "");
    process.env.AMADEUS_PATCH_LCOV = join(inputs, "lcov.info");
    process.env.AMADEUS_PATCH_DIFF = join(inputs, "pr.diff");
    process.env.AMADEUS_PATCH_ALLOWLIST = join(inputs, "allowlist.json");
    inputsFor.set(repo, inputs);
    return repo;
  }

  const inputsFor = new Map<string, string>();

  // The ledger is JSON on disk, so an invalid class is just a value to write.
  function writeLedger(repo: string, cls: string | undefined, lines = "5"): void {
    const selector = createSemanticSelector("tracked.ts", FIXTURE_SOURCE, lines);
    const entry = {
      file: "tracked.ts",
      selector: cls === undefined ? selector : { ...selector, class: cls },
      reason: "defensive catch arm",
    };
    writeFileSync(join(inputsFor.get(repo) as string, "allowlist.json"), JSON.stringify([entry]));
  }

  function check(repoRoot: string): { code: number; stderr: string } {
    const stderr: string[] = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...args: unknown[]) => stderr.push(args.map(String).join(" "));
    console.log = () => {};
    try {
      return { code: runCheck(repoRoot), stderr: stderr.join("\n") };
    } finally {
      console.error = originalError;
      console.log = originalLog;
    }
  }

  test("a declaration the code contradicts turns the gate red", () => {
    const d = fixtureRepo();
    writeLedger(d, "type-only");
    const red = check(d);
    expect(red.code).toBe(1);
    expect(red.stderr).toContain("declared selector.class no longer matches");
    expect(red.stderr).toContain("declares type-only but the lines are catch-arm");
  });

  test("the same entry declaring what the code is passes", () => {
    const d = fixtureRepo();
    writeLedger(d, "catch-arm");
    expect(check(d).code).toBe(0);
  });

  // The floor (#2901): the fixture range is a catch arm, so leaving it
  // undeclared is no longer the ledger predating the field — it is a decidable
  // range dodging the ratchet, and the gate says exactly what to add.
  test("an entry declaring nothing on a decidable range turns the gate red", () => {
    const d = fixtureRepo();
    writeLedger(d, undefined);
    const red = check(d);
    expect(red.code).toBe(1);
    expect(red.stderr).toContain("the ratchet floor");
    expect(red.stderr).toContain('add "class": "catch-arm"');
  });

  test("an entry declaring nothing on an unclassifiable range passes", () => {
    const d = fixtureRepo();
    // Line 3 is a plain statement inside the try block: no decidable class.
    writeLedger(d, undefined, "3");
    expect(check(d).code).toBe(0);
  });

  test("a class outside the vocabulary is rejected before any check runs", () => {
    const d = fixtureRepo();
    writeLedger(d, "spawn-only");
    expect(() => check(d)).toThrow(/malformed allowlist entry/);
  });
});
