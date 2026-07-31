# Business Logic Model — U1: otel-walking-skeleton

上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`（すべて参照済み）

## 処理シーケンス

### 起動（短命 process 共通）

1. CLI/hook のエントリが `otel/` の bootstrap を呼ぶ
2. RedactionPolicy・EventRegistry（U1 では最小集合）・FatalLatch を構築
3. `registerTracerProvider()` → LocalSpanExporter 配線、`registerLoggerProvider()` → AuditLogExporter＋LocalLogExporter 配線、Meter Provider（最小）
4. Intent Context の復元を試行（`restoreIntentContext()`）。存在すれば remote parent として接続（FR-TRC-4）

### canonical Event 発行（代表: `amadeus-log.ts` の decision/answer）

1. 呼出し側が `emitEvent(name, attrs)` を呼ぶ（FR-EVT-2）
2. Logger Provider が Registry で event 定義を引き当て（U1 では代表 event のみ。全語彙は U2）
3. active Context の trace/span ID を record に付与
4. AuditLogExporter が lock 取得 → sequence 採番 → 同期 append → idempotency 記録（FR-JRN-3、現行と同構造で NFR-1 を満たす）
5. 失敗時: 同期例外を送出し FatalLatch を set（FR-EVT-3）

### 状態遷移のガード

1. canonical state mutation entrypoint は処理前に `assertMutationAllowed()` を呼ぶ（FR-EVT-4）
2. latch set 済みなら例外で拒否。中間層が emit 例外を catch しても latch は残る
3. 新 process では Journal health 検証（非破壊 probe、FR-EVT-5）成功後にのみ mutation を許可

### Span（duration operation）

1. 代表 subprocess（session-end → projector 起動）を `startActiveSpan()` で包む
2. 子 process へ W3C Context を env 注入（`injectToSubprocess()`、FR-TRC-5 の最小形）
3. callback は自動終了しないため `finally { span.end(); }`（FR-TRC-2）
4. `span.end()` で LocalSpanExporter が Completed Span Store へ同期保存（fail-open）

### 終了

1. 短命 process は network flush なしで即時終了できる（NFR-2）
2. diagnostic Log／Span Store の失敗は workflow を止めない（FR-EVT-6）

## Logs API 採否の検証フロー（Q2-A）

1. `@opentelemetry/api-logs` で最小 emit 経路を spike 実装
2. 検証: Bun での動作、bundle 取り込み、API 形状（eventName・attributes・Context 付与）が canonical 契約を表現できるか
3. 不成立または不適 → 最小 EventRecord Interface（独自）に切替。判定は Phase 1 ADR として `decisions.md` に追記

## Context 維持・分離の検証フロー（FR-TRC-3）

1. 代表 CLI process 内で親 span を開始し、await・Promise.all・timer コールバック・例外送出の各境界で子処理を実行する
2. 各境界で `currentIntentContext()`（active Context の trace/span ID）を採取し、親との相関と兄弟並行間の分離を検証する
3. 検証はテスト先行順序の2番目（Context 維持・分離テスト）として実装に先行して書く（VER-3）

## 計測

- sync append の cold／warm 時間を計測し、現行 `appendAuditEntry` と比較（NFR-1 の数値予算の入力）
- bundle size と API singleton の一意性を検証（NFR-3）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:11:25Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: failure contract/entities/dependency direction coherent, but FR-TRC-3 and FR-DST-2 uncovered; FR-EXP-6 only implicit.

### Findings

- MAJOR business-rules.md/business-logic-model.md: FR-TRC-3 (Context maintained/isolated across async/Promise concurrency) has no covering rule or flow — add a BR stating the invariant across await/Promise.all/timer/callback/exception boundaries plus a verification flow
- MAJOR all three artifacts: FR-DST-2's U1-owned portion (harness manifest otel/ mapping) unmentioned — add a rule covering the manifest mapping and package/promote regeneration + drift-guard step
- MINOR business-rules.md: FR-EXP-6 (no standard NodeSDK/BatchSpanProcessor/standard OTLP Exporter) only implicit via BR-6 — add an explicit invariant

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:14:32Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 3 iteration-1 findings verified fixed (BR-8b + Context verification flow, BR-14 配布 section, BR-8c explicit invariant); iteration-1 passing criteria re-verified with no regressions.

### Findings

- None
