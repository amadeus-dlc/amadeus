# Performance Requirements — election-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 性能要件

- 本 Unit は移動 Unit(business-logic-model: git mv 5ファイル+import 1行)であり実行時性能への影響はゼロ(business-rules BR-2 の挙動変更ゼロ契約 = requirements NFR-2)。専用の性能目標値は設けない(observability-setup:c3 — 新規 SLO なし)
- 配布再生成(package.ts+promote:self)は既存機構の実行時間の枠内(technology-stack の配布投影構造 — 新規投影面なし)

## 検証

- 既存テスト t234〜t244 の実行時間をランナー出力 wall-clock 行で移動前後比較し record へ転記(numbers-from-command-output-only)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:57:53Z
- **Iteration:** 1
- **Scope decision:** none

Major2件(#1273 契約の technology-stack への誤帰属 / reliability の『全て機械確認』が BR-6=レビュー観点を包括する検証劇場リスク)

### Findings

- Major1: #1273 出典を requirements c4 へ訂正
- Major2: BR-6 のレビュー観点区分を明記

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:59:04Z
- **Iteration:** 2
- **Scope decision:** none

両 Major 閉包(#1273 の requirements 正本帰属+BR 検証区分の FD 一致)。新規捏造なし

### Findings

- None
