上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — core-harness-enums

> 上流入力の使用箇所: business-logic-model.md の doctor arm 検査フロー(step 4 のバージョン取得)と business-rules.md の BR-4(probe は advisory)を前提とする。

## 対象の概要

本 Unit は列挙追加と doctor チェックで、実行時の性能対象は doctor コマンドの応答のみ。

## 判定と基準

- doctor の各チェック(実在・マーカー検出・バージョン取得)は軽量で、バージョン取得(`kimi --version` の spawn)が支配的(business-logic-model.md §doctor arm step 4)。既存 arm(codex)と同程度であること
- 機能 probe は advisory で軽量な発火確認に留め、重い検査を入れない(business-rules.md BR-4)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T13:17:44Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は BLM/BR と全点整合。security(読み取り専用・固定引数 spawn)、reliability(決定的フロア・未導入明示・fail-closed)、tech-stack(同形・MIN_CODEX 流儀・driver なし)。検出は全て minor で同一 iteration で修正済み。

### Findings

- (minor / 5ファイル) 使用箇所ヘッダの過剰宣言 → 修正済み(実使用のアンカーへ絞り込み)
- (minor / scalability) NFR-3 の不適切な暗示 → 修正済み(ヘッダから除外)
