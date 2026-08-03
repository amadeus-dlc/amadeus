# Performance Design — execution-observability-baseline

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Hot Path

`ExecutionLifecycleCoordinator`は1 lock内でaudit fold、idempotency lookup、ID mint、event batch appendを行う。`ClockPort`はmonotonic／wallを分離し、計算はfinish時の1回だけ。state/runtime projectionは同じevent setを1 passで処理し、OTelはlock外のbest-effort sinkとする。

## Baseline Runner

`BaselineBenchmarkRunner`がworkload digestとenvironment snapshotを固定し、warmup 3回／測定20回を実行する。`BaselineManifestProjector`はJSONLをstreamし、median／p95、attempt数、quality、terminationを集約する。invalid runは比較集合へ入れない。
