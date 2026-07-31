# Performance Design — U3: journal-v2

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（v1 codec 比回帰なし・wire 不変条件・merge O(N log N)・reader decode 同等性）を純粋 codec 層の設計として実現する。

## codec の計算量設計

- `serializeJournalEntryV2` はキーソート＋`JSON.stringify` 1 回のみ。v1 codec と同一次のコストに留め、追加の正規化・検証は必須フィールドの存在チェック（定数個のプロパティアクセス）に限定する
- `parseJournalLine` は行頭 `schemaVersion` の読取で v1/v2 へ分岐し、v1 経路に v2 分岐のコストを載せない（分岐は先頭フィールド 1 回の読取のみ）
- codec 層は同期・純粋関数に留め、timer・バッファリング・I/O を持ち込まない（performance-requirements.md § 制約、services.md の通信契約どおり I/O は呼出し側）

## merge の設計

- dedup は idempotency key の Map 参照で O(N)、順序付けは timestamp＋key tie-break の 1 回ソートで O(N log N)。shard 数・投入順に依らない計算量とする（business-logic-model.md § mixed shard merge）
- 入力 record 列をメモリ上で 1 回走査して処理し、record 数に比例しない複製・再帰走査を禁止する

## 計測設計

- 同一 record 集合の v1/v2 codec ベンチ（p50/p95）を U1 の計測ハーネスへ追加し、回帰なしを比較基準で確認する。数値予算は Phase 1 ADR で確定（NFR-1、Q2-A）
- 行数を倍々にした合成 shard のベンチで merge の計算量曲線を確認し、v1 実 fixture 全行 decode の回帰テストで reader 同等性を固定する

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:22:01Z
- **Iteration:** 1
- **Scope decision:** none

READY: all NFR requirement targets covered by design decisions; logical-components consistent with components/component-methods; actionable concrete mechanisms; no contradictions.

### Findings

- None
