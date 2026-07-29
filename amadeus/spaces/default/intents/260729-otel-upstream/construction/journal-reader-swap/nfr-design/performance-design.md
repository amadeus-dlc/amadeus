# Performance Design — U6: journal-reader-swap

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（読取パリティ・merge 線形性・bundle 増分ゼロ）を実現する設計。本 Unit は call site 張替えであり、性能は「共通 reader 経由に変えても劣化しない」ことの証明設計が中核である。

## 読取経路の設計

- 7 tool（doctor／recovery／presence／grant／merge／runtime graph／learnings）の読取は共通 reader（U3 Journal Module）一本に統一し、tool ごとの独自走査を残さない（business-logic-model.md § 共通 reader 経由の読取）
- 共通 reader は行ごとの schema version 判別＋codec decode＋正規化写像のみを行い、tool 側に追加の走査 pass を持たない（performance-requirements.md § mixed-version merge のコスト）
- 恒久 dual-read を導入しない。同一性検証の新旧並行参照はテスト内に限定し、本番経路は共通 reader 一本（BR-13）

## 計測設計

- v1-only／v2-only／mixed-version の 3 fixture 上で新旧 reader の読取時間を同一条件で計測比較（`performance.now()` 実測、t258 先例の様式）。完了条件は「旧 reader との同一 fixture 比較で未説明の劣化なし」（Q2-A により数値予算自体は Phase 1 ADR）
- fixture の行数を変えた走査時間計測で merge の線形性を確認し、非線形の悪化があれば差替えを完了とみなさない
- `bun build` 成果物 size を差替え前後で比較し、新規依存なし（bundle 増分ゼロ）を確認する

## 副作用の排除

- reader は読取専用で書込 probe を行わず（BR-9）、Journal へ性能上の副作用を加えない
- cross-process のキャッシュ・長命インデックスを導入せず、走査結果は process ローカルの要求スコープで完結させる（scalability-design と共通の制約）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: all four design docs + logical-components fully cover targets; only real components/APIs cited; concrete mechanisms.

### Findings

- None
