# Scalability Design — U1: otel-walking-skeleton

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の制約（並行書込み構造の不変・共有状態不導入・負荷特性の維持）を満たすための設計。U1 は新しいスケーリング機構を導入せず、「現行構造を壊さないこと」が設計目標である。

## 並行書込みの設計

- audit JSONL への書込は現行どおり per-clone shard＋mkdir lock を踏む。AuditLogExporter はこの lock 機構を再利用し、独自の排他機構を持たない（business-logic-model.md § canonical Event 発行）
- 複数 clone／worktree からの並行 append は shard 分離で競合自体を避け、同一 clone 内の競合は mkdir lock で直列化する。U1 はこの構造を変更しない

## 共有状態の最小化

- Exporter 層が導入する状態は FatalLatch（process-local）と sequence 採番（lock 内）のみ。process 横断の共有キャッシュ・グローバルレジストリへの追加入口を作らない（API singleton の登録は OTel 標準の global 機構 1 箇所、NFR-3）
- 短命 process モデルを維持し、完成 Span は `span.end()` 即時に Completed Span Store へ逃がす。process 内に Span 履歴・バッファを保持しない（business-logic-model.md § Span、FR-TRC-4 と整合）

## 負荷特性の検証設計

- swarm（builder 最大4）の並行 Bolt 実行を想定した計測を NFR-1 計測ハーネスに含め、canonical 経路の lock 競合特性が現行と同等であることを確認する
- Store の rotation・retention は Relay（U11）の責務として U1 の設計対象外とし、U1 の Exporter は追記のみを行う（scalability-requirements.md § 成長への耐性）
