# Performance Requirements — team-launcher-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 性能要件

- 追加されるのは business-logic-model の require_prerequisites()(PATH 探索2件+uname 1回)と business-rules BR-5 の doctor advisory(PATH 探索2件)のみ — いずれも起動時1回の定数回シェル呼び出しで、専用の性能目標値は設けない(requirements NFR-1 の既存 CI green 維持に包含。timeout を SLO へ昇格させない — observability-setup:c3)
- technology-stack のとおりチーム起動は herdr セッションを起動して終了する単発 bash であり、常駐性能は herdr(外部 prerequisite)側の責務

## 検証

- 既存テスト(t-team-msg 等)の実行時間に有意な増分がないことをランナー出力 wall-clock 行の機械比較で確認し record へ転記(numbers-from-command-output-only)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:52:09Z
- **Iteration:** 1
- **Scope decision:** none

Major1件のみ: BR-7 整合テストの層(unit)が FD 検証割付に実在しない具体化 — FD 差分である旨の明示へ是正。他は全て consumes 実参照・数値一致・N/A 根拠正確を確認

### Findings

- Major1: tech-stack-decisions の BR-7 層断定を FD 差分明示へ書き換え

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:54:08Z
- **Iteration:** 2
- **Scope decision:** none

是正文の引用が FD 内部矛盾(BR-7 セル=整合テスト vs 割付節=レビューのみ — U3 FD Minor2 是正の伝播漏れ)を誤帰属で覆い隠していた。根因は conductor の FD 是正伝播漏れ(review-fix-propagation 類型)

### Findings

- 是正文の引用を割付節逐語へ訂正+FD 内部矛盾の明示が必要
- 根因 = U3 FD Minor2(reviewer 承認済みの整合テスト化)を BR-7 セルのみに適用し割付節へ未伝播 — FD 側の伝播是正が正道
