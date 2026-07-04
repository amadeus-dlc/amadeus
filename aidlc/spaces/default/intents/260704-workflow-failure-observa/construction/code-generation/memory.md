# Code Generation Memory

## Interpretations

- 2026-07-04T09:11:06Z — U001 の Code Generation は実装コードを record dir へ置かず、workspace root の `.agents/aidlc/tools` と `dev-scripts/evals` を対象にする。
- 2026-07-04T09:11:06Z — `.agents/aidlc/tools` は `tsconfig.json` の include だけでは直接網羅されないため、U001 専用の deterministic eval を追加して実行時の CLI behavior を検証する。

## Deviations

- 2026-07-04T09:11:06Z — stage 定義は subagent mode だが、この環境の sub-agent tool はユーザーが明示的に委任を求めた場合だけ使えるため、主作業はローカルに行う。

## Tradeoffs

- 2026-07-04T09:11:06Z — OpenTelemetry collector と dashboard は実装計画に入れない。core 計装、no-op default、test exporter seam を先に固定することで、stdout JSON と外部非送信の境界を守る。
- 2026-07-04T09:43:00Z — `@opentelemetry/api` を runtime dependency として追加した。SDK、collector、exporter は追加せず、OpenTelemetry API の no-op default と JSONL test sink で core 計装だけを固定した。

## Open questions

- 2026-07-04T09:43:00Z — OpenTelemetry package の扱いは、`@opentelemetry/api` だけを core dependency にする方針で解決した。
