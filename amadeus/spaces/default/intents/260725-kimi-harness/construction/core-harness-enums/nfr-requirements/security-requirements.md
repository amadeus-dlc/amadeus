上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — core-harness-enums

> 上流入力の使用箇所: business-rules.md の BR-4、business-logic-model.md の doctor arm 検査フロー(step 3 の読み取り・step 4 の固定引数 spawn)を根拠とする。

## 対象の概要

doctor arm は検査のみで書き込みを行わない(読み取り中心 — business-logic-model.md の判定)。

## 脅威モデルと基準

- doctor はユーザー config を**読むだけ**で変更しない(business-logic-model.md §doctor arm step 3)。書き込みは setup(Bolt 3)の領域
- 機能 probe は advisory で、ユーザーのセッションに影響する操作を行わない(business-rules.md BR-4)
- バージョン取得は `kimi --version` の spawn のみで、引数注入の余地を作らない(固定引数)
