# Scope Definition Memory

## Interpretations

- 2026-07-04T01:11:54Z — `scope-definition` は 4 Issue の実装有無ではなく、MVP 境界、prioritized backlog、traceability を確定する stage として扱う。実装の詳細は Inception 以降で落とし込む。
- 2026-07-04T01:22:31Z — OpenTelemetry は optional extension ではなく core observability layer として扱う。外部 collector、dashboard、常時ネットワーク送信は core ではなく、no-op default と環境変数有効化を境界にする。
- 2026-07-04T01:27:13Z — OpenTelemetry の計装部分は、この Intent の core scope として扱う。collector や dashboard は optional だが、command span、error span、directive/report span、doctor metrics は今回の失敗可観測性全体に跨る基盤とする。

## Deviations

- 2026-07-04T01:11:54Z — `aidlc/spaces/default/memory/phases/ideation.md` は directive の rules_in_context に含まれるが、現在の workspace には存在しない。`org.md`、`team.md`、`project.md` と上流成果物で stage 実行に必要な判断材料が揃っているため、欠落は非ブロッキングとして扱う。

## Tradeoffs

- 2026-07-04T01:11:54Z — OpenTelemetry は分析価値があるが、現 MVP では deterministic な audit、doctor、test evidence を優先する。collector、exporter、環境変数、依存追加は後続 Intent の scope として分ける。
- 2026-07-04T01:11:54Z — `skills/` は配布物境界として扱い、直接編集を主経路にしない。source skill、昇格先 skill、host harness、Intent 成果物の境界を維持する。
- 2026-07-04T01:22:31Z — Feasibility の optional extension 判断は、Scope Definition の追加判断で見直す。audit と doctor は deterministic evidence、OpenTelemetry は分析用 telemetry plane として両立させる。
- 2026-07-04T01:33:45Z — Scope Definition の生成後検証で Amadeus validator は pass した。gate 承認の代替ではなく、成果物構造が最低限整合している証拠として扱う。

## Open questions

- 2026-07-04T01:11:54Z — Scope Definition の回答で、4 Issue をすべて MVP に含めるか、#435 を設計判断だけに留めるかを確認する。
- 2026-07-04T01:22:31Z — OpenTelemetry core scope の境界を、no-op default と環境変数有効化までに留めるか、collector と dashboard まで含めるかを確認する。
