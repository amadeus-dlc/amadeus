# External Dependency Map — 260816-open-bug-batch-7

## 外部依存

**なし**(fully AI-contained)。3 Bolt はいずれも本リポジトリ内で完結し、外部 API・データ提供窓口・外部チームのハンドオフ・承認リードタイムを持たない。

## 内部ゲート条件(参考 — 外部依存ではないが Bolt を待たせる項目)

| 項目 | 所有 | ブロック対象 | 備考 |
|---|---|---|---|
| Issue クロスレビュー独立 2 名(#2363 / #2162 / #3097) | conductor(fresh reviewer subagent ×2 / Issue) | 各 unit の実装バッチ組み込み | requirements.md 制約。成立次第、当該 unit がバッチへ合流 |
| GitHub / CI の可用性 | GitHub Actions | PR 収束(リモート CI 正) | 失敗時は既存ノルム(fail は警告可視化して継続)に従う |
