上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — setup-hooks-merge

> 上流入力の使用箇所: performance-requirements.md の判定(ほぼ N/A・線形の文字列処理)を設計の前提とする。

## 対象の概要

performance-requirements.md のとおり、マージは小さなテキスト処理で性能対象を持たない。

## 設計

- planMerge/applyMerge は単一パスの文字列処理とし、config を複数回走査しない(performance-requirements.md §測るもの)
- 既存ブロック検出はマーカー行の走査のみ。全体の構文検証は Bun ネイティブの `Bun.TOML.parse` による単一 parse で済ませる(ランタイム内蔵で新規依存なし。小さな config で十分に軽い — reliability-design.md の oracle 規定どおり)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:26:26Z
- **Iteration:** 2
- **Scope decision:** none

major(oracle)は Bun.TOML.parse 検証専用で解消、4 minor も全て解消。新規の broken ref なし。

### Findings

- None
