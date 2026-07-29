# Scalability Requirements — U9: metrics-subset

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## カーディナリティの上限

- Metric 名は固定の列挙集合とし、stage slug を Metric 名に使う設計を許容する（stage-graph 由来の有限集合＝32 stage で上界が確定、設計判断どおり）
- 属性値も列挙可能な値（stage slug・operation 名・status 等）に限定し、trace ID・span ID・ユーザー入力等の高カーディナリティ値は相関フィールドに留めて Metric 属性の集計キーにしない
- 計測点の追加は Metric 名の集合への明示的追加のみで行い、動的な名前生成経路を持たない（BR-1 の subset 制約と同じ方針）
- 上記により Metric Store の系列数は process あたり定数オーダーに抑え、カーディナリティ爆発を構造的に排除する

## 水平・垂直スケール

- 対象外。短命 CLI process 内の同期計測であり、水平分散・負荷分散の概念を持たない（technology-stack.md の現行断面どおり HTTP server・DB なし）
- Metric Store の容量成長は append-only JSONL の行数に比例し、retention/rotation は Relay 側（FR-RLY-1）の責務。本 Unit は容量管理機構を持たない
