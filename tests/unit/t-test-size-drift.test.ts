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

function rel(p: string): string {
  return p.slice(p.indexOf("/tests/") + 1);
}
