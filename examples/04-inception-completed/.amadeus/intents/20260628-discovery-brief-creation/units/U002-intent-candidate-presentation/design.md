# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Unit の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- Discovery Brief の判定と判定理由を根拠に、Intent 候補を確認可能にする。
- 候補ごとに、状態、課題、成功状態、除外範囲、依存を示す。
- `multi_intent` の場合は、依存順序を踏まえて最初に Intent 化する候補を1件だけ示す。
- Intent 初期化は自動実行せず、後続の操作に委ねる。

## 責務境界

- 所有するもの: Intent 候補、候補判断、最初に進める候補、候補間依存。
- 所有しないもの: Discovery Brief の基礎記録、Intent 初期化の実行、Ideation 以降の成果物生成。
- 依存してよいもの: U001 の Discovery Brief、Steering layer の目的、ポリシー、既存 Intent 一覧。
- 後続で再確認が必要になる条件: 候補選択が Intent 初期化と接続される場合。

## 構成候補

- 候補一覧。
- 候補判断。
- 依存順序。
- 最初に進める候補。
- 推奨次アクション。

## データと契約候補

- 入力候補: Discovery Brief、判定、判定理由、候補の課題、成功状態、除外範囲、依存。
- 出力候補: Intent 候補一覧、候補判断、最初に進める候補。
- 状態候補: 候補提示済み、最初の候補確認済み。
- 事前条件候補: Discovery Brief に入力テーマと判断が記録されている。
- 事後条件候補: 最初に Intent 化する候補が1件だけ示されている。
- 不変条件候補: 候補提示は Intent 初期化を自動実行しない。

## 検証観点

- 候補一覧に必要な判断材料が含まれている。
- 候補判断と最初の候補が矛盾していない。
- 候補間依存が読み取れる。
- Intent 初期化の実行が発生していない。

## Bolt 分割方針

- B002 Intent 候補提示で、この Unit の候補提示、候補判断、最初の候補確認を Construction へ渡す。
- B002 は B001 の Discovery Brief 記録を前提にする。

## Construction への引き継ぎ

- Domain Design で確定する事項: Intent 候補と候補判断の用語境界。
- Logical Design で確定する事項: 候補一覧、依存順序、最初の候補の表現。
- 実装時に確認する事項: 候補選択後の導線を自動初期化から分離する方法。
- 検証時に確定する事項: `multi_intent` の場合に候補が複数でも最初の候補が1件に絞られること。
