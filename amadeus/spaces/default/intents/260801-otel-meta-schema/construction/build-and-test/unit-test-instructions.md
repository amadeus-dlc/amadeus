# Unit Test Instructions — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)、nfr-design 各 unit の検証形(counter assert / fail-open 経路)— unit 層の対象は純関数(実 FS 非接触)に限る(fs-tests-integration-first)。

## 実行

- 全体: `bun test tests/unit/`(run-tests.sh --ci に包含)
- 本 intent の新設 unit テスト: t-otel-resource-suppliers(閉集合/二重設定 throw)、t-otel-span-context(閉語彙8キー・memo・縮退)、t-otel-stacktrace-redaction(path マスク3分類・冪等・線形性)、t-subagent-purpose(1行/200字/scrub)、t-subagent-lifetime(突合5面+incomplete 検知)、t398-otel-metrics-vocabulary(INSTRUMENTS 閉集合・cardinality)

## 判定

Red/Green は TDD 記録どおり(各 Bolt 報告)。エラー経路は lcov DA 到達実測(error-path-reach-lcov)。
