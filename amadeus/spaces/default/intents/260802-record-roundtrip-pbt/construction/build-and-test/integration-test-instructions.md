# Integration Test Instructions — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

## 対象

code-summary.md が記録する着地済み integration 層テスト:

| ファイル | 由来 unit | 内容 |
|---|---|---|
| `tests/integration/t417-election-store-failclosed.pbt.test.ts` | election-readpath | P-EL2 fail-closed(実 FS 経由の `Store.create → 上書き → Store.load`)+ P-EL3 = #1459 反例3形(重複 internalNo / 重複 voter / 空 choices)の example 固定 |
| `tests/integration/t420-unchecked-cast-guard-cli.test.ts` | cast-guard | ガード CLI 面を in-process 駆動(verdict × exit code の全射性、ALLOWLIST_UNREADABLE の4条件) |
| `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` | cast-guard / pbt-deep-ci | ci.yml の sanctioned 編集ピン(両 unit が再 baseline を実施) |

## 層の選択理由

実 FS を触る検証は integration 層へ置く(cid:code-generation:fs-tests-integration-first)。code-generation-plan.md の各 unit がこの分界に従っており、純関数層は unit へ、FS/プロセス境界は integration へ配置されている。

## 実行

```bash
bun test tests/integration/t417-election-store-failclosed.pbt.test.ts \
         tests/integration/t420-unchecked-cast-guard-cli.test.ts \
         tests/integration/t-formal-verif-ci-workflow.integration.test.ts
```

## 統合実行(正準)

個別実行ではなく `bash tests/run-tests.sh --ci`(= smoke + unit + integration)を統合証跡とする。正準ランナーは全 `bun test` 起動へ `--timeout=30000` を渡すため、per-test の負荷ノイズ帯が除かれる — この既定が**ランナー非経由の新設ジョブには継承されない**ことは pbt-deep-ci unit の code-summary.md に記録済み(選挙 E-RRP-CG2)。
