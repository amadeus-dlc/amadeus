# UC002 実装実行のゲート判定

## ユースケース

Agent が実装実行の起動時に `taskGeneration.status` を読み、`passed`（人間承認済み）の場合だけ実装へ進む。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 Bolt の `taskGeneration.status` が `state.json` から読める。

## 基本フロー

1. Agent は、実装実行の起動時に対象 Bolt の `taskGeneration.status` を読む。
2. `passed` の場合、Agent は Task に対応する実装へ進む。

## 代替フロー

| 条件 | 扱い |
|---|---|
| `taskGeneration.status` が `ready_for_approval` である。 | 実装せずに停止し、人間承認待ちであることを報告する。 |
| `taskGeneration.status` が上記以外である。 | 実装せずに停止し、Bolt 準備へ戻るよう案内する。 |

## 対応要求

- R001

## 未確認事項

- なし。
