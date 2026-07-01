# UC002: 内部 skill を分類する

## 概要

Maintainer は、棚卸し結果を確認し、公開入口 skill、横断的補助 skill、内部 skill の分類を判断する。

## アクター

- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- UC001 の棚卸し結果がある。
- Ideation の対象境界と対象外境界を参照できる。

## 基本フロー

1. Maintainer は Phase Skills と Cross-Cutting Support Skills の既存分類を確認する。
2. Maintainer は Issue #284 に列挙された内部 skill 候補を確認する。
3. Maintainer は Issue #284 に列挙されていない内部 skill 候補を確認する。
4. Maintainer は Internal Skills 一覧へ載せる対象を判断する。

## 代替フロー

- 分類判断が現行 README の説明と矛盾する場合は、README の説明更新を Construction の対象にする。

## 対象要求

- R002
- R005

## 未確認事項

- `amadeus-validator` の分類は Construction で既存 README の Cross-Cutting Support Skills と照合する。
