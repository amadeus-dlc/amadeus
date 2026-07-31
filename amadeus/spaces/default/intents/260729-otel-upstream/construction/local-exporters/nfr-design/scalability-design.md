# Scalability Design — U4: local-exporters

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の要件（並行書込み構造不変・有界メモリ・負荷特性維持）に対する設計。

## 並行書込みの設計

- 複数 clone／worktree からの並行書込みは現行どおり per-clone shard＋mkdir lock で制御し、AuditLogExporter はこの lock 機構を再利用する。独自の排他機構・共有状態を Exporter 層に導入しない（scalability-requirements.md § 並行書き込み）
- fatal latch は process-local に限定し、process 横断の共有フラグを持たない（FR-EVT-4）

## メモリの有界性設計

- LocalMetricExporter の集計は Counter／Histogram subset に限定し、Observable callback・任意 aggregation を受理しない。メモリ使用量を attribute 基数に比例した有界に留める（BR-8、FR-EXP-5）
- 完成 Span は `span.end()` 即時に Store へ逃がし、process 内に Span 履歴を蓄積しない。diagnostic Log も都度 append で滞留させない（短命 process モデル）

## 負荷特性の設計

- swarm（builder 最大4）の並行 Bolt 実行を想定した計測を NFR-1 計測に含め、canonical 経路の lock 競合特性が現行と同等であることを確認する
- diagnostic Log／Span は canonical とは別 Store への独立 append とし、発生頻度が増えても canonical 経路（lock 取得直列化区間）を阻害しない（BR-6）
- Store の rotation・retention は Relay（U11）の責務として本 Unit の設計対象外（scalability-requirements.md § 非目標）
