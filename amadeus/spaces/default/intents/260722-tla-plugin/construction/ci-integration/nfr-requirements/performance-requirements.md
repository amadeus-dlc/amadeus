# Performance Requirements — U4 ci-integration

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## CI 時間予算

- formal jobは`timeout-minutes: 30`でfail-closed停止する。
- push/pull_requestではformal jobをjob-level skipし、通常CI所要時間を増加させない。
- workflow_dispatch実測でTLC完走時間、image取得、jar取得、全job終了時間を記録する。

## 資源

- ubuntu hosted runner 1台、Docker container 1個、単一model runに限定する。
- out artifactはTLC stream上限16MBとmanifest/receiptを保存できる容量に収める。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:15:32Z
- **Iteration:** 1
- **Scope decision:** none

dispatch隔離と供給網固定は妥当ですが、Bun準備と失敗時artifact契約が不足しています。

### Findings

- Critical: 独立jobにBun setupがない。
- Major: failure後artifact uploadのalways条件がない。
- Major: formal job内の必須artifact検証がない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:21:06Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の3件は閉包しましたが、新規導入する Bun setup Action の供給網固定に1件の改善が必要です。

### Findings

- Closed — Critical: 独立job向けの Bun 1.3.13 setup、runtime receipt、実行順序が追加され、runner上のruntime欠落は解消されました。
- Closed — Major: if: always() upload、検証exitの保持、upload後の同一exit再送出、bootstrap失敗証跡が追加されました。
- Closed — Major: 最終verifyがmanifest、EnvReceipt、stdout、stderrの実在・非空・共通runIdを検証し、artifact欠落時にjobを失敗させる契約が追加されました。
- Major — oven-sh/setup-bun@v2 は可変tagです。検証済みcommit SHAへ固定し、人間可読な版コメントを併記する必要があります。
- Validation: stage宣言sensorはauthoritative scope内に実行コマンドまたは結果がないため未実行です。
