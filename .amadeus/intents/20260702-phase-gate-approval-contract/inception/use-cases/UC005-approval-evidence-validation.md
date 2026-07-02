# UC005 approval evidence を構造検査する

## ユースケース

Agent が validator を実行し、`taskGeneration.status` が `passed` の Bolt に `kind: approval` の evidence が存在することを検査する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 workspace の `.amadeus/intents/**/state.json` が読める。
- 検査を追加した validator が、eval で失敗確認（RED）を経て実装され、昇格先成果物として同期されている。

## 基本フロー

1. Agent は、対象 workspace を指定して validator を実行する。
2. validator は、`state.json.construction.bolts[].taskGeneration` を読み、`status` が `passed` の項目の `evidence` に `kind: approval` が含まれるかを検査する。
3. validator は、検査結果を pass または fail として報告する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| `passed` の Bolt に `kind: approval` の evidence がない。 | validator は fail を報告し、Agent は Bolt 準備の承認手順へ戻るよう案内する。 |
| `taskGeneration.status` が `ready_for_approval` である。 | approval evidence がなくても pass とする。 |
| `construction.bolts` が存在しない。 | この検査の対象外として扱う。 |

## 対応要求

- R004
- R005

## 未確認事項

- なし。
