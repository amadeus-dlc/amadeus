# Unit Test 手順

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 対象

`code-generation-plan.md` Step 6 と `code-summary.md` の要求駆動 negative coverage を入力とする。純粋な3層再計算、正準 digest、JSON envelope、冪等性は実 filesystem と CLI 境界も同時に扱うため、独立した `tests/unit/` ではなく `tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts` に配置されている。この配置差を未検証扱いにはせず、同ファイル内の純粋関数・異常系 assertions を unit 観点として評価する。

## 実行コマンド

```sh
bun test --timeout 120000 tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts
```

追加で `bun run coverage:ci` を単独所有で実行し、上記対象を通常ランナー経由の full suite と coverage gate の双方で確認する。

## 合格条件

- revision `24 / 24 / 25`、artifact `25`、receipt `23` の現行 fixture が成功する。
- revision-only、artifact、manifest、receipt、schema、missing artifact、I/O、rollback の各異常注入が目的の拒否分岐へ到達する。
- 4 status の field と型、stdout 1行+LF、exit code、secret 非露出が固定される。
- 同じ target の2回目は byte diff なし、`REBIND_NOOP`、exit 0 となる。
