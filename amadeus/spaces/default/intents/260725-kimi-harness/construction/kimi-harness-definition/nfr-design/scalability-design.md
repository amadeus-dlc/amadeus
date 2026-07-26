上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Scalability Design — kimi-harness-definition

> 上流入力の使用箇所: scalability-requirements.md の N/A 判定(固定構成の宣言物)を前提とする。

## 対象の概要

scalability-requirements.md で N/A(存在しない対象)と判定済み。

## 設計

- スケール機構は設けない。ハーネス数・スキル数の規模増は packager の自動検出構造に委ねる(tech-stack-decisions.md §選択 — runner-gen 既定)
