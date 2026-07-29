# Business Logic Model — U8: legacy-writer-removal

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

本 Unit は新規ランタイム API を追加しない。ロジックの中心は「削除ゲートの機械検証」と「条件達成後の削除手続き」であり、実現先は CI／テスト基盤（`components.md` § 検証・移行ゲート要件の実現先どおり、FR-MIG-4 は CI ゲート検証、FR-MIG-5 は retention 条件の機械判定）。

## 削除ゲート

（注: 条件 (d)(e) の評価は U11（otlp-relay）の shadow report・Relay 非生成証明の成果物が存在してから行う。これは依存のトポロジ記述であり実装順序の指定ではない）評価フロー（FR-MIG-4）

1. 六条件それぞれに独立した判定器（checker）を持ち、各 checker は `ConditionResult { condition, verdict, evidence, detail }` を返す
2. ゲート評価器が六つの `ConditionResult` を集約し、機械可読な `GateEvaluationReport`（JSON）を生成する
3. 全条件が PASS のときのみ report の `overall = "GREEN"`。1 件でも FAIL／UNKNOWN があれば `overall = "BLOCKED"` で、削除手続きは開始しない
4. report は CI artifact として残し、削除 commit から参照可能にする

各条件の判定入力:

| 条件 | 判定器 | 入力 | 判定 |
|---|---|---|---|
| (a) mixed Journal 動作 | doctor/recovery/merge の実行テスト | v1/v2 mixed shard fixture（U3/U6 の成果物） | 全対象ツールが v1/v2 mixed Journal で通ること |
| (b) registry 完備 | registry 照合（VER-1 系 drift guard） | `event-registry.ts` の 78 語彙と canonical 分類集合 | 全 canonical event が registry 登録済みであること |
| (c) call site ゼロ | call-site guard（VER-4） | 全ソース木の静的検査結果 | `appendAuditEntry()` 直接呼出し・旧 observe 利用の残存がゼロであること |
| (d) shadow 比較同等 | shadow 比較 report 検査（VER-5） | 新旧 shadow 比較の機械可読 report | event count・linkage・status・許可属性が同等以上で未説明差分なし |
| (e) Relay 非生成証明 | Relay テスト証明 | `relay.ts` のテスト群（FR-RLY-2） | Relay が Journal から Span を生成していないことのテストが存在し通過すること |
| (f) distribution guards | distribution drift guards（VER-6） | `bun scripts/package.ts --check` 等の生成面検証 | 全 harness の drift guards が通過すること |

## 旧 writer 削除フロー（FR-MIG-2 削除部分）

前提: `unit-of-work.md` U8 どおり U7（callsite-migration）完了後に本 Unit が走る。削除対象は `migration-adapter.ts` の旧 `appendAuditEntry()` 互換層と旧 writer 実装であり、公開互換方針（FR-MIG-3）は Phase 4 ADR の管轄として本 Unit では決定しない。

1. 削除ゲート評価を実行し `overall = "GREEN"` を確認する（評価失敗時はここで中断）
2. 変換前 backup を確保する（rollback 手段は git revert＋backup のみ。FR-MIG-2）
3. 旧 writer（`appendAuditEntry()` 本体・旧 direct write 経路）を削除する
4. 削除後検証として、canonical 経路（`emitEvent` → AuditLogExporter）のテストと削除ゲート評価を再実行し、GREEN を維持することを確認する
5. rollback 判定: 削除後検証が FAIL なら git revert で復元し、ゲート条件の再検証を行う

## v1 reader 削除フロー（FR-MIG-5）

1. retention 判定器が既存 Intent の retention 条件を機械判定する（人手判断でスキップしない）
2. retention 達成が確認された Intent 集合について、v1 schema record を参照する経路が残っていないことを共通 reader の利用箇所検査で確認する
3. 上記を満たした場合のみ v1 reader を削除し、reader を v2-only にする。FR-JRN-4 の完了条件（v1 reader 削除後も v2-only で動作）の検証テストを通す

## テスト先行の検証フロー

`team-practices.md` ## Testing Posture（同一コミット red-green）と #1678 のテスト先行順序に従い、各判定器は判定ロジック本体より先に失敗するテストを書く。特に (a)(d)(e) は「条件が未達の状態で FAIL し、達成状態で PASS する」ことを fixture 差替えで確認してからゲート評価器に組み込む。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage/API/contracts clean; two MINOR internal-consistency defects (DeletionCandidate lifecycle contradiction; undeclared U11 input dependency).

### Findings

- MINOR domain-entities.md: DeletionCandidate declared BLOCKED→ELIGIBLE→REMOVED but v1-reader candidate declared RETAINED→ELIGIBLE→REMOVED — unify the pre-ELIGIBLE state or split per target
- MINOR business-logic-model.md/domain-entities.md: gate consumes U11 outputs (VER-5 reports, relay test proofs) but U8's declared dependency is U7 only — add a topology-neutral note that (d)(e) evaluation defers until U11 outputs exist, or route a U8→U11 edge back to units-generation

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:48:03Z
- **Iteration:** 2
- **Scope decision:** none

READY: both iteration-1 findings verified fixed (unified DeletionCandidate lifecycle PENDING→ELIGIBLE→REMOVED; topology-neutral U11 note); iteration-1 passing criteria re-verified clean.

### Findings

- None
