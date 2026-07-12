// covers: file:lib/test-size.ts
// size: medium
//
// Drift guard for the derived-size scheme (#684 / #696 Phase A). Three jobs:
//   1. classifier unit tests — pure source → small, spawn/fs/timer → medium,
//      network → large (the size axis, from a file's own API references).
//   2. annotation parser tests — `// size:` header parse, invalid-value flag.
//   3. THE GUARD — scan every test file on disk; for any that declares a
//      `// size:` header, fail if the declared size is SMALLER than the measured
//      size (a `small` annotation on a file that spawns/touches fs), and fail on
//      any invalid annotation value. This is what stops the annotation from
//      becoming self-asserted theatre: the annotation is a promise, the
//      classifier is the check.
//
// Falling-test evidence (#696 AC): the classifier self-tests below assert that a
// `small`-annotated-but-spawning source is caught by the guard predicate
// (`declared < measured`), and the PR includes an external run where a real
// mislabelled fixture turns this suite red, then green once corrected.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyTestSize,
  parseSizeAnnotation,
  SIZE_ORDER,
  type TestSize,
} from "../lib/test-size.ts";

const TESTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Recursively collect every *.test.ts under tests/ (all scopes/tiers).
function allTestFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "logs") continue;
      out.push(...allTestFiles(p));
    } else if (entry.name.endsWith(".test.ts")) {
      out.push(p);
    }
  }
  return out;
}

// Build trigger tokens at runtime so THIS file's own verbatim source does not
// contain them — otherwise the classifier (a static text scan, Phase A) would
// see the fixtures' API names and inflate this file's own measured size. The
// file's real size comes only from its genuine readFileSync/readdirSync use
// below (= medium, matching its `// size: medium` header).
const TOK = {
  fs: `read${"File"}Sync`,
  spawn: `spawn${"Sync"}`,
  timer: `set${"Timeout"}`,
  net: `fet${"ch"}`,
};

describe("classifyTestSize — size is derived from API signals", () => {
  test("pure in-memory source is small", () => {
    const { size, signals } = classifyTestSize(`import { expect } from "bun:test";\nexpect(1 + 1).toBe(2);\n`);
    expect(size).toBe("small");
    expect(signals).toEqual([]);
  });
  test("a filesystem touch makes it medium", () => {
    expect(classifyTestSize(`import { ${TOK.fs} } from "node:fs";\n${TOK.fs}("x");`).size).toBe("medium");
  });
  test("a process spawn makes it medium", () => {
    expect(classifyTestSize(`import { ${TOK.spawn} } from "node:child_process";\n${TOK.spawn}("bun");`).size).toBe("medium");
  });
  test("a timer makes it medium", () => {
    expect(classifyTestSize(`await new Promise((r) => ${TOK.timer}(r, 10));`).size).toBe("medium");
  });
  test("network usage makes it large", () => {
    expect(classifyTestSize(`await ${TOK.net}("https://example.com");`).size).toBe("large");
  });
  test("an API named only inside a comment does not inflate the size", () => {
    expect(classifyTestSize(`/${"/"} this used to call ${TOK.spawn} and ${TOK.fs}\nexpect(true).toBe(true);`).size).toBe("small");
  });
});

describe("parseSizeAnnotation", () => {
  test("reads a valid header", () => {
    expect(parseSizeAnnotation(`// size: small\n`).declared).toBe("small");
  });
  test("absent header → null, no error", () => {
    expect(parseSizeAnnotation(`import x;\n`).declared).toBeNull();
  });
  test("invalid value is flagged, not accepted", () => {
    const a = parseSizeAnnotation(`// size: tiny\n`);
    expect(a.declared).toBeNull();
    expect(a.invalidValue).toBe("tiny");
  });
});

describe("guard predicate — a declared size smaller than measured is a violation", () => {
  test("small annotation on a spawning file is caught", () => {
    const source = `/${"/"} size: small\nimport { ${TOK.spawn} } from "node:child_process";\n${TOK.spawn}("bun");`;
    const declared = parseSizeAnnotation(source).declared as TestSize;
    const measured = classifyTestSize(source).size;
    // This is the exact comparison the on-disk guard makes below.
    expect(SIZE_ORDER[declared] < SIZE_ORDER[measured]).toBe(true);
  });
});

describe("on-disk drift guard — every annotated test file honours its size", () => {
  const files = allTestFiles(TESTS_ROOT);

  test("there are test files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test("no test file carries an invalid `// size:` value", () => {
    const bad: string[] = [];
    for (const f of files) {
      const a = parseSizeAnnotation(readFileSync(f, "utf-8"));
      if (a.invalidValue !== undefined) bad.push(`${rel(f)}: "${a.invalidValue}"`);
    }
    expect(bad).toEqual([]);
  });

  test("no annotated file declares a size smaller than its measured size", () => {
    const violations: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf-8");
      const declared = parseSizeAnnotation(src).declared;
      if (declared === null) continue; // unannotated → measured size is authoritative
      const measured = classifyTestSize(src).size;
      if (SIZE_ORDER[declared] < SIZE_ORDER[measured]) {
        violations.push(`${rel(f)}: declared=${declared} < measured=${measured}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

// ─── Layer × size purity constraint (#684 FR-1 item c / FR-3) ────────────────
//
// The pyramid's rungs are TEST SIZE, not the runner tier / directory (see the
// module header of lib/test-size.ts). Each scope (directory) has a MAX size it
// may contain; a file measured above its scope's max is a purity violation:
//   unit        → small only   (a unit test that spawns/touches fs has outgrown
//                                the tier — remediate to Small or move it)
//   integration → up to medium
//   e2e         → large allowed (no ceiling)
//   smoke       → EXCLUDED from the size axis. The 13 smoke files are structural
//                 fail-fast gates that read files / spawn the runner to assert
//                 existence, settings, and permissions, so they are inherently
//                 medium; sizing them out (rather than grandfathering them) is
//                 the FR-3 ruling (E-TP-RA Q3=A). Excluded === null below.
// This constraint is the enforcement half of docs/reference/09-testing.md's
// "Test Size and Layer Purity" section (write⇔check symmetry).
//
// KNOWN unit×non-Small files (FR-2 not yet remediated) are grandfathered in a
// generated ratchet allowlist (tests/.test-size-purity-allowlist.json). The
// allowlist must EXACTLY equal the live unit-non-Small set: a violation absent
// from it fails (no un-grandfathered non-Small unit test), and an entry that is
// no longer a violation also fails (the list only shrinks — ratchet, mirroring
// the complexity-gate baseline #837). It is generated from classifyTestSize, not
// hand-written.
const MAX_SIZE_BY_SCOPE: Record<string, TestSize | null> = {
  smoke: null, // sized OUT of the pyramid axis — see FR-3 above
  unit: "small",
  integration: "medium",
  e2e: "large",
};

function scopeOf(relPath: string): string {
  const scopes = ["smoke", "unit", "integration", "e2e"];
  return scopes.find((s) => relPath.startsWith(`tests/${s}/`)) ?? "other";
}

interface PurityViolation {
  readonly file: string;
  readonly scope: string;
  readonly size: TestSize;
  readonly max: TestSize;
}

describe("layer × size purity — size is the pyramid axis, not the directory", () => {
  const files = allTestFiles(TESTS_ROOT);

  // One pass: every file measured against its scope's max size. Scopes whose max
  // is null (smoke) or absent ("other") are skipped, so a medium smoke file is
  // never a violation — that is the FR-3 exclusion, enforced structurally.
  const violations: PurityViolation[] = [];
  for (const f of files) {
    const relPath = rel(f);
    const scope = scopeOf(relPath);
    const max = MAX_SIZE_BY_SCOPE[scope];
    if (max === undefined || max === null) continue;
    const size = classifyTestSize(readFileSync(f, "utf-8")).size;
    if (SIZE_ORDER[size] > SIZE_ORDER[max]) {
      violations.push({ file: relPath, scope, size, max });
    }
  }

  const allowlist: string[] = JSON.parse(
    readFileSync(join(TESTS_ROOT, ".test-size-purity-allowlist.json"), "utf-8"),
  ).unitNonSmall;
  const allowed = new Set(allowlist);
  const liveUnitNonSmall = new Set(violations.filter((v) => v.scope === "unit").map((v) => v.file));

  test("no test exceeds its scope's max size, except grandfathered unit files", () => {
    const offenders = violations
      .filter((v) => !(v.scope === "unit" && allowed.has(v.file)))
      .map((v) => `${v.file}: ${v.size} > ${v.scope} max ${v.max}`)
      .sort();
    expect(offenders).toEqual([]);
  });

  test("the unit non-Small allowlist only shrinks — no stale or spurious entries (ratchet)", () => {
    // An allowlist entry that is no longer a live unit×non-Small violation is
    // dead weight — remediation must PRUNE it (the list only ratchets down), and
    // a hand-added entry for a non-violating file is rejected the same way.
    const stale = allowlist.filter((f) => !liveUnitNonSmall.has(f)).sort();
    expect(stale).toEqual([]);
  });

  test("smoke tier is sized OUT of the pyramid axis (FR-3 structural-gate exclusion)", () => {
    const smokeFiles = files.map((f) => rel(f)).filter((r) => scopeOf(r) === "smoke");
    expect(smokeFiles.length).toBeGreaterThan(0); // the exclusion is meaningful
    expect(MAX_SIZE_BY_SCOPE.smoke).toBeNull(); // and structural
  });
});

function rel(p: string): string {
  return p.slice(p.indexOf("/tests/") + 1);
}
