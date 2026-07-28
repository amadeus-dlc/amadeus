# Performance Requirements — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

U5 はドキュメント・配布同期・検収のユニットであり、ランタイム性能要件を持たない。性能面の規定は検証コマンド群の実行が既存 CI 枠内で完結することのみ。

## 検証実行のコスト

- 検収フロー(business-logic-model — typecheck / lint / tests / coverage)は既存の検証コマンド群(requirements FR-12a のテスト既習様式が走る既存4層ランナー — technology-stack: tests/run-tests.sh)をそのまま実行する。U5 が新しい長時間ジョブ・ベンチマークを追加しない。
- dist 再生成(business-rules BR-U5-3 の7ハーネス+self-install)は既存 `bun scripts/package.ts` / `bun run promote:self` の機械的実行 — 生成時間の新たな要件は置かない。

## 非目標(非適用の明示)

- ランタイム性能要件: N/A — U5 は実行コードを追加しない(business-logic-model 冒頭: 「コードの新規ロジックは持たず」)。診断・同期の性能要件は U1〜U4 の各 NFR が所有し、U5 はその検収(business-rules BR-U5-6 — 完備確認であり作成ではない)のみを担う。
- レスポンスタイム SLO・スループット目標: N/A(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:observability-setup:c3 の N/A 規律)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T09:25:35Z
- **Iteration:** 1
- **Scope decision:** none

requirements・BR-U5-1〜8・business-logic-model の引用は全て file:line/番号一致で実測確認、責務境界の越境なし、consumes 4件は全成果物で実参照。

### Findings

- None
