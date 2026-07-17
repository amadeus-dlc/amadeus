# Unit Test Instructions — 260716-diary-ensure-exists

## 上流入力(consumes 全数)

`code-summary.md` AC-2a/2b/2c(落ちる実証・in-process seam)、`code-generation-plan.md` の検証計画。

## 実行手順

- `bun test tests/integration/t-ensure-stage-diary.test.ts`(新設4テスト — created / never-overwrite / template-missing / idempotent。integration 配置は size purity 準拠だが in-process 駆動)
- `bun test tests/unit/t100-memory-template-lifecycle.test.ts`(テンプレート様式ガード — 16 tests)
- `bun test tests/unit/gen-coverage-registry.test.ts`(registry 鮮度 — function:ensureStageDiary が covered)

## 判定基準

全て 0 fail / exit 0。落ちる実証(既存→非上書きの赤化)は削除注入手順が code-summary に記録済み(conductor+reviewer 2重実施)。
