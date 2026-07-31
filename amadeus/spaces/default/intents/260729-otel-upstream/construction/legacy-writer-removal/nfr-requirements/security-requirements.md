# Security Requirements — U8: legacy-writer-removal

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit のセキュリティ焦点は「ゲートの証跡が改竄・偽装されないこと」と「削除操作の安全境界」である。ネットワーク面・認証面は本 Unit の射程外（新規ランタイム面なし）。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 証跡のない GREEN の無効化 | `GateEvaluationReport`（JSON、CI artifact 永続化、削除 commit から参照可能）なしの削除手続き開始を構造的に不可能にする（BR-2、BR-16） | report 欠損時に削除フローが中断することのテスト |
| 人手バイパスの排除 | ゲート判定は CI の機械評価のみを受理し、手動レビュー・手動スキップ入力を評価器の入力経路に持たない（BR-2、FR-MIG-4） | 評価器の入力インタフェース検査 |
| evidence の機微情報排除 | report の `evidence`/`detail` には判定対象の識別子（file path・eventType・call site 位置）のみを記録し、credential・prompt・argv 由来値を含めない（FR-DST-3 の二層 redaction と整合） | report schema の単体テスト＋fixture による出力検査 |
| backup の取り扱い | 変換前 backup（BR-3）は git 履歴・tracked 領域に限定し、credential を含む工作領域外ファイルを backup 対象にしない | 削除フロー手順のレビュー |

## 制約

- 削除手続きは rollback 手段を git revert＋変換前 backup に限定する（BR-3）。恒久 dual-write を「安全策」として残すことを禁止する（FR-MIG-1 と整合）
- audit CLI append verbs の公開互換方針は Phase 4 ADR 管轄（BR-14）であり、本 Unit のゲート評価・削除判定に混入しない

## 検証

- `GateEvaluationReport` の schema を機械検証し、未知キー・機微パターンの混入を CI で拒否する
