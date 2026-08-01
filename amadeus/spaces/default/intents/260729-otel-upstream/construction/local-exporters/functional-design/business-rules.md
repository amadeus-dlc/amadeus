# Business Rules — U4: local-exporters

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: AuditLogExporter は同一 process 内の同期 append のみを行い、ネットワーク通信・Collector への依存を持たない（FR-EXP-2）
- BR-2: canonical Event の emit 完了時、当該 record が同一 process の reader から観測できる。batch timer・OTLP flush を経由する経路は存在しない（FR-JRN-3）
- BR-3: canonical Event は Logger Provider から AuditLogExporter へ即時 dispatch され、Span 終了を待たない（FR-EVT-2）
- BR-4: canonical の書込失敗は必ず同期例外＋fatal latch set の両方が発生する（FR-EVT-3 の hardened 契約。U1 で確立した不変を本番 Exporter でも維持）
- BR-5: diagnostic Log／Span／Metric の保存失敗は fail-open（例外を投げず、latch を set せず、workflow を止めない）（FR-EVT-6 に整合）
- BR-6: diagnostic Log は diagnostic Log Store のみへ出力され、AuditLogExporter（audit JSONL）へ混入する経路は存在しない（FR-EXP-4）
- BR-7: LocalSpanExporter が保存するのは完成済み Span のみ（`span.end()` 時点）。保存項目は IDs・name/kind・timestamps・status・attributes・events・links・resource・instrumentation scope を欠かない（FR-EXP-3）
- BR-8: LocalMetricExporter の受理対象は Counter／Histogram subset に限定する。Observable callback・任意 aggregation は受理しない（FR-EXP-5）
- BR-9: redaction policy は write-time（emit 時）と export 境界（append 直前）の二層で適用され、機微情報（prompt・argv・credential・無許可パス）はいずれの Signal Store にも流れない（FR-DST-3）

## バリデーション規則

- BR-10: AuditLogExporter の受理集合は U2 の Event Registry で検証する。Registry 未登録の event name・required attributes 不足の record は append 前に拒否する（FR-EVT-2 の dispatch 前提）
- BR-11: `command` 属性は safe-key から見直し対象とし、argv 由来値にトークン・credential 類が混入しないポリシーを適用する。argv 文字列の raw 保存を許可しない（FR-DST-4）
- BR-12: `redactionOptIn` は限定キーの許可リスト方式とし、許可されたキーであっても値スクラブ（パターン検出によるマスク）を必ず適用する。opt-in は raw 値の素通しを意味しない（FR-DST-5）
- BR-13: Journal 永続化の encode は U3 の schema v2 codec を用いる。本 Unit で独自の serialize 形式を持たない（FR-JRN-1 の形式準拠、U4→U3 依存）

## 条件付き振る舞い

- BR-14: lock 取得失敗・disk 書込失敗など AuditLogExporter の全失敗経路は BR-4 の契約（例外＋latch）に統一し、部分的な失敗通知（例外のみ・latch のみ）の経路を作らない
- BR-15: credential-free ゲート（VER-2）の検査対象は audit JSONL・Completed Span Store・diagnostic Log Store・Metric Store の全 telemetry 成果物とし、いずれかで credential 検出時はゲートを fail とする

## 検証ゲート（VER-2）

- BR-16: credential-free 検査を CI ゲートとして配線し、本 Unit の各 Exporter が出力する Store 実データを対象に実行する。検査パターンの保守は redaction policy（FR-DST-3/4/5）と同一の語彙源に揃える
