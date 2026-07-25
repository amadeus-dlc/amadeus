# Competitive Analysis — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md

## N/A 判定

intent-statement.md の Problem Statement / Target Customer が示すとおり、本 intent は Amadeus 自身の内部記録スキーマ(`amadeus-state.md`、stage `memory.md`)への拡張であり、Target Customer は内部顧客(Amadeus 開発チーム自身)に限定される。market-research-questions.md Q1/Q2 の回答どおり、外部市場に競合する製品カテゴリが存在しないため、競合分析は N/A とする。

## 反証可能な根拠

- 本機能が対象とするのは「AI-DLC ワークフローのステージ実行を、どの AI ハーネス(claude-code / codex / cursor / opencode / kiro)が行ったかを記録する」という Amadeus 固有の運用ニーズであり、他プロダクトへの外部提供を前提としない(Issue #1452 の「非対象」節に外部提供の言及なし)
- Amadeus は OSS フレームワーク配布物(`dist/<harness>/`)を持つが、本機能は配布物のユーザー向け機能ではなく、Amadeus 自身のワークフロー記録内部の拡張である

代わりに使う内部証拠: intent-statement.md、Issue #1452 本文。
