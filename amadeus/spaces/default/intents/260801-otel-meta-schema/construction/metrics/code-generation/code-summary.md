# Code Summary — U5 metrics(Bolt 2c)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan の経過どおり、E-OMSB2C-DEV 裁定6件の承認範囲内。

## 着地

- **PR [#1910](https://github.com/amadeus-dlc/amadeus/pull/1910) — MERGED**(スカッシュ)。#1905/#1907 着地後の redaction.ts safeKeys 実競合は conductor が union 解消(SPAN_CONTEXT+INSTRUMENT 両 spread 共存)+dist 再生成+full CI PASS で閉包

## 変更面(正本)

- 新設: `otel/metrics-vocabulary.ts`(INSTRUMENTS 5計器の唯一の正本・leaf)、`otel/metrics-instruments.ts`(5計測点 — no-op/fail-open/cardinality throw の3規律)
- 改修: `otel/bootstrap.ts`(ensureMeterBootstrap+setTokenUsageSink)、`otel/logger-provider.ts`(append 成功後 observer)、`otel/meter-provider.ts`(projectDir+registeredMeterProjectDir)、`otel/resource-suppliers.ts`(sink 注入で supplyTokenUsage 解消)、`otel/redaction.ts`(INSTRUMENT_ATTRIBUTE_KEYS)
- 跨プロセス duration: pending-<kind>-<key>.start マーカー(Relay 非一致テスト固定)
- tests: t398(unit 11)+t399(integration 29)。dist 7ハーネス+self-install 同期

## 検証実測

- typecheck / lint / run-tests --ci(726 files PASS)/ dist:check / promote:self:check / complexity / coverage-registry = 全 exit 0。patch coverage 196/196 uncovered 0。project 89.42%
- **E-OMSB1-DEV 留保充足**: 実 SessionStart hook(dist copy)の子プロセス実行で store 行 resource に session.id 実測+supply 行削除で t399 赤(既存 t-otel-resource は 15 pass のまま = 盲点の実測再現)。落ちる実証ほか4件も除去→赤→復元
- 独立 PR レビュー: 初回 REVISE(base 古さのみ)→ 増分再確認で READY。referee check converged / tampered=false

## 未検証面 / フォローアップ

- stale marker 回収+Relay 非一致テストの selector 駆動化 = #1909
- subagent.duration の production 発火は U4(SUBAGENT_STARTED 登録)着地時に成立(observer 配線済み)
