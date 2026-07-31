# Components — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`（すべて参照済み）

配置決定（Q1-A）: 新規コンポーネントは `packages/framework/core/otel/` に集約する。正本・生成面の規則（`team-practices.md` ## Way of Working）に従い、変更は core 正本のみ。

## 新規コンポーネント（`packages/framework/core/otel/`）

| コンポーネント | 責務 | 公開 Interface | 所有する要件 |
|---|---|---|---|
| `tracer-provider.ts` | Amadeus Tracer Provider の登録と Span 生成（FR-TRC-1/2） | `@opentelemetry/api` TracerProvider 準拠。`registerTracerProvider()`／`getAmadeusTracer()` | FR-EXP-1, FR-TRC-1/2, FR-TRC-6 |
| `logger-provider.ts` | Amadeus Logger Provider。canonical EventRecord を同期 AuditLogExporter へ即時 dispatch、diagnostic Log を LocalLogExporter へ振り分け（FR-EVT-2, FR-EXP-4） | OTel Logs API 準拠の emit Interface | FR-EVT-2, FR-EVT-7, FR-EXP-4 |
| `meter-provider.ts` | Amadeus Meter Provider。Counter／Histogram subset のみ（FR-EXP-5） | OTel Metrics API subset | FR-EXP-5, FR-MLM-1 |
| `audit-log-exporter.ts` | canonical EventRecord → audit JSONL への同一 process 同期 append。失敗時は同期例外＋fatal latch set（FR-EVT-3/4） | `exportCanonicalEvent(record): void`（失敗時 throw） | FR-EVT-3/4/5, FR-EXP-2, FR-JRN-3 |
| `local-span-exporter.ts` | 完成済み Span の machine-local JSONL 同期保存。fail-open | `export(span): void` | FR-EXP-3 |
| `local-log-exporter.ts` | diagnostic Log の Log Store 保存。fail-open | `export(record): void` | FR-EXP-4, FR-MLM-2 |
| `local-metric-exporter.ts` | Metric Store 保存。fail-open | `export(metric): void` | FR-EXP-5 |
| `event-registry.ts` | 78 語彙の型付き Event Registry。canonical/telemetry 分類、required attributes、schema version。`recordException()` の exception Span Event の telemetry 分類を強制（FR-EVT-7） | `getEventDef()`／`assertRegistryConsistent()` | FR-EVT-1, FR-EVT-7, VER-1 |
| `context.ts` | Bun Context Manager 接続（既製検証→不成立時 Adapter）、W3C Trace Context propagator、Intent Context 永続化／復元 | Context 注入・抽出 API | FR-TRC-3/4/5 |
| `fatal-latch.ts` | process-local fatal health latch（set・参照・entrypoint 拒否判定）、Journal health 検証 probe | `setFatal()`／`isFatalSet()`／`assertMutationAllowed()`／`verifyJournalHealth()` | FR-EVT-3/4/5 |
| `redaction.ts` | write-time＋export 境界の二層 redaction policy | `redact(attrs): attrs` | FR-DST-3/4/5, VER-2 |
| `relay.ts` | 旧 Projector 縮退版。Local Signal Store 読取・OTLP 変換/batch・cursor/idempotency・retry | CLI エントリ（session-end flush trigger） | FR-RLY-1/2/3, FR-TRC-6 |
| `migration-adapter.ts` | 移行期間限定。旧 `appendAuditEntry()` 呼出しを Event API emit へ委譲 | `appendAuditEntry()` 互換シグネチャ | FR-MIG-1/2/3 |

## 既存コンポーネントの処置（Q2-A、#1672 Module 処置表どおり）

| 既存 | 処置 | 到達状態 |
|---|---|---|
| `tools/amadeus-audit.ts` | 分割・置換 | writer は migration-adapter 経由で段階縮小。reader／merge／CLI 互換は Journal Module へ分離後、旧 writer 削除（FR-MIG-2） |
| `tools/amadeus-journal.ts` | 拡張（Journal Module の中核） | schema v2 codec・v1/v2 reader・mixed shard merge・converter（FR-JRN-1/2）＋ human-readable View/pretty-print（FR-JRN-5） |
| `tools/amadeus-observability.ts` | 置換 | Provider bootstrap と Local Exporters への薄い facade へ。`observe()`／`observeSubprocess()` は Trace API Span へ移行（FR-TRC-1） |
| `tools/amadeus-otel-projector.ts` | 縮退 | `otel/relay.ts` へ責務移譲後削除（FR-RLY-1） |
| doctor／recovery／presence／grant 等 | reader 差替え | 共通 reader（Journal Module）経由で v1/v2 を読む（FR-JRN-4） |

## 検証・移行ゲート要件の実現先

コンポーネント所有に属さない要件の実現先を以下にマップする。

| 要件 | 実現先 |
|---|---|
| VER-3（失敗契約テスト先行） | `tests/unit`・`tests/integration` の新規テスト群（#1678 テスト先行順序どおり実装に先行） |
| VER-4（call-site guard） | CI の静的検査（既存 drift guard 系に追加）＋残存 call site 可視化 |
| VER-6（distribution tests） | `bun scripts/package.ts` 生成面の検証テスト（既存 distribution tests 拡張） |
| FR-MIG-4（削除ゲート） | CI／テスト基盤のゲート検証（shadow 比較 report・call-site ゼロ・registry 完備の機械判定） |
| FR-MIG-5（旧 reader retention 削除） | delivery-planning のスケジュール管理＋retention 条件の機械判定 |
| FR-DST-1（bundle 依存取込の ADR 文書化） | Phase 1 ADR（decisions.md 追記）＋ bun build 構成 |
| NFR-3（API singleton 一意性） | Phase 1 の bundle 検証テスト |

## 境界と所有権

- `otel/` 配下はライブラリ層（CLI エントリを持たない。`relay.ts` のみ flush trigger の CLI 境界を持つ）
- `tools/` の既存 CLI は `otel/` の Interface を呼ぶだけの薄い境界にする
- `amadeus-lib.ts` への追加は行わない（肥大化防止。Q1-A の趣旨）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T07:24:43Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: 6 ADRs and dependency structure sound, but orphan requirement IDs (FR-EVT-7/FR-TRC-6/FR-JRN-5/VER-3,4,6/FR-MIG-4,5/FR-DST-1/NFR-3) and interface naming mismatches between components.md and component-methods.md.

### Findings

- MAJOR components.md: FR-EVT-7, FR-TRC-6, FR-JRN-5 have no owning component — assign FR-EVT-7 to event-registry/logger-provider, FR-TRC-6 to tracer-provider/relay, FR-JRN-5 to amadeus-journal.ts row
- MAJOR components.md/decisions.md: VER-3, VER-4, VER-6, FR-MIG-4, FR-MIG-5, FR-DST-1, NFR-3 have no owner or realization path — add a 'verification/migration-gate realization' section mapping IDs to CI/test/packaging work, and add bundle-rationale sentence to ADR-1
- MINOR components.md vs component-methods.md: interface naming mismatch (register/getTracer, export, set/isSet/assertHealthy) — align components.md to component-methods.md as the source of truth
- MINOR component-dependency.md: audit-log-exporter→amadeus-journal.ts edge vs 'otel does not depend on tools' is ambiguous — refine invariant to 'no CLI-entrypoint dependency; Journal Module allowed as library dep', and document context.ts path-resolution injection point
- MINOR services.md: 'canonical Event を emit する唯一の上流' contradicts hooks emitting canonical events — reword to '主要 emit 経路。hook も同一 Provider 経由で emit'
- MINOR component-methods.md tracer-provider: '型レベルで明示' over-promises — change to 'ラッパ型＋サンプルで契約を統一'

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T07:30:09Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 6 iteration-1 findings verified fixed (orphan requirements assigned, realization-path section added, naming aligned, invariant refined, services reworded, tracer wording fixed); no new findings.

### Findings

- None
