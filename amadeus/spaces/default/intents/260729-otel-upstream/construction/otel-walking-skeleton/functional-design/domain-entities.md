# Domain Entities — U1: otel-walking-skeleton

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## CanonicalEventRecord

canonical Event の耐久化レコード（schema v2 の最小形）。

| 属性 | 型 | 説明 |
|---|---|---|
| schemaVersion | number | Journal schema version |
| eventId | string (UUID) | イベント一意 ID |
| sequence | number | clone-local monotonic sequence |
| timestamp | string (ISO 8601) | 発行時刻 |
| eventName | string | OTel event name（Registry 登録名） |
| attributes | Record<string, unknown> | typed attributes（redaction 適用後） |
| intentId / space / cloneId | string | 発行元の identity |
| traceId / spanId / traceFlags | string | active Context の相関 ID |
| idempotencyKey | string | 冪等キー |
| durability | "canonical" | canonical marker |

ライフサイクル: emit → redaction → 同期 append（以後 immutable）→ reader から観測可能。

## SpanRecord（Completed Span）

trace/span/parent IDs・name/kind・start/end timestamps・status・attributes・events・links・resource・instrumentation scope（FR-EXP-3）。`span.end()` で Completed Span Store へ。fail-open 派生物。

## IntentTraceContext

| 属性 | 説明 |
|---|---|
| traceId / anchorSpanId | intent anchor の相関 ID |
| intentId | 対象 intent |
| 永続化場所 | record 配下（persist/restore で短命 process を remote parent へ接続、FR-TRC-4） |

## FatalLatch（process-local 値オブジェクト）

| 属性 | 説明 |
|---|---|
| isSet | set 済みか |
| reason | set 時の理由（書込失敗の内容） |
| setAt | ISO 時刻 |

振る舞い: set のみ。process 内で解除不可（FR-EVT-4）。

## EventDef（Registry の最小形）

| 属性 | 説明 |
|---|---|
| name | イベント名（U1 では代表 event のみ） |
| durability | "canonical" \| "telemetry" |
| requiredAttributes | 必須属性名リスト（BR-9 の検証に使用） |
| schemaVersion | イベント schema version |

## HealthProbe／HealthResult

新 process の mutation 再許可判定（FR-EVT-5）。probe は canonical Journal を変更しない（非破壊 — lock 取得＋read 整合性、必要なら隔離 scratch shard への試行 append。具体方式は Phase 1 ADR で確定）。
