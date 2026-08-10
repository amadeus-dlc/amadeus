# Unit Test Instructions

## 入力と対象要件

- `code-generation-plan.md` Step 1 / FR-2 / AC-2a / AC-2b
- `code-summary.md` の root-relative plugin prose ガード
- 対象: `tests/unit/t146-core-hygiene.test.ts`

## 実行

```bash
bun test tests/unit/t146-core-hygiene.test.ts
```

## 成功条件

- 実 corpus が0 findings
- 注入した root-relative `plugins/<name>/tools/...` を検出
- `{{HARNESS_DIR}}/plugins/...` は許容
- 6 tests、0 failed
