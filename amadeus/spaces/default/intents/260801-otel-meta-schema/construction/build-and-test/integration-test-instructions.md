# Integration Test Instructions — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)、nfr-design の検証形 — 実 FS・実 hook spawn を伴う検証は tests/integration/ に配置(fs-tests-integration-first)。

## 実行

- 全体: `bash tests/run-tests.sh --ci`(smoke+unit+integration)
- 本 intent の新設 integration: t-otel-resource(3シグナル同一 bag・二層 redaction・CI env・vcs 省略)、t-otel-span-attrs(JSONL 実文字列での8キー生存・scrub・merge 後勝ち)、t-otel-exception-attributes(type/stacktrace・fail-open 3分岐)、t399-otel-metrics-instruments(5計器・no-op・実 hook spawn での session.id ストア実測 = E-OMSB1-DEV 留保閉包)、t-log-subagent-start(実 hook spawn・3段ゲート・Purpose 統制)

## 判定

store 実文字列 assert を必須とする(span record 直読のみの green は本 intent で2度欠陥を素通りさせた実測があるため)。
