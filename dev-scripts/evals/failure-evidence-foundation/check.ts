#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { summarizeHookDrops } from "../../../.agents/aidlc/tools/aidlc-failure-evidence.ts";
import { createAidlcTelemetry } from "../../../.agents/aidlc/tools/aidlc-telemetry.ts";

const root = resolve(import.meta.dir, "../../..");
const engineDirs = ["tools", "aidlc-common", "sensors", "scopes", "agents", "knowledge"];
const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function check(name: string, condition: boolean, evidence: string): void {
  if (!condition) fail(`fail: ${name} — ${evidence}`);
  console.log(`ok: ${name}`);
}

function run(
  command: string[],
  cwd: string,
  env: Record<string, string> = {},
): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode,
  };
}

function runExpectSuccess(command: string[], cwd: string, env: Record<string, string> = {}): string {
  const result = run(command, cwd, env);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", result.stdout, "stderr:", result.stderr].join("\n"));
  }
  return result.stdout;
}

function parseDirective(stdout: string): Record<string, unknown> {
  const first = stdout.indexOf("{");
  const last = stdout.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    fail(`directive JSON が stdout から見つからない — stdout:\n${stdout}`);
  }
  try {
    return JSON.parse(stdout.slice(first, last + 1));
  } catch (e) {
    fail(`directive JSON の解析に失敗した: ${e instanceof Error ? e.message : String(e)} — stdout:\n${stdout}`);
  }
}

const workspace = mkdtempSync(join(tmpdir(), "failure-evidence-foundation-"));
cleanups.push(workspace);

const missingDrops = summarizeHookDrops(join(workspace, "missing-health"));
check("missing drops directory は empty summary になる", missingDrops.totalDrops === 0, JSON.stringify(missingDrops));

const malformedHealthDir = join(workspace, "malformed-health");
mkdirSync(malformedHealthDir, { recursive: true });
writeFileSync(join(malformedHealthDir, "aidlc-malformed.drops"), "not-a-drop-line\n2026-07-04T00:00:00Z\tok\n");
const malformedDrops = summarizeHookDrops(malformedHealthDir);
check("malformed drops は no-crash で集計される", malformedDrops.totalDrops === 1 && malformedDrops.malformedLines === 1, JSON.stringify(malformedDrops));

let metricObserved = false;
const telemetry = createAidlcTelemetry({
  sink: {
    metricRecorded: (name) => {
      if (name === "aidlc.eval.count") metricObserved = true;
    },
  },
});
const unitScope = telemetry.startCommandScope("eval", "unit");
unitScope.recordMetric("aidlc.eval.count", 1);
unitScope.end();
check("Telemetry test sink が metric を受け取る", metricObserved, "metric not observed");

for (const dir of engineDirs) {
  const src = join(root, ".agents/aidlc", dir);
  const dest = join(workspace, ".agents/aidlc", dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const utility = join(workspace, ".agents/aidlc/tools/aidlc-utility.ts");
const orchestrate = join(workspace, ".agents/aidlc/tools/aidlc-orchestrate.ts");
const telemetryFile = join(workspace, "telemetry", "aidlc.jsonl");
const telemetryEnv = { AIDLC_TELEMETRY_TEST_FILE: telemetryFile };

runExpectSuccess(
  ["bun", utility, "intent-birth", "--scope", "poc", "--arguments", "failure evidence", "--label", "failure-evidence"],
  workspace,
  telemetryEnv,
);

const intentsRoot = join(workspace, "aidlc/spaces/default/intents");
const recordDirName = readdirSync(intentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)[0];
check("Intent record ディレクトリが作られている", recordDirName !== undefined, intentsRoot);
const recordDir = join(intentsRoot, recordDirName!);

const nextStdout = runExpectSuccess(["bun", orchestrate, "next"], workspace, telemetryEnv);
const directive = parseDirective(nextStdout);
const produces = directive.produces;
check("最初の directive が run-stage である", directive.kind === "run-stage", JSON.stringify(directive));
check("produces が配列である", Array.isArray(produces), JSON.stringify(produces));

for (const relPath of produces as string[]) {
  const absPath = join(workspace, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, "");
}

const rejected = runExpectSuccess(
  ["bun", orchestrate, "report", "--stage", "intent-capture", "--result", "completed"],
  workspace,
  telemetryEnv,
);
const rejectedDirective = parseDirective(rejected);
check("人間不在 gate が error directive になる", rejectedDirective.kind === "error", JSON.stringify(rejectedDirective));

const unknownSubcommand = run(["bun", orchestrate, "unknown-subcommand"], workspace, telemetryEnv);
check("unknown subcommand は non-zero で終了する", unknownSubcommand.exitCode !== 0, JSON.stringify(unknownSubcommand));

const auditDir = join(recordDir, "audit");
const shardName = readdirSync(auditDir).find((name) => name.endsWith(".md") && name !== "audit.md");
check("audit shard が存在する", shardName !== undefined, auditDir);
const shardText = readFileSync(join(auditDir, shardName!), "utf-8");
check("ERROR_LOGGED が記録されている", shardText.includes("**Event**: ERROR_LOGGED"), shardText.slice(-800));
check("Error detail が記録されている", shardText.includes("**Error detail**:"), shardText.slice(-800));
check("Error fingerprint が記録されている", shardText.includes("**Error fingerprint**:"), shardText.slice(-800));

const dropScript = [
  "import { recordHookDrop } from './.agents/aidlc/tools/aidlc-lib.ts';",
  "recordHookDrop(process.cwd(), 'aidlc-test-hook', 'audit append failed');",
].join("");
runExpectSuccess(["bun", "-e", dropScript], workspace, telemetryEnv);

const doctor = run(["bun", utility, "doctor"], workspace, telemetryEnv);
check("doctor が Hook drops を表示する", doctor.stdout.includes("Hook drops: 1 observed"), doctor.stdout);
check("doctor が Telemetry core を表示する", doctor.stdout.includes("Telemetry core: enabled"), doctor.stdout);

check("telemetry JSONL が作られている", existsSync(telemetryFile), telemetryFile);
const telemetryText = readFileSync(telemetryFile, "utf-8");
check("orchestrate span が記録されている", telemetryText.includes("aidlc.aidlc-orchestrate.next"), telemetryText);
check("unknown subcommand の orchestrate span が記録されている", telemetryText.includes("aidlc.aidlc-orchestrate.unknown-subcommand"), telemetryText);
check("tool invocation metric が記録されている", telemetryText.includes("aidlc.tool.invocations"), telemetryText);
check("hook drop metric が記録されている", telemetryText.includes("aidlc.hook_drops.observed"), telemetryText);

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("failure evidence foundation eval: ok");
