# Unit of Work Dependency — 260807-stage-perf-report

上流入力(consumes 全数): components(C1〜C9 の内部依存を Unit 内トポロジーの参照として消費)、component-methods(シグネチャ境界を統合点定義の根拠として消費)、services(単一サービス構成を単一 Unit DAG の根拠として消費)、component-dependency(外部依存の閉集合 — `amadeus-journal.ts` のみ — を Unit 外部統合点として消費)、decisions(ADR-2 依存方向裁定を統合点契約として消費)、requirements(FR-7a read-only 制約を統合点の性質として消費)

## 依存 DAG

Unit は 1 つ(U1: stage-stats-cli)であり、Unit 間依存エッジは存在しない(自明に cycle-free)。

```yaml
units:
  - name: stage-stats-cli
    kind: service
    depends_on: []
```

## 統合ポイント

Unit 間統合はなし。Unit 外部との統合点(既存資産への read-only 接続):

- **`amadeus-journal.ts`**(exported API): `readJournalRecords` / `journalRecordField` の消費(ADR-2)。契約は同モジュールの現行 export シグネチャ
- **監査シャード**(データ): `amadeus/spaces/<space>/intents/*/audit/*.jsonl` の read-only 走査(FR-1a)
- **record 成果物**(データ): `## Review — Iteration N` ブロックの read-only 走査(FR-3a)
- 共有可変状態・イベント・API 公開はなし(FR-7a — component-dependency.md の通信パターン節と同一)

## 並列開発機会

Unit が 1 つのため Unit 間並列はなし。Unit 内部の並列余地(純関数コア群 C2〜C8 は相互独立)は実装編成の自由度として Construction に委ねる — 本書はトポロジーのみを規定し、実装順序の推奨は 2.8 Delivery Planning の経済的判断に属する。
