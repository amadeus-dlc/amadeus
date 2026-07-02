# UC004 確定判断の記録で scaffold-only を許可する

## ユースケース

Agent が `amadeus-ideation` の auto 判定で、入力に確定判断の記録への参照が存在する場合だけ scaffold-only を選ぶ。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 入力テーマ、Discovery Brief、または GitHub Issue が入力として与えられている。

## 基本フロー

1. Agent は、auto 判定で入力に確定判断の記録（GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断）への参照が存在するかを確認する。
2. 参照が存在し、Ideation の判断項目（対象境界、実行制御など）がそこから導ける場合、Agent は scaffold-only を選ぶ。
3. Agent は、選択理由として参照した確定判断の記録を示す。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 確定判断の記録への参照がない。 | scaffold-only を選ばず、`guided` として不足判断を一問ずつ質問する。 |
| 参照はあるが、Ideation の判断項目を導けない。 | 導けない項目だけを `guided` で質問する。 |

## 対応要求

- R003

## 未確認事項

- なし。
