# Integration Test 手順

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 対象

`code-generation-plan.md` Step 7・8 と `code-summary.md` の2段階 tree 証明・workflow 判断を入力とする。一時 Git repository、関連 Pull Request の全 page 解決、binding→PR head、PR head→landing、commit／push競合、workflow構造を本番境界に近い形で検証する。

## 実行コマンド

```sh
bun test --timeout 120000 tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts tests/integration/t413-no-silent-drop-ci-adoption.test.ts tests/integration/no-silent-drop-repository-adoption.test.ts
bun test --timeout 120000 tests/e2e/t341-plugin-conformance-journey.serial.test.ts
bun run coverage:ci
```

`coverage:ci` は smoke、unit、integration の full CI 実行と coverage evidence を兼ねるため、同じ full corpus を `test:ci` で重複実行しない。

## 合格条件

- focused 5ファイルが失敗0で完了し、`t413` は `10 pass / 0 fail` となる。
- 関連PR 0件／複数、pagination不完了、base／merge SHA不一致、祖先不一致、非派生差分、base drift、rename／mode／object type／1 byte差分、PR ref取得不能を変更なしで拒否する。
- stale remote tip は force／retryなしで `superseded`、rebind commit push は追加commitなしの `REBIND_NOOP` となる。
- workflow は main-only、`CI Success` 非依存、有限 timeout、安定 concurrency、許可3 path、最小権限を構造として満たす。
