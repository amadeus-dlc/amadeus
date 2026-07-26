上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — core-harness-enums

> 上流入力の使用箇所: reliability-requirements.md の3機構(決定的フロア・advisory probe・fail-closed)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性を、doctor arm と resolve の実装設計に落とす。

## 設計

- **フロア判定**: named constant(実測版)と `kimi --version` の出力を semver 比較。バイナリ不在は「未導入」表示で失敗と区別(reliability-requirements.md §信頼性の仕組み)
- **probe**: 失敗は advisory 表示(未検証)で、doctor 全体の失敗にしない(reliability-requirements.md §信頼性の仕組み)
- **resolve**: `HARNESS_VALUES` への追加のみで、未知 driver の fail-closed は既存 resolveDriver に委譲(変更しない — reliability-requirements.md §信頼性の仕組み)
