# Component Dependency — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`（参照済み）

## 依存マトリクス（→ は「依存する」）

| コンポーネント | 依存先 | 通信 |
|---|---|---|
| tools／hooks の呼出し側 | `@opentelemetry/api` ファミリー（唯一の上流 Interface） | 同期 |
| tracer-provider | context.ts, redaction.ts, local-span-exporter.ts | 同期 |
| logger-provider | event-registry.ts, audit-log-exporter.ts, local-log-exporter.ts, fatal-latch.ts, context.ts | 同期 |
| meter-provider | local-metric-exporter.ts | 同期 |
| audit-log-exporter | amadeus-journal.ts（schema v2 codec）, fatal-latch.ts, redaction.ts | 同期 append |
| event-registry | （なし。型＋データのみ） | — |
| context.ts | `@opentelemetry/context-*`（既製検証後に確定）、永続化は record 配下（record パス解決は呼出し側から注入し、lib 非依存を維持） | 同期 |
| relay.ts | local Stores（読取）、`@opentelemetry/*` の OTLP 変換層 | 非同期・best-effort |
| migration-adapter | event-registry.ts, logger-provider.ts | 同期 |
| 既存 reader 群（doctor/recovery/presence/grant） | amadeus-journal.ts（v1/v2 reader） | 同期 read |

## データフロー

```text
呼出し側（tools/hooks/subagent）
  ├─ canonical: emitEvent → logger-provider → audit-log-exporter → journal codec → audit JSONL → reader 群
  ├─ trace:     startActiveSpan → tracer-provider → local-span-exporter → Completed Span Store ┐
  ├─ logs:      emitDiagnostic → logger-provider → local-log-exporter → Log Store             ├─ relay → Collector
  └─ metrics:   counter/histogram → meter-provider → local-metric-exporter → Metric Store     ┘
```

## 共有リソース

| リソース | 共有方式 | 制御 |
|---|---|---|
| audit JSONL（per-clone shard） | 複数 clone／process から書込 | mkdir lock＋clone-local sequence（現行維持） |
| Signal Stores（Span/Log/Metric） | 同一 host 内の複数 process | machine-local JSONL、append-only、fail-open |
| fatal latch | process-local のみ | 共有しない（FR-EVT-4）。新 process は health 検証で再評価（FR-EVT-5） |
| Intent Trace Context | record 配下に永続化 | persist/restore で短命 process を remote parent へ接続（FR-TRC-4） |
| Event Registry | 全 process で同一の型付き定義 | drift guard（VER-1）で乖離を CI 拒否 |

## 依存方向の不変条件

- `otel/` 配下は `tools/` の個別 CLI エントリポイントに依存しない（tools → otel の一方向）。ただし `tools/amadeus-journal.ts`（Journal Module）はライブラリ依存として許容する（ADR-5 で codec・reader の集約先）
- `amadeus-lib.ts` は otel 配下に依存しない（既存巨大 lib への混入を防止）
- audit JSONL は Relay の入力に含めない（FR-RLY-2）
