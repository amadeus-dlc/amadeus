# Integration Test Instructions — 260704-grilling-mode-wiring

Test Strategy が Minimal のため、本 Intent 専用の統合テストは追加しない。
変更範囲（`../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照）は skill markdown と決定論的検査であり、統合境界は repo 標準検証で覆われている。

## 既存の統合検証で確認する範囲

```sh
npm run test:all
```

`test:all`（= `test:ci:mock`）連鎖に本 Intent の `grilling-wiring:check` が組み込まれており、`test:it:all` 連鎖に `test:it:grilling-wiring` が組み込まれている。
エンジンの実行結果検証は連鎖内の `test:it:engine-e2e`（sandbox e2e、決定論的）が担う。

## 判断根拠

- 結線の実挙動（LLM がステージ質問で 4 択を提示する）は決定論的テストの対象外であり、運用で確認する。
- 検査可能な構造条件（結線文言、パス解決、昇格同期）は unit-test-instructions.md の検査群がすべて覆う。
