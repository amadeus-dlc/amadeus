// covers: function:runCheck function:runUpdate function:main function:scanRepository function:listSourceFiles
//
// U4 (cast-guard) — the unchecked-cast guard's CLI surface (#1980, FR-3a/3c).
//
// Driven IN PROCESS (not through a spawned CLI) so the wiring lines are
// measured: bun --coverage does not instrument a spawned subprocess
// (cid:code-generation:bun-coverage-spawn-blindspot). The allowlist and report
// paths are injectable for exactly that reason — a test must never rewrite the
// committed allowlist.
//
// The `census` seam carries the falling proof (FR-3c face A): a ratchet whose
// rejecting arm is never observed is not a ratchet. Producing a NEW_CAST from
// the live corpus would mean writing a violation into product source on every
// test run; the seam buys the same evidence without that.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ALLOWLIST_PATH,
  SCAN_ROOTS,
  buildCensus,
  detectUncheckedCasts,
  listSourceFiles,
  main,
  renderAllowlist,
  runCheck,
  runUpdate,
  scanRepository,
  totalSites,
} from "../unchecked-cast-guard.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// Runs the gate with console.error captured, so a test can pin WHY the gate
// exited and not merely that it did.
function capturingStderr(run: () => number): { code: number; stderr: string } {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    return { code: run(), stderr: lines.join("\n") };
  } finally {
    console.error = original;
  }
}

const scratch: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "unchecked-cast-guard-"));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop() as string, { recursive: true, force: true });
});

describe("the scanned corpus", () => {
  test("the scope is the product source of truth, not its projections", () => {
    // dist/ and the self-install harness copies are projections of core: fixing
    // core fixes them by construction, and scanning both would double-count.
    expect([...SCAN_ROOTS]).toEqual(["packages/framework/core", "scripts"]);
  });

  test("file enumeration takes .ts only, skips vendored trees, and is ordered", () => {
    const files = listSourceFiles("packages/framework/core");

    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.endsWith(".ts"))).toBe(true);
    expect(files.some((f) => f.includes("/node_modules/") || f.includes("/vendor/"))).toBe(false);
    expect([...files]).toEqual([...files].sort());
  });

  test("the committed allowlist matches the live corpus (no drift)", () => {
    expect(runCheck({})).toBe(0);
  });

  test("the corpus is non-empty, and the detector that says so is not vacuous", () => {
    // A census and a broken scanner look identical from the count alone, so the
    // live measurement is asserted together with the detector's non-vacuity
    // against planted source.
    const live = scanRepository();
    expect(live.length).toBeGreaterThan(0);

    const planted = detectUncheckedCasts(
      "packages/framework/core/tools/planted.ts",
      ["const x = 1;", 'const doc = JSON.parse(readFileSync(p, "utf-8")) as StateDoc;'].join("\n"),
    );
    expect(planted).toEqual([{ file: "packages/framework/core/tools/planted.ts", line: 2, kind: "json-parse-as" }]);
  });

  test("the real multi-line and nested-paren shapes are caught, not just tidy ones", () => {
    // The pure-core test exercises these STRUCTURES against synthetic fixtures,
    // but its file must stay free of fs tokens (the size classifier reads string
    // literals too). So the verbatim shapes — the ones ADR-2 measured a line
    // regex recalling at 27% — are pinned here, where fs is already in scope.
    const nested = detectUncheckedCasts(
      "packages/framework/core/tools/planted.ts",
      'const doc = JSON.parse(readFileSync(path, "utf-8")) as RuntimeGraph;',
    );
    expect(nested.length).toBe(1);

    const spread = detectUncheckedCasts(
      "packages/framework/core/tools/planted.ts",
      ["const doc = JSON.parse(", '  readFileSync(path, "utf-8"),', ") as RuntimeGraph;"].join("\n"),
    );
    expect(spread).toEqual([
      { file: "packages/framework/core/tools/planted.ts", line: 1, kind: "json-parse-as" },
    ]);

    // And the live corpus really does hold sites whose `as` sits on a different
    // line from its `JSON.parse` — the detector is not quietly passing because
    // the tree happens to contain only tidy single-line ones. The count is NOT
    // pinned here: this debt is meant to shrink, and a pinned total would turn
    // every removal into a red test.
    const multiLine = scanRepository().filter((site) => {
      const source = readFileSync(join(REPO_ROOT, site.file), "utf-8").split("\n");
      return !(source[site.line - 1] ?? "").includes(" as ");
    });
    expect(multiLine.length).toBeGreaterThan(0);
  });

  test("ledger keys are repository-relative, so one file cannot occupy two entries", () => {
    const census = buildCensus(scanRepository());
    const keys = Object.keys(census);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((k) => k.startsWith("/"))).toBe(false);
    expect(keys.every((k) => k.startsWith("packages/framework/core/") || k.startsWith("scripts/"))).toBe(true);
  });
});

describe("runCheck — verdicts and the residual report", () => {
  test("a census larger than the allowlist is rejected, and the report still lands", () => {
    // FR-3c face A: the falling proof, kept standing. An empty allowlist cannot
    // admit a census that holds a site.
    const dir = tempDir();
    const allowlist = join(dir, "allowlist.json");
    const report = join(dir, "residual.json");
    writeFileSync(allowlist, renderAllowlist({}), "utf-8");

    const code = runCheck({
      allowlistPath: allowlist,
      reportPath: report,
      census: { "packages/framework/core/tools/planted.ts": { "json-parse-as": 1 } },
    });

    expect(code).toBe(1);
    const parsed = JSON.parse(readFileSync(report, "utf-8"));
    expect(parsed.total).toBe(1);
    expect(typeof parsed.generatedAt).toBe("string");
  });

  test("one more cast in an already-listed file is rejected too", () => {
    const dir = tempDir();
    const allowlist = join(dir, "allowlist.json");
    writeFileSync(allowlist, renderAllowlist({ "scripts/x.ts": { "json-parse-as": 1 } }), "utf-8");

    expect(
      runCheck({ allowlistPath: allowlist, census: { "scripts/x.ts": { "json-parse-as": 2 } } }),
    ).toBe(1);
  });

  test("an over-counting allowlist passes — shrinkage is the allowed direction", () => {
    const dir = tempDir();
    const allowlist = join(dir, "allowlist.json");
    const inflated = { ...buildCensus(scanRepository()), "scripts/gone.ts": { "json-parse-as": 5 } };
    writeFileSync(allowlist, renderAllowlist(inflated), "utf-8");

    expect(runCheck({ allowlistPath: allowlist })).toBe(0);
  });

  test("a missing allowlist fails closed", () => {
    // The ledger is read BEFORE the scan, so deleting it cannot buy a pass on a
    // clean tree — the verdict is reached without ever looking at the corpus.
    expect(runCheck({ allowlistPath: join(tempDir(), "absent.json") })).toBe(1);
  });

  test("a malformed allowlist fails closed rather than passing vacuously", () => {
    // Exit 1 alone does not prove fail-closed: a ledger parsed into an EMPTY
    // one also exits 1, via NEW_CAST, because every live site then looks new.
    // That verdict says "the source regressed" about a tree that did not, so
    // the reason is asserted alongside the code — otherwise a broken ledger
    // could satisfy this test while the fail-closed contract is broken.
    const dir = tempDir();
    const cases: readonly { readonly name: string; readonly body: string }[] = [
      { name: "not JSON at all", body: "{ not json" },
      { name: "a JSON array, not an object", body: "[]" },
      { name: "JSON null", body: "null" },
      { name: "the wrong ratchet direction", body: JSON.stringify({ direction: "grow-ok", sites: {} }) },
      { name: "no sites map", body: JSON.stringify({ direction: "shrink-only" }) },
      { name: "sites as an array", body: JSON.stringify({ direction: "shrink-only", sites: [] }) },
      { name: "a site entry that is not a map", body: JSON.stringify({ direction: "shrink-only", sites: { "a.ts": 3 } }) },
      {
        name: "a fractional count",
        body: JSON.stringify({ direction: "shrink-only", sites: { "a.ts": { "json-parse-as": 1.5 } } }),
      },
      {
        name: "a negative count",
        body: JSON.stringify({ direction: "shrink-only", sites: { "a.ts": { "json-parse-as": -1 } } }),
      },
      {
        name: "a count that is not a number",
        body: JSON.stringify({ direction: "shrink-only", sites: { "a.ts": { "json-parse-as": "2" } } }),
      },
    ];

    for (const { name, body } of cases) {
      const path = join(dir, `${name.replace(/\W+/g, "-")}.json`);
      writeFileSync(path, body, "utf-8");
      const { code, stderr } = capturingStderr(() => runCheck({ allowlistPath: path }));

      expect(`${name}: ${code}`).toBe(`${name}: 1`);
      expect(`${name}: ${stderr}`).toContain("ALLOWLIST_UNREADABLE");
      expect(`${name}: ${stderr}`).not.toContain("NEW_CAST");
    }
  });

  test("an unreadable ledger fails closed even when the census would have passed", () => {
    // Fail-closed is about ORDER: an empty census is the most passable input
    // there is, and it still cannot rescue a ledger that could not be read.
    expect(runCheck({ allowlistPath: join(tempDir(), "absent.json"), census: {} })).toBe(1);
  });
});

describe("runUpdate — regenerating the ledger", () => {
  test("writes the freshly scanned census, and the ledger it wrote then passes", () => {
    // Self-consistency: --update must not be able to emit something --check
    // rejects, or the documented recovery path would be a dead end.
    const path = join(tempDir(), "written.json");

    expect(runUpdate(path)).toBe(0);

    const doc = JSON.parse(readFileSync(path, "utf-8"));
    expect(doc.direction).toBe("shrink-only");
    expect(doc.total).toBe(totalSites(buildCensus(scanRepository())));
    expect(runCheck({ allowlistPath: path })).toBe(0);
  });

  test("the committed ledger is byte-identical to a fresh regeneration", () => {
    // The ledger in the tree is the scan's output, not a hand-maintained list.
    expect(readFileSync(ALLOWLIST_PATH, "utf-8")).toBe(renderAllowlist(buildCensus(scanRepository())));
  });
});

describe("main — argument handling", () => {
  test("--check against the committed allowlist passes", () => {
    expect(main(["--check"])).toBe(0);
  });

  test("unknown or malformed arguments are a usage error, not a silent pass", () => {
    expect(main([])).toBe(2);
    expect(main(["--nope"])).toBe(2);
    expect(main(["--check", "--report"])).toBe(2);
    expect(main(["--update", "--report", "x"])).toBe(2);
  });

  test("the census seam is unreachable from argv — the CLI only ever measures", () => {
    // A flag that let a caller hand the gate its own numbers would end the
    // guard's meaning. The seam exists for tests and has no argv spelling.
    expect(main(["--check", "--census", "{}"])).toBe(2);
  });

  test("--check --report <path> writes the residual report", () => {
    const path = join(tempDir(), "residual.json");

    expect(main(["--check", "--report", path])).toBe(0);

    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.total).toBe(totalSites(buildCensus(scanRepository())));
    expect(typeof parsed.generatedAt).toBe("string");
  });

  test("an unexpected error is reported and fails closed rather than escaping", () => {
    // An unwritable report path makes writeFileSync throw inside runCheck; main
    // must translate that into exit 1, not an unhandled stack trace.
    expect(main(["--check", "--report", join(tempDir(), "no-such-dir", "residual.json")])).toBe(1);
  });
});
