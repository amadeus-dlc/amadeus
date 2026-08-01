# Discovered Rules — 260729-otel-upstream

上流入力（consumes 全数）: `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`（参照済み）

## Mandated

- ALWAYS telemetry の export 境界（Local Exporter／OTLP Relay の送出点）でも redaction filter を通す — write-time のみの redaction に留めない（devsecops レーンの実測: 現行 `amadeus-otel-projector.ts` は buffer meta を verbatim で OTLP 属性へ展開。Q3 で追加承認）
- ALWAYS 依存追加は単一 bundle へ取り込み、追加理由を ADR に文書化する（既存 Forbidden の Bun-only 規則と対。feasibility Q3）

## Forbidden

- NEVER affirmed 済み CI 基準リストを現行 CI のブロッキング集合と乖離させたまま放置しない（Q2 — Testing Posture 文の更新で解消）
- NEVER audit／telemetry 系の変更で、auth/audit seam の不変条件テスト（audit-invariant・race・harness-drift）を省略しない（既存 affirmed の再確認）
