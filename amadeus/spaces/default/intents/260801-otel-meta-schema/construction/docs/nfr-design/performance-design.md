# Performance Design — U6 docs

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)。各面要件は requirements.md NFR-3(blocking gate)から代替導出。business-logic-model.md(実在)の生成フロー(en+ja 対訳ペアを同一 PR で新設)を消費。

## 適用範囲の宣言(docs-compilation unit)

- U6 は runtime コードを含まない docs 専業 unit — 実行時性能の設計対象が存在しない(反証可能な根拠: unit-of-work.md U6 行は docs 200行のみ、コード按分ゼロ)。runtime キャッシュ・pooling 等は N/A

## 適用される性能面: 検証パイプラインへの寄与

- 新章2ファイル(21-telemetry-schema.md / .ja.md)は静的 markdown — CI への追加コストは docs 検査系テスト(t174 等)の走査対象+2ファイルのみで、既存 docs 22ペアに対する定数増
- doc-consuming テストへの影響: 件数語を避けた count-free 記述(c3-adjacent-enum-numerals — 隣接列挙のない散文の件数語を作らない)により、スキーマ拡張時の doc 改稿頻度そのものを抑える(保守性能)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:44:22Z
- **Iteration:** 2
- **Scope decision:** none

iteration1のMajor2件(6面列挙のLog誤混入・出典のbusiness-logic-model誤帰属3箇所)とMinor1件を是正確認。FD正本テーブル準拠へ復元。

### Findings

- None
