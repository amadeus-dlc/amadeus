# R002 代表 skill 契約

## 概要

初期対象 skill の実行契約を、事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、grilling、feedback 条件として表現できる。

## 背景

Issue #263 は、まず `amadeus-ideation`、`amadeus-inception`、`amadeus-construction`、`amadeus-grilling`、`amadeus-validator` に対象を限定している。全 skill 一括適用ではなく、代表 skill の契約要素で型と生成経路を検証する。

## 要求

| 項目 | 内容 |
|---|---|
| 対象 | `amadeus-ideation`、`amadeus-inception`、`amadeus-construction`、`amadeus-grilling`、`amadeus-validator`。 |
| 契約要素 | prerequisites、invariants、postconditions、read boundary、write boundary、delegation、grilling conditions、feedback conditions。 |
| 制約 | 親 skill が直接書かない成果物、先回り禁止、merge 禁止、validator pass の意味、後方互換の扱い、範囲外変更禁止を表現できる。 |

## 受け入れ

- 代表 skill 5件の契約が catalog で表現されている。
- `SKILL.md` の実行契約と矛盾する契約を追加していない。
- `npm run typecheck` が通る。

## 依存

- R001。

## 未確認事項

- なし。
