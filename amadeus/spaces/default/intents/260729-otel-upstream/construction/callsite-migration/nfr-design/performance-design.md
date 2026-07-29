# Performance Design — U7: callsite-migration

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（guard 走査の lint 内包・線形走査・Adapter 委譲オーバーヘッド・shadow 比較の hot path 分離）を実現する設計。

## call-site guard の走査設計

- 走査は grep ベースの静地走査（構文解析・型解決なし）で全リポジトリを 1 パス線形 O(n) に留める。allowlist 照合は集合参照（Set）で O(1) とし、allowlist サイズ・残存 site 数に依存する再帰検索を持たない
- CI では通常 lint ジョブ内の 1 ステップとして実行し、専用ジョブ・長時間ジョブへ分離しない（VER-4、tech-stack-decisions.md § guard の実装形態）
- 走査は決定的（同一入力→同一残存 site 一覧）とし、実行ごとの flake を許容しない。走査結果から残存一覧 report を O(残存数) で構築する

## 互換 Adapter の委譲設計

- 委譲は registry 引き当て（Map 参照 O(1)）＋ fields 整形＋ `emitEvent` 1 回の呼出し追加のみ。I/O・ロック・動的 import を委譲経路に追加しない（BR-2）
- 直接 emit と Adapter 経由 emit の同一イベントを skeleton 計測面で比較し、計測可能な回帰がないことを Phase 1 ADR の入力とする（Q2-A）

## shadow 比較の分離設計

- 比較実行は専用の手動／CI 実行とし、通常 workflow の tool 呼出し経路（hot path）から分離する。ハーネスが emit 経路を同期的にブロックしないことを実装レビューで固定（NFR-2 準拠）
- batch 書換えの機械的変換は worktree 内のローカル操作に限定し、ネットワーク I/O を持たない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:27Z
- **Iteration:** 1
- **Scope decision:** none

READY: all targets covered by concrete mechanisms; logical-components consistent; BR usages match.

### Findings

- None
