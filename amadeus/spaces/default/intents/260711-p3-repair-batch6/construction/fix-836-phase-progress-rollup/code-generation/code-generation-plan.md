# code-generation plan — #836 Phase Progress ロールアップ配線

Bolt: FR-3 / Issue #836 (P2 / S3-MAJOR / origin:bootstrap)
ブランチ: `bolt/836-phase-progress-rollup`
ベース: origin/main（#869 #842 / #867 #841 着地確認済み）

## 根本原因(実コード確認)

`## Phase Progress` ロールアップの各 phase フィールドを更新するのは、これまで:
- jump 経路: #842/#869 で配線済み(`amadeus-jump.ts` `applyClosedPhaseProgress`)
- init: セクションを最初に書くのみ(`amadeus-utility.ts` handleIntentBirthStateBuild)

残りの phase 境界通過経路が未配線:
- advance (`amadeus-state.ts` handleAdvance ~1176)
- finalize (handleFinalize ~1296/1304)
- complete-workflow (handleCompleteWorkflow ~1381)

そして delegate 承認フロー(approve, ~1643-1654)は `handleAdvance` / `handleCompleteWorkflow` へ委譲するため、この3経路を配線すれば #836 が指す「gate-start → approve → advance」標準フローも同時に修正される。

### 追加根本原因(実測で判明・#836 の主症状「Initialization: Active 残留」の直接原因)

init は `firstPostInitEntry.phase !== "initialization"` のとき、`amadeus-utility.ts` 2492-2509 で **initialization → 最初の post-init phase の PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を発火**し、Current Stage / Lifecycle Phase を最初の post-init stage(inception 等)へ**前もって越境**させている。ところが Phase Progress ロールアップは `phaseStatus` (2400) が `initialization` を常に `Active`、最初の post-init phase を `Pending` にしている。

→ initialization→最初phaseの境界は init が越境済みで、以降の advance はその境界を再通過しないため、`Initialization: Active` が完走後まで残留する。これが #836 の実測症状(Initialization: Active / Inception: Pending)そのもの。Issue の期待値も「Initialization は Verified」と明記。

したがって #836 の閉包には advance/finalize/complete-workflow の配線に加え、**init テンプレートで越境時に Initialization=Verified・最初の post-init phase=Active にする**修正が必須。タスクの「init テンプレートの約束文言と実装挙動の一致(乖離あれば同一 PR で現行化)」指示と、Issue の受け入れ基準(Initialization は Verified)に沿う。

> スコープ注記: E-B6a 裁定の「4経路(jump/advance/finalize/complete-workflow)」に対し、init テンプレートの値修正は文面上は追加面。ただし #836 の受け入れ基準が Initialization=Verified を要求し、閉包実測(step 7)が init 修正なしには成立しないため、宣言のうえ同一 PR で実施し完了報告で leader へフラグする(無申告逸脱にしない)。

## 変更方針(surgical)

### 1. `packages/framework/core/tools/amadeus-state.ts`
- handleAdvance: `crossesPhaseBoundary` のとき、field 更新チェーン内(writeStateFile 前)で
  `content = markPhaseVerified(content, completedStage.phase); content = setPhaseProgress(content, nextStage.phase, "Active");`
- handleFinalize: nextStage あり & 境界越え → 同上。nextStage null(terminal) → `markPhaseVerified(content, completedStage.phase)`(Status=Completed と同一チェーン)。
- handleCompleteWorkflow: field 更新チェーン内で `content = markPhaseVerified(content, completedStage.phase)`。
- `handleFinalize` / `handleCompleteWorkflow` を `export`(in-process seam テスト駆動のため。handleAdvance は既に export 済み)。

### 2. `packages/framework/core/tools/amadeus-utility.ts`
- 純粋関数 `initPhaseStatus(phase, firstPostInitPhase, phaseHasExecute)` を export(spawn-blindspot 回避の seam)。越境時 initialization→Verified / firstPostInitPhase→Active、それ以外は execute 有→Pending / 無→Skipped。
- テンプレートの `phaseStatus` クロージャをこの helper へ委譲。約束コメント(2396-2399)を現行化。

## テスト(in-process seam 優先・dist tree から import・#761 seam 前例)

新規 `tests/unit/t-phase-progress-rollup-seam.test.ts`:
- (a) advance 境界通過(bugfix, state-mid-inception: inception→construction): Inception→Verified, Construction→Active【修正前 RED】
- (b) complete-workflow terminal(bugfix 最終 construction, 新 fixture): Construction→Verified & Status=Completed【#836 主再現の直接閉包・修正前 RED】
- (c) finalize terminal: 完了 phase→Verified
- (d) #836 全経路閉包(in-process 逐次 advance → complete-workflow): 完走後 Active/Pending 残留ゼロ・Initialization=Verified
- (e) `initPhaseStatus` 純関数の全分岐
- 既存 `tests/integration/t39.test.ts` L285 `Initialization === "Active"` を `"Verified"` へ現行化(旧アサートは #836 のバグそのものを固定していた)。first-post-init phase=Active の追加アサートも付す。

## 落ちる実証(step 6)
- 配線を一時 revert → (a)(b) RED を実測 → 復元 GREEN。code-summary に記録。

## no-op loud 化(e5 nit)判断
- `setPhaseProgress` の `if(!field) return content` は defensive no-op。本配線の呼び出しは全て canonical stage-graph phase(PHASE_PROGRESS_FIELD のキー)を渡すため到達不能。共有 helper(#842 jump も使用)の契約変更は cross-bolt churn。setField のセクション欠落 no-op は pre-v7 state file 互換のため意図的に許容(硬 throw は走行中 legacy workflow の advance を壊す)。偽グリーン対策はテストが実 state file 上での flip を実測する点で担保。→ 現状維持。詳細は code-summary。

## doctor 矛盾検出(step 8)判断
- 「doctor が Status: Completed × Phase Progress: Pending を検出しない」は本修正が当該状態を発生させなくする防御の別軸(新規チェック=非 surgical)。別 Issue 起票を推奨。code-summary に記録。

## 検証(step 10)
typecheck / lint / dist:check / promote:self:check / complexity-gate --check / 新規+t17+t39+t-jump-phase-events-seam / gen-coverage-registry --check。push 前 lcov で diff 追加行(配線行含む)未カバー0。
