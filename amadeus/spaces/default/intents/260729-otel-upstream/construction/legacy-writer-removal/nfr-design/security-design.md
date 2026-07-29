# Security Design — U8: legacy-writer-removal

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の焦点（ゲート証跡の改竄・偽装防止・削除操作の安全境界）に対する設計。

## 証跡の強制設計

- `GateEvaluationReport`（JSON、CI artifact 永続化、削除 commit から参照可能）なしの削除手続き開始を構造的に不可能にする。削除フローの先頭で report の存在・`overall = "GREEN"` を検証し、欠損時は中断する（BR-2、BR-16、business-logic-model.md § 旧 writer 削除フロー 1）
- report schema を機械検証し、未知キー・機微パターンの混入を CI で拒否する

## 人手バイパスの排除設計

- ゲート判定は CI の機械評価のみを受理し、手動レビュー・手動スキップ入力を評価器の入力経路に持たない（BR-2、FR-MIG-4）。評価器の入力は各 checker の `ConditionResult` のみで、環境変数・CLI フラグによる強制 PASS 経路を作らない
- 証跡のない GREEN 宣言は無効とみなす（BR-2）

## evidence の機微情報排除

- report の `evidence`/`detail` には判定対象の識別子（file path・eventType・call site 位置）のみを記録し、credential・prompt・argv 由来値を含めない（FR-DST-3 の二層 redaction と整合）。report schema の単体テスト＋fixture 出力検査で固定する

## 削除操作の安全境界

- rollback 手段は git revert＋変換前 backup に限定する（BR-3）。恒久 dual-write を「安全策」として残すことを禁止する（FR-MIG-1 と整合）
- 変換前 backup は git 履歴・tracked 領域に限定し、credential を含む工作領域外ファイルを backup 対象にしない
- audit CLI append verbs の公開互換方針は Phase 4 ADR 管轄（BR-14）であり、ゲート評価・削除判定に混入しない
