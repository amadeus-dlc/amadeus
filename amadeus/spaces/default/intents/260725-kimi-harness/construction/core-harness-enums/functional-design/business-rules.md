上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — core-harness-enums

requirements.md の FR-4 と components.md C4、component-methods.md の doctor arm 構成から導出する不変条件。

## 列挙追加の不変条件

- BR-1: 編集はサンクション済み3箇所のみ(doctor arm・swarm `HARNESS_VALUES`・`amadeus-harness.ts` の4定数)。他の core ロジックに触れない
- BR-2: `amadeus-harness.ts` への追加は既存行と同形: `HarnessType` union に `"kimi"`、`HARNESS_DIR_TO_TYPE` に `.kimi-code → kimi`、`KNOWN_HARNESS_DIRS` の probe 順に `.kimi-code`、`KNOWN_RULES_SUBDIR` に `.kimi-code → rules`(rulesRename null のため)
- BR-3: バージョンフロアの下限は実装時の実測版を named constant として置き、既存 arm(codex `MIN_CODEX`)と同じ検査・失敗の流儀にする
- BR-4: doctor の機能 probe は advisory(失敗してもワークフローは動く旨を併記)。hook は補助的機構の前提を崩さない
- BR-5: swarm は subagent floor のみ。ultra 系の driver 名を HARNESS_VALUES/DRIVER_VALUES に追加しない(ADR-6)

## 適用範囲

- U4 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-4/FR-7d 行)に適用する
- requirements.md の FR-4 と TC-4(フロア = 実測版)が根拠
- services.md の判定(検査は advisory)により、probe 以外の全チェックは決定的に判定する
