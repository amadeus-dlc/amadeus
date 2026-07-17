# Unit Test Instructions — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`(検証列・統制)、`../answer-tag-vocab-fix/code-generation/code-summary.md`(出荷物・実測)。測定 ref: bolt head 66f8c885b(PR #1153、origin/main a4a33e59a 起点)。2026-07-17。

## 対象と手順

新規テストは述語・sensor seam とも実 FS(temp file fixture)を使うため integration 層に配置(fs-tests-integration-first)— unit 層への新規追加なし。既存 unit 層の非退行は `bash tests/run-tests.sh --ci` に包含(0 fail — build-test-results.md)。

## 述語の in-process 被覆

checkQuestionsEvidence は t-eoc1-gate-evidence の in-process import(dist 面)で6理由全被覆 — 変更行 :1151 は lcov 39 hits を実測済み(code-summary AC-2d)。
