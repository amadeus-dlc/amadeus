# Code Generation Plan — fix-1734-scopegrid-order

上流入力(consumes 全数): requirements.md(当該 FR の充足対照)。functional-design 系は self-fix の SKIP により設計どおり不在。

## 手順(FR-1734a〜c)
mergeScopeGrid のキー名ソート正準化(a)、scopeGridInSync の apply 出力バイト一致への対称化(b)、t370 で churn 再現 fixture の両側固定(c)。Issue の「削除」誤読の訂正を PR 本文に明記。round 2 で CodeRabbit Major(own-property 意味論・prototype 汚染安全)を是正。conductor が stale 行ピンの無音転位(359-360 → 実 wrapper 689)を直読照合で検出・再ピン。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T21:09:21Z
- **Iteration:** 1
- **Scope decision:** none

PR #1781マージ・#1734クローズ済み。mergeScopeGrid正準ソート(FR-1734a)・scopeGridInSyncの対称化(FR-1734b)・t370(own-property/prototype対応込み)がorigin/main実測どおり一致。allowlist再ピン(:689)も直読で確認、無申告逸脱なし。

### Findings

- None
