# D001: Inception の所有境界

## 背景

Issue #306 と #307 は、skill 側のゲート契約と validator 側の evidence 検査という 2 つの実装層を持ち、Inception でどこまでを扱うかを固定する必要がある。

## 判断

Inception の所有境界を、skill 契約変更（実装ゲート、grilling トリガー、scaffold-only 条件）と validator 検査（approval evidence の実在検査と eval）の要求、ユースケース、Unit、Bolt の定義に固定する。

skill 本文の最終文言、decision review への統合位置、検査の実装位置、fail メッセージは Construction で確定する。

## 理由

Issue の対象と対象外、Ideation の scope、grilling の確定判断（GD001、GD002）から、契約の内容は確定できるが、文言と実装位置は既存本文との整合を見ながら決める必要があるため。

## 影響

Construction の Functional Design では、トリガーの統合位置と検査の実装位置を最初に確定する。
