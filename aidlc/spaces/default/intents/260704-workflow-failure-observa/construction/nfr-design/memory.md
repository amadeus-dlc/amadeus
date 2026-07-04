# NFR Design Memory

## Interpretations

- 2026-07-04T08:47:28Z — `nfr-design` は per-unit directive として `U001-failure-evidence-foundation` だけを対象にする。`gate:false` のため、U001 の成果物を作成して engine の次 directive を確認する。
- 2026-07-04T08:47:28Z — U001 は local CLI tooling の Unit であり、AWS infrastructure 設計ではなく、CLI 内 component、file-backed evidence、OpenTelemetry no-op default の設計として扱う。
- 2026-07-04T08:50:20Z — U002 は Subagent Status の Unit であり、classification、additive audit fields、old row compatibility を NFR Design の中心にする。
- 2026-07-04T08:52:57Z — U003 は Workflow Warning Traceability の Unit であり、non-mutating doctor、false-positive guard、Requirement evidence map、PR readiness checklist を NFR Design の中心にする。

## Deviations

- 2026-07-04T08:47:28Z — U001 の NFR Design は上流の NFR 要求と functional design で十分に確定しているため、追加質問は作成しない。
- 2026-07-04T08:50:20Z — U002 の NFR Design も上流の NFR 要求と functional design で十分に確定しているため、追加質問は作成しない。
- 2026-07-04T08:52:57Z — U003 の NFR Design も上流の NFR 要求と functional design で十分に確定しているため、追加質問は作成しない。

## Tradeoffs

- 2026-07-04T08:47:28Z — performance 対応は cache や cloud scaling ではなく、bounded read、summary aggregation、verbose detail 分離で扱う。これにより local deterministic verification と scope boundary を維持する。
- 2026-07-04T08:50:20Z — outcome は success、failure、unknown の 3 状態に閉じる。これにより downstream analysis の分岐増加と free text 推測を避ける。
- 2026-07-04T08:52:57Z — PR readiness は required item と scope-out item を分ける。これにより collector、dashboard、cloud infrastructure、direct `skills/` edits を暗黙 required にしない。

## Open questions

- 2026-07-04T08:47:28Z — 実装時に採用する OpenTelemetry package の最終組み合わせは Code Generation で package manifest と既存検証入口を確認して確定する。
