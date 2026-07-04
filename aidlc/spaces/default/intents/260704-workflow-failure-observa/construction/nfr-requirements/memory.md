# NFR Requirements Memory

## Interpretations

- 2026-07-04T08:23:18Z: `nfr-requirements` は per-unit directive として `U001-failure-evidence-foundation` だけを対象にする。`gate:false` のため、U001 の成果物を作成して engine へ completed を報告する。
- 2026-07-04T08:23:18Z: U001 は local CLI tooling の Unit であり、production web service の SLA ではなく、deterministic test で測れる CLI latency、stdout JSON、audit integrity、no-op telemetry、doctor resilience を NFR として扱う。
- 2026-07-04T08:23:18Z: `nfr-requirements` の U002 iteration では、Subagent Status の trustworthy status allowlist、old row compatibility、stdout JSON 非干渉を NFR の中心にする。
- 2026-07-04T08:32:02Z: `nfr-requirements` の U003 iteration では、workflow warning の非破壊性、false-positive guard、Requirement evidence map、PR readiness checklist を NFR の中心にする。

## Deviations

- 2026-07-04T08:23:18Z: U001 の NFR は上流の `business-logic-model`、`business-rules`、`requirements` で十分に確定しているため、追加質問は作成しない。
- 2026-07-04T08:23:18Z: U002 の NFR も上流の `business-logic-model`、`business-rules`、`requirements` で十分に確定しているため、追加質問は作成しない。
- 2026-07-04T08:32:02Z: U003 の NFR も上流の `business-logic-model`、`business-rules`、`requirements` で十分に確定しているため、追加質問は作成しない。

## Tradeoffs

- 2026-07-04T08:23:18Z: OpenTelemetry は core 計装として扱うが、collector、dashboard、cloud export を NFR target に含めない。これにより no-op default と deterministic verification を先に固定できる。
- 2026-07-04T08:32:02Z: doctor warning は自動修復ではなく actionable warning に限定する。これにより false positive が workflow state を破壊するリスクを避ける。

## Open questions

- 2026-07-04T08:23:18Z: 実装時に採用する OpenTelemetry package の最終組み合わせは Code Generation で package manifest と既存検証入口を確認して確定する。
