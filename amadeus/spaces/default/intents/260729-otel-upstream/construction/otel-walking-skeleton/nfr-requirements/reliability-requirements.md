# Reliability Requirements — U1: otel-walking-skeleton

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`（参照済み）

## 耐久性契約

- canonical Event は emit 完了時に audit JSONL へ同期永続化される（FR-JRN-3）。即時 process 終了でも残る（NFR-2）
- 書込失敗は同期例外＋fatal latch（FR-EVT-3）。失敗後の状態遷移は entrypoint で拒否（FR-EVT-4）
- 新 process は Journal health 検証後にのみ mutation を再開（FR-EVT-5）

## 障害からの隔離

- Collector 停止・ネットワーク障害は workflow 結果に影響しない（短命 process は network flush を持たない）
- diagnostic Log／Span／Metric の保存失敗は fail-open（FR-EVT-6）

## 復旧

- 既存の state recovery／doctor が v1 Journal をそのまま読めること（U1 では現行 reader を維持。v2 対応は U3/U6）
- hard gate 不合格時は本番正本への変更を波及させず撤回できる（代表接続のみの範囲に限定、AH-4）
