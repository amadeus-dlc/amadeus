# Build and Test directive が未解決 Unit プレースホルダーを返す

## 概要

per-unit `code-generation` の完了後、`amadeus-orchestrate.ts next` が返す `build-and-test` directive の required `consumes` に、実 Unit 名ではなく `{unit-name}` が残る。

## 再現と証拠

対象 revision: `f246870bc7fde0fca096cdcd6cca36f455c17da3`

`self-fix` workflow で Unit `fix-2810-prose-tokenization` の code-generation を承認後に `next` を実行すると、次を含む directive が返る。

```json
{
  "stage": "build-and-test",
  "consumes": [
    "amadeus/spaces/default/intents/<intent>/construction/{unit-name}/code-generation/code-generation-plan.md",
    "amadeus/spaces/default/intents/<intent>/construction/{unit-name}/code-generation/code-summary.md"
  ]
}
```

実在する成果物は `construction/fix-2810-prose-tokenization/code-generation/` 配下にあり、directive の2パスは実在しない。

## 期待値と実際

- 期待: `consumes` は実在する Unit パスへ解決される。存在しない required input は `consumes_absent` として分類される。
- 実際: required `consumes` に未解決 `{unit-name}` が残り、`consumes_absent` にも分類されない。

## 受入条件

- per-unit code-generation 完了後の build-and-test directive が、全 Unit の実在する plan / summary パスを列挙する。
- `consumes` の全パスが directive 発行時に実在することを integration test で固定する。
- Unit が0件または成果物が欠落する場合は、未解決プレースホルダーを返さず fail-closed または `consumes_absent` で明示する。

## Filing

- [Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834)
