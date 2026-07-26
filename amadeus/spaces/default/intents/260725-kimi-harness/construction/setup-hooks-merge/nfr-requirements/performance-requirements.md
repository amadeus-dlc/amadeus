上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — setup-hooks-merge

> 上流入力の使用箇所: business-logic-model.md のマージフロー、business-rules.md の BR-3(冪等)、requirements.md の NFR 方針、technology-stack.md の既存インストーラの実行基盤を前提とする。

## 判定と基準

**ほぼ N/A**(重要な性能対象なし)。マージは install/upgrade の対話フロー内の1工程で、config.toml のテキスト処理(小さなファイル)のみ。既存の plan report 生成(business-logic-model.md §マージフロー)に組み込まれ、体感に影響するコストを持たない。

## 測るもの

- planMerge/applyMerge は純粋な文字列処理で、config の規模増(既存 `[[hooks]]` が増えても)に対し線形で動くこと(business-rules.md BR-3 の冪等検査と併せて単体テストで確認)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T13:11:07Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 2 major+3 minor は全て実在アンカーで解消。atomic は BLM 手順6+BR-4、重複は planMerge 明記、引用は全て解決可能。

### Findings

- None
