# インテント：自己開発 cycle の stage 判定と workspace 対応記録を定義する

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 自己開発 cycle の記録契約を定義する技術目標である。 |
| scope | feature | 後続 Intent で参照する記録単位を追加する進行プロファイルである。 |
| labels | self-dev, stage-records, provenance | 自己開発、stage 判定、provenance 記録を表す。 |

## 目的

Amadeus の自己開発 cycle で使う stage 判定、採用判断、workspace 対応記録の置き場所を定義する。

この Intent は [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) と [Discovery Brief](../discoveries/20260701-self-development-first-cycle.md) を根拠にする。

## 成功条件

- stage0、stage1、stage2 の意味を説明できる。
- stage2 を次回 stage0 として採用する条件を成果物から追跡できる。
- build workspace、host environment、target workspace、target artifacts の対応記録先が決まっている。
- 後続 Intent が参照する記録先が分かる。
- `.amadeus/` 全体を validator で検証できる。

## 範囲

含めるもの:

- 自己開発 cycle の stage 判定語彙。
- 人間による stage0 採用判断。
- build workspace、host environment、target workspace、target artifacts の対応記録先。
- 後続 Intent が参照する記録先。
- Discovery から Ideation への追跡。

含めないもの:

- skill 実装。
- validator 実装。
- example snapshot 再生成。
- Requirement、Use Case、Unit、Bolt、Task。
- 個別の stage 判定を自動化する仕組み。
