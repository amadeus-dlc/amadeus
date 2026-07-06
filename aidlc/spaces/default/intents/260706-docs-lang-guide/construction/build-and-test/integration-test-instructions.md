# Integration Test Instructions

Unit: docs-lang-guide（Test Strategy: Minimal）

## 対象

repo 全体との統合は標準検証で確認する。

```sh
npm run test:all   # typecheck / lints / contracts / parity / wiring / evals / engine-e2e / diff
```

## 観点

- 文書追加・編集が既存の検証（lint の対象拡大、diff:check の行末検査など）を壊さないこと。
- AMADEUS.md のカーブアウト追記が既存規約（skill-language-policy、japanese-tech-writing 運用）と矛盾しないこと（reviewer 確認済み）。

## 結果

pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
