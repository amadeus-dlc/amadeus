上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — distribution-enumeration

> 上流入力の使用箇所: business-logic-model.md の列挙フロー(step 5)と business-rules.md の BR-3、requirements.md の FR-5(列挙対象)、technology-stack.md の既存 CI 基盤を前提とする。

## 対象の概要

本 Unit は列挙追加と drift guard の維持で、実行時の性能対象は CI のチェック時間のみ。

## 判定と基準

- `dist:check`・`promote:self:check` が dist ツリー7面(kimi 追加後)で現実的な時間で完了すること(business-logic-model.md §列挙フロー step 5。既存6面と同程度+1)
- dogfood の実機確認(起動・doctor)は人手の確認工程で、自動計測の対象外

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T13:27:25Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は BR/BLM に忠実で、security・reliability・N/A 判定は整合。検出3件は全て minor で同一 iteration で修正済み。spot-check 要求は形式不正のため conductor が直接検証(`bun run lint` は package.json に実在・lint:check と同一)して解決。

### Findings

- (minor / 5ファイル) requirements.md/technology-stack.md の本文引用なし → 修正済み(FR-5 系・既存構成への引用を追記)
- (minor / reliability) 回復手続きの未記名 → 修正済み(package.ts / promote:self を両名)
- (minor / lint コマンド) → conductor 実測で解決(package.json に lint・lint:check 両方実在)
