# Scalability Requirements — U1: otel-walking-skeleton

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`（参照済み）

## 並行書き込み

- 複数 clone／worktree からの並行書き込みは現行どおり per-clone shard＋mkdir lock で制御（services.md スケーリング特性）。U1 はこの構造を変えない
- Exporter 層は新たな共有状態を導入しない。latch は process-local に限定（FR-EVT-4）

## 成長への耐性

- audit JSONL・Signal Stores は append-only で単調増加。rotation・retention は Relay（U11）の責務として U1 では扱わない
- 短命 process モデルのため process あたりのメモリ保持は最小（長命 root Span を保持しない、FR-TRC-4）

## 負荷特性

- swarm（builder 最大4）による並行 Bolt 実行時も、canonical 経路の lock 競合は現行と同じ特性に留める（NFR-1 の計測は並行負荷も含める）
