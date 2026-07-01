# D001 Functional Design Scope

## 状態

accepted。

## 背景

Issue #257 は、phase skill 起動時の decision tree 再評価と `amadeus-grilling` 起動条件の標準化を扱う。
Inception では U001 と U002 を定義し、B001、B002、B003 に分割した。

## 判断

Functional Design は decision review gate と phase skill 採用規則に限定する。
frontend surface は存在しないため、`frontend-components.md` は作らない。

## 根拠

- R001 から R005。
- U001 decision review gate contract。
- U002 phase skill adoption verification。

## 影響

Construction 成果物は、Unit ごとの業務ロジック、業務ルール、Domain Entity、Bolt tasks、検証結果に限定する。
Domain Map と Context Map は更新しない。
