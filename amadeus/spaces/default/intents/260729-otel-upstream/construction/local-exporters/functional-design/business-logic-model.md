# Business Logic Model — U4: local-exporters

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

U1 の最小 Exporter 実装を本番化（hardening）する Unit。受理集合は U2 の Registry で検証し、Journal 永続化は U3 の schema v2 codec を利用する。

## 処理シーケンス

### canonical Event の dispatch（FR-EVT-2）

1. 呼出し側（CLI/hook tool）が `emitEvent(name, attrs)` を呼ぶ
2. Logger Provider が Registry（U2）で `getEventDef(name)` により受理集合を検証。未登録名・required attributes 不足は拒否（例外）
3. write-time redaction（層1）を attrs へ適用後、active Context の trace/span ID を付与
4. Amadeus Logger Provider が AuditLogExporter へ**即時 dispatch**（Span 終了・batch timer・flush を待たない）
5. `exportCanonicalEvent(record)`: lock 取得 → sequence 採番 → U3 の v2 codec で encode → 同期 append → idempotency 記録（現行 `appendAuditEntry` と同構造）
6. export 境界 redaction（層2）を append 直前に適用（FR-DST-3）
7. 書込失敗時: 同期例外を送出し `setFatal(reason)` で latch set（FR-EVT-3 の hardened 契約）

### 完成 Span の保存（FR-EXP-3）

1. `span.end()` で LocalSpanExporter が完成済み Span を受け取る
2. IDs・name/kind・timestamps・status・attributes・events・links・resource・instrumentation scope を JSONL 1行へ serialize
3. machine-local Completed Span Store へ同期 append。失敗は fail-open（例外を投げない・latch を set しない）

### diagnostic Log の保存（FR-EXP-4）

1. `emitDiagnostic(name, attrs)` → Logger Provider が LocalLogExporter へ振り分け
2. diagnostic Log Store へ同期 append。fail-open
3. AuditLogExporter（audit JSONL）への混入経路は存在しない

### Metric の保存（FR-EXP-5）

1. Counter の `add()`／Histogram の `record()` が LocalMetricExporter の集計を更新
2. process 終了時（または明示 flush）に Metric Store へ出力。fail-open
3. Observable callback・任意 aggregation は受理しない（初期スコープ外）

## 検証フロー（test-first、#1678 の先行順序に準拠）

1. **Exporter 契約テスト（実装に先行）**: AuditLogExporter の同期 append 直後に reader から当該 record を観測できること（FR-JRN-3）、batch timer・OTLP flush が介在しないこと
2. **失敗契約テスト（hardening 後も維持）**: 書込失敗で同期例外＋latch set の両方が発生し、telemetry 系（Span/Log/Metric）の失敗は fail-open であること
3. **受理集合テスト**: Registry 未登録 event の dispatch 拒否、required attributes 不足の拒否（U2 との結合）
4. **redaction テスト**: 二層それぞれで機微情報（prompt・argv・credential・無許可パス）が Store に残らないこと。`command` 属性の argv 由来値にトークンが混入しないこと（FR-DST-4）、`redactionOptIn` の限定キーでも値スクラブが効くこと（FR-DST-5）
5. **credential-free ゲート（VER-2）**: audit JSONL・Span/Log/Metric Stores の全成果物を検査するスキャンをゲートとして配線し、本 Unit の完了条件に含める

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

READY: all 10 owned requirements covered, zero orphans; failure contracts, one-direction dependency, relay input exclusion consistent; BR-1..16 coherent.

### Findings

- None
