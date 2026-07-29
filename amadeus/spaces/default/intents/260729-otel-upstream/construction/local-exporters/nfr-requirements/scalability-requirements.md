# Scalability Requirements — U4: local-exporters

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 並行書き込み

- 複数 clone／worktree からの並行書き込みは現行どおり per-clone shard＋mkdir lock で制御する。本 Unit はこの構造を変えない（lock 取得→sequence 採番→同期 append は現行 `appendAuditEntry` と同構造）
- Exporter 層は新たな共有状態を導入しない。fatal latch は process-local に限定（FR-EVT-4）

## 成長への耐性

- audit JSONL・Completed Span Store・diagnostic Log Store・Metric Store はすべて append-only で単調増加。rotation・retention は Relay（U11）の責務であり本 Unit では扱わない
- Metric の集計は process 内の Counter／Histogram subset に限定し、Observable callback・任意 aggregation を受理しないことでメモリ使用量を attribute 基数に比例した有界に留める（BR-8、FR-EXP-5）
- 短命 process モデルのため process あたりのメモリ保持は最小（完成 Span は即時 Store へ逃がし、process 内に蓄積しない）

## 負荷特性

- swarm（builder 最大4）による並行 Bolt 実行時も、canonical 経路の lock 競合は現行と同じ特性に留める。NFR-1 の計測は並行負荷を含める
- diagnostic Log／Span の発生頻度が増えても canonical 経路を阻害しない（別 Store への独立 append、BR-6）

## 非目標

- Store のサイズ上限・圧縮・分散集約は本 Unit のスコープ外（初期スコープ外項目として明記）
