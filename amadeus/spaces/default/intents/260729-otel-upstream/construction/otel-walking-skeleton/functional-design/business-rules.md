# Business Rules — U1: otel-walking-skeleton

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（参照済み）

## 不変条件

- BR-1: TypeScript ロジックは OTel API ファミリー以外のイベント発行 Interface を呼ばない（skeleton では代表接続のみ。`appendAuditEntry()` 直接呼出しは代表対象の差替え後に禁止）
- BR-2: canonical Event の emit 完了時、当該 record が audit JSONL から読める（FR-JRN-3）
- BR-3: canonical Event の書込失敗は必ず同期例外＋fatal latch set の両方が発生する（FR-EVT-3）。例外のみ・latch のみの経路は存在しない
- BR-4: latch set 後の同一 process 内の canonical mutation は全 entrypoint で拒否される。中間層の catch では latch は解除されない（FR-EVT-4）
- BR-5: diagnostic Log／Span／Metric の失敗は fail-open（例外を投げず、latch を set せず、workflow を止めない）（FR-EVT-6）
- BR-6: 短命 process は network flush・batch delay・Collector availability に依存しない（NFR-2）
- BR-7: `startActiveSpan()` の callback は自動終了しない。呼出し側は必ず `finally { span.end(); }` する（FR-TRC-2）
- BR-8: redaction filter は write-time と export 境界の二層で適用される（FR-DST-3）
- BR-8b: Context は await・Promise.all・timer・callback・例外境界を越えて維持され、かつ並行実行間で分離される（FR-TRC-3）。子 span が親の Context を参照し、兄弟並行の span が互いの Context を汚染しない
- BR-8c: 標準 NodeSDK／BatchSpanProcessor／標準 OTLP Exporter を短命 process へ導入しない（FR-EXP-6）。採用するのは OTel API・Context・data model と Amadeus 固有 Provider のみ

## バリデーション規則

- BR-9: canonical Event の attrs は Registry の required attributes を満たすこと（U1 では代表 event のみ検証。全語彙は U2）
- BR-10: 機微情報（prompt・argv・credential・無許可パス）を attrs に含めない（redaction policy、FR-DST-4/5 の最小形）

## 条件付き振る舞い

- BR-11: `@opentelemetry/api-logs` の spike が不成立・不適の場合、最小 EventRecord Interface（独自）へ切り替える。切替の判定基準と結果は Phase 1 ADR に記録する（Q2-A）
- BR-12: `@opentelemetry/context-async-hooks` が Bun で不成立の場合、Amadeus Context Adapter を実装する（撤回条件ではない、feasibility F-2）
- BR-13: hard gate 不合格（Provider・Logs API・Bun Context・同期 I/O・bundle のいずれかが許容不能）の場合、本番正本への変更を波及させず撤回する（approval-handoff AH-4）

## 配布（FR-DST-2）

- BR-14: `packages/framework/core/otel/` の全ファイルを各 harness の manifest マッピングに追加し、`bun scripts/package.ts` で全生成面（dist・self-install）を再生成する。distribution drift guards（`package.ts --check`・`promote:self:check`）の通過を本 Unit の完了条件に含める

## 代表接続の範囲（Q1-A）

- CLI: `amadeus-log.ts`（decision/answer の2イベントを emitEvent 経由に差替え）
- hook: `amadeus-session-end.ts`（短命 process での起動・終了の検証）
- subprocess: session-end からの projector 起動（Span＋Context inject の検証）
- 上記以外の本番 call site は変更しない
