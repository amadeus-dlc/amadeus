# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Unit の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- Discovery Brief を、入力テーマから後続 Intent 候補確認へ進むための判断記録として扱う。
- 記録対象を入力テーマ、確認した前提、判定、判定理由、推奨次アクションに限定する。
- Requirement、Use Case、Unit、Bolt、Task の定義を Discovery Brief の責務から外す。

## 責務境界

- 所有するもの: Discovery Brief の記録項目、判定、判定理由、推奨次アクション。
- 所有しないもの: Intent 候補の選定、Intent 初期化、Requirement 以降の成果物定義、実装証拠。
- 依存してよいもの: 入力テーマ、確認した前提、Steering layer の目的、アクター、ポリシー。
- 後続で再確認が必要になる条件: Discovery Brief に記録する項目を増やす場合、または保存操作を確定する場合。

## 構成候補

- 入力テーマ記録。
- 前提整理。
- 判定記録。
- 判定理由記録。
- 推奨次アクション記録。

## データと契約候補

- 入力候補: 大きな入力テーマ、確認した前提、判定に必要な判断材料。
- 出力候補: Discovery Brief、推奨次アクション。
- 状態候補: 記録済み、確認待ち。
- 事前条件候補: 入力テーマが提示されている。
- 事後条件候補: Discovery Brief に入力テーマ、前提、判定、判定理由、推奨次アクションが残っている。
- 不変条件候補: Discovery Brief は Requirement、Use Case、Unit、Bolt、Task を定義しない。

## 検証観点

- 必須記録項目が欠けていない。
- `multi_intent` などの判定と判定理由が対応している。
- Discovery の責務境界が保たれている。

## Bolt 分割方針

- B001 Discovery Brief 記録で、この Unit の記録項目、完了条件、責務境界を Construction へ渡す。

## Construction への引き継ぎ

- Domain Design で確定する事項: Discovery Brief と Intent 候補の関係を表す用語境界。
- Logical Design で確定する事項: 記録項目の保持構造、確認状態、後続候補への参照方法。
- 実装時に確認する事項: 保存操作、表示形式、既存例示との整合。
- 検証時に確定する事項: 必須記録項目と対象外項目が観測可能に確認できること。
