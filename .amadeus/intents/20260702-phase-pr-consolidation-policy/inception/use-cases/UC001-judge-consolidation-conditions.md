# UC001 統合条件を判定する

## ユースケース

Agent が対象 Intent の実行スコープ、変更対象、未確定事項の解消状況を読み、phase PR の統合を許可できるかを判定する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 Intent の `ideation/scope.md`（実行スコープ）と `ideation/ideation.md`（未確定事項）が読める。

## 基本フロー

1. Agent は、対象 Intent の実行スコープが `refactor` または docs 系であるかを確認する。
2. Agent は、変更対象が文書だけで、実装コードとテストコードを含まないかを確認する。
3. Agent は、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済みかを確認する。
4. 3 条件をすべて満たす場合、Agent は仕様側（Discovery〜Inception）の統合を選べる。

## 代替フロー

| 条件 | 扱い |
|---|---|
| いずれかの条件を満たさない。 | 既定どおり phase ごとの PR にする。 |
| Construction 実装または finalization が対象に含まれる。 | 統合の対象外として、従来どおり別 PR にする。 |

## 対応要求

- R001
- R002

## 未確認事項

- なし。
