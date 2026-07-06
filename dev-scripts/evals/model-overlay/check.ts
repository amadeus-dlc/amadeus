#!/usr/bin/env bun

// model-overlay eval（Issue #554）。
//
// dev-scripts/apply-model-overrides.ts と dev-scripts/parity-check.ts への
// overlay 正規化追加、.agents/amadeus/tools/amadeus-utility.ts doctor の overlay
// 乖離検査を、隔離 temp workspace で実 CLI を駆動して検証する。LLM を呼ばず、
// 本番 amadeus/ と .agents/amadeus/agents/ の実ファイルを汚さない。成功時・
// 失敗時ともに temp workspace を片付ける。
//
// (a) --check が宣言未反映（apply 未実行）を非ゼロ終了で検出する。
// (b) 適用は冪等（2 回 apply で byte 同一）。
// (c) revert(apply(x)) == x の byte 一致ラウンドトリップ（FR-3.3）。
// (d) base drift（上流が modelOverride を変更）時に parity が fail する（FR-3.2）。
// (e) bootstrap window（base 未記録）は正規化せず通常比較 + ヒント（FR-1.4）。
// (f) --use-fallback --reason の適用と fallbackApplied 記録（FR-4.1/4.2）。
// (g) doctor: 乖離時警告 / overlay 不在時 no-op / 読み取り失敗時「overlay state
//     unknown」1 行（BR-7 gate 承認条件）。
// (h) 管理外実値に対する apply の非ゼロ拒否 + base 不変（--accept-upstream-base
//     でのみ base 更新、BR-10）。
// (i) 管理値集合に一致しない手編集値が parity で fail する（BR-9、トークン一致
//     置換の負ケース）。
// (j) promote-skill.ts の overlay 再適用フック: --agents-root redirect 時は
//     一切書き込まない（j-i）、実昇格時に drift があっても fail-soft で
//     exit 0 + stderr 警告 1 行 + base 不変（j-ii、reviewer iteration 1 指摘）。

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readModelOverrideLine, setModelOverrideLine } from "../../apply-model-overrides";

const root = resolve(import.meta.dir, "../../..");
const applyScript = join(root, "dev-scripts/apply-model-overrides.ts");
const parityScript = join(root, "dev-scripts/parity-check.ts");

const cleanups: string[] = [];
let failures = 0;

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function tmpDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
    console.error(["command failed: " + command.join(" "), out].join("\n"));
    process.exit(1);
  }
  return out;
}

function runResult(command: string[], cwd = root): { exitCode: number; out: string } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode ?? -1,
    out: new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr),
  };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// ---- fixture 用のトークン ----
// 実モデル名との混同を避けるため、fixture 上のモデル値は汎用トークンにする。
const AGENT_NAME = "test-agent";
const AGENT_REL_PATH = `.agents/amadeus/agents/${AGENT_NAME}.md`;
const BASELINE_UPSTREAM_PATH = "agents/test-agent.md";
const BASE_MODEL = "model-a"; // 上流由来の元の値
const TARGET_MODEL = "model-b"; // overlay 宣言のモデル
const FALLBACK_MODEL = "model-c"; // 宣言済み fallback 先
const UNMANAGED_MODEL = "model-x"; // 管理値集合に属さない手編集/上流変更値

function agentFileContent(modelOverrideValue: string): string {
  return `---\nname: ${AGENT_NAME}\nmodelOverride: ${modelOverrideValue}\n---\nBody text.\n`;
}

function makeWorkspace(localModelOverrideValue: string, baselineModelOverrideValue: string): string {
  const ws = tmpDir("model-overlay-");
  mkdirSync(join(ws, "dev-scripts/data"), { recursive: true });

  const baseline = {
    baselineCommit: "test-commit",
    skills: [] as string[],
    engineFiles: [
      { path: BASELINE_UPSTREAM_PATH, sha256: sha256(agentFileContent(baselineModelOverrideValue)) },
    ],
    rulesAidlcMd: { path: "rules/test.md", sha256: sha256("# rules\n") },
  };
  writeFileSync(join(ws, "dev-scripts/data/parity-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`);

  const map = {
    baselineCommit: "test-commit",
    skillNameMapping: { prefix: "x", replacement: "x" },
    nameMappings: [] as unknown[],
    relocations: [{ upstreamPath: BASELINE_UPSTREAM_PATH, localPath: AGENT_REL_PATH, reason: "test fixture" }],
    missingSkillExceptions: [] as string[],
    engineFileExceptions: [] as string[],
  };
  writeFileSync(join(ws, "dev-scripts/data/parity-map.json"), `${JSON.stringify(map, null, 2)}\n`);

  mkdirSync(join(ws, ".agents/amadeus/agents"), { recursive: true });
  writeFileSync(join(ws, AGENT_REL_PATH), agentFileContent(localModelOverrideValue));

  mkdirSync(join(ws, ".claude/rules"), { recursive: true });
  writeFileSync(join(ws, ".claude/rules/test.md"), "# rules\n");

  return ws;
}

function writeOverlay(
  ws: string,
  overlay: { agents: Record<string, { model: string; base?: string; fallbackApplied?: { to: string; reason: string } }>; fallbacks: Record<string, string> },
): void {
  mkdirSync(join(ws, "dev-scripts/data"), { recursive: true });
  writeFileSync(join(ws, "dev-scripts/data/model-overrides.json"), `${JSON.stringify(overlay, null, 2)}\n`);
}

function readOverlay(ws: string): { agents: Record<string, { model: string; base?: string; fallbackApplied?: { to: string; reason: string } }>; fallbacks: Record<string, string> } {
  return JSON.parse(readFileSync(join(ws, "dev-scripts/data/model-overrides.json"), "utf8"));
}

// 想定外の例外（ok/run の外で投げられるもの）でも temp workspace を必ず片付ける
// ため、全系列を try/finally で包む（reviewer iteration 1 の Low 指摘）。
try {

// ---- (a) --check は宣言未反映を非ゼロ終了で検出する ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  const r = runResult(["bun", "run", applyScript, ws, "--check"]);
  ok("(a) --check は宣言未反映を非ゼロ終了で検出する", r.exitCode !== 0, r.out);
  ok("(a) --check の出力に対象 agent 名が現れる", r.out.includes(AGENT_NAME), r.out);
}

// ---- (b) 適用は冪等（2 回 apply で byte 同一） ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  run(["bun", "run", applyScript, ws]);
  const first = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  ok("(b) 適用後の modelOverride は宣言モデル", readModelOverrideLine(first) === TARGET_MODEL, first);
  run(["bun", "run", applyScript, ws]);
  const second = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  ok("(b) 2 回 apply しても byte 同一（冪等）", first === second, `${first}\n---\n${second}`);
}

// ---- (b regression) bootstrap 時に実値がたまたま fallback 先と同値でも base を
// 記録する（実リポジトリの初期宣言は base=opus=fallback 先という偶然の一致を
// 持つため、この collision を固定で pin する） ----
{
  const ws = makeWorkspace(FALLBACK_MODEL, FALLBACK_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  run(["bun", "run", applyScript, ws]);
  const overlayAfter = readOverlay(ws);
  ok(
    "(b regression) 実値が fallback 先と同値でも bootstrap で base が記録される",
    overlayAfter.agents[AGENT_NAME].base === FALLBACK_MODEL,
    JSON.stringify(overlayAfter),
  );
}

// ---- (c) revert(apply(x)) == x の byte 一致ラウンドトリップ（FR-3.3） ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  const original = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  run(["bun", "run", applyScript, ws]);
  const applied = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  const overlayAfter = readOverlay(ws);
  const recordedBase = overlayAfter.agents[AGENT_NAME].base;
  ok("(c) apply が base を記録する", recordedBase === BASE_MODEL, String(recordedBase));
  const reverted = setModelOverrideLine(applied, recordedBase ?? "");
  ok("(c) revert(apply(x)) は byte 一致で x に戻る", reverted === original, `${reverted}\n---\n${original}`);
}

// ---- (d) base drift 時に parity が fail する（FR-3.2） ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  run(["bun", "run", applyScript, ws]);

  const passBefore = runResult(["bun", "run", parityScript, ws]);
  ok("(d) apply 直後は parity pass する（前提確認）", passBefore.exitCode === 0, passBefore.out);

  const baselinePath = join(ws, "dev-scripts/data/parity-baseline.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  baseline.engineFiles[0].sha256 = sha256(agentFileContent("model-upstream-changed"));
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

  const drift = runResult(["bun", "run", parityScript, ws]);
  ok("(d) 上流 drift 時に parity は fail する", drift.exitCode !== 0, drift.out);
  ok("(d) fail メッセージが対象 path を含む", drift.out.includes(BASELINE_UPSTREAM_PATH), drift.out);
}

// ---- (e) bootstrap window（base 未記録）は通常比較 + ヒント（FR-1.4） ----
{
  // 宣言はあるが apply は未実行（base 未記録）。ローカルファイルは baseline と
  // 異なる値（宣言だけ書いて apply していない中間状態を模す）。
  const ws = makeWorkspace(UNMANAGED_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  const r = runResult(["bun", "run", parityScript, ws]);
  ok("(e) base 未記録での不一致は通常比較で fail する", r.exitCode !== 0, r.out);
  ok("(e) fail メッセージに apply 未実行のヒントが付く", r.out.includes("models:apply"), r.out);
}

// ---- (f) --use-fallback --reason の適用と fallbackApplied 記録（FR-4.1/4.2） ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });

  const missingReason = runResult(["bun", "run", applyScript, ws, "--use-fallback"]);
  ok("(f) --use-fallback は --reason 必須（欠落時は非ゼロ終了）", missingReason.exitCode !== 0, missingReason.out);

  const r = runResult(["bun", "run", applyScript, ws, "--use-fallback", "--reason", "capacity"]);
  ok("(f) --use-fallback --reason は成功する", r.exitCode === 0, r.out);
  const content = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  ok("(f) fallback 適用後の modelOverride は fallback 先", readModelOverrideLine(content) === FALLBACK_MODEL, content);
  const overlay = readOverlay(ws);
  const entry = overlay.agents[AGENT_NAME];
  ok(
    "(f) fallbackApplied が対象・理由付きで記録される",
    entry.fallbackApplied?.to === FALLBACK_MODEL && entry.fallbackApplied?.reason === "capacity",
    JSON.stringify(entry),
  );
  ok("(f) fallback 適用でも base は不変（bootstrap 記録値のまま）", entry.base === BASE_MODEL, JSON.stringify(entry));
}

// ---- (h) 管理外実値に対する apply の非ゼロ拒否 + base 不変（BR-10） ----
{
  const ws = makeWorkspace(BASE_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL, base: BASE_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  // 上流同期または手編集で、管理値集合にも base にも一致しない値へ変化した状態を模す。
  writeFileSync(join(ws, AGENT_REL_PATH), agentFileContent(UNMANAGED_MODEL));

  const rejected = runResult(["bun", "run", applyScript, ws]);
  ok("(h) 管理外実値に対する apply は非ゼロ終了で拒否する", rejected.exitCode !== 0, rejected.out);
  const overlayAfterReject = readOverlay(ws);
  ok("(h) 拒否後も base は不変", overlayAfterReject.agents[AGENT_NAME].base === BASE_MODEL, JSON.stringify(overlayAfterReject));
  const fileAfterReject = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  ok(
    "(h) 拒否後もファイルは書き換わらない",
    readModelOverrideLine(fileAfterReject) === UNMANAGED_MODEL,
    fileAfterReject,
  );

  const accepted = runResult(["bun", "run", applyScript, ws, "--accept-upstream-base"]);
  ok("(h) --accept-upstream-base 指定時は成功する", accepted.exitCode === 0, accepted.out);
  const overlayAfterAccept = readOverlay(ws);
  ok(
    "(h) --accept-upstream-base で base が実値へ更新される",
    overlayAfterAccept.agents[AGENT_NAME].base === UNMANAGED_MODEL,
    JSON.stringify(overlayAfterAccept),
  );
}

// ---- (i) 管理値集合に一致しない手編集値が parity で fail する（BR-9） ----
{
  // base は記録済みだが、実値が base にも管理値集合にも一致しない
  // （(e) の bootstrap window とは異なり、apply 済みの状態からの乖離）。
  const ws = makeWorkspace(UNMANAGED_MODEL, BASE_MODEL);
  writeOverlay(ws, { agents: { [AGENT_NAME]: { model: TARGET_MODEL, base: BASE_MODEL } }, fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL } });
  const r = runResult(["bun", "run", parityScript, ws]);
  ok("(i) 管理値集合に一致しない手編集値は parity で fail する", r.exitCode !== 0, r.out);
  ok("(i) fail メッセージが対象 path を含む", r.out.includes(BASELINE_UPSTREAM_PATH), r.out);
  ok("(i) base 記録済みのため bootstrap ヒントは付かない", !r.out.includes("models:apply"), r.out);
}

// ---- (g) doctor: 乖離警告 / overlay 不在時 no-op / 読み取り失敗時「overlay state unknown」 ----

const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "hooks", "scopes", "agents", "knowledge"];

function makeDoctorWorkspace(): string {
  const ws = tmpDir("model-overlay-doctor-");
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const dest = join(ws, ".agents/amadeus", dir);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
  mkdirSync(join(ws, ".claude"), { recursive: true });
  for (const dir of ENGINE_DIRS) {
    symlinkSync(join("..", ".agents/amadeus", dir), join(ws, ".claude", dir));
  }
  mkdirSync(join(ws, "amadeus/spaces/default/memory"), { recursive: true });
  cpSync(join(root, ".claude/settings.json"), join(ws, ".claude/settings.json"));
  return ws;
}

function runDoctor(cwd: string): { exitCode: number; out: string } {
  const proc = Bun.spawnSync({
    cmd: ["bun", join(cwd, ".agents/amadeus/tools/amadeus-utility.ts"), "doctor"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
  });
  return { exitCode: proc.exitCode ?? -1, out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr) };
}

const ARCHITECT_REL = ".agents/amadeus/agents/amadeus-architect-agent.md";
const DESIGN_REL = ".agents/amadeus/agents/amadeus-design-agent.md";

// (g-i) 乖離ありは警告、乖離なしは警告なし。
{
  const ws = makeDoctorWorkspace();
  const architectPath = join(ws, ARCHITECT_REL);
  const designPath = join(ws, DESIGN_REL);
  writeFileSync(architectPath, setModelOverrideLine(readFileSync(architectPath, "utf8"), UNMANAGED_MODEL));
  writeFileSync(designPath, setModelOverrideLine(readFileSync(designPath, "utf8"), TARGET_MODEL));
  mkdirSync(join(ws, "dev-scripts/data"), { recursive: true });
  writeFileSync(
    join(ws, "dev-scripts/data/model-overrides.json"),
    `${JSON.stringify(
      {
        agents: {
          "amadeus-architect-agent": { model: TARGET_MODEL },
          "amadeus-design-agent": { model: TARGET_MODEL },
        },
        fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL },
      },
      null,
      2,
    )}\n`,
  );
  const r = runDoctor(ws);
  ok("(g-i) 乖離している agent は doctor が警告する", r.out.includes("amadeus-architect-agent"), r.out.slice(0, 2000));
  ok(
    "(g-i) 乖離していない agent は overlay 警告に現れない",
    !new RegExp(`model overlay[^\\n]*amadeus-design-agent`).test(r.out),
    r.out.slice(0, 2000),
  );
}

// (g-ii) overlay ファイル不在は静かにスキップ（no-op）。
{
  const ws = makeDoctorWorkspace();
  const r = runDoctor(ws);
  ok("(g-ii) overlay 不在時は overlay 関連の行が出力に現れない", !/model overlay/i.test(r.out), r.out.slice(0, 2000));
}

// (g-iii) overlay ファイルが読み取り失敗（JSON 破損）した場合は「overlay state unknown」を残す。
{
  const ws = makeDoctorWorkspace();
  mkdirSync(join(ws, "dev-scripts/data"), { recursive: true });
  writeFileSync(join(ws, "dev-scripts/data/model-overrides.json"), "{ not valid json");
  const r = runDoctor(ws);
  ok(
    "(g-iii) 読み取り失敗時は「overlay state unknown」を doctor 出力に残す（無言の失敗禁止）",
    r.out.includes("overlay state unknown"),
    r.out.slice(0, 2000),
  );
}

// ---- (j) promote-skill.ts の overlay 再適用フック（reviewer iteration 1 指摘） ----

const promoteScript = join(root, "dev-scripts/promote-skill.ts");
const PROMOTE_SKILL_NAME = "test-skill";

// promote-skill.ts 自体（skill 昇格 + overlay フック）を駆動する隔離 fixture。
// cwd = fixture で spawn するため、フック内の applyModelOverrides(root) は
// fixture 配下の .agents/amadeus/agents/ と dev-scripts/data/model-overrides.json
// だけに作用し、実 repo には一切触れない。
function makePromoteFixture(agentModelOverrideValue: string, overlay: unknown): string {
  const ws = tmpDir("model-overlay-promote-");
  mkdirSync(join(ws, `skills/${PROMOTE_SKILL_NAME}`), { recursive: true });
  writeFileSync(join(ws, `skills/${PROMOTE_SKILL_NAME}/SKILL.md`), "# test-skill\n");
  mkdirSync(join(ws, ".agents/amadeus/agents"), { recursive: true });
  writeFileSync(join(ws, AGENT_REL_PATH), agentFileContent(agentModelOverrideValue));
  mkdirSync(join(ws, "dev-scripts/data"), { recursive: true });
  writeFileSync(join(ws, "dev-scripts/data/model-overrides.json"), `${JSON.stringify(overlay, null, 2)}\n`);
  return ws;
}

function runPromote(cwd: string, extraArgs: string[] = []): { exitCode: number; out: string } {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", promoteScript, PROMOTE_SKILL_NAME, ...extraArgs],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { exitCode: proc.exitCode ?? -1, out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr) };
}

// (j-i) --agents-root redirect（隔離実行）ではフックが一切発火せず、engine
// agent ファイルにも overlay JSON にも書き込みが起きない。fixture を drift
// 状態（管理外実値）から始めることで、redirect スキップ条件が退行した場合は
// フックが発火して warning（fail-soft）が stderr に現れるため、warning 不在の
// 検査が退行を検出する（reviewer iteration 2 の Low 指摘対応）。
{
  const overlay = {
    agents: { [AGENT_NAME]: { model: TARGET_MODEL, base: BASE_MODEL } },
    fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL },
  };
  const ws = makePromoteFixture(UNMANAGED_MODEL, overlay);
  const beforeAgent = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  const beforeOverlay = readFileSync(join(ws, "dev-scripts/data/model-overrides.json"), "utf8");

  const r = runPromote(ws, ["--agents-root", ".agents/skills-redirect"]);
  ok("(j-i) --agents-root redirect 実行は exit 0", r.exitCode === 0, r.out);
  ok("(j-i) redirect 実行ではフック自体が発火しない（overlay 警告なし）", !/model overlay/.test(r.out), r.out);

  const afterAgent = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  const afterOverlay = readFileSync(join(ws, "dev-scripts/data/model-overrides.json"), "utf8");
  ok("(j-i) redirect 実行では engine agent ファイルへ書き込まない", beforeAgent === afterAgent, `${beforeAgent}\n---\n${afterAgent}`);
  ok("(j-i) redirect 実行では overlay JSON へ書き込まない", beforeOverlay === afterOverlay, `${beforeOverlay}\n---\n${afterOverlay}`);
}

// (j-ii) 実昇格（--agents-root 省略 = ".agents/skills"）で drift 状態（管理外実値）
// に当たっても、promote は fail-soft（exit 0 + stderr 警告 1 行）で完走し、
// base は不変のまま（BR-10 の拒否をフックが握りつぶさない）。
{
  const overlay = {
    agents: { [AGENT_NAME]: { model: TARGET_MODEL, base: BASE_MODEL } },
    fallbacks: { [TARGET_MODEL]: FALLBACK_MODEL },
  };
  const ws = makePromoteFixture(UNMANAGED_MODEL, overlay);

  const r = runPromote(ws);
  ok("(j-ii) drift 状態でも実昇格は exit 0（fail-soft）", r.exitCode === 0, r.out);
  ok("(j-ii) stderr に warning 1 行が出る", /warning: model overlay re-apply failed/.test(r.out), r.out);
  ok("(j-ii) warning が models:check の実行を案内する", r.out.includes("models:check"), r.out);

  const overlayAfter = readOverlay(ws);
  ok("(j-ii) 拒否後も base は不変", overlayAfter.agents[AGENT_NAME].base === BASE_MODEL, JSON.stringify(overlayAfter));
  const agentAfter = readFileSync(join(ws, AGENT_REL_PATH), "utf8");
  ok(
    "(j-ii) 拒否後もファイルは書き換わらない",
    readModelOverrideLine(agentAfter) === UNMANAGED_MODEL,
    agentAfter,
  );
}

} finally {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`model-overlay eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("model-overlay eval: ok");
