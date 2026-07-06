# Security Test Instructions

Unit: u001-lifecycle-inputs（Test Strategy: Minimal、docs 変更）

## 適用判断

自動のセキュリティテストは追加しない。本 Intent のセキュリティ観点は文書内容の正確性（実在しない機構を現行仕様として記述しない）であり、検証手段は次の 2 点で確定している。

## 検証方法と結果

- 実在性: 記載した Inputs・参照 path の実在は実測（frontmatter 抜粋、ls / grep / find による確認）で裏付け済み（[measurement-correction-log.md](../u001-lifecycle-inputs/code-generation/measurement-correction-log.md)）。§12a 反復 1 が IndexGenerate.ts（実在しない）への言及残存を検出し補正した。
- credential・秘密情報の不含: diff レビューで確認済み（ファイル path・ステージ名・Issue 番号のみを含む）。
