# Business Rules — U8: legacy-writer-removal

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: 旧 writer（`appendAuditEntry()` 本体と旧 direct write 経路）は削除ゲート六条件 (a)–(f) がすべて PASS で `GateEvaluationReport.overall = "GREEN"` になるまで削除しない。条件の一部だけを満たす段階的削除は認めない（FR-MIG-4）
- BR-2: 削除ゲートの判定は人手レビューではなく CI で機械検証する。各条件の判定結果は `ConditionResult` として機械可読 report に記録され、証跡のない GREEN 宣言は無効とみなす（FR-MIG-4、components.md § 検証・移行ゲート要件の実現先）
- BR-3: 削除の rollback 手段は git revert と変換前 backup に限定する。削除に際して恒久の dual-write／dual-read を残さない（FR-MIG-1/2 の移行期間限定原則と整合）
- BR-4: v1 reader は既存 Intent の retention 条件達成を機械判定で確認するまで削除しない。retention 未達の Intent が1件でも残る間は v1 reader を維持する（FR-MIG-5）
- BR-5: v1 reader 削除後、doctor／recovery／presence／grant／merge／runtime graph／learnings は共通 reader 経由で v2-only Journal 上に動作しなければならない（FR-JRN-4 の完了条件を本 Unit の出口不変条件として引き継ぐ）

## 条件付き振る舞い

- BR-6: ゲート条件 (a) は v1/v2 mixed Journal で doctor/recovery/merge が通ることを要求する。mixed fixture 上で1ツールでも失敗すれば条件 (a) は FAIL で、他条件の結果に関わらず削除は BLOCKED（FR-MIG-4）
- BR-7: ゲート条件 (b) は全 canonical event が registry 登録済みであることを要求する。registry 未登録の canonical eventType が検出された場合は FAIL（FR-MIG-4、VER-1）
- BR-8: ゲート条件 (c) は直接 call site ゼロを要求する。call-site guard（VER-4）が残存を可視化した時点で1件でもあれば FAIL（FR-MIG-4、FR-MIG-2）
- BR-9: ゲート条件 (d) は新旧 shadow 比較 report において event count・linkage・status・許可属性が同等以上であり、未説明差分がないことを要求する。新側が旧側より劣る指標が1つでもあれば FAIL。「同等以上」は劣化なし＋改善許容と解釈する（FR-MIG-4、VER-5）
- BR-10: ゲート条件 (e) は Relay が Journal から Span を生成していないことのテスト証明を要求する。テストの不在・失敗・対象経路の検出はいずれも FAIL（FR-MIG-4、FR-RLY-2）
- BR-11: ゲート条件 (f) は全 harness の distribution drift guards 通過を要求する。生成面と正本の乖離が検出された場合は FAIL（FR-MIG-4、VER-6）
- BR-12: 条件判定が実行不能（fixture 欠損・report 未到達等）の場合、その条件の verdict は PASS ではなく UNKNOWN とし、`overall = "BLOCKED"` とする。判定不能を成功扱いしない（FR-MIG-4）
- BR-13: 削除後検証（canonical 経路テスト＋ゲート再評価）が FAIL した場合は git revert で復元し、fail となった条件を再検証するまで再削除を試みない（FR-MIG-2）
- BR-14: audit CLI append verbs（互換 Adapter として一時維持中の面、FR-MIG-3）の処置は本 Unit では決定せず、Phase 4 ADR の決定に委ねる。ゲート評価・writer 削除の判定に混ぜない

## 検証ルール

- BR-15: 各ゲート判定器は判定ロジック本体に先行してテストを書き、同一コミットで red-green とする（team-practices.md ## Testing Posture、#1678 テスト先行順序）。特に (a)(d)(e) は fixture 差替えで FAIL→PASS の両状態を確認する
- BR-16: `GateEvaluationReport` は CI artifact として永続化し、削除 commit から参照可能でなければならない（FR-MIG-4 の機械可読 report 要求）
