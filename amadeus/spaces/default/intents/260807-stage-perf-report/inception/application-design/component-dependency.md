# Component Dependency — 260807-stage-perf-report

上流入力(consumes 全数): requirements(C-3 の依存方向制約を検証面として消費)、architecture(codekb — amadeus-journal.ts の export 実測を依存正当性の根拠として消費)、component-inventory(codekb — 依存先モジュールの実在確認に消費)

## 依存グラフ(テキスト)

```
C9 CliShell
 ├─ C1 CorpusScanner ─── amadeus-journal.ts(readJournalRecords / journalRecordField)
 ├─ C4 ReviewBlockCollector(FS 読取: record *.md)
 ├─ C2 WindowBuilder ──┐
 ├─ C3 IdleSubtractor ─┤(純関数: C1 の出力のみ消費)
 ├─ C5 SensorTallier ──┤
 ├─ C6 ModelAttributor ┘
 ├─ C7 StatsComposer(C2/C3 の出力のみ消費)
 └─ C8 Renderer(C5/C6/C7 の出力のみ消費)
```

## 制約(検証可能)

- 外部依存は `node:fs` / `node:path` / `amadeus-journal.ts` のみ。**`amadeus-lib.ts` を import しない**(ADR-2 — subagent-stats :21-23 と同型の依存方向)
- fs の **write API を import しない**(FR-7a — grep 検査可能。AC: 自動テストで import 0 件を検査)
- `tests/` 配下を import しない(出荷境界 — percentile は鏡映実装)
- 循環依存なし(C2〜C8 は下流一方向)
- Mermaid 図は用いない(テキスト DAG で十分小規模なため — 検証容易性を優先)

## 通信パターンと共有リソース

- 通信パターン: 全コンポーネント間は**同期のインプロセス関数呼び出し**のみ。async/イベント駆動・プロセス間通信は用いない(単発実行の read-only CLI)
- 共有リソース: 共有可変状態なし。読取対象(audit シャード・record *.md)は read-only アクセスのみで、ロック・書込 API は一切持たない(FR-7a)
