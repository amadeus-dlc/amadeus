# Performance Requirements — U2-mirror-skill

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## PR-U2-1: SKILL 自体の性能面なし

U2 は文書成果物(SKILL.md)でランタイム処理を持たない — 性能要件は実行先ツール(U1)の PR-U1-x に帰属。SKILL 側の要件は「Step 1 が単一コマンド実行で完了する」構造のみ(多段の探索・走査を SKILL 手順に置かない)。

## PR-U2-2: 投影コスト

coreDirs 投影1ファイル追加(technology-stack.md の dist 構成に対し +6面×1ファイル)— package.ts のビルド時間への影響は無視できる規模(単一 md コピー)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:32:27Z
- **Iteration:** 1
- **Scope decision:** none

U2 NFR-R READY i1(誤帰属ゼロ・帰属移転妥当・定量根拠あり)

### Findings

- None
