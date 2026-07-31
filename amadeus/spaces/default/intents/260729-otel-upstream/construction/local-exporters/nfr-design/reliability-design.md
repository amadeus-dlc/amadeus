# Reliability Design — U4: local-exporters

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（canonical 耐久性契約・telemetry fail-open・障害隔離）に対する設計。

## 耐久性契約の設計（canonical、FR-EVT-3/4）

- canonical Event は emit 完了時点で audit JSONL へ同期永続化される。永続化完了前に emit が return する経路を作らない（FR-JRN-3、BR-2）
- 書込失敗は同期例外＋fatal latch set の両方が必ず発生する。lock 取得失敗・disk 書込失敗を含む全失敗経路をこの契約に統一し、例外のみ・latch のみの部分通知経路を作らない（BR-4、BR-14）
- latch set 後の canonical state mutation は entrypoint で拒否され、中間層が例外を catch しても latch は解除されない。process 内で latch 解除 API を提供しない（FR-EVT-4）
- Journal 永続化の encode は U3 の schema v2 codec に一本化し、独自 serialize 形式を持たない（BR-13）

## fail-open の設計（telemetry、FR-EVT-6）

- LocalSpanExporter／LocalLogExporter／LocalMetricExporter の保存失敗は例外を投げず latch も set せず、リトライ・待機なしの即時 return で呼出し側へ成功同様に返る（BR-5）
- diagnostic Log が AuditLogExporter（audit JSONL）へ混入する経路を作らない。Logger Provider の振り分けで canonical と diagnostic を型上分離する（BR-6、FR-EXP-4）

## 保存完全性と検証

- LocalSpanExporter は完成済み Span のみを `span.end()` 時点で保存し、保存項目（IDs・name/kind・timestamps・status・attributes・events・links・resource・instrumentation scope）を欠かない（BR-7、FR-EXP-3）
- 失敗契約テスト（VER-3、test-first）: canonical 書込失敗で同期例外＋latch set の両方、telemetry 失敗で fail-open、を別々に検証する。hardening 後も維持する完了条件（business-logic-model.md § 検証フロー 2）
