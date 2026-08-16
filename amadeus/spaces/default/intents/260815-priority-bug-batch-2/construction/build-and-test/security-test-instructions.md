# Security Test Instructions — intent 260815-priority-bug-batch-2

## 判定: 適用可能なセキュリティ NFR が存在しない

本書はセキュリティテストの実体を規定しない。これは「適用可能な NFR が存在しないという判定」であり、実体なき SAST/DAST 章立ては検証劇場として作らない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## 根拠

- `inception/requirements-analysis/requirements.md` にセキュリティ要件の宣言なし(全文 grep で「セキュリティ」0 hit、本書起草時に実測)
- 本 intent(scope: self-fix)の4修正(`code-generation-plan.md` FR-1〜FR-4、詳細 `code-summary.md`)は選挙 digest 整合・recompose ガード・テストアサーション・テスト timeout であり、認証・認可・入力境界・秘密情報の面に触れない
- 認可関連変更に対する検証マンデート(project.md「認可に関わる変更を directive contract, ... のテストで検証」)は FR-2 の recompose ガードに適用され、これは t246 unit/integration の authorization ガードテストとして unit/integration 指示書側で被覆済み

## この判定を覆す条件

本リポジトリの要件にセキュリティ NFR(脅威モデル・入力検証境界・秘密情報取扱)が数値・条件つきで宣言されたとき、または変更が認証情報・外部入力パース・権限昇格経路に触れるとき。
