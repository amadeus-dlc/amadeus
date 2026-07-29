# Component Methods — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`（参照済み）

主要 Interface のメソッドシグネチャ。詳細なビジネスルールは functional-design で扱う。エラーハンドリング方針は `team-practices.md` ## Code Style（ドメイン境界は判別ユニオン Result、不変条件違反は例外、CLI 境界は emitError）に従う。

## tracer-provider.ts

```ts
registerTracerProvider(options: { redaction: RedactionPolicy }): void
getAmadeusTracer(name?: string): Tracer
```
- `registerTracerProvider` は global 登録し LocalSpanExporter を配線。不変条件違反（二重登録）は例外
- Span は `startActiveSpan()` callback 形式で自動終了しない契約（FR-TRC-2）をラッパ型＋サンプルで統一する

## logger-provider.ts

```ts
registerLoggerProvider(options: { auditExporter: AuditLogExporter; logExporter: LocalLogExporter; registry: EventRegistry; latch: FatalLatch }): void
emitEvent(name: RegisteredEventName, attrs: EventAttributes): void  // canonical: 失敗時 throw（FR-EVT-3）
emitDiagnostic(name: string, attrs: Record<string, unknown>): void  // fail-open（FR-EVT-6）
```
- `emitEvent` の throw は OTel 慣習との意図的差分（ADR-3）。呼出し側は状態遷移前に latch を確認する義務を持つ

## audit-log-exporter.ts

```ts
exportCanonicalEvent(record: CanonicalEventRecord): void  // 同期 append。失敗時 throw＋latch set
```
- 内部で lock 取得 → sequence 採番 → append → idempotency 記録（現行 appendAuditEntry と同構造、NFR-1 の根拠）

## fatal-latch.ts

```ts
setFatal(reason: string): void
isFatalSet(): boolean
assertMutationAllowed(): void  // set 済みなら例外（FR-EVT-4）
verifyJournalHealth(probe: HealthProbe): HealthResult  // 非破壊（FR-EVT-5）
```

## event-registry.ts

```ts
type RegisteredEventName = /* 78 語彙の文字列リテラル union */
getEventDef(name: RegisteredEventName): EventDef  // { durability: "canonical" | "telemetry"; requiredAttributes: string[]; schemaVersion: number }
assertRegistryConsistent(): void  // 4 集合一致の runtime 検証（VER-1、compile-time 検証と併用）
```

## context.ts

```ts
attachIntentContext(ctx: IntentTraceContext): void
currentIntentContext(): IntentTraceContext | null
persistIntentContext(intentId: string, ctx: IntentTraceContext): void
restoreIntentContext(intentId: string): IntentTraceContext | null  // remote parent 接続（FR-TRC-4）
injectToSubprocess(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv  // W3C propagation（FR-TRC-5）
```

## meter-provider.ts

```ts
registerMeterProvider(options: { metricExporter: LocalMetricExporter }): void
getAmadeusMeter(name?: string): Meter
```
- Counter／Histogram subset のみ（FR-EXP-5）。Observable callback・任意 aggregation は初期スコープ外
- 二重登録は不変条件違反として例外（telemetry fail-open とは分離）

## local-metric-exporter.ts

```ts
export(metric): void  // fail-open（FR-EVT-6）。Metric Store へ同期保存
```

## local-log-exporter.ts

```ts
export(record): void  // fail-open（FR-EVT-6）。diagnostic Log Store へ同期保存。AuditLogExporter へ混入させない（FR-EXP-4）
```

## Journal Module reader／codec／merge（`amadeus-journal.ts` 拡張、ADR-5）

```ts
parseJournalLine(line: string): JournalRecord          // v1/v2 を schemaVersion で判別してデコード
readJournalRecords(shardPath: string): JournalRecord[] // v1/v2 混在 shard を受理
mergeShards(shards: JournalShard[]): MergedJournal     // clone-local sequence 保持・dedup・fork lineage 考慮
renderJournalView(records: JournalRecord[]): string    // human-readable View／pretty-print（FR-JRN-5）
```
- エラーは判別ユニオン Result 型（`JournalCodecError` は不変条件違反として例外）
- v1 reader は retention 条件達成後に削除（FR-MIG-5）

## migration-adapter.ts

```ts
appendAuditEntry(eventType: string, fields: Record<string, string>, ...): AppendAuditResult
```
- 旧シグネチャを維持し、内部で registry 引き当て → `emitEvent` へ委譲。未登録 eventType は drift guard 違反として例外（VER-1）

## relay.ts

```ts
flushSignals(options: { since?: Cursor; batchSize?: number }): Promise<RelayResult>
```
- Local Signal Store から cursor 以降を読み OTLP 変換・best-effort 送信。Collector 不在は失敗扱いにしない（FR-RLY-3）
