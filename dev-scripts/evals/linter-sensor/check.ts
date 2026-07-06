#!/usr/bin/env bun

// linter sensor（amadeus-sensor-linter.ts）の 2 段検出（Issue #538）の決定論的検証。
//
// 検査観点:
//   (a) workspace の package.json に lint:check script があり、それが fail する場合、
//       sensor は exit 0 + JSON {pass:false, errorCount>=1, violations[0].rule="lint:check"} を返す。
//   (b) lint:check script が pass する場合、sensor は exit 0 + {pass:true, errorCount:0} を返す。
//   (c) lint:check script も eslint 設定もない workspace では、従来どおり exit 127
//       （dispatcher が quiet PASS へ再分類する tool-unavailable 経路）を維持する。
//   (d) 実 rule 統合: lints/no-stub-compat（PR #544）の check.ts を lint:check として
//       配線した隔離 workspace で、banned 識別子（legacy トークン）を含む .ts が
//       sensor 経由で pass:false になる（AC Row 6 の検証仕様）。
//
// 隔離 workspace は mkdtempSync で作り、成功・失敗にかかわらず片付ける。

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const sensor = join(root, ".agents/amadeus/tools/amadeus-sensor-linter.ts");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function makeWorkspace(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `linter-sensor-${name}-`));
  cleanups.push(dir);
  return dir;
}

function runSensor(filePath: string): { status: number | null; stdout: string; stderr: string } {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", sensor, "--stage", "build-and-test", "--file-path", filePath],
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    status: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

// (a) lint:check が fail する workspace
{
  const ws = makeWorkspace("fail");
  writeFileSync(
    join(ws, "package.json"),
    JSON.stringify({ name: "fixture-fail", scripts: { "lint:check": "bun run lint-fail.ts" } }),
  );
  writeFileSync(
    join(ws, "lint-fail.ts"),
    'console.error("rule violation: fixture-rule at src/a.ts:1");\nprocess.exit(1);\n',
  );
  writeFileSync(join(ws, "target.ts"), "export const target = 1;\n");
  const r = runSensor(join(ws, "target.ts"));
  if (r.status !== 0) fail(`(a) sensor exit が 0 でない: ${r.status} stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  if (out.pass !== false) fail(`(a) pass が false でない: ${r.stdout}`);
  if (!(out.errorCount >= 1)) fail(`(a) errorCount が 1 以上でない: ${r.stdout}`);
  if (out.violations?.[0]?.rule !== "lint:check") fail(`(a) violations[0].rule が lint:check でない: ${r.stdout}`);
  console.log("ok: (a) lint:check fail -> pass:false");
}

// (b) lint:check が pass する workspace
{
  const ws = makeWorkspace("pass");
  writeFileSync(
    join(ws, "package.json"),
    JSON.stringify({ name: "fixture-pass", scripts: { "lint:check": "bun run lint-ok.ts" } }),
  );
  writeFileSync(join(ws, "lint-ok.ts"), "process.exit(0);\n");
  writeFileSync(join(ws, "target.ts"), "export const target = 1;\n");
  const r = runSensor(join(ws, "target.ts"));
  if (r.status !== 0) fail(`(b) sensor exit が 0 でない: ${r.status} stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  if (out.pass !== true) fail(`(b) pass が true でない: ${r.stdout}`);
  if (out.errorCount !== 0) fail(`(b) errorCount が 0 でない: ${r.stdout}`);
  console.log("ok: (b) lint:check pass -> pass:true");
}

// (c) lint:check も eslint 設定もない workspace -> exit 127（従来経路の維持）
{
  const ws = makeWorkspace("fallback");
  writeFileSync(join(ws, "package.json"), JSON.stringify({ name: "fixture-fallback" }));
  writeFileSync(join(ws, "target.ts"), "export const target = 1;\n");
  const r = runSensor(join(ws, "target.ts"));
  if (r.status !== 127) fail(`(c) exit 127（tool-unavailable 経路）でない: ${r.status} stderr=${r.stderr}`);
  console.log("ok: (c) lint:check なし -> 従来の exit 127 経路を維持");
}

// (d) 実 rule 統合（no-stub-compat、PR #544）: banned 識別子が sensor 経由で fail する
{
  const ws = makeWorkspace("real-rule");
  const ruleCheck = join(root, "lints/no-stub-compat/check.ts");
  writeFileSync(
    join(ws, "package.json"),
    JSON.stringify({
      name: "fixture-real-rule",
      scripts: { "lint:check": `bun run ${ruleCheck} --check` },
    }),
  );
  // no-stub-compat の defaultInclude に含まれる dev-scripts/ 配下へ banned 識別子
  //（token "legacy"）を持つ宣言を置く（defaultRoot = 呼び出し側 cwd = この workspace）。
  mkdirSync(join(ws, "dev-scripts"), { recursive: true });
  writeFileSync(join(ws, "dev-scripts", "bad.ts"), "export const legacyAdapter = 1;\n");
  writeFileSync(join(ws, "target.ts"), "export const target = 1;\n");
  const r = runSensor(join(ws, "target.ts"));
  if (r.status !== 0) fail(`(d) sensor exit が 0 でない: ${r.status} stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  if (out.pass !== false) fail(`(d) 実 rule 違反が pass:false にならない: ${r.stdout}`);
  console.log("ok: (d) no-stub-compat 実 rule が sensor 経由で fail を検出");
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("linter-sensor eval: ok");
