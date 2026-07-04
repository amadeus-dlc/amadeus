#!/usr/bin/env bun

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildSubagentAuditFields,
  classifySubagentOutcome,
  normalizeSubagentAuditRow,
} from "../../../.agents/aidlc/tools/aidlc-subagent-status.ts";

const root = resolve(import.meta.dir, "../../..");
const engineDirs = ["tools", "hooks", "aidlc-common", "sensors", "scopes", "agents", "knowledge"];
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
): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode,
  };
}

async function runWithInput(
  command: string[],
  cwd: string,
  input: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(command, {
    cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(input);
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

function runExpectSuccess(command: string[], cwd: string): string {
  const result = run(command, cwd);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", result.stdout, "stderr:", result.stderr].join("\n"));
  }
  return result.stdout;
}

const success = classifySubagentOutcome({
  hook_event_name: "SubagentStop",
  subagent_status: "succeeded",
  tool_input: { status: "failed" },
});
check("subagent_status が tool_input.status より優先される", success.outcome === "success", JSON.stringify(success));

const failure = classifySubagentOutcome({
  hook_event_name: "SubagentStop",
  status: "errored",
});
check("top-level status は failure に分類される", failure.outcome === "failure", JSON.stringify(failure));

const missing = classifySubagentOutcome({
  hook_event_name: "SubagentStop",
  last_assistant_message: "done successfully",
});
check("status がない場合は message から推測しない", missing.outcome === "unknown", JSON.stringify(missing));

const untrusted = classifySubagentOutcome({
  hook_event_name: "PostToolUse",
  status: "success",
});
check("SubagentStop 以外は untrusted unknown になる", untrusted.outcome === "unknown" && untrusted.source === "untrusted", JSON.stringify(untrusted));

const fields = buildSubagentAuditFields({
  hook_event_name: "SubagentStop",
  agent_type: "aidlc-developer-agent",
  agent_id: "agent-1",
  status: "completed",
  last_assistant_message: "finished with token=secret-value",
});
check("audit fields に outcome が入る", fields["Subagent Outcome"] === "success", JSON.stringify(fields));
check("message excerpt は redaction される", !fields.Message.includes("secret-value"), JSON.stringify(fields));

const legacy = normalizeSubagentAuditRow([
  "### Subagent Completed",
  "**Event**: SUBAGENT_COMPLETED",
  "**Agent Type**: aidlc-developer-agent",
].join("\n"));
check("old row は unknown として読める", legacy.outcome === "unknown" && legacy.source === "missing", JSON.stringify(legacy));

const workspace = mkdtempSync(join(tmpdir(), "subagent-status-audit-"));
cleanups.push(workspace);

for (const dir of engineDirs) {
  const src = join(root, ".agents/aidlc", dir);
  const dest = join(workspace, ".agents/aidlc", dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const utility = join(workspace, ".agents/aidlc/tools/aidlc-utility.ts");
const hook = join(workspace, ".agents/aidlc/hooks/aidlc-log-subagent.ts");

runExpectSuccess(
  ["bun", utility, "intent-birth", "--scope", "poc", "--arguments", "subagent status", "--label", "subagent-status"],
  workspace,
);

const hookPayload = JSON.stringify({
  hook_event_name: "SubagentStop",
  agent_type: "aidlc-developer-agent",
  agent_id: "agent-2",
  status: "failed",
  tool_input: { status: "success" },
  last_assistant_message: "failed without token=secret-value",
});
const hookResult = await runWithInput(["bun", hook], workspace, hookPayload);
check("hook は stdout に診断文を出さない", hookResult.stdout.trim() === "", hookResult.stdout);
check("hook は成功終了する", hookResult.exitCode === 0, hookResult.stderr);

const intentsRoot = join(workspace, "aidlc/spaces/default/intents");
const recordDirName = readdirSync(intentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)[0];
check("Intent record ディレクトリが作られている", recordDirName !== undefined, intentsRoot);
const auditDir = join(intentsRoot, recordDirName!, "audit");
const shardName = readdirSync(auditDir).find((name) => name.endsWith(".md") && name !== "audit.md");
check("audit shard が存在する", shardName !== undefined, auditDir);
const shardText = readFileSync(join(auditDir, shardName!), "utf-8");
check("SUBAGENT_COMPLETED が記録されている", shardText.includes("**Event**: SUBAGENT_COMPLETED"), shardText.slice(-800));
check("Subagent Outcome が failure で記録されている", shardText.includes("**Subagent Outcome**: failure"), shardText.slice(-800));
check("Status Source が status で記録されている", shardText.includes("**Status Source**: status"), shardText.slice(-800));
check("tool_input.status は audit outcome に使われない", !shardText.includes("**Subagent Outcome**: success"), shardText.slice(-800));
check("message の secret は redaction される", !shardText.includes("secret-value"), shardText.slice(-800));

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("subagent status audit eval: ok");
