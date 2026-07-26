上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — kimi-live-journey

> 上流入力の使用箇所: business-logic-model.md の driver フローと実走手順、business-rules.md の BR-3(クレジット範囲)、requirements.md の FR-9/CC-1 を前提とする。

## 対象の概要

本 Unit は live 検証の driver で、性能対象は journey の実行コスト(時間・クレジット)そのもの。

## 判定と基準

- journey は最小のプロンプトで完結させる(status / doctor の2種。business-logic-model.md §driver フロー)。1 journey あたりの kimi セッションは短い(数プロンプト)
- クレジット消費は CC-1 の範囲(journey 実走のみ)に限定し、journey には「SPENDS Kimi credits」を明記(business-rules.md BR-3)
- タイムアウトは既存 driver と同じく明示値で打ち切る(business-logic-model.md 決定木)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T13:34:59Z
- **Iteration:** 1
- **Scope decision:** none

NFR 5ファイルは hermeticity・信頼性・CC-1 と整合し全引用が解決可能。検出3件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / security) 認証所在の前提を明記(tmp 差替で未認証となりうる点と実機確認での確定方針)
- (minor / tech-stack) 「kiro TUI driver」表記を upstream の記述に合わせて修正
- (minor / 共通) technology-stack.md の実参照を追加
