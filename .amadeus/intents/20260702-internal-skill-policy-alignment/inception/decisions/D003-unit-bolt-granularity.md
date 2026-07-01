# D003: Unit と Bolt の粒度

## 背景

この Intent は、内部 skill の分類、README 一覧、暗黙起動ポリシー、後続候補分離を同じ自己開発運用境界で扱う。

一方で、Construction では README 更新、設定配置確認、後続候補分離を別々の作業境界として扱える。

## 判断

Unit は U001 の1つにまとめ、Bolt は B001、B002、B003 の3つに分ける。

## 理由

Unit を複数に分けると、README 一覧と暗黙起動ポリシーの分類判断が重複する。

Bolt を1つにまとめると、README 反映、設定配置、対象外判断の検証証拠が混ざる。

そのため、価値境界は1つ、実施境界は3つに分ける。

## 影響

Construction では、B001 で README と分類、B002 で暗黙起動ポリシー、B003 で後続候補と検証証拠を扱う。

Requirement、Story、Use Case、Unit、Bolt は完全な 1:1 ではないため、分割不足ではない。
