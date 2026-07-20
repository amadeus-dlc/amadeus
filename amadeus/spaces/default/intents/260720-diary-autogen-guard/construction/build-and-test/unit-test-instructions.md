# Unit Test Instructions — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行方法

新設ロジックは純関数 `memoryPathNamesIntentRecord`+wrapper `ensureStageDiaryForDirective` で、検証は integration 層に集約(実 FS 使用のため fs-tests-integration-first — unit 層の新設なし)。coverage registry は新 export 2関数で再生成済み(integration-registry-regen)。

## 合否基準

registry drift 0(gen-coverage-registry green)・両関数 covered(lcov 実測 — code-summary.md の patch 20/20)。
