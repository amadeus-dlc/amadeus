# Domain Entities — U4: local-exporters

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## CanonicalEventRecord（schema v2、U3 codec で永続化）

U1 の最小形を FR-JRN-1 の全項目へ拡張した本番レコード。

| 属性 | 型 | 説明 |
|---|---|---|
| schemaVersion | number | Journal schema version（v2。U3 codec が encode/decode） |
| eventId | string (UUID) | イベント一意 ID |
| sequence | number | clone-local monotonic sequence（lock 取得後に採番） |
| timestamp | string (ISO 8601) | 発行時刻 |
| eventName | RegisteredEventName | OTel event name（U2 Registry 登録名、BR-10 で検証） |
| attributes | Record<string, unknown> | typed attributes（二層 redaction 適用後、FR-DST-3） |
| intentId / space / cloneId | string | 発行元の identity |
| traceId / spanId / traceFlags | string | active Context の相関 ID |
| idempotencyKey | string | 冪等キー（append 後に記録） |
| durability | "canonical" | canonical marker |

ライフサイクル: emit → Registry 検証 → write-time redaction → dispatch → export 境界 redaction → 同期 append（以後 immutable）→ reader から観測可能（FR-JRN-3）。

## CompletedSpanRecord（FR-EXP-3）

| 属性 | 説明 |
|---|---|
| traceId / spanId / parentSpanId | 相関 ID |
| name / kind | Span 名と種別 |
| startTimestamp / endTimestamp | 継続時間 |
| status | 実行時に確定した Status（FR-TRC-6 に整合） |
| attributes | redaction 適用後の属性 |
| events / links | Span Events・links |
| resource / instrumentationScope | resource 属性と計装スコープ |

ライフサイクル: `span.end()` で確定 → LocalSpanExporter が Completed Span Store へ同期 append（fail-open）。

## DiagnosticLogRecord（FR-EXP-4）

| 属性 | 説明 |
|---|---|
| timestamp | 記録時刻 |
| name / body | diagnostic メッセージ |
| attributes | redaction 適用後の属性 |
| traceId / spanId | Trace Context 相関 ID（FR-MLM-2 の前提） |

ライフサイクル: `emitDiagnostic()` → LocalLogExporter → diagnostic Log Store（fail-open）。audit JSONL への混入経路なし（BR-6）。

## MetricRecord（FR-EXP-5）

| 属性 | 説明 |
|---|---|
| instrumentName | Counter／Histogram の名前 |
| kind | "counter" \| "histogram"（subset 限定） |
| value / buckets | カウント値またはヒストグラム bucket |
| attributes | redaction 適用後の属性 |
| traceId / spanId | Trace Context 相関 ID（FR-MLM-1 の前提） |

ライフサイクル: `add()`／`record()` で集計 → Metric Store へ出力（fail-open）。Observable callback・任意 aggregation は生成しない。

## RedactionPolicy（FR-DST-3/4/5）

| 属性 | 説明 |
|---|---|
| deniedKeys | 常時拒否キー（prompt・argv・credential・無許可パス） |
| optInKeys | `redactionOptIn` の限定許可キー（値スクラブ必須、BR-12） |
| scrubPatterns | 値スクラブ用パターン（トークン・credential 検出） |
| layers | write-time／export 境界の二層（BR-9） |

`command` 属性は safe-key から見直し、argv 由来値の raw 保存を禁止するポリシーとしてここに保持する（BR-11）。

## 関係

- CanonicalEventRecord は EventDef（U2）で受理検証され、U3 の schema v2 codec で encode される（U4→U2、U4→U3 の依存）
- 全 Store（audit JSONL／Span／Log／Metric）は credential-free ゲート（VER-2）の検査対象
- 各 Record の traceId／spanId は同一 trace 空間を共有し（U1 の entity と整合）、Exporter 層は新たな共有状態を持たない
