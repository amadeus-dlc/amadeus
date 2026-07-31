# Domain Entities — U8: legacy-writer-removal

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

本 Unit は CI／テスト基盤で扱う検証系エンティティのみを定義する（components.md § 検証・移行ゲート要件の実現先）。ランタイムの emit／export 系エンティティは U1–U7 の成果物をそのまま入力として消費し、再定義しない。

## ConditionResult

削除ゲートの単一条件の判定結果。六条件すべてがこの型で表現される（FR-MIG-4）。

| 属性 | 型 | 説明 |
|---|---|---|
| condition | "a" \| "b" \| "c" \| "d" \| "e" \| "f" | ゲート条件の識別子。requirements.md FR-MIG-4 の (a)–(f) に対応 |
| verdict | "PASS" \| "FAIL" \| "UNKNOWN" | 判定。判定不能は UNKNOWN で BLOCKED 扱い（BR-12） |
| evidence | string | 判定根拠への参照（CI テスト結果、guard 出力、report パス等） |
| detail | string | 人間可読の補足。FAIL/UNKNOWN 時は必須 |

## GateEvaluationReport

六条件の集約結果。CI artifact として永続化される機械可読 JSON（FR-MIG-4(d) と同じく report 形式。BR-16）。

| 属性 | 型 | 説明 |
|---|---|---|
| results | ConditionResult[6] | 六条件すべての判定結果。欠損は許容しない |
| overall | "GREEN" \| "BLOCKED" | 全件 PASS のみ GREEN。1件でも FAIL/UNKNOWN で BLOCKED |
| evaluatedAt | ISO 8601 timestamp | 評価時刻 |
| commitRef | string | 評価対象の commit 参照。削除 commit からの逆参照に使う |

## DeletionCandidate

削除対象の宣言的記述。writer と v1 reader で共通の型とする。

| 属性 | 型 | 説明 |
|---|---|---|
| target | "legacy-writer" \| "v1-reader" | 削除対象。writer は `migration-adapter.ts` 旧 `appendAuditEntry()` 互換層と旧 direct write 経路（component-methods.md § migration-adapter.ts） |
| prerequisites | string[] | 前提の参照（writer: GateEvaluationReport.overall == GREEN。reader: RetentionJudgment 達成） |
| rollbackPlan | "git-revert+backup" | rollback 手段。FR-MIG-2 どおり固定 |

## RetentionJudgment

v1 reader 削除可否の機械判定結果（FR-MIG-5）。

| 属性 | 型 | 説明 |
|---|---|---|
| intents | { intentId: string; retentionMet: boolean }[] | 既存 Intent ごとの retention 条件達成状況 |
| allMet | boolean | 全 Intent が達成のとき true。1件未達でも false で削除不可（BR-4） |
| judgedAt | ISO 8601 timestamp | 判定時刻 |

## ライフサイクル

- ConditionResult: `PENDING → (PASS | FAIL | UNKNOWN)`。終端状態。再評価は新しい ConditionResult を生成する（上書きしない）
- GateEvaluationReport: `BLOCKED ⇄ GREEN`（再評価で遷移）→ 削除実行の起点。GREEN 到達後も削除後検証 FAIL なら git revert により BLOCKED 相当の再評価へ戻る（BR-13）
- DeletionCandidate: `PENDING → ELIGIBLE → REMOVED（PENDING の対象別意味: 旧 writer は BLOCKED＝ゲート未達、v1 reader は RETAINED＝retention 期間中）`。ELIGIBLE は writer では report GREEN、reader では RetentionJudgment.allMet でのみ到達する。REMOVED からの復元は git revert のみ
- v1 reader（DeletionCandidate target = "v1-reader"）: `（上記の統一ライフサイクルに従う）`。RETAINED 期間中は FR-JRN-4 の v1/v2 両対応が維持され、REMOVED 後は v2-only 動作が検証される（BR-5）

## 関係

- GateEvaluationReport は ConditionResult を6件集約する（1:6、順序なし）
- DeletionCandidate(target=legacy-writer) は GateEvaluationReport GREEN を前提とする（FR-MIG-4）
- DeletionCandidate(target=v1-reader) は RetentionJudgment.allMet を前提とする（FR-MIG-5）
- 入力としての shadow 比較 report（VER-5）・call-site guard 出力（VER-4）・drift guard 結果（VER-6）は U7/U11 等の成果物であり、本 Unit は消費のみ行う
