# Performance Test Instructions — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## 対象 NFR と検証形(承認済み NFR へ trace する範囲のみ — bt-proportional-selection)

- **per-Project API 予算**(nfr-design/performance-design、BR-U2-7): 照会1+mutation≤2 / Project — 実時間負荷試験でなく FakeGateway history のカウンタ assert で決定的に検証(bt-timeout-verification-shape)
- **配布規模**(dist 生成時間・サイズ回帰): 既存 CI の Intent Mirror benchmark ジョブ(1)(2)(3)+aggregate を正とし、新設 workflow を作らない(ci-pipeline:c2)

## 実行方法

- カウンタ検証: `bun test tests/integration/t345-amadeus-mirror-project-reconcile.integration.test.ts`(history assert 内包)
- benchmark: PR の pull_request CI で自動実行(手動: gh workflow run 相当は不要 — PR 発行で走る)

## 回帰判定

benchmark aggregate ジョブの相対判定(median 基準 — c1-benchmark-baseline-correlation-verify 準拠)に従う。

## 実測

t345 green(168 pass 合算に包含、測定 ref 45a09c9a0)。PR #1593 CI で benchmark 3系統+aggregate = SUCCESS(2026-07-27)。
