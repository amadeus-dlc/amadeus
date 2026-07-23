# Business Logic Model — U4-engine-boundary(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 処理フロー(next の phase boundary 経路への挿入)

```
next 共通入口で Mirror Boundary Receipts の auto-sync 専用 pending を canonical phase 順に確認
  → pending あり: 最古の1件だけへ固定 sync print directive を再発行(通常 routing は継続可能)
phase boundary 検出(既存経路 — PHASE_CHECK_REQUIRED_PHASES 通過後・次 phase 進行前)
  → 冪等判定(BR-U4-5): 本境界で発火済み → 既存フローへ(何も足さない)
  → U3 resolve(projectDir, space, intentDir)
      invalid → stdoutへ層+errorsを含む単一error directive JSONを返して停止。stderrは空または非規範advisory(BR-U4-3)
  → state の Mirror Issue フィールド読取(getField — 決定的)
  → MirrorBoundaryDecision 導出(BR-U4-2 の4象限)
      ask → ask directive(「ミラー同期しますか?」+未作成時 create 選択肢)発行。回答が「実行しない」なら直接 completed、選択verbは成功後に直接 completed(ask経路はpendingを使わない)
      auto-sync → Receipt を pending に原子更新後、print 指令(bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts sync、run-then-continue)発行
  → sync 成功後 Receipt を completed に原子更新。失敗/記録失敗は pending を維持
```

Receipt の単一正本は state の `Mirror Boundary Receipts` フィールドとし、canonical phase slug をキー、値を `pending | completed` とする。pendingはauto-syncだけを表す。行全体をtemp+rename相当のstate既存原子更新経路で置換する。未知キー、未知状態、構文破損は error としてfail-safeに停止し、completedへ推測しない。syncは期待本文への決定的setであり、同一境界IDでの再実行は本文と副作用が同一になる冪等契約とする(コメント等の追記副作用を持たない)。複数pendingはcanonical phase順に1回のnextで1件だけ処理し、成功した該当Receiptだけをcompletedへする。

## 実装順序(story-map U4 順序の詳細化)

1. 境界検出+ask 分岐(既定動作 — auto 概念なしでも成立する形を先に固定)+冪等判定
2. auto-mirror print 分岐(U3 resolve 接続+invalid loud)
3. 未作成×auto の ask 降格(4象限の最後のセル)+integration テスト全数

## テスト設計

- integration 層: 3境界×4象限の発火全数を fixture record で固定(FR-5/FR-6 受け入れ基準)。t135 等の既存 next 消費テストの green 維持(BR-U4-4 の棚卸しとセット)
- 障害注入: sync失敗→後続next共通入口で再発行→成功、sync成功→Receipt更新失敗→冪等再実行→completed、破損Receipt→error停止を固定
- 複数pending fixture: canonical順にdirectiveを1件ずつ発行し、失敗時は全状態不変、成功時は対象1件だけcompleted、残件は次回nextで処理
- 落ちる実証: invalid config 注入で loud エラー経路の赤を実測(実行時消費行へ — inject-runtime-consumed-lines)
- unit 層: MirrorBoundaryDecision 導出の純関数(resolve 結果+フィールド有無を引数注入)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:52:51Z
- **Iteration:** 2
- **Scope decision:** none

i1 M1(到達不能 skip variant)を2値縮約+外側ガード方式で是正 → i2 READY

### Findings

- MirrorBoundaryDecision を ask/auto-sync の2値へ縮約(是正済み・同根 grep 0)
