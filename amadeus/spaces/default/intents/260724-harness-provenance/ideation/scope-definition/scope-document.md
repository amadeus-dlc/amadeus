# Scope Document — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## In Scope

1. `amadeus-state.md` 冒頭(Project Information 相当)へのハーネス種別フィールド追加
2. 各ステージ `memory.md` へのハーネス種別記録(フロントマター相当の箇所)
3. Claude Code の環境変数(`CLAUDECODE`、`CLAUDE_CODE_SESSION_ID` 等 — feasibility-assessment.md TC-1 で実測確認済み)からの自動検出実装
4. Codex の自動検出可否の実機検証(TC-2)、可能なら実装
5. Cursor / OpenCode / Kiro について、自動検出できない場合の手動記入フォールバック設計(検出不能時は `unknown`/`manual` を許容するフィールド設計 — RAID R-1 の緩和策)
6. 監査シャードイベント(`audit/*.md`)への付記の要否比較検討(Issue #1452 本文で明示的に「比較検討」と指定)

## Out of Scope

1. 過去 intent への遡及復元 — 既存 record に情報が残っていないため技術的に不可能(Issue #1452 明記)
2. git commit author の書き換え(Issue #1452 明記)
3. Cursor / OpenCode / Kiro の恒久的な自動検出手段の確立 — 本 intent 中に env var 実装例を確立できなかった場合、追加調査は別 Issue へ切り出す(constraint-register.md TC-3)

## Scope Boundary Rationale

feasibility-assessment.md の実測(TC-1〜TC-3)により、確実に自動検出できるのは Claude Code のみ、Codex は条件付き、Cursor/OpenCode/Kiro は未確認という技術的制約が判明した。この制約を踏まえ、in-scope はスキーマ設計・確実な検出手段の実装・不確実なハーネスへのフォールバック設計までとし、未確立の自動検出手段の研究自体は out-of-scope として別 Issue へ切り出す判断を scope-definition-questions.md Q2 で確定した。
