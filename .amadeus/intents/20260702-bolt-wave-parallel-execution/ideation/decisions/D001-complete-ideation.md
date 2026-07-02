# D001: complete ideation

## 背景

Issue #352 は、Construction が Bolt を直列に実行する前提であり、依存のない Bolt 同士も直列で実行している問題を扱う。
Discovery `20260702-parallel-execution` の候補「Bolt の依存 wave 並行実行」であり、待機条件「他の 3 候補の後に扱う」は #334、#350、#351 の cycle 完了で解消している。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、wave 導出の契約、定義先の Construction skill、wave ごとの統合と検証の手順、Task Generation Gate との関係、並行運用ポリシーとの参照関係を具体化する。

## 理由

Issue #352 の目的、対象、対象外、受け入れ条件と、Discovery の候補判断（G001 の GD001〜GD003）から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存コード分析（`bolts.md` の依存表構造、Construction skill の実行手順、並行運用ポリシー）で扱える。

## 影響

Inception では、wave 導出の契約を最初に確定する。
この契約が実行と統合の手順、定義先の skill、まとめ承認の扱いを決める。
