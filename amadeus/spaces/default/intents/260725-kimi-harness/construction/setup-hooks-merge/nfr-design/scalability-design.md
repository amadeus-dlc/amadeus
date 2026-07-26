上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Scalability Design — setup-hooks-merge

> 上流入力の使用箇所: scalability-requirements.md の基準(規模増でも識別が安定・config は独立)を設計の前提とする。

## 対象の概要

scalability-requirements.md のとおり、マーカー基準で規模増に依存しない。

## 設計

- **マーカー基準の識別**: 既存 `[[hooks]]` の量に関係なく、BEGIN/END マーカー行の検出のみで managed block を特定する(scalability-requirements.md §判定と基準)
- **config 独立**: 複数プロジェクトの config はそれぞれ独立に処理し、共有状態を持たない
