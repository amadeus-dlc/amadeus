#!/usr/bin/env bun

// hooks-state-bugfix eval（Issue #464 / #476）。
//
// エンジン実 CLI（amadeus-utility.ts intent-birth、amadeus-state.ts advance /
// complete-workflow）と hook 実スクリプト（amadeus-mint-presence.ts、
// amadeus-stop.ts）を、隔離 temp workspace で駆動して 4 観点を決定論的に検証する。
// LLM を呼ばず、本番 amadeus/ を変更しない。成功時・失敗時ともに temp workspace を
// 片付ける。
//
// (a) R001: phase 境界通過後、amadeus-state.md の Phase Progress の該当 phase が
//     Verified になる（advance の phase 境界処理・complete-workflow・state-init
//     の initialization→first-phase 境界の 3 経路）。
// (b) R002: verification/phase-check-<phase>.md が無い phase 境界は、advance /
//     complete-workflow / approve のいずれの経路でも拒否する（approve は
//     handleAdvance/handleCompleteWorkflow に completed=[x] 済みで委譲するため、
//     nested 側の alreadyMarkedCompleted ガードで skip されない専用の gate が要る
//     — PR #479 の Bugbot 指摘）。
// (c) R004: amadeus-mint-presence.ts は、cursor の Intent が registry で
//     complete 系のとき HUMAN_TURN の追記を skip する（進行中の既存契約は維持）。
// (d) R003: amadeus-stop.ts の督促判定は「所有（session→intent 一致）」×
//     「進行中（registry status が complete 系でない）」の 2 条件 AND である。

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "hooks", "scopes", "agents", "knowledge"];

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// 隔離 workspace を作る。エンジンの実ディレクトリ一式（.agents/amadeus/*）に加え、
// .claude/{tools,hooks,...} を実リポジトリと同じ symlink 相対配置で張る —
// amadeus-stop.ts の harnessDir() 解決（スクリプトパスの祖父ディレクトリ名が
// ドット始まりでないと CWD probe に落ち、.claude が無いと amadeus-orchestrate.ts
// の実在チェックに失敗して「engine next 不達」に fail-open してしまう）に必要。
function makeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "hooks-state-bugfix-"));
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const dest = join(workspace, ".agents/amadeus", dir);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
  mkdirSync(join(workspace, ".claude"), { recursive: true });
  for (const dir of ["tools", "hooks", "sensors", "scopes", "agents", "knowledge"]) {
    symlinkSync(join("..", ".agents/amadeus", dir), join(workspace, ".claude", dir));
  }
  return workspace;
}

function run(cmd: string[], cwd: string, env: Record<string, string> = {}) {
  const proc = Bun.spawnSync({
    cmd,
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, ...env },
  });
  return {
    exitCode: proc.exitCode ?? -1,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

function runWithStdin(cmd: string[], cwd: string, stdin: string, env: Record<string, string> = {}) {
  const proc = Bun.spawnSync({
    cmd,
    cwd,
    stdin: Buffer.from(stdin, "utf-8"),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, ...env },
  });
  return {
    exitCode: proc.exitCode ?? -1,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

function birthIntent(workspace: string, scope: string, label: string): string {
  const utility = join(workspace, ".agents/amadeus/tools/amadeus-utility.ts");
  const res = run(["bun", utility, "intent-birth", "--scope", scope, "--arguments", `${label} eval`, "--label", label], workspace);
  if (res.exitCode !== 0) throw new Error(`intent-birth failed: ${res.stderr}\n${res.stdout}`);
  const intentsRoot = join(workspace, "amadeus/spaces/default/intents");
  const dirName = readdirSync(intentsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)[0];
  if (!dirName) throw new Error(`no record dir created: ${res.stdout}`);
  return dirName;
}

function recordDirPath(workspace: string, dirName: string): string {
  return join(workspace, "amadeus/spaces/default/intents", dirName);
}

function readState(workspace: string, dirName: string): string {
  return readFileSync(join(recordDirPath(workspace, dirName), "amadeus-state.md"), "utf-8");
}

function phaseProgressField(stateContent: string, field: string): string {
  const m = stateContent.match(new RegExp(`^- \\*\\*${field}\\*\\*:[ \\t]*(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

function auditTotalLength(workspace: string, dirName: string): number {
  const auditDir = join(recordDirPath(workspace, dirName), "audit");
  if (!existsSync(auditDir)) return 0;
  return readdirSync(auditDir).reduce((sum, f) => sum + readFileSync(join(auditDir, f), "utf-8").length, 0);
}

function registryUuid(workspace: string, dirName: string): string {
  const path = join(workspace, "amadeus/spaces/default/intents/intents.json");
  const list = JSON.parse(readFileSync(path, "utf-8")) as Array<{ uuid: string; dirName?: string }>;
  const entry = list.find((e) => e.dirName === dirName);
  if (!entry) throw new Error(`no registry entry for ${dirName}`);
  return entry.uuid;
}

function setRegistryStatus(workspace: string, uuid: string, status: string): void {
  const path = join(workspace, "amadeus/spaces/default/intents/intents.json");
  const list = JSON.parse(readFileSync(path, "utf-8")) as Array<{ uuid: string; status: string }>;
  for (const entry of list) {
    if (entry.uuid === uuid) entry.status = status;
  }
  writeFileSync(path, `${JSON.stringify(list, null, 2)}\n`);
}

const stateTool = (workspace: string) => join(workspace, ".agents/amadeus/tools/amadeus-state.ts");
const mintHook = (workspace: string) => join(workspace, ".agents/amadeus/hooks/amadeus-mint-presence.ts");
const stopHook = (workspace: string) => join(workspace, ".agents/amadeus/hooks/amadeus-stop.ts");

// === (a) R001 + (b) R002: phase 境界の Phase Progress 更新 と phase-check gate ===
{
  const workspace = makeWorkspace();
  try {
    const dirName = birthIntent(workspace, "poc", "phase-boundary-eval");
    const rec = recordDirPath(workspace, dirName);

    // state-init 自体が initialization→ideation の境界を即時通過させる
    // （firstPostInit が ideation 以降のため）。R001 はこの経路も対象。
    const stateAtBirth = readState(workspace, dirName);
    ok(
      "R001: intent-birth 直後、initialization→ideation 境界を通過した Initialization が Verified になる",
      phaseProgressField(stateAtBirth, "Initialization") === "Verified",
      `Initialization=${phaseProgressField(stateAtBirth, "Initialization")}`,
    );

    // (b) RED: verification/phase-check-ideation.md が無いので、
    // ideation→inception 境界の advance は拒否されるべき。
    const refusedIdeation = run(["bun", stateTool(workspace), "advance", "intent-capture"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: verification/phase-check-ideation.md が無いと advance が拒否される",
      refusedIdeation.exitCode !== 0 && /phase-check-ideation/.test(refusedIdeation.stdout + refusedIdeation.stderr),
      `exit=${refusedIdeation.exitCode} stdout=${refusedIdeation.stdout} stderr=${refusedIdeation.stderr}`,
    );
    ok(
      "R002: 拒否後も Current Stage は変化しない（state 未変更）",
      phaseProgressField(readState(workspace, dirName), "Current Stage") === "intent-capture",
      `Current Stage=${phaseProgressField(readState(workspace, dirName), "Current Stage")}`,
    );

    // phase-check 成果物を用意 → advance が成功し、Ideation が Verified になる。
    mkdirSync(join(rec, "verification"), { recursive: true });
    writeFileSync(join(rec, "verification", "phase-check-ideation.md"), "# Phase Check — Ideation（eval fixture）\n");
    const advancedIdeation = run(["bun", stateTool(workspace), "advance", "intent-capture"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: phase-check 成果物があれば advance が成功する",
      advancedIdeation.exitCode === 0,
      `exit=${advancedIdeation.exitCode} stdout=${advancedIdeation.stdout} stderr=${advancedIdeation.stderr}`,
    );
    ok(
      "R001: ideation→inception 境界通過後、Ideation が Verified になる",
      phaseProgressField(readState(workspace, dirName), "Ideation") === "Verified",
      `Ideation=${phaseProgressField(readState(workspace, dirName), "Ideation")}`,
    );

    // 同様に inception→construction 境界（phase-check-inception.md 不在→拒否）。
    const refusedInception = run(["bun", stateTool(workspace), "advance", "requirements-analysis"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: verification/phase-check-inception.md が無いと advance が拒否される",
      refusedInception.exitCode !== 0 && /phase-check-inception/.test(refusedInception.stdout + refusedInception.stderr),
      `exit=${refusedInception.exitCode} stdout=${refusedInception.stdout} stderr=${refusedInception.stderr}`,
    );

    writeFileSync(join(rec, "verification", "phase-check-inception.md"), "# Phase Check — Inception（eval fixture）\n");
    const advancedInception = run(["bun", stateTool(workspace), "advance", "requirements-analysis"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: phase-check 成果物があれば inception→construction の advance が成功する",
      advancedInception.exitCode === 0,
      `exit=${advancedInception.exitCode} stdout=${advancedInception.stdout} stderr=${advancedInception.stderr}`,
    );
    ok(
      "R001: inception→construction 境界通過後、Inception が Verified になる",
      phaseProgressField(readState(workspace, dirName), "Inception") === "Verified",
      `Inception=${phaseProgressField(readState(workspace, dirName), "Inception")}`,
    );

    // construction 内の advance（境界なし）は phase-check を要求しない。
    const withinConstruction = run(["bun", stateTool(workspace), "advance", "code-generation"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: phase 境界を跨がない advance は phase-check を要求しない",
      withinConstruction.exitCode === 0,
      `exit=${withinConstruction.exitCode} stdout=${withinConstruction.stdout} stderr=${withinConstruction.stderr}`,
    );

    // complete-workflow（construction→end）も同じ gate + Phase Progress 更新を持つ。
    const refusedConstruction = run(["bun", stateTool(workspace), "complete-workflow", "build-and-test"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: verification/phase-check-construction.md が無いと complete-workflow が拒否される",
      refusedConstruction.exitCode !== 0 && /phase-check-construction/.test(refusedConstruction.stdout + refusedConstruction.stderr),
      `exit=${refusedConstruction.exitCode} stdout=${refusedConstruction.stdout} stderr=${refusedConstruction.stderr}`,
    );

    writeFileSync(join(rec, "verification", "phase-check-construction.md"), "# Phase Check — Construction（eval fixture）\n");
    const advancedConstruction = run(["bun", stateTool(workspace), "complete-workflow", "build-and-test"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });
    ok(
      "R002: phase-check 成果物があれば complete-workflow が成功する",
      advancedConstruction.exitCode === 0,
      `exit=${advancedConstruction.exitCode} stdout=${advancedConstruction.stdout} stderr=${advancedConstruction.stderr}`,
    );
    const finalState = readState(workspace, dirName);
    ok(
      "R001: complete-workflow 後、Construction が Verified になる",
      phaseProgressField(finalState, "Construction") === "Verified",
      `Construction=${phaseProgressField(finalState, "Construction")}`,
    );
    ok(
      "R001: SKIP された phase（Operation）は Skipped のまま変化しない",
      phaseProgressField(finalState, "Operation") === "Skipped",
      `Operation=${phaseProgressField(finalState, "Operation")}`,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

// === (b') R002: approve 経路（gate-start → approve）でも phase-check gate が効く ===
//
// PR #479 の Bugbot 指摘（High）: approve は先に対象 slug を [x] へ書いてから
// handleAdvance / handleCompleteWorkflow へ委譲するため、nested 側は
// alreadyMarkedCompleted=true を見て自分の verifyPhaseCheckArtifact を skip する。
// 素の advance 経路だけでなく、より一般的な gate 承認経路（gate-start → approve）
// でも同じ gate が効くことを確認する。
{
  const workspace = makeWorkspace();
  try {
    const dirName = birthIntent(workspace, "poc", "approve-phase-check-eval");
    const rec = recordDirPath(workspace, dirName);

    run(["bun", stateTool(workspace), "gate-start", "intent-capture"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
    });

    // RED 相当（phase-check 不在）: approve は拒否され、state は変化しない。
    const refused = run(["bun", stateTool(workspace), "approve", "intent-capture"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
      AIDLC_SKIP_HUMAN_PRESENCE_GUARD: "1",
    });
    ok(
      "R002: verification/phase-check-ideation.md が無いと approve も拒否される",
      refused.exitCode !== 0 && /phase-check-ideation/.test(refused.stdout + refused.stderr),
      `exit=${refused.exitCode} stdout=${refused.stdout} stderr=${refused.stderr}`,
    );
    ok(
      "R002: approve 拒否後も Current Stage・Ideation は変化しない",
      phaseProgressField(readState(workspace, dirName), "Current Stage") === "intent-capture" &&
        phaseProgressField(readState(workspace, dirName), "Ideation") === "Pending",
      readState(workspace, dirName),
    );

    // phase-check 成果物を用意すれば approve が成功し、Ideation が Verified になる。
    mkdirSync(join(rec, "verification"), { recursive: true });
    writeFileSync(join(rec, "verification", "phase-check-ideation.md"), "# Phase Check — Ideation（eval fixture）\n");
    const approved = run(["bun", stateTool(workspace), "approve", "intent-capture"], workspace, {
      AIDLC_SKIP_ARTIFACT_GUARD: "1",
      AIDLC_SKIP_HUMAN_PRESENCE_GUARD: "1",
    });
    ok(
      "R002: phase-check 成果物があれば approve が成功する",
      approved.exitCode === 0,
      `exit=${approved.exitCode} stdout=${approved.stdout} stderr=${approved.stderr}`,
    );
    ok(
      "R001: approve 経由の phase 境界通過後も Ideation が Verified になる",
      phaseProgressField(readState(workspace, dirName), "Ideation") === "Verified",
      `Ideation=${phaseProgressField(readState(workspace, dirName), "Ideation")}`,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

// === (c) R004: mint-presence の complete-系 skip ===
{
  const workspace = makeWorkspace();
  try {
    const dirName = birthIntent(workspace, "poc", "mint-presence-eval");
    const uuid = registryUuid(workspace, dirName);

    // 進行中（in_progress）では HUMAN_TURN が追記される（既存契約の維持、N003）。
    const before = auditTotalLength(workspace, dirName);
    const res1 = run(["bun", mintHook(workspace)], workspace);
    ok(
      "mint-presence: 進行中 Intent では HUMAN_TURN が追記される（既存契約）",
      res1.exitCode === 0 && auditTotalLength(workspace, dirName) > before,
      `exit=${res1.exitCode} stderr=${res1.stderr} before=${before} after=${auditTotalLength(workspace, dirName)}`,
    );

    // complete に切り替えると HUMAN_TURN の追記が止まる（R004）。
    setRegistryStatus(workspace, uuid, "complete");
    const before2 = auditTotalLength(workspace, dirName);
    const res2 = run(["bun", mintHook(workspace)], workspace);
    ok(
      "R004: complete な Intent への mint は skip される（audit shard が成長しない）",
      res2.exitCode === 0 && auditTotalLength(workspace, dirName) === before2,
      `exit=${res2.exitCode} stderr=${res2.stderr} before=${before2} after=${auditTotalLength(workspace, dirName)}`,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

// === (d) R003: stop hook の所有 × 進行中 AND ===
//
// no-progress ブロックカウンタ（stop.ts 自身のガード、R005 は無変更）が
// workspace 単位で永続するため、シナリオ間の汚染を避けて各シナリオを
// 独立した新しい workspace で駆動する。
function stopHookScenario(sessionId: string, registryStatus: string, stampSession: boolean, stampUuidOverride?: string) {
  const workspace = makeWorkspace();
  try {
    const dirName = birthIntent(workspace, "poc", "stop-hook-eval");
    const uuid = registryUuid(workspace, dirName);
    setRegistryStatus(workspace, uuid, registryStatus);
    if (stampSession) {
      const sessionsDir = join(workspace, "amadeus/.amadeus-sessions");
      mkdirSync(sessionsDir, { recursive: true });
      writeFileSync(join(sessionsDir, sessionId), `${stampUuidOverride ?? uuid}\n`);
    }
    const stdin = JSON.stringify({ session_id: sessionId, stop_hook_active: false, transcript_path: "" });
    const res = runWithStdin(["bun", stopHook(workspace)], workspace, stdin);
    const trimmed = res.stdout.trim();
    const decision = trimmed.length > 0 ? (JSON.parse(trimmed) as { decision?: string }) : null;
    return { res, blocked: decision?.decision === "block" };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

{
  // 1. 所有 × 進行中 → 従来どおり督促が維持される（R005 無変更の確認）。
  const s1 = stopHookScenario("session-owner", "in_progress", true);
  ok("R003/R005: 所有 × 進行中では従来どおり督促が維持される", s1.blocked, `stdout=${s1.res.stdout} stderr=${s1.res.stderr}`);

  // 2. 所有 × 完了済み → 督促しない（AC-2 / AC-3）。
  const s2 = stopHookScenario("session-owner", "complete", true);
  ok("R003: 所有していても完了済み workflow では督促しない", !s2.blocked, `stdout=${s2.res.stdout} stderr=${s2.res.stderr}`);

  // 3. 他セッション（対応 uuid 不一致） → 督促しない。
  const s3 = stopHookScenario(
    "session-other",
    "in_progress",
    true,
    "00000000-0000-0000-0000-000000000000",
  );
  ok("R003: 他セッションの workflow では督促しない", !s3.blocked, `stdout=${s3.res.stdout} stderr=${s3.res.stderr}`);

  // 4. 対応記録なし（このセッション id に対する stamp が無い） → 督促しない。
  const s4 = stopHookScenario("session-unknown", "in_progress", false);
  ok("R003: 対応記録がないセッションでは督促しない", !s4.blocked, `stdout=${s4.res.stdout} stderr=${s4.res.stderr}`);
}

// --- #555: log-subagent hook の完了ガード ---
// SubagentStop hook（amadeus-log-subagent.ts）が、完了済み Intent の audit shard へ
// SUBAGENT_COMPLETED を追記し続けるバグ（#476 系の未カバー）の回帰検査。
// (a) 完了済み Intent → no-op（shard が成長しない）
// (b) 進行中 Intent → 従来どおり追記される（退行ガード）
// (c) agent_type が空文字のとき Agent Type: unknown で記録される（副症状）

function logSubagentScenario(registryStatus: string, agentType: string | undefined) {
  const workspace = makeWorkspace();
  try {
    const dirName = birthIntent(workspace, "poc", "log-subagent-eval");
    const uuid = registryUuid(workspace, dirName);
    setRegistryStatus(workspace, uuid, registryStatus);
    const auditDir = join(workspace, "amadeus/spaces/default/intents", dirName, "audit");
    const shard = readdirSync(auditDir).find((n) => n.endsWith(".md"));
    const before = readFileSync(join(auditDir, shard!), "utf8");
    const stdin = JSON.stringify({
      session_id: "log-subagent-eval",
      transcript_path: "",
      agent_id: "aeval555",
      ...(agentType === undefined ? {} : { agent_type: agentType }),
      last_assistant_message: "eval fixture message",
    });
    const hook = join(workspace, ".agents/amadeus/hooks/amadeus-log-subagent.ts");
    const res = runWithStdin(["bun", hook], workspace, stdin);
    const after = readFileSync(join(auditDir, shard!), "utf8");
    return { res, grew: after.length > before.length, after };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

{
  const c1 = logSubagentScenario("complete", "worker");
  ok("#555: 完了済み Intent への SubagentStop は no-op（shard が成長しない）", !c1.grew, c1.after.slice(-300));
  const c2 = logSubagentScenario("in_progress", "worker");
  ok("#555: 進行中 Intent では従来どおり SUBAGENT_COMPLETED が追記される", c2.grew && c2.after.includes("**Agent Type**: worker"), c2.after.slice(-300));
  const c3 = logSubagentScenario("in_progress", "");
  ok("#555: agent_type 空文字は Agent Type: unknown で記録される", c3.grew && c3.after.includes("**Agent Type**: unknown"), c3.after.slice(-300));
}

if (failures > 0) {
  console.error(`hooks-state-bugfix eval: ${failures} 件失敗`);
  process.exit(1);
}
console.log("hooks-state-bugfix eval: pass");
