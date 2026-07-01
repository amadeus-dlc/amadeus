# D001 Functional Design scope

## 状態

accepted

## 背景

Inception では、stage 前提確認を U001、前提不成立分類と説明境界を U002 に分けた。

どちらも Construction の実装と検証に必要な詳細ルールを持つ。

## 判断

U001 と U002 の Functional Design を必須にする。

frontend surface は存在しないため、`frontend-components.md` は作らない。

## 理由

U001 は Skill Contract と phase skill 起動時判断に関わる。

U002 は配布対象 skill の説明境界と eval に関わる。

どちらも Task 化前に業務ロジック、業務ルール、Domain Entity を固定する必要がある。

## 影響

`state.json.construction.functionalDesign.units[]` で U001 と U002 を `required`、`passed`、`frontendSurface: absent` とする。
