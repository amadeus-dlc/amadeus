# re-scan: 260813-lifecycle-guard-runtime（Issue #2771）

**Date**: `2026-08-14`
**測定 ref**: observed = 本 worktree HEAD = `origin/main` = `89532174c30ef9cc7ff29496cd6916586fdda00a`（`git rev-parse HEAD` と `git rev-parse origin/main` が一致。`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor 854692fd7 HEAD` = **exit 0**、`git rev-list --count 854692fd7..HEAD` = **35**。`cid:reverse-engineering:rescan-base-ancestry`）
**区間規模**: 35 commits / **233 files, 24099 insertions(+), 9421 deletions(-)**（`git log --oneline 854692fd7..HEAD` / `git diff --stat 854692fd7..HEAD`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`
**Focus**: [Issue #2771](https://github.com/amadeus-dlc/amadeus/issues/2771)（enhancement / lifecycle）— 全ライフサイクル共通の Guard Runtime 導入。本 RE の主題は **ライフサイクル進行ガードの全数棚卸し**（移行対象集合の確定）であり、Runtime の設計・採否は requirements-analysis / application-design の所掌。
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode`）— クロスレビュー成立済みの単発 Issue。run `xrev-2771-20260813131430`、target-sha `10dbac5954d554c4370379b084e879f8c721829f`。両 verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化した。
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ（probe / 集計はセッション scratchpad = repo 外、`cid:requirements-analysis:scratch-script-discipline`）

---

## 1. currency 判定 — **成立**（条件付き: 1 ファイルの行ピンのみ再解決要）

| 項目 | 取得コマンド | 結果 |
|---|---|---|
| observed | `git rev-parse HEAD` / `git rev-parse origin/main` | 両方 `89532174c30ef9cc7ff29496cd6916586fdda00a`（一致） |
| `review..observed` 変更ファイル | `git diff --name-only 10dbac595..HEAD \| wc -l` | 19 |
| `review..observed` コミット | `git log --oneline 10dbac595..HEAD` | 6 |
| verdict 引用パス集合 | `grep -oE '[A-Za-z0-9_./-]+\.(ts\|md\|json\|sh\|yml\|yaml)' <issue comments> \| sort -u` | 30 パス |
| 交差 | `comm -12 /tmp/cited.txt /tmp/changed.txt` | **2 件**（空でない） |

### 交差 2 件の扱い（免除の主張ではなく個別処理の記録）

1. **`packages/framework/core/tools/amadeus-utility.ts`** — `+40 -0`（`git diff --stat 10dbac595..HEAD -- <path>`）。commit `97581b3e3`（#2968、doctor へ self-install projection freshness を配線）が `:1575` 付近に `selfInstallProjectionDoctorChecks` を挿入した。**意味論の変更はなく、ガード面にも触れていない**が、以降の全行番号が **+40 シフト**する。実測: `handleIntentBirth` は review-sha `:4347` → HEAD **`:4387`**（`git grep -n "function handleIntentBirth" 10dbac595 / HEAD`）。verdict が引く `:4844` / `:5551` / `:5833` / `:5905` / `:5995` も同様に +40 で再解決する。
2. **`amadeus/spaces/default/memory/team.md`** — `+3 -1`。`in-progress` ラベルノルム 1 行追加と TDD ノルムへのエラーパス追記のみ。verdict は team.md を「適用ノルム」としてのみ引用しており、引用箇所の判断は不変。

### 表現形式の移行検査（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）

`review..observed` の 6 コミット（metrics snapshot / doctor freshness / docs norms ×2 / coverage-patch-quick plugin / mise.toml）のいずれも、患部（ライフサイクル進行ガード）の**表現形式・スキーマ・セレクタ形式を変える移行を含まない**。`packages/framework/core/tools/amadeus-state.ts` は `review..observed` で無変更（`git diff --name-only 10dbac595..HEAD -- <path>` → 空出力、rc=0）。したがって c5 が定める「currency 構造的不成立」条件には**該当しない**。

### verdict 主張の observed 断面での再検証（全件再現）

| verdict の主張 | 再測定コマンド | HEAD での結果 |
|---|---|---|
| Guard Runtime 機構の不在（8+ パターン） | 1 パターン 1 実行 `git grep -nIiF -- "$p" HEAD`、rc 個別採取 | 全 10 パターン rc=1 hits=0（§2 P1） |
| `error(` 分散 157/8/75/3 | `grep -cE '^[^/]*\berror\(' <file>` | state 157 / orchestrate 8 / bolt 75 / lib 3 — **完全一致** |
| core tools 132 ファイル | `ls packages/framework/core/tools/*.ts \| wc -l` | 132 — 一致 |
| state 6094 / orchestrate 6835 行 | `wc -l` | 6094 / 6835 — 一致 |
| result 語彙 `export type` 38 件 | §2 P6 | 38 — 一致 |
| sensor manifest 12 / `amadeus-sensor*.ts` 15 | `ls .claude/sensors/*.md \| wc -l` / `ls packages/framework/core/tools/amadeus-sensor*.ts \| wc -l` | 12 / 15 — 一致 |
| `AMADEUS_SKIP_*` 4 種 | §2 P7 | `ARTIFACT_GUARD` / `BLOCKING_SENSOR_GUARD` / `GATE_REVISION_RECOVERY` / `HUMAN_PRESENCE_GUARD` — 4 種一致 |
| cutoff 260809 | `grep -n BLOCKING_SENSOR_CUTOFF_YYMMDD` | `:667` / `:1841` — 一致 |

### ⚠ verdict の述語 1 件が再実行不能（訂正事項）

reviewer-1 の「Stage 完了 4 ハンドラ」述語 `git grep -nIE 'setCheckbox\([^)]*"completed"'` は HEAD で **rc=1 / 0 hit**（対象集合 `packages/framework/core/tools`）。原因は結果の変化ではなく**述語の欠陥**: 実コードは `setCheckbox(validateStageState(content), completedSlug, "completed")` であり、`[^)]*` が `validateStageState(content)` の `)` を越えられない。正しい述語 `git grep -nI "setCheckbox" -- packages/framework/core/tools` で再測定した結果、**結論（4 箇所 `:2780` `:2882` `:3066` `:4021`）は一致**する。`cid:reverse-engineering:c6-absence-predicate-exit-code` の同族事例。

**判定: xrev scan currency 成立。** verdict を一次入力として使用してよい。ただし (i) `amadeus-utility.ts` を引く行ピンは +40 で再解決、(ii) 上記述語は書き直して引き継ぐこと。

---

## 2. 検索述語の完全記録（P1〜P13、すべて再実行可能）

`cid:requirements-analysis:enumeration-completeness-review` / `numbers-from-command-output-only` に従い、述語・対象集合・除外条件を結果と同所に置く。すべて worktree ルートで実行。

| ID | 述語 | 対象集合 | 除外 | 結果 |
|---|---|---|---|---|
| P1 | `for p in GuardRuntime guard-runtime guardRuntime LifecycleGuard lifecycle-guard lifecycleGuard before-intent-birth beforeIntentBirth registerGuard "Guard Runtime"; do out=$(git grep -nIiF -- "$p" HEAD); echo "$p rc=$?"; done` | HEAD 全 tracked | なし。**1 パターン 1 実行・パイプなし・rc 個別採取** | 全 10 件 rc=1 hits=0（rc=1 は一致なしの正常終了） |
| P2 | `git grep -nI 'Refusing' -- packages plugins \| wc -l` | `packages/`, `plugins/` | なし | 32 行。内訳（`git grep -lI 'Refusing' -- packages plugins`）= state.ts 23 / audit.ts 3 / migrate.ts 2 / log.ts 2 / lib.ts 2 |
| P3 | `git grep -nI "verifyStageCompletionGuards"` | repo 全域 | — | 定義 1（`amadeus-state.ts:2539`）+ 呼出 4（`:2763` `:2877` `:3054` `:3998`）+ codekb 1 + test 1 |
| P4 | `git grep -nI "verifyPhaseCheckArtifact"` | repo 全域 | — | 定義 `amadeus-state.ts:392` + 呼出 4（`:2775` `:2926` `:3059` `:4009`）+ 1（`amadeus-jump.ts:581`、import `:8` / コメント `:576`）+ record/codekb 多数 |
| P5 | `git grep -nI "setCheckbox" -- packages/framework/core/tools` | core tools | — | `"completed"` 書込は `amadeus-state.ts:2780` `:2882` `:3066` `:4021` の 4 箇所。reviewer-1 の `setCheckbox\([^)]*"completed"` は rc=1（0 hit）で**再実行不能** — 入れ子括弧により文字クラスが越えられない |
| P6 | `git grep -nIE 'export type [A-Za-z]*(Guard\|Verdict\|Outcome)[A-Za-z]* =' -- packages/framework/core/tools \| wc -l` | core tools | — | 38 |
| P7 | `git grep -hoI 'AMADEUS_SKIP[A-Z_]*' \| sort -u` | repo 全域 | — | 4 種（`ARTIFACT_GUARD` / `BLOCKING_SENSOR_GUARD` / `GATE_REVISION_RECOVERY` / `HUMAN_PRESENCE_GUARD`） |
| P8 | `grep -cE '^[^/]*\berror\(' packages/framework/core/tools/<f>` | 4 ファイル | 行頭コメント行 | state 157 / orchestrate 8 / bolt 75 / lib 3 |
| P9 | `git grep -nIE 'case "(advance\|finalize\|approve\|reject\|complete-workflow\|park\|unpark\|archive\|unarchive\|skip\|gate-start\|delegate-approval\|delegate-rejection\|declare-docs-only\|declare-units-done)"' packages/framework/core/tools/amadeus-state.ts` | state.ts | — | **15 verb**（`:1034`〜`:1108`）。Issue の 4 checkpoint はこの**部分集合** |
| P10 | `git grep -nI 'permissionDecision' -- packages/framework/core/hooks packages/framework/harness .claude/hooks` | hook 層 | — | `core/hooks/amadeus-subagent-model-guard.ts:89` のみ |
| P11 | `comm -12 <(cited paths sorted) <(git diff --name-only 10dbac595..HEAD \| sort -u)` | — | — | 2（§1 の currency 交差） |
| P12 | `git diff -U0 854692fd7..HEAD -- packages/framework/core/tools/amadeus-state.ts \| grep '^@@'` | state.ts | — | **27 hunk**。`:663` 付近 +14、`:1675` 付近で blocking sensor 領域が大幅改稿、`:2038` / `:4676` 付近で +12 / +30。**`:663` 以降の全行ピンがずれている** |
| P13 | `grep -cE 'amadeus-(state\|orchestrate\|sensor\|utility\|reviewer-runtime\|plugin-compose\|intent-autonomy-production\|config\|audit)\.ts:[0-9]+' <codekb file>` | codekb 8 artifacts | — | §5 の表 |

exit code 確認済み: P1 は全 10 件で rc を個別採取（全て rc=1 = 一致なしの正常終了）。P2 / P3 / P5 / P6 / P7 は rc=0（ヒットあり）。P5 の reviewer 述語は rc=1 を観測し、これを「0 hit」ではなく**述語欠陥**として切り分けた（正しい述語で 4 hit を確認）。

---

## 3. `base..observed` 差分の要約（35 commits / 233 files）

`packages/framework/core/tools` の内訳（`git diff --stat 854692fd7..HEAD -- packages/framework/core/tools` = 9 files, 680 insertions(+), 105 deletions(-)）:

```
amadeus-audit.ts                      |   2 +
amadeus-config.ts                     |  13 +
amadeus-intent-autonomy-production.ts |  89 ++++++
amadeus-orchestrate.ts                | 162 ++++++++---
amadeus-plugin-compose.ts             |  90 ++++---
amadeus-reviewer-runtime.ts           | 148 ++++++++--
amadeus-sensor.ts                     |  46 ++--
amadeus-state.ts                      | 185 ++++++++++-----
amadeus-utility.ts                    |  50 ++++
```

tests: A=17, M=38（`git diff --name-status 854692fd7..HEAD -- tests | awk '{print $1}' | sort | uniq -c`）。

**本 intent の主題に直接影響する着地（2 件）**

1. **`16d94927d`（#2945）** — full autonomy の型付き stage failure を Quality Repair / REPAIR_STALLED へ接続。`admitProductionStageFailure`（`amadeus-intent-autonomy-production.ts:1102`）+ `stageFailureDirective`（`amadeus-orchestrate.ts:5779`）という**新しいライフサイクル進行ガードが base 以後に増えた**（棚卸しの **G22**）。Issue #2771 の「ガードを追加するたび手作業配線」premise の追加実例であり、同時に**移行対象の増加**でもある。verdict は base より後の断面（review-sha）を見ているため verdict 側には反映済み。
2. **`abb18bd5b` / `1cc04e966` / `95021e8a5`** — coverage allowlist の意味的セレクタ移行と免除整理。`tests/.coverage-patch-allowlist.json:124` に `"function": "authorizeWorkflowCompletion"` エントリが残存する。**ガード実装の変更時に allowlist 整合が要る**。

CI 構成の差分（`git diff --name-only 854692fd7..HEAD -- .github tests/run-tests.sh package.json mise.toml plugins/*/plugin.json`）: `.github/workflows/issue-labels.yml`、`.github/workflows/review-thread-resolution.yml`、`mise.toml`、`plugins/coverage-patch-quick/plugin.json`、`plugins/pr-convergence/plugin.json`。`tests/run-tests.sh` は**無変更** — ブロッキング集合の構成自体に変化なし。

---

## 4. ライフサイクル進行ガードの全数棚卸し（G1〜G40、observed `89532174c`）

分類凡例 — **built-in**: フレームワーク不変条件 / **policy**: ユーザ設定・intent 属性依存 / **off-switch**: 環境変数による無効化面。

### C1. Intent 生成前ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G1 | `amadeus-utility.ts:4097` | `function scanWorkspaceOrRefuse(projectDir: string): ClassifiedWorkspaceScan {` / `if (result.kind === "inconclusive") {` / `refuseWithoutAudit(formatInconclusiveRefusal(result.scan));` | intent birth 直前（mutation 前） | 判別ユニオン `kind: "inconclusive" \| classified` → `refuseWithoutAudit` = process exit | fail-closed（コメント: `An inconclusive result ... refuses loudly — no intent is minted, nothing is written (BR-U06-22)`） | built-in |
| G2 | `amadeus-utility.ts:4415` | `if (isReservedHelpRecordName(slugSource, 24)) {` → `refuseWithoutAudit(...)` | 同上 | boolean → exit | fail-closed | built-in |
| G3 | `amadeus-utility.ts:4410`（def `:4362`） | `const autonomy = birthAutonomyOrDie(flags);` | 同上 | `BirthAutonomyMode \| null` / `die` | fail-closed | policy |
| G4 | `amadeus-utility.ts:4428` | `repos = resolveBirthRepoSet(projectDir, flags.repos);` を `try/catch` → `die(errorMessage(e))` | 同上 | throw → `die` | fail-closed | built-in |

注: `handleIntentBirth` は HEAD で **`:4387`**（review-sha `:4347` から +40、§1 参照）。C1 のパスはすべて `packages/framework/core/tools/` 配下。

### C2. Stage 完了ガード（既に chokepoint 化済み）

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G5 | `amadeus-state.ts:2539` | `function verifyStageCompletionGuards(pd: string, stage: VerifiableStage): void {` / `  verifyStageArtifacts(pd, stage);` / `  verifyBlockingSensors(pd, stage);` | 4 完了ハンドラ共通 | void + `error()` exit | fail-closed | built-in |
| — | 呼出 `:2763` `:2877` `:3054` `:3998`（P3） | — | advance / finalize / complete-workflow / approve | — | — | — |
| G6 | `amadeus-state.ts:2460` | `function verifyStageArtifacts(pd: string, stage: VerifiableStage): void {` | 成果物の存在 | `error()` | fail-closed / `AMADEUS_SKIP_ARTIFACT_GUARD` で全面無効化可（`artifactGuardDisabled()` `:1653`） | built-in + off-switch |
| G7 | `amadeus-state.ts:1835` | `export function verifyBlockingSensors(pd: string, stage: {...}): void {` / `  if (blockingSensorGuardDisabled()) return;` / `  if (blocking.length === 0) return;` / `  if (!enforced) return;` | blocking sensor verdict | `BlockingSensorFinding` 判別ユニオン（`never-fired` / `stale` / terminal）→ `error()` | fail-closed（`A blocking sensor that never ran is not a pass.` `:1855-1857`）。ただし `blockingSensorGuardDisabled()` `:1817` と `BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`（`:667` / `:1841`）の**日付 cutoff** で適用除外 | built-in + off-switch + policy（intent 日付） |
| G8 | `amadeus-state.ts:1752` / `:1824` | `export function evaluateBlockingSensors(` / `function blockingSensorIdsForStage(slug: string): string[] {` | 宣言駆動の適用解決（`sensors_applicable`） | `BlockingSensorFinding \| null` | 純関数（判定のみ） | built-in |
| G9 | `amadeus-sensor.ts:19-31` | `//   e) status non-0/non-127 (non-timeout)  → PASSED script-error: exit-<n>` / `//   f) bad JSON / missing pass  → PASSED script-error: bad-output` | sensor 実行結果 → verdict | 真理値表 | **fail-open**（異常は PASSED へ倒す）。**G7 の fail-closed と方向が逆** | built-in |
| G10 | `amadeus-state.ts`（`"Refusing to complete ... unit(s) produced"`） | code-producing stage の unit レビュー未了拒否 | stage 完了 | `error()` | fail-closed | built-in |

### C3. Phase 境界ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G11 | `amadeus-state.ts:392` | `export function verifyPhaseCheckArtifact(pd: string, phase: string): void {` / `  if (artifactGuardDisabled()) return;` / `  if (!PHASE_CHECK_REQUIRED_PHASES.has(phase)) return;` | phase 境界完了 | `error()` exit | fail-closed。コメント `:386-391` verbatim: `Callers invoke it BEFORE writeStateFile; error() exits, so a refusal` / `leaves the state file untouched (the in-memory content flips are discarded).` / `Exported so amadeus-jump.ts reuses the identical gate on its forward crossing.`。`AMADEUS_SKIP_ARTIFACT_GUARD` を G6 と共有 | built-in + off-switch |
| — | 呼出 5 箇所: `amadeus-state.ts:2775` `:2926` `:3059` `:4009` + `amadeus-jump.ts:581`（`if (hasExecuted) verifyPhaseCheckArtifact(pd, phase);`） | — | advance / finalize / complete-workflow / approve / 前進 jump | — | — | — |

**jump は第 5 の権威ある遷移**（`amadeus-jump.ts:581`、`:576` コメント `on disk, the same gate advance / approve apply. verifyPhaseCheckArtifact`）。ただし jump は G5（stage 完了ガード）を通さない — `[S]` / `pending` 化であり完了ではないため、**設計上正しい非対称**である。

approve 経路の順序（observed 実読、`amadeus-state.ts`）:

```
3998    verifyStageCompletionGuards(pd, stage);
4001    const authorization = authorizeApproval(pd, content, stage, override);
4004    const nextForPhaseGate = nextInScopeStage(slug, approveScope, content);
4008    if (!nextForPhaseGate || nextForPhaseGate.phase !== stage.phase) {
4009      verifyPhaseCheckArtifact(pd, stage.phase);
4021    setCheckbox(validateStageState(content), slug, "completed"),
```

### C4. Workflow 完了ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G12 | `amadeus-state.ts:2963` | `function completeWorkflowForTarget(args: string[], pd: string): void {` | workflow 完了 | — | 集約点 | built-in |
| G13 | `amadeus-state.ts:6011` → 呼出 `:3002` | `verifyPreparedWorkflowCompletion(pd, content, completedSlug, requestedInstance);` | 完了準備の一貫性 | `error()` | fail-closed | built-in |
| G14 | `amadeus-state.ts:4689` → 呼出 `:3008` | `verifyMandatoryPluginStages(pd, content, completedSlug);` / 拒否文言 `Refusing workflow completion: host-bound plugin stage "${slug}" is mandatory` | 必須 plugin stage 完了 | `error()` | fail-closed | policy（plugin 設定依存） |
| G15 | `amadeus-workflow-completion.ts:161` → 呼出 `amadeus-state.ts:3030` / `amadeus-orchestrate.ts:613` | `completionReceipt = authorizeWorkflowCompletion({...})` / `catch (cause) { const refusal = ...; if (cause instanceof WorkflowCompletionNotSettledError) awaitCompletion(refusal); error(refusal); }` | Goal receipt（`ACHIEVED`）照合 | typed error（`WorkflowCompletionNotSettledError` を分岐）→ `awaitCompletion` or `error()` | fail-closed。**3 値的**（settled=通過 / not-settled=待機 / それ以外=拒否）— 現行で最も語彙が豊富 | built-in |
| G16 | `amadeus-state.ts:3010-3013` | `error("Goal reconciliation refused completion: Intent record is unresolved")` | record 解決 | `error()` | fail-closed（コメント: `An unresolved Intent record is a broken workspace, not a completion waiting to settle`） | built-in |
| G17 | `amadeus-orchestrate.ts:591` `emitMirrorBoundaryIfNeeded` → 呼出 `:673` `:3427` `:5682` `:6179` | `if (!emitMirrorBoundaryIfNeeded(pd, stateContent, approvalIntent)) {` | mirror boundary receipt | boolean（`MirrorBoundaryOutcome` `amadeus-mirror-coordinator.ts:71` を内部で潰す） | **boolean 化により復旧情報が呼出側で失われる** | policy（mirror mode 設定依存） |

### C5. Autonomy 裁定ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G18 | `amadeus-intent-autonomy-production.ts:309` / `:291` | `function authorizeProductionOccurrence(` / `function emitAuthorizationRefusal(projectDir: string, refusal: AuthorizationRefusal): void {` | autonomy 下の各 occurrence | `AuthorizationRefusal` typed | fail-closed | policy |
| G19 | `amadeus-intent-autonomy-production.ts:487` / `:744` | `function resolveDeclarationProvenance(` / `if (!provenance.ok) return { ok: false, error: provenance.error };` | 宣言の provenance（実 HUMAN_TURN 由来か） | `{ok:true} \| {ok:false, error}` Result | fail-closed | built-in |
| G20 | `amadeus-intent-autonomy-production.ts:507` / `:532` | `function grantScope(input: GrantScopeInput): GrantScopeDescriptor` / `export function semiAuthorityScope(intentUuid: string, scopeId: string)` | grant scope の一致 | descriptor | — | policy |
| G21 | `amadeus-intent-autonomy-production.ts:794` | `export function commitProductionStageGateDecision(...): { readonly kind: "not-authorized"; readonly reason: string } \| ...` | stage gate の梯子裁定 | 判別ユニオン `not-authorized` | fail-closed | policy |
| **G22 ★** | `amadeus-intent-autonomy-production.ts:1102` | `export function admitProductionStageFailure(input: ProductionStageFailureInput): ProductionStageFailureResult {` / `:1128 return stall === null ? { kind: "error", reason: "repair-stall-envelope-missing" } : { kind: "parked", stall };` | 型付き stage failure → Quality Repair / REPAIR_STALLED | 判別ユニオン（`parked` / `error` / 他） | fail-closed（コメント `:1125-1126`: `An absent envelope means the projection and the park disagree — fail closed rather than announce a stop nobody can resume.`） | policy |
| — | 出口 `amadeus-orchestrate.ts:5779` `export function stageFailureDirective(` / `:5816 emit(stageFailureDirective(stage, admitProductionStageFailure({...})));` | — | — | — | — | — |
| G23 | `amadeus-intent-autonomy.ts:14-15` | `export type InteractionKind = "stage-gate" \| "phase-gate" \| "walking-skeleton" \| "question";` / `export type StopReason = "AWAITING_HUMAN" \| "REPAIR_STALLED" \| "NORM_CONFLICT" \| "USER_PARKED";` | checkpoint 語彙の既存の別系統 | 文字列ユニオン | — | policy |
| G24 | `amadeus-autonomy-review.ts:1070` | `readonly allowedInteractionKinds: readonly ("stage-gate" \| "phase-gate" \| "walking-skeleton" \| "question")[];` | 同上（**重複定義**） | 同上 | — | policy |

★ **G22 は base（`854692fd7`）以後に着地した新規ガード**（`16d94927d` / #2945）。§3 参照。

### C6. Human presence / delegation ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G25 | `amadeus-state.ts:3452` | `if (humanPresenceGuardDisabled()) {` / `// skip — suite-wide deterministic off-switch (AMADEUS_SKIP_HUMAN_PRESENCE_GUARD)` | approve / reject gate | `error()` | fail-closed / off-switch。文言: `Refusing to ${verb} "${slug}": a real human has not acted at this gate since it opened. ... (autonomous Construction is exempt)` — **autonomy による免除がガード内に埋込** | built-in + policy |
| G26 | `amadeus-state.ts:4306` | `if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd)) { rejectUngroundedDelegation(); }` | delegate-approval | 専用 reject 関数 | fail-closed | built-in |
| G27 | `amadeus-state.ts:4395` | `if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd)) { error("Refusing to delegate rejection: ...") }` | delegate-rejection | `error()` | fail-closed | built-in |
| G28 | `amadeus-lib.ts:5342` | `export function humanPresenceGuardDisabled(): boolean { return process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD === "1"; }` | 共有 off-switch | boolean | — | off-switch |
| G29 | `amadeus-log.ts:280` | `} else if (humanPresenceGuardDisabled()) {` / 拒否文言 `Refusing to record this answer: a real human has not acted at this checkpoint this turn.` + `Refusing to record this answer: an approval gate is open.` | question 応答記録 | `error()` | fail-closed | built-in |

### C7. その他のライフサイクル遷移ガード

| # | file:line | verbatim | checkpoint | 判定語彙 | fail 挙動 | 種別 |
|---|---|---|---|---|---|---|
| G30 | `amadeus-state.ts:1399`（`function handlePark`、直上コメント `:1390-1398`） | `an unattended autonomous Construction run must never park, so the tool refuses \`park\` outright under \`Construction Autonomy Mode: autonomous\`. This is defence-in-depth beside the Stop hook's identical guard` / 文言 `Refusing to park: Construction Autonomy Mode is autonomous.` | park | `error()` | fail-closed。**hook 側に同一ガードの二重実装あり（2 層）** | policy |
| G31 | `amadeus-state.ts:3362` / `:3365` | `Refusing to gate-start "${slug}": ${slug}-questions.md has a filled [Answer] but no ruling reference (E-code) or leader-approval timestamp line.` | gate-start | `error()` | fail-closed | built-in |
| G32 | `amadeus-state.ts`（declare-docs-only 群、`Refusing to declare-docs-only:` ×5） | `--evidence must reference a human-approval audit event as` / `no ${eventType} event for stage "${stage}" exists in this intent's audit trail.` | docs-only 宣言 | `error()` | fail-closed | built-in |
| G33 | `amadeus-lib.ts`（declare-units-done ×2） | `Refusing to declare-units-done: --units must name at least one unit directory.` | units 完了宣言 | `{ok:false, reason}` を返す（**exit しない**） | 呼出側依存 | built-in |
| G34 | `amadeus-audit.ts`（×3） | `Refusing to append "${eventType}" via the general audit CLI: presence/provenance events are minted only by their trusted in-process writers` | audit 事実の捏造防止 | `error()` | fail-closed | built-in |
| G35 | `amadeus-swarm.ts:763` `:784` `:798` `:813` `:852` `:854` | `kind: "retry-refused",` | swarm unit retry の可否 | 判別ユニオン `retry-refused`（判定は `classifyRetry(facts, allowlistVersion)`） | fail-closed | policy（allowlist 版依存） |
| G36 | `amadeus-swarm.ts:236` | `function checkConverged(projectDir: string, cwd: string, checkCmd: string): boolean {` | swarm 収束 | boolean | — | policy |
| G37 | `amadeus-bolt.ts:1197-1214`（`approve-batch`） | `the engine fans a parallel batch out and then refuses the NEXT batch until the finished one is approved here — one gate per batch, not one per Bolt.` | batch 境界ゲート | state field ledger + `GATE_APPROVED` | fail-closed | policy（`Construction Autonomy Mode: gated`） |
| G38 | `amadeus-lib.ts:3042` / `:3085` | `export type IntentOperationGuardResult =` — `{kind:"allowed"}` / `{kind:"rejected", error:{..., recovery}}` | intent 操作（archive / unarchive / select 等） | 判別ユニオン + `recovery` | fail-closed。**Issue が求める「復旧案付き」語彙が既に実装済み** | built-in |
| G39 | `amadeus-lib.ts:554` `RecomposeGuardResult` / `amadeus-advisory-choice.ts:127` `AdvisoryHoldVerdict` / `:152` `AdvisoryChoiceGuardResult` | — | recompose / advisory hold | 判別ユニオン | — | policy |
| G40 | `packages/framework/core/hooks/amadeus-subagent-model-guard.ts:89` | `permissionDecision: "deny",` / `permissionDecisionReason: decision.reason,` | subagent 起動 | PreToolUse hook の deny | fail-closed | **CLI ツール層の外**（harness / hook 層） |

（file:line の path prefix: G1〜G39 は `packages/framework/core/tools/`、G40 は明記のとおり。）

---

## 5. 構造的所見（5 点）

1. **完了 chokepoint は既存**（G5）。`amadeus-state.ts:2520-2526` verbatim: `FOUR handlers mark a stage [x] — approve, advance, finalize and complete-workflow — each under its own lock, with no shared transition function between them. ... this function is the fix for that gap and the place any fifth guard goes.` — Issue が「新設」と書く集約点は、**Stage 完了に限り既に存在する**。不足しているのは共通 Interface と他 3 checkpoint（intent birth / phase 境界 / workflow 完了）への水平展開である。
2. **判定語彙が 5 系統に分裂**: (a) `error()` process-exit（state.ts で 157 箇所、P8）、(b) 判別ユニオン + `recovery`（`IntentOperationGuardResult`、G38）、(c) boolean（G17 / G36）、(d) typed error class（G15 の `WorkflowCompletionNotSettledError`）、(e) `{ok, reason}` Result（G19 / G33）。`export type ...(Guard|Verdict|Outcome)... =` は **38 件**（P6）。
3. **fail-closed と fail-open が同一経路で衝突**: G7（sensor 未実行 = 不通過、fail-closed）の入力を作るのが G9（sensor 実行、異常は PASSED、fail-open）である。Issue の「移行前後で判定結果が変わらない」AC と「fail-closed」AC は**ここで両立しない**。
4. **迂回路が 3 系統**: off-switch 4 種（G6 / G7 / G11 / G25 が消費、G28 が共有実装）、日付 cutoff 1 種（G7 の `260809`）、hook 層の別配線（G30 が park で二重実装、G40 は CLI 層外）。
5. **2 層構造**: CLI ツール層 + harness hook 層。**単一 Runtime を名乗るなら hook 層の扱いが主要論点**になる。

---

## 6. 既存 codekb artifacts の更新必要箇所（P13 の実測）

`base..observed` で変更された 9 ファイルへの行ピン引用数:

| artifact | 行ピン引用 | 判定 |
|---|---|---|
| `architecture.md` | 97 | **更新必須**（phase-check 記述群の行ピン再解決 + #886 節の履歴ラベル化） |
| `code-quality-assessment.md` | 57 | **更新必須**（`:991` の phase-check 行ピン、`:2530` の #886 記述） |
| `api-documentation.md` | 39 | **更新必須**（`verifyStageCompletionGuards` エントリの再解決 + G22 追記） |
| `component-inventory.md` | 32 | **更新必須**（`verifyPhaseCheckArtifact` の位置、境界完了 4 経路の旧系譜残存） |
| `code-structure.md` | 0 | 更新不要。**本 intent の節を持たないため、ここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`） |
| `technology-stack.md` | 0 | 更新不要。`base..observed` で tech stack に変化なし（bun / TS / Biome / fast-check 不変、新規 runtime dependency なし） |
| `dependencies.md` | 0 | 更新不要 |
| `business-overview.md` | 0 | 更新不要。同じく本 intent の節を持たない |

---

## 7. requirements / design が引き継ぐべき「訂正」（6 点）

1. `amadeus-utility.ts` の行ピンは **+40 で再解決**（review-sha → HEAD）。`handleIntentBirth` = **`:4387`**。
2. reviewer-1 の `setCheckbox\([^)]*"completed"` は**書き直しが必要**。結論（4 箇所）は正しいが述語は再実行不能（§1、P5）。
3. **checkpoint 列挙 4 点は部分集合**。P9 の実測 15 verb + jump（`amadeus-jump.ts:581`）+ Bolt batch gate（G37）+ swarm retry（G35）を含めた全体像を先に確定すること。
4. **G22**（`admitProductionStageFailure`、`16d94927d` / #2945、base 以後着地）は verdict 作成時点では新しい。**移行対象に加算されている**。
5. **fail-closed AC と無変更回帰 AC の衝突**（G7 vs G9）は observed でも解消していない — `amadeus-sensor.ts:19-31` の真理値表は `base..observed` で変更があるが**分岐 e/f は fail-open のまま**（verbatim 再確認済み）。
6. **既存 reuse 候補**: G7 / G8（宣言駆動の適用解決 + 監査受領証 + fail-closed）と G38（`IntentOperationGuardResult` の `{kind, error:{recovery}}`）。「新規 Runtime を起こす」前に、inception ノルムが要求する **reuse inventory をこの 2 点に対して作る**こと。

---

## 適用範囲外（明示）

Guard Runtime の採否、共通 Interface の形、hook 層を Runtime に含めるか、G9 の fail-open を維持するか反転するか、off-switch と日付 cutoff の去就 — これらの**裁定はすべて requirements-analysis / application-design の所掌**である。本 RE は移行対象集合を全数で確定し、裁定を証拠から下せる状態にすることのみを行った。
