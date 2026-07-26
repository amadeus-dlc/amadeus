上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Scalability Design — kimi-live-journey

> 上流入力の使用箇所: scalability-requirements.md の N/A 判定(ゲートで CI コスト非影響)を前提とする。

## 対象の概要

scalability-requirements.md で N/A(存在しない対象)と判定済み。

## 設計

- journey 数の増加は skipReason ゲートで管理し、決定的 tier では常に skip(business-rules.md BR-1 経由 — scalability-requirements.md §判定と基準)。CI コストに影響しない設計を維持する
