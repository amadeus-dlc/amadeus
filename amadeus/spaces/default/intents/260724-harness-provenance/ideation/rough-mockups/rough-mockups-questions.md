# Rough Mockups Questions — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md

本 intent は UI を持たない CLI/データスキーマ系機能である(intent-statement.md の Problem Statement 参照)。cid:requirements-analysis:ui-less-mockups-as-output-contract に従い、「verdict 別の出力文言+exit code のモック」として充足する。既習様式は既存の Amadeus CLI ツール群(`amadeus-state.ts` 等)に倣う。cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T11:17:16Z)。

## Q1-Q6(UI 系質問)は N/A

[Answer]: A

- A. N/A。本 intent はユーザー向け画面を持たない(scope-document.md In Scope 参照)
- X. Other

## Q7. 非UI系: 主要なシステム相互作用・データフローは?

[Answer]: A

- A. (1) ステージ実行開始時にハーネス種別を検出し `amadeus-state.md`/stage `memory.md` へ記録する、(2) 検出失敗時は `unknown`/`manual` へフォールバックする、(3) `amadeus-state.ts`/`amadeus-lib.ts` の既存 read/write ヘルパーを再利用する。詳細は wireframes.md(システムコンテキスト図)、user-flow.md(相互作用フロー)に記す
- X. Other
