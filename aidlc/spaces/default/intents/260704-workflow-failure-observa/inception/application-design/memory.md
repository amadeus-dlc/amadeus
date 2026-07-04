# Application Design Memory

## Interpretations

- 2026-07-04T05:21:54Z — Application Design は service 配備設計ではなく、modular CLI/tooling architecture として扱う。requirements と team-practices は `.agents/aidlc/tools`、local audit/state artifacts、no-op OpenTelemetry core 計装を対象にしており、collector/dashboard 配備は対象外である。

## Deviations

- 2026-07-04T05:25:00Z — 質問文に英語が混じりすぎていたため、application-design-questions.md を日本語中心の表現に書き換えた。code identifier と固定 protocol term は English のまま残し、説明文は日本語で書く。
- 2026-07-04T05:54:53Z — Architecture Review iteration 1 の NOT-READY 指摘を受け、Verification Traceability を evidence の read-only consumer に修正した。Error Audit と Subagent Status から Verification Traceability への依存を削除し、component、method group、logical service、ADR の対応表を追加した。

## Tradeoffs

- 2026-07-04T05:43:28Z — Application Design は deployable service ではなく modular CLI/tooling architecture として生成した。選択済み回答に合わせ、collector、dashboard、cloud infrastructure、always-on export は対象外にした。

## Open questions
