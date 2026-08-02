# Business Logic Model — U5 metrics

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U5 の責務は unit-of-work.md U5 行(按分150行: instruments 60+meter arm 20+bootstrap meter 部 15+計測点配線 55)から、API 形は component-methods.md の metrics-instruments 節から、FR 契約は requirements.md FR-MET-1〜4 から、価値は story-map 段5から、store 境界(metrics-*.jsonl、Relay 無改変)は services.md から導出した。

## bootstrap 配線(FR-MET-1)

ensureOtelBootstrap の logs arm と同列に meter arm を追加: observability opt-in 時のみ **`registerMeterProvider({ metricExporter: createLocalMetricExporter({ projectDir }) })`** — 実装済みシグネチャ(meter-provider.ts:112 `options: { metricExporter: LocalMetricExporter }`)どおり、exporter は呼び出し済みインスタンスを渡す(trace arm の bootstrap.ts:117 既習形に倣う)。現状 production 呼出しゼロ(codekb 実測)の初配線。resource は U1 の currentResource getter を record 組み立て側(local-metric-exporter)で受ける(DAG エッジ metrics→resource-core の根拠)。

## 計測ヘルパ(FR-MET-4)

recordStageDuration / recordGateIteration / recordOperationFailure / recordSubagentDuration / recordTokenUsage — 未登録判定は **`registeredMeterProjectDir()` を新設**(tracer/logger の `registeredXxxProjectDir()` 既習形との登録/確認ペア対称 — 現状 meter-provider には非 throw の登録確認 export が無く、getAmadeusMeter は未登録 throw :121-124)して行い、未登録なら no-op。各発火点(engine の STAGE_COMPLETED 処理・§12a イテレーション・operation.failed・subagent completed・SessionEnd hook)から呼ぶ薄いラッパ。emit と同一トランザクションにせず、計測 throw は握って emit 無傷(fail-open。計測失敗の diagnostics 1行は可)。

## token 供給(FR-MET-3)

supplyTokenUsage(U1 の suppliers モジュール所有)→ recordTokenUsage へ配線。claude harness の SessionEnd hook がトランスクリプト usage を読んで供給(取得不能ハーネスは未供給 = 計器沈黙)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:17:01Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major(registerMeterProvider 実シグネチャ不一致)+Minor(未登録判定機構の未指名)を是正確認し READY。INSTRUMENTS 閉集合の #1868 §6 1:1・cardinality 統制・fail-open 境界・DAG 整合・registry 非接触はすべて iteration 1 で検証済み。

### Findings

- None
