# 自己開発 cycle の stage 判定と workspace 対応記録

## 概要

自己開発 cycle の stage 判定と workspace 対応記録を定義する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260629-self-dev-steering-layer | 初回導入 Intent の D002 により、Issue #233 を後続 Intent として扱うため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus 本体リポジトリの自己開発基盤を安定させる技術目標である。 |
| scope | feature | 後続 Intent が共通して使う stage 判定と workspace 対応記録を定義する新規機能相当の Intent である。 |
| labels | self-dev, stage, workspace | 自己開発 cycle、stage 判定、workspace 対応記録を表す。 |

## 目的

Amadeus 自己開発 cycle で使う stage 判定、stage0 採用判断、build workspace と target workspace の対応記録先を定義する。

この Intent は [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) を根拠にする。

## 成功条件

- stage0、stage1、stage2 の意味が説明できる。
- stage2 を次回 stage0 として採用する条件が成果物から追跡できる。
- build workspace、host environment、target workspace、target artifacts の対応記録先が決まっている。
- Discovery から Ideation へ渡す Intent Draft が作れる。
- validator が `.amadeus/` 全体で pass する。

## 範囲

含めるもの:

- Amadeus DLC の自己開発 cycle で使う stage 判定語彙。
- 人間による stage0 採用判断。
- build workspace と target workspace の対応記録。
- 後続 Intent が参照する記録先。

含めないもの:

- skill 実装。
- validator 実装。
- example snapshot 再生成。
- 個別 Intent の Requirement、Use Case、Unit、Bolt、Task。
