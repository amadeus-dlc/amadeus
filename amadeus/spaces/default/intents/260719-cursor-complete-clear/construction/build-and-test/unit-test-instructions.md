# Unit Test Instructions — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

## 方針

本 intent の新規検証は実 FS を使うため integration 層に置いた(fs-tests-integration-first — code-generation-plan のテスト節どおり unit 層追加なし)。unit 層は既存スイートの非退行のみ:

## 実行

- `bash tests/run-tests.sh --unit`(既存 unit 全部)— 期待: fail 0
- 関連 unit(coverage registry 整合): `bun test tests/unit/gen-coverage-registry.test.ts tests/unit/t134-mechanism-honesty.test.ts` — 期待: 45 pass / 0 fail(code-summary の実測値)
