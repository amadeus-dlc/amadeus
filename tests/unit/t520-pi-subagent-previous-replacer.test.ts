// Pi subagent chain step interpolation: {previous} must be substituted with a
// function replacer, not a template-string replacer.
// covers: packages/framework/harness/pi/extensions/subagent.ts
// size: small
//
// This vendored file (@earendil-works/pi-coding-agent 0.83.0) is intentionally
// excluded from tsconfig's compiled surface and from any test's module graph
// (see the file's own header comment and #2516) -- Pi's own extension runtime
// loads it directly, never the repo's typecheck or test runner. A behavioural
// unit test that imports the module is therefore impossible; this test pins
// the vulnerable line by reading the file as text and asserting on its exact
// source shape instead.
//
// Defect (#2731, same root as #2580/#2607): step.task.replace(/\{previous\}/g,
// previousOutput) passes the upstream model's previous chain-step output as a
// STRING replacement value. String.prototype.replace interprets $&, $`, $',
// and $$ in a string replacement as special patterns, so a previous output
// containing any of those sequences is silently reinterpreted instead of
// being substituted verbatim -- corrupting the next chain step's task text
// under attacker/model-controlled content the caller does not control.
// #2607 fixed the same defect shape everywhere else in the repo by switching
// to a replacer FUNCTION (whose return value is never re-interpreted), but
// explicitly excluded this vendored file as out of scope, tracked upstream.
// This local patch closes the same hole here while upstream tracking
// continues (see the "Amadeus addition" precedent immediately above the
// session-wide concurrency valve in the same file).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const SUBAGENT_SOURCE_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "harness",
  "pi",
  "extensions",
  "subagent.ts",
);

function readSubagentSource(): string {
  return readFileSync(SUBAGENT_SOURCE_PATH, "utf8");
}

describe("t520 pi subagent {previous} interpolation", () => {
  test("never substitutes {previous} with a bare string replacement value", () => {
    const source = readSubagentSource();
    // The vulnerable shape: .replace(/\{previous\}/g, previousOutput) -- a
    // template-string replacer fed an untrusted (model-produced) value.
    const vulnerablePattern = /\.replace\(\/\\\{previous\\\}\/g,\s*previousOutput\)/u;
    expect(source).not.toMatch(vulnerablePattern);
  });

  test("substitutes {previous} via a function replacer so $-sequences in previousOutput are never reinterpreted", () => {
    const source = readSubagentSource();
    // The fixed shape: a replacer FUNCTION closing over previousOutput, whose
    // return value bun/node never re-scans for $&, $`, $', $$.
    const fixedPattern = /\.replace\(\/\\\{previous\\\}\/g,\s*\(\)\s*=>\s*previousOutput\)/u;
    expect(source).toMatch(fixedPattern);
  });

  test("leaves the unrelated literal-erasure {previous} replace (line ~891) untouched", () => {
    const source = readSubagentSource();
    // step.task.replace(/\{previous\}/g, "") is a fixed empty-string literal
    // replacement -- $-sequences cannot appear in "" -- so it is safe as-is
    // and must not be modified by this fix.
    const eraseLiteralPattern = /\.replace\(\/\\\{previous\\\}\/g,\s*""\)\.trim\(\)/u;
    expect(source).toMatch(eraseLiteralPattern);
  });
});
