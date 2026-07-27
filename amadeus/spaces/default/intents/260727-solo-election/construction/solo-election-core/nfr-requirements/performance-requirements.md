# Performance Requirements — solo-election-core (U1)

上流入力(consumes 全数): business-logic-model.md(tally 2体分岐・個数照合)、business-rules.md(BR-U1-1〜8 の検証列)、requirements.md(NFR-01〜03 の正本)、technology-stack.md(Bun/TS/ESM・テスト4層の実行環境)。

## 性能要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U1-PERF-01 | tally は純関数のまま(business-logic-model.md の分岐追加のみ)で、既存の同期実行特性を保つ — 新規 I/O・spawn・待機を tally 内に持ち込まない | 実装 diff に tally 内の fs/process 依存追加ゼロ(business-rules.md BR-U1-5 の bit 一致 regression が実行特性不変も裏付け) | requirements.md NFR-01、technology-stack.md(Bun 同期実行) |
| U1-PERF-02 | 2体分岐の追加は既存 3+ 体経路に測定可能な劣化を持ち込まない(分岐1回の追加のみ) | 既存 t234 スイートの実行が現行 CI 予算内で green(専用ベンチは設けない — 分岐1回は測定閾値未満、推定でなく regression green を合否とする) | business-logic-model.md(first-match 順序保存) |

## 明示的に設けない性能検査(比例選定)

負荷試験・p95 計測は設けない — tally は毎選挙1回呼ばれる純関数で、承認済み NFR に応答時間要件が存在しない(cid:build-and-test:bt-proportional-selection: 実在 NFR へ trace できない検査は機械追加しない)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:25:19Z
- **Iteration:** 2
- **Scope decision:** none

Major(U1-REL-04 出典誤帰属→FR-01/FR-05 AC・M-06 直接引きへ)・Minor 2件(cid 分離・15→7 収束根拠)を逐語照合で閉包。是正 diff の新規欠陥なし。

### Findings

- None
