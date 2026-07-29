# Scalability Design — U9: metrics-subset

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の中核（カーディナリティの上限）に対する設計。水平・垂直スケールは対象外（短命 CLI process 内の同期計測）。

## カーディナリティ上限の設計

- Metric 名は固定の列挙集合とし、stage slug を Metric 名に使う設計を許容する（stage-graph 由来の有限集合＝32 stage で上界確定）
- 属性値も列挙可能な値（stage slug・operation 名・status 等）に限定し、trace ID・span ID・ユーザー入力等の高カーディナリティ値は相関フィールドに留めて集計キーにしない
- 計測点の追加は Metric 名集合への明示的追加のみで行い、動的な名前生成経路（文字列連結による Metric 名の実行時合成）を持たない（BR-1 の subset 制約と同じ方針）
- 上記により Metric Store の系列数は process あたり定数オーダーに抑え、カーディナリティ爆発を構造的に排除する

## 容量の責務境界

- Metric Store の容量成長は append-only JSONL の行数に比例する。retention／rotation は Relay 側（FR-RLY-1）の責務とし、本 Unit は容量管理機構を持たない

## スケール対象外の明文化

- 水平分散・負荷分散の概念を持たない（technology-stack.md: HTTP server・DB なし）。分散集約・外部 Metric backend への送信設計は初期スコープ外（FR-EXP-5 の subset 制約と整合）
