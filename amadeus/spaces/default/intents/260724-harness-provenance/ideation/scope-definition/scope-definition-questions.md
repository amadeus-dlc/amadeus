# Scope Definition Questions — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

以下は intent-statement.md / feasibility-assessment.md / constraint-register.md からの直接導出であり、新規の価値判断を含まない(cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た)。承認: leader が承認しました(2026-07-24T11:12:42Z)。

## Q1. In-scope の範囲は?

[Answer]: A

- A. (1) `amadeus-state.md` 冒頭へのハーネス種別フィールド追加、(2) 各ステージ `memory.md` への同フィールド追加(フロントマター相当)、(3) Claude Code(`CLAUDECODE` 等)の環境変数からの自動検出実装、(4) Codex の自動検出可否の実機検証(TC-2)、(5) Cursor/OpenCode/Kiro について自動検出できない場合の手動記入フォールバック設計、(6) 監査シャードイベントへの付記の要否比較検討(Issue 明記)
- X. Other

## Q2. Out-of-scope の範囲は?

[Answer]: A

- A. (1) 過去 intent への遡及復元(Issue 明記、技術的に不可能)、(2) git commit author の書き換え(Issue 明記)、(3) Cursor/OpenCode/Kiro の自動検出手段が本 intent 中に確立できなかった場合の追加調査(→ 別 Issue へ)
- X. Other

## Q3. 優先順位は?

[Answer]: A

- A. P1: state/memory への記録フィールドのスキーマ確定と Claude Code 自動検出(確実に実現可能、TC-1)。P2: Codex 自動検出の実機検証と実装(条件付き実現可能、TC-2)。P3: Cursor/OpenCode/Kiro 向け手動記入フォールバックの実装。監査シャード付記は P3 相当の比較検討事項として扱う
- X. Other
