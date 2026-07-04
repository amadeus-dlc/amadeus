# Infrastructure Design Memory

## Interpretations

- 2026-07-04T08:59:16Z — U001 は cloud workload ではなく `.agents/aidlc/tools` の CLI 内基盤として扱う。`services` と `components` が deployable service を追加しないと定義しているためである。
- 2026-07-04T09:01:44Z — U002 は hook payload と audit row の基盤設計として扱う。`business-logic-model` が trusted status source、additive field、old row compatibility を処理中心にしているためである。
- 2026-07-04T09:03:55Z — U003 は deployment infrastructure ではなく read-only diagnostic infrastructure として扱う。`business-logic-model` が state、audit、実行時 graph、stage artifacts を snapshot 化して warning と checklist へ変換するためである。

## Deviations

- 2026-07-04T08:59:16Z — U001 では IaC、AWS runtime infrastructure、collector、dashboard を作成しない。`security-design` と `components` が core 計装と外部可観測性基盤を分離しているためである。
- 2026-07-04T09:01:44Z — U002 では database、queue、service discovery を作成しない。subagent outcome は既存 audit shard の additive field と reader normalization で扱えるためである。
- 2026-07-04T09:03:55Z — U003 では CI 実行、state mutation、external dashboard を作成しない。PR readiness は証拠を集約する責務であり、検証実行そのものではないためである。

## Tradeoffs

- 2026-07-04T08:59:16Z — OpenTelemetry は no-op default と test exporter seam を core にし、collector と dashboard は後続拡張へ分ける。これにより stdout JSON 契約と network no-send 検証を先に固定できる。
- 2026-07-04T09:01:44Z — `tool_input.status` と free text を分類 source にしない。false positive の減少より、unknown として evidence gap を表面化することを優先する。
- 2026-07-04T09:03:55Z — U003 の missing evidence は pass ではなく warning とする。PR readiness を偽装せず、Maintainer が不足証拠を確認できるためである。

## Open questions

- 2026-07-04T08:59:16Z — U001 では未解決の質問はない。外部 telemetry export を扱う場合は別 Intent または後続 Unit で判断する。
- 2026-07-04T09:01:44Z — U002 では未解決の質問はない。trusted status field の schema 改善が必要になった場合は別 task として扱う。
- 2026-07-04T09:03:55Z — U003 では未解決の質問はない。PR 作成時に実検証結果を checklist evidence として埋める。
