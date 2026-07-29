# Memory — code-generation / U1: otel-walking-skeleton

## Interpretations

- 2026-07-29T10:20:00Z — user-stories (2.4) は scope SKIP のため、plan の traceability は FR/NFR/VER/BR ID へ写像した。stage 文の「captured intent へ写像」fallback は intent-only scope（chore 等）向けと解釈。本 scope は完全な requirements を持つため要件 ID への写像が tracer の趣旨に合う
- 2026-07-29T10:20:00Z — component-methods.md の `registerTracerProvider(options: { redaction })` は exporter 配線を省略した簡約と解釈し、実装は `{ redaction, spanExporter }` とした（components.md の「registerTracerProvider → LocalSpanExporter 配線」が正本）
- 2026-07-29T10:20:00Z — CanonicalEventRecord の trace/span IDs は in-memory record に保持し、v1 journal の行形状は変えない（byte-compatible）。journal への trace 相関の永続化は schema v2（U3）の領分で、reliability-requirements の「v1 reader 維持」を優先
- 2026-07-29T10:20:00Z — session-end hook の Span 接続は既存の `observability.enabled` opt-in にゲートした。U1 は skeleton で撤回可能性が hard gate の前提のため、telemetry の新経路を無条件有効化しない

## Deviations

- 2026-07-29T10:25:00Z — stage Step 4 は Task tool への delegation を規定するが、本 harness には Task tool がなく conductor が swarm worker を兼ねたため、同一 session で直接実装した（persona 注入なしの方針とも整合）
- 2026-07-29T10:25:00Z — 新規 unit test は dist ではなく source tree（packages/framework/core/otel/）を import した。red-green の反復速度優先。dist 面は t31（実 CLI spawn）・t30（hook）が regeneration 後にカバー

## Tradeoffs

- 2026-07-29T10:30:00Z — redaction は default-deny（allowlist）＋credential 値 pattern の最小形。span 属性が allowlist 外で落ちる損失を許容し、機微流出のリスクを優先排除（U4 が本番語彙を拡張する）
- 2026-07-29T10:30:00Z — NFR-1 計測の assert は緩い tripwire（50x）に留め、正式な数値予算は requirements.md どおり Phase 1 ADR の実測確定に委ねた。実測値は ADR-7 に記録済み（warm p95 で現行 3.97ms / 新 3.06ms と回帰なし）
- 2026-07-29T10:30:00Z — dist への bundle 配線（packager への bun build 組込み）は U1 の完了条件に含めず、単一 bundle 成立の実証（t-otel-bundle）＋ raw TS の manifest マッピングに留めた。user project での依存解決は bundle 配線完了までの既知の制約として ADR-7 に記録

## Open questions

- 2026-07-29T10:30:00Z — hard gate 評価（人間ゲート必須、bolt-plan Bolt 1）で NFR-1 の正式な数値予算を確定する必要がある。ADR-7 の実測値が入力
- 2026-07-29T10:30:00Z — `.amadeus-otel/` 配下の Store ファイルが shipped .gitignore の `amadeus/spaces/*/intents/*/.amadeus-*` glob で確実に除外されるかは build-and-test で確認する
