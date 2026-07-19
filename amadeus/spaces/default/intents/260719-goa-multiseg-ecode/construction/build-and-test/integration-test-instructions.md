# Integration Test Instructions — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

本変更は parse-only の純関数2 regex(GOA_HEAD_RE / PM_CID_RE)の受理拡大で、新規の統合面(プロセス起動・FS・外部サービス)を追加しない(code-generation-plan.md 変更目録)。統合層の検証は既存スイートの回帰維持で担保する:

- `bash tests/run-tests.sh --ci` — smoke+unit+integration の全層(bolt 実測: RESULT PASS、387ファイル / Failed 0 / 5493 assertions)
- 配布同期の統合面: dist:check / promote:self:check(11コピー機械一致)

## 新規統合テストの不追加根拠

蒸留(distill-candidates)は parse-only で GoA 集計未実装(code-summary.md、#1254)— 集計統合面が存在しないため、統合テストの新設対象がない(build-and-test:c1 — 戦略名だけで検査を機械追加しない)。
