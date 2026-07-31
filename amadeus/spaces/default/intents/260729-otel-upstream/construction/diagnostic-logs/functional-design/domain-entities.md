# Domain Entities — U10: diagnostic-logs

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## DiagnosticLogRecord

`emitDiagnostic(name, attrs)`（component-methods.md logger-provider.ts）から生成され、LocalLogExporter が保存する 1 record。

| 属性 | 型 | 説明 |
|---|---|---|
| name | string | 自由形式の diagnostic 名（Registry の canonical 語彙を使わない、BR-6） |
| attributes | Record<string, unknown> | redaction 済みの付随情報（BR-5） |
| traceId | string \| null | active Context の trace ID（FR-MLM-2、BR-9 で欠落許容） |
| spanId | string \| null | active Span の ID（同上） |
| timestamp | string（ISO 8601） | emit 時刻 |

ライフサイクル:

| 状態 | 遷移 |
|---|---|
| 構成 | `emitDiagnostic` 呼出しで Provider が Context 採取＋record 構成 |
| 保存 | LocalLogExporter が Store へ同期 append。以後不変（更新・削除しない） |
| 破棄 | 保存失敗時は record を捨てる（fail-open、BR-2。再試行・再 emit しない） |
| 読取 | Relay（U11）が Store から読み OTLP 変換。本 Unit では読み戻し用途を持たない |

## DiagnosticLogStore

machine-local JSONL の append-only 集合（Local Exporters 共通の Store 形態。U1 の LocalSignalStore 系と同一配置方針）。

| 属性 | 説明 |
|---|---|
| 形式 | 1 行 1 record の JSONL（audit JSONL とは別ストア。混在しない、FR-EXP-4） |
| 読取主体 | Relay（U11）が OTLP 変換用に読む。本 Unit は書込側のみ責務 |
| 書込性質 | 同期 append。複数 clone／worktree からの並行書込は Store 共通の shard・lock 機構に従う（services.md スケーリング特性） |

## 関係

- DiagnosticLogRecord 1 — 1 SpanRecord（U1/U4 の完成 Span）。traceId／spanId で相関する（FR-MLM-2）
- DiagnosticLogRecord は CanonicalEventRecord（U1/U4）と型・保存先の両面で分離される。両者を結ぶ参照は持たない（FR-EXP-4）
- LocalLogExporter（U4 が hardening、本 Unit が利用）は DiagnosticLogRecord を入力に取る `export(record): void` を持つ（components.md 公開 Interface、BR-11）
