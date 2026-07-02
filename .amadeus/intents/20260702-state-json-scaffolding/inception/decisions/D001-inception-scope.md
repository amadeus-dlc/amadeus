# D001: Inception の所有境界

## 背景

Issue #311 は、雛形生成スクリプトの実装と phase skill の手順変更という 2 つの実装層を持ち、Inception でどこまでを扱うかを固定する必要がある。

## 判断

Inception の所有境界を、雛形生成スクリプト（6 遷移の生成、更新規則、同梱配置、eval 先行）と phase skill の手順参照の要求、ユースケース、Unit、Bolt の定義に固定する。

スクリプトの引数体系、出力形式、手順参照の最終文言は Construction で確定する。

## 理由

Issue の対象と対象外、Ideation の scope、grilling の確定判断（GD001 配置先）から契約の内容は確定できるが、引数体系と文言は既存の skill 本文と実データを見ながら決める必要があるため。

## 影響

Construction の Functional Design では、遷移種別ごとの生成、更新内容のモデルと引数体系を最初に確定する。
