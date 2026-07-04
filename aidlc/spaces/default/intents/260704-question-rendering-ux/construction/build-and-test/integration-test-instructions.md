# Integration Test Instructions — 260704-question-rendering-ux

Test Strategy が Minimal のため、本 Intent 専用の統合テストは追加しない。
変更範囲（`../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照）は skill markdown と決定論的検査であり、統合境界は repo 標準検証で覆われている。

## 既存の統合検証で確認する範囲

```sh
npm run test:all
```

`test:all`（= `test:ci:mock`）連鎖に `grilling-wiring:check` が組み込まれており、`test:it:all` 連鎖に `test:it:grilling-wiring` が組み込まれている。
エンジンの実行結果検証は連鎖内の `test:it:engine-e2e`（sandbox e2e、決定論的）が担う。

## 判断根拠

- annex 契約の実挙動（LLM が会話言語で表示する、Codex で `request_user_input` を使う、Grill me を 1 問ずつ構造化 UI で出す）は決定論的テストの対象外であり、運用で確認する。
- 検査可能な構造条件（中立節の存在、正準 label、フォールバック書式の存在、昇格同期）は unit-test-instructions.md の検査群がすべて覆う。
