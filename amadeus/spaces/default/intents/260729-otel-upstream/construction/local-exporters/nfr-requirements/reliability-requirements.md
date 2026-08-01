# Reliability Requirements — U4: local-exporters

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 耐久性契約（canonical、FR-EVT-3/4）

- canonical Event は emit 完了時に audit JSONL へ同期永続化される（FR-JRN-3、BR-2）。即時 process 終了でも残る（NFR-2）
- 書込失敗は必ず同期例外＋fatal latch set の両方が発生する（BR-4）。lock 取得失敗・disk 書込失敗を含む全失敗経路をこの契約に統一し、例外のみ・latch のみの部分通知経路を作らない（BR-14）
- latch set 後の canonical state mutation は entrypoint で拒否され、中間層が例外を catch しても latch は解除されない（FR-EVT-4）
- Journal 永続化の encode は U3 の schema v2 codec に一本化し、独自 serialize 形式を持たない（BR-13）

## fail-open 契約（telemetry、FR-EVT-6）

- diagnostic Log／完成 Span／Metric の保存失敗は例外を投げず、latch を set せず、workflow を止めない（BR-5）。fail-open はリトライ・待機なしの即時 return とする
- diagnostic Log が AuditLogExporter（audit JSONL）へ混入する経路は存在しない（BR-6）。canonical の耐久性契約と telemetry の fail-open を混線させない

## 障害からの隔離

- AuditLogExporter はネットワーク通信・Collector 依存を持たない（BR-1）。Collector 停止・ネットワーク障害は workflow 結果に影響しない
- LocalSpanExporter が保存するのは完成済み Span のみで、保存項目（IDs・name/kind・timestamps・status・attributes・events・links・resource・instrumentation scope）を欠かない（BR-7、FR-EXP-3）

## 検証

- 失敗契約テスト（test-first、VER-3）: canonical 書込失敗で同期例外＋latch set の両方、telemetry 失敗で fail-open、を別々に検証する（hardening 後も維持する完了条件）
