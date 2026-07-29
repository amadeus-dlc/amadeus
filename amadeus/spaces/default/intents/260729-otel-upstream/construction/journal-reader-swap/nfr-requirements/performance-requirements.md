# Performance Requirements — U6: journal-reader-swap

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標（NFR-1 準拠の読取パリティ）

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 読取レイテンシの回帰なし | 7 tool それぞれについて、共通 reader 経由の shard 走査・decode・merge の wall time が旧 v1 reader 直読と同等を上回る回帰を持たない（比較基準）。数値予算（cold/warm p50/p95）は Q2-A どおり Phase 1 実測後の ADR で確定し、本書では「旧 reader との同一 fixture 比較で未説明の劣化なし」を完了条件とする | v1-only／v2-only／mixed-version 3 fixture 上で新旧 reader の読取時間を同一条件で計測比較（`performance.now()` 実測、t258 先例の様式） |
| mixed-version merge のコスト | clone／worktree 横断 shard の merge 走査が全 shard 行数に対し線形で、行ごとの version 判別＋codec decode 以外の追加パスを持たない（BR-5、BR-10：物理配置・走査構造は不変） | fixture の行数を変えた走査時間計測で線形性を確認 |
| bundle size | reader 差替えで新規依存を追加しないため bundle 増分ゼロ（数値予算は Phase 1 ADR に委譲、NFR-1/Q2-A） | `bun build` 成果物 size を差替え前後で比較 |

## 制約

- 差替え期間中も恒久 dual-read を導入しない（BR-13）。同一性検証の並行参照はテスト内に限定し、本番経路は共通 reader 一本とする
- reader は読取専用で書込 probe を行わず（BR-9）、性能上の副作用を Journal へ加えない
- 計測結果は Phase 1 ADR の入力とし、未説明の劣化があれば差替え完了とみなさない（BR-11 と同基準）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: all five artifacts verified for coverage (NFR-1/2/3, VER-2/6, FR-DST-2, FR-MIG-1/2/4), BR-1〜22 consistency, structure.

### Findings

- None
