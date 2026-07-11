# code-summary — #836 Phase Progress ロールアップ配線(Bolt FR-3)

- PR: https://github.com/amadeus-dlc/amadeus/pull/880
- ブランチ: `bolt/836-phase-progress-rollup`(コミット 85b725559)
- ベース: origin/main(#869 #842 / #867 #841 着地確認済み)

## 実装した変更

### 正本
- `packages/framework/core/tools/amadeus-state.ts`
  - handleAdvance: 既存の `if (crossesPhaseBoundary)` 監査ブロック内で `markPhaseVerified(completedStage.phase)` + `setPhaseProgress(nextStage.phase, "Active")`。新規 if を作らず既存分岐へ畳んで CCN 無増加。
  - handleFinalize: nextStage あり & 境界越え → 完了 phase Verified + 次 phase Active。nextStage null(terminal) → 完了 phase Verified。
  - handleCompleteWorkflow: 完了 phase Verified(Status: Completed と同一 content チェーン)。
  - `handleFinalize` / `handleCompleteWorkflow` を export(in-process seam)。
- `packages/framework/core/tools/amadeus-utility.ts`
  - 純粋 export 関数 `initPhaseStatus(phase, firstPostInitPhase, phaseHasExecute)` 新設。越境時 initialization→Verified・最初 post-init phase→Active。
  - init テンプレの `phaseStatus` クロージャをこれへ委譲。約束コメント現行化。
  - `handleIntentBirth` を export(in-process init seam)。
- dist(claude/codex/kiro/kiro-ide)+ self-install(.claude/.codex)を同一コミットで再生成。

### テスト
- 新規 `tests/unit/t-phase-progress-rollup-seam.test.ts`(11 tests):advance 境界 / complete-workflow terminal / finalize terminal / finalize 境界 / 全経路 drive 閉包 / in-process init(bugfix)/ `initPhaseStatus` 全分岐。すべて dist tree から import(#761 seam 前例)。
- `tests/integration/t39.test.ts`:`Initialization === "Active"` → `"Verified"` へ現行化(旧アサートは #836 のバグを固定していた)。ヘッダ/近傍コメントも現行化。
- 新規 fixture:`tests/fixtures/state-bugfix-postinit.md`(bugfix 越境後の忠実ロールアップ)、`state-bugfix-final-construction.md`(最終 construction stage)。

## 根本原因(2系統・実コード確認)
1. advance/finalize/complete-workflow が phase 境界で PHASE_* を発火しつつロールアップ未 flip。approve は advance/complete-workflow へ委譲(state.ts 1643-1654)するため #836 の delegate フローもこの3配線で修正。
2. init が越境済み(PHASE_VERIFIED/PHASE_STARTED を hand-off で発火)なのにロールアップは Initialization=Active/最初phase=Pending → `Initialization: Active` 残留。init テンプレの値修正で解消。

## 落ちる実証
dist の `setPhaseProgress` を `return content` へ一時短絡 → seam 4テスト(advance/complete-workflow/finalize/全経路)RED を実測 → 復元で GREEN(11 pass)。`initPhaseStatus` 純関数テストは state.ts 非依存のため短絡下でも pass(切り分け妥当)。

## 閉包実測(#836 verbatim)
repo 外 scratch(`CLAUDE_PROJECT_DIR` 明示、scratch-script-discipline 準拠)で実 CLI:init --scope bugfix → `Initialization: Verified` を実測 → advance×3 → complete-workflow → `Status: Completed` かつ Active/Pending 残留ゼロ(grep で非再現確認)。

## 同根棚卸し(step 8)
`Lifecycle Phase`/`Status: Completed`/`PHASE_*` writer を全数逆引き:init・jump・advance・finalize・complete-workflow のみ。approve/skip は委譲で継承。残余の未配線経路なし。jump は #869 済。

## 判断記録

### no-op loud 化(e5 nit)— 現状維持
`setPhaseProgress` の `if(!field) return content` は defensive no-op。本配線の呼び出しは全て canonical stage-graph phase(`PHASE_PROGRESS_FIELD` キー)を渡すため**到達不能**(AGENTS.md §2「不可能シナリオのエラー処理を書かない」)。共有 helper(#842 jump も使用)の契約変更は cross-bolt churn で非 surgical。`setField` のセクション欠落 no-op は pre-v7 state file 互換のため意図的許容(硬 throw は走行中 legacy workflow の advance を破壊 = より悪い)。偽グリーン対策は各テストが実 state file 上での flip を実測する点で担保。

### doctor 矛盾検出(step 8)— 別 Issue 推奨
「doctor が `Status: Completed × Phase Progress: Pending` を検出しない」は本修正が当該状態の発生自体を防ぐため防御の別軸。新規チェック導入は非 surgical・bugs-only スコープの別判断。本 PR スコープ外、別 Issue 起票を推奨。

## 逸脱申告(P3 準拠)
E-B6a 裁定は「4経路(jump/advance/finalize/complete-workflow)」。本 PR は3経路配線に**加えて init テンプレの越境値を修正**した。これは4経路の文面外だが、#836 受け入れ基準(Initialization は Verified)と閉包実測が init 修正なしに成立しないため、無申告にせず PR 本文・本 summary・完了報告で leader へ明示フラグする。是非の裁定を仰ぐ(不採用ならレビュー差し戻しで安価に復元可能)。

## 検証(全 exit 0 / PASS)
typecheck / lint / dist:check / promote:self:check / complexity-gate --check(ratchet held)/ gen-coverage-registry --check / run-tests.ts --unit(187 files 0 failed)/ --integration(0 failed)。push 前 lcov:diff 追加実行行は配線行・init クロージャ行含め全て DA>0。
