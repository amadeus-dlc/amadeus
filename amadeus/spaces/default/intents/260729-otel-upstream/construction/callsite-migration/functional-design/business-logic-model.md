# Business Logic Model — U7: callsite-migration

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 処理シーケンス

### 互換 Adapter の委譲経路（FR-MIG-1）

1. 旧 call site が `appendAuditEntry(eventType, fields, ...)` を呼ぶ（互換シグネチャ維持、`component-methods.md` migration-adapter.ts どおり）
2. Adapter は `event-registry.ts` の `getEventDef()` で legacy eventType を RegisteredEventName へ引き当てる
3. 引き当て成功: fields を registry の required attributes に整形し `emitEvent(name, attrs)` へ委譲。以後は通常の canonical 経路（Logger Provider → AuditLogExporter → audit JSONL、services.md 通信契約どおり）
4. 引き当て失敗（registry 未登録）: drift guard 違反として例外。silent fallback・旧 writer への迂回は行わない
5. 失敗契約は直接経路と同一: `emitEvent` の throw と fatal latch set を Adapter が握りつぶさない（FR-EVT-3/4 と整合）

### 段階移行ワークフロー（FR-MIG-2）

1. 移行対象の約1600 call site を静的スキャンで列挙し、batch に分割する
2. batch ごとに: 変換前 backup を取得 → 機械的書換え（`appendAuditEntry` 直呼出し → `emitEvent`／旧 `observe()` → Trace API Span）→ guard の allowlist から当該 site を除去
3. rollback は batch 単位で git revert＋変換前 backup の復元とする。部分適用のまま放置しない
4. 移行期間中は未変換 site が Adapter 経由で動作し続けるため、新旧混在でも canonical 経路は単一（恒久 dual-write ではない）

### call-site guard の検査フロー（VER-4）

1. CI の静的検査で `appendAuditEntry` 直接呼出しと旧 `observe()`／`observeSubprocess()` 利用を検出する
2. allowlist 外の検出は CI 拒否。allowlist 内の既存 site は移行完了まで許容する
3. allowlist の変更は縮小のみ許可する ratchet とし、追加を含む差分は CI 拒否
4. 残存 call site 一覧を可視化 report として常時出力し、ゼロ到達を削除ゲート（FR-MIG-4(c)、U8 所有）へ接続する

### shadow 比較ハーネス（FR-MIG-2・VER-5 連携）

本 Unit は U1（otel-walking-skeleton）の shadow 比較ハーネス原型を本番化する（新規自作はしない。unit-of-work.md の U1 責務「shadow 比較ハーネス原型」の引き継ぎ）。

1. 移行期間中、新旧経路の出力（event count・linkage・status・許可属性）を同一操作で採取する
2. 比較結果を機械可読 report として生成し、未説明差分を列挙する
3. report は削除ゲート FR-MIG-4(d) の入力として U8 へ引き渡す。本 Unit は harness と report 生成までを責務とし、ゲート判定は行わない

## 検証フロー（テスト先行）

1. Adapter 委譲テスト（red）: legacy eventType → registry 引き当て → emit されること、未登録 eventType が例外になることを先に固定
2. guard テスト（red）: allowlist 外の直接呼出し・旧 observe 利用が CI 検査で検出されること、ratchet が追加差分を拒否することを固定
3. shadow 比較テスト（red）: 機械可読 report が差分を未説明として列挙できることを固定
4. 各 batch の書換えはテスト同一コミットの red-green で実施し、変換後に残存 site 数の単調減少を確認する

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: passes on coverage/interfaces/contracts/coherence; one MINOR — shadow-comparison harness's relationship to U1 prototype unstated (cross-unit handoff assumption).

### Findings

- MINOR business-logic-model.md/domain-entities.md: shadow harness relationship to U1's prototype unstated — state that U7 productionizes the U1 walking-skeleton prototype harness (no new build from scratch)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:48:03Z
- **Iteration:** 2
- **Scope decision:** none

NOT-READY: claimed fix absent at review time — no U1/prototype statement outside the Review block; iteration-1 passing criteria re-verified clean. (Builder applied the one-line fix after this review; iterations exhausted at 2/2.)

### Findings

- MINOR business-logic-model.md shadow 比較ハーネス section: U7 productionizes U1's walking-skeleton prototype harness — statement was absent at review time; builder applied the fix after iteration 2 (iterations exhausted)
