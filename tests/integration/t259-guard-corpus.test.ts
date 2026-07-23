// covers: harness-instrument:archived-guard-corpus
// @test-size medium
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const TOOLS = join(import.meta.dir, "../../packages/framework/core/tools");
const BENCHMARK_CHILD = join(import.meta.dir, "../helpers/guard-corpus-benchmark-child.ts");
const FILES = [
  "amadeus-utility.ts",
  "amadeus-orchestrate.ts",
  "amadeus-state.ts",
  "amadeus-lib.ts",
] as const;

function callNames(source: string): string[] {
  const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) names.push(node.expression.text);
      else if (ts.isPropertyAccessExpression(node.expression)) {
        names.push(node.expression.name.text);
      } else if (
        ts.isParenthesizedExpression(node.expression)
        && (
          ts.isArrowFunction(node.expression.expression)
          || ts.isFunctionExpression(node.expression.expression)
        )
      ) {
        names.push("<static-iife>");
      } else if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
        names.push("super");
      } else {
        throw new Error("Unclassified dynamic call expression in guard corpus");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return names;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

describe("archived guard AST corpus", () => {
  test("every owned sink file reaches the required guard or capability", () => {
    const sources = Object.fromEntries(
      FILES.map((name) => [name, readFileSync(join(TOOLS, name), "utf-8")]),
    );
    const calls = Object.fromEntries(
      Object.entries(sources).map(([name, source]) => [name, callNames(source)]),
    );
    expect(calls["amadeus-utility.ts"]).toContain("setActiveIntentCursor");
    expect(calls["amadeus-utility.ts"]).toContain("guardIntentOperation");
    expect(calls["amadeus-utility.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-orchestrate.ts"]).toContain("archivedNextGuard");
    expect(calls["amadeus-orchestrate.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-state.ts"]).toContain("removeField");
    expect(calls["amadeus-state.ts"]).toContain("guardIntentOperation");
    expect(calls["amadeus-state.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-lib.ts"]).toContain("transitionIntentStatusLocked");
  });

  test("AST traversal grows linearly over a duplicated corpus", () => {
    const source = FILES.map((name) => readFileSync(join(TOOLS, name), "utf-8")).join("\n");
    const one = callNames(source).length;
    const two = callNames(`${source}\n${source}`).length;
    expect(two).toBe(one * 2);
    const sinks = [
      "setActiveIntentCursor",
      "archivedNextGuard",
      "removeField",
      "transitionIntentStatusLocked",
    ];
    const oneNames = callNames(source);
    const twoNames = callNames(`${source}\n${source}`);
    const oneSinkCounts = Object.fromEntries(
      sinks.map((sink) => [sink, oneNames.filter((name) => name === sink).length]),
    );
    const twoSinkCounts = Object.fromEntries(
      sinks.map((sink) => [sink, twoNames.filter((name) => name === sink).length]),
    );
    const measure = (copies: number) => {
      const result = spawnSync(process.execPath, [BENCHMARK_CHILD, String(copies)], {
        encoding: "utf-8",
      });
      expect(result.status, result.stderr).toBe(0);
      return JSON.parse(result.stdout) as Array<{
        calls: number;
        elapsedMs: number;
        rssDeltaBytes: number;
        rssBytes: number;
      }>;
    };
    const oneSamples = measure(1);
    const twoSamples = measure(2);
    const oneMedianMs = median(oneSamples.map((sample) => sample.elapsedMs));
    const twoMedianMs = median(twoSamples.map((sample) => sample.elapsedMs));
    const oneRssBytes = median(oneSamples.map((sample) => sample.rssBytes));
    const twoRssBytes = median(twoSamples.map((sample) => sample.rssBytes));
    const rssMultiplier = twoRssBytes / oneRssBytes;
    expect(twoMedianMs / oneMedianMs).toBeLessThanOrEqual(2.5);
    expect(rssMultiplier).toBeLessThanOrEqual(2.5);
    console.log("GUARD_CORPUS_BENCHMARK", JSON.stringify({
      oneTotalCalls: one,
      twoTotalCalls: two,
      oneSinkCounts,
      twoSinkCounts,
      unresolved: 0,
      dynamic: 0,
      unclassified: 0,
      oneMedianMs,
      twoMedianMs,
      timeMultiplier: twoMedianMs / oneMedianMs,
      oneRssBytes,
      twoRssBytes,
      rssMultiplier,
    }));
  }, 30_000);
});
