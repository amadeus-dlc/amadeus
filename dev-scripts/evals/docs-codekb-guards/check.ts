#!/usr/bin/env bun

// docs-codekb-guards eval（Issue #498）。
//
// `codekbRepoName`（.agents/amadeus/tools/amadeus-lib.ts）が、linked git
// worktree から呼ばれたときに worktree ディレクトリ名（例: "engineer3"）を
// codekb repo キーへ漏らし、codekb/<worktree-name>/ が worktree ごとに分裂する
// バグ（FR-1）の回帰検査。実 CLI（amadeus-utility.ts codekb-path）を隔離
// temp workspace で駆動する。LLM を呼ばず、本番 aidlc/ を変更しない。成功時・
// 失敗時ともに temp ディレクトリを片付ける。
//
// - FR-1.1: main 側 checkout + linked worktree の両方から、repo キーが常に
//   main リポジトリ名（"mainrepo"）に解決される。
// - FR-1.3: git リポジトリでない projectDir では、既存の basename フォール
//   バックが維持される（挙動変更なし）。

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "scopes", "agents", "knowledge"];

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function run(cmd: string[], cwd: string) {
  const proc = Bun.spawnSync({ cmd, cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: proc.exitCode ?? -1,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

function runGit(args: string[], cwd: string) {
  const proc = Bun.spawnSync({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, GIT_AUTHOR_NAME: "eval", GIT_AUTHOR_EMAIL: "eval@example.com", GIT_COMMITTER_NAME: "eval", GIT_COMMITTER_EMAIL: "eval@example.com" },
  });
  if (proc.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${new TextDecoder().decode(proc.stderr)}`);
  }
  return new TextDecoder().decode(proc.stdout);
}

// エンジンの実ディレクトリ一式を dest 配下の .agents/amadeus/ へコピーする
// （engine-e2e/check.ts と同じ最小コピー方針）。
function copyEngine(dest: string): void {
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const out = join(dest, ".agents/amadeus", dir);
    mkdirSync(out, { recursive: true });
    cpSync(src, out, { recursive: true });
  }
}

function codekbRepo(projectDir: string): { space: string; repo: string; dir: string } {
  const utility = join(projectDir, ".agents/amadeus/tools/amadeus-utility.ts");
  const res = run(["bun", utility, "codekb-path", "--project-dir", projectDir, "--json"], projectDir);
  if (res.exitCode !== 0) {
    throw new Error(`codekb-path failed: ${res.stderr}\n${res.stdout}`);
  }
  return JSON.parse(res.stdout.trim());
}

const base = mkdtempSync(join(tmpdir(), "docs-codekb-guards-"));

try {
  // --- FR-1.1: main checkout + linked worktree の両方が main repo 名に解決される ---
  const mainRepo = join(base, "mainrepo");
  mkdirSync(mainRepo, { recursive: true });
  runGit(["init", "-q"], mainRepo);
  copyEngine(mainRepo);
  runGit(["add", "-A"], mainRepo);
  runGit(["commit", "-q", "-m", "init"], mainRepo);

  const worktreeDir = join(base, "wt-engineerX");
  runGit(["worktree", "add", "-q", worktreeDir, "-b", "wt-branch"], mainRepo);

  const fromWorktree = codekbRepo(worktreeDir);
  ok(
    "FR-1.1: linked worktree から codekb repo キーが main リポジトリ名に解決される",
    fromWorktree.repo === "mainrepo",
    JSON.stringify(fromWorktree),
  );
  ok(
    "回帰防止: worktree ディレクトリ名（wt-engineerX）が repo キーに漏れていない",
    fromWorktree.repo !== basename(worktreeDir),
    JSON.stringify(fromWorktree),
  );

  const fromMain = codekbRepo(mainRepo);
  ok(
    "回帰: main checkout 自身でも repo キーが main リポジトリ名のまま",
    fromMain.repo === "mainrepo",
    JSON.stringify(fromMain),
  );

  // --- FR-1.3: git リポジトリでない projectDir は既存の basename フォールバック ---
  const plainDir = join(base, "plain-nogit-dir");
  mkdirSync(plainDir, { recursive: true });
  copyEngine(plainDir);
  const fromPlain = codekbRepo(plainDir);
  ok(
    "FR-1.3: git リポジトリでない場合は basename(projectDir) にフォールバックする",
    fromPlain.repo === basename(plainDir),
    JSON.stringify(fromPlain),
  );

  // --- B002 (Issue #499): docsOnly declaration exempts the workspace_requires guard ---
  //
  // FR-2.5: no declaration -> a workspace_requires stage completion attempt refuses.
  // FR-2.1/2.4: declare-docs-only with non-empty evidence -> the SAME completion
  //   attempt succeeds and the audit shard records GUARD_EXEMPTED with Stage + Evidence.
  // FR-2.3: declare-docs-only with empty evidence exits non-zero and writes NO
  //   docsOnly entry to the registry.
  //
  // Drives the real amadeus-state.ts / amadeus-utility.ts CLI in an isolated sandbox
  // (mirrors engine-e2e/check.ts's driving approach): birth a bugfix-scope intent,
  // then hand-advance it to the sole workspace_requires stage (code-generation) by
  // writing each traversed stage's produces[] docs. bugfix skips every ideation
  // stage plus units-generation/delivery-planning/functional-design/nfr-requirements/
  // nfr-design/infrastructure-design, and reverse-engineering auto-skips on a fresh
  // greenfield sandbox, so requirements-analysis is the only stage between
  // INITIALIZATION and code-generation. The produces are committed so the
  // workspace_requires guard decides against a clean git tree with no real source
  // file anywhere outside aidlc/ — exactly the docs-only shape FR-2 exists for.

  const b002Base = join(base, "b002-guard");
  mkdirSync(b002Base, { recursive: true });
  copyEngine(b002Base);
  runGit(["init", "-q"], b002Base);
  runGit(["add", "-A"], b002Base);
  runGit(["commit", "-q", "-m", "init"], b002Base);

  const utilityB002 = join(b002Base, ".agents/amadeus/tools/amadeus-utility.ts");
  const stateToolB002 = join(b002Base, ".agents/amadeus/tools/amadeus-state.ts");

  function runState(args: string[]) {
    return run(["bun", stateToolB002, ...args, "--project-dir", b002Base], b002Base);
  }

  const birth = run(
    [
      "bun", utilityB002, "intent-birth",
      "--scope", "bugfix",
      "--arguments", "b002 eval",
      "--label", "b002-eval",
      "--project-dir", b002Base,
    ],
    b002Base,
  );
  ok("B002 setup: intent-birth が成功する", birth.exitCode === 0, birth.stdout + birth.stderr);

  const intentsRootB002 = join(b002Base, "aidlc/spaces/default/intents");
  const recordDirNameB002 = readdirSync(intentsRootB002, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)[0];
  const recordDirB002 = join(intentsRootB002, recordDirNameB002!);

  // requirements-analysis: the sole in-scope stage before code-generation for
  // this scope + a fresh greenfield sandbox (see the block comment above).
  mkdirSync(join(recordDirB002, "inception/requirements-analysis"), { recursive: true });
  writeFileSync(join(recordDirB002, "inception/requirements-analysis/requirements.md"), "req\n");
  writeFileSync(join(recordDirB002, "inception/requirements-analysis/requirements-analysis-questions.md"), "q\n");
  mkdirSync(join(recordDirB002, "verification"), { recursive: true });
  writeFileSync(join(recordDirB002, "verification/phase-check-inception.md"), "phase check\n");

  const advanceToCodeGen = runState(["advance", "requirements-analysis"]);
  ok(
    "B002 setup: requirements-analysis 完了で Current Stage が code-generation になる",
    advanceToCodeGen.exitCode === 0 && advanceToCodeGen.stdout.includes('"started":"code-generation"'),
    advanceToCodeGen.stdout + advanceToCodeGen.stderr,
  );

  // code-generation's declared produces[] (for_each: unit-of-work — a per-unit
  // record dir) — docs only, no real source file anywhere outside aidlc/.
  const unitDir = join(recordDirB002, "construction/u001-eval-unit/code-generation");
  mkdirSync(unitDir, { recursive: true });
  writeFileSync(join(unitDir, "code-generation-plan.md"), "plan\n");
  writeFileSync(join(unitDir, "code-summary.md"), "summary\n");
  runGit(["add", "-A"], b002Base);
  runGit(["commit", "-q", "-m", "produces only, no source work"], b002Base);

  // --- FR-2.3: declare-docs-only with empty evidence refuses and writes nothing ---
  const declareEmpty = runState(["declare-docs-only", "--evidence", ""]);
  ok(
    "FR-2.3: 空 evidence の declare-docs-only は非ゼロ終了する",
    declareEmpty.exitCode !== 0,
    declareEmpty.stdout + declareEmpty.stderr,
  );
  const registryAfterEmpty = JSON.parse(readFileSync(join(intentsRootB002, "intents.json"), "utf8")) as Array<Record<string, unknown>>;
  ok(
    "FR-2.3: 空 evidence の宣言は registry に docsOnly を書かない",
    registryAfterEmpty[0]?.docsOnly === undefined,
    JSON.stringify(registryAfterEmpty[0]),
  );

  // --- FR-2.5: no declaration -> the workspace_requires guard refuses ---
  const refuseNoDeclaration = runState(["advance", "code-generation"]);
  ok(
    "FR-2.5: 宣言なしでは code-generation の完了が拒否される",
    refuseNoDeclaration.exitCode !== 0,
    refuseNoDeclaration.stdout + refuseNoDeclaration.stderr,
  );
  ok(
    "FR-2.5: 拒否メッセージが workspace_requires または declare-docs-only を案内する",
    refuseNoDeclaration.stderr.includes("workspace_requires") || refuseNoDeclaration.stderr.includes("declare-docs-only"),
    refuseNoDeclaration.stderr,
  );

  // --- FR-2.3: evidence must reference a REAL human-approval audit event ---
  // (review finding 1: a free-form non-empty string must not exempt the guard)
  const declareFreeform = runState(["declare-docs-only", "--evidence", "適当な一言"]);
  ok(
    "FR-2.3: 承認イベント形式でない evidence の declare-docs-only は非ゼロ終了する",
    declareFreeform.exitCode !== 0,
    declareFreeform.stdout + declareFreeform.stderr,
  );
  const declareNoEvent = runState(["declare-docs-only", "--evidence", "DECISION_RECORDED nonexistent-stage 2026-01-01T00:00Z"]);
  ok(
    "FR-2.3: audit に実在しない承認イベントを指す evidence は非ゼロ終了する",
    declareNoEvent.exitCode !== 0,
    declareNoEvent.stdout + declareNoEvent.stderr,
  );
  const registryAfterInvalid = JSON.parse(readFileSync(join(intentsRootB002, "intents.json"), "utf8")) as Array<Record<string, unknown>>;
  ok(
    "FR-2.3: 無効な evidence の宣言は registry に docsOnly を書かない",
    registryAfterInvalid[0]?.docsOnly === undefined,
    JSON.stringify(registryAfterInvalid[0]),
  );

  // --- FR-2.1/2.4: a valid declaration exempts the guard, and it is audited ---
  // Ground the evidence in a REAL audit event first (amadeus-log decision emits
  // DECISION_RECORDED into the sandbox record's audit shard).
  const logToolB002 = join(b002Base, ".agents/amadeus/tools/amadeus-log.ts");
  const emitDecision = run(
    ["bun", logToolB002, "decision", "--stage", "requirements-analysis", "--decision", "docs-only 宣言の承認転記（eval 用）", "--project-dir", b002Base],
    b002Base,
  );
  ok(
    "B002 setup: amadeus-log decision が DECISION_RECORDED を emit する",
    emitDecision.exitCode === 0 && emitDecision.stdout.includes("DECISION_RECORDED"),
    emitDecision.stdout + emitDecision.stderr,
  );
  const evidence = "DECISION_RECORDED requirements-analysis 2026-07-05T17:19Z";
  const declareValid = runState(["declare-docs-only", "--evidence", evidence]);
  ok(
    "FR-2.1: 非空 evidence の declare-docs-only は成功する",
    declareValid.exitCode === 0,
    declareValid.stdout + declareValid.stderr,
  );

  const completeAfterDeclare = runState(["advance", "code-generation"]);
  ok(
    "FR-2.1/2.4: 宣言後は同じ completion 試行が成功する",
    completeAfterDeclare.exitCode === 0 && completeAfterDeclare.stdout.includes('"completed":"code-generation"'),
    completeAfterDeclare.stdout + completeAfterDeclare.stderr,
  );

  const auditDirB002 = join(recordDirB002, "audit");
  const shardNameB002 = readdirSync(auditDirB002).find((name) => name.endsWith(".md") && name !== "audit.md");
  const shardTextB002 = shardNameB002 ? readFileSync(join(auditDirB002, shardNameB002), "utf8") : "";
  const guardExemptedIdx = shardTextB002.indexOf("**Event**: GUARD_EXEMPTED");
  ok(
    "FR-2.4: audit shard に GUARD_EXEMPTED が記録されている",
    guardExemptedIdx !== -1,
    shardTextB002.slice(-800),
  );
  const guardExemptedBlock = guardExemptedIdx !== -1 ? shardTextB002.slice(guardExemptedIdx) : "";
  ok(
    "FR-2.4: GUARD_EXEMPTED に Stage フィールドがある",
    /\*\*Stage\*\*:\s*code-generation/.test(guardExemptedBlock),
    guardExemptedBlock.slice(0, 300),
  );
  ok(
    "FR-2.4: GUARD_EXEMPTED に Evidence フィールドがある",
    guardExemptedBlock.includes(`**Evidence**: ${evidence}`),
    guardExemptedBlock.slice(0, 300),
  );

  // --- review finding 2: no matching registry row must be a loud error, not a
  // silent {"declared": true} success ---
  writeFileSync(join(intentsRootB002, "intents.json"), "[]\n");
  const declareNoRow = runState(["declare-docs-only", "--evidence", evidence]);
  ok(
    "FR-2.2: registry に一致行がない declare-docs-only は非ゼロ終了する",
    declareNoRow.exitCode !== 0,
    declareNoRow.stdout + declareNoRow.stderr,
  );
  // --- B003 (Issue #501): the validator resolves codekb-adoption stub references ---
  //
  // FR-3.1: a completed reverse-engineering whose record produces are codekb-adoption
  //   stubs (canonical-path link + adoption rationale) passes when every referenced
  //   canonical file exists.
  // FR-3.3: a stub whose referenced canonical file is missing fails.
  //
  // Test material is the REAL merged record 260705-steering-learnings (PR #503) plus
  // the real shared codekb/amadeus/, copied into an isolated workspace (Corrections
  // c5: drive the real validator over real artifacts, no hand-written fixtures).

  const b003Ws = join(base, "b003-validator");
  mkdirSync(join(b003Ws, "aidlc/spaces/default/intents"), { recursive: true });
  copyEngine(b003Ws);
  const spaceSrc = join(root, "aidlc/spaces/default");
  const spaceDst = join(b003Ws, "aidlc/spaces/default");
  for (const dir of ["memory", "knowledge", "codekb"]) {
    const src = join(spaceSrc, dir);
    if (existsSync(src)) cpSync(src, join(spaceDst, dir), { recursive: true });
  }
  // The real registry lists every intent, but only the one record is copied —
  // narrow it to that entry so absent sibling record dirs do not fail the run.
  const fullRegistry = JSON.parse(readFileSync(join(spaceSrc, "intents/intents.json"), "utf8")) as Array<{ dirName?: string }>;
  const narrowed = fullRegistry.filter((entry) => entry.dirName === "260705-steering-learnings");
  writeFileSync(join(spaceDst, "intents/intents.json"), `${JSON.stringify(narrowed, null, 2)}\n`);
  cpSync(
    join(spaceSrc, "intents/260705-steering-learnings"),
    join(spaceDst, "intents/260705-steering-learnings"),
    { recursive: true },
  );

  const validatorSrc = join(root, "skills/amadeus-validator/validator/AmadeusValidator.ts");
  const stubCondition = "codekb 採用 stub の参照先正本が存在する";

  const b003Pass = run(["bun", validatorSrc, b003Ws, "260705-steering-learnings"], root);
  ok(
    "FR-3.1: 参照先正本が存在する codekb 採用 stub の record で validator が pass する",
    b003Pass.exitCode === 0,
    b003Pass.stdout.slice(-1200) + b003Pass.stderr.slice(-400),
  );
  // pass 行は検査サマリへ集計され個別表示されないため、pass ケースでは
  // 参照解決検査の fail 行が現れないことを確認する（検査が走って fail ゼロ
  // であることは FR-3.3 側の fail 検出とあわせて担保する）。
  ok(
    "FR-3.1: pass ケースでは参照解決検査の fail 行が現れない",
    !b003Pass.stdout.includes(stubCondition),
    b003Pass.stdout.slice(-1200),
  );

  // FR-3.3: break ONE canonical target — the same record must now fail with the
  // reference-resolution condition naming the dangling stub.
  rmSync(join(spaceDst, "codekb/amadeus/architecture.md"));
  const b003Fail = run(["bun", validatorSrc, b003Ws, "260705-steering-learnings"], root);
  ok(
    "FR-3.3: 参照先正本が欠けた stub で validator が fail する",
    b003Fail.exitCode !== 0,
    `exit=${b003Fail.exitCode}`,
  );
  ok(
    "FR-3.3: 参照解決検査の fail 行が出力に含まれる",
    b003Fail.stdout.includes(stubCondition) && /fail/i.test(b003Fail.stdout),
    b003Fail.stdout.slice(-1200),
  );
} finally {
  rmSync(base, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`docs-codekb-guards eval: ${failures} 件失敗`);
  process.exit(1);
}
console.log("docs-codekb-guards eval: pass");
