# Performance Requirements — U3 u3-runner-gen-plugin

上流入力(consumes 全数): business-logic-model.md(3層フロー)、business-rules.md(BR-U3-3)、requirements.md(FR-4)、technology-stack.md(Bun ランタイム)

## PR-U3-1: compose/drop への追加コスト

追加コストは runner-gen write の spawn 1回(business-logic-model.md 配線層 — 既存 spawnRecompile 2 spawn への1追加)。runner-gen は既存ツールであり実行時間の強制メカニズム(タイムアウト等)は既存 spawn 系と同一(business-rules.md BR-U3-3 の同型 spawn)。専用の性能数値は発明しない(constants-from-code — requirements.md にも FR-4 の性能項目はない)。

## 検証形

性能専用テストなし(technology-stack.md の Bun ランタイム前提で spawn コストは既存2 spawn と同オーダー)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:59:54Z
- **Iteration:** 1
- **Scope decision:** none

全引用・数値の実測一致、ADR-1 Security 節との一貫、N/A の正当なトレースを確認。捏造引用・発明数値なし。残存指摘なし。

### Findings

- None
