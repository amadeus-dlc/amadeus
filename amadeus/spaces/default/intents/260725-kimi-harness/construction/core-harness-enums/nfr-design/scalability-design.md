上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Scalability Design — core-harness-enums

> 上流入力の使用箇所: scalability-requirements.md の N/A 判定(定数追加)を前提とする。

## 対象の概要

scalability-requirements.md で N/A(存在しない対象)と判定済み。

## 設計

- スケール機構は設けない。ハーネス数の規模増は検出の自動化構造に委ね、swarm の fan-out 規模は conductor 側の既存波制御に従う(scalability-requirements.md §判定と基準)
