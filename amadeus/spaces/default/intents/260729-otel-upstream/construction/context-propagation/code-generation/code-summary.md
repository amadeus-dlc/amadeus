# Code Summary — U5: context-propagation

上流入力: unit の functional-design / nfr 成果物（全数参照済み）。

## Files created

- `packages/framework/core/otel/context.ts`（本番化）: schemaVersion 付き persist/restore、BR-6 mint-on-missing restore（legacy fallback）、fail-open diagnostics、attachRemoteParentFromEnv
- `tests/integration/t-otel-context-propagation.test.ts`（14 tests）＋ helpers（otel-trace-chain-child / otel-restore-child）

## Files modified

- `packages/framework/core/otel/tracer-provider.ts` — remote-parent fallback
- `packages/framework/core/tools/amadeus-observability.ts` — attachProcessTraceContext seam（async＋lazy dynamic import、fail-open）
- `packages/framework/core/hooks/amadeus-runtime-compile.ts`／`amadeus-sensor-fire.ts` — attach await＋lazy childEnv
- `packages/framework/core/tools/amadeus-sensor.ts` — handleFire async 化（attach await）＋ prepareSensorChildEnv（依存注入 seam）＋ runCliIfMain
- `packages/framework/core/tools/amadeus-log.ts`・`hooks/amadeus-session-end.ts` — signature 更新

## Key implementation decisions

- carrier は trace 相関 ID のみ（BR-4）。抽出失敗は fail-open＋diagnostic Log（BR-5）
- subagent 接続は deterministic spawn site が存在しないため record restore 経由（deviation として記録）
- lazy-load 機構で選択的 fixture tree（otel/ 不在）の module 解決を fail-open に
- prepareSensorChildEnv は依存注入で ordering・fail-open を決定的にテスト可能に

## Test coverage summary

- 全体スイート RESULT: PASS。patch coverage gate PASS（measured 120, covered 118, allowlisted 2, uncovered 0）。typecheck・lint・drift 全 green
- 3-level trace chain・cross-process restore・Promise.all 分離の実測を含む

## Deviations from the plan

- TDD repair として実施（違反3範囲を別 repair branch で 1 slice ずつ Red→Green で修正し landing。元 branch は backup 保全）