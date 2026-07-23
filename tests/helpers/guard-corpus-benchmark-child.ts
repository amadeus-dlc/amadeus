import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const copies = Number.parseInt(process.argv[2] ?? "1", 10);
const tools = join(import.meta.dir, "../../packages/framework/core/tools");
const files = [
  "amadeus-utility.ts",
  "amadeus-orchestrate.ts",
  "amadeus-state.ts",
  "amadeus-lib.ts",
];
const source = Array(copies).fill(
  files.map((name) => readFileSync(join(tools, name), "utf-8")).join("\n"),
).join("\n");

function traverse(): number {
  const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
  let calls = 0;
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) calls += 1;
    ts.forEachChild(node, visit);
  }
  visit(file);
  return calls;
}

for (let index = 0; index < 10; index += 1) traverse();
const samples = Array.from({ length: 100 }, () => {
  const rssBefore = process.memoryUsage.rss();
  const started = performance.now();
  const calls = traverse();
  return {
    calls,
    elapsedMs: performance.now() - started,
    rssDeltaBytes: Math.max(0, process.memoryUsage.rss() - rssBefore),
    rssBytes: process.memoryUsage.rss(),
  };
});
console.log(JSON.stringify(samples));
