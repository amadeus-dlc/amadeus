# UC001 Skill Contract catalog の保守

## 概要

Agent が Skill Contract の型と catalog を定義し、Maintainer が契約変更を確認する。

## アクター

| 種別 | 名前 | 役割 |
|---|---|---|
| 主 | Agent | TypeScript 型と catalog を更新する。 |
| 副 | Maintainer | 契約項目と代表 skill 範囲を確認する。 |

## 事前条件

- `amadeus-contracts/catalog/**` が存在する。
- 初期対象 skill が `amadeus-ideation`、`amadeus-inception`、`amadeus-construction`、`amadeus-grilling`、`amadeus-validator` に限定されている。

## 基本フロー

1. Agent は Skill Contract の TypeScript 型を定義する。
2. Agent は代表 skill の契約要素を catalog に追加する。
3. Agent は catalog の公開口を更新する。
4. Maintainer は契約項目と対象範囲を確認する。

## 事後条件

- Skill Contract catalog が TypeScript で表現されている。
- 代表 skill 5件の契約要素が catalog に含まれている。

## 例外

| 条件 | 対応 |
|---|---|
| 代表 skill 以外を追加する必要が出た。 | 後続 Issue または後続 Intent として扱う。 |
| `SKILL.md` 全面再構成が必要になった。 | 今回の対象外として扱う。 |

## 対応要求

- R001
- R002

## 未確認事項

- なし。
