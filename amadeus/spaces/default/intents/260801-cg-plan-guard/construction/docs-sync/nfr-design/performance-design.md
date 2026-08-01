# Performance Design — docs-sync(U4)

上流入力(consumes 全数): business-logic-model.md
- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は該当ステージが本スコープで SKIP のため設計どおり不在(consumes_absent expected)— 代替正本は requirements.md の NFR-1〜4。

- U4 は docs のみの unit — 性能面はランタイム変更ゼロ(`business-logic-model.md` の対象文書列挙どおり)。

## 性能設計

- N/A(反証可能な根拠: docs/ は実行系に乗らず dist 投影外 — 変更はビルド・実行時間へ影響しない)。

## 検証形

- 性能検査なし(比例選定)。docs ガードテスト(t132 系)への影響のみ実装時に確認。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T11:58:12Z
- **Iteration:** 1
- **Scope decision:** none

docs-only unit の比例レビュー — N/A 根拠の反証可能性・BR 実在・consumes N/A 注記・様式を確認。指摘 0 件。

### Findings

- None
