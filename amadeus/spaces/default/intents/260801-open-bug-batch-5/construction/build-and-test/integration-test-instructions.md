# Integration Test Instructions — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- 各 unit の code-generation-plan.md が integration 層へ配置したテスト(fs-tests-integration-first 準拠)を対象とする: t395(fatal-latch emit fail-closed)、t396(session-end tracer seam、spawn driver)、t222 integration(hermetic Git/GitHub boundary の TOCTOU 再現 — 実 bare remote+fake gh+実 git fetch)、t355 integration(実 compile の compose→drop→再 compose 3回駆動)。

## 実行

- `bash tests/run-tests.sh --ci` に内包。個別: `bun test tests/integration/t395-* tests/integration/t396-* tests/integration/t222-*`
- 回復スイート(Bolt 3 の probe 修正で復旧): t125(audit-first atomicity、契約無改訂)/ t49(merge 後 shard)/ t90(fixture 連番化)/ t17 / t247。

## 実環境閉包(AC-2c)

本 intent 自身の mirror receipt に対する実環境実測 — `manual sync` boundary を実行し、重複 create なしで #1872 へ sync completed(issueNumber 1872 維持、phase-verified succeeded)を確認する。実測結果は build-test-results.md に記録。
