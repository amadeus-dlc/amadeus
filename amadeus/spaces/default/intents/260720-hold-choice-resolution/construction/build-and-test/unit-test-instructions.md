# Unit Test Instructions — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`。Test Strategy は Comprehensive。

## 対象とテストデータ

- Framework: Bun test。
- 対象: `tests/unit/t244-election-choice-resolution.test.ts`。
- `parseChoiceResolution` の正準正整数と、二値語彙・欠落値・0・先頭ゼロ・符号・空白・小数・非数値を純粋文字列 fixture で検証する。
- 各 test は共有 FS を使用せず、入力ごとに独立する。

## 実行と期待値

```sh
bun test tests/unit/t244-election-choice-resolution.test.ts
```

2 test、全 assertion 成功、exit 0 を要求する。新規 parser 行は coverage 対象とし、patch coverage 100% を完成条件とする。
