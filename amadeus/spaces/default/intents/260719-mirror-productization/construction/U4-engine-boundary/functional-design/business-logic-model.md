# Business Logic Model — U4-engine-boundary(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 処理フロー(next の phase boundary 経路への挿入)

```
phase boundary 検出(既存経路 — PHASE_CHECK_REQUIRED_PHASES 通過後・次 phase 進行前)
  → 冪等判定(BR-U4-5): 本境界で発火済み → 既存フローへ(何も足さない)
  → U3 resolve(projectDir, space, intentDir)
      invalid → stderr へ層+errors、エラー終了(BR-U4-3)
  → state の Mirror Issue フィールド読取(getField — 決定的)
  → MirrorBoundaryDecision 導出(BR-U4-2 の4象限)
      ask → ask directive(「ミラー同期しますか?」+未作成時 create 選択肢)発行
      auto-sync → print 指令(bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts sync、run-then-continue)発行
  → 回答/実行の記録(冪等判定の入力になる決定的痕跡)
```

## 実装順序(story-map U4 順序の詳細化)

1. 境界検出+ask 分岐(既定動作 — auto 概念なしでも成立する形を先に固定)+冪等判定
2. auto-mirror print 分岐(U3 resolve 接続+invalid loud)
3. 未作成×auto の ask 降格(4象限の最後のセル)+integration テスト全数

## テスト設計

- integration 層: 3境界×4象限の発火全数を fixture record で固定(FR-5/FR-6 受け入れ基準)。t135 等の既存 next 消費テストの green 維持(BR-U4-4 の棚卸しとセット)
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
