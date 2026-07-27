# Performance Design — solo-election-core (U1)

上流入力(consumes 全数): performance-requirements.md(U1-PERF)、security-requirements.md(U1-SEC)、scalability-requirements.md(U1-SCALE)、reliability-requirements.md(U1-REL)、tech-stack-decisions.md(層配置・形式検証の決定)、business-logic-model.md(tally 2体分岐・TLA 対応の設計正本)。

## 設計

- U1-PERF-01(純関数維持): tally 内挿は business-logic-model.md の分岐追加のみで実装し、import 追加ゼロ(model.ts は現在 fs/process を import しない — 実装後 grep で機械確認)。
- U1-PERF-02(劣化なし): 分岐は voters.length===2 の1比較を first-match 連鎖に挿入するのみ。合否は既存 t234 スイートの CI green(専用ベンチ不設置は U1-PERF-02 の裁定どおり)。

## 検証配線

実装 PR の検証コマンド列に `grep -cE '^import|require\(' packages/framework/core/tools/amadeus-election-model.ts` を含める — import 構文アンカー付きパターン(現状実測 0件、レビュー独立確認済み)の前後 0件不変で import 追加ゼロを機械確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:38:06Z
- **Iteration:** 1
- **Scope decision:** none

NFR 11項目の1:1写像・引用一致・実装順序整合を確認し READY。Major 2(grep パターンの import アンカー化 / fixture 選挙の実 CLI 経路+--project 隔離ストア+実選挙トピック=Bolt 1 §13 選定への確定)と Minor 1(handleHoldResolved への引用訂正)は conductor が即時是正。

### Findings

- None
